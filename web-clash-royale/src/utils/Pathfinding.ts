/* Waypoint Pathfinding Calculations (TypeScript) */

import { Position } from '../types/game';

export class Pathfinding {
  // Arena key landmark positions
  static arenaWidth = 360;
  static arenaHeight = 640;
  static riverY = 320;
  
  static leftBridge: Position = { x: 90, y: 320 };
  static rightBridge: Position = { x: 270, y: 320 };

  static blueKing: Position = { x: 180, y: 580 };
  static blueLeftPrincess: Position = { x: 90, y: 500 };
  static blueRightPrincess: Position = { x: 270, y: 500 };

  static redKing: Position = { x: 180, y: 60 };
  static redLeftPrincess: Position = { x: 90, y: 140 };
  static redRightPrincess: Position = { x: 270, y: 140 };

  /**
   * Generates a waypoint path from the start point to the final enemy towers.
   */
  static getPath(start: Position, isRedTeam: boolean, leftPrincessAlive: boolean, rightPrincessAlive: boolean, kingAlive: boolean): Position[] {
    const path: Position[] = [];
    
    // Units target the opposing side's towers
    const targetSideRed = !isRedTeam; 
    
    // Step 1: Bridge decision
    const useLeftBridge = start.x < this.arenaWidth / 2;
    const bridge = useLeftBridge ? this.leftBridge : this.rightBridge;
    
    // Step 2: Opponent Tower target decision
    let towerTarget: Position = targetSideRed ? this.redKing : this.blueKing;
    
    if (targetSideRed) {
      if (useLeftBridge && leftPrincessAlive) {
        towerTarget = this.redLeftPrincess;
      } else if (!useLeftBridge && rightPrincessAlive) {
        towerTarget = this.redRightPrincess;
      } else if (leftPrincessAlive) {
        towerTarget = this.redLeftPrincess;
      } else if (rightPrincessAlive) {
        towerTarget = this.redRightPrincess;
      }
    } else {
      if (useLeftBridge && leftPrincessAlive) {
        towerTarget = this.blueLeftPrincess;
      } else if (!useLeftBridge && rightPrincessAlive) {
        towerTarget = this.blueRightPrincess;
      } else if (leftPrincessAlive) {
        towerTarget = this.blueLeftPrincess;
      } else if (rightPrincessAlive) {
        towerTarget = this.blueRightPrincess;
      }
    }

    // Determine if unit has crossed the river
    const crossedRiver = isRedTeam ? (start.y > this.riverY) : (start.y < this.riverY);

    if (!crossedRiver) {
      // Add bridge path to cross river safely
      path.push({ x: bridge.x, y: bridge.y });
    }

    // Add target tower positions
    path.push({ x: towerTarget.x, y: towerTarget.y });
    
    // Add final King Tower destination if still alive
    if (kingAlive) {
      const kingPos = targetSideRed ? this.redKing : this.blueKing;
      path.push({ x: kingPos.x, y: kingPos.y });
    }

    return path;
  }
}
