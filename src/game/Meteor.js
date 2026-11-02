import { assertNumber, assertObject } from '../utils/validation.js';

// Meteoro em queda diagonal. A caixa de colisão cobre a rocha e a aura, sem a cauda de fogo.
export class Meteor {
  #config;
  #x;
  #y;
  #impactY;

  // impactY: altura do chão; o impacto acontece quando a base da caixa chega nela
  constructor({ config, x, y, impactY }) {
    assertObject(config, 'config');
    assertNumber(x, 'x');
    assertNumber(y, 'y');
    assertNumber(impactY, 'impactY');
    this.#config = config;
    this.#x = x;
    this.#y = y;
    this.#impactY = impactY;
  }

  get x() {
    return this.#x;
  }

  get y() {
    return this.#y;
  }

  get width() {
    return this.#config.width;
  }

  get height() {
    return this.#config.height;
  }

  get centerX() {
    const box = this.#config.hitbox;
    return this.#x + box.x + box.w / 2;
  }

  get hasImpacted() {
    return this.#hitboxBottom() >= this.#impactY;
  }

  get framesToImpact() {
    return Math.max(0, Math.ceil((this.#impactY - this.#hitboxBottom()) / this.#config.speedY));
  }

  // onde ele toca o chão se continuar na mesma trajetória
  get impactX() {
    const remaining = Math.max(0, (this.#impactY - this.#hitboxBottom()) / this.#config.speedY);
    return this.centerX + this.#config.speedX * remaining;
  }

  update() {
    this.#x += this.#config.speedX;
    this.#y += this.#config.speedY;
  }

  intersects(bx, by, bw, bh) {
    const box = this.#config.hitbox;
    const mx = this.#x + box.x;
    const my = this.#y + box.y;
    return bx < mx + box.w && bx + bw > mx && by < my + box.h && by + bh > my;
  }

  #hitboxBottom() {
    const box = this.#config.hitbox;
    return this.#y + box.y + box.h;
  }
}
