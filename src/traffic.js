import * as THREE from "three";
import { ROAD_LINES, ROAD, MAP_HALF } from "./city.js";

const COLORS = [0xc9c9c9, 0x8c1f28, 0x1f5e8c, 0x2f6b3a, 0x3d3d3d, 0x6b5537];
const EDGE = MAP_HALF - 8;
const TURN_CHANCE = 0.3;

const tempDir = new THREE.Vector3();

export default class TrafficCar {
  constructor(scene) {
    this.group = new THREE.Group();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.7, 4),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2 })
    );
    body.position.y = 0.6;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x12162b, roughness: 0.3 })
    );
    cabin.position.set(0, 1.1, -0.2);
    this.headlight = new THREE.PointLight(0xfff2c0, 0, 14);
    this.headlight.position.set(0, 1, 2.2);
    this.group.add(body, cabin, this.headlight);
    scene.add(this.group);

    this.speed = 0;
    this.cruise = 8 + Math.random() * 5;
    this.respawn();
  }

  respawn() {
    this.axis = Math.random() < 0.5 ? "x" : "z";
    this.line = ROAD_LINES[Math.floor(Math.random() * ROAD_LINES.length)];
    this.dir = Math.random() < 0.5 ? 1 : -1;
    this.speed = this.cruise;
    this.turnCooldown = 0;
    this.along = (Math.random() * 2 - 1) * EDGE;
    this.apply();
  }

  get heading() {
    if (this.axis === "x") return this.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    return this.dir === 1 ? 0 : Math.PI;
  }

  get laneOffset() {
    return this.dir === 1 ? ROAD / 4 : -ROAD / 4;
  }

  apply() {
    if (this.axis === "x") {
      this.group.position.set(this.along, 0, this.line + this.laneOffset);
    } else {
      this.group.position.set(this.line + this.laneOffset, 0, this.along);
    }
    this.group.rotation.y = this.heading;
  }

  update(dt, game) {
    this.turnCooldown = Math.max(0, this.turnCooldown - dt);

    if (this.axis === "x") {
      tempDir.set(this.dir, 0, 0);
    } else {
      tempDir.set(0, 0, this.dir);
    }
    const sideX = tempDir.z;
    const sideZ = -tempDir.x;

    let blocked = false;
    for (const obstaclePos of game.obstaclesForTraffic(this)) {
      const rx = obstaclePos.x - this.group.position.x;
      const rz = obstaclePos.z - this.group.position.z;
      const aheadDist = rx * tempDir.x + rz * tempDir.z;
      const lateral = Math.abs(rx * sideX + rz * sideZ);
      if (aheadDist > 0 && aheadDist < 9 && lateral < 2.5) {
        blocked = true;
        break;
      }
    }

    const targetSpeed = blocked ? 0 : this.cruise;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * (blocked ? 8 : 2.5));

    this.along += this.dir * this.speed * dt;

    if (Math.abs(this.along) > EDGE + 2) {
      this.dir *= -1;
      this.speed = 0;
      this.along = Math.sign(this.along) * (EDGE + 2);
    } else if (!blocked && this.turnCooldown === 0) {
      for (const crossLine of ROAD_LINES) {
        if (Math.abs(this.along - crossLine) < 0.8 && Math.random() < TURN_CHANCE) {
          const oldLine = this.line + this.laneOffset;
          this.axis = this.axis === "x" ? "z" : "x";
          this.line = crossLine;
          this.along = oldLine;
          this.dir = Math.random() < 0.5 ? 1 : -1;
          this.turnCooldown = 3;
          break;
        }
      }
    }

    this.apply();
  }
}
