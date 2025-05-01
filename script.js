
const gallery = document.getElementById('gallery');
let tileSize = 150;
let tiles = new Map();

const baseURL = 'https://dev.tinysquares.io/';
const workerURL = 'https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/';

let cameraX = 0;
let cameraY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let velocityX = 0, velocityY = 0;

let preloadedFiles = [];

async function preloadQueue() {
  try {
    const response = await fetch(workerURL);
    const filenames = await response.json();
    window.availableFiles = filenames.map(name => baseURL + encodeURIComponent(name));
    preloadedFiles = window.availableFiles.sort(() => 0.5 - Math.random()).slice(0, 200);
  } catch (e) {
    console.error("Failed to load files", e);
    window.availableFiles = [];
    preloadedFiles = [];
  }
}

function randomFile() {
  return preloadedFiles.length ? preloadedFiles.pop() : '';
}

function createPost(fileUrl) {
  const frame = document.createElement('div');
  frame.className = 'frame';
  let media = /\.(mp4|mov)$/i.test(fileUrl) ? document.createElement('video') : document.createElement('img');
  if (media.tagName === 'VIDEO') {
    Object.assign(media, { muted: true, loop: true, autoplay: true, playsInline: true });
  } else {
    media.loading = "lazy";
  }
  media.dataset.src = fileUrl;
  frame.appendChild(media);

  const post = document.createElement('div');
  post.className = 'post fade-in';
  post.appendChild(frame);
  return post;
}

function updateTiles() {
  const bufferTiles = 2;
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;

  const startCol = Math.floor((cameraX - bufferTiles * tileSize) / tileSize);
  const endCol = Math.ceil((cameraX + viewWidth + bufferTiles * tileSize) / tileSize);
  const startRow = Math.floor((cameraY - bufferTiles * tileSize) / tileSize);
  const endRow = Math.ceil((cameraY + viewHeight + bufferTiles * tileSize) / tileSize);

  const needed = new Set();

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const key = `${col},${row}`;
      needed.add(key);
      if (!tiles.has(key)) {
        const url = randomFile();
        if (url) {
          const post = createPost(url);
          post.style.left = `${col * tileSize}px`;
          post.style.top = `${row * tileSize}px`;
          gallery.appendChild(post);
          requestAnimationFrame(() => post.classList.add('show'));
          tiles.set(key, post);
        }
      }
    }
  }

  for (const [key, tile] of tiles) {
    if (!needed.has(key)) {
      gallery.removeChild(tile);
      tiles.delete(key);
    }
  }

  lazyLoadTiles();
}

function lazyLoadTiles() {
  tiles.forEach(tile => {
    const media = tile.querySelector('img, video');
    const rect = tile.getBoundingClientRect();
    if (
      rect.right >= -tileSize && rect.left <= window.innerWidth + tileSize &&
      rect.bottom >= -tileSize && rect.top <= window.innerHeight + tileSize
    ) {
      if (media.tagName === 'IMG' && !media.src) {
        media.src = media.dataset.src;
      } else if (media.tagName === 'VIDEO' && !media.children.length) {
        const src = document.createElement('source');
        src.src = media.dataset.src;
        src.type = 'video/mp4';
        media.appendChild(src);
        media.load();
      }
    } else {
      if (media.tagName === 'IMG') media.removeAttribute('src');
      else if (media.tagName === 'VIDEO') media.innerHTML = '';
    }
  });
}

function moveCamera(dx, dy) {
  cameraX += dx;
  cameraY += dy;
  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`;
  updateTiles();
}

function animate() {
  if (!isDragging && (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1)) {
    moveCamera(-velocityX, -velocityY);
    velocityX *= 0.9;
    velocityY *= 0.9;
  }
  requestAnimationFrame(animate);
}

document.addEventListener('mousedown', e => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  velocityX = velocityY = 0;
});

document.addEventListener('mouseup', () => isDragging = false);

document.addEventListener('mousemove', e => {
  if (isDragging) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    moveCamera(-dx, -dy);
    velocityX = dx;
    velocityY = dy;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  }
});

document.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
  }
}, { passive: false });

document.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && isDragging) {
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartX;
    const dy = touch.clientY - dragStartY;
    moveCamera(-dx, -dy);
    velocityX = dx;
    velocityY = dy;
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;
  }
}, { passive: false });

document.addEventListener('touchend', () => isDragging = false);

window.addEventListener('keydown', e => {
  const step = 20;
  if (e.key === 'ArrowLeft') moveCamera(step, 0);
  if (e.key === 'ArrowRight') moveCamera(-step, 0);
  if (e.key === 'ArrowUp') moveCamera(0, step);
  if (e.key === 'ArrowDown') moveCamera(0, -step);
});

async function init() {
  await preloadQueue();
  if (!window.availableFiles.length) {
    document.getElementById('loader').textContent = 'No images available.';
    return;
  }
  document.getElementById('loader').style.display = 'none';
  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`;
  updateTiles();
  animate();
}
init();
