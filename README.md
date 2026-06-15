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
  - Each completed lap delivers one core.
  - The HUD tracks `CORES 0/3` progress.
  - The finish screen now gives a contract result, delivered core count, crash count, rank, and next target.
- Added an overdrive mechanic:
  - Drift with `Q`/`A` or `E`/`D` while moving to charge overdrive.
  - Hold `Space` or `Shift` to spend overdrive for a temporary speed surge.
- Increased overdrive impact so it creates a meaningful speed burst.
- Added an overdrive HUD meter.
- Added an orange vignette pulse while overdrive is active.
- Updated the credits screen to identify this as a modified version.

## Controls

- Arrow Up: accelerate
- Arrow Left / Arrow Right: steer
- Q or A: left air brake / drift
- E or D: right air brake / drift
- Space or Shift: overdrive

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
