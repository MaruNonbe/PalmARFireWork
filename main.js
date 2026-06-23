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
let fireworkGroup;
let sparks = [];
let running = false;

initThree();
animate();

console.log('main.js loaded');
statusEl.textContent = 'main.js 読み込みOK';

startBtn.addEventListener('click', startCamera);

fireBtn.addEventListener('click', () => {
  console.log('fire button clicked');
  statusEl.textContent = '花火表示中';
  fireBtn.textContent = '花火表示中';
  fireBtn.style.background = '#ff3030';
  spawnMeshFireworks();
});

async function startCamera() {
  console.log('start button clicked');
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
    statusEl.textContent = 'カメラ起動エラー: ' + e.message;
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
    canvas,
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  fireworkGroup = new THREE.Group();
  scene.add(fireworkGroup);

  window.addEventListener('resize', onResize);
}

function spawnMeshFireworks() {
  running = true;
  sparks = [];

  while (fireworkGroup.children.length > 0) {
    const obj = fireworkGroup.children.pop();
    obj.geometry.dispose();
    obj.material.dispose();
  }

  const colorList = [0xff3030, 0xffd36b, 0x3fa7ff, 0xffffff];

  for (let i = 0; i < 180; i++) {
    const geo = new THREE.SphereGeometry(0.035, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: colorList[i % colorList.length],
      transparent: true,
      opacity: 1
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, -1.6);
    fireworkGroup.add(mesh);

    const dir = randomSphereDirection();
    const speed = rand(0.015, 0.05);

    sparks.push({
      mesh,
      vx: dir.x * speed,
      vy: dir.y * speed,
      vz: dir.z * speed,
      life: rand(70, 140),
      maxLife: 140
    });
  }
}

function animate() {
  requestAnimationFrame(animate);

  if (running) {
    let alive = 0;

    for (const s of sparks) {
      if (s.life <= 0) {
        s.mesh.visible = false;
        continue;
      }

      s.mesh.position.x += s.vx;
      s.mesh.position.y += s.vy;
      s.mesh.position.z += s.vz;

      s.vy -= 0.00035;
      s.life--;

      s.mesh.material.opacity = Math.max(0, s.life / s.maxLife);
      alive++;
    }

    if (alive <= 0) {
      running = false;
      fireBtn.textContent = '花火開始';
      fireBtn.style.background = '';
      statusEl.textContent = '花火終了：もう一度押してください';
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
