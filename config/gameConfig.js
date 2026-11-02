import { deepFreeze } from '../utils/deepFreeze.js';

// Constantes do jogo. Unidades de mundo = pixels do jogo original; a simulação anda em passos de 1/60 s.
// Física e geração de obstáculos vêm do código do Chromium (licença BSD).
export const GAME_CONFIG = deepFreeze({
  world: {
    width: 700, // largura visível do mundo
    height: 150, // altura do mundo
    horizonY: 127, // y da linha do chão (apenas visual)
  },

  track: {
    initialSpeed: 6, // velocidade inicial (unidades por passo)
    maxSpeed: 13,
    acceleration: 0.001, // ganho de velocidade por passo
    clearFrames: 180, // passos sem obstáculos no início (3 s)
    gapCoefficient: 0.6,
    maxGapCoefficient: 1.5,
    maxObstacleSize: 3, // máximo de cactos agrupados
    maxDuplicates: 2, // máximo de obstáculos iguais seguidos
    distanceToScore: 0.025, // converte distância percorrida em pontos
  },

  // ciclo em pontos: 500 de dia, 500 de noite; à noite os cactos dão lugar a zumbis e esqueletos
  dayNight: {
    dayLength: 500, // duração de cada dia
    nightLength: 500, // duração de cada noite
    fade: 50, // pontos para escurecer/clarear (transição suave)
  },

  dino: {
    startX: 50,
    width: 44,
    height: 47,
    duckWidth: 59,
    groundTop: 93, // y do topo do dino em pé, apoiado no chão
    gravity: 0.6,
    initialJumpVelocity: -10,
    dropVelocity: -5, // velocidade ao "soltar" o pulo
    speedDropCoefficient: 3, // queda rápida (agachar no ar)
    maxJumpHeight: 30, // y mínimo que o topo do dino alcança
    minJumpHeight: 30, // altura mínima antes de poder encurtar o pulo
    // caixas de colisão, relativas ao canto do sprite
    hitbox: { x: 5, y: 4, w: 32, h: 40 },
    duckHitbox: { x: 3, y: 20, w: 51, h: 21 },
  },

  // meteoro: cai na diagonal mirando o dino e só machuca perto do chão (hitbox sem a cauda de fogo)
  meteors: {
    width: 41, // tamanho do sprite (unidades de mundo)
    height: 41,
    hitbox: { x: 3, y: 14, w: 26, h: 24 },
    speedX: -7, // diagonal de 45°, a mesma inclinação da cauda do sprite
    speedY: 7,
    startY: -120, // topo inicial: acima da área visível do jogo
    startFrame: 600, // o primeiro meteoro cai após 10 s de jogo
    minIntervalFrames: 360, // intervalo entre meteoros (6 s a 14 s)
    maxIntervalFrames: 840,
    aimJitter: 8, // erro máximo de mira, em unidades
    explosionFrames: 18, // duração do efeito visual do impacto
    // Antes do meteoro cair o jogo para de criar obstáculos, espera a pista esvaziar e o dino pousar
    // (settleFrames) e segura os obstáculos por calmFrames depois. Assim sempre há um jeito de escapar.
    settleFrames: 36,
    calmFrames: 40,
  },

  // phase: 'day', 'night' ou 'any'. y: alturas possíveis (sorteia uma). inset: margem da hitbox.
  // multipleSpeed: velocidade mínima para aparecerem grupos. speedOffset: velocidade extra sobre a pista.
  // randomSpeedSign: o pássaro pode ser um pouco mais lento ou mais rápido.
  obstacleTypes: [
    {
      id: 'cactusSmall',
      phase: 'day',
      flying: false,
      width: 17,
      height: 35,
      y: [105],
      minGap: 120,
      minSpeed: 0,
      multipleSpeed: 4,
      inset: { x: 2, y: 2 },
    },
    {
      id: 'cactusLarge',
      phase: 'day',
      flying: false,
      width: 25,
      height: 50,
      y: [90],
      minGap: 120,
      minSpeed: 0,
      multipleSpeed: 7,
      inset: { x: 2, y: 2 },
    },
    {
      id: 'bird',
      phase: 'any',
      flying: true,
      width: 46,
      height: 40,
      y: [100, 75, 50],
      minGap: 150,
      minSpeed: 8.5,
      multipleSpeed: 999,
      speedOffset: 0.8,
      randomSpeedSign: true,
      inset: { x: 4, y: 8 },
    },
    // inimigos da noite: andam até o dino, os dois com a mesma velocidade extra (um não alcança o outro)
    {
      id: 'zombie',
      phase: 'night',
      flying: false,
      width: 22,
      height: 40,
      y: [100],
      minGap: 130,
      minSpeed: 0,
      multipleSpeed: 8,
      speedOffset: 2,
      inset: { x: 3, y: 3 },
    },
    {
      id: 'skeleton',
      phase: 'night',
      flying: false,
      width: 22,
      height: 46,
      y: [94],
      minGap: 130,
      minSpeed: 0,
      multipleSpeed: 9,
      speedOffset: 2,
      inset: { x: 3, y: 3 },
    },
  ],
});
