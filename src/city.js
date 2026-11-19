import * as THREE from "three";

export const GRID_MIDDLE = 2;
export const BLOCK = 22;
export const ROAD = 10;
export const STEP = BLOCK + ROAD;
export const MAP_HALF = 80;

export const ROAD_LINES = [-GRID_MIDDLE * STEP, -STEP, 0, STEP, GRID_MIDDLE * STEP];

const BUILDING_COLORS = [0x3a4368, 0x2f3a5c, 0x46527e, 0x37406a, 0x2c3550];
const SIDEWALK_COLOR = 0x565f80;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function collideCircle(colliders, position, radius) {
  for (const box of colliders) {
    const closestX = clamp(position.x, box.minX, box.maxX);
    const closestZ = clamp(position.z, box.minZ, box.maxZ);
    const dx = position.x - closestX;
    const dz = position.z - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = (radius - dist) / dist;
        position.x += dx * push;
        position.z += dz * push;
      } else {
        const toLeft = Math.abs(position.x - box.minX);
        const toRight = Math.abs(box.maxX - position.x);
        const toBack = Math.abs(position.z - box.minZ);
        const toFront = Math.abs(box.maxZ - position.z);
        const minPen = Math.min(toLeft, toRight, toBack, toFront);
        if (minPen === toLeft) position.x = box.minX - radius;
        else if (minPen === toRight) position.x = box.maxX + radius;
        else if (minPen === toBack) position.z = box.minZ - radius;
        else position.z = box.maxZ + radius;
      }
    }
  }
  const limit = MAP_HALF - radius - 1;
  position.x = clamp(position.x, -limit, limit);
  position.z = clamp(position.z, -limit, limit);
}

export function randomRoadPoint(random = Math.random) {
  const line = ROAD_LINES[Math.floor(random() * ROAD_LINES.length)];
  const along = (random() * 2 - 1) * (MAP_HALF - 8);
  const lane = random() < 0.5 ? ROAD / 4 : -ROAD / 4;
  if (random() < 0.5) {
    return { x: line + lane, z: along };
  }
  return { x: along, z: line + lane };
}

export default class City {
  constructor(scene) {
    this.colliders = [];
    this.scene = scene;
    this.buildGround();
    this.buildBlocks();
    this.buildRoadMarks();
    this.buildProps();
  }

  buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_HALF * 2 + 20, MAP_HALF * 2 + 20),
      new THREE.MeshStandardMaterial({ color: 0x22263d, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const outside = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: 0x141830, roughness: 1 })
    );
    outside.rotation.x = -Math.PI / 2;
    outside.position.y = -0.05;
    this.scene.add(outside);
  }

  buildBlocks() {
    const slabMaterial = new THREE.MeshStandardMaterial({ color: SIDEWALK_COLOR, roughness: 0.95 });
    const palette = BUILDING_COLORS.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
    );

    for (let bx = 0; bx < ROAD_LINES.length - 1; bx++) {
      for (let bz = 0; bz < ROAD_LINES.length - 1; bz++) {
        const centerX = (ROAD_LINES[bx] + ROAD_LINES[bx + 1]) / 2;
        const centerZ = (ROAD_LINES[bz] + ROAD_LINES[bz + 1]) / 2;

        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(BLOCK + 2, 0.3, BLOCK + 2),
          slabMaterial
        );
        slab.position.set(centerX, 0.15, centerZ);
        this.scene.add(slab);

        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const width = 6 + Math.random() * 8;
          const depth = 6 + Math.random() * 8;
          const height = 5 + Math.random() * 22;
          const px = centerX + (Math.random() - 0.5) * (BLOCK - width - 2);
          const pz = centerZ + (Math.random() - 0.5) * (BLOCK - depth - 2);

          const building = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            palette[Math.floor(Math.random() * palette.length)]
          );
          building.position.set(px, height / 2 + 0.3, pz);
          this.scene.add(building);

          this.colliders.push({
            minX: px - width / 2,
            maxX: px + width / 2,
            minZ: pz - depth / 2,
            maxZ: pz + depth / 2
          });
        }
      }
    }
  }

  buildRoadMarks() {
    const dashLength = 3;
    const perLine = Math.floor((MAP_HALF * 2) / (dashLength * 2));
    const count = ROAD_LINES.length * perLine * 2;
    const dashGeometry = new THREE.BoxGeometry(dashLength, 0.05, 0.4);
    const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xd8dce8 });
    const dashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, count);

    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Matrix4();
    let i = 0;
    for (const line of ROAD_LINES) {
      for (let along = -MAP_HALF + 4; along < MAP_HALF - 4; along += dashLength * 2) {
        matrix.makeTranslation(line, 0.04, along);
        dashes.setMatrixAt(i++, matrix);

        rotation.makeRotationY(Math.PI / 2);
        matrix.makeTranslation(along, 0.04, line).multiply(rotation);
        dashes.setMatrixAt(i++, matrix);
      }
    }
    dashes.count = i;
    this.scene.add(dashes);
  }

  buildProps() {
    const lampGeometry = new THREE.BoxGeometry(0.4, 5, 0.4);
    const lampMaterial = new THREE.MeshStandardMaterial({ color: 0x6a74a0 });
    for (const line of ROAD_LINES) {
      for (const along of [-MAP_HALF + 10, -20, 20, MAP_HALF - 10]) {
        for (const side of [-6, 6]) {
          const post = new THREE.Mesh(lampGeometry, lampMaterial);
          post.position.set(line + side, 2.5, along);
          this.scene.add(post);

          const bulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshStandardMaterial({
              color: 0xfff2c0,
              emissive: 0xffd77a,
              emissiveIntensity: 1.2
            })
          );
          bulb.position.set(line + side, 5.2, along);
          this.scene.add(bulb);
        }
      }
    }

    for (let i = 0; i < 250; i++) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x8892c8 })
      );
      const angle = Math.random() * Math.PI * 2;
      const radius = 90 + Math.random() * 90;
      star.position.set(Math.cos(angle) * radius, 10 + Math.random() * 50, Math.sin(angle) * radius);
      this.scene.add(star);
    }
  }
}
