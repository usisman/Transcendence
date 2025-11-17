const COURT_RATIO = 1.79672131148; // Oyunun orijinal masa oranını koruyoruz.
const PLAYER_SPEED = 10; // Paddle hareket hızını sabit tutuyoruz.
const BALL_SPEED = 10; // Top hızını sabit tutarak fizik davranışını standartlıyoruz.
const MIN_CANVAS_HEIGHT = 360; // Küçük ekranlarda bile minimum alan bırakıyoruz.
const WIN_SCORE = 10; // İstenen koşul gereği 10 puana ilk ulaşan maçı kazanır.

export const initializePongGame = (
  canvas: HTMLCanvasElement,
  scoreAEl: HTMLElement,
  scoreBEl: HTMLElement,
  statusEl: HTMLElement
) => {
  // Canvas context'ini üretip hata yakalıyoruz ki oyun güvenli başlasın.
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context alınamadı.');
  }

  // Asıl oyun motorumuz tek sınıfta toplandı; skor ve durum elementlerini de burada saklıyoruz.
  const engine = new PongEngine(ctx, canvas, scoreAEl, scoreBEl, statusEl);
  engine.resize(window.innerHeight * 0.6);

  const pressedKeys = new Set<string>(); // Aynı anda birden fazla tuşa basılabildiği için Set kullanıyoruz.

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault(); // Tarayıcının sayfayı kaydırmasını engelliyoruz.
    }
    pressedKeys.add(event.key.toLowerCase());
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    pressedKeys.delete(event.key.toLowerCase());
  };

  const handleResize = () => {
    engine.resize(window.innerHeight * 0.6); // Pencere yeniden boyutlandığında sahayı güncelliyoruz.
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('resize', handleResize);

  let animationId = 0;
  const loop = () => {
    engine.tick(pressedKeys); // Her karede girişleri işleyip oyunu ilerletiyoruz.
    animationId = requestAnimationFrame(loop);
  };
  loop();

  return () => {
    cancelAnimationFrame(animationId); // Route değiştirildiğinde animasyonu durduruyoruz.
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('resize', handleResize);
  };
};

class PongEngine {
  private width = 0;
  private height = 0;

  private paddle1x = 20;
  private paddle2x = 20;
  private paddle1y = 0;
  private paddle2y = 0;
  private paddleLength = 0;
  private paddleWidth = 10;

  private ballSize = 0;
  private ballX = 0;
  private ballY = 0;
  private ballDx = 0;
  private ballDy = 0;

  private scoreA = 0;
  private scoreB = 0;

  private awaitingServe = true;
  private winner: 'a' | 'b' | null = null;
  private nextServeDirection: -1 | 1 = Math.random() > 0.5 ? 1 : -1;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private canvas: HTMLCanvasElement,
    private scoreAEl: HTMLElement,
    private scoreBEl: HTMLElement,
    private statusEl: HTMLElement
  ) {}

  tick(pressedKeys: Set<string>) {
    this.handleInput(pressedKeys); // Tuşlara göre paddle konumlarını güncelliyoruz.
    if (!this.awaitingServe) {
      this.updateBall(); // Topun fiziksel hareketini her karede uyguluyoruz.
      this.resolveCollisions(); // Kenar, paddle ve gol kontrollerini burada yapıyoruz.
    }
    this.drawFrame(); // Son olarak yeni state'i ekrana çiziyoruz.
  }

  resize(targetHeight: number) {
    const height = Math.max(MIN_CANVAS_HEIGHT, targetHeight); // Minimum yükseklik sınırı.
    const width = height * COURT_RATIO;

    this.height = height;
    this.width = width;
    this.canvas.height = height;
    this.canvas.width = width;

    this.paddleLength = width / 17.96;
    this.ballSize = width / 68.5;
    this.paddle2x = width - 20;

    this.resetPositions('Paddle hareket ettirerek servisi başlat.'); // Yeni ölçülere göre paddle ve topu merkeze alıyoruz.
    this.updateScoreboard(); // DOM yeniden bağlandığında skoru tutarlı tutuyoruz.
  }

  private handleInput(pressedKeys: Set<string>) {
    let moved = false;
    if (pressedKeys.has('w')) {
      moved = this.updatePaddle(0, -1) || moved;
    }
    if (pressedKeys.has('s')) {
      moved = this.updatePaddle(0, 1) || moved;
    }
    if (pressedKeys.has('arrowup')) {
      moved = this.updatePaddle(1, -1) || moved;
    }
    if (pressedKeys.has('arrowdown')) {
      moved = this.updatePaddle(1, 1) || moved;
    }

    if (moved) {
      this.activateBall();
    }
  }

  private updatePaddle(playerIndex: number, direction: -1 | 1) {
    const delta = direction * PLAYER_SPEED;
    if (playerIndex === 0) {
      const next = this.clampPaddle(this.paddle1y + delta);
      const changed = next !== this.paddle1y;
      this.paddle1y = next;
      return changed;
    }
    const next = this.clampPaddle(this.paddle2y + delta);
    const changed = next !== this.paddle2y;
    this.paddle2y = next;
    return changed;
  }

  private clampPaddle(target: number) {
    const min = 0;
    const max = this.height - this.paddleLength;
    return Math.min(Math.max(target, min), max);
  }

  private activateBall() {
    if (!this.awaitingServe) return;

    if (this.winner) {
      // Yeni maç için skorları sıfırlayıp mesajı temizliyoruz.
      this.scoreA = 0;
      this.scoreB = 0;
      this.updateScoreboard();
      this.winner = null;
      this.nextServeDirection = Math.random() > 0.5 ? 1 : -1;
    }

    this.awaitingServe = false;
    this.statusEl.textContent = ''; // Kullanıcıya verilen bilgiyi sıfırlıyoruz.
    this.ballDx = this.nextServeDirection;
    this.ballDy = (Math.random() - 0.5) * 0.6; // Biraz rastgelelik ekleyerek her servisi farklılaştırıyoruz.
  }

  private updateBall() {
    this.ballX += this.ballDx * BALL_SPEED;
    this.ballY += this.ballDy * BALL_SPEED;
  }

  private resolveCollisions() {
    const hitTop = this.ballY - this.ballSize / 2 <= 0;
    const hitBottom = this.ballY + this.ballSize / 2 >= this.height;
    if (hitTop || hitBottom) {
      this.ballDy *= -1; // Üst/alt duvara çarptığında yön değiştiriyoruz.
    }

    if (this.ballX - this.ballSize / 2 <= 0) {
      this.goal('b'); // Sol duvarı geçen top oyuncu B için skor demek.
      return;
    }
    if (this.ballX + this.ballSize / 2 >= this.width) {
      this.goal('a');
      return;
    }

    if (
      this.ballDx < 0 &&
      this.ballX - this.ballSize / 2 <= this.paddle1x + this.paddleWidth &&
      this.ballY >= this.paddle1y &&
      this.ballY <= this.paddle1y + this.paddleLength
    ) {
      this.deflectFromPaddle(this.paddle1y, 1); // Sol oyuncu topu sağa doğru geri yollar.
    }

    if (
      this.ballDx > 0 &&
      this.ballX + this.ballSize / 2 >= this.paddle2x - this.paddleWidth &&
      this.ballY >= this.paddle2y &&
      this.ballY <= this.paddle2y + this.paddleLength
    ) {
      this.deflectFromPaddle(this.paddle2y, -1); // Sağ oyuncu topu sola doğru geri yollar.
    }
  }

  private deflectFromPaddle(paddleY: number, horizontalDirection: -1 | 1) {
    const relativeIntersectY = this.ballY - (paddleY + this.paddleLength / 2);
    const normalizedIntersection = relativeIntersectY / (this.paddleLength / 2);
    const bounceAngle = normalizedIntersection * (Math.PI / 4); // 45 derece limitini koruyoruz.
    const speed = Math.hypot(this.ballDx, this.ballDy) || 1;

    this.ballDx = horizontalDirection * Math.cos(bounceAngle) * speed;
    this.ballDy = Math.sin(bounceAngle) * speed;
  }

  private goal(scoringPlayer: 'a' | 'b') {
    if (scoringPlayer === 'a') {
      this.scoreA += 1;
      this.nextServeDirection = 1; // Sonraki serviste top B oyuncusuna doğru gitsin.
    } else {
      this.scoreB += 1;
      this.nextServeDirection = -1;
    }

    this.updateScoreboard(); // DOM'daki skor panosunu güncelliyoruz.

    if (this.scoreA >= WIN_SCORE || this.scoreB >= WIN_SCORE) {
      this.handleWin(scoringPlayer);
      return;
    }

    this.resetPositions('Puan sonrası paddle hareketiyle oyun devam eder.');
  }

  private handleWin(winner: 'a' | 'b') {
    this.winner = winner;
    const winnerLabel = winner === 'a' ? 'Oyuncu A' : 'Oyuncu B';
    this.resetPositions(`${winnerLabel} 10 puana ulaştı! Paddle hareket ettirerek yeni maçı başlat.`);
  }

  private resetPositions(message: string) {
    this.ballX = this.width / 2;
    this.ballY = this.height / 2;
    this.ballDx = 0;
    this.ballDy = 0;
    this.paddle1y = this.centerPaddle();
    this.paddle2y = this.centerPaddle();
    this.awaitingServe = true;
    this.statusEl.textContent = message;
  }

  private centerPaddle() {
    return Math.max((this.height - this.paddleLength) / 2, 0);
  }

  private updateScoreboard() {
    this.scoreAEl.textContent = `A: ${this.scoreA}`;
    this.scoreBEl.textContent = `B: ${this.scoreB}`;
  }

  private drawFrame() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawCourt();
    this.drawBall();
  }

  private drawCourt() {
    this.ctx.fillStyle = 'rgb(35, 98, 243)'; // Orijinal oyunun renk paleti.
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawLine(0, 0, this.width, 0); // Üst sınırı çiziyoruz.
    this.drawLine(0, 0, 0, this.height); // Sol sınırı çiziyoruz.
    this.drawLine(this.width, 0, 0, this.height); // Sağ sınırı çiziyoruz.
    this.drawLine(0, this.height, this.width, 0); // Alt sınırı çiziyoruz.
    this.drawLine(this.width / 2, 0, 0, this.height, 5); // Orta çizgi.
    this.drawLine(this.paddle1x, this.paddle1y, 0, this.paddleLength, this.paddleWidth);
    this.drawLine(this.paddle2x, this.paddle2y, 0, this.paddleLength, this.paddleWidth);
  }

  private drawLine(x: number, y: number, dx: number, dy: number, lineWidth = 10) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = lineWidth;
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + dx, y + dy);
    this.ctx.stroke();
  }

  private drawBall() {
    this.ctx.fillStyle = 'orange';
    this.ctx.beginPath();
    this.ctx.arc(this.ballX, this.ballY, this.ballSize / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
