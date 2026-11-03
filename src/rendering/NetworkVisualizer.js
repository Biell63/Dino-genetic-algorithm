import { DAY_PALETTE } from './palette.js';
import { clamp } from '../utils/math.js';
import { assertObject } from '../utils/validation.js';

const NODE_RADIUS = 12;

// Valor do neurônio em escala 0-100. Arredondar direto mostraria só 0 ou 1.
function formatValue(value) {
  return String(Math.round(value * 100));
}

// Desenha a rede de um agente. O número dentro do neurônio é o valor de agora; a linha fica mais
// forte quanto mais sinal passa por ela (peso x ativação de origem), azul se positivo e vermelho se
// negativo; a saída com contorno verde é a ação em andamento.
export class NetworkVisualizer {
  #inputLabels;
  #outputLabels;
  #threshold;
  #layoutKey = '';
  #layout = null;

  constructor(networkConfig) {
    assertObject(networkConfig, 'networkConfig');
    this.#inputLabels = networkConfig.inputLabels;
    this.#outputLabels = networkConfig.outputLabels;
    this.#threshold = networkConfig.actionThreshold;
  }

  draw(ctx, snapshot, area, title, palette = DAY_PALETTE) {
    const layout = this.#layoutFor(snapshot.layerSizes, area);

    ctx.save();
    if (palette.panelAlpha > 0) {
      ctx.fillStyle = `rgba(${palette.panel}, ${palette.panelAlpha})`;
      ctx.fillRect(area.x - 8, area.y - 4, area.w + 16, area.h + 8);
    }
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgb(${palette.ink})`;
    ctx.font = 'bold 16px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, area.x + area.w / 2, area.y + 12);

    this.#drawConnections(ctx, snapshot, layout, palette);
    this.#drawNodes(ctx, snapshot, layout, palette);
    this.#drawLabels(ctx, layout, palette);
    ctx.restore();
  }

  // o layout só depende da topologia e da área, então é calculado uma vez
  #layoutFor(sizes, area) {
    const key = `${sizes.join('x')}|${area.x},${area.y},${area.w},${area.h}`;
    if (key !== this.#layoutKey) {
      this.#layout = this.#computeLayout(sizes, area);
      this.#layoutKey = key;
    }
    return this.#layout;
  }

  #computeLayout(sizes, area) {
    const columns = sizes.length;
    const leftX = area.x + 160;
    const rightX = area.x + area.w - 110;
    const top = area.y + 36;
    const rowHeight = Math.min(40, (area.h - 36) / (Math.max(...sizes) + 1)); // +1 do bias
    const colX = (c) => (columns === 1 ? leftX : leftX + ((rightX - leftX) * c) / (columns - 1));
    const rowY = (rows, index) => top + (area.h - 36 - rows * rowHeight) / 2 + (index + 0.5) * rowHeight;

    const neurons = sizes.map((size, c) =>
      Array.from({ length: size }, (_, i) => ({ x: colX(c), y: rowY(size + 1, i) })),
    );
    // cada camada, menos a de saída, tem um bias logo abaixo dos neurônios
    const biases = sizes.slice(0, -1).map((size, c) => ({ x: colX(c), y: rowY(size + 1, size) }));
    return { neurons, biases };
  }

  #drawConnections(ctx, snapshot, layout, palette) {
    const { layers, activations } = snapshot;
    for (let l = 0; l < layers.length; l++) {
      const { inputSize, outputSize, weights } = layers[l];
      const stride = inputSize + 1;
      for (let j = 0; j < outputSize; j++) {
        const target = layout.neurons[l + 1][j];
        for (let i = 0; i <= inputSize; i++) {
          const isBias = i === inputSize;
          const signal = weights[j * stride + i] * (isBias ? 1 : activations[l][i]);
          const strength = clamp(Math.abs(signal) / 1.5, 0, 1);
          if (strength < 0.02) {
            continue; // sem sinal agora, não desenha
          }
          const source = isBias ? layout.biases[l] : layout.neurons[l][i];
          ctx.strokeStyle = `rgba(${signal >= 0 ? palette.positive : palette.negative}, ${0.1 + 0.8 * strength})`;
          ctx.lineWidth = 0.5 + 2.5 * strength;
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      }
    }
  }

  #drawNodes(ctx, snapshot, layout, palette) {
    const last = snapshot.layerSizes.length - 1;
    ctx.font = 'bold 9px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';

    for (let l = 0; l < layout.neurons.length; l++) {
      const column = layout.neurons[l];
      for (let i = 0; i < column.length; i++) {
        const activation = snapshot.activations[l][i];
        const firing = l === last && activation > this.#threshold;
        this.#drawCircle(ctx, column[i], clamp(Math.abs(activation), 0, 1), formatValue(activation), firing, palette);
      }
    }
    for (const bias of layout.biases) {
      this.#drawCircle(ctx, bias, 0.12, '100', false, palette);
    }
  }

  #drawCircle(ctx, node, level, text, highlighted, palette) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${palette.nodeFill})`;
    ctx.fill();
    ctx.fillStyle = `rgba(${palette.nodeActive}, ${0.9 * level})`;
    ctx.fill();
    ctx.lineWidth = highlighted ? 3 : 1.5;
    ctx.strokeStyle = highlighted ? '#1a9c3c' : `rgb(${palette.nodeStroke})`;
    ctx.stroke();
    ctx.fillStyle = level > 0.5 ? `rgb(${palette.nodeActiveText})` : `rgb(${palette.ink})`;
    ctx.fillText(text, node.x, node.y + 0.5);
  }

  #drawLabels(ctx, layout, palette) {
    ctx.fillStyle = `rgb(${palette.ink})`;
    ctx.font = 'bold 11px Arial, Helvetica, sans-serif';

    ctx.textAlign = 'right';
    const inputs = layout.neurons[0];
    for (let i = 0; i < inputs.length; i++) {
      ctx.fillText(this.#inputLabels[i] ?? '', inputs[i].x - NODE_RADIUS - 8, inputs[i].y);
    }
    const bias = layout.biases[0];
    ctx.fillText('Bias', bias.x - NODE_RADIUS - 8, bias.y);

    ctx.textAlign = 'left';
    const outputs = layout.neurons[layout.neurons.length - 1];
    for (let i = 0; i < outputs.length; i++) {
      ctx.fillText(this.#outputLabels[i] ?? '', outputs[i].x + NODE_RADIUS + 8, outputs[i].y);
    }
  }
}
