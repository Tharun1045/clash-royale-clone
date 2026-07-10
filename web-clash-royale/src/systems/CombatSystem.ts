

export interface CombatEntity {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  range: number;
  damage: number;
  hitSpeed: number;
  isAir: boolean;
  isTower?: boolean;
  team: 'blue' | 'red';
  targets: 'any' | 'towers';
  lastAttackTime: number;
}

export class CombatSystem {
  static getDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Scans a list of target entities and returns the nearest valid opponent.
   */
  static findNearestTarget(attacker: CombatEntity, entities: CombatEntity[], scanRange = 180): CombatEntity | null {
    let nearest: CombatEntity | null = null;
    let minDist = scanRange;

    for (let i = 0; i < entities.length; i++) {
      const target = entities[i];
      
      // Filter validation: different team, alive, targets filter match
      if (target.team === attacker.team || target.hp <= 0) continue;
      
      // Giant targets only towers/buildings
      if (attacker.targets === 'towers' && !target.isTower) continue;

      // Air targeting checks (some ground melee can't target air)
      if (target.isAir && attacker.range < 30) continue; // standard melee range threshold

      const dist = this.getDistance(attacker, target);
      if (dist < minDist) {
        minDist = dist;
        nearest = target;
      }
    }

    return nearest;
  }

  /**
   * Checks if target is within attacker's range, and executes attack if cooldown elapsed.
   */
  static executeAttack(
    attacker: CombatEntity, 
    target: CombatEntity, 
    currentTimeMs: number, 
    onDamage: (amount: number, isCritical: boolean) => void
  ): boolean {
    const dist = this.getDistance(attacker, target);
    
    // Check range
    if (dist <= attacker.range) {
      const cooldownMs = attacker.hitSpeed * 1000;
      if (currentTimeMs - attacker.lastAttackTime >= cooldownMs) {
        attacker.lastAttackTime = currentTimeMs;
        
        // Critical hits logic (standard random multiplier for rogues/mini-pekkas, e.g. 5%)
        const isCritical = Math.random() < 0.05;
        const finalDamage = isCritical ? attacker.damage * 1.5 : attacker.damage;
        
        target.hp = Math.max(0, target.hp - finalDamage);
        onDamage(finalDamage, isCritical);
        return true;
      }
    }
    
    return false;
  }
}
