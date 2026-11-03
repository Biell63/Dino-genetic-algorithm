import { assertFunction, assertObject, assertString } from '../utils/validation.js';

function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Uma imagem de sprites (ou qualquer coisa que o drawImage aceite).
export class SpriteSheet {
  #image;

  constructor(image) {
    assertObject(image, 'image');
    this.#image = image;
  }

  static load(url) {
    assertString(url, 'url');
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(new SpriteSheet(image));
      image.onerror = () => reject(new Error(`não foi possível carregar a imagem ${url}`));
      image.src = url;
    });
  }

  // cópia com as cores invertidas (modo noturno); a transparência fica como está
  createInverted(createCanvas = createOffscreenCanvas) {
    assertFunction(createCanvas, 'createCanvas');
    const { width, height } = this.#image;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.#image, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 255 - pixels[i];
      pixels[i + 1] = 255 - pixels[i + 1];
      pixels[i + 2] = 255 - pixels[i + 2];
    }
    ctx.putImageData(imageData, 0, 0);
    return new SpriteSheet(canvas);
  }

  draw(ctx, sx, sy, sw, sh, dx, dy) {
    ctx.drawImage(this.#image, sx, sy, sw, sh, Math.round(dx), Math.round(dy), sw, sh);
  }

  drawScaled(ctx, sx, sy, sw, sh, dx, dy, dw, dh) {
    ctx.drawImage(this.#image, sx, sy, sw, sh, Math.floor(dx), Math.round(dy), dw, Math.round(dh));
  }
}
