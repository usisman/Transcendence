var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Game_instances, _Game_ctx, _Game_height, _Game_width, _Game_player1x, _Game_player2x, _Game_player1y, _Game_player2y, _Game_player_len, _Game_player_speed, _Game_player_width, _Game_ball_size, _Game_ball_x, _Game_ball_y, _Game_ball_dx, _Game_ball_dy, _Game_score_a, _Game_score_b, _Game_draw_line, _Game_check_player;
window.onload = function () {
    const ratio = 1.79672131148;
    const canvas = document.getElementById("my_canvas");
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
    const pressedKeys = new Set();
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
};
class Game {
    constructor(ctx, width, height) {
        _Game_instances.add(this);
        _Game_ctx.set(this, void 0);
        _Game_height.set(this, void 0);
        _Game_width.set(this, void 0);
        _Game_player1x.set(this, void 0);
        _Game_player2x.set(this, void 0);
        _Game_player1y.set(this, void 0);
        _Game_player2y.set(this, void 0);
        _Game_player_len.set(this, void 0);
        _Game_player_speed.set(this, void 0);
        _Game_player_width.set(this, void 0);
        _Game_ball_size.set(this, void 0);
        _Game_ball_x.set(this, void 0);
        _Game_ball_y.set(this, void 0);
        _Game_ball_dx.set(this, void 0);
        _Game_ball_dy.set(this, void 0);
        _Game_score_a.set(this, void 0);
        _Game_score_b.set(this, void 0);
        __classPrivateFieldSet(this, _Game_ctx, ctx, "f");
        __classPrivateFieldSet(this, _Game_height, height, "f");
        __classPrivateFieldSet(this, _Game_width, width, "f");
        __classPrivateFieldSet(this, _Game_score_a, 0, "f");
        __classPrivateFieldSet(this, _Game_score_b, 0, "f");
        __classPrivateFieldSet(this, _Game_player1x, 20, "f");
        __classPrivateFieldSet(this, _Game_player2x, __classPrivateFieldGet(this, _Game_width, "f") - 20, "f");
        __classPrivateFieldSet(this, _Game_player_len, __classPrivateFieldGet(this, _Game_width, "f") / 17.96, "f");
        __classPrivateFieldSet(this, _Game_player_width, 10, "f");
        __classPrivateFieldSet(this, _Game_ball_size, __classPrivateFieldGet(this, _Game_width, "f") / 68.5, "f");
        __classPrivateFieldSet(this, _Game_player_speed, 10, "f");
        __classPrivateFieldSet(this, _Game_ball_x, __classPrivateFieldGet(this, _Game_width, "f") / 2, "f");
        __classPrivateFieldSet(this, _Game_ball_y, __classPrivateFieldGet(this, _Game_height, "f") / 2, "f");
        __classPrivateFieldSet(this, _Game_ball_dx, -1, "f");
        __classPrivateFieldSet(this, _Game_ball_dy, 0, "f");
        __classPrivateFieldSet(this, _Game_player1y, 10, "f");
        __classPrivateFieldSet(this, _Game_player2y, __classPrivateFieldGet(this, _Game_height, "f") - __classPrivateFieldGet(this, _Game_player_len, "f") - 10, "f");
    }
    reset_game() {
        __classPrivateFieldSet(this, _Game_ball_x, __classPrivateFieldGet(this, _Game_width, "f") / 2, "f");
        __classPrivateFieldSet(this, _Game_ball_y, __classPrivateFieldGet(this, _Game_height, "f") / 2, "f");
        __classPrivateFieldSet(this, _Game_ball_dx, -1, "f");
        __classPrivateFieldSet(this, _Game_ball_dy, 0, "f");
        __classPrivateFieldSet(this, _Game_player1y, 10, "f");
        __classPrivateFieldSet(this, _Game_player2y, __classPrivateFieldGet(this, _Game_height, "f") - __classPrivateFieldGet(this, _Game_player_len, "f") - 10, "f");
    }
    draw_table() {
        __classPrivateFieldGet(this, _Game_instances, "m", _Game_draw_line).call(this, 0, 0, __classPrivateFieldGet(this, _Game_width, "f"), 0);
        __classPrivateFieldGet(this, _Game_instances, "m", _Game_draw_line).call(this, 0, 0, 0, __classPrivateFieldGet(this, _Game_height, "f"));
        __classPrivateFieldGet(this, _Game_instances, "m", _Game_draw_line).call(this, __classPrivateFieldGet(this, _Game_width, "f"), 0, 0, __classPrivateFieldGet(this, _Game_height, "f"));
        __classPrivateFieldGet(this, _Game_instances, "m", _Game_draw_line).call(this, 0, __classPrivateFieldGet(this, _Game_height, "f"), __classPrivateFieldGet(this, _Game_width, "f"), 0);
        __classPrivateFieldGet(this, _Game_instances, "m", _Game_draw_line).call(this, __classPrivateFieldGet(this, _Game_width, "f") / 2, 0, 0, __classPrivateFieldGet(this, _Game_height, "f"), 5);
        __classPrivateFieldGet(this, _Game_instances, "m", _Game_draw_line).call(this, __classPrivateFieldGet(this, _Game_player1x, "f"), __classPrivateFieldGet(this, _Game_player1y, "f"), 0, __classPrivateFieldGet(this, _Game_player_len, "f"), __classPrivateFieldGet(this, _Game_player_width, "f"));
        __classPrivateFieldGet(this, _Game_instances, "m", _Game_draw_line).call(this, __classPrivateFieldGet(this, _Game_player2x, "f"), __classPrivateFieldGet(this, _Game_player2y, "f"), 0, __classPrivateFieldGet(this, _Game_player_len, "f"), __classPrivateFieldGet(this, _Game_player_width, "f"));
    }
    animate() {
        __classPrivateFieldGet(this, _Game_ctx, "f").clearRect(0, 0, __classPrivateFieldGet(this, _Game_width, "f"), __classPrivateFieldGet(this, _Game_height, "f"));
        this.draw_table();
        this.check_areas();
        this.draw_ball();
    }
    update_height(player_no, inc) {
        if (player_no == 0)
            __classPrivateFieldSet(this, _Game_player1y, __classPrivateFieldGet(this, _Game_player1y, "f") + __classPrivateFieldGet(this, _Game_instances, "m", _Game_check_player).call(this, __classPrivateFieldGet(this, _Game_player1y, "f"), inc), "f");
        if (player_no == 1)
            __classPrivateFieldSet(this, _Game_player2y, __classPrivateFieldGet(this, _Game_player2y, "f") + __classPrivateFieldGet(this, _Game_instances, "m", _Game_check_player).call(this, __classPrivateFieldGet(this, _Game_player2y, "f"), inc), "f");
    }
    draw_ball() {
        __classPrivateFieldGet(this, _Game_ctx, "f").fillStyle = "orange";
        __classPrivateFieldGet(this, _Game_ctx, "f").beginPath();
        __classPrivateFieldGet(this, _Game_ctx, "f").arc(__classPrivateFieldGet(this, _Game_ball_x, "f"), __classPrivateFieldGet(this, _Game_ball_y, "f"), __classPrivateFieldGet(this, _Game_ball_size, "f") / 2, 0, Math.PI * 2);
        __classPrivateFieldGet(this, _Game_ctx, "f").fill();
    }
    update_ball() {
        __classPrivateFieldSet(this, _Game_ball_x, __classPrivateFieldGet(this, _Game_ball_x, "f") + __classPrivateFieldGet(this, _Game_ball_dx, "f") * 10, "f");
        __classPrivateFieldSet(this, _Game_ball_y, __classPrivateFieldGet(this, _Game_ball_y, "f") + __classPrivateFieldGet(this, _Game_ball_dy, "f") * 10, "f");
    }
    check_areas() {
        if (__classPrivateFieldGet(this, _Game_ball_size, "f") > __classPrivateFieldGet(this, _Game_ball_y, "f"))
            __classPrivateFieldSet(this, _Game_ball_dy, __classPrivateFieldGet(this, _Game_ball_dy, "f") * -1, "f");
        else if (__classPrivateFieldGet(this, _Game_height, "f") - __classPrivateFieldGet(this, _Game_ball_y, "f") < __classPrivateFieldGet(this, _Game_ball_size, "f"))
            __classPrivateFieldSet(this, _Game_ball_dy, __classPrivateFieldGet(this, _Game_ball_dy, "f") * -1, "f");
        if (__classPrivateFieldGet(this, _Game_ball_size, "f") > __classPrivateFieldGet(this, _Game_ball_x, "f"))
            this.goal(1);
        if (__classPrivateFieldGet(this, _Game_width, "f") - __classPrivateFieldGet(this, _Game_ball_x, "f") < __classPrivateFieldGet(this, _Game_ball_size, "f"))
            this.goal(0);
        if (__classPrivateFieldGet(this, _Game_ball_dx, "f") < 0 && __classPrivateFieldGet(this, _Game_player1x, "f") + __classPrivateFieldGet(this, _Game_player_width, "f") + __classPrivateFieldGet(this, _Game_ball_size, "f") / 2 > __classPrivateFieldGet(this, _Game_ball_x, "f"))
            this.check_player1();
        if (__classPrivateFieldGet(this, _Game_ball_dx, "f") > 0 && __classPrivateFieldGet(this, _Game_player2x, "f") - __classPrivateFieldGet(this, _Game_player_width, "f") - __classPrivateFieldGet(this, _Game_ball_size, "f") / 2 < __classPrivateFieldGet(this, _Game_ball_x, "f"))
            this.check_player2();
    }
    goal(team_no) {
        if (team_no == 0)
            __classPrivateFieldSet(this, _Game_score_a, __classPrivateFieldGet(this, _Game_score_a, "f") + 1, "f");
        else
            __classPrivateFieldSet(this, _Game_score_b, __classPrivateFieldGet(this, _Game_score_b, "f") + 1, "f");
        this.reset_game();
    }
    check_player1() {
        if (__classPrivateFieldGet(this, _Game_player1y, "f") > __classPrivateFieldGet(this, _Game_ball_y, "f")) {
            // console.log("Ustten carpisma");
        }
        else if (__classPrivateFieldGet(this, _Game_ball_dx, "f") < 0 && __classPrivateFieldGet(this, _Game_player1y, "f") + __classPrivateFieldGet(this, _Game_player_len, "f") - __classPrivateFieldGet(this, _Game_ball_size, "f") / 2 > __classPrivateFieldGet(this, _Game_ball_y, "f")) {
            let dist = (__classPrivateFieldGet(this, _Game_ball_y, "f") - (__classPrivateFieldGet(this, _Game_player1y, "f") + __classPrivateFieldGet(this, _Game_player_len, "f") / 2)) / (__classPrivateFieldGet(this, _Game_player_len, "f") / 2);
            let angle = dist * (Math.PI / 4);
            let speed = Math.sqrt(Math.pow(__classPrivateFieldGet(this, _Game_ball_dx, "f"), 2) + Math.pow(__classPrivateFieldGet(this, _Game_ball_dy, "f"), 2));
            __classPrivateFieldSet(this, _Game_ball_dx, Math.cos(angle) * speed, "f");
            __classPrivateFieldSet(this, _Game_ball_dy, Math.sin(angle) * speed, "f");
        }
        else if (__classPrivateFieldGet(this, _Game_player1y, "f") + __classPrivateFieldGet(this, _Game_player_len, "f") + __classPrivateFieldGet(this, _Game_ball_size, "f") / 2 > __classPrivateFieldGet(this, _Game_ball_y, "f")) {
            //console.log("Alttan carpisma");
        }
    }
    check_player2() {
        if (__classPrivateFieldGet(this, _Game_player2y, "f") > __classPrivateFieldGet(this, _Game_ball_y, "f")) {
            //console.log("Ustten carpisma");
        }
        else if (__classPrivateFieldGet(this, _Game_ball_dx, "f") > 0 && __classPrivateFieldGet(this, _Game_player2y, "f") + __classPrivateFieldGet(this, _Game_player_len, "f") - __classPrivateFieldGet(this, _Game_ball_size, "f") / 2 > __classPrivateFieldGet(this, _Game_ball_y, "f")) {
            let dist = (__classPrivateFieldGet(this, _Game_ball_y, "f") - (__classPrivateFieldGet(this, _Game_player2y, "f") + __classPrivateFieldGet(this, _Game_player_len, "f") / 2)) / (__classPrivateFieldGet(this, _Game_player_len, "f") / 2);
            let angle = dist * (Math.PI / 4);
            let speed = Math.sqrt(Math.pow(__classPrivateFieldGet(this, _Game_ball_dx, "f"), 2) + Math.pow(__classPrivateFieldGet(this, _Game_ball_dy, "f"), 2));
            __classPrivateFieldSet(this, _Game_ball_dx, -Math.cos(angle) * speed, "f");
            __classPrivateFieldSet(this, _Game_ball_dy, Math.sin(angle) * speed, "f");
        }
        else if (__classPrivateFieldGet(this, _Game_player2y, "f") + __classPrivateFieldGet(this, _Game_player_len, "f") + __classPrivateFieldGet(this, _Game_ball_size, "f") / 2 > __classPrivateFieldGet(this, _Game_ball_y, "f")) {
            //console.log("Alttan carpisma");
        }
    }
}
_Game_ctx = new WeakMap(), _Game_height = new WeakMap(), _Game_width = new WeakMap(), _Game_player1x = new WeakMap(), _Game_player2x = new WeakMap(), _Game_player1y = new WeakMap(), _Game_player2y = new WeakMap(), _Game_player_len = new WeakMap(), _Game_player_speed = new WeakMap(), _Game_player_width = new WeakMap(), _Game_ball_size = new WeakMap(), _Game_ball_x = new WeakMap(), _Game_ball_y = new WeakMap(), _Game_ball_dx = new WeakMap(), _Game_ball_dy = new WeakMap(), _Game_score_a = new WeakMap(), _Game_score_b = new WeakMap(), _Game_instances = new WeakSet(), _Game_draw_line = function _Game_draw_line(x, y, dx, dy, lineWidth = 10) {
    __classPrivateFieldGet(this, _Game_ctx, "f").beginPath();
    __classPrivateFieldGet(this, _Game_ctx, "f").strokeStyle = "white";
    __classPrivateFieldGet(this, _Game_ctx, "f").lineWidth = lineWidth;
    __classPrivateFieldGet(this, _Game_ctx, "f").moveTo(x, y);
    __classPrivateFieldGet(this, _Game_ctx, "f").lineTo(x + dx, y + dy);
    __classPrivateFieldGet(this, _Game_ctx, "f").stroke();
}, _Game_check_player = function _Game_check_player(player_loc, inc) {
    if (inc > 0)
        return Math.min(inc * __classPrivateFieldGet(this, _Game_player_speed, "f"), __classPrivateFieldGet(this, _Game_height, "f") - __classPrivateFieldGet(this, _Game_player_len, "f") - player_loc);
    return Math.max(inc * __classPrivateFieldGet(this, _Game_player_speed, "f"), -player_loc);
};
/*

0 ile 1 arasinda deger alacaklar degerlerin hepsi esit agirlisa sahip

ama 45 dereceden buyuk acilarin ortaya cikmasini azalmak istiyoruz.


*/
