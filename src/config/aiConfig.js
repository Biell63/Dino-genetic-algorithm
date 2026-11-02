import { deepFreeze } from '../utils/deepFreeze.js';

// Rede neural de cada dino.
export const NETWORK_CONFIG = deepFreeze({
  // entradas, na ordem de Sensor.readInto()
  inputLabels: [
    'Player Y',
    'Distance To Obstacle',
    'Obstacle Width',
    'Obstacle Height',
    'Bird Y',
    'Game Speed',
    'Meteor Threat',
    'Enemy Speed',
  ],
  hiddenLayers: [6], // tamanho de cada camada escondida
  // saídas, na ordem de OUTPUT (Agent.js)
  outputLabels: ['Big Jump', 'Small Jump', 'Duck'],
  actionThreshold: 0.5, // saída acima disso = ação ativada
  weightLimit: 4, // todo peso fica em [-4, 4]
  initialWeightRange: 1, // pesos da geração 1 sorteados em [-1, 1]
  // escalas que deixam as entradas por volta de 0 a 1
  sensor: {
    maxDistance: 250, // distâncias acima disso contam como "longe" (1.0)
    maxObstacleWidth: 75,
    maxObstacleHeight: 50,
    birdHeightScale: 100,
    enemySpeedScale: 4, // velocidade extra de um obstáculo que conta como 1.0
    meteorHorizonFrames: 40, // meteoro a mais de 40 passos do impacto conta como ameaça zero
  },
});

// Algoritmo genético.
export const GA_CONFIG = deepFreeze({
  populationSize: 150, // quantidade de dinos por geração
  eliteCount: 5, // melhores genomas copiados sem alteração
  tournamentSize: 4, // candidatos por torneio de seleção
  crossoverRate: 0.85, // chance de cruzar dois pais (senão clona um)
  mutationRate: 0.15, // chance de cada gene mutar
  minMutationStrength: 0.02, // cada filho sorteia sua força de mutação entre
  maxMutationStrength: 0.5, // o mínimo e o máximo (escala logarítmica): ajuste fino e grosso
  immigrantRate: 0.04, // fração de indivíduos totalmente novos por geração
  maxFramesPerGeneration: 15000, // teto de passos por geração (~4 min a 1x); ignorado no modo infinito
  historyLimit: 200, // gerações guardadas para o gráfico
});
