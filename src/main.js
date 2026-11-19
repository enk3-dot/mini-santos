import Game from "./game.js";

const game = new Game();

document.getElementById("start-button").addEventListener("click", () => game.start());
document.getElementById("restart-button").addEventListener("click", () => game.start());

game.run();
