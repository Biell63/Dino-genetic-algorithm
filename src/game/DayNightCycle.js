import { clamp } from '../utils/math.js';
import { assertNumber, assertObject } from '../utils/validation.js';

// Dia e noite em função da pontuação: dayLength de dia, nightLength de noite, e repete.
// A noite escurece nos primeiros `fade` pontos e clareia nos últimos `fade`.
export class DayNightCycle {
  #dayLength;
  #nightLength;
  #fade;

  constructor(config) {
    assertObject(config, 'config');
    assertNumber(config.dayLength, 'dayNight.dayLength', { min: 1 });
    assertNumber(config.fade, 'dayNight.fade', { min: 1 });
    assertNumber(config.nightLength, 'dayNight.nightLength', { min: 2 * config.fade });
    this.#dayLength = config.dayLength;
    this.#nightLength = config.nightLength;
    this.#fade = config.fade;
  }

  // 0 = dia, 1 = noite
  darknessAt(score) {
    const phase = score % (this.#dayLength + this.#nightLength);
    if (phase < this.#dayLength) {
      return 0;
    }
    const intoNight = phase - this.#dayLength;
    return clamp(Math.min(intoNight, this.#nightLength - intoNight) / this.#fade, 0, 1);
  }
}
