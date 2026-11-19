import * as THREE from "three";
import { randomRoadPoint } from "./city.js";

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
    text: "Reach the docks marker before the timer runs out",
    target: { x: 40, z: 40 },
    requiresCar: true,
    reward: 1500,
    timeLimit: 75
  },
  {
    name: "Repossession",
    type: "repo",
    reward: 2000,
    dealership: { x: 52, z: -34.5 }
  },
  {
    name: "The North Yankton Job",
    type: "heist",
    reward: 5000,
    bank: { x: 16, z: 16 },
    safehouse: { x: 58, z: 66.5 },
    timeLimit: 90
  }
];

const HOLD_DURATION = 3;

export default class Missions {
  constructor(scene, game) {
    this.scene = scene;
    this.game = game;
    this.index = -1;
    this.stage = 0;
    this.stageTimer = 0;
    this.timeLeft = 0;
    this.cooldown = 0;
    this.freeRoam = false;
    this.repoCar = null;
    this.getawayCar = null;

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

  reset() {
    this.index = -1;
    this.stage = 0;
    this.stageTimer = HOLD_DURATION;
    this.cooldown = 0;
    this.freeRoam = false;
    this.timeLeft = 0;
    if (this.repoCar) {
      this.game.despawnCar(this.repoCar);
      this.repoCar = null;
    }
    if (this.getawayCar) {
      this.game.despawnCar(this.getawayCar);
      this.getawayCar = null;
    }
    this.marker.visible = false;
  }

  objectiveText() {
    if (this.freeRoam) return "Free roam — Mini Santos is yours";
    const mission = this.current;
    if (!mission) return "";
    const name = mission.name;
    if (mission.type === "repo") {
      return this.stage === 0
        ? `${name}: Steal the marked car anywhere in town`
        : `${name}: Deliver it to the dealership`;
    }
    if (mission.type === "heist") {
      switch (this.stage) {
        case 0: return `${name}: Go to the bank`;
        case 1: return `${name}: GRAB THE CASH! (${this.stageTimer.toFixed(1)}s)`;
        case 2: return `${name}: Get to the getaway car!`;
        default: return `${name}: Escape to the safehouse  [${this.timeLeft.toFixed(0)}s]`;
      }
    }
    let text = `${name}: ${mission.text}`;
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
    this.stage = 0;
    this.stageTimer = HOLD_DURATION;
    const mission = this.current;

    if (mission.type === "repo") {
      const point = randomRoadPoint();
      this.repoCar = this.game.spawnExtraCar(point.x, point.z, 0x8f2bd8);
      this.marker.visible = true;
    } else if (mission.type === "heist") {
      this.marker.position.set(mission.bank.x, 6, mission.bank.z);
      this.marker.visible = true;
    } else if (mission.timeLimit) {
      this.timeLeft = mission.timeLimit;
    }

    if (mission.target) {
      this.marker.position.set(mission.target.x, 6, mission.target.z);
      this.marker.visible = true;
    }
    this.game.showToast(`Mission: ${mission.name}`);
  }

  complete(mission) {
    this.game.money += mission.reward;
    this.game.showToast(`${mission.name} complete  +$${mission.reward}`);
    if (this.repoCar) {
      this.game.despawnCar(this.repoCar);
      this.repoCar = null;
    }
    if (this.getawayCar) {
      this.game.despawnCar(this.getawayCar);
      this.getawayCar = null;
    }
    if (mission.type === "heist") {
      this.game.setSnow(false);
      this.game.clearHeat();
    }
    this.marker.visible = false;
    this.index = MISSIONS.length;
    this.cooldown = 4;
  }

  failHeist() {
    this.game.showToast("Trail went cold... retry: reach the safehouse!");
    this.timeLeft = this.current.timeLimit;
  }

  update(dt) {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      if (this.cooldown <= 0) this.startNext();
      return;
    }
    if (this.freeRoam || !this.current) return;

    const mission = this.current;
    const type = mission.type;

    if (type === "repo") {
      this.updateRepo(mission);
      return;
    }
    if (type === "heist") {
      this.updateHeist(mission, dt);
      return;
    }

    if (mission.timeLimit) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.game.showToast("Mission failed — try again");
        this.timeLeft = mission.timeLimit;
        return;
      }
    }

    const inCar = this.game.mode === "driving";
    if (mission.requiresCar && !inCar) return;

    if (mission.target) {
      const pos = inCar ? this.game.playerCar.position : this.game.player.position;
      const dx = pos.x - mission.target.x;
      const dz = pos.z - mission.target.z;
      if (dx * dx + dz * dz >= 9) return;
    }

    this.complete(mission);
  }

  updateRepo(mission) {
    if (this.stage === 0) {
      if (!this.repoCar) {
        const point = randomRoadPoint();
        this.repoCar = this.game.spawnExtraCar(point.x, point.z, 0x8f2bd8);
      } else {
        this.marker.position.set(this.repoCar.position.x, 5, this.repoCar.position.z);
        if (this.game.playerCar === this.repoCar) {
          this.stage = 1;
          this.marker.position.set(mission.dealership.x, 6, mission.dealership.z);
          this.game.showToast("Nice. Now deliver it to the dealership!");
        }
      }
      return;
    }

    const pos = this.game.playerCar ? this.game.playerCar.position : this.game.player.position;
    const dx = pos.x - mission.dealership.x;
    const dz = pos.z - mission.dealership.z;
    if (dx * dx + dz * dz < 20) {
      this.complete(mission);
    }
  }

  updateHeist(mission, dt) {
    const playerPos = this.game.mode === "driving" ? this.game.playerCar.position : this.game.player.position;

    if (this.stage === 0) {
      this.marker.position.set(mission.bank.x, 6, mission.bank.z);
      const dx = playerPos.x - mission.bank.x;
      const dz = playerPos.z - mission.bank.z;
      if (dx * dx + dz * dz < 16) {
        this.stage = 1;
        this.stageTimer = HOLD_DURATION;
      }
      return;
    }

    if (this.stage === 1) {
      const dx = playerPos.x - mission.bank.x;
      const dz = playerPos.z - mission.bank.z;
      if (dx * dx + dz * dz < 16) {
        this.stageTimer -= dt;
        if (this.stageTimer <= 0) {
          this.stage = 2;
          this.game.setWanted(3);
          this.game.setSnow(true);
          this.getawayCar = this.game.spawnExtraCar(16, 2.5, 0x101418);
          this.game.showToast("ALARM TRIPPED! To the getaway car!");
          this.marker.visible = true;
        }
      } else {
        this.stageTimer = Math.min(HOLD_DURATION, this.stageTimer + dt);
      }
      return;
    }

    if (this.stage === 2) {
      this.marker.position.set(this.getawayCar.position.x, 5, this.getawayCar.position.z);
      if (this.game.playerCar === this.getawayCar) {
        this.stage = 3;
        this.timeLeft = mission.timeLimit;
        this.marker.position.set(mission.safehouse.x, 6, mission.safehouse.z);
        this.game.showToast("DRIVE! Get to the safehouse!");
      }
      return;
    }

    this.timeLeft -= dt;
    const dx = playerPos.x - mission.safehouse.x;
    const dz = playerPos.z - mission.safehouse.z;
    if (dx * dx + dz * dz < 25) {
      this.complete(mission);
    } else if (this.timeLeft <= 0) {
      this.failHeist();
    }
  }
}
