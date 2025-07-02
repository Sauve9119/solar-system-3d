// --- Solar System Data ---
const PLANETS = [
  { name: 'Mercury', size: 0.38, distance: 8, color: 0xb1b1b1, speed: 0.04 },
  { name: 'Venus',   size: 0.95, distance: 11, color: 0xeccc9a, speed: 0.015 },
  { name: 'Earth',   size: 1,    distance: 15, color: 0x2a3cff, speed: 0.01 },
  { name: 'Mars',    size: 0.53, distance: 19, color: 0xff5533, speed: 0.008 },
  { name: 'Jupiter', size: 11.2, distance: 26, color: 0xffc97a, speed: 0.004 },
  { name: 'Saturn',  size: 9.45, distance: 34, color: 0xf7e7b6, speed: 0.003 },
  { name: 'Uranus',  size: 4,    distance: 42, color: 0x7de2fc, speed: 0.002 },
  { name: 'Neptune', size: 3.88, distance: 49, color: 0x426dfb, speed: 0.0015 }
];

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambient = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambient);
const sunLight = new THREE.PointLight(0xffffff, 2, 500);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// --- Sun ---
const sunGeo = new THREE.SphereGeometry(4, 48, 48);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff200 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// --- Planets ---
const planets = [];
PLANETS.forEach((data, i) => {
  const geometry = new THREE.SphereGeometry(data.size, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: data.color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.x = data.distance;
  scene.add(mesh);
  // Label
  const label = document.createElement('div');
  label.textContent = data.name;
  label.className = 'label';
  document.body.appendChild(label);
  mesh.userData.labelDiv = label;
  mesh.userData.planetIndex = i;
  planets.push({ mesh, ...data, angle: Math.random() * Math.PI * 2, label });
});

// --- Background Stars ---
const starGeo = new THREE.BufferGeometry();
const starCount = 800;
const starVerts = [];
for (let i = 0; i < starCount; i++) {
  const r = 200 + Math.random() * 400;
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.acos(2 * Math.random() - 1);
  starVerts.push(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// --- Controls Panel ---
let isDark = true;
const controlsDiv = document.createElement('div');
controlsDiv.id = 'controls';
controlsDiv.innerHTML = `
  <h2>Planet Speeds</h2>
  <div id="sliders"></div>
  <button id="pauseBtn">⏸ Pause</button>
  <button id="themeBtn">Toggle Theme</button>
`;
document.body.appendChild(controlsDiv);

// --- Sliders ---
const slidersDiv = document.getElementById('sliders');
PLANETS.forEach((planet, i) => {
  const container = document.createElement('div');
  container.className = 'slider-container';
  const label = document.createElement('label');
  label.textContent = planet.name;
  label.htmlFor = `slider-${i}`;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0.0005;
  slider.max = 0.08;
  slider.step = 0.0005;
  slider.value = planet.speed;
  slider.id = `slider-${i}`;
  const number = document.createElement('input');
  number.type = 'number';
  number.min = 0.0005;
  number.max = 0.08;
  number.step = 0.0005;
  number.value = planet.speed;
  slider.addEventListener('input', () => {
    number.value = slider.value;
    planets[i].speed = parseFloat(slider.value);
  });
  number.addEventListener('input', () => {
    slider.value = number.value;
    planets[i].speed = parseFloat(number.value);
  });
  container.appendChild(label);
  container.appendChild(slider);
  container.appendChild(number);
  slidersDiv.appendChild(container);
});

// --- Pause/Resume Button ---
let isPaused = false;
document.getElementById('pauseBtn').addEventListener('click', () => {
  isPaused = !isPaused;
  document.getElementById('pauseBtn').textContent = isPaused ? '▶ Resume' : '⏸ Pause';
});

// --- Theme Toggle ---
document.getElementById('themeBtn').addEventListener('click', () => {
  isDark = !isDark;
  document.body.style.background = isDark ? '#000' : '#fff';
  controlsDiv.style.background = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
  controlsDiv.style.color = isDark ? '#fff' : '#222';
  document.querySelectorAll('.slider-container input[type=number]').forEach(input => {
    input.style.background = isDark ? '#222' : '#fff';
    input.style.color = isDark ? '#fff' : '#222';
    input.style.border = isDark ? '1px solid #444' : '1px solid #bbb';
  });
});

// --- Raycaster for Hover/Click ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredPlanet = null;
let animatingCamera = false;

function onPointerMove(event) {
  if (animatingCamera) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
  if (hoveredPlanet && (!intersects.length || intersects[0].object !== hoveredPlanet.mesh)) {
    hoveredPlanet.label.style.display = 'none';
    hoveredPlanet = null;
  }
  if (intersects.length) {
    const planet = planets.find(p => p.mesh === intersects[0].object);
    hoveredPlanet = planet;
    planet.label.style.display = 'block';
    planet.label.style.left = (event.clientX + 12) + 'px';
    planet.label.style.top = (event.clientY - 10) + 'px';
  }
}
window.addEventListener('pointermove', onPointerMove);

// --- Camera Zoom on Click ---
window.addEventListener('click', (event) => {
  if (animatingCamera) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets.map(p => p.mesh));
  if (intersects.length) {
    const planet = planets.find(p => p.mesh === intersects[0].object);
    // Animate camera to planet
    const targetPos = new THREE.Vector3().copy(planet.mesh.position).add(new THREE.Vector3(0, planet.size * 2.5, planet.size * 6));
    const startPos = camera.position.clone();
    let t = 0;
    animatingCamera = true;
    function animateCam() {
      t += 0.03;
      camera.position.lerpVectors(startPos, targetPos, Math.min(t, 1));
      camera.lookAt(planet.mesh.position);
      if (t < 1) {
        requestAnimationFrame(animateCam);
      } else {
        animatingCamera = false;
      }
    }
    animateCam();
  }
});

// --- Responsive ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation Loop ---
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (!isPaused) {
    planets.forEach(planet => {
      planet.angle += planet.speed * delta;
      planet.mesh.position.x = Math.cos(planet.angle) * planet.distance;
      planet.mesh.position.z = Math.sin(planet.angle) * planet.distance;
      planet.mesh.rotation.y += 0.01;
    });
  }
  renderer.render(scene, camera);
}
animate();
