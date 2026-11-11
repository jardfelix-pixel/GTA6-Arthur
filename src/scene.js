import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// Cria o renderer, a câmera, o céu, a iluminação e o pós-processamento da cidade.
export function createScene(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 700);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.replaceChildren(renderer.domElement);

  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { nightMix: { value: 0 } },
    vertexShader: `
      varying float vHeight;
      void main() {
        vHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float nightMix;
      varying float vHeight;
      void main() {
        float horizon = smoothstep(-0.2, 0.72, vHeight);
        vec3 sunset = mix(vec3(0.94, 0.46, 0.43), vec3(0.30, 0.43, 0.62), horizon);
        vec3 midnight = mix(vec3(0.08, 0.12, 0.22), vec3(0.015, 0.025, 0.075), horizon);
        gl_FragColor = vec4(mix(sunset, midnight, nightMix), 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 18), skyMaterial);
  sky.renderOrder = -10;
  scene.add(sky);

  const dayFog = new THREE.Color(0xf1a39b);
  const nightFog = new THREE.Color(0x171d36);
  scene.fog = new THREE.Fog(dayFog, 95, 310);

  const hemisphere = new THREE.HemisphereLight(0xffd5c2, 0x4b5360, 1.7);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffc7a2, 3.2);
  sun.position.set(-95, 150, 75);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -145;
  sun.shadow.camera.right = 145;
  sun.shadow.camera.top = 145;
  sun.shadow.camera.bottom = -145;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 360;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(sun.target);

  const fillLight = new THREE.DirectionalLight(0x86c9ed, 0.65);
  fillLight.position.set(65, 50, -100);
  scene.add(fillLight);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.32, 0.86));

  // Mantém a câmera e os buffers nítidos quando a janela muda de tamanho.
  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
  }
  window.addEventListener("resize", resize);
  resize();

  // Ajusta a luz e o gradiente sem reconstruir o mundo ao trocar o horário.
  function setNight(isNight) {
    const amount = isNight ? 1 : 0;
    skyMaterial.uniforms.nightMix.value = amount;
    scene.fog.color.copy(dayFog).lerp(nightFog, amount);
    hemisphere.intensity = isNight ? 0.46 : 1.7;
    sun.intensity = isNight ? 0.12 : 3.2;
    sun.color.set(isNight ? 0x829bff : 0xffc7a2);
    fillLight.intensity = isNight ? 0.35 : 0.65;
  }

  return { scene, camera, renderer, composer, setNight };
}
