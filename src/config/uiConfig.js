import { deepFreeze } from '../utils/deepFreeze.js';

// Layout do canvas e opções da interface, em pixels de tela.
export const UI_CONFIG = deepFreeze({
  canvas: { width: 1050, height: 560 },
  worldScale: 1.5, // ampliação do mundo do jogo na tela
  worldBottomMargin: 10,
  network: { x: 20, y: 6, w: 650, h: 268 },
  hud: { right: 1030, y: 44 },
  chart: { x: 700, y: 170, w: 330, h: 110 },
  // Cenário da noite (cidade em ruínas): duas camadas que repetem na horizontal. As medidas são em
  // pixels do arquivo; scale é a ampliação na tela (1.2 deixa a cidade logo abaixo do painel da rede).
  scenery: {
    scale: 1.2,
    tileWidth: 693, // largura de cada camada (e do trecho que se repete)
    sceneHeight: 260, // altura total da cena (fundo + estrada)
    backdropHeight: 191, // altura da camada do fundo
    roadStartRow: 189, // linha da cena onde a estrada começa (2 px de sobreposição com o fundo)
    roadHeight: 71,
    backdropScroll: 0.12, // velocidade do fundo em relação ao chão (paralaxe)
    skyColor: [127, 103, 125], // cor do céu, que se estende acima da imagem
    nightTint: [6, 8, 28], // véu escuro sobre o cenário
    nightTintAlpha: 0.38,
  },
  // multiplicadores de velocidade; Infinity é o MAX
  speeds: [1, 2, 5, 10, Infinity],
  maxStepsBudgetMs: 12, // tempo máximo gasto simulando por quadro no modo MAX
});
