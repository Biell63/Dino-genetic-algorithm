import { Track } from './Track.js';
import { assertArray, assertFunction, assertObject } from '../utils/validation.js';

// Uma rodada: uma pista e vários agentes jogando juntos. Acaba quando o último morre.
export class GameSession {
  #track;
  #agents; // todos, na ordem original (o campeão é o primeiro)
  #alive; // só quem ainda está jogando: o laço do passo não gasta tempo com os mortos
  #sensor;

  constructor({ gameConfig, rng, agents, sensor, meteorsEnabled = false }) {
    assertArray(agents, 'agents');
    agents.forEach((agent, i) => {
      assertObject(agent, `agents[${i}]`);
      assertFunction(agent.think, `agents[${i}].think`);
    });
    assertObject(sensor, 'sensor');
    assertFunction(sensor.observe, 'sensor.observe');
    this.#track = new Track(gameConfig, rng, { meteorsEnabled });
    this.#agents = Object.freeze([...agents]);
    this.#alive = [...agents];
    this.#sensor = sensor;
  }

  get track() {
    return this.#track;
  }

  get agents() {
    return this.#agents;
  }

  get aliveCount() {
    return this.#alive.length;
  }

  get frame() {
    return this.#track.frame;
  }

  get isOver() {
    return this.#alive.length === 0;
  }

  forEachAlive(callback) {
    assertFunction(callback, 'callback');
    const alive = this.#alive;
    for (let i = 0; i < alive.length; i++) {
      callback(alive[i]);
    }
  }

  // primeiro vivo na ordem original; fica estável enquanto outros morrem
  firstAliveAgent() {
    return this.#agents.find((agent) => agent.isAlive);
  }

  step() {
    const track = this.#track;
    track.update();
    this.#sensor.observe(track);

    const alive = this.#alive;
    const speed = track.speed;
    let i = 0;
    while (i < alive.length) {
      const agent = alive[i];
      agent.think(this.#sensor, speed);
      agent.dino.update();
      if (track.collides(agent.dino)) {
        agent.die(track.distance);
        alive[i] = alive[alive.length - 1]; // tira da lista trocando com o último
        alive.pop();
      } else {
        i++;
      }
    }
  }

  // fim da rodada: quem sobrou recebe a distância atual como nota
  finalize() {
    for (const agent of this.#alive) {
      agent.die(this.#track.distance);
    }
    this.#alive.length = 0;
  }
}
