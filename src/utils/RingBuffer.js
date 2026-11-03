import { assertInteger } from './validation.js';

// Fila circular que cresce quando enche. Entrar no fim e sair do começo custam O(1);
// com Array.shift() cada saída move todos os elementos.
export class RingBuffer {
  #items;
  #mask;
  #head = 0;
  #size = 0;

  constructor(capacity = 8) {
    assertInteger(capacity, 'capacity', { min: 1, max: 1 << 20 });
    const slots = 2 ** Math.ceil(Math.log2(capacity)); // potência de 2 permite usar máscara no lugar de %
    this.#items = new Array(slots);
    this.#mask = slots - 1;
  }

  get length() {
    return this.#size;
  }

  push(item) {
    if (this.#size === this.#items.length) {
      this.#grow();
    }
    this.#items[(this.#head + this.#size) & this.#mask] = item;
    this.#size++;
  }

  // remove e devolve o mais antigo (undefined se estiver vazia)
  shift() {
    if (this.#size === 0) {
      return undefined;
    }
    const item = this.#items[this.#head];
    this.#items[this.#head] = undefined; // não segura referência
    this.#head = (this.#head + 1) & this.#mask;
    this.#size--;
    return item;
  }

  // i = 0 é o mais antigo
  at(index) {
    return index >= 0 && index < this.#size ? this.#items[(this.#head + index) & this.#mask] : undefined;
  }

  first() {
    return this.at(0);
  }

  last() {
    return this.at(this.#size - 1);
  }

  forEach(callback) {
    for (let i = 0; i < this.#size; i++) {
      callback(this.#items[(this.#head + i) & this.#mask], i);
    }
  }

  toArray() {
    const copy = new Array(this.#size);
    for (let i = 0; i < this.#size; i++) {
      copy[i] = this.#items[(this.#head + i) & this.#mask];
    }
    return copy;
  }

  #grow() {
    const bigger = new Array(this.#items.length * 2);
    for (let i = 0; i < this.#size; i++) {
      bigger[i] = this.#items[(this.#head + i) & this.#mask];
    }
    this.#items = bigger;
    this.#mask = bigger.length - 1;
    this.#head = 0;
  }
}
