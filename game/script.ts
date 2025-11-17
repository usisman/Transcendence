window.onload = function() {

    const ratio = 1.79672131148;
    const canvas = document.getElementById("my_canvas") as HTMLCanvasElement;
    if (!canvas) {
      throw new Error("Canvas element not found");
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Could not get 2d context");
    }
    canvas.height = window.innerHeight * 0.6;
    canvas.width = canvas.height * ratio;
    const dt = new Game(ctx, canvas.width, canvas.height);

    const pressedKeys = new Set<string>();

    document.addEventListener("keydown", (event) => {


      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
      }
      pressedKeys.add(event.key);
    });

    document.addEventListener("keyup", (event) => {
      pressedKeys.delete(event.key);
    });

    function gameLoop() {
      if (pressedKeys.has("ArrowUp")) {
        dt.update_height(1, -1);
      }
      if (pressedKeys.has("ArrowDown")) {
        dt.update_height(1, 1);
      }

      if (pressedKeys.has("w")) {
        dt.update_height(0, -1);
      }
      if (pressedKeys.has("s")) {
        dt.update_height(0, 1);
      }
      dt.update_ball();
      dt.animate();
      requestAnimationFrame(gameLoop);
    }

    gameLoop();

}


class Game {
    #ctx;
    #height;
    #width;

    #player1x;
    #player2x;
    #player1y: number;
    #player2y: number;
    #player_len;
    #player_speed;
    #player_width;

    #ball_size;
    #ball_x;
    #ball_y;

    #ball_dx;
    #ball_dy;

    #score_a;
    #score_b;

    constructor(ctx: CanvasRenderingContext2D, width: number, height: number)
    {
      this.#ctx = ctx;
      this.#height = height;
      this.#width = width;

      this.#score_a = 0;
      this.#score_b = 0;

      this.#player1x = 20;
      this.#player2x = this.#width - 20;
      this.#player_len = this.#width / 17.96;
      this.#player_width = 10;
      this.#ball_size = this.#width / 68.5;

      this.#player_speed = 10;


      this.#ball_x = this.#width  / 2;
      this.#ball_y = this.#height / 2;

      this.#ball_dx = -1;
      this.#ball_dy = 0;

      this.#player1y = 10;
      this.#player2y = this.#height - this.#player_len - 10;

    }

    reset_game()
    {
      this.#ball_x = this.#width  / 2;
      this.#ball_y = this.#height / 2;

      this.#ball_dx = -1;
      this.#ball_dy = 0;

      this.#player1y = 10;
      this.#player2y = this.#height - this.#player_len - 10;
    }

    #draw_line(x: number, y: number, dx: number, dy: number, lineWidth = 10)
    {
        this.#ctx.beginPath();
        this.#ctx.strokeStyle = "white";
        this.#ctx.lineWidth = lineWidth;
        this.#ctx.moveTo(x, y);
        this.#ctx.lineTo(x + dx, y + dy);
        this.#ctx.stroke();
    }

    draw_table()
    {
        this.#draw_line(0, 0, this.#width, 0);
        this.#draw_line(0, 0, 0, this.#height);
        this.#draw_line(this.#width, 0, 0, this.#height);
        this.#draw_line(0, this.#height, this.#width, 0);
        this.#draw_line(this.#width / 2, 0, 0, this.#height, 5);
        this.#draw_line(this.#player1x, this.#player1y, 0, this.#player_len, this.#player_width);
        this.#draw_line(this.#player2x, this.#player2y, 0, this.#player_len, this.#player_width);
    }

    animate()
    {
        this.#ctx.clearRect(0, 0, this.#width, this.#height);
        this.draw_table();
        this.check_areas();
        this.draw_ball();

    }

    #check_player(player_loc: number, inc: number)
    {
      if (inc > 0)
        return Math.min(inc * this.#player_speed, this.#height - this.#player_len - player_loc);
      return Math.max(inc * this.#player_speed, -player_loc)
    }

    update_height(player_no: number, inc: number)
    {
        if (player_no == 0 )
          this.#player1y += this.#check_player(this.#player1y, inc);

        if (player_no == 1)
          this.#player2y += this.#check_player(this.#player2y, inc);
    }

    draw_ball()
    {
      this.#ctx.fillStyle = "orange";
      this.#ctx.beginPath();
      this.#ctx.arc(this.#ball_x, this.#ball_y, this.#ball_size/2, 0, Math.PI * 2);
      this.#ctx.fill();
    }

    update_ball()
    {
      this.#ball_x += this.#ball_dx * 10;
      this.#ball_y += this.#ball_dy * 10;
    }

    check_areas()
    {
      if (this.#ball_size > this.#ball_y)
          this.#ball_dy *= -1;
      else if (this.#height - this.#ball_y < this.#ball_size)
          this.#ball_dy *= -1;

      if (this.#ball_size > this.#ball_x)
          this.goal(1);
      if (this.#width - this.#ball_x < this.#ball_size)
          this.goal(0);

      if (this.#ball_dx < 0 && this.#player1x + this.#player_width + this.#ball_size / 2 > this.#ball_x)
          this.check_player1();

      if (this.#ball_dx > 0 && this.#player2x - this.#player_width - this.#ball_size / 2 < this.#ball_x)
          this.check_player2();
    }

    goal(team_no: number)
    {
      if (team_no == 0)
        this.#score_a += 1;
      else
        this.#score_b += 1;
      this.reset_game();
    }

    check_player1()
    {
        if (this.#player1y > this.#ball_y)
        {
         // console.log("Ustten carpisma");
        }
        else if (this.#ball_dx < 0  && this.#player1y + this.#player_len - this.#ball_size / 2 > this.#ball_y )
        {
          let dist = (this.#ball_y - (this.#player1y + this.#player_len / 2)) / (this.#player_len / 2);
          let angle = dist * (Math.PI / 4);

          let speed = Math.sqrt(this.#ball_dx**2 + this.#ball_dy**2);

          this.#ball_dx = Math.cos(angle) * speed;
          this.#ball_dy = Math.sin(angle) * speed;

        }
        else if (this.#player1y + this.#player_len + this.#ball_size / 2 > this.#ball_y)
        {
          //console.log("Alttan carpisma");
        }
    }

    check_player2()
    {
        if (this.#player2y > this.#ball_y)
        {
          //console.log("Ustten carpisma");
        }
        else if (this.#ball_dx > 0 && this.#player2y + this.#player_len - this.#ball_size / 2 > this.#ball_y)
        {
          let dist = (this.#ball_y - (this.#player2y + this.#player_len / 2)) / (this.#player_len / 2);
          let angle = dist * (Math.PI / 4);

          let speed = Math.sqrt(this.#ball_dx**2 + this.#ball_dy**2);

          this.#ball_dx = -Math.cos(angle) * speed;
          this.#ball_dy = Math.sin(angle) * speed;
        }
        else if (this.#player2y + this.#player_len + this.#ball_size / 2 > this.#ball_y)
        {
          //console.log("Alttan carpisma");
        }
    }


}

/*

0 ile 1 arasinda deger alacaklar degerlerin hepsi esit agirlisa sahip

ama 45 dereceden buyuk acilarin ortaya cikmasini azalmak istiyoruz.


*/
