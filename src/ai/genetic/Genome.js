import { SeededRandom } from '../../utils/SeededRandom.js';
import { assertInstance, assertInteger, assertNumber } from '../../utils/validation.js';

// O DNA de um dino: os pesos da rede mais a nota (fitness) da última geração em que jogou.
// O vetor de genes nunca sai da classe; quem lê recebe valor ou cópia.
export class Genome {
  #genes;
  #fitness = 0;

  constructor(genes) {
    if (!Array.isArray(genes) && !ArrayBuffer.isView(genes)) {
      throw new TypeError('genes deve ser um array ou um vetor tipado');
    }
    if (genes.length === 0) {
      throw new RangeError('um genoma precisa de pelo menos um gene');
    }
    this.#genes = Float64Array.from(genes);
    const bad = this.#genes.findIndex((gene) => !Number.isFinite(gene));
    if (bad !== -1) {
      throw new RangeError(`o gene ${bad} não é um número finito`);
    }
  }

  // genes sorteados entre -limit e limit
  static random(length, rng, limit) {
    assertInteger(length, 'length', { min: 1 });
    assertInstance(rng, SeededRandom, 'rng');
    assertNumber(limit, 'limit', { min: 0 });
    const genes = new Float64Array(length);
    for (let i = 0; i < length; i++) {
      genes[i] = rng.range(-limit, limit);
    }
    return new Genome(genes);
  }

  get length() {
    return this.#genes.length;
  }

  get fitness() {
    return this.#fitness;
  }

  set fitness(value) {
    assertNumber(value, 'fitness', { min: 0 });
    this.#fitness = value;
  }

  geneAt(index) {
    return this.#genes[index];
  }

  toArray() {
    return Float64Array.from(this.#genes);
  }

  // a nota volta a 0, a menos que keepFitness seja true
  clone({ keepFitness = false } = {}) {
    const copy = new Genome(this.#genes);
    if (keepFitness) {
      copy.fitness = this.#fitness;
    }
    return copy;
  }

  equals(other) {
    if (!(other instanceof Genome) || other.length !== this.length) {
      return false;
    }
    for (let i = 0; i < this.#genes.length; i++) {
      if (this.#genes[i] !== other.geneAt(i)) {
        return false;
      }
    }
    return true;
  }
}
