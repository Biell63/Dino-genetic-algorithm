import { GameLoop } from './GameLoop.js';
import { EvolutionTrainer } from '../ai/training/EvolutionTrainer.js';
import { createLayerSizes } from '../ai/neural/layerSizes.js';
import { NeuralNetwork } from '../ai/neural/NeuralNetwork.js';
import { NETWORK_CONFIG } from '../config/aiConfig.js';
import { GAME_CONFIG } from '../config/gameConfig.js';
import { UI_CONFIG } from '../config/uiConfig.js';
import { GenomeStorage } from '../persistence/GenomeStorage.js';
import { FitnessChart } from '../rendering/FitnessChart.js';
import { GameRenderer } from '../rendering/GameRenderer.js';
import { HudRenderer } from '../rendering/HudRenderer.js';
import { NetworkVisualizer } from '../rendering/NetworkVisualizer.js';
import { createPalette } from '../rendering/palette.js';
import { Scenery } from '../rendering/Scenery.js';
import { SpriteSheet } from '../rendering/SpriteSheet.js';
import { ControlPanel } from '../ui/ControlPanel.js';

const SPRITE_URL = 'assets/sprites/dino-sprite.png';
const METEOR_SPRITE_URL = 'assets/sprites/meteor-sprite.png';
const ENEMY_SPRITE_URL = 'assets/sprites/night-enemies.png';
const BACKDROP_URL = 'assets/scenery/ruined-city-backdrop.png';
const ROAD_URL = 'assets/scenery/ruined-city-road.png';

// Liga as peças: simulação, desenho, controles e salvamento. Só este módulo conhece o DOM.
export class Application {
  #ctx;
  #status;
  #trainer;
  #storage;
  #renderer;
  #network = new NetworkVisualizer(NETWORK_CONFIG);
  #hud = new HudRenderer(UI_CONFIG.hud);
  #chart = new FitnessChart();
  #controls;
  #loop;
  #savedFitness = 0;

  constructor({ ctx, status, assets, controlsRoot }) {
    this.#ctx = ctx;
    this.#status = status;

    this.#renderer = new GameRenderer({
      ctx,
      sprites: assets.sprites,
      nightSprites: assets.sprites.createInverted(),
      enemySprites: assets.enemySprites,
      meteorSprite: assets.meteorSprite,
      scenery: new Scenery({
        backdrop: assets.backdrop,
        road: assets.road,
        config: UI_CONFIG.scenery,
        worldScale: UI_CONFIG.worldScale,
      }),
      gameConfig: GAME_CONFIG,
      uiConfig: UI_CONFIG,
    });

    const layerSizes = createLayerSizes(NETWORK_CONFIG);
    this.#storage = new GenomeStorage(Application.#safeLocalStorage(), {
      key: `dino-ga:v1:${layerSizes.join('x')}`,
      geneCount: NeuralNetwork.geneCountFor(layerSizes),
      weightLimit: NETWORK_CONFIG.weightLimit,
    });

    // o melhor dino da visita anterior entra como semente da população
    const saved = this.#storage.load();
    this.#trainer = new EvolutionTrainer({
      seedGenomes: saved ? [saved.genome] : [],
      onGenerationEnd: (result) => this.#onGenerationEnd(result),
      infiniteMode: true, // o dino joga até morrer, sem limite de tempo
      meteorsEnabled: true,
    });
    if (saved) {
      this.#status.textContent =
        `Cérebro treinado recuperado do navegador (recorde anterior: ${saved.score} pontos). ` +
        'Ele entra na população inicial e continua evoluindo.';
    }

    this.#loop = new GameLoop({
      step: () => this.#trainer.step(),
      draw: () => this.#draw(),
      budgetMs: UI_CONFIG.maxStepsBudgetMs,
    });
    this.#controls = new ControlPanel(controlsRoot, UI_CONFIG.speeds, {
      onSpeed: (speed) => this.#setSpeed(speed),
      onPause: () => this.#togglePause(),
      onReset: () => this.#reset(),
    });
    this.#controls.setActiveSpeed(this.#loop.speed);

    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        this.#togglePause();
      }
    });
  }

  static async start() {
    const canvas = document.getElementById('game');
    const status = document.getElementById('status');
    const controlsRoot = document.getElementById('controls');
    if (!(canvas instanceof HTMLCanvasElement) || !status || !controlsRoot) {
      throw new Error('faltam elementos no HTML (game, status ou controls)');
    }
    canvas.width = UI_CONFIG.canvas.width;
    canvas.height = UI_CONFIG.canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('este navegador não suporta canvas 2D');
    }

    const [sprites, meteorSprite, enemySprites, backdrop, road] = await Promise.all([
      SpriteSheet.load(SPRITE_URL),
      SpriteSheet.load(METEOR_SPRITE_URL),
      SpriteSheet.load(ENEMY_SPRITE_URL),
      SpriteSheet.load(BACKDROP_URL),
      SpriteSheet.load(ROAD_URL),
    ]);
    const app = new Application({
      ctx,
      status,
      assets: { sprites, meteorSprite, enemySprites, backdrop, road },
      controlsRoot,
    });
    app.#loop.start();
  }

  // localStorage pode lançar exceção (modo privado, cookies bloqueados)
  static #safeLocalStorage() {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  #draw() {
    const trainer = this.#trainer;
    const session = trainer.session;
    const champion = trainer.championAgent;
    const palette = createPalette(session.track.darkness);

    this.#renderer.render(session, champion);
    const baseTitle = trainer.hasPreviousGeneration ? 'Best Of Previous Generation' : 'Generation 1 (random brains)';
    this.#network.draw(
      this.#ctx,
      champion.brainSnapshot(),
      UI_CONFIG.network,
      champion.isAlive ? baseTitle : `${baseTitle} (eliminado)`, // a rede fica congelada no último instante dele
      palette,
    );
    this.#chart.draw(this.#ctx, trainer.history, UI_CONFIG.chart, palette);
    this.#hud.draw(
      this.#ctx,
      { score: trainer.score, generation: trainer.generation, alive: session.aliveCount, best: trainer.bestScore },
      palette,
    );
  }

  // salva o recordista sempre que ele melhora
  #onGenerationEnd({ stats, bestEver }) {
    if (bestEver && bestEver.fitness > this.#savedFitness) {
      this.#savedFitness = bestEver.fitness;
      this.#storage.save(bestEver, {
        generation: stats.generation,
        score: Math.floor(bestEver.fitness * GAME_CONFIG.track.distanceToScore),
      });
    }
  }

  #setSpeed(speed) {
    this.#loop.setSpeed(speed);
    this.#controls.setActiveSpeed(speed);
  }

  #togglePause() {
    this.#controls.setPaused(this.#loop.togglePause());
  }

  #reset() {
    this.#storage.clear();
    this.#savedFitness = 0;
    this.#trainer.reset();
    this.#status.textContent = 'Evolução reiniciada com uma população aleatória.';
  }
}
