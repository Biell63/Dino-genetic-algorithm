import { assertInteger, assertNumber, assertArray } from './validation.js';

// Gerador mulberry32. Mesma semente, mesma sequência, o que deixa as simulações reproduzíveis.
export class SeededRandom {
  #state;

  constructor(seed) {
    assertInteger(seed, 'seed', { min: 0, max: 0xffffffff });
    this.#state = seed >>> 0;
  }

  static entropySeed() {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      return cryptoApi.getRandomValues(new Uint32Array(1))[0];
    }
    return (Date.now() ^ (performance.now() * 1000)) >>> 0;
  }

  // [0, 1)
  next() {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let t = this.#state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // [min, max)
  range(min, max) {
    assertNumber(min, 'min');
    assertNumber(max, 'max');
    return min + this.next() * (max - min);
  }

  // inteiro entre min e max, os dois incluídos
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  // normal padrão (Box-Muller)
  gaussian() {
    const u1 = 1 - this.next(); // evita log(0)
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  pick(items) {
    assertArray(items, 'items');
    if (items.length === 0) {
      throw new RangeError('items não pode ser vazio');
    }
    return items[this.int(0, items.length - 1)];
  }

  // gerador independente derivado deste
  fork() {
    return new SeededRandom(Math.floor(this.next() * 0x100000000));
  }
}
