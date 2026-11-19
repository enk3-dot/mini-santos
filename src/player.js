import * as THREE from "three";
import { collideCircle } from "./city.js";

const GRAVITY = 30;
const JUMP_SPEED = 9;

export default class Player {
  constructor(scene, character) {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.onGround = true;

    this.group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: character.color, roughness: 0.6 });
    this.body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 12), material);
    this.body.position.y = 0.55;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xe8b88a, roughness: 0.7 })
    );
    head.position.y = 1.35;
    this.group.add(this.body, head);
    scene.add(this.group);
    this.characterMaterial = material;
  }

  setCharacter(character) {
    this.characterMaterial.color.setHex(character.color);
    this.position.copy(character.start);
    this.velocity.set(0, 0, 0);
    this.group.position.copy(this.position);
  }

  update(dt, input, game) {
    const move = new THREE.Vector3();
    if (game.inputAllowed()) {
      if (input.keys.has("forward")) move.z -= 1;
      if (input.keys.has("back")) move.z += 1;
      if (input.keys.has("left")) move.x -= 1;
      if (input.keys.has("right")) move.x += 1;
      move.normalize();

      const speed = input.keys.has("sprint") ? 10 : 5.5;
      move.multiplyScalar(speed);

      if (input.consumeJump() && this.onGround) {
        this.velocity.y = JUMP_SPEED;
        this.onGround = false;
      }
    }

    this.velocity.x = move.x;
    this.velocity.z = move.z;
    this.velocity.y -= GRAVITY * dt;
    this.position.addScaledVector(this.velocity, dt);

    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.onGround = true;
    }

    collideCircle(game.city.colliders, this.position, 0.4);

    if (move.lengthSq() > 0.1) {
      const targetAngle = Math.atan2(move.x, move.z);
      let delta = targetAngle - this.group.rotation.y;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.group.rotation.y += delta * Math.min(1, dt * 12);
      this.body.position.y = 0.55 + Math.abs(Math.sin(performance.now() * 0.012)) * 0.06;
    }

    this.group.position.copy(this.position);
  }
}
