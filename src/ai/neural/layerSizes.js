// Neurônios por camada, ex.: [8, 6, 3]. É daqui que treinador, interface e storage tiram a topologia.
export function createLayerSizes(networkConfig) {
  return [networkConfig.inputLabels.length, ...networkConfig.hiddenLayers, networkConfig.outputLabels.length];
}
