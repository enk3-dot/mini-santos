import * as THREE from "three";

const MISSIONS = [
  {
    name: "First Steps",
    text: "Walk to the yellow marker",
    target: { x: 16, z: -16 },
    requiresCar: false,
    reward: 500
  },
  {
    name: "Borrow a Ride",
    text: "Press E near a parked car to jack it",
    target: null,
    requiresCar: true,
    reward: 500
  },
  {
    name: "Delivery Run",
    text: "Drive to the marker uptown",
    target: { x: -40, z: 16 },
    requiresCar: true,
    reward: 1000
  },
  {
    name: "The Getaway",
    text: "Lose the heat, then reach the docks marker",
    target: { x: 40, z: 40 },
    requiresCar: true,
    reward: 1500,
    timeLimit: 75
  }
];

export default class Missions {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.index = -1;
    this.timeLeft = 0;
    this.cooldown = 0;
    this.freeRoam = false;

    this.marker = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 12, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd23c,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      })
    );
    this.marker.position.y = 6;
    this.marker.visible = false;
    scene.add(this.marker);
  }

  get current() {
    return this.index >= 0 && this.index < MISSIONS.length ? MISSIONS[this.index] : null;
  }

  objectiveText() {
    if (this.freeRoam) return "Free roam — Mini Santos is yours";
    const mission = this.current;
    if (!mission) return "";
    let text = `${mission.name}: ${mission.text}`;
    if (mission.timeLimit) text += `  [${this.timeLeft.toFixed(0)}s]`;
    return text;
  }

  startNext() {
    const next = this.index + 1;
    if (next >= MISSIONS.length) {
      this.freeRoam = true;
      this.marker.visible = false;
      this.game.showToast("All missions complete!");
      return;
    }
    this.index = next;
    const mission = this.current;
    if (mission.timeLimit) this.timeLeft = mission.timeLimit;
    if (mission.target) {
      this.marker.position.set(mission.target.x, 6, mission.target.z);
      this.marker.visible = true;
    } else {
      this.marker.visible = false;
    }
    this.game.showToast(`Mission: ${mission.name}`);
  }

  complete(mission) {
    this.game.money += mission.reward;
    this.game.showToast(`${mission.name} complete  +$${mission.reward}`);
    this.marker.visible = false;
    this.index = MISSIONS.length;
    this.cooldown = 4;
  }

  fail(mission) {
    this.game.showToast("Mission failed — try again");
    this.timeLeft = mission.timeLimit;
  }

  update(dt) {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      if (this.cooldown <= 0) this.startNext();
      return;
    }
    if (this.freeRoam || !this.current) return;

    const mission = this.current;
    if (mission.timeLimit) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.fail(mission);
        return;
      }
    }

    const inCar = this.game.mode === "driving";
    if (mission.requiresCar && !inCar && !mission.target) return;
    if (mission.requiresCar && mission.target && !inCar) return;

    if (mission.target) {
      const pos = inCar ? this.game.playerCar.position : this.game.player.position;
      const dx = pos.x - mission.target.x;
      const dz = pos.z - mission.target.z;
      const entered = dx * dx + dz * dz < 9;
      if (!entered) return;
    } else if (!inCar) {
      return;
    }

    this.complete(mission);
  }
}
