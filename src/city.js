import * as THREE from "three";
import { randomRange } from "./utils.js";

const ROAD_SPACING = 54;
const ROAD_WIDTH = 14;
const ROAD_LINES = [-135, -81, -27, 27, 81, 135];

// Gera ruas, quarteirões, prédios instanciados e vegetação usando uma semente estável.
export function createCity(scene, random) {
  const citySpan = 340;
  const colliders = [];
  const buildingData = [];
  const windowData = [];
  const trunkData = [];
  const leafData = [];
  const shrubData = [];
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const tempObject = new THREE.Object3D();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(430, 430),
    new THREE.MeshStandardMaterial({ color: 0x47535a, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.17;
  ground.receiveShadow = true;
  scene.add(ground);

  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x242a31, roughness: 0.94 });
  const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x8c8981, roughness: 0.92 });
  const roadGeometry = new THREE.BoxGeometry(ROAD_WIDTH, 0.12, citySpan);
  const sidewalkGeometry = new THREE.BoxGeometry(3, 0.16, citySpan);
  const crossSidewalkGeometry = new THREE.BoxGeometry(citySpan, 0.16, 3);
  for (const line of ROAD_LINES) {
    const verticalRoad = new THREE.Mesh(roadGeometry, roadMaterial);
    verticalRoad.position.set(line, -0.08, 0);
    verticalRoad.receiveShadow = true;
    scene.add(verticalRoad);

    const horizontalRoad = new THREE.Mesh(roadGeometry, roadMaterial);
    horizontalRoad.rotation.y = Math.PI / 2;
    horizontalRoad.position.set(0, -0.08, line);
    horizontalRoad.receiveShadow = true;
    scene.add(horizontalRoad);

    for (const side of [-1, 1]) {
      const verticalWalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      verticalWalk.position.set(line + side * 8.5, -0.025, 0);
      verticalWalk.receiveShadow = true;
      scene.add(verticalWalk);

      const horizontalWalk = new THREE.Mesh(crossSidewalkGeometry, sidewalkMaterial);
      horizontalWalk.position.set(0, -0.025, line + side * 8.5);
      horizontalWalk.receiveShadow = true;
      scene.add(horizontalWalk);
    }
  }

  // Marcações da pista são uma única malha instanciada para reduzir chamadas de desenho.
  const markingTransforms = [];
  for (const line of ROAD_LINES) {
    for (let offset = -165; offset <= 165; offset += 10) {
      markingTransforms.push({ x: line, z: offset, rotation: 0, sx: 0.14, sz: 4.2 });
      markingTransforms.push({ x: offset, z: line, rotation: Math.PI / 2, sx: 0.14, sz: 4.2 });
    }
  }
  const markingMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xe7d6a5, roughness: 0.7 }),
    markingTransforms.length
  );
  markingTransforms.forEach((mark, index) => {
    tempObject.position.set(mark.x, -0.008, mark.z);
    tempObject.rotation.set(0, mark.rotation, 0);
    tempObject.scale.set(mark.sx, 0.025, mark.sz);
    tempObject.updateMatrix();
    markingMesh.setMatrixAt(index, tempObject.matrix);
  });
  markingMesh.instanceMatrix.needsUpdate = true;
  scene.add(markingMesh);

  // A praça central deixa o ponto de início livre e cria um marco visual na cidade.
  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(38, 0.12, 38),
    new THREE.MeshStandardMaterial({ color: 0x65746f, roughness: 0.88 })
  );
  plaza.position.set(0, -0.08, 0);
  plaza.receiveShadow = true;
  scene.add(plaza);
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.8, 0.8, 10),
    new THREE.MeshStandardMaterial({ color: 0xbbb2a1, roughness: 0.7 })
  );
  fountain.position.set(0, 0.32, 0);
  fountain.castShadow = true;
  fountain.receiveShadow = true;
  scene.add(fountain);
  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(2.7, 2.7, 0.12, 12),
    new THREE.MeshStandardMaterial({ color: 0x41b9c9, roughness: 0.22, metalness: 0.35 })
  );
  fountainWater.position.set(0, 0.78, 0);
  scene.add(fountainWater);

  const buildingColors = [0x625e61, 0x77716b, 0x545e68, 0x89796f, 0x4c5b62, 0x807d72];
  for (let row = 0; row < ROAD_LINES.length - 1; row += 1) {
    for (let column = 0; column < ROAD_LINES.length - 1; column += 1) {
      const centerX = (ROAD_LINES[column] + ROAD_LINES[column + 1]) / 2;
      const centerZ = (ROAD_LINES[row] + ROAD_LINES[row + 1]) / 2;
      if (row === 2 && column === 2) continue;

      const sites = [
        [-10, -10], [10, -10], [-10, 10], [10, 10]
      ];
      const count = 2 + Math.floor(random() * 3);
      for (const [offsetX, offsetZ] of sites.slice(0, count)) {
        const width = randomRange(8.5, 12.5, random);
        const depth = randomRange(8.5, 12.5, random);
        const floors = 3 + Math.floor(random() * 12);
        const height = floors * randomRange(2.5, 2.9, random);
        const x = centerX + offsetX;
        const z = centerZ + offsetZ;
        const color = buildingColors[Math.floor(random() * buildingColors.length)];
        buildingData.push({ x, z, width, depth, height, color });
        colliders.push({
          minX: x - width / 2,
          maxX: x + width / 2,
          minZ: z - depth / 2,
          maxZ: z + depth / 2
        });

        const floorCount = Math.max(2, Math.floor(height / 2.8));
        const frontCount = Math.max(2, Math.floor(width / 1.8));
        const sideCount = Math.max(2, Math.floor(depth / 1.8));
        for (let floor = 0; floor < floorCount; floor += 1) {
          const y = 1.75 + floor * 2.65;
          for (let pane = 0; pane < frontCount; pane += 1) {
            const paneX = x - width / 2 + (pane + 0.5) * (width / frontCount);
            windowData.push({ x: paneX, y, z: z + depth / 2 + 0.012, rotation: 0 });
            windowData.push({ x: paneX, y, z: z - depth / 2 - 0.012, rotation: 0 });
          }
          for (let pane = 0; pane < sideCount; pane += 1) {
            const paneZ = z - depth / 2 + (pane + 0.5) * (depth / sideCount);
            windowData.push({ x: x + width / 2 + 0.012, y, z: paneZ, rotation: Math.PI / 2 });
            windowData.push({ x: x - width / 2 - 0.012, y, z: paneZ, rotation: Math.PI / 2 });
          }
        }
      }
    }
  }

  // Prédios e janelas compartilham geometria; a variação vem das matrizes e cores por instância.
  const buildings = new THREE.InstancedMesh(
    boxGeometry,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.12 }),
    buildingData.length
  );
  buildingData.forEach((building, index) => {
    tempObject.position.set(building.x, building.height / 2, building.z);
    tempObject.rotation.set(0, 0, 0);
    tempObject.scale.set(building.width, building.height, building.depth);
    tempObject.updateMatrix();
    buildings.setMatrixAt(index, tempObject.matrix);
    buildings.setColorAt(index, new THREE.Color(building.color));
  });
  buildings.castShadow = true;
  buildings.receiveShadow = true;
  buildings.instanceMatrix.needsUpdate = true;
  scene.add(buildings);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xb7d9e3,
    emissive: 0xff9c59,
    emissiveIntensity: 0.025,
    roughness: 0.32,
    metalness: 0.28
  });
  const windows = new THREE.InstancedMesh(boxGeometry, windowMaterial, windowData.length);
  windowData.forEach((pane, index) => {
    tempObject.position.set(pane.x, pane.y, pane.z);
    tempObject.rotation.set(0, pane.rotation, 0);
    tempObject.scale.set(0.82, 1.12, 0.035);
    tempObject.updateMatrix();
    windows.setMatrixAt(index, tempObject.matrix);
  });
  windows.instanceMatrix.needsUpdate = true;
  scene.add(windows);

  // Posiciona palmeiras nas calçadas e agrupa troncos e folhas em malhas instanciadas.
  function addPalm(x, z) {
    const height = randomRange(5.2, 7.2, random);
    trunkData.push({ x, z, height, lean: randomRange(-0.09, 0.09, random) });
    for (let leaf = 0; leaf < 7; leaf += 1) {
      const angle = (leaf / 7) * Math.PI * 2 + randomRange(-0.18, 0.18, random);
      const direction = new THREE.Vector3(Math.sin(angle) * 0.9, -0.32, Math.cos(angle) * 0.9).normalize();
      const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      leafData.push({
        x, y: height - 0.2, z, height: randomRange(0.86, 1.12, random),
        rotation, color: random() > 0.5 ? 0x2d7659 : 0x39845c
      });
    }
  }
  for (const line of ROAD_LINES) {
    for (let step = -150; step <= 150; step += 20) {
      if (ROAD_LINES.some((crossing) => Math.abs(step - crossing) < 14)) continue;
      for (const side of [-1, 1]) {
        addPalm(line + side * 10, step);
        addPalm(step, line + side * 10);
      }
    }
  }
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2;
    addPalm(Math.sin(angle) * 15, Math.cos(angle) * 15);
  }

  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.18, 0.34, 1, 6),
    new THREE.MeshStandardMaterial({ color: 0x795b43, roughness: 1 }),
    trunkData.length
  );
  trunkData.forEach((palm, index) => {
    tempObject.position.set(palm.x, palm.height / 2, palm.z);
    tempObject.rotation.set(palm.lean, 0, palm.lean * 0.55);
    tempObject.scale.set(1, palm.height, 1);
    tempObject.updateMatrix();
    trunkMesh.setMatrixAt(index, tempObject.matrix);
  });
  trunkMesh.castShadow = true;
  trunkMesh.instanceMatrix.needsUpdate = true;
  scene.add(trunkMesh);

  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0, -0.28, 1.3, 0, -0.5, 2.4, 0, 0, 4, 0, 0.5, 2.4, 0, 0.28, 1.3, 0
  ], 3));
  leafGeometry.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]);
  leafGeometry.computeVertexNormals();
  const leaves = new THREE.InstancedMesh(
    leafGeometry,
    new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 }),
    leafData.length
  );
  leafData.forEach((leaf, index) => {
    tempObject.position.set(leaf.x, leaf.y, leaf.z);
    tempObject.quaternion.copy(leaf.rotation);
    tempObject.scale.set(leaf.height, leaf.height, leaf.height);
    tempObject.updateMatrix();
    leaves.setMatrixAt(index, tempObject.matrix);
    leaves.setColorAt(index, new THREE.Color(leaf.color));
  });
  leaves.castShadow = true;
  leaves.instanceMatrix.needsUpdate = true;
  scene.add(leaves);

  // Arbustos low-poly completam os canteiros sem adicionar milhares de objetos individuais.
  for (let index = 0; index < 42; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = randomRange(17, 18.5, random);
    shrubData.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      scale: randomRange(0.45, 0.9, random)
    });
  }
  const shrubs = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.8, 0),
    new THREE.MeshStandardMaterial({ color: 0x30714f, roughness: 1 }),
    shrubData.length
  );
  shrubData.forEach((shrub, index) => {
    tempObject.position.set(shrub.x, shrub.scale * 0.7, shrub.z);
    tempObject.rotation.set(random(), random(), random());
    tempObject.scale.set(shrub.scale * 1.2, shrub.scale, shrub.scale);
    tempObject.updateMatrix();
    shrubs.setMatrixAt(index, tempObject.matrix);
  });
  shrubs.castShadow = true;
  scene.add(shrubs);

  // A força emissiva transforma as janelas em pontos de luz ao anoitecer.
  function setNight(isNight) {
    windowMaterial.emissiveIntensity = isNight ? 1.35 : 0.025;
    windowMaterial.needsUpdate = true;
  }

  return { colliders, citySize: citySpan, roadWidth: ROAD_WIDTH, roadSpacing: ROAD_SPACING, roadLines: ROAD_LINES, setNight };
}
