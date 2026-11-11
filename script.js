const imagemPersonagem = document.querySelector(".personagem");
const nomePersonagem = document.querySelector(".jogador");
const imagemAvatarHud = document.querySelector(".avatar-hud-imagem");
const nomeAvatarHud = document.querySelector(".avatar-hud-nome");
const botaoCamera = document.querySelector(".botao-camera");
const painelWebcam = document.querySelector(".webcam");
const videoWebcam = document.querySelector(".video-webcam");
const mensagemWebcam = document.querySelector(".mensagem-webcam");
const botaoFecharWebcam = document.querySelector(".fechar-webcam");
const botaoCapturarSelfie = document.querySelector(".capturar-selfie");
const previewSelfie = document.querySelector(".avatar-selfie-preview");
const botaoAvatarSelfie = document.querySelector(".opcao-selfie");
const botaoIniciar = document.querySelector(".iniciar-jogo");
const botaoInstalarApp = document.querySelector(".botao-instalar-app");
const mensagemInstalacao = document.querySelector(".mensagem-instalacao");
const telaJogo = document.querySelector(".game-container");
const canvasJogo = document.querySelector("#game-canvas");
const contextoJogo = canvasJogo.getContext("2d");
const textoNivel = document.querySelector("#level-text");
const textoVida = document.querySelector("#health-text");
const barraVida = document.querySelector("#health-fill");
const textoAbates = document.querySelector("#kills-text span");
const textoMunicao = document.querySelector("#ammo-text span");
const mensagemConclusao = document.querySelector(".mensagem-conclusao");
const contagemProximoNivel = document.querySelector(".contagem-proximo-nivel");
const opcoesNivel = [...document.querySelectorAll('input[name="nivel-jogo"]')];
const telaMissaoConcluida = document.querySelector(".mission-complete");
const botaoSair = document.querySelector("#exit-game");
const botaoSairFinal = document.querySelector(".sair-jogo-final");
const botaoSom = document.querySelector("#toggle-som");
const botaoReiniciar = document.querySelector(".reiniciar-jogo");
const botaoDisparar = document.querySelector(".botao-disparar");
const botaoRecarregar = document.querySelector(".botao-recarregar");
const controlesDirecionais = [...document.querySelectorAll(".controle-direcional")];
const opcoesPersonagem = [...document.querySelectorAll(".opcao-personagem")];
let streamWebcam;
let eventoInstalacao;
let imagemSelecionada = imagemPersonagem.src;
let nomeSelecionado = nomePersonagem.textContent;
let selfieAvatarUrl;
let imagemDoJogo;
let animacaoJogo;
let jogoAtivo = false;
let tempoAnterior = 0;
let contextoAudio;
let volumeAudio;
let audioAtivo = true;
let osciladoresAmbiente = [];
let proximoPassoAudio = 0;
let passoAtual = 0;
let nivelAtual = 3;
let jogador = { x: 0, distancia: 0, vida: 100 };
let balas = [];
let zumbis = [];
let abates = 0;
let municao = 30;
let reservaMunicao = 120;
let tempoSpawn = 0;
let tempoDisparo = 0;
let tempoDano = 0;
let mira = { x: 0, y: 0 };
const teclasPressionadas = new Set();
const ponteirosDirecionais = new Map();
const velocidadeJogador = 5;
const niveis = {
  1: { nome: "Fácil", intervalo: 2, velocidade: 1.4, dano: 8 },
  2: { nome: "Médio", intervalo: 1.5, velocidade: 1.8, dano: 12 },
  3: { nome: "Difícil", intervalo: 1.1, velocidade: 2.2, dano: 16 }
};

function atualizarBotaoSom(texto = `Som: ${audioAtivo ? "ligado" : "desligado"}`) {
  botaoSom.textContent = texto;
  botaoSom.setAttribute("aria-pressed", String(audioAtivo));
}

function iniciarAmbienteSonoro() {
  if (!contextoAudio || !audioAtivo || osciladoresAmbiente.length) return;

  [55, 82.41, 110].forEach((frequencia, indice) => {
    const oscilador = contextoAudio.createOscillator();
    const ganho = contextoAudio.createGain();
    oscilador.type = indice === 2 ? "triangle" : "sine";
    oscilador.frequency.value = frequencia;
    ganho.gain.setValueAtTime(0.0001, contextoAudio.currentTime);
    ganho.gain.exponentialRampToValueAtTime(indice === 2 ? 0.012 : 0.025, contextoAudio.currentTime + 2.5);
    oscilador.connect(ganho);
    ganho.connect(volumeAudio);
    oscilador.start();
    osciladoresAmbiente.push({ oscilador, ganho });
  });
}

function prepararAudio() {
  if (!window.AudioContext) {
    botaoSom.disabled = true;
    atualizarBotaoSom("Som indisponível");
    return;
  }

  if (!contextoAudio) {
    contextoAudio = new AudioContext();
    volumeAudio = contextoAudio.createGain();
    volumeAudio.gain.value = audioAtivo ? 0.45 : 0;
    volumeAudio.connect(contextoAudio.destination);
  }

  contextoAudio.resume().then(() => {
    if (jogoAtivo) iniciarAmbienteSonoro();
  }).catch(() => {
    atualizarBotaoSom("Som bloqueado pelo navegador");
  });
}

function tocarPasso() {
  if (!contextoAudio || !audioAtivo || contextoAudio.state !== "running") return;
  const agora = contextoAudio.currentTime;
  if (agora < proximoPassoAudio) return;
  proximoPassoAudio = agora + 0.28;

  const oscilador = contextoAudio.createOscillator();
  const ganho = contextoAudio.createGain();
  const clique = contextoAudio.createOscillator();
  const ganhoClique = contextoAudio.createGain();
  oscilador.type = "triangle";
  oscilador.frequency.setValueAtTime(passoAtual % 2 ? 150 : 185, agora);
  oscilador.frequency.exponentialRampToValueAtTime(82, agora + 0.13);
  ganho.gain.setValueAtTime(0.0001, agora);
  ganho.gain.exponentialRampToValueAtTime(0.364, agora + 0.012);
  ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.19);
  clique.type = "sine";
  clique.frequency.setValueAtTime(620, agora);
  clique.frequency.exponentialRampToValueAtTime(210, agora + 0.045);
  ganhoClique.gain.setValueAtTime(0.0001, agora);
  ganhoClique.gain.exponentialRampToValueAtTime(0.091, agora + 0.006);
  ganhoClique.gain.exponentialRampToValueAtTime(0.0001, agora + 0.06);
  oscilador.connect(ganho);
  ganho.connect(volumeAudio);
  clique.connect(ganhoClique);
  ganhoClique.connect(volumeAudio);
  oscilador.start(agora);
  oscilador.stop(agora + 0.2);
  clique.start(agora);
  clique.stop(agora + 0.07);
  passoAtual += 1;
}

function encerrarAmbienteSonoro() {
  if (!contextoAudio || !osciladoresAmbiente.length) return;
  const agora = contextoAudio.currentTime;
  osciladoresAmbiente.forEach(({ oscilador, ganho }) => {
    ganho.gain.cancelScheduledValues(agora);
    ganho.gain.setTargetAtTime(0.0001, agora, 0.08);
    oscilador.stop(agora + 0.4);
  });
  osciladoresAmbiente = [];
}

function fecharWebcam() {
  streamWebcam?.getTracks().forEach((faixa) => faixa.stop());
  streamWebcam = undefined;
  videoWebcam.srcObject = null;
  botaoCapturarSelfie.disabled = true;
  painelWebcam.hidden = true;
  botaoCamera.setAttribute("aria-expanded", "false");
  botaoCamera.setAttribute("aria-label", "Abrir webcam");
}

function limparAvatarSelfie() {
  if (nomeSelecionado === "SELFIE") {
    selecionarPersonagem(new URL("img/Arthur.png", document.baseURI).href, "ARTHUR");
  }
  botaoAvatarSelfie.hidden = true;
  delete botaoAvatarSelfie.dataset.imagem;
  botaoAvatarSelfie.dataset.nome = "";
  botaoAvatarSelfie.querySelector("img").removeAttribute("src");
  previewSelfie.removeAttribute("src");
  previewSelfie.hidden = true;
  if (selfieAvatarUrl) {
    URL.revokeObjectURL(selfieAvatarUrl);
    selfieAvatarUrl = undefined;
  }
}

function selecionarPersonagem(imagem, nome) {
  imagemSelecionada = imagem;
  nomeSelecionado = nome;
  imagemPersonagem.src = imagem;
  imagemPersonagem.alt = nome;
  imagemPersonagem.classList.toggle("personagem-selfie", nome === "SELFIE");
  nomePersonagem.textContent = nome;
  imagemAvatarHud.src = imagem;
  imagemAvatarHud.alt = `Avatar do jogador ${nome}`;
  nomeAvatarHud.textContent = nome;
  opcoesPersonagem.forEach((opcao) => {
    opcao.setAttribute("aria-pressed", String(opcao.dataset.nome === nome));
  });
}

async function criarAvatarSelfie() {
  if (!streamWebcam || videoWebcam.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    mensagemWebcam.textContent = "Aguarde a imagem da webcam aparecer antes de tirar a selfie.";
    return;
  }

  botaoCapturarSelfie.disabled = true;
  try {
    const larguraVideo = videoWebcam.videoWidth;
    const alturaVideo = videoWebcam.videoHeight;
    const proporcaoRetrato = 0.72;
    const larguraRecorte = Math.min(larguraVideo, alturaVideo * proporcaoRetrato);
    const alturaRecorte = larguraRecorte / proporcaoRetrato;
    const recorteX = (larguraVideo - larguraRecorte) / 2;
    const recorteY = (alturaVideo - alturaRecorte) / 2;
    const escalaMaxima = Math.min(1, 1440 / Math.max(larguraRecorte, alturaRecorte));
    const larguraFinal = Math.round(larguraRecorte * escalaMaxima);
    const alturaFinal = Math.round(alturaRecorte * escalaMaxima);
    const avatarCanvas = document.createElement("canvas");
    const contextoAvatar = avatarCanvas.getContext("2d");
    avatarCanvas.width = larguraFinal;
    avatarCanvas.height = alturaFinal;
    contextoAvatar.imageSmoothingEnabled = true;
    contextoAvatar.imageSmoothingQuality = "high";
    contextoAvatar.filter = "contrast(1.04) saturate(1.06)";
    contextoAvatar.drawImage(
      videoWebcam,
      recorteX, recorteY, larguraRecorte, alturaRecorte,
      0, 0, larguraFinal, alturaFinal
    );
    contextoAvatar.filter = "none";

    const degradêNeon = contextoAvatar.createLinearGradient(0, 0, larguraFinal, alturaFinal);
    degradêNeon.addColorStop(0, "rgba(255, 35, 145, 0.08)");
    degradêNeon.addColorStop(1, "rgba(0, 220, 255, 0.10)");
    contextoAvatar.fillStyle = degradêNeon;
    contextoAvatar.fillRect(0, 0, larguraFinal, alturaFinal);
    contextoAvatar.strokeStyle = "#ff2d95";
    contextoAvatar.lineWidth = Math.max(3, larguraFinal / 90);
    contextoAvatar.strokeRect(2, 2, larguraFinal - 4, alturaFinal - 4);

    const avatarBlob = await new Promise((resolve, reject) => {
      avatarCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("O navegador não conseguiu codificar o avatar."));
      }, "image/jpeg", 0.94);
    });
    const urlAnterior = selfieAvatarUrl;
    const avatarGerado = URL.createObjectURL(avatarBlob);
    selfieAvatarUrl = avatarGerado;
    botaoAvatarSelfie.dataset.imagem = avatarGerado;
    botaoAvatarSelfie.dataset.nome = "SELFIE";
    botaoAvatarSelfie.querySelector("img").src = avatarGerado;
    botaoAvatarSelfie.hidden = false;
    previewSelfie.src = avatarGerado;
    previewSelfie.hidden = false;
    selecionarPersonagem(avatarGerado, "SELFIE");
    if (urlAnterior) URL.revokeObjectURL(urlAnterior);
    mensagemWebcam.textContent = `Avatar criado em alta resolução (${larguraFinal} × ${alturaFinal}). Feche a webcam e inicie o jogo.`;
  } catch (erro) {
    console.error("Falha ao criar o avatar a partir da selfie.", erro);
    mensagemWebcam.textContent = "Não foi possível criar o avatar. Confira a webcam e tente novamente.";
  } finally {
    botaoCapturarSelfie.disabled = !streamWebcam;
  }
}

opcoesPersonagem.forEach((opcao) => {
  opcao.addEventListener("click", () => {
    const imagem = opcao.dataset.imagem
      ? new URL(opcao.dataset.imagem, document.baseURI).href
      : botaoAvatarSelfie.dataset.imagem;
    selecionarPersonagem(imagem, opcao.dataset.nome);
  });
});

function ajustarCanvas() {
  const escala = window.devicePixelRatio || 1;
  const largura = canvasJogo.clientWidth;
  const altura = canvasJogo.clientHeight;
  canvasJogo.width = Math.round(largura * escala);
  canvasJogo.height = Math.round(altura * escala);
  contextoJogo.setTransform(escala, 0, 0, escala, 0, 0);
  renderizar();
}

function atualizarHudCombate() {
  textoVida.textContent = `${Math.ceil(jogador.vida)}%`;
  barraVida.style.width = `${jogador.vida}%`;
  barraVida.dataset.critico = String(jogador.vida <= 30);
  textoAbates.textContent = String(abates);
  textoMunicao.textContent = `${municao} / ${reservaMunicao}`;
}

function iniciarPartida() {
  jogador = { x: 0, distancia: 0, vida: 100 };
  balas = [];
  zumbis = [];
  abates = 0;
  municao = 30;
  reservaMunicao = 120;
  tempoSpawn = 0;
  tempoDisparo = 0;
  tempoDano = 0;
  mira = { x: canvasJogo.clientWidth / 2, y: canvasJogo.clientHeight * 0.4 };
  tempoAnterior = 0;
  teclasPressionadas.clear();
  ponteirosDirecionais.clear();
  telaMissaoConcluida.hidden = true;
  textoNivel.textContent = `Nível ${nivelAtual} · ${niveis[nivelAtual].nome}`;
  atualizarHudCombate();
}

function iniciarJogo() {
  fecharWebcam();
  nivelAtual = Number(document.querySelector('input[name="nivel-jogo"]:checked').value);
  imagemDoJogo = new Image();
  imagemDoJogo.src = imagemSelecionada;
  iniciarPartida();
  document.body.classList.add("jogo-ativo");
  telaJogo.hidden = false;
  jogoAtivo = true;
  mira = { x: canvasJogo.clientWidth / 2, y: canvasJogo.clientHeight * 0.43 };
  canvasJogo.focus();
  ajustarCanvas();
  prepararAudio();
  animacaoJogo = requestAnimationFrame(atualizarJogo);
}

function atualizarPonteiroDirecional(direcao, ponteiroId, pressionado) {
  let ponteiros = ponteirosDirecionais.get(direcao);
  if (pressionado) {
    if (!ponteiros) {
      ponteiros = new Set();
      ponteirosDirecionais.set(direcao, ponteiros);
    }
    ponteiros.add(ponteiroId);
    return;
  }

  if (!ponteiros) return;
  ponteiros.delete(ponteiroId);
  if (!ponteiros.size) ponteirosDirecionais.delete(direcao);
}

function sairDoJogo() {
  jogoAtivo = false;
  cancelAnimationFrame(animacaoJogo);
  teclasPressionadas.clear();
  ponteirosDirecionais.clear();
  encerrarAmbienteSonoro();
  document.body.classList.remove("jogo-ativo");
  telaJogo.hidden = true;
  limparAvatarSelfie();
}

function recarregarArma() {
  if (!jogoAtivo || municao === 30 || reservaMunicao === 0) return;
  const quantidade = Math.min(30 - municao, reservaMunicao);
  municao += quantidade;
  reservaMunicao -= quantidade;
  atualizarHudCombate();
}

function disparar() {
  if (!jogoAtivo || municao <= 0 || tempoDisparo > 0) return;
  municao -= 1;
  tempoDisparo = 0.2;
  const { yaw, pitch } = obterAngulosMira(canvasJogo.clientWidth, canvasJogo.clientHeight);
  const cossenoPitch = Math.cos(pitch);
  balas.push({
    x: jogador.x + Math.sin(yaw) * 0.8 + Math.cos(yaw) * 0.45,
    distancia: jogador.distancia + Math.cos(yaw) * 0.8 - Math.sin(yaw) * 0.45,
    altura: 1.35,
    vx: Math.sin(yaw) * cossenoPitch * 48,
    velocidadeFrente: Math.cos(yaw) * cossenoPitch * 48,
    velocidadeAltura: Math.sin(pitch) * 48,
    vida: 2
  });
  atualizarHudCombate();
}

function criarZumbi() {
  zumbis.push({
    x: jogador.x + (Math.random() - 0.5) * 7,
    distancia: jogador.distancia + 26 + Math.random() * 16,
    tempoAtaque: 0
  });
}

function obterAngulosMira(largura, altura) {
  const focal = altura * 0.92;
  const yaw = Math.atan((mira.x - largura / 2) / focal);
  const pitch = Math.max(-0.3, Math.min(0.35, Math.atan((altura / 2 - mira.y) / focal)));
  return { yaw, pitch };
}

function atualizarJogo(tempo) {
  if (!jogoAtivo) return;
  const delta = tempoAnterior ? Math.min((tempo - tempoAnterior) / 1000, 0.05) : 0;
  tempoAnterior = tempo;
  tempoDisparo = Math.max(0, tempoDisparo - delta);
  tempoDano = Math.max(0, tempoDano - delta);
  if (teclasPressionadas.has(" ") || ponteirosDirecionais.has("fire")) disparar();

  let movimentoLateral = 0;
  let movimentoFrente = 0;
  if (teclasPressionadas.has("a") || teclasPressionadas.has("arrowleft") || ponteirosDirecionais.has("arrowleft")) movimentoLateral -= 1;
  if (teclasPressionadas.has("d") || teclasPressionadas.has("arrowright") || ponteirosDirecionais.has("arrowright")) movimentoLateral += 1;
  if (teclasPressionadas.has("w") || teclasPressionadas.has("arrowup") || ponteirosDirecionais.has("arrowup")) movimentoFrente += 1;
  if (teclasPressionadas.has("s") || teclasPressionadas.has("arrowdown") || ponteirosDirecionais.has("arrowdown")) movimentoFrente -= 1;
  if (movimentoLateral && movimentoFrente) {
    movimentoLateral *= Math.SQRT1_2;
    movimentoFrente *= Math.SQRT1_2;
  }
  if (movimentoLateral || movimentoFrente) tocarPasso();
  const { yaw } = obterAngulosMira(canvasJogo.clientWidth, canvasJogo.clientHeight);
  jogador.x += (Math.cos(yaw) * movimentoLateral + Math.sin(yaw) * movimentoFrente) * velocidadeJogador * delta;
  jogador.distancia += (Math.cos(yaw) * movimentoFrente - Math.sin(yaw) * movimentoLateral) * velocidadeJogador * delta;

  tempoSpawn += delta;
  if (tempoSpawn >= niveis[nivelAtual].intervalo && zumbis.length < 24) {
    tempoSpawn = 0;
    criarZumbi();
  }

  balas.forEach((bala) => {
    const anteriorX = bala.x;
    const anteriorDistancia = bala.distancia;
    const anteriorAltura = bala.altura;
    bala.x += bala.vx * delta;
    bala.distancia += bala.velocidadeFrente * delta;
    bala.altura += bala.velocidadeAltura * delta;
    bala.vida -= delta;
    const segmentoX = bala.x - anteriorX;
    const segmentoDistancia = bala.distancia - anteriorDistancia;
    const segmentoAltura = bala.altura - anteriorAltura;
    const comprimentoQuadrado = segmentoX ** 2 + segmentoDistancia ** 2 + segmentoAltura ** 2;
    for (let indice = zumbis.length - 1; indice >= 0; indice -= 1) {
      const zumbi = zumbis[indice];
      const relativoX = zumbi.x - anteriorX;
      const relativoDistancia = zumbi.distancia - anteriorDistancia;
      const relativoAltura = 0.95 - anteriorAltura;
      const fator = comprimentoQuadrado
        ? Math.max(0, Math.min(1,
          (relativoX * segmentoX + relativoDistancia * segmentoDistancia + relativoAltura * segmentoAltura)
          / comprimentoQuadrado))
        : 0;
      const distanciaX = anteriorX + fator * segmentoX - zumbi.x;
      const distanciaFrente = anteriorDistancia + fator * segmentoDistancia - zumbi.distancia;
      const distanciaAltura = anteriorAltura + fator * segmentoAltura - 0.95;
      if (distanciaX ** 2 + distanciaFrente ** 2 + distanciaAltura ** 2 > 0.55 ** 2) continue;
      zumbis.splice(indice, 1);
      bala.vida = 0;
      abates += 1;
      reservaMunicao = Math.min(120, reservaMunicao + 4);
      break;
    }
  });
  balas = balas.filter((bala) =>
    bala.vida > 0 && bala.distancia < jogador.distancia + 140
  );

  zumbis.forEach((zumbi) => {
    if (!jogoAtivo) return;
    const diferencaX = jogador.x - zumbi.x;
    const diferencaFrente = jogador.distancia - zumbi.distancia;
    const distancia = Math.hypot(diferencaX, diferencaFrente) || 1;
    zumbi.x += (diferencaX / distancia) * niveis[nivelAtual].velocidade * delta;
    zumbi.distancia += (diferencaFrente / distancia) * niveis[nivelAtual].velocidade * delta;
    zumbi.tempoAtaque = Math.max(0, zumbi.tempoAtaque - delta);
    if (distancia < 1.4 && zumbi.tempoAtaque === 0 && tempoDano === 0) {
      zumbi.tempoAtaque = 0.8;
      tempoDano = 0.45;
      jogador.vida = Math.max(0, jogador.vida - niveis[nivelAtual].dano);
      if (jogador.vida === 0) {
        jogoAtivo = false;
        teclasPressionadas.clear();
        ponteirosDirecionais.clear();
        mensagemConclusao.textContent = "VOCÊ FOI DERROTADO";
        contagemProximoNivel.textContent = `Zumbis eliminados: ${abates}`;
        contagemProximoNivel.hidden = false;
        botaoReiniciar.hidden = false;
        botaoReiniciar.textContent = "Tentar novamente";
        telaMissaoConcluida.hidden = false;
      }
    }
  });
  atualizarHudCombate();
  renderizar();
  if (jogoAtivo) animacaoJogo = requestAnimationFrame(atualizarJogo);
}

function projetarPonto(x, distancia, alturaObjeto, largura, altura, yaw, pitch) {
  const focal = altura * 0.92;
  const relativoX = x - jogador.x;
  const relativoDistancia = distancia - jogador.distancia;
  const cameraX = relativoX * Math.cos(yaw) - relativoDistancia * Math.sin(yaw);
  const cameraDistancia = relativoX * Math.sin(yaw) + relativoDistancia * Math.cos(yaw);
  const cameraAltura = alturaObjeto - 1.6;
  const profundidade = cameraDistancia * Math.cos(pitch) + cameraAltura * Math.sin(pitch);
  if (profundidade <= 0.5) return null;
  const alturaCamera = cameraAltura * Math.cos(pitch) - cameraDistancia * Math.sin(pitch);
  return {
    x: largura / 2 + focal * cameraX / profundidade,
    y: altura / 2 - focal * alturaCamera / profundidade,
    escala: focal / profundidade
  };
}

function desenharPoligono(pontos, cor, borda) {
  if (pontos.some((ponto) => !ponto)) return;
  contextoJogo.beginPath();
  contextoJogo.moveTo(pontos[0].x, pontos[0].y);
  pontos.slice(1).forEach((ponto) => contextoJogo.lineTo(ponto.x, ponto.y));
  contextoJogo.closePath();
  contextoJogo.fillStyle = cor;
  contextoJogo.fill();
  if (borda) {
    contextoJogo.strokeStyle = borda;
    contextoJogo.lineWidth = 1;
    contextoJogo.stroke();
  }
}

function desenharCidade(largura, altura, yaw, pitch) {
  const gradienteCeu = contextoJogo.createLinearGradient(0, 0, 0, altura * 0.62);
  gradienteCeu.addColorStop(0, "#253341");
  gradienteCeu.addColorStop(0.7, "#77807b");
  gradienteCeu.addColorStop(1, "#d0a578");
  contextoJogo.fillStyle = gradienteCeu;
  contextoJogo.fillRect(0, 0, largura, altura);

  const horizonte = altura * 0.52;
  contextoJogo.fillStyle = "#272e30";
  for (let indice = 0; indice < 17; indice += 1) {
    const posicao = indice / 16;
    const x = posicao * largura;
    const larguraPredio = largura * (0.025 + ((indice * 37) % 8) / 100);
    const alturaPredio = altura * (0.06 + ((indice * 19) % 11) / 100);
    contextoJogo.fillRect(x, horizonte - alturaPredio, larguraPredio, alturaPredio);
  }

  const projetar = (x, distancia, alturaPonto = 0) =>
    projetarPonto(x, distancia, alturaPonto, largura, altura, yaw, pitch);
  desenharPoligono([
    projetar(-80, jogador.distancia + 1),
    projetar(80, jogador.distancia + 1),
    projetar(80, jogador.distancia + 140),
    projetar(-80, jogador.distancia + 140)
  ], "#555550");
  desenharPoligono([
    projetar(-5.5, jogador.distancia + 1),
    projetar(5.5, jogador.distancia + 1),
    projetar(5.5, jogador.distancia + 140),
    projetar(-5.5, jogador.distancia + 140)
  ], "#343737");

  for (const lado of [-1, 1]) {
    desenharPoligono([
      projetar(lado * 5.3, jogador.distancia + 1),
      projetar(lado * 7.6, jogador.distancia + 1),
      projetar(lado * 7.6, jogador.distancia + 140),
      projetar(lado * 5.3, jogador.distancia + 140)
    ], "#777365");
    const meioFio = lado * 5.3;
    desenharPoligono([
      projetar(meioFio, jogador.distancia + 1, 0.12),
      projetar(meioFio + lado * 0.12, jogador.distancia + 1, 0.12),
      projetar(meioFio + lado * 0.12, jogador.distancia + 140, 0.12),
      projetar(meioFio, jogador.distancia + 140, 0.12)
    ], "#c0ad87");
  }

  for (let distancia = 7; distancia < 120; distancia += 14) {
    const inicio = jogador.distancia + distancia;
    const fim = inicio + 5;
    desenharPoligono([
      projetar(-0.09, inicio, 0.025),
      projetar(0.09, inicio, 0.025),
      projetar(0.09, fim, 0.025),
      projetar(-0.09, fim, 0.025)
    ], "#c2b992");
  }

  const primeiraRua = Math.floor(jogador.distancia / 20) - 1;
  const predios = [];
  for (let rua = primeiraRua; rua < primeiraRua + 9; rua += 1) {
    const profundidade = rua * 20 + 20;
    if (profundidade < jogador.distancia + 4) continue;
    for (const lado of [-1, 1]) {
      predios.push({
        lado,
        profundidade,
        xInterior: lado * 7.7,
        xExterior: lado * (11.5 + (rua % 3) * 0.6),
        altura: 7 + (Math.abs(rua * 17 + lado * 13) % 8),
        cor: ["#454847", "#555147", "#464b4b", "#595348"][Math.abs(rua + lado * 3) % 4]
      });
    }
  }
  predios.sort((a, b) => b.profundidade - a.profundidade);
  predios.forEach((predio, indice) => {
    const { lado, profundidade, xInterior, xExterior, altura: alturaPredio, cor } = predio;
    const fundo = profundidade + 18;
    const sombra = "#242a2c";
    desenharPoligono([
      projetar(xInterior, profundidade),
      projetar(xInterior, fundo),
      projetar(xInterior, fundo, alturaPredio),
      projetar(xInterior, profundidade, alturaPredio)
    ], "#343a3b", sombra);
    desenharPoligono([
      projetar(xInterior, profundidade),
      projetar(xExterior, profundidade),
      projetar(xExterior, profundidade, alturaPredio),
      projetar(xInterior, profundidade, alturaPredio)
    ], cor, sombra);

    for (let andar = 1; andar < Math.floor(alturaPredio / 2); andar += 1) {
      for (let janela = 0; janela < 4; janela += 1) {
        const xJanela = xInterior + lado * (0.8 + janela * 0.85);
        const corJanela = (janela + andar + indice) % 5 === 0 ? "#d19e59" : "#27363b";
        desenharPoligono([
          projetar(xJanela, profundidade - 0.02, andar * 2 - 0.35),
          projetar(xJanela + lado * 0.46, profundidade - 0.02, andar * 2 - 0.35),
          projetar(xJanela + lado * 0.46, profundidade - 0.02, andar * 2 + 0.55),
          projetar(xJanela, profundidade - 0.02, andar * 2 + 0.55)
        ], corJanela);
      }
    }
  });
}

function desenharZumbi(zumbi, largura, altura, yaw, pitch) {
  const pe = projetarPonto(zumbi.x, zumbi.distancia, 0, largura, altura, yaw, pitch);
  const tronco = projetarPonto(zumbi.x, zumbi.distancia, 1.05, largura, altura, yaw, pitch);
  const cabeca = projetarPonto(zumbi.x, zumbi.distancia, 1.7, largura, altura, yaw, pitch);
  if (!pe || !tronco || !cabeca || pe.x < -160 || pe.x > largura + 160) return;
  const larguraCorpo = tronco.escala * 0.62;
  const escalaCabeça = cabeca.escala;
  contextoJogo.save();
  contextoJogo.fillStyle = "rgba(0, 0, 0, 0.35)";
  contextoJogo.beginPath();
  contextoJogo.ellipse(pe.x, pe.y, larguraCorpo * 0.7, Math.max(2, pe.escala * 0.12), 0, 0, Math.PI * 2);
  contextoJogo.fill();
  desenharPoligono([
    { x: tronco.x - larguraCorpo * 0.55, y: tronco.y + tronco.escala * 0.45 },
    { x: tronco.x + larguraCorpo * 0.55, y: tronco.y + tronco.escala * 0.45 },
    { x: pe.x + larguraCorpo * 0.35, y: pe.y },
    { x: pe.x - larguraCorpo * 0.35, y: pe.y }
  ], "#4d5941", "#222923");
  contextoJogo.strokeStyle = "#66724d";
  contextoJogo.lineWidth = Math.max(1, tronco.escala * 0.13);
  contextoJogo.beginPath();
  contextoJogo.moveTo(tronco.x - larguraCorpo * 0.35, tronco.y);
  contextoJogo.lineTo(tronco.x - larguraCorpo, tronco.y + tronco.escala * 0.48);
  contextoJogo.moveTo(tronco.x + larguraCorpo * 0.35, tronco.y);
  contextoJogo.lineTo(tronco.x + larguraCorpo, tronco.y + tronco.escala * 0.35);
  contextoJogo.stroke();
  contextoJogo.fillStyle = "#89956a";
  contextoJogo.beginPath();
  contextoJogo.ellipse(cabeca.x, cabeca.y, escalaCabeça * 0.22, escalaCabeça * 0.27, 0, 0, Math.PI * 2);
  contextoJogo.fill();
  contextoJogo.fillStyle = "#d54c3e";
  contextoJogo.beginPath();
  contextoJogo.arc(cabeca.x - escalaCabeça * 0.09, cabeca.y, Math.max(1, escalaCabeça * 0.035), 0, Math.PI * 2);
  contextoJogo.arc(cabeca.x + escalaCabeça * 0.09, cabeca.y, Math.max(1, escalaCabeça * 0.035), 0, Math.PI * 2);
  contextoJogo.fill();
  contextoJogo.restore();
}

function desenharArma(largura, altura) {
  const x = largura * 0.43;
  const y = altura * 0.81;
  contextoJogo.save();
  contextoJogo.fillStyle = "#554239";
  contextoJogo.beginPath();
  contextoJogo.moveTo(x + largura * 0.04, altura);
  contextoJogo.lineTo(x + largura * 0.1, y + altura * 0.06);
  contextoJogo.lineTo(x + largura * 0.2, y + altura * 0.11);
  contextoJogo.lineTo(x + largura * 0.18, altura);
  contextoJogo.fill();
  contextoJogo.fillStyle = "#2b3031";
  contextoJogo.strokeStyle = "#92938a";
  contextoJogo.lineWidth = 2;
  contextoJogo.beginPath();
  contextoJogo.moveTo(x, y + altura * 0.07);
  contextoJogo.lineTo(x + largura * 0.19, y + altura * 0.07);
  contextoJogo.lineTo(x + largura * 0.23, y + altura * 0.12);
  contextoJogo.lineTo(x + largura * 0.06, y + altura * 0.15);
  contextoJogo.closePath();
  contextoJogo.fill();
  contextoJogo.stroke();
  contextoJogo.fillStyle = "#171b1c";
  contextoJogo.fillRect(x + largura * 0.15, y + altura * 0.09, largura * 0.13, altura * 0.025);
  contextoJogo.fillStyle = "#8b684e";
  contextoJogo.beginPath();
  contextoJogo.ellipse(x + largura * 0.08, y + altura * 0.16, largura * 0.045, altura * 0.035, -0.3, 0, Math.PI * 2);
  contextoJogo.fill();
  if (tempoDisparo > 0.14) {
    contextoJogo.fillStyle = "#ffd166";
    contextoJogo.shadowColor = "#ff9f1c";
    contextoJogo.shadowBlur = 24;
    contextoJogo.beginPath();
    contextoJogo.arc(x + largura * 0.29, y + altura * 0.1, 8 + Math.random() * 7, 0, Math.PI * 2);
    contextoJogo.fill();
  }
  contextoJogo.restore();
}

function renderizar() {
  if (!canvasJogo || !canvasJogo.clientWidth) return;
  const largura = canvasJogo.clientWidth;
  const altura = canvasJogo.clientHeight;
  const { yaw, pitch } = obterAngulosMira(largura, altura);
  const projetar = (x, distancia, alturaPonto) =>
    projetarPonto(x, distancia, alturaPonto, largura, altura, yaw, pitch);

  desenharCidade(largura, altura, yaw, pitch);
  [...zumbis]
    .sort((a, b) => b.distancia - a.distancia)
    .forEach((zumbi) => desenharZumbi(zumbi, largura, altura, yaw, pitch));

  balas.forEach((bala) => {
    const ponto = projetar(bala.x, bala.distancia, bala.altura);
    if (!ponto) return;
    contextoJogo.fillStyle = "#ffd166";
    contextoJogo.shadowColor = "#ff9f1c";
    contextoJogo.shadowBlur = 10;
    contextoJogo.beginPath();
    contextoJogo.arc(ponto.x, ponto.y, Math.max(2, ponto.escala * 0.06), 0, Math.PI * 2);
    contextoJogo.fill();
    contextoJogo.shadowBlur = 0;
  });

  const vinheta = contextoJogo.createRadialGradient(
    largura / 2, altura / 2, altura * 0.18,
    largura / 2, altura / 2, altura * 0.82
  );
  vinheta.addColorStop(0, "rgba(0, 0, 0, 0)");
  vinheta.addColorStop(1, "rgba(9, 12, 14, 0.55)");
  contextoJogo.fillStyle = vinheta;
  contextoJogo.fillRect(0, 0, largura, altura);

  contextoJogo.strokeStyle = "rgba(255, 242, 217, 0.88)";
  contextoJogo.lineWidth = 2;
  contextoJogo.beginPath();
  contextoJogo.moveTo(mira.x - 8, mira.y);
  contextoJogo.lineTo(mira.x - 3, mira.y);
  contextoJogo.moveTo(mira.x + 3, mira.y);
  contextoJogo.lineTo(mira.x + 8, mira.y);
  contextoJogo.moveTo(mira.x, mira.y - 8);
  contextoJogo.lineTo(mira.x, mira.y - 3);
  contextoJogo.moveTo(mira.x, mira.y + 3);
  contextoJogo.lineTo(mira.x, mira.y + 8);
  contextoJogo.stroke();
  desenharArma(largura, altura);
}

function atualizarMira(evento) {
  const limites = canvasJogo.getBoundingClientRect();
  mira = {
    x: Math.max(0, Math.min(limites.width, evento.clientX - limites.left)),
    y: Math.max(0, Math.min(limites.height, evento.clientY - limites.top))
  };
}

canvasJogo.addEventListener("pointermove", atualizarMira);
canvasJogo.addEventListener("pointerdown", (evento) => {
  if (evento.button !== 0 && evento.pointerType !== "touch") return;
  evento.preventDefault();
  atualizarMira(evento);
  atualizarPonteiroDirecional("fire", evento.pointerId, true);
  canvasJogo.setPointerCapture(evento.pointerId);
  disparar();
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((tipoEvento) => {
  canvasJogo.addEventListener(tipoEvento, (evento) => {
    atualizarPonteiroDirecional("fire", evento.pointerId, false);
  });
});
botaoDisparar.addEventListener("pointerdown", (evento) => {
  if (!jogoAtivo) return;
  evento.preventDefault();
  atualizarPonteiroDirecional("fire", evento.pointerId, true);
  botaoDisparar.setPointerCapture(evento.pointerId);
  disparar();
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((tipoEvento) => {
  botaoDisparar.addEventListener(tipoEvento, (evento) => {
    atualizarPonteiroDirecional("fire", evento.pointerId, false);
  });
});
botaoRecarregar.addEventListener("click", recarregarArma);

botaoIniciar.addEventListener("click", iniciarJogo);
botaoInstalarApp.addEventListener("click", async () => {
  if (!eventoInstalacao) {
    const dispositivoApple = /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const navegadorEdge = /Edg\//.test(navigator.userAgent);
    const navegadorChrome = /Chrome|CriOS/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);
    mensagemInstalacao.textContent = dispositivoApple
      ? "No Safari, toque em Compartilhar e escolha Adicionar à Tela de Início. A instalação é feita pelo navegador, sem baixar um arquivo."
      : android
        ? "No Chrome, abra o menu ⋮ e escolha Instalar app ou Adicionar à tela inicial. A instalação é feita pelo navegador."
        : navegadorEdge
          ? "No Edge, abra o menu ⋯ e escolha Aplicativos > Instalar este site como aplicativo."
          : navegadorChrome
            ? "No Chrome, use o ícone de instalação na barra de endereço ou o menu ⋮ > Transmitir, salvar e compartilhar > Instalar página como app."
            : "Este navegador não abriu a instalação. Abra o link no Chrome ou Edge (Windows/Android), ou no Safari (iPhone/iPad), e instale pelo menu do navegador.";
    return;
  }

  const promptInstalacao = eventoInstalacao;
  eventoInstalacao = undefined;
  try {
    await promptInstalacao.prompt();
    const escolha = await promptInstalacao.userChoice;
    mensagemInstalacao.textContent = escolha.outcome === "accepted"
      ? "Aplicativo instalado com sucesso."
      : "Instalação cancelada. Você pode instalar pelo menu do navegador.";
  } catch (erro) {
    console.error("Não foi possível iniciar a instalação do aplicativo.", erro);
    mensagemInstalacao.textContent = "Não foi possível iniciar a instalação. Tente pelo menu do navegador.";
  }
});
window.addEventListener("beforeinstallprompt", (evento) => {
  evento.preventDefault();
  eventoInstalacao = evento;
});
window.addEventListener("appinstalled", () => {
  mensagemInstalacao.textContent = "Aplicativo instalado com sucesso.";
  botaoInstalarApp.hidden = true;
});
controlesDirecionais.forEach((controle) => {
  controle.addEventListener("pointerdown", (evento) => {
    if (!jogoAtivo) return;
    evento.preventDefault();
    atualizarPonteiroDirecional(controle.dataset.direcao, evento.pointerId, true);
    controle.setPointerCapture(evento.pointerId);
  });

  ["pointerup", "pointercancel", "lostpointercapture"].forEach((tipoEvento) => {
    controle.addEventListener(tipoEvento, (evento) => {
      atualizarPonteiroDirecional(controle.dataset.direcao, evento.pointerId, false);
    });
  });
});
opcoesNivel.forEach((opcao, indice) => {
  opcao.addEventListener("keydown", (evento) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(evento.key)) return;
    evento.preventDefault();
    const proximo = (indice + (["ArrowRight", "ArrowDown"].includes(evento.key) ? 1 : -1) + opcoesNivel.length) % opcoesNivel.length;
    opcoesNivel[proximo].checked = true;
    opcoesNivel[proximo].focus();
  });
});
botaoSair.addEventListener("click", sairDoJogo);
botaoSairFinal.addEventListener("click", sairDoJogo);
botaoSom.addEventListener("click", () => {
  audioAtivo = !audioAtivo;
  atualizarBotaoSom();
  if (!contextoAudio) {
    if (audioAtivo) prepararAudio();
    return;
  }
  volumeAudio.gain.setTargetAtTime(audioAtivo ? 0.45 : 0, contextoAudio.currentTime, 0.04);
  if (audioAtivo && jogoAtivo) iniciarAmbienteSonoro();
});
botaoReiniciar.addEventListener("click", () => {
  cancelAnimationFrame(animacaoJogo);
  iniciarPartida();
  jogoAtivo = true;
  canvasJogo.focus();
  iniciarAmbienteSonoro();
  animacaoJogo = requestAnimationFrame(atualizarJogo);
});
window.addEventListener("resize", ajustarCanvas);
window.addEventListener("keydown", (evento) => {
  const tecla = evento.key.toLowerCase();
  if (evento.target instanceof HTMLElement
    && evento.target.closest("button, input, textarea, select, [contenteditable='true']")) return;
  if (tecla === " " || tecla === "r") {
    evento.preventDefault();
    if (tecla === "r") recarregarArma();
    else if (!evento.repeat) disparar();
    if (tecla === " ") teclasPressionadas.add(tecla);
    return;
  }
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(tecla)) {
    evento.preventDefault();
    teclasPressionadas.add(tecla);
  }
});
window.addEventListener("keyup", (evento) => teclasPressionadas.delete(evento.key.toLowerCase()));
window.addEventListener("blur", () => {
  teclasPressionadas.clear();
  ponteirosDirecionais.clear();
});

const aplicativoInstalado = window.matchMedia("(display-mode: standalone)").matches
  || navigator.standalone === true;
if (aplicativoInstalado) botaoInstalarApp.hidden = true;

window.addEventListener("load", () => {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  }, { once: true });
  navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" }).catch((erro) => {
    console.error("Não foi possível habilitar o modo offline.", erro);
  });
});

botaoCamera.addEventListener("click", async () => {
  if (streamWebcam) {
    fecharWebcam();
    return;
  }

  painelWebcam.hidden = false;
  mensagemWebcam.textContent = "Solicitando acesso à webcam...";
  botaoCapturarSelfie.disabled = true;
  botaoCamera.setAttribute("aria-expanded", "true");

  if (!navigator.mediaDevices?.getUserMedia) {
    mensagemWebcam.textContent =
      "Este navegador não permite acesso à webcam. Abra a página em HTTPS ou em localhost.";
    return;
  }

  try {
    streamWebcam = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 }
      }
    });
    videoWebcam.srcObject = streamWebcam;
    await videoWebcam.play();
    botaoCapturarSelfie.disabled = false;
    mensagemWebcam.textContent = "Enquadre seu rosto e tire a selfie para criar o avatar.";
    botaoCamera.setAttribute("aria-label", "Fechar webcam");
  } catch (erro) {
    const mensagens = {
      NotAllowedError: "Permita o acesso à webcam nas configurações do navegador.",
      NotFoundError: "Nenhuma webcam foi encontrada neste dispositivo."
    };
    mensagemWebcam.textContent =
      mensagens[erro.name] || "Não foi possível abrir a webcam.";
  }
});

botaoCapturarSelfie.addEventListener("click", criarAvatarSelfie);
botaoFecharWebcam.addEventListener("click", fecharWebcam);
