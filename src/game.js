import * as THREE from "three";
import City from "./city.js";
import Player from "./player.js";
import Car from "./car.js";
import NPC from "./npc.js";
import TrafficCar from "./traffic.js";
import Minimap from "./minimap.js";
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
    this.police = [];
    this.toastTimer = 0;

    this.city = new City(this.scene);
    this.characters = CHARACTERS;
    this.player = new Player(this.scene, this.characters[0]);
    this.player.setCharacter(this.characters[0]);

    this.cars = [];
    this.spawnCars();
    this.traffic = [];
    for (let i = 0; i < 8; i++) this.traffic.push(new TrafficCar(this.scene));
    this.npcs = [];
    for (let i = 0; i < 16; i++) this.npcs.push(new NPC(this.scene, this.city));

    this.missions = new Missions(this.scene, this);
    this.minimap = new Minimap(document.getElementById("minimap"));
    this.cameraFocus = new THREE.Vector3();

    this.snow = this.buildSnow();

    this.dayRate = 1 / 150;
    this.dayTime = 0.25;
    this.daylight = 1;
    this.city.applyDayNight(this.daylight);

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
    this.setSnow(false);
    this.player.setCharacter(this.characters[0]);
    this.missions.reset();
    this.missions.startNext();
    document.getElementById("overlay").classList.add("hidden");
  }

  inputAllowed() {
    return this.state === "playing";
  }

  buildSnow() {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * 90;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() * 2 - 1) * 90;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.35,
        transparent: true,
        opacity: 0.9
      })
    );
    points.visible = false;
    this.scene.add(points);
    return points;
  }

  setSnow(on) {
    this.snow.visible = on;
  }

  updateSnow(dt) {
    if (!this.snow.visible) return;
    this.snow.position.set(this.cameraFocus.x, 0, this.cameraFocus.z);
    const attr = this.snow.geometry.attributes.position;
    for (let i = 1; i < attr.array.length; i += 3) {
      attr.array[i] -= dt * 9;
      if (attr.array[i] < 0) attr.array[i] += 40;
    }
    attr.needsUpdate = true;
  }

  spawnExtraCar(x, z, color) {
    const car = new Car(this.scene, x, z, 0, color);
    car.extra = true;
    this.cars.push(car);
    return car;
  }

  despawnCar(car) {
    this.cars = this.cars.filter((entry) => entry !== car);
    if (this.currentCar === car) {
      this.mode = "onFoot";
      this.currentCar = null;
      this.playerCar = null;
      this.player.group.visible = true;
      this.player.position.y = 0;
    }
    this.scene.remove(car.group);
  }

  setWanted(stars) {
    this.wanted = Math.min(3, stars);
    this.lastCrime = this.clock.getElapsedTime();
    this.ensurePolice();
  }

  clearHeat() {
    this.wanted = 0;
    this.removePolice();
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
    const target = this.wanted >= 3 ? 2 : 1;
    const spots = [
      this.player.position.clone().add(new THREE.Vector3(30, 0, 30)),
      this.player.position.clone().add(new THREE.Vector3(-30, 0, 30))
    ];
    while (this.police.length < target) {
      const spot = spots[this.police.length % spots.length];
      this.police.push(new Car(this.scene, spot.x, spot.z, 0, 0xffffff, true));
    }
  }

  removePolice() {
    for (const cruiser of this.police) {
      this.scene.remove(cruiser.group);
    }
    this.police = [];
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

  updateDayNight(dt) {
    this.dayTime = (this.dayTime + dt * this.dayRate) % 1;
    this.daylight = Math.max(0.05, Math.min(1, Math.sin(this.dayTime * Math.PI * 2) * 0.6 + 0.6));
    this.city.applyDayNight(this.daylight);

    const night = 1 - this.daylight;
    for (const car of this.cars) car.updateHeadlights(night * (0.25 + night * 0.75));
    for (const trafficCar of this.traffic) trafficCar.headlight.intensity = night * 2.2;
    for (const cruiser of this.police) cruiser.updateHeadlights(night);
    if (this.currentCar) this.currentCar.updateHeadlights(night);
  }

  obstaclesForTraffic(self) {
    const list = [];
    for (const cruiser of this.police) list.push(cruiser.position);
    for (const car of this.cars) list.push(car.position);
    for (const trafficCar of this.traffic) {
      if (trafficCar !== self) list.push(trafficCar.group.position);
    }
    list.push(this.mode === "driving" ? this.playerCar.position : this.player.position);
    return list;
  }

  update(dt) {
    if (this.state !== "playing") {
      this.idleCamera();
      return;
    }

    this.updateDayNight(dt);
    this.updateSnow(dt);

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
    this.minimap.update(this);
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
    if (this.police.length === 0) return;
    const targetPos = this.mode === "driving" ? this.playerCar.position : this.player.position;

    for (const cruiser of this.police) {
      cruiser.headlight.intensity = (1 - this.daylight) * 2.2;
      cruiser.steerToward(targetPos, dt, this, 19 + this.wanted * 2);

      if (cruiser.position.distanceTo(targetPos) < 3.5 && this.mode === "onFoot") {
        this.arrest();
        return;
      }
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
