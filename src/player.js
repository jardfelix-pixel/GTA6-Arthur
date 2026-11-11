import * as THREE from "three";
import { clamp, collidesWithBuildings } from "./utils.js";

const CHARACTER_COLORS = {
  ARTHUR: 0x647a60,
  CJ: 0xd7d3c7,
  LUCIA: 0x9b3f4e,
  JASON: 0x3f7180
};

// Monta uma silhueta low-poly com cores próprias para o personagem selecionado.
function createCharacterModel(name) {
  const model = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: CHARACTER_COLORS[name] ?? 0x647a60, roughness: 0.82 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x293342, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: name === "CJ" ? 0x80563e : 0xb98268, roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x241e1b, roughness: 0.95 });
  const shoes = new THREE.MeshStandardMaterial({ color: 0x191c21, roughness: 0.9 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.55, 3, 7), shirt);
  torso.position.y = 1.18;
  torso.castShadow = true;
  model.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), skin);
  head.position.y = 1.82;
  head.castShadow = true;
  model.add(head);
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.255, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.48), hair);
  hairTop.position.y = 1.89;
  model.add(hairTop);

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.55, 2, 5), shirt);
    arm.position.set(side * 0.45, 1.14, 0);
    arm.rotation.z = side * -0.12;
    arm.castShadow = true;
    model.add(arm);
    arms.push(arm);

    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 2, 5), pants);
    leg.position.set(side * 0.18, 0.46, 0);
    leg.castShadow = true;
    model.add(leg);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.42), shoes);
    shoe.position.set(side * 0.18, 0.13, -0.05);
    shoe.castShadow = true;
    model.add(shoe);
  }
  const legs = model.children.filter((child) => child.geometry?.type === "CapsuleGeometry" && child !== torso && child !== arms[0] && child !== arms[1]);
  return { model, arms, legs };
}

// Cria o jogador e mantém o estado de pulo e de câmera em terceira pessoa.
export function createPlayer(scene, name) {
  const { model, arms, legs } = createCharacterModel(name);
  model.position.set(-2.2, 0, -3.2);
  scene.add(model);
  return {
    model,
    arms,
    legs,
    velocityY: 0,
    cameraYaw: 0.24,
    cameraPitch: 0.24,
    walkPhase: 0,
    moveSpeed: 4.8
  };
}

// Aplica deslocamento relativo à câmera, colisão por eixo, gravidade e animação.
export function updatePlayer(player, camera, keys, jumpRequested, dt, colliders) {
  const forward = Number(keys.has("w")) - Number(keys.has("s"));
  const strafe = Number(keys.has("d")) - Number(keys.has("a"));
  const inputLength = Math.hypot(forward, strafe);
  const moving = inputLength > 0;
  let moveX = 0;
  let moveZ = 0;

  if (moving) {
    const forwardAmount = forward / inputLength;
    const strafeAmount = strafe / inputLength;
    moveX = Math.sin(player.cameraYaw) * forwardAmount + Math.cos(player.cameraYaw) * strafeAmount;
    moveZ = -Math.cos(player.cameraYaw) * forwardAmount + Math.sin(player.cameraYaw) * strafeAmount;
    const sprint = keys.has("shift") ? 1.65 : 1;
    const distance = player.moveSpeed * sprint * dt;
    const nextX = clamp(player.model.position.x + moveX * distance, -166, 166);
    if (!collidesWithBuildings(nextX, player.model.position.z, 0.38, 0.38, colliders)) {
      player.model.position.x = nextX;
    }
    const nextZ = clamp(player.model.position.z + moveZ * distance, -166, 166);
    if (!collidesWithBuildings(player.model.position.x, nextZ, 0.38, 0.38, colliders)) {
      player.model.position.z = nextZ;
    }
    player.model.rotation.y = Math.atan2(moveX, -moveZ);
  }

  if (jumpRequested && player.model.position.y <= 0.001) player.velocityY = 7.3;
  player.velocityY -= 19.5 * dt;
  player.model.position.y = Math.max(0, player.model.position.y + player.velocityY * dt);
  if (player.model.position.y === 0) player.velocityY = 0;

  if (moving) {
    player.walkPhase += dt * (keys.has("shift") ? 13 : 9);
    const swing = Math.sin(player.walkPhase) * 0.48;
    player.arms[0].rotation.x = swing;
    player.arms[1].rotation.x = -swing;
    player.legs.forEach((leg, index) => {
      leg.rotation.x = Math.sin(player.walkPhase + index * Math.PI) * 0.55;
    });
  } else {
    player.arms.forEach((arm) => { arm.rotation.x *= Math.exp(-8 * dt); });
    player.legs.forEach((leg) => { leg.rotation.x *= Math.exp(-8 * dt); });
  }

  const focus = player.model.position.clone().add(new THREE.Vector3(0, 1.15, 0));
  const distance = 7.2;
  const horizontalDistance = distance * Math.cos(player.cameraPitch);
  const desiredCamera = new THREE.Vector3(
    focus.x + Math.sin(player.cameraYaw) * horizontalDistance,
    focus.y + Math.sin(player.cameraPitch) * distance + 0.45,
    focus.z + Math.cos(player.cameraYaw) * horizontalDistance
  );
  camera.position.lerp(desiredCamera, 1 - Math.exp(-7 * dt));
  camera.lookAt(focus);
  return moving;
}

// Atualiza a câmera ao dirigir e oculta o avatar para não atravessar o veículo.
export function updatePlayerVehicleCamera(player, camera, vehicle, dt) {
  const focus = vehicle.group.position.clone().add(new THREE.Vector3(0, 1.15, 0));
  const distance = 9;
  const horizontalDistance = distance * Math.cos(player.cameraPitch);
  const yaw = vehicle.yaw + player.cameraYaw * 0.35;
  const desiredCamera = new THREE.Vector3(
    focus.x + Math.sin(yaw) * horizontalDistance,
    focus.y + Math.sin(player.cameraPitch) * distance + 0.55,
    focus.z + Math.cos(yaw) * horizontalDistance
  );
  camera.position.lerp(desiredCamera, 1 - Math.exp(-5 * dt));
  camera.lookAt(focus);
}
