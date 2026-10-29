const imagemPersonagem = document.querySelector(".personagem");
const nomePersonagem = document.querySelector(".jogador");
const botaoCamera = document.querySelector(".botao-camera");
const painelWebcam = document.querySelector(".webcam");
const videoWebcam = document.querySelector(".video-webcam");
const mensagemWebcam = document.querySelector(".mensagem-webcam");
const botaoFecharWebcam = document.querySelector(".fechar-webcam");
const botaoCapturarSelfie = document.querySelector(".capturar-selfie");
const previewSelfie = document.querySelector(".avatar-selfie-preview");
const botaoAvatarSelfie = document.querySelector(".opcao-selfie");
const botaoIniciar = document.querySelector(".iniciar-jogo");
const telaJogo = document.querySelector(".game-container");
const canvasJogo = document.querySelector("#game-canvas");
const contextoJogo = canvasJogo.getContext("2d");
const textoMissao = document.querySelector("#mission-text");
const textoNivel = document.querySelector("#level-text");
const textoTempo = document.querySelector("#timer-text");
const mensagemConclusao = document.querySelector(".mensagem-conclusao");
const contagemProximoNivel = document.querySelector(".contagem-proximo-nivel");
const opcoesNivel = [...document.querySelectorAll('input[name="nivel-jogo"]')];
const camposConfiguracaoNivel = [...document.querySelectorAll("[data-config-nivel]")];
const telaMissaoConcluida = document.querySelector(".mission-complete");
const botaoSair = document.querySelector("#exit-game");
const botaoSom = document.querySelector("#toggle-som");
const botaoReiniciar = document.querySelector(".reiniciar-jogo");
const controlesDirecionais = [...document.querySelectorAll(".controle-direcional")];
const opcoesPersonagem = [...document.querySelectorAll(".opcao-personagem")];
let streamWebcam;
let imagemSelecionada = imagemPersonagem.src;
let nomeSelecionado = nomePersonagem.textContent;
let selfieAvatarUrl;
let imagemDoJogo;
let animacaoJogo;
let jogoAtivo = false;
let comemorando = false;
let inicioComemoracao = 0;
let campanhaConcluida = false;
let tempoAnterior = 0;
let contextoAudio;
let volumeAudio;
let audioAtivo = true;
let osciladoresAmbiente = [];
let proximoPassoAudio = 0;
let passoAtual = 0;
let tempoRestante = 240;
let nivelAtual = 3;
let avisoTimeout;
let jogador = { x: 0, y: 0, angulo: 0 };
let pacotes = [];
let pacotesColetados = 0;
const teclasPressionadas = new Set();
const ponteirosDirecionais = new Map();
const mouse = { x: 0, y: 0 };
const tamanhoPacote = 28;
const velocidadeJogador = 210;
const tamanhoCidade = 240;
const niveis = {
  1: { nome: "Fácil", pacotes: 15, tempo: 60 },
  2: { nome: "Médio", pacotes: 22, tempo: 120 },
  3: { nome: "Difícil", pacotes: 30, tempo: 240 }
};
function obterPosicoesPacotes(quantidade) {
  const totalPosicoes = Math.max(30, quantidade * 2);
  const colunas = Math.ceil(Math.sqrt(totalPosicoes));
  const linhas = Math.ceil(totalPosicoes / colunas);
  const espacamento = 180;
  const variacao = 50;
  const posicoes = Array.from({ length: colunas * linhas }, (_, indice) => {
    const coluna = indice % colunas;
    const linha = Math.floor(indice / colunas);
    return {
      x: (coluna - (colunas - 1) / 2) * espacamento + (Math.random() - 0.5) * variacao,
      y: (linha - (linhas - 1) / 2) * espacamento + (Math.random() - 0.5) * variacao
    };
  });

  for (let indice = posicoes.length - 1; indice > 0; indice -= 1) {
    const indiceAleatorio = Math.floor(Math.random() * (indice + 1));
    [posicoes[indice], posicoes[indiceAleatorio]] = [posicoes[indiceAleatorio], posicoes[indice]];
  }

  return posicoes.slice(0, quantidade);
}

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

function tocarNotas(notas) {
  if (!contextoAudio || !audioAtivo || contextoAudio.state !== "running") return;
  const agora = contextoAudio.currentTime;

  notas.forEach(({ frequencia, inicio, duracao, forma = "sine" }) => {
    const oscilador = contextoAudio.createOscillator();
    const ganho = contextoAudio.createGain();
    const inicioNota = agora + inicio;
    const fimNota = inicioNota + duracao;
    oscilador.type = forma;
    oscilador.frequency.setValueAtTime(frequencia, inicioNota);
    ganho.gain.setValueAtTime(0.0001, inicioNota);
    ganho.gain.exponentialRampToValueAtTime(0.12, inicioNota + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, fimNota);
    oscilador.connect(ganho);
    ganho.connect(volumeAudio);
    oscilador.start(inicioNota);
    oscilador.stop(fimNota + 0.02);
  });
}

function tocarColeta() {
  tocarNotas([
    { frequencia: 660, inicio: 0, duracao: 0.13 },
    { frequencia: 990, inicio: 0.09, duracao: 0.2, forma: "triangle" }
  ]);
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
  ganho.gain.exponentialRampToValueAtTime(0.28, agora + 0.012);
  ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.19);
  clique.type = "sine";
  clique.frequency.setValueAtTime(620, agora);
  clique.frequency.exponentialRampToValueAtTime(210, agora + 0.045);
  ganhoClique.gain.setValueAtTime(0.0001, agora);
  ganhoClique.gain.exponentialRampToValueAtTime(0.07, agora + 0.006);
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

function tocarMissaoConcluida() {
  tocarNotas([
    { frequencia: 523.25, inicio: 0, duracao: 0.22, forma: "triangle" },
    { frequencia: 659.25, inicio: 0.16, duracao: 0.22, forma: "triangle" },
    { frequencia: 783.99, inicio: 0.32, duracao: 0.22, forma: "triangle" },
    { frequencia: 1046.5, inicio: 0.48, duracao: 0.5, forma: "triangle" }
  ]);
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

function iniciarMissao() {
  jogador = { x: 0, y: 0, angulo: 0 };
  pacotesColetados = 0;
  comemorando = false;
  inicioComemoracao = 0;
  const nivel = niveis[nivelAtual];
  pacotes = obterPosicoesPacotes(nivel.pacotes).map((posicao) => ({ ...posicao, coletado: false }));
  tempoRestante = nivel.tempo;
  tempoAnterior = 0;
  telaMissaoConcluida.hidden = true;
  textoNivel.textContent = `Nível ${nivelAtual} · ${nivel.nome}`;
  atualizarTextoTempo();
  textoMissao.textContent = `Objetivo: coletar ${pacotes.length} pacotes (${pacotesColetados}/${pacotes.length})`;
}

function formatarTempo(segundos) {
  const totalSegundos = Math.ceil(Math.max(0, segundos));
  const minutos = Math.floor(totalSegundos / 60);
  const restantes = totalSegundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(restantes).padStart(2, "0")}`;
}

function atualizarTextoTempo() {
  textoTempo.textContent = `Tempo: ${formatarTempo(tempoRestante)}`;
}

function reiniciarNivelPorTempo() {
  clearTimeout(avisoTimeout);
  iniciarMissao();
  textoMissao.textContent = "Tempo esgotado! O nível foi reiniciado.";
  avisoTimeout = setTimeout(() => {
    if (jogoAtivo) {
      textoMissao.textContent = `Objetivo: coletar ${pacotes.length} pacotes (${pacotesColetados}/${pacotes.length})`;
    }
  }, 2200);
}

function atualizarConfiguracaoNiveis() {
  camposConfiguracaoNivel
    .filter((campo) => campo.dataset.config === "pacotes")
    .forEach((campo) => {
      campo.setCustomValidity(Number.isSafeInteger(campo.valueAsNumber)
        ? ""
        : "Informe uma quantidade inteira válida de pacotes.");
    });

  const campoInvalido = camposConfiguracaoNivel.find((campo) => !campo.checkValidity());
  if (campoInvalido) {
    campoInvalido.reportValidity();
    return false;
  }

  camposConfiguracaoNivel.forEach((campo) => {
    const nivel = niveis[campo.dataset.configNivel];
    const valor = campo.valueAsNumber;
    nivel[campo.dataset.config] = campo.dataset.config === "tempo"
      ? Math.round(valor * 60)
      : valor;
  });
  return true;
}

function iniciarJogo() {
  if (!atualizarConfiguracaoNiveis()) return;
  fecharWebcam();
  campanhaConcluida = false;
  nivelAtual = Number(document.querySelector('input[name="nivel-jogo"]:checked').value);
  imagemDoJogo = new Image();
  imagemDoJogo.src = imagemSelecionada;
  iniciarMissao();
  document.body.classList.add("jogo-ativo");
  telaJogo.hidden = false;
  jogoAtivo = true;
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
  comemorando = false;
  cancelAnimationFrame(animacaoJogo);
  clearTimeout(avisoTimeout);
  teclasPressionadas.clear();
  ponteirosDirecionais.clear();
  encerrarAmbienteSonoro();
  document.body.classList.remove("jogo-ativo");
  telaJogo.hidden = true;
  limparAvatarSelfie();
}

function atualizarJogo(tempo) {
  if (!jogoAtivo && !comemorando) return;
  const delta = tempoAnterior ? Math.min((tempo - tempoAnterior) / 1000, 0.05) : 0;
  tempoAnterior = tempo;

  if (jogoAtivo) {
    tempoRestante = Math.max(0, tempoRestante - delta);
    atualizarTextoTempo();
    if (tempoRestante <= 0) {
      reiniciarNivelPorTempo();
      renderizar(tempo);
      animacaoJogo = requestAnimationFrame(atualizarJogo);
      return;
    }

    let movimentoX = 0;
    let movimentoY = 0;
    if (teclasPressionadas.has("a") || teclasPressionadas.has("arrowleft") || ponteirosDirecionais.has("arrowleft")) movimentoX -= 1;
    if (teclasPressionadas.has("d") || teclasPressionadas.has("arrowright") || ponteirosDirecionais.has("arrowright")) movimentoX += 1;
    if (teclasPressionadas.has("w") || teclasPressionadas.has("arrowup") || ponteirosDirecionais.has("arrowup")) movimentoY -= 1;
    if (teclasPressionadas.has("s") || teclasPressionadas.has("arrowdown") || ponteirosDirecionais.has("arrowdown")) movimentoY += 1;

    if (movimentoX && movimentoY) {
      movimentoX *= Math.SQRT1_2;
      movimentoY *= Math.SQRT1_2;
    }
    if (movimentoX || movimentoY) tocarPasso();
    jogador.x += movimentoX * velocidadeJogador * delta;
    jogador.y += movimentoY * velocidadeJogador * delta;

    const largura = canvasJogo.clientWidth;
    const altura = canvasJogo.clientHeight;
    const ponteiroX = mouse.x - largura / 2;
    const ponteiroY = mouse.y - altura / 2;
    if (ponteiroX || ponteiroY) jogador.angulo = Math.atan2(ponteiroY, ponteiroX) + Math.PI / 2;

    pacotes.forEach((pacote) => {
      if (pacote.coletado) return;
      if (Math.hypot(pacote.x - jogador.x, pacote.y - jogador.y) < tamanhoPacote) {
        pacote.coletado = true;
        pacotesColetados += 1;
        textoMissao.textContent = `Objetivo: coletar ${pacotes.length} pacotes (${pacotesColetados}/${pacotes.length})`;
        tocarColeta();
      }
    });

    if (pacotesColetados === pacotes.length) {
      jogoAtivo = false;
      comemorando = true;
      inicioComemoracao = tempo;
      teclasPressionadas.clear();
      const temProximoNivel = nivelAtual < 3;
      mensagemConclusao.textContent = temProximoNivel ? `Nível ${nivelAtual} concluído!` : "Campanha concluída!";
      contagemProximoNivel.hidden = !temProximoNivel;
      botaoReiniciar.hidden = temProximoNivel;
      if (temProximoNivel) {
        contagemProximoNivel.textContent = "Próximo nível em 5 segundos...";
      } else {
        campanhaConcluida = true;
        botaoReiniciar.hidden = false;
        botaoReiniciar.textContent = "Recomeçar campanha";
      }
      telaMissaoConcluida.hidden = false;
      tocarMissaoConcluida();
    }
  }

  if (comemorando) {
    const segundosAteProximo = Math.max(0, Math.ceil(5 - (tempo - inicioComemoracao) / 1000));
    if (nivelAtual < 3) {
      contagemProximoNivel.textContent = `Próximo nível em ${segundosAteProximo} segundo${segundosAteProximo === 1 ? "" : "s"}...`;
      if (segundosAteProximo === 0) {
        nivelAtual += 1;
        opcoesNivel.forEach((opcao) => {
          opcao.checked = Number(opcao.value) === nivelAtual;
        });
        iniciarMissao();
        jogoAtivo = true;
        tempoAnterior = tempo;
      }
    }
  }

  renderizar(tempo);
  if (jogoAtivo || (comemorando && tempo - inicioComemoracao < 5000)) {
    animacaoJogo = requestAnimationFrame(atualizarJogo);
  } else {
    comemorando = false;
  }
}

function corDoBloco(coluna, linha) {
  const valor = Math.abs(Math.sin(coluna * 127.1 + linha * 311.7) * 43758.5453) % 1;
  return valor > 0.5 ? "#ff2d95" : "#7b2dff";
}

function renderizarCidade(largura, altura) {
  contextoJogo.fillStyle = "#090713";
  contextoJogo.fillRect(0, 0, largura, altura);

  const cameraX = jogador.x - largura / 2;
  const cameraY = jogador.y - altura / 2;
  const inicioColuna = Math.floor(cameraX / tamanhoCidade) - 1;
  const fimColuna = Math.ceil((cameraX + largura) / tamanhoCidade) + 1;
  const inicioLinha = Math.floor(cameraY / tamanhoCidade) - 1;
  const fimLinha = Math.ceil((cameraY + altura) / tamanhoCidade) + 1;

  for (let coluna = inicioColuna; coluna <= fimColuna; coluna += 1) {
    for (let linha = inicioLinha; linha <= fimLinha; linha += 1) {
      const x = coluna * tamanhoCidade - cameraX;
      const y = linha * tamanhoCidade - cameraY;
      const cor = corDoBloco(coluna, linha);
      contextoJogo.fillStyle = "#11101c";
      contextoJogo.fillRect(x + 34, y + 34, tamanhoCidade - 68, tamanhoCidade - 68);
      contextoJogo.strokeStyle = cor;
      contextoJogo.globalAlpha = 0.78;
      contextoJogo.lineWidth = 2;
      contextoJogo.strokeRect(x + 34, y + 34, tamanhoCidade - 68, tamanhoCidade - 68);
      contextoJogo.globalAlpha = 0.14;
      contextoJogo.fillStyle = cor;
      contextoJogo.fillRect(x + 46, y + 46, tamanhoCidade - 92, tamanhoCidade - 92);
      contextoJogo.globalAlpha = 1;
    }
  }

  contextoJogo.strokeStyle = "#30203e";
  contextoJogo.lineWidth = 1;
  contextoJogo.setLineDash([12, 14]);
  for (let coluna = inicioColuna; coluna <= fimColuna; coluna += 1) {
    const centroX = coluna * tamanhoCidade + tamanhoCidade / 2 - cameraX;
    contextoJogo.beginPath();
    contextoJogo.moveTo(centroX, 0);
    contextoJogo.lineTo(centroX, altura);
    contextoJogo.stroke();
  }
  for (let linha = inicioLinha; linha <= fimLinha; linha += 1) {
    const centroY = linha * tamanhoCidade + tamanhoCidade / 2 - cameraY;
    contextoJogo.beginPath();
    contextoJogo.moveTo(0, centroY);
    contextoJogo.lineTo(largura, centroY);
    contextoJogo.stroke();
  }
  contextoJogo.setLineDash([]);
}

function renderizar(tempo = performance.now()) {
  if (!canvasJogo || !canvasJogo.clientWidth) return;
  const largura = canvasJogo.clientWidth;
  const altura = canvasJogo.clientHeight;
  renderizarCidade(largura, altura);
  const centroX = largura / 2;
  const centroY = altura / 2;

  pacotes.forEach((pacote) => {
    if (pacote.coletado) return;
    const x = centroX + pacote.x - jogador.x;
    const y = centroY + pacote.y - jogador.y;
    contextoJogo.save();
    contextoJogo.shadowColor = "#33f6ff";
    contextoJogo.shadowBlur = 18;
    contextoJogo.fillStyle = "#33f6ff";
    contextoJogo.fillRect(x - 7, y - 7, 14, 14);
    contextoJogo.restore();
  });

  contextoJogo.save();
  contextoJogo.translate(centroX, centroY);
  let salto = 0;
  let escala = 1;
  let rotacao = jogador.angulo;
  if (comemorando) {
    const progresso = Math.max(0, (tempo - inicioComemoracao) / 1000);
    const intensidade = Math.max(0, 1 - progresso / 5);
    salto = Math.abs(Math.sin(progresso * 9)) * 24 * intensidade;
    escala += Math.sin(progresso * 12) * 0.12 * intensidade;
    rotacao += Math.sin(progresso * 8) * 0.45 * intensidade;

    contextoJogo.save();
    contextoJogo.globalAlpha = 0.45 + Math.sin(progresso * 10) * 0.2;
    contextoJogo.strokeStyle = "#33f6ff";
    contextoJogo.lineWidth = 3;
    contextoJogo.shadowColor = "#33f6ff";
    contextoJogo.shadowBlur = 20;
    contextoJogo.beginPath();
    contextoJogo.arc(0, 0, 42 + Math.sin(progresso * 8) * 5, 0, Math.PI * 2);
    contextoJogo.stroke();
    contextoJogo.restore();
  }
  contextoJogo.translate(0, -salto);
  contextoJogo.rotate(rotacao);
  contextoJogo.scale(escala, escala);
  if (nomeSelecionado === "SELFIE" && imagemDoJogo?.complete && imagemDoJogo.naturalWidth) {
    contextoJogo.save();
    contextoJogo.beginPath();
    contextoJogo.roundRect(-31, -43, 62, 86, 10);
    contextoJogo.clip();
    contextoJogo.drawImage(imagemDoJogo, -31, -43, 62, 86);
    contextoJogo.restore();
    contextoJogo.strokeStyle = "#33f6ff";
    contextoJogo.lineWidth = 3;
    contextoJogo.shadowColor = "#33f6ff";
    contextoJogo.shadowBlur = 16;
    contextoJogo.beginPath();
    contextoJogo.roundRect(-32, -44, 64, 88, 11);
    contextoJogo.stroke();
  } else if (imagemDoJogo?.complete && imagemDoJogo.naturalWidth) {
    contextoJogo.drawImage(imagemDoJogo, -34, -47, 68, 94);
  } else {
    contextoJogo.fillStyle = "#ff2d95";
    contextoJogo.beginPath();
    contextoJogo.arc(0, 0, 25, 0, Math.PI * 2);
    contextoJogo.fill();
  }
  contextoJogo.restore();
}

botaoIniciar.addEventListener("click", iniciarJogo);
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
  clearTimeout(avisoTimeout);
  if (campanhaConcluida) {
    nivelAtual = 1;
    opcoesNivel.forEach((opcao) => {
      opcao.checked = Number(opcao.value) === nivelAtual;
    });
  }
  campanhaConcluida = false;
  iniciarMissao();
  jogoAtivo = true;
  botaoReiniciar.hidden = true;
  contagemProximoNivel.hidden = true;
  iniciarAmbienteSonoro();
  animacaoJogo = requestAnimationFrame(atualizarJogo);
});
canvasJogo.addEventListener("mousemove", (evento) => {
  const limites = canvasJogo.getBoundingClientRect();
  mouse.x = evento.clientX - limites.left;
  mouse.y = evento.clientY - limites.top;
});
window.addEventListener("resize", ajustarCanvas);
window.addEventListener("keydown", (evento) => {
  const tecla = evento.key.toLowerCase();
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
