import { Meteor } from './Meteor.js';
import { SeededRandom } from '../utils/SeededRandom.js';
import { assertBoolean, assertInstance, assertInteger, assertObject } from '../utils/validation.js';

// Decide quando cai um meteoro e mira nos dinos. No máximo um por vez.
// O meteoro só machuca nos últimos passos antes do impacto, então a defesa é estar no ar.
export class MeteorShower {
  #game;
  #config;
  #rng;
  #enabled;
  #current = null;
  #lastImpact = null;
  #nextSpawnFrame;

  constructor({ gameConfig, rng, enabled = false }) {
    assertObject(gameConfig, 'gameConfig');
    assertInstance(rng, SeededRandom, 'rng');
    assertBoolean(enabled, 'enabled');
    const config = gameConfig.meteors;
    assertInteger(config.startFrame, 'meteors.startFrame', { min: 0 });
    assertInteger(config.minIntervalFrames, 'meteors.minIntervalFrames', { min: 1 });
    assertInteger(config.maxIntervalFrames, 'meteors.maxIntervalFrames', { min: config.minIntervalFrames });
    assertInteger(config.calmFrames, 'meteors.calmFrames', { min: 0 });
    assertInteger(config.settleFrames, 'meteors.settleFrames', { min: 0 });
    this.#game = gameConfig;
    this.#config = config;
    this.#rng = rng;
    this.#enabled = enabled;
    this.#nextSpawnFrame = config.startFrame;
  }

  get enabled() {
    return this.#enabled;
  }

  get current() {
    return this.#current;
  }

  // { x, frame } do último impacto, para o efeito da explosão
  get lastImpact() {
    return this.#lastImpact;
  }

  update(frame, obstacles) {
    const meteor = this.#current;
    if (meteor !== null) {
      if (meteor.hasImpacted) {
        this.#current = null; // ficou um passo no chão para o impacto contar como colisão
      } else {
        meteor.update();
        if (meteor.hasImpacted) {
          this.#lastImpact = { x: meteor.centerX, frame };
        }
      }
    }

    if (this.#enabled && this.#current === null && frame >= this.#nextSpawnFrame) {
      // chegou a hora: para de criar obstáculos até a pista esvaziar, assim sempre existe um jeito de escapar
      obstacles.pauseSpawningUntil(frame + 1);
      if (obstacles.isCalm(frame, this.#config.settleFrames)) {
        this.#spawn(frame);
        obstacles.pauseSpawningUntil(frame + this.#config.calmFrames);
      }
    }
  }

  collidesWith(dino) {
    return this.#current !== null && dino.collidesWith(this.#current);
  }

  // a trajetória é calculada para terminar no chão, na posição do dino (com um pouco de erro de mira)
  #spawn(frame) {
    const m = this.#config;
    const dino = this.#game.dino;
    const targetX = dino.startX + dino.width / 2 + this.#rng.range(-m.aimJitter, m.aimJitter);
    const impactY = dino.groundTop + dino.height;
    const startBottom = m.startY + m.hitbox.y + m.hitbox.h;
    const fallFrames = Math.ceil((impactY - startBottom) / m.speedY);
    const x = targetX - (m.hitbox.x + m.hitbox.w / 2) - m.speedX * fallFrames;

    this.#current = new Meteor({ config: m, x, y: m.startY, impactY });
    this.#nextSpawnFrame = frame + this.#rng.int(m.minIntervalFrames, m.maxIntervalFrames);
  }
}
