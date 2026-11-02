import { DayNightCycle } from './DayNightCycle.js';
import { MeteorShower } from './MeteorShower.js';
import { ObstacleField } from './ObstacleField.js';
import { SeededRandom } from '../utils/SeededRandom.js';
import { assertBoolean, assertInstance, assertObject } from '../utils/validation.js';

// A pista é compartilhada por todos os dinos da geração, então todos enfrentam os mesmos perigos.
// Obstáculos e meteoros ficam escondidos aqui; quem está fora usa os métodos abaixo.
export class Track {
  #config;
  #field;
  #meteors;
  #dayNight;
  #speed;
  #frame = 0;
  #distance = 0;
  #dinoLeft;
  #dinoRight;
  #dangerNearDino = false;

  constructor(gameConfig, rng, { meteorsEnabled = false } = {}) {
    assertObject(gameConfig, 'gameConfig');
    assertInstance(rng, SeededRandom, 'rng');
    assertBoolean(meteorsEnabled, 'meteorsEnabled');
    this.#config = gameConfig;
    // sorteio separado: ligar ou desligar meteoros não muda a sequência de obstáculos
    this.#meteors = new MeteorShower({ gameConfig, rng: rng.fork(), enabled: meteorsEnabled });
    this.#dayNight = new DayNightCycle(gameConfig.dayNight);
    this.#field = new ObstacleField(gameConfig, rng);
    this.#speed = gameConfig.track.initialSpeed;
    const dino = gameConfig.dino;
    this.#dinoLeft = dino.startX;
    this.#dinoRight = dino.startX + Math.max(dino.width, dino.duckWidth);
  }

  get speed() {
    return this.#speed;
  }

  get frame() {
    return this.#frame;
  }

  // distância total; é a nota (fitness) do dino
  get distance() {
    return this.#distance;
  }

  get score() {
    return Math.floor(this.#distance * this.#config.track.distanceToScore);
  }

  // 0 = dia, 1 = noite
  get darkness() {
    return this.#dayNight.darknessAt(this.#distance * this.#config.track.distanceToScore);
  }

  // meteoro em queda ou null
  get meteor() {
    return this.#meteors.current;
  }

  // { x, frame } do último impacto, ou null
  get lastMeteorImpact() {
    return this.#meteors.lastImpact;
  }

  nextObstacle(minX) {
    return this.#field.nextAhead(minX);
  }

  forEachObstacle(callback) {
    this.#field.forEach(callback);
  }

  update() {
    const { track } = this.#config;
    this.#frame++;
    this.#speed = Math.min(track.maxSpeed, this.#speed + track.acceleration);
    this.#distance += this.#speed;
    this.#field.update(this.#speed, this.#frame, this.darkness >= 0.5);
    this.#meteors.update(this.#frame, this.#field);
    // só vale checar colisão quando algo está na faixa horizontal do dino (na maioria dos passos nada está)
    this.#dangerNearDino =
      this.#meteors.current !== null || this.#field.anyOverlapping(this.#dinoLeft, this.#dinoRight);
  }

  collides(dino) {
    if (!this.#dangerNearDino) {
      return false;
    }
    return this.#field.anyCollision(dino) || this.#meteors.collidesWith(dino);
  }
}
