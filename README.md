# naiduv.github.com

A calm animated beach portfolio — drifting clouds, rolling waves, and cartoon characters wandering the sand.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

## Day / night testing

The scene follows your local time (sunrise ~6:00, sunset ~20:00). Override it with a `time` query param:

```
http://localhost:8080/?time=21
file:///Users/you/projects/naiduv.github.com/index.html?time=21
```

Examples: `?time=12` (noon, beach busy), `?time=8` (morning, empty beach), `?time=21` (night). Omit the param to use real time.

People and towels appear on the sand from **9:00 AM to 7:00 PM** only (sky still follows sunrise/sunset).

## Customize

Edit `js/beach.js` — colors, cloud count, wave speed, character count, and beach props.
