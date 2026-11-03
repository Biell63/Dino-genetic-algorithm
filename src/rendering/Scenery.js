import { SpriteSheet } from './SpriteSheet.js';
import { assertInstance, assertNumber, assertObject } from '../utils/validation.js';

const FADE_STRIPS = 8; // faixas que escondem a emenda entre o céu liso e a imagem
const FADE_STRIP_HEIGHT = 2;

// Cenário noturno em duas camadas que repetem na horizontal. O fundo (céu, cidade, dunas) rola
// devagar, em paralaxe; a estrada rola junto com o chão. Fica encostado na base do canvas e o
// céu liso preenche o que sobra em cima.
export class Scenery {
  #backdrop;
  #road;
  #config;
  #worldScale;
  #skyStyle;
  #fadeStyles;
  #tintStyle;

  constructor({ backdrop, road, config, worldScale }) {
    assertInstance(backdrop, SpriteSheet, 'backdrop');
    assertInstance(road, SpriteSheet, 'road');
    assertObject(config, 'config');
    assertNumber(worldScale, 'worldScale', { min: 0 });
    this.#backdrop = backdrop;
    this.#road = road;
    this.#config = config;
    this.#worldScale = worldScale;

    // as cores são montadas uma vez, não a cada quadro
    const [r, g, b] = config.skyColor;
    this.#skyStyle = `rgb(${r}, ${g}, ${b})`;
    this.#fadeStyles = Array.from(
      { length: FADE_STRIPS },
      (_, i) => `rgba(${r}, ${g}, ${b}, ${1 - (i + 1) / (FADE_STRIPS + 1)})`,
    );
    const [tr, tg, tb] = config.nightTint;
    this.#tintStyle = `rgba(${tr}, ${tg}, ${tb}, ${config.nightTintAlpha})`;
  }

  // darkness 0 não desenha nada
  draw(ctx, distance, darkness) {
    if (darkness <= 0) {
      return;
    }
    const cfg = this.#config;
    const { width, height } = ctx.canvas;
    const top = height - cfg.sceneHeight * cfg.scale;

    ctx.imageSmoothingEnabled = true; // a arte é suave, então ampliar com suavização fica melhor
    ctx.globalAlpha = darkness;

    ctx.fillStyle = this.#skyStyle;
    ctx.fillRect(0, 0, width, Math.ceil(top) + 1);

    this.#drawLayer(ctx, this.#backdrop, cfg.backdropHeight, top, distance * cfg.backdropScroll * this.#worldScale);
    this.#drawLayer(ctx, this.#road, cfg.roadHeight, top + cfg.roadStartRow * cfg.scale, distance * this.#worldScale);

    for (let i = 0; i < FADE_STRIPS; i++) {
      ctx.fillStyle = this.#fadeStyles[i];
      ctx.fillRect(0, Math.round(top) + i * FADE_STRIP_HEIGHT, width, FADE_STRIP_HEIGHT);
    }

    ctx.fillStyle = this.#tintStyle;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  #drawLayer(ctx, sheet, sourceHeight, y, scrollPx) {
    const cfg = this.#config;
    const tileWidth = Math.round(cfg.tileWidth * cfg.scale); // inteiro, para as cópias encaixarem sem fresta
    const offset = Math.floor(scrollPx % tileWidth);
    for (let x = -offset; x < ctx.canvas.width; x += tileWidth) {
      sheet.drawScaled(ctx, 0, 0, cfg.tileWidth, sourceHeight, x, y, tileWidth, sourceHeight * cfg.scale);
    }
  }
}
