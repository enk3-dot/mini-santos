import * as THREE from "three";
import City from "./city.js";
import Player from "./player.js";
import Car from "./car.js";
import NPC from "./npc.js";
import Missions from "./missions.js";
import Input from "./input.js";

const CHARACTERS = [
  { name: "F. CLINTON", color: 0x3a6bff, start: new THREE.Vector3(-6, 0, -2) },
  { name: "M. DE SANTA", color: 0xd8d8d8, start: new THREE.Vector3(38, 0, 22) },
  { name: "T. PHILIPS", color: 0xff7f27, start: new THREE.Vector3(-48, 0, 48) }
];

const CAR_COLORS = [0xd33f49, 0x3ca0d3, 0xd8b13c, 0x53c07a, 0x8f5bd8, 0xd0d0d0];

export default class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0e1a);
    this.scene.fog = new THREE.Fog(0x0b0e1a, 80, 220);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );
    this.camera.position.set(0, 14, 22);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.input = new Input();
    this.clock = new THREE.Clock();

    this.state = "menu";
    this.mode = "onFoot";
    this.money = 0;
    this.wanted = 0;
    this.lastCrime = -999;
    this.activeChar = 0;
    this.currentCar = null;
    this.playerCar = null;
    this.police = null;
    this.toastTimer = 0;

    this.city = new City(this.scene);
    this.characters = CHARACTERS;
    this.player = new Player(this.scene, this.characters[0]);
    this.player.setCharacter(this.characters[0]);

    this.cars = [];
    this.spawnCars();
    this.npcs = [];
    for (let i = 0; i < 16; i++) this.npcs.push(new NPC(this.scene, this.city));

    this.missions = new Missions(this.scene, this);
    this.cameraFocus = new THREE.Vector3();

    window.addEventListener("resize", () => this.onResize());
  }

  spawnCars() {
    const spots = [
      { x: -3, z: 8, heading: 0 },
      { x: -32, z: -3, heading: Math.PI / 2 },
      { x: 5, z: -32, heading: 0 },
      { x: 35, z: -8, heading: Math.PI },
      { x: 8, z: 35, heading: 0 },
      { x: -35, z: 32, heading: Math.PI / 2 },
      { x: -3, z: -68, heading: 0 },
      { x: 68, z: 3, heading: Math.PI }
    ];
    for (const spot of spots) {
      const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
      this.cars.push(new Car(this.scene, spot.x, spot.z, spot.heading, color));
    }
  }

  start() {
    this.state = "playing";
    this.mode = "onFoot";
    this.activeChar = 0;
    this.money = 0;
    this.wanted = 0;
    this.currentCar = null;
    this.removePolice();
    this.player.setCharacter(this.characters[0]);
    this.missions.index = -1;
    this.missions.freeRoam = false;
    this.missions.cooldown = 0;
    this.missions.startNext();
    document.getElementById("overlay").classList.add("hidden");
  }

  inputAllowed() {
    return this.state === "playing";
  }

  showToast(text) {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.classList.add("show");
    this.toastTimer = 3;
  }

  addWanted(stars) {
    this.wanted = Math.min(3, this.wanted + stars);
    this.lastCrime = this.clock.getElapsedTime();
    this.ensurePolice();
  }

  ensurePolice() {
    if (!this.police) {
      this.police = new Car(this.scene, 0, -76, 0, 0xffffff, true);
    }
  }

  removePolice() {
    if (this.police) {
      this.scene.remove(this.police.group);
      this.police = null;
    }
  }

  arrest() {
    this.money = Math.max(0, this.money - 300);
    this.wanted = 0;
    this.removePolice();
    if (this.mode === "driving") this.exitCar(true);
    this.showToast("Busted!  -$300");
  }

  tryInteract() {
    if (this.mode === "onFoot") {
      let closest = null;
      let closestDist = 16;
      for (const car of this.cars) {
        const dist = car.position.distanceToSquared(this.player.position);
        if (dist < closestDist) {
          closest = car;
          closestDist = dist;
        }
      }
      if (closest) this.enterCar(closest);
    } else {
      this.exitCar(false);
    }
  }

  enterCar(car) {
    this.mode = "driving";
    this.currentCar = car;
    this.playerCar = car;
    this.player.group.visible = false;
    this.showToast("Vehicle acquired  [E to exit]");
  }

  exitCar(forced) {
    const car = this.currentCar;
    if (!car) return;
    this.mode = "onFoot";
    this.currentCar = null;
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    this.player.position.copy(car.position).addScaledVector(side, 2.2);
    this.player.position.y = 0;
    this.player.velocity.set(0, 0, 0);
    this.player.group.visible = true;
    if (!forced) this.showToast("");
  }

  switchCharacter() {
    if (this.mode === "driving") {
      this.showToast("Get out of the car first");
      return;
    }
    this.activeChar = (this.activeChar + 1) % this.characters.length;
    const character = this.characters[this.activeChar];
    this.player.setCharacter(character);
    this.cameraFocus.copy(character.start);
    this.showToast(`Now playing as ${character.name}`);
  }

  update(dt) {
    if (this.state !== "playing") {
      this.idleCamera();
      return;
    }

    if (this.input.consumeInteract()) this.tryInteract();
    if (this.input.consumeSwitch()) this.switchCharacter();

    if (this.mode === "onFoot") {
      this.playerCar = null;
      this.player.update(dt, this.input, this);
    } else {
      const throttle =
        (this.input.keys.has("forward") ? 1 : 0) + (this.input.keys.has("back") ? -1 : 0);
      const steer = (this.input.keys.has("left") ? 1 : 0) + (this.input.keys.has("right") ? -1 : 0);
      this.currentCar.drive(dt, throttle, steer, this);
      this.playerCar = this.currentCar;
    }

    for (const car of this.cars) {
      if (car !== this.currentCar && car.speed !== 0) {
        car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 2 * dt);
      }
    }

    for (const npc of this.npcs) npc.update(dt, this);

    const fastCar = this.playerCar;
    if (fastCar && Math.abs(fastCar.speed) > 6) {
      for (const npc of this.npcs) {
        if (npc.state !== "down" && npc.position.distanceToSquared(fastCar.position) < 2.5) {
          npc.knockDown();
          this.addWanted(1);
          this.showToast("Pedestrian hit!  +1 wanted star");
        }
      }
    }

    this.updateWanted();
    this.updatePolice(dt);
    this.missions.update(dt);
    this.updateCamera(dt);
    this.updateHud();
  }

  updateWanted() {
    if (this.wanted === 0) return;
    const elapsed = this.clock.getElapsedTime();
    if (elapsed - this.lastCrime > 20) {
      this.wanted -= 1;
      this.lastCrime = elapsed;
      if (this.wanted === 0) {
        this.removePolice();
        this.showToast("You lost the cops");
      }
    }
  }

  updatePolice(dt) {
    if (!this.police) return;
    const targetPos = this.mode === "driving" ? this.playerCar.position : this.player.position;
    this.police.steerToward(targetPos, dt, this, 21);

    const near = this.police.position.distanceTo(targetPos);
    if (near < 3.5 && this.mode === "onFoot") {
      this.arrest();
    }
  }

  updateCamera(dt) {
    const targetPos = this.mode === "driving" ? this.playerCar.position : this.player.position;
    this.cameraFocus.lerp(targetPos, Math.min(1, dt * 5));

    const height = this.mode === "driving" ? 9 : 7;
    const back = this.mode === "driving" ? 13 : 9;
    const desired = new THREE.Vector3(
      this.cameraFocus.x,
      this.cameraFocus.y + height,
      this.cameraFocus.z + back
    );
    this.camera.position.lerp(desired, Math.min(1, dt * 4));
    this.camera.lookAt(this.cameraFocus.x, this.cameraFocus.y + 1.4, this.cameraFocus.z);
  }

  idleCamera() {
    const t = this.clock.getElapsedTime() * 0.08;
    this.camera.position.set(Math.cos(t) * 70, 26, Math.sin(t) * 70);
    this.camera.lookAt(0, 2, 0);
  }

  updateHud() {
    document.getElementById("char").textContent = this.characters[this.activeChar].name;
    document.getElementById("money").textContent = `$${this.money.toLocaleString()}`;
    document.getElementById("wanted").textContent = "\u2605".repeat(this.wanted);
    const mission = document.getElementById("objective");
    mission.textContent = this.missions.objectiveText();

    this.toastTimer -= 1 / 60;
    if (this.toastTimer <= 0) {
      document.getElementById("toast").classList.remove("show");
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  run() {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.update(dt);
      this.render();
    };
    loop();
  }
}
