# Vice Coast — cidade 3D

Jogo de exploração em terceira pessoa feito com Three.js, HTML, CSS e módulos
ES. A cidade, os prédios, as palmeiras e o carro são gerados no navegador; os
retratos de Arthur, CJ, Lucia e Jason permanecem disponíveis na seleção.

## Executar

Abra a pasta do projeto no VS Code, instale ou habilite a extensão **Live
Server** e escolha **Open with Live Server** no `index.html`. É necessário
acesso à internet para carregar o Three.js e a fonte usados via CDN.

## Controles

- **WASD:** caminhar ou dirigir.
- **Shift:** correr.
- **Espaço:** pular.
- **F:** entrar ou sair do carro (aproxime-se para entrar).
- **Mouse:** orbitar a câmera; clique na cena para capturar o mouse.
- **N:** alternar entre dia e noite.
- **Sair:** retorna à seleção de personagem.

## Módulos

- `src/main.js`: inicialização, entrada e loop com delta time.
- `src/scene.js`: câmera, luzes, céu, névoa e bloom.
- `src/city.js`: ruas, prédios, janelas, praça e vegetação instanciada.
- `src/player.js`: personagem, movimento, pulo, câmera e colisões.
- `src/vehicle.js`: carro e direção arcade.
- `src/ui.js`: minimapa e HUD.
- `src/utils.js`: randomização, limites e colisões AABB.
- `assets/`: espaço reservado para futuras texturas e modelos.
