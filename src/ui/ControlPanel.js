import { assertArray, assertFunction, assertObject } from '../utils/validation.js';

// Botões de velocidade, pausa e reinício. Monta tudo com createElement/textContent, nunca innerHTML.
export class ControlPanel {
  #speedButtons = new Map();
  #pauseButton;

  // speeds: multiplicadores de velocidade (Infinity vira o botão MAX)
  constructor(root, speeds, { onSpeed, onPause, onReset }) {
    assertObject(root, 'root');
    assertFunction(root.replaceChildren, 'root.replaceChildren');
    assertArray(speeds, 'speeds');
    assertFunction(onSpeed, 'onSpeed');
    assertFunction(onPause, 'onPause');
    assertFunction(onReset, 'onReset');

    const speedGroup = document.createElement('div');
    speedGroup.className = 'group';
    const caption = document.createElement('span');
    caption.textContent = 'Velocidade';
    speedGroup.append(caption);
    for (const speed of speeds) {
      const button = this.#createButton(speed === Infinity ? 'MAX' : `${speed}x`, () => onSpeed(speed));
      this.#speedButtons.set(speed, button);
      speedGroup.append(button);
    }

    this.#pauseButton = this.#createButton('Pausar', onPause);
    root.replaceChildren(speedGroup, this.#pauseButton, this.#createButton('Reiniciar evolução', onReset));
  }

  setActiveSpeed(speed) {
    for (const [value, button] of this.#speedButtons) {
      button.classList.toggle('active', value === speed);
      button.setAttribute('aria-pressed', String(value === speed));
    }
  }

  setPaused(paused) {
    this.#pauseButton.textContent = paused ? 'Continuar' : 'Pausar';
  }

  #createButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }
}
