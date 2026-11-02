import { Obstacle } from './Obstacle.js';
import { SeededRandom } from '../utils/SeededRandom.js';
import { RingBuffer } from '../utils/RingBuffer.js';
import { assertFunction, assertInstance, assertNumber, assertObject } from '../utils/validation.js';

// Cria, move e descarta os obstáculos. Entram pela direita e saem pela esquerda, ou seja, uma fila
// (FIFO): por isso RingBuffer e não pilha. Uma pilha tiraria sempre o mais novo.
export class ObstacleField {
  #config;
  #rng;
  #list = new RingBuffer(8);
  #typesByPhase;
  #lastKind = null;
  #streak = 0; // quantos obstáculos seguidos do mesmo tipo
  #spawnPausedUntil = 0;
  #pending = null; // próximo já sorteado, esperando espaço para nascer
  #lastPassedFrame = -Infinity;

  constructor(gameConfig, rng) {
    assertObject(gameConfig, 'gameConfig');
    assertInstance(rng, SeededRandom, 'rng');
    this.#config = gameConfig;
    this.#rng = rng;
    const types = gameConfig.obstacleTypes;
    this.#typesByPhase = {
      day: types.filter((t) => t.phase === 'day' || t.phase === 'any'),
      night: types.filter((t) => t.phase === 'night' || t.phase === 'any'),
    };
  }

  get length() {
    return this.#list.length;
  }

  forEach(callback) {
    assertFunction(callback, 'callback');
    this.#list.forEach(callback);
  }

  update(speed, frame, isNight = false) {
    const dinoX = this.#config.dino.startX;
    const list = this.#list;
    for (let i = 0; i < list.length; i++) {
      const obstacle = list.at(i);
      const rightBefore = obstacle.right;
      obstacle.update(speed);
      if (rightBefore >= dinoX && obstacle.right < dinoX) {
        this.#lastPassedFrame = frame;
      }
    }
    while (list.length > 0 && list.first().isOffScreen) {
      list.shift();
    }

    if (frame < this.#config.track.clearFrames) {
      return;
    }
    if (this.#pending === null) {
      this.#pending = this.#plan(speed, isNight);
    }
    if (frame > this.#spawnPausedUntil && this.#hasRoomFor(this.#pending, speed)) {
      this.#spawn(this.#pending);
      this.#pending = null;
    }
  }

  // segura os nascimentos até `frame` (inclusive); os que já existem continuam andando
  pauseSpawningUntil(frame) {
    assertNumber(frame, 'frame');
    this.#spawnPausedUntil = Math.max(this.#spawnPausedUntil, frame);
  }

  // pista vazia à frente do dino e o último obstáculo já passou há `settleFrames` (tempo de pousar)
  isCalm(frame, settleFrames) {
    return this.nextAhead(this.#config.dino.startX) === null && frame - this.#lastPassedFrame >= settleFrames;
  }

  // primeiro obstáculo que ainda não passou totalmente de minX
  nextAhead(minX) {
    const list = this.#list;
    for (let i = 0; i < list.length; i++) {
      if (list.at(i).right > minX) {
        return list.at(i);
      }
    }
    return null;
  }

  // algum obstáculo ocupa a faixa horizontal [minX, maxX]?
  anyOverlapping(minX, maxX) {
    const list = this.#list;
    for (let i = 0; i < list.length; i++) {
      const o = list.at(i);
      if (o.x < maxX && o.right > minX) {
        return true;
      }
    }
    return false;
  }

  anyCollision(dino) {
    const list = this.#list;
    for (let i = 0; i < list.length; i++) {
      if (dino.collidesWith(list.at(i))) {
        return true;
      }
    }
    return false;
  }

  // O espaço entre dois obstáculos é medido em tempo de chegada ao dino, não só em distância.
  // Com a mesma velocidade dá na regra do jogo original (last.right + last.gap < largura). Quando o
  // novo anda mais rápido que o da frente (zumbi logo depois de um cacto), ele espera mais para
  // nascer; senão alcançaria o cacto e o dino não teria tempo de pousar e pular de novo.
  #hasRoomFor(plan, speed) {
    const last = this.#list.last();
    if (last === undefined) {
      return true;
    }
    const dinoX = this.#config.dino.startX;
    const lastSpeed = Math.max(1, speed + last.speedOffset);
    const newSpeed = Math.max(1, speed + plan.speedOffset);
    const lastArrival = (last.right - dinoX) / lastSpeed;
    const newArrival = (this.#config.world.width - dinoX) / newSpeed;
    return newArrival - lastArrival >= last.gap / lastSpeed;
  }

  // a ordem das chamadas ao rng não pode mudar: as simulações com semente dependem dela
  #plan(speed, isNight) {
    const { track } = this.#config;
    const type = this.#chooseType(speed, isNight);

    let size = this.#rng.int(1, track.maxObstacleSize);
    if (size > 1 && speed < type.multipleSpeed) {
      size = 1; // grupos só com o jogo mais rápido
    }

    const sign = type.randomSpeedSign && this.#rng.chance(0.5) ? -1 : 1;
    const speedOffset = (type.speedOffset ?? 0) * sign;
    const approachSpeed = speed + Math.max(0, speedOffset); // inimigos chegam mais rápido que a pista
    const minGap = Math.round(type.width * size * approachSpeed + type.minGap * track.gapCoefficient);
    const maxGap = Math.round(minGap * track.maxGapCoefficient);

    return { type, size, speedOffset, y: this.#rng.pick(type.y), gap: this.#rng.int(minGap, maxGap) };
  }

  #spawn(plan) {
    this.#list.push(
      new Obstacle({
        type: plan.type,
        x: this.#config.world.width,
        y: plan.y,
        size: plan.size,
        speedOffset: plan.speedOffset,
        gap: plan.gap,
      }),
    );
    this.#streak = plan.type.id === this.#lastKind ? this.#streak + 1 : 1;
    this.#lastKind = plan.type.id;
  }

  #chooseType(speed, isNight) {
    const inPhase = this.#typesByPhase[isNight ? 'night' : 'day'];
    // não deixa passar de maxDuplicates obstáculos iguais em sequência
    const blocked = this.#streak >= this.#config.track.maxDuplicates ? this.#lastKind : null;
    const candidates = inPhase.filter((t) => speed >= t.minSpeed && t.id !== blocked);
    return this.#rng.pick(candidates.length > 0 ? candidates : inPhase.filter((t) => t.minSpeed === 0));
  }
}
