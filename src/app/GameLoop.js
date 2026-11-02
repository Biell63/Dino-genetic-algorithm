import { assertFunction, assertNumber } from '../utils/validation.js';

const STEP_MS = 1000 / 60; // a simulação anda em passos fixos de 1/60 s
const MAX_STEPS_PER_FRAME = 600; // evita travar a aba nas velocidades altas

// Laço de animação. A velocidade só muda quantos passos rodam por quadro desenhado.
export class GameLoop {
  #step;
  #draw;
  #budgetMs;
  #speed = 1;
  #paused = false;
  #accumulator = 0;
  #lastTime = 0;

  // budgetMs: tempo máximo simulando por quadro quando a velocidade é Infinity (MAX)
  constructor({ step, draw, budgetMs }) {
    assertFunction(step, 'step');
    assertFunction(draw, 'draw');
    assertNumber(budgetMs, 'budgetMs', { min: 1 });
    this.#step = step;
    this.#draw = draw;
    this.#budgetMs = budgetMs;
  }

  get speed() {
    return this.#speed;
  }

  // aceita Infinity (o mais rápido possível)
  setSpeed(speed) {
    if (typeof speed !== 'number') {
      throw new TypeError('speed deve ser um número');
    }
    if (!(speed > 0)) {
      throw new RangeError('speed deve ser maior que zero');
    }
    this.#speed = speed;
    this.#accumulator = 0;
  }

  // devolve o novo estado de pausa
  togglePause() {
    this.#paused = !this.#paused;
    return this.#paused;
  }

  start() {
    requestAnimationFrame((now) => {
      this.#lastTime = now;
      this.#frame(now);
    });
  }

  #frame = (now) => {
    const elapsed = Math.min(now - this.#lastTime, 100); // não pula tempo depois de trocar de aba
    this.#lastTime = now;
    if (!this.#paused) {
      this.#advance(elapsed);
    }
    this.#draw();
    requestAnimationFrame(this.#frame);
  };

  #advance(elapsedMs) {
    if (this.#speed === Infinity) {
      const deadline = performance.now() + this.#budgetMs;
      do {
        for (let i = 0; i < 10; i++) {
          this.#step();
        }
      } while (performance.now() < deadline);
      return;
    }
    this.#accumulator += (elapsedMs / STEP_MS) * this.#speed;
    const whole = Math.floor(this.#accumulator);
    this.#accumulator -= whole;
    for (let i = Math.min(whole, MAX_STEPS_PER_FRAME); i > 0; i--) {
      this.#step();
    }
  }
}
