import { createScene } from "./scene.js";
import { createCity } from "./city.js";
import { createPlayer, updatePlayer, updatePlayerVehicleCamera } from "./player.js";
import { createVehicle, updateVehicle } from "./vehicle.js";
import { clamp, collidesWithBuildings, createRandom } from "./utils.js";
import { createUI } from "./ui.js";

const introScreen = document.querySelector("#intro-screen");
const gameScreen = document.querySelector("#game-screen");
const gameWorld = document.querySelector("#game-world");
const startButton = document.querySelector("#start-button");
const exitButton = document.querySelector("#exit-button");
const timeToggle = document.querySelector("#time-toggle");
const loadError = document.querySelector("#load-error");
const characterOptions = [...document.querySelectorAll(".character-option")];
const selectedCharacter = document.querySelector("#selected-character");
const characterCount = document.querySelector(".character-count");

const keys = new Set();
let character = { name: "ARTHUR", image: "./img/Arthur.png" };
let systems;
let running = false;
let isNight = false;
let driving = false;
let jumpRequested = false;
let animationFrame = 0;
let previousTime = 0;
let dragging = false;

// Atualiza a seleção visível mantendo os retratos originais do projeto.
characterOptions.forEach((option, index) => {
  option.addEventListener("click", () => {
    character = { name: option.dataset.name, image: option.dataset.image };
    characterOptions.forEach((item) => {
      const selected = item === option;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    selectedCharacter.textContent = character.name;
    characterCount.innerHTML = `${String(index + 1).padStart(2, "0")} <span>/</span> 04`;
  });
});

// Inicializa o mundo somente após o jogador confirmar o personagem.
function createGame() {
  const world = createScene(gameWorld);
  const random = createRandom(2026);
  const city = createCity(world.scene, random);
  const player = createPlayer(world.scene, character.name);
  const vehicle = createVehicle(world.scene);
  const ui = createUI();
  ui.setCharacter(character.name, character.image);
  ui.setDriving(false);
  ui.setNight(false);

  const canvas = world.renderer.domElement;
  canvas.addEventListener("click", () => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
  });
  return { ...world, city, player, vehicle, ui, canvas };
}

// Alterna entrada e saída do veículo sem permitir sair dentro de um prédio.
function toggleVehicle() {
  const { player, vehicle, city, ui } = systems;
  if (driving) {
    const sideX = Math.cos(vehicle.yaw) * 2.2;
    const sideZ = Math.sin(vehicle.yaw) * 2.2;
    const exitPositions = [
      [vehicle.group.position.x + sideX, vehicle.group.position.z + sideZ],
      [vehicle.group.position.x - sideX, vehicle.group.position.z - sideZ],
      [vehicle.group.position.x - Math.sin(vehicle.yaw) * 3, vehicle.group.position.z + Math.cos(vehicle.yaw) * 3]
    ];
    const exitPosition = exitPositions.find(([x, z]) => (
      !collidesWithBuildings(x, z, 0.38, 0.38, city.colliders)
    ));
    if (!exitPosition) {
      ui.setHint("Não há espaço seguro para sair do carro.");
      return;
    }
    player.model.position.set(exitPosition[0], 0, exitPosition[1]);
    player.model.visible = true;
    vehicle.speed = 0;
    driving = false;
    ui.setDriving(false);
    ui.setHint("");
    return;
  }

  const distance = player.model.position.distanceTo(vehicle.group.position);
  if (distance > 4.2) {
    ui.setHint("Aproxime-se do carro para entrar.");
    return;
  }
  driving = true;
  vehicle.speed = 0;
  player.model.visible = false;
  ui.setDriving(true);
  ui.setHint("");
}

// Alterna iluminação natural e janelas emissivas sem reiniciar a partida.
function toggleTimeOfDay() {
  isNight = !isNight;
  systems.setNight(isNight);
  systems.city.setNight(isNight);
  systems.ui.setNight(isNight);
}

// Atualiza o HUD de interação e os controles de personagem ou veículo.
function updateGame(dt) {
  const { player, vehicle, camera, city, ui } = systems;
  const nearCar = player.model.position.distanceTo(vehicle.group.position) < 6;

  if (driving) {
    player.model.position.copy(vehicle.group.position);
    updateVehicle(vehicle, keys, dt, city.colliders);
    updatePlayerVehicleCamera(player, camera, vehicle, dt);
    ui.setHint("<kbd>F</kbd> sair do carro");
  } else {
    updatePlayer(player, camera, keys, jumpRequested, dt, city.colliders);
    updateVehicle(vehicle, new Set(), dt, city.colliders);
    ui.setHint(nearCar ? "<kbd>F</kbd> entrar no carro" : "");
  }
  jumpRequested = false;
  ui.update(player, vehicle, driving, city);
  systems.composer.render();
}

// Loop principal com delta time limitado para evitar saltos após perder foco.
function renderFrame(now) {
  if (!running) return;
  const dt = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  updateGame(dt);
  animationFrame = requestAnimationFrame(renderFrame);
}

function startGame() {
  loadError.textContent = "";
  gameScreen.hidden = false;
  try {
    if (!systems) systems = createGame();
    introScreen.hidden = true;
    running = true;
    previousTime = performance.now();
    animationFrame = requestAnimationFrame(renderFrame);
  } catch (error) {
    gameScreen.hidden = true;
    loadError.textContent = "Não foi possível iniciar o WebGL. Atualize o navegador e tente novamente.";
    console.error("Falha ao iniciar a cidade 3D.", error);
  }
}

function exitGame() {
  running = false;
  keys.clear();
  cancelAnimationFrame(animationFrame);
  if (document.pointerLockElement) document.exitPointerLock();
  gameScreen.hidden = true;
  introScreen.hidden = false;
}

startButton.addEventListener("click", startGame);
exitButton.addEventListener("click", exitGame);
timeToggle.addEventListener("click", toggleTimeOfDay);

// Registra movimento, corrida, pulo, entrada no carro e alternância dia/noite.
window.addEventListener("keydown", (event) => {
  if (!running) return;
  const key = event.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
  if (key === " " && !event.repeat) jumpRequested = true;
  if (key === "f" && !event.repeat) toggleVehicle();
  if (key === "n" && !event.repeat) toggleTimeOfDay();
  keys.add(key === " " ? "space" : key);
});
window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  keys.delete(key === " " ? "space" : key);
});
window.addEventListener("blur", () => keys.clear());

// Permite orbitar a câmera com o mouse, tanto travado quanto em arraste.
window.addEventListener("mousedown", (event) => {
  if (running && event.button === 0) dragging = true;
});
window.addEventListener("mouseup", () => { dragging = false; });
window.addEventListener("mousemove", (event) => {
  if (!running || !systems) return;
  if (document.pointerLockElement !== systems.canvas && !dragging) return;
  systems.player.cameraYaw -= event.movementX * 0.003;
  systems.player.cameraPitch = clamp(systems.player.cameraPitch - event.movementY * 0.0025, 0.08, 0.8);
});

// Atualiza o shell PWA existente sem bloquear a execução via Live Server.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./service-worker.js")
    .catch((error) => console.error("Não foi possível registrar o service worker.", error));
}
