# Mini Santos — Game Design

A GTA V-style open-world game for the browser, built as a growing project. This document maps the design pillars to implemented systems and the phases ahead.

## Vision

A living, breathing city — Mini Santos — where the world feels alive even when the player is not completing missions. Third-person, single-player for now, multiplayer later.

## Core pillars

| Pillar (GTA V style) | Status | Where |
|---|---|---|
| Living city: streets, buildings, traffic | ✅ v0.2 | `src/city.js`, `src/traffic.js` |
| Day/night cycle, lighting, weather | ✅ v0.2 (day/night) | `src/city.js`, `src/game.js` |
| NPCs: pedestrians with behaviors | ✅ v0.1 | `src/npc.js` |
| Vehicle driving with distinct handling | ✅ v0.1 | `src/car.js` |
| Traffic AI: lane driving, braking, intersections | ✅ v0.2 | `src/traffic.js` |
| Wanted-level system with escalating police | ✅ v0.1 (1–3 stars, pursuit cruiser) | `src/game.js` |
| Radar/minimap with objective marker | ✅ v0.2 | `src/minimap.js` |
| Three protagonists, character switching | ✅ v0.1 (spawn/colors) | `src/game.js` |
| Mission system: objectives, markers, rewards | ✅ v0.3 (6 staged missions incl. heist + repo, free roam) | `src/missions.js` |
| Money economy | ✅ v0.1 (rewards, bust penalty) | `src/game.js` |
| Combat: shooting, health, armor | ⬜ Phase 3 | — |
| Special abilities (bullet time, driving focus, rage) | ⬜ Phase 3 | — |
| Businesses, properties, shops | ⬜ Phase 4 | — |
| Saving/loading progress | ⬜ Phase 4 | — |
| Multiplayer (join friends online) | ⬜ Phase 5 | — |

## Systems design

### City
A 5×5 road grid (`ROAD_LINES`) with sidewalks, procedurally placed buildings registered as collision AABBs, lane markings (instanced), street lamps, and a star field. Collision resolution is circle-vs-AABB push-out shared by players, cars, and NPCs.

### Traffic (v0.2)
Civilian cars spawn on road lines with right-hand lane offsets, cruise at randomized speeds, brake for anything ahead within a lookahead cone, turn at intersections (30% chance, with a turn cooldown), and U-turn at the map edge. Player, parked cars, police, fellow traffic, and the on-foot player are all obstacles.

### Wanted + police
Crimes (currently: hitting pedestrians) raise the wanted level (max ★★★). A police cruiser spawns when wanted, pursues and flashes its light bar, and arrests the player on foot (−$300, stars cleared). After 20 clean seconds per star, the heat decays and the cruiser despawns.

### Day/night (v0.2)
A 150-second cycle drives sun/hemisphere intensity, sky and fog color lerp, street lamp emissive glow, and car headlights.

### Missions
Data-driven mission definitions (`MISSIONS`): objective text, target marker, optional car requirement, optional time limit, money reward, fail/retry, and completion chains into free roam.

## Roadmap

- **v0.3 heist/repo missions**: “The North Yankton Job” mirrors the GTA V prologue structure — bank approach, cash-grab hold, instant 3-star alarm, getaway car sprint, timed escape to the safehouse — with falling snow during the job. “Repossession” mirrors Franklin’s repo job: a marked car spawns across town; steal it, deliver it to the dealership.

- **Phase 3 — Player power**: shooting raycast, health/armor, police gunfire escalation, character special abilities
- **Phase 4 — Economy**: shops, garages, property purchase, save/load via localStorage, GPS route drawing
- **Phase 5 — Scale & online**: bigger map chunks, interiors, multiplayer sessions with matchmaking
