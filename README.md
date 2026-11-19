# Mini Santos

A tiny browser-based, GTA-style open-world slice built with [Three.js](https://threejs.org/) and plain JavaScript. No build step, no dependencies to install — Three.js loads from a CDN.

This is **step 1 of a growing project**: a minimal but real open-world core (city, driving, NPCs, wanted level, police, missions, character switching) that we extend over time.

## How to play

1. Serve the folder (required for ES modules):

   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```

2. Open `http://localhost:8080` and click **Start**.

| Input | Action |
| --- | --- |
| WASD / Arrows | Walk / drive |
| Shift | Sprint |
| Space | Jump (on foot) |
| E | Enter / exit car |
| T | Switch character (on foot) |

## Systems implemented

- **City**: 5×5 road grid with sidewalks, buildings (collision), lane markings, street lamps, star field
- **Player**: walk, sprint, jump; building and map-bound collision
- **Vehicles**: 8 parked cars with acceleration, braking, reverse, speed-dependent steering, crash response
- **Pedestrians (NPC AI)**: wander the roads, flee from speeding cars, get knocked down, respawn
- **Wanted system**: hit a pedestrian → +1 star (max 3); stars decay after 20 clean seconds
- **Police AI**: a pursuit cruiser with flashing lights spawns when wanted; get caught on foot → busted, lose $300
- **Character switching**: F. Clinton, M. De Santa, T. Philips — each with a distinct color and spawn point
- **Mission manager**: sequential missions with objective text, target marker, car requirements, a timed "The Getaway" mission, rewards, failures/retries, ending in free roam
- **HUD**: character name, money, wanted stars, objective line, event toasts

## Structure

```
index.html        page shell, HUD, overlay, import map for Three.js
css/style.css     HUD, toast, menu styling
src/main.js       bootstrap: wires buttons, starts the game loop
src/game.js       game state, enter/exit car, wanted/police, camera, HUD
src/city.js       road grid, buildings + colliders, road marks, props
src/player.js     on-foot movement and collision
src/car.js        vehicle physics + police cruiser AI
src/npc.js        pedestrian behavior states
src/missions.js   mission definitions, objectives, markers, rewards
src/input.js      keyboard state + edge-triggered keys
```

## Roadmap (mapped to the design doc)

- Combat, shooting, health/armor, character special abilities
- More vehicle types (boats, aircraft) and local traffic AI on lanes
- Dialogue, cutscene-style intro text, checkpoints, mission variety (heists, chases)
- Day/night cycle, weather, richer lighting
- Shops, money sinks, properties, save/load (localStorage)
- Radar/minimap, GPS route line
- Multiplayer exploration
