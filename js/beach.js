(function () {
  "use strict";

  var OUTLINE = "#1e4d66";
  var SKY_TOP = "#a8d8ea";
  var SKY_BOTTOM = "#c9e9f2";
  var SUN = "#ffd028";
  var CLOUD = "#d4eef5";
  var CLOUD_HIGHLIGHT = "#eef8fc";
  var CLOUD_OUTLINE = "rgba(130, 170, 195, 0.45)";
  var OCEAN_LIGHT = "#6ec4de";
  var OCEAN_MID = "#4aafd0";
  var OCEAN_DEEP = "#2f96b8";
  var FOAM = "#e8f7fb";
  var SAND = "#f2cf3a";
  var SAND_SHADOW = "#e0b92a";

  var SHIRT_COLORS = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#ff8fab", "#95e1d3", "#f38181"];
  var SHORT_COLORS = ["#3d6d88", "#2a5268", "#5a8fad", "#234563"];
  var TOWEL_COLORS = [
    ["#ff6b6b", "#ffffff"],
    ["#4ecdc4", "#ffffff"],
    ["#ff8fab", "#ffe66d"],
    ["#7ec8e0", "#ffffff"],
  ];
  var HAT_COLORS = ["#f2cf3a", "#ff6b6b", "#4ecdc4", "#ffffff", "#ff8fab", "#3d6d88", "#ffe66d"];
  var HAT_TYPES = ["sun", "cap", "bucket"];
  var PERSON_SIZE = 0.5;
  var TOWEL_SIZE = 0.5;

  var canvas = document.getElementById("scene");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var width = 0;
  var height = 0;
  var dpr = 1;
  var time = 0;

  var layout = {
    horizon: 0,
    shoreBase: 0,
  };

  var coastSeeds = [];

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function randomHat() {
    if (Math.random() > 0.42) return null;
    return {
      type: pick(HAT_TYPES),
      color: pick(HAT_COLORS),
    };
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    layout.horizon = height * 0.34;
    layout.shoreBase = height * 0.6;
  }

  function initCoastline() {
    coastSeeds = [];
    var count = Math.max(10, Math.floor(width / 140));
    for (var i = 0; i < count; i += 1) {
      coastSeeds.push({
        x: (i / Math.max(1, count - 1)) * width,
        offset: rand(-1, 1),
        width: rand(90, 240),
      });
    }
  }

  function coastY(x, t) {
    var base = layout.shoreBase;
    var amp = Math.max(24, height * 0.034);
    var y = base;

    y += Math.sin(x * 0.0026 + 1.1) * amp * 0.55;
    y += Math.sin(x * 0.0072 + 0.35) * amp * 0.32;
    y += Math.cos(x * 0.0011 + 2.6) * amp * 0.42;

    coastSeeds.forEach(function (seed) {
      var dx = x - seed.x;
      y += seed.offset * amp * 0.22 * Math.exp(-(dx * dx) / (2 * seed.width * seed.width));
    });

    y += Math.sin(x * 0.021 + t * 1.25) * 5.5;
    y += Math.sin(x * 0.036 - t * 0.85) * 3;
    y += Math.sin(x * 0.055 + t * 0.5) * 1.5;

    return y;
  }

  function sandYAt(x, t) {
    return coastY(x, t) + 14 + Math.sin(x * 0.012 + 0.8) * 2;
  }

  function strokePath(drawFn, lineWidth) {
    ctx.beginPath();
    drawFn();
    ctx.lineWidth = lineWidth || Math.max(2, width * 0.0025);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }

  function fillAndStroke(drawFn, fill) {
    ctx.beginPath();
    drawFn();
    ctx.fillStyle = fill;
    ctx.fill();
    strokePath(drawFn);
  }

  var clouds = [];
  var towels = [];

  function initClouds() {
    clouds = [];
    for (var i = 0; i < 7; i += 1) {
      clouds.push({
        x: rand(0, width),
        y: rand(height * 0.04, height * 0.22),
        scale: rand(0.55, 1.15),
        speed: rand(8, 22),
      });
    }
  }

  function drawCloud(x, y, scale) {
    var s = scale * Math.max(1, width / 900);
    var puffs = [
      [-38, 8, 34, 22],
      [-8, 0, 38, 26],
      [34, 10, 32, 20],
      [62, 18, 24, 16],
    ];

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    ctx.fillStyle = CLOUD;
    puffs.forEach(function (p) {
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], p[2], p[3], 0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = CLOUD_HIGHLIGHT;
    ctx.beginPath();
    ctx.ellipse(-10, -4, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = Math.max(1.2, width * 0.0016);
    ctx.lineCap = "round";
    ctx.strokeStyle = CLOUD_OUTLINE;
    puffs.forEach(function (p) {
      ctx.beginPath();
      ctx.ellipse(p[0], p[1], p[2], p[3], 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.restore();
  }

  function drawSky() {
    var grad = ctx.createLinearGradient(0, 0, 0, layout.horizon);
    grad.addColorStop(0, SKY_TOP);
    grad.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, layout.horizon);

    var sunR = Math.max(28, width * 0.035);
    var sunX = width * 0.68;
    var sunY = height * 0.1;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fillStyle = SUN;
    ctx.fill();
    ctx.lineWidth = Math.max(2, width * 0.0025);
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }

  function waveY(x, layer, t) {
    var amp = 6 + layer * 4;
    var freq = 0.004 + layer * 0.0015;
    var speed = 0.7 + layer * 0.35;
    return layout.horizon + layer * 18 + Math.sin(x * freq + t * speed) * amp + Math.sin(x * freq * 2.1 - t * speed * 0.6) * (amp * 0.35);
  }

  function drawOcean(t) {
    var layers = [
      { color: OCEAN_DEEP, offset: 0 },
      { color: OCEAN_MID, offset: 1 },
      { color: OCEAN_LIGHT, offset: 2 },
    ];

    layers.forEach(function (layer) {
      fillAndStroke(function () {
        ctx.moveTo(0, waveY(0, layer.offset, t));
        for (var x = 8; x <= width; x += 8) {
          ctx.lineTo(x, waveY(x, layer.offset, t));
        }
        for (x = width; x >= 0; x -= 8) {
          ctx.lineTo(x, coastY(x, t) + layer.offset * 4);
        }
        ctx.closePath();
      }, layer.color);
    });

    ctx.fillStyle = FOAM;
    ctx.beginPath();
    for (var fx = 0; fx <= width; fx += 5) {
      var top = coastY(fx, t) + Math.sin(fx * 0.028 + t * 1.4) * 4 + Math.sin(fx * 0.011 - t * 0.7) * 2;
      if (fx === 0) ctx.moveTo(0, top);
      else ctx.lineTo(fx, top);
    }
    for (fx = width; fx >= 0; fx -= 5) {
      ctx.lineTo(fx, sandYAt(fx, t) - 2);
    }
    ctx.closePath();
    ctx.fill();
    strokePath(function () {
      ctx.moveTo(0, coastY(0, t));
      for (var fx = 8; fx <= width; fx += 5) {
        ctx.lineTo(fx, coastY(fx, t) + Math.sin(fx * 0.028 + t * 1.4) * 3);
      }
    }, Math.max(1.5, width * 0.0018));
  }

  function drawSand(t) {
    fillAndStroke(function () {
      ctx.moveTo(0, sandYAt(0, t));
      for (var x = 6; x <= width; x += 6) {
        ctx.lineTo(x, sandYAt(x, t));
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
    }, SAND);

    ctx.fillStyle = SAND_SHADOW;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.moveTo(0, sandYAt(0, t) + 8);
    for (var x = 6; x <= width; x += 6) {
      ctx.lineTo(x, sandYAt(x, t) + 8);
    }
    for (x = width; x >= 0; x -= 6) {
      ctx.lineTo(x, sandYAt(x, t) + 28);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function initTowels() {
    towels = [];
    var sandH = height - layout.shoreBase;
    var specs = [
      { x: 0.34, y: 0.28, w: 0.11, h: 0.055, rot: 0.12 },
      { x: 0.58, y: 0.42, w: 0.1, h: 0.05, rot: -0.18 },
      { x: 0.76, y: 0.3, w: 0.095, h: 0.048, rot: 0.08 },
      { x: 0.48, y: 0.62, w: 0.105, h: 0.052, rot: -0.05 },
    ];

    specs.forEach(function (spec, i) {
      var colors = TOWEL_COLORS[i % TOWEL_COLORS.length];
      var tx = width * spec.x;
      towels.push({
        x: tx,
        y: sandYAt(tx, 0) + 18 + sandH * spec.y * 0.35,
        w: width * spec.w * TOWEL_SIZE,
        h: width * spec.h * TOWEL_SIZE,
        rot: spec.rot,
        c1: colors[0],
        c2: colors[1],
      });
    });
  }

  function drawTowel(towel) {
    var r = Math.min(towel.w, towel.h) * 0.12;
    var stripes = 5;

    ctx.save();
    ctx.translate(towel.x, towel.y);
    ctx.rotate(towel.rot);

    fillAndStroke(function () {
      ctx.moveTo(-towel.w / 2 + r, -towel.h / 2);
      ctx.lineTo(towel.w / 2 - r, -towel.h / 2);
      ctx.quadraticCurveTo(towel.w / 2, -towel.h / 2, towel.w / 2, -towel.h / 2 + r);
      ctx.lineTo(towel.w / 2, towel.h / 2 - r);
      ctx.quadraticCurveTo(towel.w / 2, towel.h / 2, towel.w / 2 - r, towel.h / 2);
      ctx.lineTo(-towel.w / 2 + r, towel.h / 2);
      ctx.quadraticCurveTo(-towel.w / 2, towel.h / 2, -towel.w / 2, towel.h / 2 - r);
      ctx.lineTo(-towel.w / 2, -towel.h / 2 + r);
      ctx.quadraticCurveTo(-towel.w / 2, -towel.h / 2, -towel.w / 2 + r, -towel.h / 2);
      ctx.closePath();
    }, towel.c1);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-towel.w / 2 + r, -towel.h / 2);
    ctx.lineTo(towel.w / 2 - r, -towel.h / 2);
    ctx.quadraticCurveTo(towel.w / 2, -towel.h / 2, towel.w / 2, -towel.h / 2 + r);
    ctx.lineTo(towel.w / 2, towel.h / 2 - r);
    ctx.quadraticCurveTo(towel.w / 2, towel.h / 2, towel.w / 2 - r, towel.h / 2);
    ctx.lineTo(-towel.w / 2 + r, towel.h / 2);
    ctx.quadraticCurveTo(-towel.w / 2, towel.h / 2, -towel.w / 2, towel.h / 2 - r);
    ctx.lineTo(-towel.w / 2, -towel.h / 2 + r);
    ctx.quadraticCurveTo(-towel.w / 2, -towel.h / 2, -towel.w / 2 + r, -towel.h / 2);
    ctx.closePath();
    ctx.clip();

    var stripeW = towel.w / stripes;
    for (var i = 0; i < stripes; i += 1) {
      if (i % 2 === 1) {
        ctx.fillStyle = towel.c2;
        ctx.fillRect(-towel.w / 2 + i * stripeW, -towel.h / 2, stripeW + 1, towel.h);
      }
    }
    ctx.restore();
    ctx.restore();
  }

  function drawTowels() {
    towels.forEach(drawTowel);
  }

  function characterScale(c) {
    return c.scale * PERSON_SIZE * Math.max(0.7, width / 1100);
  }

  function characterBounds(c) {
    var s = characterScale(c);
    var sitting = c.kind === "sitter" && c.state !== "fleeing";
    var bob = sitting ? Math.sin(time * 1.5) * 1.5 : 0;
    var cy = c.y + bob;
    var hatPad = c.hat ? (c.hat.type === "sun" ? 52 : 48) : 40;

    return {
      left: c.x - 18 * s,
      right: c.x + 18 * s,
      top: cy - hatPad * s,
      bottom: cy + 22 * s,
    };
  }

  function hitTestCharacter(px, py) {
    var hit = null;
    characters
      .slice()
      .sort(function (a, b) {
        return b.y - a.y;
      })
      .some(function (c) {
        if (c.state === "gone") return false;
        var b = characterBounds(c);
        if (px >= b.left && px <= b.right && py >= b.top && py <= b.bottom) {
          hit = c;
          return true;
        }
        return false;
      });
    return hit;
  }

  function fleeCharacter(c, clickX) {
    if (c.state === "fleeing") return;
    c.state = "fleeing";
    c.kind = "walker";
    c.pause = 0;
    c.speed = rand(210, 290);
    c.facing = clickX >= c.x ? -1 : 1;
  }

  function drawHat(s, hat) {
    if (!hat) return;

    var headY = -34 * s;

    if (hat.type === "sun") {
      fillAndStroke(function () {
        ctx.ellipse(0, headY - 2 * s, 18 * s, 5 * s, 0, 0, Math.PI * 2);
      }, hat.color);
      fillAndStroke(function () {
        ctx.arc(0, headY - 6 * s, 8 * s, Math.PI, 0);
        ctx.closePath();
      }, hat.color);
    } else if (hat.type === "cap") {
      fillAndStroke(function () {
        ctx.arc(0, headY - 4 * s, 9 * s, Math.PI, 0);
        ctx.closePath();
      }, hat.color);
      fillAndStroke(function () {
        ctx.ellipse(5 * s, headY - 1 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2);
      }, hat.color);
    } else {
      fillAndStroke(function () {
        ctx.rect(-8 * s, headY - 18 * s, 16 * s, 12 * s);
      }, hat.color);
      fillAndStroke(function () {
        ctx.ellipse(0, headY - 6 * s, 9 * s, 3 * s, 0, 0, Math.PI * 2);
      }, hat.color);
    }
  }

  function drawStickPerson(x, y, scale, facing, walkPhase, sitting, shirt, shorts, hat) {
    var s = scale * PERSON_SIZE * Math.max(0.7, width / 1100);
    var bob = sitting ? Math.sin(time * 1.5) * 1.5 : 0;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(facing, 1);

    var headR = 9 * s;
    fillAndStroke(function () {
      ctx.arc(0, -34 * s, headR, 0, Math.PI * 2);
    }, "#f7d7b5");

    drawHat(s, hat);

    fillAndStroke(function () {
      ctx.rect(-7 * s, -24 * s, 14 * s, 18 * s);
    }, shirt);

    fillAndStroke(function () {
      ctx.rect(-8 * s, -8 * s, 16 * s, 10 * s);
    }, shorts);

    ctx.lineWidth = Math.max(2.5, width * 0.0022);
    ctx.strokeStyle = OUTLINE;
    ctx.lineCap = "round";

    if (sitting) {
      ctx.beginPath();
      ctx.moveTo(-5 * s, 2 * s);
      ctx.lineTo(-14 * s, 10 * s);
      ctx.moveTo(5 * s, 2 * s);
      ctx.lineTo(12 * s, 10 * s);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-6 * s, -18 * s);
      ctx.lineTo(-16 * s, -10 * s);
      ctx.moveTo(6 * s, -18 * s);
      ctx.lineTo(18 * s, -8 * s);
      ctx.stroke();
    } else {
      var swing = Math.sin(walkPhase) * 0.55;
      ctx.beginPath();
      ctx.moveTo(-5 * s, 2 * s);
      ctx.lineTo(-5 * s + Math.sin(swing) * 10 * s, 18 * s);
      ctx.moveTo(5 * s, 2 * s);
      ctx.lineTo(5 * s - Math.sin(swing) * 10 * s, 18 * s);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-6 * s, -18 * s);
      ctx.lineTo(-6 * s + Math.sin(swing + 0.8) * 8 * s, -4 * s);
      ctx.moveTo(6 * s, -18 * s);
      ctx.lineTo(6 * s - Math.sin(swing + 0.8) * 8 * s, -4 * s);
      ctx.stroke();
    }

    ctx.restore();
  }

  var characters = [];

  function initCharacters() {
    characters = [];

    for (var w = 0; w < 5; w += 1) {
      var wx = rand(width * 0.1, width * 0.9);
      characters.push({
        kind: "walker",
        x: wx,
        y: sandYAt(wx, 0) + rand(24, (height - layout.shoreBase) * 0.45),
        scale: rand(0.85, 1.15),
        facing: Math.random() > 0.5 ? 1 : -1,
        speed: rand(18, 42),
        walkPhase: rand(0, Math.PI * 2),
        shirt: pick(SHIRT_COLORS),
        shorts: pick(SHORT_COLORS),
        pause: rand(0, 2),
        state: "idle",
        hat: randomHat(),
      });
    }

    for (var s = 0; s < 3; s += 1) {
      var towel = towels[s % towels.length];
      characters.push({
        kind: "sitter",
        x: towel ? towel.x + rand(-12, 12) : rand(width * 0.25, width * 0.88),
        y: towel ? towel.y + rand(-6, 10) : sandYAt(rand(width * 0.25, width * 0.88), 0) + rand(40, (height - layout.shoreBase) * 0.4),
        scale: rand(0.9, 1.2),
        facing: Math.random() > 0.5 ? 1 : -1,
        shirt: pick(SHIRT_COLORS),
        shorts: pick(SHORT_COLORS),
        state: "idle",
        hat: randomHat(),
      });
    }
  }

  function updateCharacters(dt) {
    characters = characters.filter(function (c) {
      if (c.state === "fleeing") {
        c.x += c.facing * c.speed * dt;
        c.walkPhase = (c.walkPhase || 0) + dt * 14;
        return c.x > -60 && c.x < width + 60;
      }

      if (c.kind !== "walker") return true;

      if (c.pause > 0) {
        c.pause -= dt;
        return true;
      }

      c.x += c.facing * c.speed * dt;
      c.walkPhase += dt * 8;

      if (c.x < width * 0.04) {
        c.x = width * 0.04;
        c.facing = 1;
        if (Math.random() < 0.25) c.pause = rand(0.5, 2.5);
      } else if (c.x > width * 0.96) {
        c.x = width * 0.96;
        c.facing = -1;
        if (Math.random() < 0.25) c.pause = rand(0.5, 2.5);
      } else if (Math.random() < 0.002) {
        c.facing *= -1;
        if (Math.random() < 0.35) c.pause = rand(0.4, 1.8);
      }

      return true;
    });
  }

  function drawCharacters() {
    characters
      .slice()
      .sort(function (a, b) {
        return a.y - b.y;
      })
      .forEach(function (c) {
        if (c.state === "gone") return;
        drawStickPerson(
          c.x,
          c.y,
          c.scale,
          c.facing,
          c.walkPhase || 0,
          c.kind === "sitter" && c.state !== "fleeing",
          c.shirt,
          c.shorts,
          c.hat
        );
      });
  }

  function isOverlayElement(element) {
    return element && element.closest && element.closest(".overlay-left, .overlay-links, .overlay a");
  }

  function onCanvasClick(event) {
    if (isOverlayElement(event.target)) return;

    var rect = canvas.getBoundingClientRect();
    var px = event.clientX - rect.left;
    var py = event.clientY - rect.top;
    var hit = hitTestCharacter(px, py);
    if (hit) fleeCharacter(hit, px);
  }

  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener(
    "touchstart",
    function (event) {
      if (event.touches.length !== 1 || isOverlayElement(event.target)) return;
      var touch = event.touches[0];
      var rect = canvas.getBoundingClientRect();
      var hit = hitTestCharacter(touch.clientX - rect.left, touch.clientY - rect.top);
      if (hit) {
        event.preventDefault();
        fleeCharacter(hit, touch.clientX - rect.left);
      }
    },
    { passive: false }
  );

  function drawClouds(t) {
    clouds.forEach(function (cloud) {
      cloud.x += cloud.speed * (1 / 60);
      if (cloud.x > width + 120) {
        cloud.x = -120;
        cloud.y = rand(height * 0.04, height * 0.22);
      }
      drawCloud(cloud.x, cloud.y, cloud.scale);
    });
  }

  function draw(t) {
    drawSky();
    drawClouds(t);
    drawOcean(t);
    drawSand(t);
    drawTowels();
    drawCharacters();
  }

  var last = performance.now();

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    updateCharacters(dt);
    ctx.clearRect(0, 0, width, height);
    draw(time);

    requestAnimationFrame(frame);
  }

  function boot() {
    resize();
    initCoastline();
    initClouds();
    initTowels();
    initCharacters();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", function () {
    resize();
    initCoastline();
    initClouds();
    initTowels();
    initCharacters();
  });

  boot();
})();
