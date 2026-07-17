import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getRandomFact, prefetchFacts } from "./facts.js";

const LOCATIONS = [
  {
    id: "mumbai",
    name: "Mumbai, India",
    lat: 19.076,
    lng: 72.8777,
    color: 0xff9933,
    period: "1985–1987",
    role: "Early childhood",
    description: "First years in India before moving to Kuwait.",
  },
  {
    id: "chennai",
    name: "Chennai, India",
    lat: 13.0827,
    lng: 80.2707,
    color: 0xfb923c,
    period: "1990–1993",
    role: "Childhood",
    description: "Returned to India between stints in Kuwait before heading back to the Gulf.",
  },
  {
    id: "kuwait",
    name: "Kuwait",
    lat: 29.3759,
    lng: 47.9774,
    color: 0x2dd4bf,
    period: "1987–1990 · 1993–2003",
    role: "Childhood & adolescence",
    description:
      "Lived in Kuwait through two stretches from childhood into early adulthood, before university in the United States.",
  },
  {
    id: "arlington",
    name: "Arlington, TX",
    lat: 32.7357,
    lng: -97.1081,
    color: 0x4ade80,
    period: "Undergraduate",
    role: "B.S. Electrical Engineering — UT Arlington",
    description:
      "Bachelor's in Electrical Engineering with a Computer Science minor. President of the Honors College Council; C++ specialization.",
  },
  {
    id: "seattle",
    name: "Seattle, WA",
    lat: 47.6062,
    lng: -122.3321,
    color: 0x22d3ee,
    period: "Graduate School",
    role: "M.S. Electrical Engineering — University of Washington",
    description:
      "Fully funded via research, teaching assistantship, and NSF fellowship. Research assistant on Google PageRank algorithms; built a 3D microstructure modeling app in C++/MFC.",
  },
  {
    id: "sanfrancisco",
    name: "San Francisco, CA",
    lat: 37.7749,
    lng: -122.4194,
    color: 0xe879f9,
    period: "2011 – 2013",
    role: "Software Engineer — BitTorrent",
    description:
      "Developed features and fixed bugs for BitTorrent and µTorrent Windows apps serving 200M+ users. Debugged with WinDbg across C++, Windows API, and MFC.",
  },
  {
    id: "louisville",
    name: "Louisville, KY",
    lat: 38.2527,
    lng: -85.7585,
    color: 0xfbbf24,
    period: "2015 – Present",
    role: "Senior Engineer & Team Lead",
    description:
      "Home base. Genscape (real-time messaging, PostgreSQL migrations), ZirMed, Heartland Payment Systems, Sullivan University instructor, and remote leadership roles at LiquidX, Stem, and Resilio.",
  },
];

const GLOBE_RADIUS = 2;
const MARKER_SIZE = 0.06;
const WANDERER_COLORS = [0x22d3ee, 0xe879f9, 0xfbbf24, 0x4ade80, 0xffffff, 0x93c5fd];
const WANDERER_COUNT = 128;

const canvas = document.getElementById("globe");
const tooltip = document.getElementById("tooltip");
const tooltipCity = document.getElementById("tooltip-city");
const tooltipPeriod = document.getElementById("tooltip-period");
const tooltipRole = document.getElementById("tooltip-role");
const tooltipDesc = document.getElementById("tooltip-desc");
const tooltipFactTitle = document.getElementById("tooltip-fact-title");
const tooltipFactText = document.getElementById("tooltip-fact-text");
const tooltipFactLink = document.getElementById("tooltip-fact-link");
const tooltipIcon = document.getElementById("tooltip-icon");
const coordsEl = document.getElementById("coords");
const legendEl = document.getElementById("legend");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.5, 5.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3.2;
controls.maxDistance = 8;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;

scene.add(new THREE.AmbientLight(0x334155, 0.8));
const keyLight = new THREE.DirectionalLight(0x22d3ee, 1.2);
keyLight.position.set(5, 3, 5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xe879f9, 0.5);
rimLight.position.set(-4, -2, -3);
scene.add(rimLight);

createStarfield();
const globeGroup = new THREE.Group();
scene.add(globeGroup);

const globe = createGlobe();
globeGroup.add(globe);

const markers = [];
const markerMeshes = [];
const arcs = createJourneyArcs();

LOCATIONS.forEach((loc, index) => {
  const marker = createMarker(loc, index);
  markers.push({ data: loc, mesh: marker.mesh, ring: marker.ring, pulse: marker.pulse });
  markerMeshes.push(marker.mesh, marker.ring, marker.pulse);
  globeGroup.add(marker.group);
});

globeGroup.add(arcs);

const wanderers = createWanderers();
globeGroup.add(wanderers.group);
const wandererMeshes = wanderers.items.map((w) => w.hit);

buildLegend();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;
let idleTimer = null;
let lastFactSlug = null;
let hoverToken = 0;

prefetchFacts();

canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerleave", clearHover);
canvas.addEventListener("pointerdown", pauseAutoRotate);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", onResize);

animate();

function latLngToVector3(lat, lng, radius) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createStarfield() {
  const count = 1800;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = 20 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.04,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  scene.add(new THREE.Points(geometry, material));
}

function createGlobe() {
  const group = new THREE.Group();

  const textureLoader = new THREE.TextureLoader();
  const earthMap = textureLoader.load(
    "https://unpkg.com/three-globe@2.31.1/example/img/earth-dark.jpg"
  );
  const bumpMap = textureLoader.load(
    "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png"
  );

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
    new THREE.MeshPhongMaterial({
      map: earthMap,
      bumpMap,
      bumpScale: 0.04,
      specular: new THREE.Color(0x111827),
      shininess: 8,
    })
  );
  group.add(sphere);

  const wireframe = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.002, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    })
  );
  group.add(wireframe);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.08, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    })
  );
  group.add(atmosphere);

  return group;
}

function createMarker(loc) {
  const group = new THREE.Group();
  const position = latLngToVector3(loc.lat, loc.lng, GLOBE_RADIUS);
  group.position.copy(position);

  const normal = position.clone().normalize();
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(MARKER_SIZE, 16, 16),
    new THREE.MeshBasicMaterial({
      color: loc.color,
      transparent: true,
      opacity: 0.95,
    })
  );
  mesh.userData.location = loc;
  group.add(mesh);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(MARKER_SIZE * 1.8, MARKER_SIZE * 2.4, 24),
    new THREE.MeshBasicMaterial({
      color: loc.color,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.userData.location = loc;
  group.add(ring);

  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(MARKER_SIZE * 2.2, MARKER_SIZE * 2.8, 24),
    new THREE.MeshBasicMaterial({
      color: loc.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    })
  );
  pulse.rotation.x = Math.PI / 2;
  pulse.userData.location = loc;
  group.add(pulse);

  return { group, mesh, ring, pulse };
}

function createJourneyArcs() {
  const group = new THREE.Group();
  const ordered = [
    "mumbai",
    "kuwait",
    "chennai",
    "kuwait",
    "arlington",
    "seattle",
    "sanfrancisco",
    "louisville",
  ];

  for (let i = 0; i < ordered.length - 1; i += 1) {
    const from = LOCATIONS.find((loc) => loc.id === ordered[i]);
    const to = LOCATIONS.find((loc) => loc.id === ordered[i + 1]);
    const start = latLngToVector3(from.lat, from.lng, GLOBE_RADIUS);
    const end = latLngToVector3(to.lat, to.lng, GLOBE_RADIUS);
    const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS * 1.35);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.25,
    });
    group.add(new THREE.Line(geometry, material));
  }

  return group;
}

function randomLatLng() {
  return {
    lat: THREE.MathUtils.randFloat(-58, 68),
    lng: THREE.MathUtils.randFloat(-180, 180),
  };
}

function createFlightPath(from, to, radius) {
  const start = latLngToVector3(from.lat, from.lng, radius);
  const end = latLngToVector3(to.lat, to.lng, radius);
  const mid = start
    .clone()
    .add(end)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(radius * (1.1 + Math.random() * 0.2));
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

function createWanderers() {
  const group = new THREE.Group();
  const items = [];

  for (let i = 0; i < WANDERER_COUNT; i += 1) {
    const color = WANDERER_COLORS[i % WANDERER_COLORS.length];
    const radius = GLOBE_RADIUS + 0.014 + Math.random() * 0.03;
    const from = randomLatLng();
    const to = randomLatLng();
    const progress = Math.random();
    const curve = createFlightPath(from, to, radius);
    const dotGroup = new THREE.Group();

    const trailHistory = Array.from({ length: 12 }, (_, index) =>
      curve.getPoint(Math.max(0, progress - index * 0.012))
    );
    const trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(trailHistory),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      })
    );

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 10, 10),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.007 + Math.random() * 0.005, 8, 8),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
      })
    );

    const item = {
      group: dotGroup,
      core,
      glow,
      trail,
      trailHistory,
      curve,
      from,
      to,
      radius,
      progress,
      speed: 0.00005 + Math.random() * 0.00007,
      pulseOffset: Math.random() * Math.PI * 2,
    };

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.userData.wanderer = item;
    item.hit = hit;

    dotGroup.add(glow, core, hit);
    dotGroup.position.copy(curve.getPoint(progress));
    group.add(trail, dotGroup);

    items.push(item);
  }

  return { group, items };
}

function updateWanderers(items, time) {
  items.forEach((w) => {
    w.progress += w.speed;
    if (w.progress >= 1) {
      w.progress = 0;
      w.from = w.to;
      w.to = randomLatLng();
      w.curve = createFlightPath(w.from, w.to, w.radius);
    }

    const pos = w.curve.getPoint(w.progress);
    w.group.position.copy(pos);

    const isHovered = hovered?.type === "wanderer" && hovered.ref === w;
    const scale = isHovered ? 1.9 : 1;
    w.core.scale.setScalar(scale);
    w.glow.scale.setScalar(isHovered ? 1.5 : 1);

    w.glow.material.opacity = isHovered
      ? 0.35
      : 0.14 + Math.sin(time * 2.2 + w.pulseOffset) * 0.1;
    w.core.material.opacity = isHovered
      ? 1
      : 0.72 + Math.sin(time * 3.1 + w.pulseOffset) * 0.2;

    w.trailHistory.shift();
    w.trailHistory.push(pos.clone());
    w.trail.geometry.setFromPoints(w.trailHistory);
  });
}

function buildLegend() {
  legendEl.innerHTML = LOCATIONS.map(
    (loc) => `
      <li class="legend-item" data-id="${loc.id}">
        <span class="legend-dot" style="color: #${loc.color.toString(16).padStart(6, "0")}"></span>
        ${loc.name}
      </li>
    `
  ).join("");
}

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const wandererHits = raycaster.intersectObjects(wandererMeshes, false);
  const markerHits = raycaster.intersectObjects(markerMeshes, false);

  if (wandererHits.length > 0) {
    const wanderer = wandererHits[0].object.userData.wanderer;
    if (hovered?.type !== "wanderer" || hovered.ref !== wanderer) {
      setWandererHover(wanderer, event.clientX, event.clientY);
    } else {
      moveTooltip(event.clientX, event.clientY);
    }
    return;
  }

  if (markerHits.length > 0) {
    const loc = markerHits[0].object.userData.location;
    if (hovered?.type !== "marker" || hovered.ref.data.id !== loc.id) {
      setMarkerHover(loc, event.clientX, event.clientY);
    } else {
      moveTooltip(event.clientX, event.clientY);
    }
    return;
  }

  clearHover();
}

function setMarkerHover(loc, x, y) {
  hovered = { type: "marker", ref: markers.find((m) => m.data.id === loc.id) };
  controls.autoRotate = false;

  tooltip.classList.remove("tooltip--signal");
  tooltipCity.textContent = loc.name;
  tooltipPeriod.textContent = loc.period;
  tooltipRole.textContent = loc.role;
  tooltipDesc.textContent = loc.description;
  tooltipIcon.style.color = `#${loc.color.toString(16).padStart(6, "0")}`;
  tooltip.hidden = false;

  document.querySelectorAll(".legend-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === loc.id);
  });

  moveTooltip(x, y);
  coordsEl.textContent = `LAT ${loc.lat.toFixed(2)}° · LNG ${loc.lng.toFixed(2)}° · CHECKPOINT LOCKED`;
}

function setWandererHover(wanderer, x, y) {
  hovered = { type: "wanderer", ref: wanderer };
  controls.autoRotate = false;
  hoverToken += 1;
  const token = hoverToken;

  tooltip.classList.add("tooltip--signal");
  tooltipFactTitle.textContent = "";
  tooltipFactText.textContent = "Scanning knowledge base…";
  tooltipFactLink.hidden = true;
  tooltip.hidden = false;

  document.querySelectorAll(".legend-item").forEach((el) => el.classList.remove("active"));

  loadFact(token);
  moveTooltip(x, y);
  coordsEl.textContent = "SIGNAL INTERCEPTED · DECODING WIKIPEDIA FEED";
}

async function loadFact(token) {
  try {
    const fact = await getRandomFact(lastFactSlug);
    if (hoverToken !== token) return;

    lastFactSlug = fact.slug;
    tooltipFactTitle.textContent = fact.title;
    tooltipFactText.textContent = fact.extract;
    tooltipFactLink.href = fact.url;
    tooltipFactLink.hidden = false;
  } catch {
    if (hoverToken !== token) return;
    tooltipFactTitle.textContent = "Signal lost";
    tooltipFactText.textContent = "Could not load a Wikipedia fact right now. Try again in a moment.";
    tooltipFactLink.hidden = true;
  }
}

function moveTooltip(x, y) {
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function clearHover() {
  if (!hovered) return;
  hovered = null;
  tooltip.hidden = true;
  document.querySelectorAll(".legend-item").forEach((el) => el.classList.remove("active"));
  coordsEl.textContent = "LAT — · LNG —";
  scheduleAutoRotate();
}

function pauseAutoRotate() {
  controls.autoRotate = false;
  clearTimeout(idleTimer);
  scheduleAutoRotate();
}

function scheduleAutoRotate() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!hovered) controls.autoRotate = true;
  }, 4000);
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (key === "g") window.open("https://github.com/naiduv", "_blank", "noopener,noreferrer");
  if (key === "l") window.open("https://linkedin.com/in/naiduv", "_blank", "noopener,noreferrer");
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() * 0.001;

  markers.forEach((marker, index) => {
    const isActive = hovered?.type === "marker" && hovered.ref.data.id === marker.data.id;
    const scale = isActive ? 1.5 : 1;
    marker.mesh.scale.setScalar(scale);
    marker.ring.rotation.z = time * 0.8 + index;
    marker.pulse.scale.setScalar(1 + Math.sin(time * 2 + index) * 0.25);
    marker.pulse.material.opacity = isActive ? 0.45 : 0.15;
  });

  updateWanderers(wanderers.items, time);

  controls.update();
  renderer.render(scene, camera);
}
