```javascript
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js';

const video = document.getElementById('camera');
const canvas = document.getElementById('threeCanvas');
const startBtn = document.getElementById('startBtn');
const fireBtn = document.getElementById('fireBtn');
const soundBtn = document.getElementById('soundBtn');
const applyTextBtn = document.getElementById('applyTextBtn');
const statusEl = document.getElementById('status');

let scene;
let camera;
let renderer;
let particles;
let positions;
let colors;
let velocities = [];
let running = false;

const MAX = 900;

initThree();
animate();

startBtn.addEventListener('click', startCamera);

fireBtn.addEventListener('click', () => {
  alert('花火開始ボタンOK');

  spawnFireworks();

  fireBtn.textContent = '花火表示中';
  fireBtn.style.background = '#ff3030';
  statusEl.textContent = '花火表示中';
});

  fireBtn.textContent = '花火表示中';
  statusEl.textContent = '球体花火テスト表示中';
});
async function startCamera() {
  alert('開始ボタンOK');
  startBtn.disabled = true;
  statusEl.textContent = 'カメラ起動中...';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    fireBtn.disabled = false;
    soundBtn.disabled = false;
    applyTextBtn.disabled = false;

    statusEl.textContent = 'カメラ起動OK：花火開始を押してください';
  } catch (e) {
    console.error(e);
    alert('カメラ起動エラー: ' + e.message);
    statusEl.textContent = 'カメラ起動エラー';
    startBtn.disabled = false;
  }
}

function initThree() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const geometry = new THREE.BufferGeometry();

  positions = new Float32Array(MAX * 3);
  colors = new Float32Array(MAX * 3);

  for (let i = 0; i < MAX; i++) {
    const j = i * 3;
    positions[j] = 999;
    positions[j + 1] = 999;
    positions[j + 2] = 999;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  size: 0.35,
  vertexColors: true,
  transparent: true,
  opacity: 1,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

  particles = new THREE.Points(geometry, material);
  scene.add(particles);

  window.addEventListener('resize', onResize);

  console.log('Three.js ready');
}

function spawnFireworks() {
  running = true;
  velocities = [];

  const colorList = [
    new THREE.Color(0xff3030),
    new THREE.Color(0xffd36b),
    new THREE.Color(0x3fa7ff),
    new THREE.Color(0xffffff)
  ];

  for (let i = 0; i < MAX; i++) {
    const j = i * 3;

    positions[j] = 0;
    positions[j + 1] = 0;
    positions[j + 2] = -2.2;

    const dir = randomSphereDirection();
    const speed = rand(0.015, 0.055);

    velocities.push({
      x: dir.x * speed,
      y: dir.y * speed,
      z: dir.z * speed,
      life: rand(80, 150)
    });

    const c = colorList[i % colorList.length];
    colors[j] = c.r;
    colors[j + 1] = c.g;
    colors[j + 2] = c.b;
  }

  particles.geometry.attributes.position.needsUpdate = true;
  particles.geometry.attributes.color.needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate);

  if (running) {
    let alive = 0;

    for (let i = 0; i < MAX; i++) {
      const v = velocities[i];
      const j = i * 3;

      if (!v || v.life <= 0) {
        positions[j] = 999;
        positions[j + 1] = 999;
        positions[j + 2] = 999;
        continue;
      }

      positions[j] += v.x;
      positions[j + 1] += v.y;
      positions[j + 2] += v.z;

      v.y -= 0.00045;
      v.life--;

      const a = v.life / 150;
      colors[j] *= 0.995;
      colors[j + 1] *= 0.995;
      colors[j + 2] *= 0.995;

      if (a > 0) alive++;
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;

    if (alive <= 0) {
      running = false;
      statusEl.textContent = '花火終了：もう一度 花火開始を押してください';
      fireBtn.textContent = '花火開始';
      fireBtn.style.background = '';
    }
  }

  renderer.render(scene, camera);
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

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
```
