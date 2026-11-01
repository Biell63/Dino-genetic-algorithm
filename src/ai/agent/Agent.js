import { Dino, JumpKind } from '../../game/Dino.js';
import { Genome } from '../genetic/Genome.js';
import { NeuralNetwork } from '../neural/NeuralNetwork.js';
import { assertArray, assertInstance, assertInteger, assertNumber, assertObject } from '../../utils/validation.js';

// posição de cada ação no vetor de saída da rede
export const OUTPUT = Object.freeze({ BIG_JUMP: 0, SMALL_JUMP: 1, DUCK: 2 });

// Um jogador: corpo (Dino), cérebro (rede neural) e DNA (Genome).
export class Agent {
  #genome;
  #network;
  #dino;
  #inputs;
  #outputs;
  #threshold;

  constructor({ genome, layerSizes, dinoConfig, actionThreshold, inputCount }) {
    assertInstance(genome, Genome, 'genome');
    assertArray(layerSizes, 'layerSizes');
    assertObject(dinoConfig, 'dinoConfig');
    assertNumber(actionThreshold, 'actionThreshold', { min: 0, max: 1 });
    assertInteger(inputCount, 'inputCount', { min: 1 });
    this.#genome = genome;
    this.#network = new NeuralNetwork(layerSizes, genome.toArray());
    this.#dino = new Dino(dinoConfig);
    this.#inputs = new Float64Array(inputCount);
    this.#outputs = new Float64Array(layerSizes[layerSizes.length - 1]);
    this.#threshold = actionThreshold;
  }

  get genome() {
    return this.#genome;
  }

  get dino() {
    return this.#dino;
  }

  get isAlive() {
    return this.#dino.isAlive;
  }

  // o sensor já precisa ter observado a pista neste passo
  think(sensor, speed) {
    sensor.readInto(this.#dino, this.#inputs);
    this.#network.predict(this.#inputs, this.#outputs);

    const big = this.#outputs[OUTPUT.BIG_JUMP];
    const small = this.#outputs[OUTPUT.SMALL_JUMP];
    if (!this.#dino.isAirborne && (big > this.#threshold || small > this.#threshold)) {
      this.#dino.jump(big >= small ? JumpKind.BIG : JumpKind.SMALL, speed);
    } else {
      this.#dino.setDuck(this.#outputs[OUTPUT.DUCK] > this.#threshold);
    }
  }

  // a distância percorrida vira a nota do genoma
  die(distance) {
    this.#dino.kill();
    this.#genome.fitness = distance;
  }

  // pesos e ativações atuais, só para desenhar
  brainSnapshot() {
    return this.#network.snapshot();
  }
}
