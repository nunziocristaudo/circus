const baseURL = 'https://dev.tinysquares.io/';
const workerURL = 'https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/';
const POST_SIZE = 150;

const IMAGE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.heic'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm'];

let isDragging = false;
let lastX = 0;
let lastY = 0;
let offsetX = 0;
let offsetY = 0;
let velocityX = 0;
let velocityY = 0;
let lastMoveTime = 0;
let inertiaFrame = null;

const gallery = document.getElementById('gallery');

function updateTransform() {
  gallery.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
}

function setCanvasSize() {
  const w = window.innerWidth * 3;
  const h = window.innerHeight * 3;
  gallery.style.width = `${w}px`;
  gallery.style.height = `${h}px`;
  offsetX = window.innerWidth / 2 - w / 2;
  offsetY = window.innerHeight / 2 - h / 2;
  updateTransform();
}

window.addEventListener('resize', setCanvasSize);
setCanvasSize();

function getRandomPosition(index = 0) {
  const cols = Math.floor(window.innerWidth / POST_SIZE);
  const x = (index % cols) * POST_SIZE;
  const y = Math.floor(index / cols) * POST_SIZE;
  return { x, y };
}

function createMediaElement(src) {
  const isVideo = VIDEO_EXTENSIONS.some(ext => src.toLowerCase().endsWith(ext));
  const el = document.createElement(isVideo ? 'video' : 'img');

  if (isVideo) {
    el.src = src;
    el.muted = true;
    el.autoplay = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = 'metadata';
  } else {
    el.src = src;
    el.loading = 'lazy';
    el.decoding = 'async';
  }

  el.classList.add('fade-in');
  el.onload = () => el.classList.add('show');
  return el;
}

function createPost(src, index) {
  const post = document.createElement('div');
  post.className = 'post';
  const { x, y } = getRandomPosition(index);
  post.style.transform = `translate(${x}px, ${y}px)`;

  const frame = document.createElement('div');
  frame.className = 'frame';
  post.appendChild(frame);

  post.dataset.src = src;
  observer.observe(post);

  return post;
}

const observer = new IntersectionObserver((entries, obs) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const post = entry.target;
      const frame = post.querySelector('.frame');
      const media = createMediaElement(post.dataset.src);
      frame.appendChild(media);
      obs.unobserve(post);
    }
  }
}, {
  root: null,
  rootMargin: '300px',
  threshold: 0.01,
});

async function init() {
  try {
    const response = await fetch(workerURL);
    const mediaList = await response.json();

    mediaList.forEach((filename, i) => {
      const lower = filename.toLowerCase();
      const isValid = IMAGE_EXTENSIONS.concat(VIDEO_EXTENSIONS).some(ext => lower.endsWith(ext));
      if (!isValid) return;

      const src = baseURL + filename;
      const post = createPost(src, i);
      gallery.appendChild(post);
    });

    document.getElementById('loader').style.display = 'none';
  } catch (err) {
    console.error('Error loading media list:', err);
  }
}

init();

function applyInertia() {
  if (Math.abs(velocityX) < 0.05 && Math.abs(velocityY) < 0.05) return;

  offsetX += velocityX;
  offsetY += velocityY;
  updateTransform();

  velocityX *= 0.93;
  velocityY *= 0.93;

  inertiaFrame = requestAnimationFrame(applyInertia);
}

gallery.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  lastMoveTime = performance.now();
  gallery.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const now = performance.now();
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  const dt = now - lastMoveTime || 16;

  offsetX += dx;
  offsetY += dy;

  velocityX = dx / dt * 16;
  velocityY = dy / dt * 16;

  lastX = e.clientX;
  lastY = e.clientY;
  lastMoveTime = now;

  updateTransform();
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  gallery.style.cursor = 'grab';
  cancelAnimationFrame(inertiaFrame);
  inertiaFrame = requestAnimationFrame(applyInertia);
});

gallery.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    isDragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
    lastMoveTime = performance.now();
  }
});

window.addEventListener('touchmove', (e) => {
  if (!isDragging || e.touches.length !== 1) return;
  const now = performance.now();
  const dx = e.touches[0].clientX - lastX;
  const dy = e.touches[0].clientY - lastY;
  const dt = now - lastMoveTime || 16;

  offsetX += dx;
  offsetY += dy;

  velocityX = dx / dt * 16;
  velocityY = dy / dt * 16;

  lastX = e.touches[0].clientX;
  lastY = e.touches[0].clientY;
  lastMoveTime = now;

  updateTransform();
}, { passive: false });

window.addEventListener('touchend', () => {
  isDragging = false;
  cancelAnimationFrame(inertiaFrame);
  inertiaFrame = requestAnimationFrame(applyInertia);
});
