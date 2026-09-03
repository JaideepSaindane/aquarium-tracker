# T-014 — Photo capture and quality gate

**Phase 1 · Depends on: T-010 (thresholds tuned against T-002's photo set) · Size: 1 day**

*Updated 2026-08-31 for the web pivot: `expo-camera` is replaced by a browser file input; quality-gate logic runs client-side in JavaScript instead of native code, but the checks themselves are unchanged.*

## Goal

A capture screen that guides someone to take a usable photo of their tank, and rejects a bad one before it costs an AI call.

## Why

A confident wrong report costs more than a retake. Aquarium glass produces glare, reflections and colour casts that defeat vision models, and most users photograph tanks with the room light on and the flash firing — the two worst things they can do. Catching this client-side is free; catching it after the model has hallucinated a report is not.

## In scope

- `<input type="file" accept="image/*" capture="environment">` for capture — this opens the phone's native camera UI directly on mobile browsers, with a framing instruction shown above/below it in-app ("Stand square to the front glass, room light off"). No custom in-browser camera viewfinder for v1 (see `docs/01-architecture.md`).
- The same file input, without `capture`, doubles as "choose from library" — offer both explicitly as two buttons/options.
- **Client-side quality checks before upload**, run against the image using the Canvas API (draw to canvas, read pixel data):
  - Blur detection (variance of Laplacian or similar, computed over the canvas pixel data)
  - Brightness — reject too dark and blown-out
  - Large specular highlights, which indicate flash or lamp reflection off the glass
  - Frame fill — reject if the tank occupies too little of the frame
- On failure: a specific, kind message naming the actual problem and offering retake. "Too much glare — try turning off the room light and shooting straight through the front glass" rather than "invalid image".
- Downscale to ~1024px longest edge (Canvas API) before upload; keep the full-resolution original in the browser's local storage for the photo gallery, subject to the same OPFS persistence as everything else (T-011).
- Permission handling: browsers show their own camera-access prompt when `capture="environment"` is used, so there is no separate custom permission-explanation screen needed the way there was on native — but do explain in a line of copy *before* tapping the button, since an unexpected camera prompt still feels intrusive.

## Out of scope

Sending anything to the AI (T-015). Video. Filters or editing. A live in-browser viewfinder (`getUserMedia`) — explicitly rejected for v1, see `docs/01-architecture.md`.

## Acceptance criteria

1. Taking a normal photo of a tank passes the quality gate.
2. Photographing a wall in a dark room is rejected with a message that names darkness as the problem.
3. Photographing with the flash on into the glass is rejected with a message that names glare.
4. A deliberately blurry photo is rejected as blurry.
5. Tapping "choose from library" works as an alternative to the camera on both Android and iOS.
6. The uploaded image is roughly 1024px on its longest side; the original is retained in local storage at full size.
7. On a real phone, backgrounding the browser mid-capture (e.g. to answer a call) and returning does not lose the in-progress photo more than the browser's own file-input behaviour would anyway — verify this is not worse than expected on both Android Chrome and iOS Safari.

## Notes for Claude Code

Tune the thresholds against the 50 real photos collected in T-002. Some of those are deliberately bad and are exactly the right test set — a gate that rejects half of the genuinely usable ones is worse than no gate at all. Report the false-rejection rate on that set. Test on real Android and iOS phone browsers, not just desktop — file input and Canvas performance can differ.
