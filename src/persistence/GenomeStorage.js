import { Genome } from '../ai/genetic/Genome.js';
import { assertInstance, assertInteger, assertNumber, assertString } from '../utils/validation.js';

const FORMAT_VERSION = 1;
const MAX_PAYLOAD_CHARS = 32768;

// Guarda o melhor genoma no localStorage. O que está lá não é confiável (outra aba, extensão ou o
// próprio usuário podem ter mexido), então tudo que é lido passa por validação e, se algo não
// bater, vira null em vez de levar pesos corrompidos para a rede.
export class GenomeStorage {
  #storage;
  #key;
  #geneCount;
  #weightLimit;

  // storage pode ser null (sem persistência); a chave deve incluir a topologia da rede
  constructor(storage, { key, geneCount, weightLimit }) {
    if (storage !== null && storage !== undefined) {
      for (const method of ['getItem', 'setItem', 'removeItem']) {
        if (typeof storage[method] !== 'function') {
          throw new TypeError(`storage precisa ter ${method}()`);
        }
      }
    }
    assertString(key, 'key');
    assertInteger(geneCount, 'geneCount', { min: 1 });
    assertNumber(weightLimit, 'weightLimit', { min: 0 });
    this.#storage = storage ?? null;
    this.#key = key;
    this.#geneCount = geneCount;
    this.#weightLimit = weightLimit;
  }

  // { genome, generation, score } ou null se não houver nada válido
  load() {
    let raw;
    try {
      raw = this.#storage?.getItem(this.#key) ?? null;
    } catch {
      return null; // armazenamento bloqueado
    }
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_PAYLOAD_CHARS) {
      return null;
    }
    try {
      return this.#validate(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  // false se não gravou (sem storage, genoma de outro tamanho, cota cheia)
  save(genome, { generation, score }) {
    assertInstance(genome, Genome, 'genome');
    assertNumber(generation, 'generation');
    assertNumber(score, 'score');
    if (!this.#storage || genome.length !== this.#geneCount) {
      return false;
    }
    try {
      this.#storage.setItem(
        this.#key,
        JSON.stringify({
          version: FORMAT_VERSION,
          genes: Array.from(genome.toArray()),
          generation: Math.max(1, Math.floor(generation)),
          score: Math.max(0, Math.floor(score)),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    try {
      this.#storage?.removeItem(this.#key);
    } catch {
      // sem acesso ao storage, não há o que apagar
    }
  }

  #validate(data) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return null;
    }
    const { version, genes, generation, score } = data;
    if (version !== FORMAT_VERSION || !Array.isArray(genes) || genes.length !== this.#geneCount) {
      return null;
    }
    const genesOk = genes.every((g) => typeof g === 'number' && Number.isFinite(g) && Math.abs(g) <= this.#weightLimit);
    if (!genesOk) {
      return null;
    }
    return {
      genome: new Genome(genes),
      generation: Number.isInteger(generation) && generation >= 1 ? generation : 1,
      score: Number.isInteger(score) && score >= 0 ? score : 0,
    };
  }
}
