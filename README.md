Pulse Rush
==========

Pulse Rush is a modified version of HexGL, the futuristic HTML5/WebGL racing game by Thibaut Despoulain.

Modified by Dean Concepcion.

Original project: https://github.com/BKcore/HexGL

## What changed

- Rebranded the playable shell from HexGL to Pulse Rush.
- Removed the original Google Analytics snippet and remote favicon metadata.
- Added a courier-contract story mode:
  - The player is delivering three pulse cores through a failing city grid.
  - Three glowing blue orb cores respawn across three relay levels.
  - Level 1 requires 3 cores before 1:00, Level 2 requires 6 total cores before 2:00, and Level 3 requires 9 total cores before 3:00.
  - Between relay levels, the ship docks at a start-line refill station that restores hull health and overdrive before the player chooses to continue.
  - The HUD tracks `CORES 0/3` progress.
  - The finish screen now gives a story consequence, contract result, delivered core count, crash count, rank, and next target.
- Added a lightweight ghost run:
  - The browser saves the latest run locally.
  - The next run shows a translucent blue ship following that previous path.
- Added an overdrive mechanic:
  - Drift with `Q`/`A` or `E`/`D` while moving to charge overdrive.
  - Hold `Space` to spend overdrive for a stabilized speed surge.
- Retuned overdrive to give a stronger speed illusion while damping drift/yaw so it stays controllable.
- Added an overdrive HUD meter.
- Added an orange vignette pulse while overdrive is active.
- Updated the credits screen to identify this as a modified version.

## Controls

- Arrow Up: accelerate
- Arrow Left / Arrow Right: steer
- Q or A: left air brake / drift for wider turns
- E or D: right air brake / drift for wider turns
- Spacebar: activate overdrive after charging it with drifts

## Run locally

From the project directory:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## License and attribution

The original HexGL project is licensed under the MIT License. The original copyright notice is preserved in `LICENSE`.

This version includes modifications for coursework/study. Do not submit it as if the original HexGL code was written from scratch.
