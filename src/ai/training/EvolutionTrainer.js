import { Agent } from '../agent/Agent.js';
import { Sensor } from '../agent/Sensor.js';
import { GeneticAlgorithm } from '../genetic/GeneticAlgorithm.js';
import { createLayerSizes } from '../neural/layerSizes.js';
import { NeuralNetwork } from '../neural/NeuralNetwork.js';
import { GameSession } from '../../game/GameSession.js';
import { GAME_CONFIG } from '../../config/gameConfig.js';
import { GA_CONFIG, NETWORK_CONFIG } from '../../config/aiConfig.js';
import { RingBuffer } from '../../utils/RingBuffer.js';
import { SeededRandom } from '../../utils/SeededRandom.js';
import { assertArray, assertBoolean, assertInteger, assertObject } from '../../utils/validation.js';

// Ciclo evolutivo: população, uma geração de jogo, avaliação, evolução, nova população.
// Não conhece tela nem DOM, então roda igual no navegador e no Node.
export class EvolutionTrainer {
  #gameConfig;
  #gaConfig;
  #networkConfig;
  #layerSizes;
  #rng;
  #ga;
  #sensor;
  #listener;
  #population = [];
  #session = null;
  #generation = 1;
  #history;
  #historyView = null; // cópia imutável do histórico, refeita só quando ele muda
  #bestEver = null;
  #hasSeed = false;
  #infiniteMode;
  #meteorsEnabled;

  // infiniteMode: a geração só acaba quando todos morrem, sem o teto maxFramesPerGeneration.
  // Fica desligado por padrão para simulações e testes sempre terminarem.
  constructor(options = {}) {
    assertObject(options, 'options');
    const {
      gameConfig = GAME_CONFIG,
      gaConfig = GA_CONFIG,
      networkConfig = NETWORK_CONFIG,
      seed = SeededRandom.entropySeed(),
      seedGenomes = [],
      onGenerationEnd = null,
      infiniteMode = false,
      meteorsEnabled = false,
    } = options;
    assertObject(gameConfig, 'gameConfig');
    assertObject(gaConfig, 'gaConfig');
    assertObject(networkConfig, 'networkConfig');
    assertArray(seedGenomes, 'seedGenomes');
    assertBoolean(infiniteMode, 'infiniteMode');
    assertBoolean(meteorsEnabled, 'meteorsEnabled');
    if (onGenerationEnd !== null && typeof onGenerationEnd !== 'function') {
      throw new TypeError('onGenerationEnd deve ser uma função ou null');
    }
    assertInteger(gaConfig.historyLimit, 'historyLimit', { min: 1 });

    this.#gameConfig = gameConfig;
    this.#gaConfig = gaConfig;
    this.#networkConfig = networkConfig;
    this.#sensor = new Sensor(gameConfig, networkConfig);
    this.#layerSizes = Object.freeze(createLayerSizes(networkConfig));
    this.#rng = new SeededRandom(seed);
    this.#ga = new GeneticAlgorithm(
      gaConfig,
      this.#rng.fork(),
      networkConfig.weightLimit,
      networkConfig.initialWeightRange,
    );
    this.#listener = onGenerationEnd;
    this.#infiniteMode = infiniteMode;
    this.#meteorsEnabled = meteorsEnabled;
    this.#history = new RingBuffer(gaConfig.historyLimit);

    this.#population = this.#ga.createInitialPopulation(this.geneCount, seedGenomes);
    this.#hasSeed = seedGenomes.some((genome) => genome.length === this.geneCount);
    this.#startGeneration();
  }

  get layerSizes() {
    return this.#layerSizes;
  }

  get geneCount() {
    return NeuralNetwork.geneCountFor(this.#layerSizes);
  }

  get generation() {
    return this.#generation;
  }

  get session() {
    return this.#session;
  }

  get score() {
    return this.#session.track.score;
  }

  // o campeão da geração anterior, que o elitismo mantém intacto na posição 0
  get championAgent() {
    return this.#session.agents[0];
  }

  // cópia do recordista (com nota) ou null
  get bestEver() {
    return this.#bestEver ? this.#bestEver.clone({ keepFitness: true }) : null;
  }

  // pontuação do recordista, sem copiar o genoma (a tela lê isso todo quadro)
  get bestScore() {
    return this.#bestEver ? this.#toScore(this.#bestEver.fitness) : 0;
  }

  get history() {
    this.#historyView ??= Object.freeze(this.#history.toArray());
    return this.#historyView;
  }

  // true quando o agente 0 já é um cérebro treinado (geração anterior ou campeão salvo)
  get hasPreviousGeneration() {
    return this.#generation > 1 || this.#bestEver !== null || this.#hasSeed;
  }

  // devolve true no passo em que uma geração termina
  step() {
    this.#session.step();
    const reachedLimit = !this.#infiniteMode && this.#session.frame >= this.#gaConfig.maxFramesPerGeneration;
    if (this.#session.isOver || reachedLimit) {
      this.#finishGeneration();
      return true;
    }
    return false;
  }

  // joga fora todo o progresso e recomeça com população aleatória
  reset() {
    this.#generation = 1;
    this.#history = new RingBuffer(this.#gaConfig.historyLimit);
    this.#historyView = null;
    this.#bestEver = null;
    this.#hasSeed = false;
    this.#population = this.#ga.createInitialPopulation(this.geneCount, []);
    this.#startGeneration();
  }

  #toScore(fitness) {
    return Math.floor(fitness * this.#gameConfig.track.distanceToScore);
  }

  #startGeneration() {
    const agents = this.#population.map(
      (genome) =>
        new Agent({
          genome,
          layerSizes: this.#layerSizes,
          dinoConfig: this.#gameConfig.dino,
          actionThreshold: this.#networkConfig.actionThreshold,
          inputCount: this.#sensor.inputCount,
        }),
    );
    this.#session = new GameSession({
      gameConfig: this.#gameConfig,
      rng: this.#rng.fork(), // pista nova a cada geração
      agents,
      sensor: this.#sensor,
      meteorsEnabled: this.#meteorsEnabled,
    });
  }

  #finishGeneration() {
    this.#session.finalize();
    const ranked = [...this.#population].sort((a, b) => b.fitness - a.fitness);
    const champion = ranked[0];
    const meanFitness = ranked.reduce((sum, genome) => sum + genome.fitness, 0) / ranked.length;

    if (this.#bestEver === null || champion.fitness > this.#bestEver.fitness) {
      this.#bestEver = champion.clone({ keepFitness: true });
    }

    const stats = Object.freeze({
      generation: this.#generation,
      bestScore: this.#toScore(champion.fitness),
      meanScore: this.#toScore(meanFitness),
      frames: this.#session.frame,
    });
    this.#history.push(stats);
    if (this.#history.length > this.#gaConfig.historyLimit) {
      this.#history.shift();
    }
    this.#historyView = null;

    if (this.#listener) {
      this.#listener({ stats, champion: champion.clone({ keepFitness: true }), bestEver: this.bestEver });
    }

    this.#population = this.#ga.evolve(this.#population, this.#bestEver);
    this.#generation++;
    this.#startGeneration();
  }
}
