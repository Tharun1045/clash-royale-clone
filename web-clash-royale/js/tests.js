/* ==========================================
   CLASH ROYALE CLONE - TESTING SUITE
   ========================================== */

function runUnitTests() {
  console.log("=== RUNNING CLASH ROYALE CLONE TEST SUITE ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Test 1: Unit Stats exist
  try {
    assert(typeof UNIT_STATS !== 'undefined', "UNIT_STATS object is defined");
    assert(UNIT_STATS.knight.hp === 750, "Knight HP is correct (750)");
    assert(UNIT_STATS.giant.hp === 2200, "Giant HP is correct (2200)");
  } catch (e) {
    console.error("Test 1 crashed:", e);
    failed++;
  }

  // Test 2: Card Templates exist and are structured
  try {
    assert(typeof CARD_TEMPLATES !== 'undefined', "CARD_TEMPLATES object is defined");
    assert(CARD_TEMPLATES.knight.cost === 3, "Knight cost is 3");
    assert(CARD_TEMPLATES.giant.cost === 5, "Giant cost is 5");
    assert(typeof CARD_TEMPLATES.skeleton_army.spawn === 'function', "Skeleton Army spawn is a function");
  } catch (e) {
    console.error("Test 2 crashed:", e);
    failed++;
  }

  // Test 3: Math and Bridge selection emulation
  try {
    // Mock bridges:
    const bridges = [
      { x: 75, y: 300 },
      { x: 285, y: 300 }
    ];
    // Mock unit on left side of field (e.g. x = 100)
    const unitX1 = 100;
    const bridge1 = bridges.reduce((prev, curr) => 
      Math.abs(curr.x - unitX1) < Math.abs(prev.x - unitX1) ? curr : prev
    );
    assert(bridge1.x === 75, "Selects left bridge (x=75) when unit is at x=100");

    // Mock unit on right side of field (e.g. x = 250)
    const unitX2 = 250;
    const bridge2 = bridges.reduce((prev, curr) => 
      Math.abs(curr.x - unitX2) < Math.abs(prev.x - unitX2) ? curr : prev
    );
    assert(bridge2.x === 285, "Selects right bridge (x=285) when unit is at x=250");
  } catch (e) {
    console.error("Test 3 crashed:", e);
    failed++;
  }

  // Test 4: Deployment zone bounds validation
  try {
    // Mock game engine properties
    const mockEngine = {
      riverY: 300,
      towers: [
        { id: 'b_left', active: true },
        { id: 'b_right', active: true }
      ]
    };
    
    // Simulate checkDeploymentZone function
    function checkZone(x, y, engine) {
      if (y >= engine.riverY - 12 && y <= engine.riverY + 12) return false;
      if (y > engine.riverY + 12) return true;
      
      const botLeftTowerDead = !engine.towers.find(t => t.id === 'b_left').active;
      if (botLeftTowerDead && y <= engine.riverY - 12 && x < 180) return true;
      
      const botRightTowerDead = !engine.towers.find(t => t.id === 'b_right').active;
      if (botRightTowerDead && y <= engine.riverY - 12 && x >= 180) return true;
      
      return false;
    }

    assert(checkZone(180, 450, mockEngine) === true, "Valid blue team bottom zone deployment");
    assert(checkZone(180, 300, mockEngine) === false, "Invalid river zone deployment");
    assert(checkZone(100, 100, mockEngine) === false, "Invalid enemy zone deployment while tower is active");

    // Kill bot left tower
    mockEngine.towers[0].active = false;
    assert(checkZone(100, 100, mockEngine) === true, "Valid left enemy zone deployment since bot left tower is destroyed");
    assert(checkZone(280, 100, mockEngine) === false, "Invalid right enemy zone deployment since bot right tower is still active");
  } catch (e) {
    console.error("Test 4 crashed:", e);
    failed++;
  }

  console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  return failed === 0;
}

// Automatically execute tests in development console
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    // Run tests after 1.5s to let other modules load
    setTimeout(runUnitTests, 1500);
  });
} else {
  // If running in Node.js (command line environment testing)
  module.exports = { runUnitTests };
}
