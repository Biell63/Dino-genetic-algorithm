// Checagens de argumento. Tipo errado lança TypeError; valor fora do limite lança RangeError.

export function assertDefined(value, name) {
  if (value === null || value === undefined) {
    throw new TypeError(`${name} é obrigatório`);
  }
}

export function assertObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} deve ser um objeto`);
  }
}

export function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} deve ser um array`);
  }
}

export function assertBoolean(value, name) {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${name} deve ser booleano`);
  }
}

export function assertString(value, name) {
  if (typeof value !== 'string' || value === '') {
    throw new TypeError(`${name} deve ser um texto não vazio`);
  }
}

export function assertFunction(value, name) {
  if (typeof value !== 'function') {
    throw new TypeError(`${name} deve ser uma função`);
  }
}

export function assertInstance(value, Type, name) {
  if (!(value instanceof Type)) {
    throw new TypeError(`${name} deve ser uma instância de ${Type.name}`);
  }
}

export function assertNumber(value, name, { min = -Infinity, max = Infinity } = {}) {
  if (typeof value !== 'number') {
    throw new TypeError(`${name} deve ser um número (recebido: ${typeof value})`);
  }
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} deve estar entre ${min} e ${max} (recebido: ${value})`);
  }
}

export function assertInteger(value, name, { min = -Infinity, max = Infinity } = {}) {
  if (typeof value !== 'number') {
    throw new TypeError(`${name} deve ser um número inteiro (recebido: ${typeof value})`);
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${name} deve ser um inteiro entre ${min} e ${max} (recebido: ${value})`);
  }
}

export function assertProbability(value, name) {
  assertNumber(value, name, { min: 0, max: 1 });
}
