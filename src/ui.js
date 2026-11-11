// Centraliza as atualizações do HUD e do minimapa para manter o loop principal enxuto.
export function createUI() {
  const coordinates = document.querySelector("#coordinates");
  const minimap = document.querySelector("#minimap");
  const context = minimap.getContext("2d");
  const vehicleStatus = document.querySelector("#vehicle-status");
  const vehicleSpeed = document.querySelector("#vehicle-speed");
  const timeToggle = document.querySelector("#time-toggle");
  const interactionHint = document.querySelector("#interaction-hint");
  const characterImage = document.querySelector("#hud-character-image");
  const characterName = document.querySelector("#hud-character-name");

  // Converte coordenadas da cidade em pixels do canvas do minimapa.
  function toMapPosition(x, z, citySize) {
    return {
      x: ((x / citySize) + 0.5) * minimap.width,
      y: ((z / citySize) + 0.5) * minimap.height
    };
  }

  // Desenha o mapa simplificado, as ruas e os marcadores de jogador e carro.
  function drawMinimap(player, vehicle, city) {
    const width = minimap.width;
    const height = minimap.height;
    const citySize = city.citySize;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#17232c";
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "#68746f";
    context.lineWidth = Math.max(2, (city.roadWidth / citySize) * width);
    for (const road of city.roadLines) {
      const vertical = toMapPosition(road, 0, citySize).x;
      const horizontal = toMapPosition(0, road, citySize).y;
      context.beginPath();
      context.moveTo(vertical, 0);
      context.lineTo(vertical, height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, horizontal);
      context.lineTo(width, horizontal);
      context.stroke();
    }

    context.fillStyle = "#294e4c";
    const plaza = toMapPosition(0, 0, citySize);
    const plazaSize = (38 / citySize) * width;
    context.fillRect(plaza.x - plazaSize / 2, plaza.y - plazaSize / 2, plazaSize, plazaSize);
    context.fillStyle = "#53c9cf";
    context.beginPath();
    context.arc(plaza.x, plaza.y, 3, 0, Math.PI * 2);
    context.fill();

    const car = toMapPosition(vehicle.group.position.x, vehicle.group.position.z, citySize);
    context.save();
    context.translate(car.x, car.y);
    context.rotate(-vehicle.yaw);
    context.fillStyle = "#69e7ed";
    context.fillRect(-3.2, -4.7, 6.4, 9.4);
    context.restore();

    const avatar = toMapPosition(player.model.position.x, player.model.position.z, citySize);
    context.fillStyle = "#ff6d9d";
    context.beginPath();
    context.arc(avatar.x, avatar.y, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,.9)";
    context.lineWidth = 1;
    context.stroke();
  }

  function setCharacter(name, image) {
    characterName.textContent = name;
    characterImage.src = image;
    characterImage.alt = `Personagem selecionado: ${name}`;
  }

  function setDriving(isDriving) {
    vehicleStatus.hidden = !isDriving;
  }

  function setNight(isNight) {
    timeToggle.innerHTML = `${isNight ? "DIA" : "NOITE"} <kbd>N</kbd>`;
    timeToggle.setAttribute("aria-label", `Alternar para ${isNight ? "dia" : "noite"}`);
  }

  function setHint(message) {
    interactionHint.innerHTML = message;
  }

  function update(player, vehicle, driving, city) {
    const position = driving ? vehicle.group.position : player.model.position;
    coordinates.innerHTML = `X ${position.x.toFixed(1)} <span>Y ${position.y.toFixed(1)}</span> Z ${position.z.toFixed(1)}`;
    vehicleSpeed.textContent = String(Math.round(Math.abs(vehicle.speed) * 3.6));
    drawMinimap(player, vehicle, city);
  }

  return { setCharacter, setDriving, setNight, setHint, update };
}
