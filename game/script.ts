import { Game } from './Game';

window.onload = function() {

    const ratio = 1.79672131148;
    const pressedKeys = new Set<string>();
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
    const game = new Game(ctx, canvas, pressedKeys);

    document.addEventListener("keydown", (event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
        }
        pressedKeys.add(event.key);
    });

    document.addEventListener("keyup", (event) => {
        pressedKeys.delete(event.key);
    });

    game.loop();


}


