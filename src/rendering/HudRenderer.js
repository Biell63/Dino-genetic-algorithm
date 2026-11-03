import { DAY_PALETTE } from './palette.js';
import { assertObject } from '../utils/validation.js';

// Placar no canto superior direito: pontos, geração, vivos e recorde.
export class HudRenderer {
  #right;
  #top;

  constructor(hudConfig) {
    assertObject(hudConfig, 'hudConfig');
    this.#right = hudConfig.right;
    this.#top = hudConfig.y;
  }

  draw(ctx, { score, generation, alive, best }, palette = DAY_PALETTE) {
    const labelRight = this.#right - 150;
    ctx.save();
    ctx.fillStyle = `rgb(${palette.hudInk})`;
    ctx.font = 'bold 30px "Courier New", Courier, monospace';
    ctx.textBaseline = 'middle';
    this.#row(ctx, labelRight, 0, 'Score:', String(score).padStart(5, '0'));
    this.#row(ctx, labelRight, 1, 'Gen:', String(generation));
    this.#row(ctx, labelRight, 2, 'Alive:', String(alive));
    this.#row(ctx, labelRight, 3, 'Best:', String(best).padStart(5, '0'));
    ctx.restore();
  }

  #row(ctx, labelRight, index, label, value) {
    const y = this.#top + index * 36;
    ctx.textAlign = 'right';
    ctx.fillText(label, labelRight, y);
    ctx.textAlign = 'left';
    ctx.fillText(value, labelRight + 16, y);
  }
}
