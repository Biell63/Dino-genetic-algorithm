import { clamp } from '../utils/math.js';

// Cores da interface de dia e de noite, como texto "r, g, b" (serve em rgb() e rgba()).
const DAY = Object.freeze({
  ink: [17, 17, 17], // textos e contornos principais
  hudInk: [83, 83, 83], // placar (cinza do Dino original)
  mutedInk: [85, 85, 85],
  axis: [153, 153, 153],
  nodeFill: [255, 255, 255],
  nodeStroke: [68, 68, 68],
  nodeActive: [30, 30, 30], // preenchimento de um neurônio ativo
  nodeActiveText: [255, 255, 255],
  positive: [31, 111, 209], // peso positivo
  negative: [215, 38, 61], // peso negativo
  meanLine: [154, 154, 154],
  bestLine: [215, 38, 61],
  panel: [6, 8, 28],
  panelAlpha: 0, // sem painel de fundo de dia
});

const NIGHT = Object.freeze({
  ink: [238, 238, 242],
  hudInk: [224, 224, 232],
  mutedInk: [200, 200, 212],
  axis: [150, 150, 172],
  nodeFill: [28, 30, 48],
  nodeStroke: [190, 190, 204],
  nodeActive: [240, 240, 244],
  nodeActiveText: [20, 20, 32],
  positive: [104, 168, 255],
  negative: [255, 108, 118],
  meanLine: [170, 170, 192],
  bestLine: [255, 112, 122],
  panel: [6, 8, 28],
  panelAlpha: 0.4, // painel escuro atrás da rede e do gráfico, para manter a leitura
});

const STEPS = 32; // níveis de escuridão guardados em cache
const cache = new Map();

// sobe de 0 a 1 entre `from` e `to`
const smoothstep = (from, to, x) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

const mix = (a, b, t) => Math.round(a + (b - a) * t);
const mixRgb = (a, b, t) => `${mix(a[0], b[0], t)}, ${mix(a[1], b[1], t)}, ${mix(a[2], b[2], t)}`;

// Paleta para uma escuridão de 0 a 1. É imutável e fica em cache, então pode ser chamada todo quadro.
export function createPalette(darkness) {
  const step = Math.round(clamp(darkness, 0, 1) * STEPS);
  let palette = cache.get(step);
  if (palette === undefined) {
    const darkness = step / STEPS;
    // o texto troca de cor numa faixa estreita (evita cinza sobre cinza); o painel aparece aos poucos
    const t = smoothstep(0.35, 0.65, darkness);
    palette = Object.freeze(
      Object.fromEntries([
        ...Object.keys(DAY)
          .filter((key) => key !== 'panelAlpha')
          .map((key) => [key, mixRgb(DAY[key], NIGHT[key], t)]),
        ['panelAlpha', DAY.panelAlpha + (NIGHT.panelAlpha - DAY.panelAlpha) * darkness],
      ]),
    );
    cache.set(step, palette);
  }
  return palette;
}

export const DAY_PALETTE = createPalette(0);
