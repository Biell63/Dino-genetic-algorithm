import { sigmoid } from '../../utils/math.js';
import { assertArray, assertDefined } from '../../utils/validation.js';

// Rede feed-forward totalmente conectada. Os pesos vêm de um genoma, não há treino por gradiente.
// Camadas escondidas usam tanh e a de saída usa sigmoide. Cada neurônio tem um peso de bias.
//
// Ordem dos pesos, camada a camada: para cada neurônio da camada seguinte,
// [peso da entrada 0, ..., peso da entrada n-1, bias].
export class NeuralNetwork {
  #sizes;
  #weights;
  #activations;

  static geneCountFor(layerSizes) {
    let total = 0;
    for (let l = 0; l < layerSizes.length - 1; l++) {
      total += (layerSizes[l] + 1) * layerSizes[l + 1];
    }
    return total;
  }

  constructor(layerSizes, weights) {
    assertArray(layerSizes, 'layerSizes');
    assertDefined(weights, 'weights');
    if (layerSizes.length < 2 || !layerSizes.every((n) => Number.isInteger(n) && n > 0)) {
      throw new RangeError('layerSizes precisa de ao menos 2 camadas, todas com tamanho inteiro positivo');
    }
    const expected = NeuralNetwork.geneCountFor(layerSizes);
    if (weights.length !== expected) {
      throw new RangeError(`quantidade de pesos errada: esperava ${expected}, recebeu ${weights.length}`);
    }
    this.#weights = Float64Array.from(weights);
    if (!this.#weights.every(Number.isFinite)) {
      throw new RangeError('os pesos precisam ser números finitos');
    }
    this.#sizes = Object.freeze([...layerSizes]);
    this.#activations = this.#sizes.map((n) => new Float64Array(n));
  }

  get layerSizes() {
    return this.#sizes;
  }

  // escreve o resultado em `outputs` para não alocar nada (roda milhões de vezes)
  predict(inputs, outputs) {
    const sizes = this.#sizes;
    const weights = this.#weights;
    const activations = this.#activations;
    const last = sizes.length - 1;
    if (inputs.length !== sizes[0] || outputs.length !== sizes[last]) {
      throw new RangeError('tamanho de entrada ou saída diferente do da rede');
    }
    const first = activations[0];
    for (let i = 0; i < first.length; i++) {
      first[i] = inputs[i];
    }

    let offset = 0;
    for (let l = 0; l < last; l++) {
      const inSize = sizes[l];
      const outSize = sizes[l + 1];
      const prev = activations[l];
      const next = activations[l + 1];
      const stride = inSize + 1;
      const isOutputLayer = l + 1 === last;

      for (let j = 0; j < outSize; j++) {
        const base = offset + j * stride;
        let sum = weights[base + inSize]; // bias
        for (let i = 0; i < inSize; i++) {
          sum += weights[base + i] * prev[i];
        }
        next[j] = isOutputLayer ? sigmoid(sum) : Math.tanh(sum);
      }
      offset += outSize * stride;
    }

    const result = activations[last];
    for (let k = 0; k < result.length; k++) {
      outputs[k] = result[k];
    }
  }

  // cópias, para quem desenha não conseguir mexer na rede
  snapshot() {
    const layers = [];
    let offset = 0;
    for (let l = 0; l < this.#sizes.length - 1; l++) {
      const inputSize = this.#sizes[l];
      const outputSize = this.#sizes[l + 1];
      const count = (inputSize + 1) * outputSize;
      layers.push({ inputSize, outputSize, weights: this.#weights.slice(offset, offset + count) });
      offset += count;
    }
    return {
      layerSizes: [...this.#sizes],
      activations: this.#activations.map((a) => Float64Array.from(a)),
      layers,
    };
  }
}
