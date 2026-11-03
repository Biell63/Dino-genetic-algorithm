export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}
