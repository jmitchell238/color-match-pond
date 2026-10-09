# Color Match Pond

Drag pond animals onto the lily pad of the same color. A gentle color-matching game for ages 4–6.

Play at https://jmitchell238.github.io/color-match-pond/. It's one of the games in [Arcade Hub](https://jmitchell238.github.io/arcade-hub/).

## Modes

| Mode | Colors | Rounds |
|------|--------|--------|
| Free Play | 2 | Endless |
| Easy | 3 | 5 |
| A Little More | 4 | 8 |
| Full Pond | 6 | 10 |

Dropping an animal on the wrong pad sends it bouncing back with a hint. There's no fail screen. If nothing happens for a few seconds, the right pad starts to glow.

## Running locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. The service worker needs `localhost` or HTTPS.

Plain HTML, CSS and canvas with no build step. Installable as a PWA.

## Tests

```bash
node tests/run.mjs
```

## Versioning

When you bump `GAME_VERSION` in `js/config.js`, set `CACHE` in `sw.js` to `'color-match-pond-' + GAME_VERSION`.

## License

Personal project for the family.
