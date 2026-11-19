import { ROAD_LINES, ROAD, MAP_HALF } from "./city.js";

export default class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.size = canvas.width;
    this.center = this.size / 2;
    this.scale = this.center / (MAP_HALF + 4);
  }

  toScreen(x, z) {
    return [this.center + x * this.scale, this.center + z * this.scale];
  }

  update(game) {
    const ctx = this.ctx;
    const size = this.size;

    ctx.fillStyle = "#0d1022";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "#39406b";
    ctx.lineWidth = Math.max(2, ROAD * this.scale * 0.7);
    for (const line of ROAD_LINES) {
      let [x1, y1] = this.toScreen(-MAP_HALF, line);
      let [x2, y2] = this.toScreen(MAP_HALF, line);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      [x1, y1] = this.toScreen(line, -MAP_HALF);
      [x2, y2] = this.toScreen(line, MAP_HALF);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const marker = game.missions.marker;
    if (marker.visible) {
      const [mx, my] = this.toScreen(marker.position.x, marker.position.z);
      ctx.fillStyle = "#ffd23c";
      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const car of game.cars) {
      const [cx, cy] = this.toScreen(car.position.x, car.position.z);
      ctx.fillStyle = "#9aa3c8";
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
    }

    for (const trafficCar of game.traffic) {
      const [cx, cy] = this.toScreen(trafficCar.group.position.x, trafficCar.group.position.z);
      ctx.fillStyle = "#e8ecff";
      ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
    }

    const flash = Math.floor(performance.now() / 250) % 2 === 0;
    for (const cruiser of game.police) {
      const [cx, cy] = this.toScreen(cruiser.position.x, cruiser.position.z);
      ctx.fillStyle = flash ? "#ff4444" : "#4466ff";
      ctx.fillRect(cx - 2.5, cy - 2.5, 5, 5);
    }

    const isDriving = game.mode === "driving";
    const playerPos = isDriving ? game.playerCar.position : game.player.position;
    const playerHeading = isDriving ? game.playerCar.group.rotation.y : game.player.group.rotation.y;
    const [px, py] = this.toScreen(playerPos.x, playerPos.z);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI - playerHeading);
    ctx.fillStyle = "#3ce8b0";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
