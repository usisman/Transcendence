import { Player } from './Player';
import { Ball } from './Ball';

export class Game {
    private ctx;
    private pressedKeys;
    private height;
    private width;
    private rect;

    private active;
    private players: Player[];
    private ball: Ball;
    private lastAIMoveTime: number;
    private target: number;
    private line_width;

    private random_part;



    constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, pressedKeys: Set<string>) {
        this.ctx = ctx;
        this.height = canvas.height;
        this.width = canvas.width;
        this.rect = canvas.getBoundingClientRect();
        this.pressedKeys = pressedKeys;
        this.active = 0;

        let player_width_ratio = this.height / 50.8;
        let player_height_ratio = this.width * 2 / 17.96
        let player_gap_ratio = this.width / 46;
        let player_speed_ratio = this.width / 92;
        this.line_width = this.width / 92;

        console.log(this.height / 10);
        this.players = [
            new Player({
                canvas: canvas,
                ctx: this.ctx,
                x: player_gap_ratio,
                y: player_width_ratio,
                height: player_height_ratio,
                width: player_width_ratio,
                speed: player_speed_ratio
            }),
            new Player({
                canvas:canvas,
                ctx: this.ctx,
                x: this.width - player_gap_ratio - player_width_ratio,
                y: this.height - player_width_ratio,
                height: player_height_ratio,
                width: player_width_ratio,
                speed: player_speed_ratio
            })
        ];


        this.ball = new Ball(canvas, this.ctx, this.width / 2, this.height / 2, this.width / 112, this.width * 2 / 68.5)


        this.active = 0;
        this.lastAIMoveTime = 0;
        this.target = 0;
        this.random_part = 0.5


        const startButton = document.getElementById("startButton");
        const buttonWidth = this.width * 1.5 / 10;
        const buttonHeight = this.height * 1.5 / 10;
        if (startButton instanceof HTMLElement) {
            startButton.style.position = "absolute";
            startButton.style.left = this.rect.left + (this.width - buttonWidth) / 2 + "px";
            startButton.style.top = this.rect.top + (this.height - buttonHeight) / 2 + "px";
            startButton.style.width = buttonWidth + "px";
            startButton.style.height = buttonHeight + "px";
            startButton.style.borderRadius = 15 + "px";
            startButton.style.display = "none";

        }
    }

    private find_target(player_x: number)
    {
        let res = this.height / 2;
        if (this.ball.dx < 0) {
            return res;
        }
        let step = this.ball.dy * (player_x - this.ball.x) / this.ball.dx;

        let cur_pos = this.ball.y;
        let cur_step;

        while (step != 0)
       {
            if (step > 0)
                cur_step = Math.min(step, this.height - cur_pos);
            else
                cur_step = Math.max(step, -cur_pos);
            step -= cur_step;
            cur_pos += cur_step;
            step *= -1;
        }
        return cur_pos;
    }

    loop() {

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.draw(this.line_width);

        this.ball.draw();
        const now = Date.now();

        if (now - this.lastAIMoveTime >= 1000) {
            this.target = this.find_target(this.players[1].x);
            this.random_part = Math.random();
            this.lastAIMoveTime = now;
        }
        this.play_ai(this.players[1], this.target, this.random_part);
        this.players[0].draw();
        this.players[1].draw();

        if (this.pressedKeys.has("ArrowUp")) {
            this.players[1].y += this.update_player(this.players[1], -1);
            this.active = 1;
        }
        if (this.pressedKeys.has("ArrowDown")) {
            this.players[1].y += this.update_player(this.players[1], 1);
            this.active = 1;
        }

        if (this.pressedKeys.has("w")) {
            this.players[0].y += this.update_player(this.players[0], -1);
            this.active = 1;
        }
        if (this.pressedKeys.has("s")) {
            this.players[0].y += this.update_player(this.players[0], 1);
            this.active = 1;
        }

        if (this.active) {
            this.ball.update();
        }
        this.check_areas();

        requestAnimationFrame(() => this.loop());
    }


    private draw_line(x: number, y: number, dx: number, dy: number, lineWidth = 10) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = "black";
        this.ctx.lineWidth = lineWidth;
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + dx, y + dy);
        this.ctx.stroke();
    }

    private draw(line_width: number) {
        this.draw_line(0, 0, this.width, 0, line_width);
        this.draw_line(0, 0, 0, this.height, line_width);
        this.draw_line(this.width, 0, 0, this.height, line_width);
        this.draw_line(0, this.height, this.width, 0, line_width);
        this.draw_line(this.width / 2, 0, 0, this.height, line_width / 2);
    }


    private update_player(player: Player, inc: number) {
        if (inc > 0) {
            return Math.min(inc * player.speed, this.height - player.height - player.y);
        }
        return Math.max(inc * player.speed, - player.y);
    }

    private goal(number: number) {
        if (number == 0) {
            this.players[0].goal();
        }
        else
            this.players[1].goal();

       const butonA = document.getElementById("scoreA") as HTMLElement | null;
       if (butonA)
           butonA.textContent = "A: " + this.players[0].score;

       const butonB = document.getElementById("scoreB") as HTMLElement | null;
       if (butonB)
           butonB.textContent = "B: " + this.players[1].score;


        this.ball.reset();
        this.active = 0;
    }

    private check_areas() {

        if ((this.ball.dy < 0 && this.ball.y < this.line_width / 2) || (this.ball.dy > 0 && this.height - this.ball.y < this.line_width / 2))
            this.ball.dy *= -1;


        if (this.line_width / 2 > this.ball.x) {
            this.goal(1);
        }

        if (this.width - this.ball.x < this.line_width / 2) {
            this.goal(0);
        }

        if (this.ball.dx < 0 && this.ball.x - this.ball.radius <= this.players[0].x + this.players[0].width) {
            this.player_ball_collision(this.players[0], this.ball);
        }

        if (this.ball.dx > 0 && this.ball.x + this.ball.radius >= this.players[1].x) {
            this.player_ball_collision(this.players[1], this.ball);
        }
    }

    private player_ball_collision(player: Player, ball: Ball) {
        if (player.y > ball.y) {
            // console.log("Ustten carpisma");
        } else if (player.y + player.height > ball.y) {
            let dist = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
            let angle =  dist * (Math.PI / 4);


            ball.dx = Math.cos(angle) * (-Math.abs(ball.dx) / ball.dx);
            ball.dy = Math.sin(angle);
            ball.speed *= 1.05;
        } else if (player.y + player.height + ball.radius / 2 > ball.y) {
            //console.log("Alttan carpisma");
        }
    }

    private play_ai(player: Player, target: number, part: number)
    {
        if (player.y + player.height * (((1 - part) / 2) + part) >= target && target >= player.y + player.height * ((1 - part) / 2))
            return ;
        let way = 1;
        if (player.y + player.height / 2 > target)
            way = -1;
        player.y += this.update_player(player, way);
    }

}
