const gallery = document.getElementById('gallery');
let tileSize = 150;
let tiles = new Map();

const baseURL = 'https://dev.tinysquares.io/';
const workerURL = 'https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/';

let cameraX = 0;
let cameraY = 0;
let scale = 1;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let velocityX = 0, velocityY = 0;
let startDistance = 0;
let pinchCenter = { x: 0, y: 0 };

async function loadAvailableFiles() {
  try {
    const response = await fetch(workerURL);
    const filenames = await response.json();
    window.availableFiles = filenames.map(name => baseURL + encodeURIComponent(name));
  } catch (e) {
    console.error("Failed to load files", e);
    window.availableFiles = [];
  }
}

function randomFile() {
  const files = (window.availableFiles || []).filter(f => /\.(jpg|jpeg|mp4)$/i.test(f));
  return files.length ? files[Math.floor(Math.random() * files.length)] : '';
}

function createPost(fileUrl) {
  const frame = document.createElement('div');
  frame.className = 'frame';
  let media = /\.(mp4|mov)$/i.test(fileUrl) ? document.createElement('video') : document.createElement('img');
  if (media.tagName === 'VIDEO') {
    Object.assign(media, { muted: true, loop: true, autoplay: true, playsInline: true });
  }
  media.dataset.src = fileUrl;
  frame.appendChild(media);

  const post = document.createElement('div');
  post.className = 'post fade-in';
  post.appendChild(frame);
  return post;
}

function updateTiles() {
  const bufferTiles = scale > 1.5 ? 4 : 2;
  const viewWidth = window.innerWidth / scale;
  const viewHeight = window.innerHeight / scale;

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
      rect.right >= 0 && rect.left <= window.innerWidth &&
      rect.bottom >= 0 && rect.top <= window.innerHeight
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
  cameraX += dx / scale;
  cameraY += dy / scale;
  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px) scale(${scale})`;
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

// Touch/Mouse
document.addEventListener('mousedown', e => {
  isDragging = true;
  [dragStartX, dragStartY] = [e.clientX, e.clientY];
  velocityX = 0; velocityY = 0;
});
document.addEventListener('mouseup', () => isDragging = false);
document.addEventListener('mousemove', e => {
  if (isDragging) {
    const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
    moveCamera(-dx, -dy);
    [velocityX, velocityY] = [dx, dy];
    [dragStartX, dragStartY] = [e.clientX, e.clientY];
  }
});

// Pinch & zoom logic
document.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    e.preventDefault();
    const [a, b] = e.touches;
    pinchCenter = {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2
    };
    startDistance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
}, { passive: false });

document.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && isDragging) {
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartX;
    const dy = touch.clientY - dragStartY;
    moveCamera(-dx, -dy);
    [velocityX, velocityY] = [dx, dy];
    [dragStartX, dragStartY] = [touch.clientX, touch.clientY];
  } else if (e.touches.length === 2) {
    e.preventDefault();
    const [a, b] = e.touches;
    const zoomX = (a.clientX + b.clientX) / 2;
    const zoomY = (a.clientY + b.clientY) / 2;
    const worldX = (zoomX / scale) + cameraX;
    const worldY = (zoomY / scale) + cameraY;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const factor = dist / startDistance;
    scale = Math.min(Math.max(0.5, scale * factor), 3);
    cameraX = worldX - (zoomX / scale);
    cameraY = worldY - (zoomY / scale);
    gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px) scale(${scale})`;
    startDistance = dist;
  }
}, { passive: false });

document.addEventListener('touchend', () => isDragging = false);

// Wheel Zoom (Desktop)
window.addEventListener('wheel', e => {
  if (e.ctrlKey) {
    e.preventDefault();
    const zoomX = e.clientX;
    const zoomY = e.clientY;
    const worldX = (zoomX / scale) + cameraX;
    const worldY = (zoomY / scale) + cameraY;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.min(Math.max(0.5, scale * factor), 3);
    cameraX = worldX - (zoomX / scale);
    cameraY = worldY - (zoomY / scale);
    gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px) scale(${scale})`;
  } else {
    moveCamera(e.deltaX, e.deltaY);
  }
}, { passive: false });

window.addEventListener('keydown', e => {
  if (e.key === '+') scale = Math.min(3, scale + 0.1);
  if (e.key === '-') scale = Math.max(0.5, scale - 0.1);
  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px) scale(${scale})`;
  updateTiles();
});

async function init() {
  await loadAvailableFiles();
  if (!window.availableFiles.length) {
    document.getElementById('loader').textContent = 'No images available.';
    return;
  }
  document.getElementById('loader').style.display = 'none';
  cameraX = 0; cameraY = 0;
  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px) scale(${scale})`;
  updateTiles();
  animate();
}
init();
