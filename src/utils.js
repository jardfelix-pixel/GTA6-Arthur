// Mantém valores dentro de um intervalo útil para câmera, movimento e geração.
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Gerador determinístico simples para que a cidade permaneça igual entre partidas.
export function createRandom(seed = 2026) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Sorteia um número real; o gerador pode ser injetado para facilitar testes.
export function randomRange(min, max, random = Math.random) {
  return min + random() * (max - min);
}

// Sorteia um item de uma lista sem alterar a lista original.
export function randomItem(items, random = Math.random) {
  return items[Math.floor(random() * items.length)];
}

// Teste AABB no plano XZ, usado para impedir atravessar prédios.
export function intersectsAabb(x, z, halfWidth, halfDepth, collider) {
  return x + halfWidth > collider.minX
    && x - halfWidth < collider.maxX
    && z + halfDepth > collider.minZ
    && z - halfDepth < collider.maxZ;
}

// Retorna verdadeiro se uma caixa móvel colidir com algum prédio.
export function collidesWithBuildings(x, z, halfWidth, halfDepth, colliders) {
  return colliders.some((collider) => intersectsAabb(x, z, halfWidth, halfDepth, collider));
}
