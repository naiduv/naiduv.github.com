(function () {
  "use strict";

  var OUTLINE = "#1e4d66";
  var SKY_TOP = "#a8d8ea";
  var SKY_BOTTOM = "#c9e9f2";
  var SUN = "#ffd028";
  var CLOUD = "#d4eef5";
  var CLOUD_HIGHLIGHT = "#eef8fc";
  var OCEAN_LIGHT = "#6ec4de";
  var OCEAN_MID = "#4aafd0";
  var OCEAN_DEEP = "#2f96b8";
  var FOAM = "#e8f7fb";
  var SAND = "#f2cf3a";
  var SAND_SHADOW = "#e0b92a";

  var DAY = {
    skyTop: "#a8d8ea",
    skyBottom: "#c9e9f2",
    sun: "#ffd028",
    cloud: "#d4eef5",
    cloudHi: "#eef8fc",
    oceanLight: "#6ec4de",
    oceanMid: "#4aafd0",
    oceanDeep: "#2f96b8",
    foam: "#e8f7fb",
    sand: "#f2cf3a",
    sandShadow: "#e0b92a",
    outline: "#1e4d66",
  };

  var NIGHT = {
    skyTop: "#070f1c",
    skyBottom: "#142438",
    sun: "#ffd028",
    cloud: "#243447",
    cloudHi: "#2f4258",
    oceanLight: "#1a4568",
    oceanMid: "#123552",
    oceanDeep: "#0d2840",
    foam: "#1a3a52",
    sand: "#6f5c38",
    sandShadow: "#4a3d24",
    outline: "#7a9cb5",
  };

  var SUNRISE_HOUR = 8;
  var SUNSET_HOUR = 20;
  var BEACH_OPEN_HOUR = 9;
  var BEACH_CLOSE_HOUR = 19;
  var TWILIGHT_HOURS = 0.75;

  var SKY_RATIO = 0.6;
  var OCEAN_SHARE = 0.39;

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
  var stars = [];
  var timeOfDay = {
    hours: 12,
    nightFactor: 0,
    sun: null,
  };

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

  function parseHex(hex) {
    var n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function lerpColor(from, to, amount) {
    var t = Math.max(0, Math.min(1, amount));
    var a = parseHex(from);
    var b = parseHex(to);
    var r = Math.round(a.r + (b.r - a.r) * t);
    var g = Math.round(a.g + (b.g - a.g) * t);
    var bl = Math.round(a.b + (b.b - a.b) * t);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }

  function getTimeOverride() {
    var search = window.location.search || "";
    if (!search) return null;

    var value = null;
    search.slice(1).split("&").some(function (part) {
      var pair = part.split("=");
      if (decodeURIComponent(pair[0]) === "time" && pair[1] !== undefined) {
        value = decodeURIComponent(pair[1]).replace(",", ".");
        return true;
      }
      return false;
    });

    if (value === null) return null;

    var parts = value.split(":");
    var hours = parts.length > 1
      ? parseFloat(parts[0]) + parseFloat(parts[1]) / 60
      : parseFloat(value);

    if (isNaN(hours)) return null;
    return ((hours % 24) + 24) % 24;
  }

  function getLocalHours() {
    var override = getTimeOverride();
    if (override !== null) return override;

    var now = new Date();
    return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  }

  function getNightFactor(hours) {
    if (hours >= SUNRISE_HOUR + TWILIGHT_HOURS && hours <= SUNSET_HOUR - TWILIGHT_HOURS) {
      return 0;
    }
    if (hours <= SUNRISE_HOUR - TWILIGHT_HOURS || hours >= SUNSET_HOUR + TWILIGHT_HOURS) {
      return 1;
    }
    if (hours < SUNRISE_HOUR + TWILIGHT_HOURS) {
      return 1 - (hours - (SUNRISE_HOUR - TWILIGHT_HOURS)) / (2 * TWILIGHT_HOURS);
    }
    return (hours - (SUNSET_HOUR - TWILIGHT_HOURS)) / (2 * TWILIGHT_HOURS);
  }

  function getSunPosition(hours) {
    if (hours < SUNRISE_HOUR || hours > SUNSET_HOUR) return null;

    var t = (hours - SUNRISE_HOUR) / (SUNSET_HOUR - SUNRISE_HOUR);
    var sunR = Math.max(28, width * 0.035);
    var arc = Math.sin(t * Math.PI);
    return {
      x: width * (0.06 + 0.88 * t),
      y: layout.horizon - arc * layout.horizon * 0.72 + sunR * 0.25,
      r: sunR,
      t: t,
    };
  }

  function applyPalette(nightFactor) {
    SKY_TOP = lerpColor(DAY.skyTop, NIGHT.skyTop, nightFactor);
    SKY_BOTTOM = lerpColor(DAY.skyBottom, NIGHT.skyBottom, nightFactor);
    SUN = lerpColor(DAY.sun, NIGHT.sun, nightFactor);
    CLOUD = lerpColor(DAY.cloud, NIGHT.cloud, nightFactor);
    CLOUD_HIGHLIGHT = lerpColor(DAY.cloudHi, NIGHT.cloudHi, nightFactor);
    OCEAN_LIGHT = lerpColor(DAY.oceanLight, NIGHT.oceanLight, nightFactor);
    OCEAN_MID = lerpColor(DAY.oceanMid, NIGHT.oceanMid, nightFactor);
    OCEAN_DEEP = lerpColor(DAY.oceanDeep, NIGHT.oceanDeep, nightFactor);
    FOAM = lerpColor(DAY.foam, NIGHT.foam, nightFactor);
    SAND = lerpColor(DAY.sand, NIGHT.sand, nightFactor);
    SAND_SHADOW = lerpColor(DAY.sandShadow, NIGHT.sandShadow, nightFactor);
    OUTLINE = lerpColor(DAY.outline, NIGHT.outline, nightFactor);
  }

  function updateTimeOfDay() {
    var hours = getLocalHours();
    var nightFactor = getNightFactor(hours);
    applyPalette(nightFactor);
    timeOfDay.hours = hours;
    timeOfDay.nightFactor = nightFactor;
    timeOfDay.sun = getSunPosition(hours);
    var nightText = hours > SUNSET_HOUR - 1 || hours <= SUNRISE_HOUR;
    document.body.classList.toggle("night-mode", nightText);
    document.body.style.background = SKY_BOTTOM;
  }

  function initStars() {
    stars = [];
    for (var i = 0; i < 90; i += 1) {
      stars.push({
        x: rand(0, width),
        y: rand(0, layout.horizon * 0.92),
        r: rand(0.6, 1.8),
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  function arePeopleOut() {
    var hours = timeOfDay.hours;
    return hours >= BEACH_OPEN_HOUR && hours < BEACH_CLOSE_HOUR;
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

    layout.horizon = height * SKY_RATIO;
    layout.shoreBase = height * (SKY_RATIO + (1 - SKY_RATIO) * OCEAN_SHARE);
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
    var amp = Math.max(14, height * 0.022);
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
        y: rand(height * 0.04, layout.horizon * 0.55),
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

    ctx.restore();
  }

  function drawSky(t) {
    var grad = ctx.createLinearGradient(0, 0, 0, layout.horizon);
    grad.addColorStop(0, SKY_TOP);
    grad.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, layout.horizon);

    if (timeOfDay.nightFactor > 0.08) {
      drawStars(t);
    }

    if (timeOfDay.nightFactor > 0.45) {
      drawMoon();
    }

    if (timeOfDay.sun) {
      drawSun(timeOfDay.sun);
    }
  }

  function drawStars(t) {
    var nf = timeOfDay.nightFactor;
    stars.forEach(function (star) {
      var twinkle = 0.55 + 0.45 * Math.sin(t * 1.8 + star.phase);
      ctx.globalAlpha = nf * twinkle * 0.9;
      ctx.fillStyle = "#f5f8ff";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawMoon() {
    var nf = timeOfDay.nightFactor;
    var moonR = Math.max(34, width * 0.045);
    var moonX = width * 0.74;
    var moonY = layout.horizon * 0.24;

    ctx.globalAlpha = Math.min(1, (nf - 0.35) * 1.4);
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fillStyle = "#eef3fa";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, width * 0.0018);
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();

    ctx.fillStyle = "rgba(130, 145, 170, 0.35)";
    ctx.beginPath();
    ctx.arc(moonX - moonR * 0.28, moonY - moonR * 0.12, moonR * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawSun(sun) {
    var edge = Math.min(sun.t, 1 - sun.t) * 3.5;
    var sunColor = lerpColor("#ffd028", "#ff8a3d", Math.max(0, 1 - edge));
    var glow = Math.max(0, 1 - edge * 0.85);

    if (glow > 0.05) {
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, sun.r * (2.2 + glow), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 170, 70, " + (0.08 + glow * 0.14) + ")";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2);
    ctx.fillStyle = sunColor;
    ctx.fill();
    ctx.lineWidth = Math.max(2, width * 0.0025);
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }

  function waveY(x, layer, t) {
    var oceanH = layout.shoreBase - layout.horizon;
    var amp = 3 + layer * 2.5;
    var freq = 0.004 + layer * 0.0015;
    var speed = 0.7 + layer * 0.35;
    var layerStep = oceanH * 0.28;
    return layout.horizon + layer * layerStep + Math.sin(x * freq + t * speed) * amp + Math.sin(x * freq * 2.1 - t * speed * 0.6) * (amp * 0.35);
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
        for (var x2 = width; x2 >= 0; x2 -= 8) {
          ctx.lineTo(x2, coastY(x2, t) + layer.offset * 4);
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
    for (var fx2 = width; fx2 >= 0; fx2 -= 5) {
      ctx.lineTo(fx2, sandYAt(fx2, t) - 2);
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
    for (var x2 = width; x2 >= 0; x2 -= 6) {
      ctx.lineTo(x2, sandYAt(x2, t) + 28);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawPalmFrond(originX, originY, angle, length, leafColor, leafDark) {
    var dx = Math.cos(angle);
    var dy = Math.sin(angle);
    var px = -dy;
    var py = dx;
    var maxW = length * 0.14;
    var gravity = length * 0.28;

    var tipX = dx * length;
    var tipY = dy * length + gravity;
    var mx = dx * length * 0.5;
    var my = dy * length * 0.5 + gravity * 0.12;

    ctx.save();
    ctx.translate(originX, originY);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(mx + px * maxW, my + py * maxW, tipX, tipY);
    ctx.quadraticCurveTo(mx - px * maxW, my - py * maxW, 0, 0);
    ctx.closePath();
    ctx.fillStyle = leafColor;
    ctx.fill();
    ctx.lineWidth = Math.max(1.3, width * 0.0014);
    ctx.lineJoin = "round";
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(mx, my, tipX, tipY);
    ctx.lineWidth = Math.max(1, width * 0.0011);
    ctx.strokeStyle = leafDark;
    ctx.stroke();

    ctx.restore();
  }

  function drawPalm(x, groundY, scale, lean) {
    var s = scale * Math.max(0.75, height / 950);
    var trunkH = 195 * s;
    var baseW = 9 * s;
    var topW = 5 * s;
    var bend = lean * 55 * s;
    var nf = timeOfDay.nightFactor;
    var trunkColor = lerpColor("#a06a3a", "#4a3520", nf);
    var leafColor = lerpColor("#5aa832", "#1a4533", nf);
    var leafDark = lerpColor("#3f8f26", "#143628", nf);
    var crownX = bend;
    var crownY = -trunkH;
    var fronds = [
      { angle: -3.05, len: 1.0 },
      { angle: -2.68, len: 1.12 },
      { angle: -2.32, len: 1.18 },
      { angle: -1.96, len: 1.12 },
      { angle: -1.62, len: 0.95 },
      { angle: -1.28, len: 1.12 },
      { angle: -0.92, len: 1.18 },
      { angle: -0.56, len: 1.12 },
      { angle: -0.16, len: 1.0 },
    ];
    var i;

    ctx.save();
    ctx.translate(x, groundY);

    fillAndStroke(function () {
      ctx.moveTo(-baseW, 0);
      ctx.quadraticCurveTo(-baseW * 0.4 + bend * 0.5, -trunkH * 0.5, crownX - topW, crownY);
      ctx.lineTo(crownX + topW, crownY);
      ctx.quadraticCurveTo(baseW * 0.9 + bend * 0.5, -trunkH * 0.5, baseW, 0);
      ctx.closePath();
    }, trunkColor);

    for (i = 0; i < fronds.length; i += 1) {
      drawPalmFrond(
        crownX,
        crownY,
        fronds[i].angle,
        92 * s * fronds[i].len,
        leafColor,
        leafDark
      );
    }

    ctx.restore();
  }

  function palmGroundY(yOffset) {
    var sandH = height - layout.shoreBase;
    return layout.shoreBase + sandH * (0.4 + (yOffset || 0));
  }

  var PALM_SPECS = [
    { x: 0.045, scale: 1.05, lean: -0.15, yOff: 0 },
    { x: 0.105, scale: 0.72, lean: -0.1, yOff: 0.05 },
    { x: 0.955, scale: 1.05, lean: 0.15, yOff: 0 },
    { x: 0.895, scale: 0.74, lean: 0.1, yOff: 0.04 },
  ];

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
    if (!arePeopleOut()) return;
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
    if (!arePeopleOut()) return null;

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
    if (!arePeopleOut()) return;

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

  function characterFeetY(c) {
    var s = characterScale(c);
    var sitting = c.kind === "sitter" && c.state !== "fleeing";
    return c.y + (sitting ? 10 : 18) * s;
  }

  function drawActors() {
    var items = [];

    PALM_SPECS.forEach(function (spec) {
      var px = width * spec.x;
      var groundY = palmGroundY(spec.yOff);
      items.push({
        baseY: groundY,
        render: function () {
          drawPalm(px, groundY, spec.scale, spec.lean);
        },
      });
    });

    if (arePeopleOut()) {
      characters.forEach(function (c) {
        if (c.state === "gone") return;
        items.push({
          baseY: characterFeetY(c),
          render: function () {
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
          },
        });
      });
    }

    items.sort(function (a, b) {
      return a.baseY - b.baseY;
    });

    items.forEach(function (item) {
      item.render();
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
        cloud.y = rand(height * 0.04, layout.horizon * 0.55);
      }
      drawCloud(cloud.x, cloud.y, cloud.scale);
    });
  }

  function draw(t) {
    drawSky(t);
    drawClouds(t);
    drawOcean(t);
    drawSand(t);
    drawTowels();
    drawActors();
  }

  var last = performance.now();

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;

    updateTimeOfDay();
    updateCharacters(dt);
    ctx.clearRect(0, 0, width, height);
    draw(time);

    requestAnimationFrame(frame);
  }

  function boot() {
    resize();
    initCoastline();
    initStars();
    initClouds();
    initTowels();
    initCharacters();
    updateTimeOfDay();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", function () {
    resize();
    initCoastline();
    initStars();
    initClouds();
    initTowels();
    initCharacters();
  });

  boot();
})();
