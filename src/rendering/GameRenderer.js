import { Scenery } from './Scenery.js';
import { SpriteSheet } from './SpriteSheet.js';
import { SPRITE_MAP } from './spriteMap.js';
import { DinoState } from '../game/Dino.js';
import { assertInstance, assertObject } from '../utils/validation.js';

const DAY_BACKGROUND = '#f7f7f7';
const CROWD_ALPHA = 0.35; // opacidade dos dinos que não são o líder

const CLOUDS = Object.freeze([
  { x: 60, y: 34 },
  { x: 250, y: 18 },
  { x: 430, y: 48 },
  { x: 620, y: 26 },
]);

// Desenha o mundo: cenário, chão, nuvens, obstáculos, dinos e meteoro. Só lê a simulação.
// De dia o fundo é liso; à noite entram o cenário e os sprites invertidos, com transição gradual
// (track.darkness).
export class GameRenderer {
  #ctx;
  #sprites;
  #nightSprites;
  #enemySprites;
  #meteorSprite;
  #scenery;
  #game;
  #scale;
  #bottomMargin;
  #groundBottom;

  // estado do quadro em desenho, lido pelos callbacks abaixo
  #darkness = 0;
  #frame = 0;
  #leader = null;

  constructor({ ctx, sprites, nightSprites, enemySprites, meteorSprite, scenery, gameConfig, uiConfig }) {
    assertObject(ctx, 'ctx');
    assertInstance(sprites, SpriteSheet, 'sprites');
    assertInstance(nightSprites, SpriteSheet, 'nightSprites');
    assertInstance(enemySprites, SpriteSheet, 'enemySprites');
    assertInstance(meteorSprite, SpriteSheet, 'meteorSprite');
    assertInstance(scenery, Scenery, 'scenery');
    assertObject(gameConfig, 'gameConfig');
    assertObject(uiConfig, 'uiConfig');
    this.#ctx = ctx;
    this.#sprites = sprites;
    this.#nightSprites = nightSprites;
    this.#enemySprites = enemySprites;
    this.#meteorSprite = meteorSprite;
    this.#scenery = scenery;
    this.#game = gameConfig;
    this.#groundBottom = gameConfig.dino.groundTop + gameConfig.dino.height;
    this.#scale = uiConfig.worldScale;
    this.#bottomMargin = uiConfig.worldBottomMargin;
  }

  render(session, champion) {
    const ctx = this.#ctx;
    const { width, height } = ctx.canvas;
    const track = session.track;
    this.#darkness = track.darkness;
    this.#frame = track.frame;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = DAY_BACKGROUND;
    ctx.fillRect(0, 0, width, height);
    this.#scenery.draw(ctx, track.distance, this.#darkness);

    // daqui para baixo tudo é em unidades do mundo, ampliadas por `scale`
    ctx.setTransform(
      this.#scale,
      0,
      0,
      this.#scale,
      0,
      height - this.#game.world.height * this.#scale - this.#bottomMargin,
    );
    ctx.imageSmoothingEnabled = false;

    this.#drawDaySkyAndGround(track.distance);
    track.forEachObstacle(this.#paintObstacle);
    this.#drawDinos(session, champion);
    this.#drawImpactMarker(track);
    this.#drawMeteor(track);
    this.#drawExplosion(track);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // de dia usa a folha normal, de noite a invertida, e na transição as duas com opacidade complementar
  #drawSprite(sx, sy, sw, sh, dx, dy) {
    const darkness = this.#darkness;
    if (darkness <= 0) {
      this.#sprites.draw(this.#ctx, sx, sy, sw, sh, dx, dy);
    } else if (darkness >= 1) {
      this.#nightSprites.draw(this.#ctx, sx, sy, sw, sh, dx, dy);
    } else {
      const ctx = this.#ctx;
      const base = ctx.globalAlpha;
      ctx.globalAlpha = base * (1 - darkness);
      this.#sprites.draw(ctx, sx, sy, sw, sh, dx, dy);
      ctx.globalAlpha = base * darkness;
      this.#nightSprites.draw(ctx, sx, sy, sw, sh, dx, dy);
      ctx.globalAlpha = base;
    }
  }

  // nuvens e chão pontilhado só existem de dia; à noite o chão é a estrada do cenário
  #drawDaySkyAndGround(distance) {
    if (this.#darkness >= 1) {
      return;
    }
    const ctx = this.#ctx;
    const { cloud, horizon } = SPRITE_MAP;
    const { world } = this.#game;
    ctx.globalAlpha = 1 - this.#darkness;

    const span = world.width + 2 * cloud.width;
    for (const c of CLOUDS) {
      const x = ((((c.x - distance * 0.08) % span) + span) % span) - cloud.width;
      this.#sprites.draw(ctx, cloud.x, cloud.y, cloud.width, cloud.height, x, c.y);
    }

    // o chão é uma faixa de 1200 px que rola e recomeça
    const start = Math.floor(distance) % horizon.width;
    const firstWidth = Math.min(world.width, horizon.width - start);
    this.#sprites.draw(ctx, horizon.x + start, horizon.y, firstWidth, horizon.height, 0, world.horizonY);
    if (firstWidth < world.width) {
      this.#sprites.draw(
        ctx,
        horizon.x,
        horizon.y,
        world.width - firstWidth,
        horizon.height,
        firstWidth,
        world.horizonY,
      );
    }
    ctx.globalAlpha = 1;
  }

  #paintObstacle = (obstacle) => {
    if (obstacle.isFlying) {
      const { bird } = SPRITE_MAP;
      const flap = Math.floor(this.#frame / 10) % 2;
      this.#drawSprite(bird.x + obstacle.width * flap, bird.y, obstacle.width, obstacle.height, obstacle.x, obstacle.y);
    } else if (obstacle.kind in SPRITE_MAP.enemies.firstColumn) {
      this.#drawEnemy(obstacle);
    } else {
      const sprite = SPRITE_MAP[obstacle.kind];
      // grupo de cactos usa um recorte mais largo da folha (como no sprite original)
      const sx = sprite.x + obstacle.width * 0.5 * (obstacle.size - 1);
      this.#drawSprite(sx, sprite.y, obstacle.width, obstacle.height, obstacle.x, obstacle.y);
    }
  };

  // zumbis e esqueletos mantêm as cores originais, mesmo à noite
  #drawEnemy(obstacle) {
    const cfg = SPRITE_MAP.enemies;
    const unitWidth = obstacle.width / obstacle.size;
    for (let i = 0; i < obstacle.size; i++) {
      // cada um do grupo anda defasado, para não marcharem juntos
      const step = cfg.walkCycle[Math.floor((this.#frame + i * 5) / cfg.ticksPerFrame) % cfg.walkCycle.length];
      const sx = (cfg.firstColumn[obstacle.kind] + step) * cfg.cellWidth;
      const dx = obstacle.x + i * unitWidth - (cfg.cellWidth - unitWidth) / 2;
      const dy = obstacle.y + obstacle.height - cfg.feetY;
      this.#enemySprites.draw(this.#ctx, sx, 0, cfg.cellWidth, cfg.cellHeight, dx, dy);
    }
  }

  // seta e faixa vermelhas no chão, onde o meteoro vai cair
  #drawImpactMarker(track) {
    const meteor = track.meteor;
    if (meteor === null) {
      return;
    }
    const ctx = this.#ctx;
    const x = meteor.impactX;
    const y = this.#groundBottom;
    const pulse = 0.5 + 0.5 * Math.sin(this.#frame * 0.5);

    ctx.fillStyle = `rgba(215, 38, 61, ${0.25 + 0.45 * pulse})`;
    ctx.fillRect(x - 28, y - 4, 56, 4);

    ctx.fillStyle = `rgba(215, 38, 61, ${0.5 + 0.5 * pulse})`;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 36);
    ctx.lineTo(x + 9, y - 36);
    ctx.lineTo(x, y - 18);
    ctx.lineTo(x - 9, y - 36);
    ctx.fill();
  }

  #drawMeteor(track) {
    const meteor = track.meteor;
    if (meteor !== null) {
      this.#meteorSprite.draw(this.#ctx, 0, 0, meteor.width, meteor.height, meteor.x, meteor.y);
    }
  }

  // cúpula amarela e anel laranja que crescem e somem
  #drawExplosion(track) {
    const impact = track.lastMeteorImpact;
    if (impact === null) {
      return;
    }
    const age = this.#frame - impact.frame;
    const duration = this.#game.meteors.explosionFrames;
    if (age < 0 || age >= duration) {
      return;
    }
    const ctx = this.#ctx;
    const t = age / duration;
    const y = this.#groundBottom - 3;

    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = '#ffd400';
    ctx.beginPath();
    ctx.arc(impact.x, y, 8 + 30 * t, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#e8590c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(impact.x, y, 14 + 44 * t, Math.PI, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // O líder (campeão ou, se ele morreu, o primeiro vivo) fica opaco e por cima. Os outros ficam
  // translúcidos; sem isso, depois de várias gerações os poucos sobreviventes pareciam sumir.
  #drawDinos(session, champion) {
    const leader = champion && champion.isAlive ? champion : (session.firstAliveAgent() ?? null);
    this.#leader = leader;
    this.#ctx.globalAlpha = CROWD_ALPHA;
    session.forEachAlive(this.#paintCrowdDino);
    this.#ctx.globalAlpha = 1;
    if (leader) {
      this.#drawDino(leader.dino);
    }
  }

  #paintCrowdDino = (agent) => {
    if (agent !== this.#leader && agent.isAlive) {
      this.#drawDino(agent.dino);
    }
  };

  #drawDino(dino) {
    let name = 'jump';
    if (dino.state === DinoState.DUCKING) {
      name = `duck${Math.floor(this.#frame / 8) % 2}`;
    } else if (dino.state === DinoState.RUNNING) {
      name = `run${Math.floor(this.#frame / 5) % 2}`;
    }
    const { dino: sprite } = SPRITE_MAP;
    const { x, w } = sprite.frames[name];
    this.#drawSprite(sprite.x + x, sprite.y, w, sprite.height, dino.x, dino.y);
  }
}
