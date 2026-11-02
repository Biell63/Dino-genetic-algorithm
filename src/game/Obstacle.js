import { assertInteger, assertNumber, assertObject } from '../utils/validation.js';

// Cacto, pássaro ou inimigo noturno. Fora o update(), só tem leitura.
export class Obstacle {
  #type;
  #x;
  #y;
  #size;
  #speedOffset;
  #gap;

  // size = quantos iguais andam juntos; gap = espaço que o próximo obstáculo precisa respeitar
  constructor({ type, x, y, size, speedOffset, gap }) {
    assertObject(type, 'type');
    assertNumber(x, 'x');
    assertNumber(y, 'y');
    assertInteger(size, 'size', { min: 1, max: 10 });
    assertNumber(speedOffset, 'speedOffset');
    assertNumber(gap, 'gap', { min: 0 });
    this.#type = type;
    this.#x = x;
    this.#y = y;
    this.#size = size;
    this.#speedOffset = speedOffset;
    this.#gap = gap;
  }

  get kind() {
    return this.#type.id;
  }

  get isFlying() {
    return this.#type.flying;
  }

  get x() {
    return this.#x;
  }

  get y() {
    return this.#y;
  }

  get size() {
    return this.#size;
  }

  get width() {
    return this.#type.width * this.#size;
  }

  get height() {
    return this.#type.height;
  }

  get gap() {
    return this.#gap;
  }

  // velocidade extra além da pista (os inimigos andam em direção ao dino)
  get speedOffset() {
    return this.#speedOffset;
  }

  get right() {
    return this.#x + this.width;
  }

  get isOffScreen() {
    return this.right < 0;
  }

  update(trackSpeed) {
    this.#x -= trackSpeed + this.#speedOffset;
  }

  // a caixa de colisão é o sprite menos a margem `inset`
  intersects(bx, by, bw, bh) {
    const inset = this.#type.inset;
    const ox = this.#x + inset.x;
    const oy = this.#y + inset.y;
    const ow = this.width - 2 * inset.x;
    const oh = this.#type.height - 2 * inset.y;
    return bx < ox + ow && bx + bw > ox && by < oy + oh && by + bh > oy;
  }
}
