import { Genome } from './Genome.js';
import { SeededRandom } from '../../utils/SeededRandom.js';
import { clamp } from '../../utils/math.js';
import {
  assertArray,
  assertInstance,
  assertInteger,
  assertNumber,
  assertObject,
  assertProbability,
} from '../../utils/validation.js';

// Passos de evolve(): elite passa intacta, pais saem de torneio, cruzamento uniforme, mutação gaussiana
// e alguns imigrantes aleatórios para manter a diversidade.
export class GeneticAlgorithm {
  #config;
  #rng;
  #weightLimit;
  #initialRange;

  constructor(config, rng, weightLimit, initialRange = weightLimit) {
    assertObject(config, 'config');
    assertInstance(rng, SeededRandom, 'rng');
    assertInteger(config.populationSize, 'populationSize', { min: 4, max: 5000 });
    assertInteger(config.eliteCount, 'eliteCount', { min: 1, max: config.populationSize });
    assertInteger(config.tournamentSize, 'tournamentSize', { min: 1 });
    assertProbability(config.crossoverRate, 'crossoverRate');
    assertProbability(config.mutationRate, 'mutationRate');
    assertProbability(config.immigrantRate, 'immigrantRate');
    assertNumber(config.minMutationStrength, 'minMutationStrength', { min: 1e-6 });
    assertNumber(config.maxMutationStrength, 'maxMutationStrength', { min: config.minMutationStrength });
    assertNumber(weightLimit, 'weightLimit', { min: 0 });
    assertNumber(initialRange, 'initialRange', { min: 0 });
    this.#config = config;
    this.#rng = rng;
    this.#weightLimit = weightLimit;
    this.#initialRange = Math.min(initialRange, weightLimit);
  }

  get populationSize() {
    return this.#config.populationSize;
  }

  // Sementes (ex.: o campeão salvo) entram intactas, ganham variações mutadas, e o resto é aleatório.
  createInitialPopulation(geneCount, seeds = []) {
    assertInteger(geneCount, 'geneCount', { min: 1 });
    assertArray(seeds, 'seeds');
    const size = this.#config.populationSize;
    const population = [];
    const validSeeds = seeds.filter((s) => s instanceof Genome && s.length === geneCount);

    for (const seed of validSeeds) {
      if (population.length < size) {
        population.push(seed.clone());
      }
    }
    if (validSeeds.length > 0) {
      const variants = Math.floor(size * 0.4);
      for (let i = 0; i < variants && population.length < size; i++) {
        population.push(this.#mutate(this.#rng.pick(validSeeds).toArray()));
      }
    }
    while (population.length < size) {
      population.push(Genome.random(geneCount, this.#rng, this.#initialRange));
    }
    return population;
  }

  // Recebe os genomas já com fitness. O campeão da geração fica na posição 0.
  evolve(population, hallOfFame = null) {
    assertArray(population, 'population');
    const size = this.#config.populationSize;
    if (population.length !== size) {
      throw new RangeError(`a população precisa ter exatamente ${size} genomas`);
    }
    population.forEach((genome, i) => assertInstance(genome, Genome, `population[${i}]`));
    if (hallOfFame !== null) {
      assertInstance(hallOfFame, Genome, 'hallOfFame');
    }

    const ranked = [...population].sort((a, b) => b.fitness - a.fitness);
    const next = this.#selectElites(ranked, hallOfFame);

    const childrenTarget = size - Math.round(size * this.#config.immigrantRate);
    while (next.length < childrenTarget) {
      next.push(this.#breed(this.#tournament(ranked), this.#tournament(ranked)));
    }
    while (next.length < size) {
      next.push(Genome.random(ranked[0].length, this.#rng, this.#initialRange));
    }
    return next;
  }

  // campeão da geração, recordista de todos os tempos e os próximos melhores, sem repetir
  #selectElites(ranked, hallOfFame) {
    const elites = [];
    const addUnique = (genome) => {
      if (elites.length < this.#config.eliteCount && !elites.some((e) => e.equals(genome))) {
        elites.push(genome.clone());
      }
    };
    addUnique(ranked[0]);
    if (hallOfFame) {
      addUnique(hallOfFame);
    }
    for (let i = 1; i < ranked.length && elites.length < this.#config.eliteCount; i++) {
      addUnique(ranked[i]);
    }
    return elites;
  }

  // `ranked` está do melhor para o pior, então o menor índice sorteado vence
  #tournament(ranked) {
    let best = this.#rng.int(0, ranked.length - 1);
    for (let i = 1; i < this.#config.tournamentSize; i++) {
      best = Math.min(best, this.#rng.int(0, ranked.length - 1));
    }
    return ranked[best];
  }

  #breed(parentA, parentB) {
    const genes = parentA.toArray();
    if (this.#rng.chance(this.#config.crossoverRate)) {
      for (let i = 0; i < genes.length; i++) {
        if (this.#rng.chance(0.5)) {
          genes[i] = parentB.geneAt(i);
        }
      }
    }
    return this.#mutate(genes);
  }

  // A força da mutação é sorteada por filho, em escala logarítmica: uns mudam pouco (ajuste fino)
  // e outros mudam muito (exploração). Foi o que fez a evolução ficar estável.
  #mutate(genes) {
    const { mutationRate, minMutationStrength, maxMutationStrength } = this.#config;
    const strength = Math.exp(this.#rng.range(Math.log(minMutationStrength), Math.log(maxMutationStrength)));
    for (let i = 0; i < genes.length; i++) {
      if (this.#rng.chance(mutationRate)) {
        genes[i] = clamp(genes[i] + this.#rng.gaussian() * strength, -this.#weightLimit, this.#weightLimit);
      }
    }
    return new Genome(genes);
  }
}
