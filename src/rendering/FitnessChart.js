import { DAY_PALETTE } from './palette.js';

const VISIBLE_GENERATIONS = 60;
const PADDING = { left: 34, right: 8, top: 22, bottom: 8 };

// Gráfico das últimas gerações: melhor pontuação (vermelho) e média (cinza).
export class FitnessChart {
  draw(ctx, history, area, palette = DAY_PALETTE) {
    const count = Math.min(history.length, VISIBLE_GENERATIONS);
    const start = history.length - count;
    const plot = {
      x: area.x + PADDING.left,
      y: area.y + PADDING.top,
      w: area.w - PADDING.left - PADDING.right,
      h: area.h - PADDING.top - PADDING.bottom,
    };

    ctx.save();
    if (palette.panelAlpha > 0) {
      ctx.fillStyle = `rgba(${palette.panel}, ${palette.panelAlpha})`;
      ctx.fillRect(area.x - 8, area.y - 6, area.w + 16, area.h + 10);
    }
    ctx.fillStyle = `rgb(${palette.ink})`;
    ctx.font = 'bold 12px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Evolução por geração', area.x, area.y + 8);

    ctx.strokeStyle = `rgb(${palette.axis})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plot.x, plot.y);
    ctx.lineTo(plot.x, plot.y + plot.h);
    ctx.lineTo(plot.x + plot.w, plot.y + plot.h);
    ctx.stroke();

    if (count >= 2) {
      let maxScore = 10;
      for (let i = start; i < history.length; i++) {
        maxScore = Math.max(maxScore, history[i].bestScore);
      }
      this.#line(ctx, history, start, plot, maxScore, 'meanScore', `rgb(${palette.meanLine})`);
      this.#line(ctx, history, start, plot, maxScore, 'bestScore', `rgb(${palette.bestLine})`);

      ctx.fillStyle = `rgb(${palette.mutedInk})`;
      ctx.font = '10px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(maxScore), plot.x - 4, plot.y + 4);
      ctx.fillText('0', plot.x - 4, plot.y + plot.h);
    }
    ctx.restore();
  }

  #line(ctx, history, start, plot, maxScore, field, color) {
    const count = history.length - start;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const x = plot.x + (plot.w * i) / (count - 1);
      const y = plot.y + plot.h - (plot.h * history[start + i][field]) / maxScore;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}
