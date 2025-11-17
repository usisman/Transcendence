import { initializePongGame } from '../game/pong';
import { loadSession } from '../utils/storage';

export const renderGameView = (container: HTMLElement) => {
  if (!loadSession()) {
    location.hash = '/auth';
    return;
  }
  const root = document.createElement('main');
  root.className = 'app game';
  root.innerHTML = `
    <header class="app__header">
      <div>
        <h1>Pong Prototipi</h1>
        <p>W/S ve ↑/↓ tuşlarıyla raketleri kontrol edebilirsin.</p>
      </div>
      <div class="game__controls">
        <div class="game__keys">
          <p><strong>Oyuncu A:</strong> W / S</p>
          <p><strong>Oyuncu B:</strong> ↑ / ↓</p>
        </div>
        <button class="button button--secondary" type="button" data-action="leave">Oyundan Çık</button>
      </div>
    </header>
    <section class="game__canvas-wrapper">
      <canvas></canvas>
      <div class="game__score">
        <span data-score="a">A: 0</span>
        <span data-score="b">B: 0</span>
      </div>
    </section>
    <section class="game__status" data-status>
      <p>Paddle'ları (W/S ve ↑/↓) hareket ettirerek oyunu başlat. İlk 10 puan alan kazanır.</p>
    </section>
  `;

  container.appendChild(root);

  const canvas = root.querySelector('canvas');
  const scoreAEl = root.querySelector<HTMLElement>('[data-score="a"]');
  const scoreBEl = root.querySelector<HTMLElement>('[data-score="b"]');
  const statusEl = root.querySelector<HTMLElement>('[data-status]');

  if (!canvas || !scoreAEl || !scoreBEl || !statusEl) {
    throw new Error('Oyun bileşenleri oluşturulamadı.');
  }

  const cleanup = initializePongGame(canvas, scoreAEl, scoreBEl, statusEl);

  const leaveButton = root.querySelector<HTMLButtonElement>('[data-action="leave"]');
  leaveButton?.addEventListener('click', () => {
    location.hash = '/dashboard';
  });

  return () => {
    cleanup();
  };
};
