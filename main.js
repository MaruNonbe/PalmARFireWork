import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js';

const CONFIG = {
  defaultText: '祝 AR体験',
  colors: [0xff3030, 0xffd36b, 0x3fa7ff, 0xffffff],
  maxSparks: 1250,
  maxSmoke: 170,
  handLostFadeSec: 2.0,
  palmOffsetY: 0.38,
  palmDepth: -2.5,
  textSampleStep: 5,
  letterParticleScale: 0.0105,
};

const video = document.getElementById('camera');
const canvas = document.getElementById('threeCanvas');
const textCanvas = document.getElementById('textCanvas');
const startBtn = document.getElementById('startBtn');
const fireBtn = document.getElementById('fireBtn');
const soundBtn = document.getElementById('soundBtn');
const applyTextBtn = document.getElementById('applyTextBtn');
const textInput = document.getElementById('textInput');
const statusEl = document.getElementById('status');

let scene, camera, renderer, clock;
let sparkSystem, smokeSystem;
let sparkPositions, sparkColors;
let smokePositions, smokeColors;
let sparks = [];
let smokes = [];
let currentText = CONFIG.defaultText;
let textTargets = [];
let handVisible = false;
let palmWorld = new THREE.Vector3(0, 0, CONFIG.palmDepth);
let lastPalmWorld = palmWorld.clone();
let fireworkRunning = false;
let showFireworks = false;
let lastHandTime = 0;
let soundEnabled = false;
let audioUnlocked = false;
let sounds = {};
let hands = null;
let launchTimer = 0;

initThree();
createParticleSystems();
setTextTargets(currentText);
animate();

startBtn.addEventListener('click', startExperience);

fireBtn.addEventListener('click', () => {
  showFireworks = true;
  handVisible = true;
  lastHandTime = performance.now() / 1000;

  palmWorld.set(0, 0, -2.2);
  lastPalmWorld.set(0, 0, -2.2);

  statusEl.textContent = '花火起動中';
  resetFirework(true);
});

soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? '音 OFF' : '音 ON';
  if (soundEnabled) unlockAudio();
});

applyTextBtn.addEventListener('click', () => {
  currentText = textInput.value.trim() || CONFIG.defaultText;
  setTextTargets(currentText);
  resetFirework(true);
});

function initThree() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  clock = new THREE.Clock();

  window.addEventListener('resize', onResize);
}

function createParticleSystems() {
  const sparkGeometry = new THREE.BufferGeometry();

  sparkPositions = new Float32Array(CONFIG.maxSparks * 3);
  sparkColors = new Float32Array(CONFIG.maxSparks * 3);

  for (let i = 0; i < CONFIG.maxSparks; i++) {
    const j = i * 3;
    sparkPositions[j] = 999;
    sparkPositions[j + 1] = 999;
    sparkPositions[j + 2] = 999;
  }

  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  sparkGeometry.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

  const sparkMaterial = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });

  sparkSystem = new THREE.Points(sparkGeometry, sparkMaterial);
  scene.add(sparkSystem);

  const smokeGeometry = new THREE.BufferGeometry();

  smokePositions = new Float32Array(CONFIG.maxSmoke * 3);
  smokeColors = new Float32Array(CONFIG.maxSmoke * 3);

  for (let i = 0; i < CONFIG.maxSmoke; i++) {
    const j = i * 3;
    smokePositions[j] = 999;
    smokePositions[j + 1] = 999;
    smokePositions[j + 2] = 999;
    smokeColors[j] = 0.55;
    smokeColors[j + 1] = 0.55;
    smokeColors[j + 2] = 0.6;
  }

  smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
  smokeGeometry.setAttribute('color', new THREE.BufferAttribute(smokeColors, 3));

  const smokeMaterial = new THREE.PointsMaterial({
    size: 0.35,
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  });

  smokeSystem = new THREE.Points(smokeGeometry, smokeMaterial);
  scene.add(smokeSystem);
}

async function startExperience() {
  startBtn.disabled = true;
  statusEl.textContent = 'カメラ起動中...';

  await unlockAudio();
  loadSounds();

  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.55,
    minTrackingConfidence: 0.45,
    selfieMode: false,
  });

  hands.onResults(onHandResults);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { exact: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    await startVideoStream(stream, '背面カメラ起動中：手のひらをカメラに向けてください');
  } catch (err) {
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      await startVideoStream(fallbackStream, 'カメラ起動中：手のひらをカメラに向けてください');
    } catch (fallbackErr) {
      console.error(fallbackErr);
      statusEl.textContent = 'カメラを起動できません。HTTPS環境とカメラ許可を確認してください。';
      startBtn.disabled = false;
    }
  }
}

async function startVideoStream(stream, message) {
  video.srcObject = stream;
  await video.play();

  fireBtn.disabled = false;
  soundBtn.disabled = false;
  applyTextBtn.disabled = false;

  statusEl.textContent = message;

  async function processFrame() {
    if (hands && video.readyState >= 2) {
      try {
        await hands.send({ image: video });
      } catch (e) {
        console.warn('hands.send error:', e);
      }
    }

    requestAnimationFrame(processFrame);
  }

  processFrame();
}

async function unlockAudio() {
  if (audioUnlocked) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  if (!window.__fwAudioContext) {
    window.__fwAudioContext = new AudioContext();
  }

  if (window.__fwAudioContext.state === 'suspended') {
    await window.__fwAudioContext.resume();
  }

  audioUnlocked = true;
}

function loadSounds() {
  sounds.launch = new Audio('assets/sounds/launch.mp3');
  sounds.explosion = new Audio('assets/sounds/explosion.mp3');
  sounds.sparkle = new Audio('assets/sounds/sparkle.mp3');

  Object.values(sounds).forEach((a) => {
    a.preload = 'auto';
    a.volume = 0.75;
  });
}

function playSound(name) {
  if (!soundEnabled || !audioUnlocked || !sounds[name]) return;

  const a = sounds[name].cloneNode();
  a.volume = name === 'sparkle' ? 0.35 : 0.75;
  a.play().catch(() => {});
}

function onHandResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    const openness = estimateHandOpenness(lm);

    if (openness > 0.12) {
      handVisible = true;
      lastHandTime = performance.now() / 1000;

      const palm = getPalmCenter(lm);
      palmWorld = screenToWorld(palm.x, palm.y, CONFIG.palmDepth);
      palmWorld.y += CONFIG.palmOffsetY;

      if (!showFireworks) showFireworks = true;
      if (!fireworkRunning) resetFirework(true);

      statusEl.textContent = '手のひら検出中：花火表示';
      return;
    }
  }

  handVisible = false;

  if (showFireworks) {
    statusEl.textContent = '手のひらを見失いました：短時間だけ花火を維持します';
  } else {
    statusEl.textContent = '手のひらが閉じた、または未検出です';
  }
}

function getPalmCenter(lm) {
  const ids = [0, 5, 9, 13, 17];

  const p = ids.reduce(
    (acc, id) => ({
      x: acc.x + lm[id].x,
      y: acc.y + lm[id].y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: p.x / ids.length,
    y: p.y / ids.length,
  };
}

function estimateHandOpenness(lm) {
  const tips = [4, 8, 12, 16, 20];
  const wrist = lm[0];

  let sum = 0;

  for (const id of tips) {
    const dx = lm[id].x - wrist.x;
    const dy = lm[id].y - wrist.y;
    sum += Math.hypot(dx, dy);
  }

  return sum / tips.length;
}

function screenToWorld(nx, ny, z) {
  const xNdc = nx * 2 - 1;
  const yNdc = -(ny * 2 - 1);

  const v = new THREE.Vector3(xNdc, yNdc, 0.5).unproject(camera);
  const dir = v.sub(camera.position).normalize();
  const distance = (z - camera.position.z) / dir.z;

  return camera.position.clone().add(dir.multiplyScalar(distance));
}

function resetFirework(force = false) {
  if (!force && fireworkRunning) return;

  sparks = [];
  smokes = [];
  launchTimer = 0;
  fireworkRunning = true;

  spawnLaunch();
}

function spawnLaunch() {
  const origin = lastPalmWorld.clone().add(new THREE.Vector3(0, -0.45, 0));
  const target = lastPalmWorld.clone().add(new THREE.Vector3(0, 0.4, 0));

  for (let i = 0; i < 120; i++) {
    const t = i / 120;
    const p = origin.clone().lerp(target, t);

    p.x += rand(-0.035, 0.035);
    p.y += rand(-0.035, 0.035);

    createSpark(
      p,
      new THREE.Vector3(rand(-0.06, 0.06), rand(0.65, 1.25), rand(-0.04, 0.04)),
      0xffd36b,
      1.0,
      'launch'
    );
  }

  playSound('launch');
}

function spawnExplosion() {
  const center = lastPalmWorld.clone().add(new THREE.Vector3(0, 0.25, 0));

  for (let i = 0; i < 1000; i++) {
    const dir = randomSphereDirection();
    const speed = rand(0.8, 2.8);
    const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];

    createSpark(center, dir.multiplyScalar(speed), color, rand(1.3, 2.2), 'explode');
  }

  for (let i = 0; i < 70; i++) {
    createSmoke(center.clone().add(randomSphereDirection().multiplyScalar(rand(0.05, 0.55))));
  }

  playSound('explosion');
}

function spawnTextGather() {
  if (textTargets.length === 0) return;

  const center = lastPalmWorld.clone().add(new THREE.Vector3(0, 0.25, 0));
  const count = Math.min(CONFIG.maxSparks, textTargets.length);

  for (let i = 0; i < count; i++) {
    const target2 = textTargets[i % textTargets.length];

    const target3 = center.clone().add(
      new THREE.Vector3(target2.x, target2.y, rand(-0.05, 0.05))
    );

    const start = center.clone().add(
      randomSphereDirection().multiplyScalar(rand(0.7, 1.35))
    );

    const color = CONFIG.colors[i % CONFIG.colors.length];

    createSpark(
      start,
      randomSphereDirection().multiplyScalar(rand(0.1, 0.45)),
      color,
      rand(2.3, 3.4),
      'text',
      target3
    );
  }

  playSound('sparkle');
}

function createSpark(position, velocity, colorHex, life, mode, target = null) {
  if (sparks.length >= CONFIG.maxSparks) {
    sparks.shift();
  }

  const color = new THREE.Color(colorHex);

  sparks.push({
    p: position.clone(),
    v: velocity.clone(),
    color,
    life,
    maxLife: life,
    mode,
    target,
    age: 0,
    wobble: rand(1, 4),
    phase: rand(0, Math.PI * 2),
    alpha: 1,
  });
}

function createSmoke(position) {
  if (smokes.length >= CONFIG.maxSmoke) {
    smokes.shift();
  }

  smokes.push({
    p: position.clone(),
    v: new THREE.Vector3(rand(-0.08, 0.08), rand(0.03, 0.16), rand(-0.04, 0.04)),
    life: rand(1.2, 2.2),
    maxLife: 2.2,
    alpha: rand(0.16, 0.33),
  });
}

function setTextTargets(text) {
  const ctx = textCanvas.getContext('2d');

  ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 92px system-ui, sans-serif';

  ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);

  const img = ctx.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
  const points = [];

  for (let y = 0; y < textCanvas.height; y += CONFIG.textSampleStep) {
    for (let x = 0; x < textCanvas.width; x += CONFIG.textSampleStep) {
      const a = img[(y * textCanvas.width + x) * 4 + 3];

      if (a > 50) {
        points.push({
          x: (x - textCanvas.width / 2) * CONFIG.letterParticleScale,
          y: -(y - textCanvas.height / 2) * CONFIG.letterParticleScale,
        });
      }
    }
  }

  shuffle(points);
  textTargets = points.slice(0, CONFIG.maxSparks);
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.033);
  const now = performance.now() / 1000;

  lastPalmWorld.lerp(palmWorld, 0.25);

  const recentlyHadHand = handVisible || now - lastHandTime < CONFIG.handLostFadeSec;
  const visible = showFireworks && recentlyHadHand;

  if (!visible) {
    sparks.length = Math.max(0, sparks.length - Math.ceil(CONFIG.maxSparks * 0.08));
    smokes.length = Math.max(0, smokes.length - Math.ceil(CONFIG.maxSmoke * 0.08));
    fireworkRunning = false;
  } else if (!fireworkRunning) {
    resetFirework(true);
  }

  if (visible && fireworkRunning) {
    launchTimer += dt;

    if (launchTimer > 0.75 && launchTimer < 0.75 + dt) {
      spawnExplosion();
    }

    if (launchTimer > 1.55 && launchTimer < 1.55 + dt) {
      spawnTextGather();
    }

    if (launchTimer > 4.0) {
      resetFirework(true);
    }
  }

  updateSparks(dt, visible);
  updateSmokes(dt, visible);

  renderer.render(scene, camera);
}

function updateSparks(dt, visible) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];

    s.age += dt;
    s.life -= dt;

    if (s.life <= 0) {
      sparks.splice(i, 1);
      continue;
    }

    if (s.mode === 'text' && s.target) {
      const toTarget = s.target.clone().sub(s.p);
      s.v.add(toTarget.multiplyScalar(2.4 * dt));
      s.v.multiplyScalar(0.92);
    } else {
      s.v.y -= 0.72 * dt;
      s.v.multiplyScalar(0.985);
    }

    s.p.addScaledVector(s.v, dt);
    s.p.x += Math.sin(s.age * s.wobble * 7 + s.phase) * 0.003;
    s.p.y += Math.cos(s.age * s.wobble * 5 + s.phase) * 0.002;

    s.alpha = Math.max(0, s.life / s.maxLife) * (visible ? 1 : 0.15);
  }

  for (let i = 0; i < CONFIG.maxSparks; i++) {
    const s = sparks[i];
    const j = i * 3;

    if (s) {
      sparkPositions[j] = s.p.x;
      sparkPositions[j + 1] = s.p.y;
      sparkPositions[j + 2] = s.p.z;

      sparkColors[j] = s.color.r * s.alpha;
      sparkColors[j + 1] = s.color.g * s.alpha;
      sparkColors[j + 2] = s.color.b * s.alpha;
    } else {
      sparkPositions[j] = 999;
      sparkPositions[j + 1] = 999;
      sparkPositions[j + 2] = 999;

      sparkColors[j] = 0;
      sparkColors[j + 1] = 0;
      sparkColors[j + 2] = 0;
    }
  }

  sparkSystem.geometry.attributes.position.needsUpdate = true;
  sparkSystem.geometry.attributes.color.needsUpdate = true;
}

function updateSmokes(dt, visible) {
  for (let i = smokes.length - 1; i >= 0; i--) {
    const s = smokes[i];

    s.life -= dt;

    if (s.life <= 0) {
      smokes.splice(i, 1);
      continue;
    }

    s.p.addScaledVector(s.v, dt);
    s.alpha *= visible ? 0.992 : 0.90;
  }

  for (let i = 0; i < CONFIG.maxSmoke; i++) {
    const s = smokes[i];
    const j = i * 3;

    if (s) {
      const a = s.alpha * Math.max(0, s.life / s.maxLife);

      smokePositions[j] = s.p.x;
      smokePositions[j + 1] = s.p.y;
      smokePositions[j + 2] = s.p.z;

      smokeColors[j] = 0.55 * a;
      smokeColors[j + 1] = 0.55 * a;
      smokeColors[j + 2] = 0.6 * a;
    } else {
      smokePositions[j] = 999;
      smokePositions[j + 1] = 999;
      smokePositions[j + 2] = 999;

      smokeColors[j] = 0;
      smokeColors[j + 1] = 0;
      smokeColors[j + 2] = 0;
    }
  }

  smokeSystem.geometry.attributes.position.needsUpdate = true;
  smokeSystem.geometry.attributes.color.needsUpdate = true;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randomSphereDirection() {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);

  return new THREE.Vector3(
    r * Math.cos(a),
    u,
    r * Math.sin(a)
  );
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
