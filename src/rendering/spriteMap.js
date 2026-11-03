import { deepFreeze } from '../utils/deepFreeze.js';

// Onde cada coisa está em assets/sprites/dino-sprite.png (folha original do Chromium, 1x).
export const SPRITE_MAP = deepFreeze({
  // x dos quadros do dino é relativo a dino.x
  dino: {
    x: 848,
    y: 2,
    height: 47,
    frames: {
      jump: { x: 0, w: 44 },
      run0: { x: 88, w: 44 },
      run1: { x: 132, w: 44 },
      duck0: { x: 264, w: 59 },
      duck1: { x: 323, w: 59 },
    },
  },
  // night-enemies.png: quadros de 32x48 lado a lado (3 do zumbi, 3 do esqueleto)
  enemies: {
    cellWidth: 32,
    cellHeight: 48,
    feetY: 47, // linha dos pés dentro do quadro
    walkCycle: [0, 1, 2, 1],
    ticksPerFrame: 8,
    firstColumn: { zombie: 0, skeleton: 3 },
  },
  cactusSmall: { x: 228, y: 2 },
  cactusLarge: { x: 332, y: 2 },
  bird: { x: 134, y: 2 },
  horizon: { x: 2, y: 54, width: 1200, height: 12 },
  cloud: { x: 86, y: 2, width: 46, height: 14 },
});
