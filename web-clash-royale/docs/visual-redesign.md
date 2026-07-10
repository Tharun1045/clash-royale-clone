# Visual Redesign Documentation - Royal Arenas

This document outlines the visual overhaul of the Clash Royale web clone, migrating from plain JavaScript and DOM elements to a WebGL-powered Phaser & TypeScript engine.

---

## ⚠️ Previous Visual Problems
1. **DOM Battlefield Lag**: Moving units using absolute-positioned HTML elements caused reflow/repaint lag on mobile.
2. **Plain Visuals**: Units were rendered as plain circles with text emojis inside, lacking direction, walk cycle animations, or hit reactions.
3. **No Combat Juice**: Projectiles moved rigidly without arcs; spell impact lacked screenshake; hit reactions were non-existent.
4. **Basic HUD**: The elixir bar was a flat CSS bar without dividers, smooth animation, or indicator pulses.

---

## 🎨 New Design Decisions
1. **WebGL Canvas Rendering**: The entire arena, river, bridges, towers, units, projectiles, and particle systems are drawn in a high-performance WebGL context via Phaser.
2. **Procedural Vector Character Graphics**: To maintain original character visual identities without copying Clash Royale assets:
   - Units are composite graphics containing stylized team color bodies and vector directional arrows.
   - Towers are detailed stone fortresses featuring glowing team-colored flag fills.
3. **Checkered Terrain Grids**: The battlefield features checkered grass layers and shaded river banks for layout depth.

---

## 🏃 Animation Principles
1. **Easing Tweens**: Transitions (home menus, results overlays) utilize standard easing curves (Sine, Back, Cubic) via Phaser's tween library.
2. **Movement Bobbing**: Walk cycles oscillate unit height scale factors (`Math.sin()`) to simulate steps.
3. **Combat Feedback Loop**:
   - **Anticipation**: Ranged units pull bows, and melee troops expand slightly before striking.
   - **Recoil/Hit reaction**: Attacked targets flash white and shake.
   - **Particles/Shakes**: Fireballs trigger camera screenshakes and radial smoke rings on impact.

---

## 📱 Responsive & Mobile Behaviors
1. **Phaser Scale Manager**: The game scales dynamically to the viewport using the `Scale.FIT` layout mode to align correctly on mobile screens (iPhone, Android, tablets) without stretching.
2. **WebGL Touch Events**: Deployment, card select, drag actions, and map scrolls run directly on Pointer touch coordinates.

---

## 📦 Remaining Asset Limitations
1. **Visual Placeholders**: Unit sprites and projectiles are procedurally drawn shapes rather than baked pixel-art sprite sheets. They can easily be swapped by loading textures in `PreloadScene.ts`.
