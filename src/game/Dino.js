import { assertBoolean, assertNumber, assertObject } from '../utils/validation.js';

export const DinoState = Object.freeze({ RUNNING: 'running', JUMPING: 'jumping', DUCKING: 'ducking' });

// pulo grande segura a tecla até o fim; o pequeno solta assim que passa da altura mínima
export const JumpKind = Object.freeze({ BIG: 'big', SMALL: 'small' });

// Só física e colisão. Quem decide pular é o Agent.
export class Dino {
  #cfg;
  #y;
  #state = DinoState.RUNNING;
  #jumpVelocity = 0;
  #reachedMinHeight = false;
  #speedDrop = false;
  #shortJump = false;
  #alive = true;

  constructor(dinoConfig) {
    assertObject(dinoConfig, 'dinoConfig');
    this.#cfg = dinoConfig;
    this.#y = dinoConfig.groundTop;
  }

  get x() {
    return this.#cfg.startX;
  }

  get y() {
    return this.#y;
  }

  get width() {
    return this.#state === DinoState.DUCKING ? this.#cfg.duckWidth : this.#cfg.width;
  }

  get height() {
    return this.#cfg.height;
  }

  get state() {
    return this.#state;
  }

  get isAlive() {
    return this.#alive;
  }

  get isAirborne() {
    return this.#state === DinoState.JUMPING;
  }

  get heightAboveGround() {
    return this.#cfg.groundTop - this.#y;
  }

  // devolve false se já estava no ar (ou morto)
  jump(kind, speed) {
    if (kind !== JumpKind.BIG && kind !== JumpKind.SMALL) {
      throw new TypeError(`kind deve ser JumpKind.BIG ou JumpKind.SMALL (recebido: ${String(kind)})`);
    }
    assertNumber(speed, 'speed', { min: 0 });
    if (!this.#alive || this.#state === DinoState.JUMPING) {
      return false;
    }
    this.#state = DinoState.JUMPING;
    this.#jumpVelocity = this.#cfg.initialJumpVelocity - speed / 10;
    this.#reachedMinHeight = false;
    this.#speedDrop = false;
    this.#shortJump = kind === JumpKind.SMALL;
    return true;
  }

  // no chão agacha; no ar acelera a queda
  setDuck(active) {
    assertBoolean(active, 'active');
    if (!this.#alive) {
      return;
    }
    if (this.#state === DinoState.JUMPING) {
      this.#speedDrop = active;
    } else {
      this.#state = active ? DinoState.DUCKING : DinoState.RUNNING;
    }
  }

  update() {
    if (this.#alive && this.#state === DinoState.JUMPING) {
      this.#updateJump();
    }
  }

  kill() {
    this.#alive = false;
  }

  // `obstacle` precisa ter intersects(x, y, w, h) (Obstacle e Meteor têm)
  collidesWith(obstacle) {
    const box = this.#state === DinoState.DUCKING ? this.#cfg.duckHitbox : this.#cfg.hitbox;
    return obstacle.intersects(this.#cfg.startX + box.x, this.#y + box.y, box.w, box.h);
  }

  #updateJump() {
    const cfg = this.#cfg;
    this.#y += Math.round(this.#jumpVelocity * (this.#speedDrop ? cfg.speedDropCoefficient : 1));
    this.#jumpVelocity += cfg.gravity;

    if (this.#y < cfg.groundTop - cfg.minJumpHeight || this.#speedDrop) {
      this.#reachedMinHeight = true;
    }
    if (this.#reachedMinHeight && this.#shortJump) {
      this.#endJump();
    }
    if (this.#y < cfg.maxJumpHeight || this.#speedDrop) {
      this.#endJump();
    }
    if (this.#y > cfg.groundTop) {
      this.#land();
    }
  }

  // "solta a tecla": corta a subida
  #endJump() {
    if (this.#reachedMinHeight && this.#jumpVelocity < this.#cfg.dropVelocity) {
      this.#jumpVelocity = this.#cfg.dropVelocity;
    }
  }

  #land() {
    this.#y = this.#cfg.groundTop;
    this.#jumpVelocity = 0;
    this.#state = DinoState.RUNNING;
    this.#speedDrop = false;
    this.#reachedMinHeight = false;
    this.#shortJump = false;
  }
}
