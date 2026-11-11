import * as THREE from "three";
import { clamp, collidesWithBuildings } from "./utils.js";

// Constrói um carro simples com carroceria, vidros e rodas para condução arcade.
export function createVehicle(scene) {
  const group = new THREE.Group();
  group.position.set(0.8, 0, -1.2);
  const paint = new THREE.MeshStandardMaterial({ color: 0xc34e63, roughness: 0.32, metalness: 0.58 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x263e50, roughness: 0.22, metalness: 0.48 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x161a20, roughness: 0.92 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.72, 4.25), paint);
  body.position.y = 0.78;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.2, 1.05), paint);
  hood.position.set(0, 1.18, -1.35);
  hood.castShadow = true;
  group.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.78, 1.95), glass);
  cabin.position.set(0, 1.45, 0.02);
  cabin.castShadow = true;
  group.add(cabin);

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe6b0,
    emissive: 0xffb55e,
    emissiveIntensity: 0.6
  });
  for (const side of [-1, 1]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), headlightMaterial);
    headlight.position.set(side * 0.67, 0.92, -2.17);
    group.add(headlight);
  }

  const wheelGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10);
  const wheels = [];
  for (const x of [-1.12, 1.12]) {
    for (const z of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(wheelGeometry, rubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.38, z);
      wheel.castShadow = true;
      group.add(wheel);
      wheels.push(wheel);
    }
  }
  scene.add(group);
  return { group, wheels, speed: 0, yaw: 0 };
}

// Acelera, freia e esterça suavemente; colisões interrompem o carro antes dos prédios.
export function updateVehicle(vehicle, keys, dt, colliders) {
  const forward = keys.has("w");
  const reverse = keys.has("s");
  const steering = Number(keys.has("d")) - Number(keys.has("a"));

  if (forward) vehicle.speed = Math.min(34, vehicle.speed + 17 * dt);
  if (reverse) vehicle.speed = Math.max(-12, vehicle.speed - 12 * dt);
  if (!forward && !reverse) {
    const friction = 5.2 * dt;
    vehicle.speed = Math.abs(vehicle.speed) <= friction ? 0 : vehicle.speed - Math.sign(vehicle.speed) * friction;
  }

  const speedFactor = Math.min(1, Math.abs(vehicle.speed) / 12);
  vehicle.yaw += steering * dt * (0.25 + speedFactor * 1.7) * Math.sign(vehicle.speed);
  const nextX = clamp(vehicle.group.position.x + Math.sin(vehicle.yaw) * vehicle.speed * dt, -166, 166);
  const nextZ = clamp(vehicle.group.position.z - Math.cos(vehicle.yaw) * vehicle.speed * dt, -166, 166);
  if (collidesWithBuildings(nextX, nextZ, 1.22, 2.35, colliders)) {
    vehicle.speed = 0;
  } else {
    vehicle.group.position.set(nextX, 0, nextZ);
  }
  vehicle.group.rotation.y = vehicle.yaw;
  vehicle.wheels.forEach((wheel) => {
    wheel.rotation.x -= (vehicle.speed * dt) / 0.36;
  });
  return Math.round(Math.abs(vehicle.speed) * 3.6);
}
