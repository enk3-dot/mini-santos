import * as THREE from "three";
import { collideCircle, MAP_HALF } from "./city.js";

const ACCELERATION = 16;
const BRAKING = 26;
const MAX_SPEED = 26;
const MAX_REVERSE = 9;
const DRAG = 6;
const STEER_RATE = 2.2;

export default class Car {
  constructor(scene, x, z, heading, color, isPolice = false) {
    this.position = new THREE.Vector3(x, 0, z);
    this.heading = heading;
    this.speed = 0;
    this.isPolice = isPolice;

    this.group = new THREE.Group();
    const bodyGeometry = new THREE.BoxGeometry(2, 0.7, 4.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: isPolice ? 0xf2f4ff : color,
      roughness: 0.4,
      metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.6, 2),
      new THREE.MeshStandardMaterial({ color: 0x12162b, roughness: 0.2, metalness: 0.5 })
    );
    cabin.position.set(0, 1.2, -0.2);

    this.group.add(body, cabin);

    if (isPolice) {
      this.lightBar = new THREE.Group();
      const red = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.25, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.2 })
      );
      red.position.set(-0.35, 1.65, -0.2);
      const blue = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.25, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x2255ff, emissive: 0x2255ff, emissiveIntensity: 2 })
      );
      blue.position.set(0.35, 1.65, -0.2);
      this.lightRed = red.material;
      this.lightBlue = blue.material;
      this.lightBar.add(red, blue);
      this.group.add(this.lightBar);
    }

    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x0e0e14 });
    for (const [wx, wz] of [[-1.05, 1.4], [1.05, 1.4], [-1.05, -1.4], [1.05, -1.4]]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(wx, 0.4, wz);
      this.group.add(wheel);
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = heading;
    scene.add(this.group);
  }

  forward() {
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  drive(dt, throttle, steerInput, game) {
    if (throttle > 0) {
      this.speed += ACCELERATION * throttle * dt;
    } else if (throttle < 0) {
      this.speed -= (this.speed > 0 ? BRAKING : ACCELERATION) * -throttle * dt;
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), DRAG * dt);
    }
    this.speed = Math.max(-MAX_REVERSE, Math.min(MAX_SPEED, this.speed));

    const steerAuthority = Math.min(1, Math.abs(this.speed) / 6);
    this.heading += steerInput * STEER_RATE * steerAuthority * dt * Math.sign(this.speed || 1);

    const forward = this.forward();
    const next = this.position.clone().addScaledVector(forward, this.speed * dt);
    next.y = 0;
    collideCircle(game.city.colliders, next, 1.4);

    const moved = next.distanceTo(this.position);
    if (moved < Math.abs(this.speed * dt) * 0.4 && Math.abs(this.speed) > 4) {
      this.speed *= -0.25;
    }
    this.position.copy(next);

    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;

    if (this.isPolice) this.flashLights();
  }

  flashLights() {
    const pulse = performance.now() * 0.01;
    this.lightRed.emissiveIntensity = 1.5 + Math.sin(pulse) * 1.4;
    this.lightBlue.emissiveIntensity = 1.5 + Math.sin(pulse + Math.PI) * 1.4;
  }

  steerToward(target, dt, game, maxSpeed = 20) {
    const desired = Math.atan2(target.x - this.position.x, target.z - this.position.z);
    let delta = desired - this.heading;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    const distance = this.position.distanceTo(target);
    const throttle = distance > 4 ? 1 : 0;
    const steer = Math.max(-1, Math.min(1, delta * 2.5));
    this.maxSpeedThisFrame = maxSpeed;
    this.drive(dt, throttle, steer, game);
    if (this.speed > maxSpeed) this.speed = maxSpeed;
  }

  boundsCheck() {
    const limit = MAP_HALF - 2;
    this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
    this.position.z = Math.max(-limit, Math.min(limit, this.position.z));
  }
}
