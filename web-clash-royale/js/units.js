/* ==========================================
   CLASH ROYALE CLONE - UNIT DATABASE & DEFINITIONS
   ========================================== */

// All cards registry
const CARD_TEMPLATES = {
  knight: {
    id: 'knight',
    name: 'Knight',
    cost: 3,
    icon: '⚔️',
    rarity: 'common',
    description: 'Tough melee fighter. Solid on defense and offense.',
    type: 'troop',
    spawn: (engine, x, y, team) => {
      engine.spawnUnit('knight', x, y, team);
    }
  },
  archers: {
    id: 'archers',
    name: 'Archers',
    cost: 3,
    icon: '🏹',
    rarity: 'common',
    description: 'A pair of light ranged attackers. Target air and ground.',
    type: 'troop',
    spawn: (engine, x, y, team) => {
      engine.spawnUnit('archer', x - 15, y, team);
      engine.spawnUnit('archer', x + 15, y, team);
    }
  },
  giant: {
    id: 'giant',
    name: 'Giant',
    cost: 5,
    icon: '✊',
    rarity: 'rare',
    description: 'Slow but massive. Targets only towers and buildings.',
    type: 'troop',
    spawn: (engine, x, y, team) => {
      engine.spawnUnit('giant', x, y, team);
    }
  },
  baby_dragon: {
    id: 'baby_dragon',
    name: 'Baby Dragon',
    cost: 4,
    icon: '🐉',
    rarity: 'epic',
    description: 'Flying ranged troop. Attacks air/ground with splash damage.',
    type: 'troop',
    spawn: (engine, x, y, team) => {
      engine.spawnUnit('baby_dragon', x, y, team);
    }
  },
  skeleton_army: {
    id: 'skeleton_army',
    name: 'Skeleton Army',
    cost: 3,
    icon: '💀',
    rarity: 'epic',
    description: 'Spawns a swarm of skeletons to overwhelm heavy units.',
    type: 'troop',
    spawn: (engine, x, y, team) => {
      // Spawn 12 skeletons in a circle
      const numSkeletons = 12;
      const radius = 25;
      for (let i = 0; i < numSkeletons; i++) {
        const angle = (i / numSkeletons) * Math.PI * 2;
        const sx = x + Math.cos(angle) * radius + (Math.random() - 0.5) * 5;
        const sy = y + Math.sin(angle) * radius + (Math.random() - 0.5) * 5;
        engine.spawnUnit('skeleton', sx, sy, team);
      }
    }
  },
  mini_pekka: {
    id: 'mini_pekka',
    name: 'Mini P.E.K.K.A',
    cost: 4,
    icon: '🤖',
    rarity: 'rare',
    description: 'Fast, high-damage melee attacker. Fragile but deadly.',
    type: 'troop',
    spawn: (engine, x, y, team) => {
      engine.spawnUnit('mini_pekka', x, y, team);
    }
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    cost: 4,
    icon: '🔥',
    rarity: 'rare',
    description: 'Deals high area damage anywhere on the battlefield.',
    type: 'spell',
    spawn: (engine, x, y, team) => {
      engine.spawnSpell('fireball', x, y, team);
    }
  },
  arrows: {
    id: 'arrows',
    name: 'Arrows',
    cost: 3,
    icon: '💨',
    rarity: 'common',
    description: 'Large area spell. Weak but perfect for clearing swarms.',
    type: 'spell',
    spawn: (engine, x, y, team) => {
      engine.spawnSpell('arrows', x, y, team);
    }
  }
};

// Unit Base Stats Registry
const UNIT_STATS = {
  knight: {
    name: 'Knight',
    hp: 750,
    speed: 1.4,
    range: 22,
    damage: 130,
    hitSpeed: 1.2, // seconds per hit
    targets: 'any',
    isAir: false,
    radius: 11,
    color: '#3498db',
    icon: '⚔️'
  },
  archer: {
    name: 'Archer',
    hp: 280,
    speed: 1.6,
    range: 110,
    damage: 55,
    hitSpeed: 1.0,
    targets: 'any',
    isAir: false,
    radius: 8,
    color: '#e67e22',
    icon: '🏹'
  },
  giant: {
    name: 'Giant',
    hp: 2200,
    speed: 0.8,
    range: 25,
    damage: 140,
    hitSpeed: 1.5,
    targets: 'towers',
    isAir: false,
    radius: 16,
    color: '#d35400',
    icon: '✊'
  },
  baby_dragon: {
    name: 'Baby Dragon',
    hp: 600,
    speed: 1.7,
    range: 90,
    damage: 75,
    hitSpeed: 1.6,
    targets: 'any',
    isAir: true,
    isSplash: true,
    splashRadius: 40,
    radius: 12,
    color: '#2ecc71',
    icon: '🐉'
  },
  skeleton: {
    name: 'Skeleton',
    hp: 55,
    speed: 2.1,
    range: 16,
    damage: 35,
    hitSpeed: 1.0,
    targets: 'any',
    isAir: false,
    radius: 6,
    color: '#ecf0f1',
    icon: '💀'
  },
  mini_pekka: {
    name: 'Mini P.E.K.K.A',
    hp: 650,
    speed: 2.0,
    range: 22,
    damage: 260,
    hitSpeed: 1.7,
    targets: 'any',
    isAir: false,
    radius: 12,
    color: '#1abc9c',
    icon: '🤖'
  }
};

// Spell Stats Registry
const SPELL_STATS = {
  fireball: {
    name: 'Fireball',
    damage: 320,
    towerDamage: 120,
    radius: 50,
    travelTime: 500, // milliseconds
    color: '#e74c3c',
    particleColor: '#f39c12',
    icon: '🔥'
  },
  arrows: {
    name: 'Arrows',
    damage: 130,
    towerDamage: 45,
    radius: 90,
    travelTime: 400,
    color: '#95a5a6',
    particleColor: '#bdc3c7',
    icon: '💨'
  }
};

// Tower Base Stats
const TOWER_STATS = {
  princess: {
    hp: 1800,
    range: 140,
    damage: 65,
    hitSpeed: 0.8,
    radius: 18
  },
  king: {
    hp: 3000,
    range: 120,
    damage: 75,
    hitSpeed: 1.0,
    radius: 22
  }
};

// Default 8-card deck
const DEFAULT_DECK = ['knight', 'archers', 'giant', 'baby_dragon', 'skeleton_army', 'mini_pekka', 'fireball', 'arrows'];

// Full pool of cards for deck building
const FULL_COLLECTION = Object.keys(CARD_TEMPLATES);
