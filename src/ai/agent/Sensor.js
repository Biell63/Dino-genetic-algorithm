import { clamp } from '../../utils/math.js';
import { assertObject } from '../../utils/validation.js';

export const SENSOR_INPUT_COUNT = 8;

// Transforma o jogo em 8 números (mais ou menos entre 0 e 1) para a rede:
//   0 Player Y       altura do dino
//   1 Distance       distância até o próximo obstáculo
//   2 Obstacle Width / 3 Obstacle Height   tamanho do obstáculo
//   4 Bird Y         altura do pássaro (0 se não for pássaro)
//   5 Game Speed     velocidade da pista
//   6 Meteor Threat  0 sem meteoro, sobe até 1 no impacto
//   7 Enemy Speed    velocidade extra do obstáculo (inimigos noturnos andam até o dino)
// Sem perigo o valor é 0, assim mexer no peso de uma entrada não muda o jogo quando ela não se aplica.
//
// Todos os dinos veem a mesma pista, então observe() lê a pista uma vez por passo e readInto()
// só acrescenta o que é de cada dino (altura e distância, que depende da largura dele).
export class Sensor {
  #game;
  #norm;
  #jumpRange;
  #shared = new Float64Array(SENSOR_INPUT_COUNT);
  #hasObstacle = false;
  #obstacleX = 0;

  constructor(gameConfig, networkConfig) {
    assertObject(gameConfig, 'gameConfig');
    assertObject(networkConfig, 'networkConfig');
    if (networkConfig.inputLabels.length !== SENSOR_INPUT_COUNT) {
      throw new RangeError(`a rede precisa ter ${SENSOR_INPUT_COUNT} entradas, uma por sensor`);
    }
    this.#game = gameConfig;
    this.#norm = networkConfig.sensor;
    this.#jumpRange = gameConfig.dino.groundTop - gameConfig.dino.maxJumpHeight;
  }

  get inputCount() {
    return SENSOR_INPUT_COUNT;
  }

  observe(track) {
    const { dino, track: speeds } = this.#game;
    const shared = this.#shared;
    const obstacle = track.nextObstacle(dino.startX);
    const meteor = track.meteor;

    shared[5] = (track.speed - speeds.initialSpeed) / (speeds.maxSpeed - speeds.initialSpeed);
    shared[6] = meteor === null ? 0 : 1 - clamp(meteor.framesToImpact / this.#norm.meteorHorizonFrames, 0, 1);

    this.#hasObstacle = obstacle !== null;
    if (obstacle === null) {
      shared[2] = shared[3] = shared[4] = shared[7] = 0;
      return;
    }
    this.#obstacleX = obstacle.x;
    shared[2] = obstacle.width / this.#norm.maxObstacleWidth;
    shared[3] = obstacle.height / this.#norm.maxObstacleHeight;
    shared[4] = obstacle.isFlying ? (dino.groundTop + dino.height - obstacle.y) / this.#norm.birdHeightScale : 0;
    shared[7] = clamp(obstacle.speedOffset / this.#norm.enemySpeedScale, -1, 1);
  }

  // usa a última observe(); `out` tem SENSOR_INPUT_COUNT posições
  readInto(dino, out) {
    const shared = this.#shared;
    out[0] = dino.heightAboveGround / this.#jumpRange;
    out[1] = this.#hasObstacle ? clamp((this.#obstacleX - (dino.x + dino.width)) / this.#norm.maxDistance, 0, 1) : 1;
    out[2] = shared[2];
    out[3] = shared[3];
    out[4] = shared[4];
    out[5] = shared[5];
    out[6] = shared[6];
    out[7] = shared[7];
  }
}
