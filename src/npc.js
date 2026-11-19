import * as THREE from "three";
import { collideCircle, randomRoadPoint } from "./city.js";

const SHIRT_COLORS = [0xe05747, 0x47b3e0, 0x7ac74f, 0xe0b23c, 0xb057c9, 0xd9d9d9];

export default class NPC {
  constructor(scene, city) {
    this.city = city;
    this.group = new THREE.Group();
    const color = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];
    this.body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 1, 10),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
    );
    this.body.position.y = 0.5;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xe8b88a })
    );
    head.position.y = 1.2;
    this.group.add(this.body, head);
    scene.add(this.group);

    this.respawn();
  }

  respawn() {
    const point = randomRoadPoint();
    this.position = new THREE.Vector3(point.x, 0, point.z);
    this.state = "walk";
    this.downTimer = 0;
    this.pickTarget();
    this.group.rotation.x = 0;
    this.group.visible = true;
  }

  pickTarget() {
    const point = randomRoadPoint();
    this.target = new THREE.Vector3(point.x, 0, point.z);
  }

  knockDown() {
    if (this.state !== "down") {
      this.state = "down";
      this.downTimer = 10;
      this.group.rotation.x = Math.PI / 2;
      this.body.position.y = 0.25;
    }
  }

  update(dt, game) {
    if (this.state === "down") {
      this.downTimer -= dt;
      if (this.downTimer <= 0) this.respawn();
      this.group.position.copy(this.position);
      return;
    }

    const car = game.playerCar;
    let move = new THREE.Vector3();

    if (car && car.speed > 10 && car.position.distanceToSquared(this.position) < 100) {
      this.state = "flee";
      const away = this.position.clone().sub(car.position);
      away.y = 0;
      away.normalize();
      this.target.copy(this.position).addScaledVector(away, 8);
      move.copy(away).multiplyScalar(6);
    } else if (this.state === "flee") {
      this.state = "walk";
      this.pickTarget();
    }

    if (this.state === "walk") {
      const toTarget = this.target.clone().sub(this.position);
      toTarget.y = 0;
      if (toTarget.length() < 1) {
        this.pickTarget();
      } else {
        move.copy(toTarget.normalize().multiplyScalar(2));
      }
    }

    this.position.addScaledVector(move, dt);
    collideCircle(this.city.colliders, this.position, 0.35);

    if (move.lengthSq() > 0.01) {
      this.group.rotation.y = Math.atan2(move.x, move.z);
      this.body.position.y = 0.5 + Math.abs(Math.sin(performance.now() * 0.01 + this.position.x)) * 0.08;
    }
    this.group.position.copy(this.position);
  }
}
