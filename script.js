
const gallery = document.getElementById('gallery');
const tileSize = 150;
const bufferTiles = 1;
let tiles = new Map();

let cameraX = 0;
let cameraY = 0;
let zoomScale = 1;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let velocityX = 0;
let velocityY = 0;

let lastMove = 0;

async function loadAvailableFiles() {
  try {
    const response = await fetch("tiles.json");
    window.availableFiles = await response.json();
    console.log("Loaded metadata-based tiles:", window.availableFiles);
  } catch (error) {
    console.error("Failed to load tile metadata", error);
    window.availableFiles = [];
  }
}

function randomFile() {
  const files = (window.availableFiles || []).filter(file => {
    const lower = file.url.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') ||
           lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov');
  });
  const chosen = files.length ? files[Math.floor(Math.random() * files.length)] : null;
  return chosen;
}

function createPost(fileObj) {
  if (!fileObj) return;
  const lowerUrl = fileObj.url.toLowerCase();
  const frame = document.createElement('div');
  frame.className = 'frame';
  let media;
  if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm')) {
    media = document.createElement('video');
    media.muted = true;
    media.loop = true;
    media.autoplay = true;
    media.playsInline = true;
  } else {
    media = document.createElement('img');
  }
  media.dataset.src = fileObj.url;
  frame.appendChild(media);

  const post = document.createElement('div');
  post.className = 'post fade-in';
  if (fileObj.tier === 'featured') post.classList.add('featured');
  if (fileObj.tier === 'paid') post.classList.add('paid');
  post.appendChild(frame);

  if (fileObj.link) {
    post.style.cursor = 'pointer';
    post.addEventListener('click', () => {
      window.open(fileObj.link, '_blank');
    });
  }

  return post;
}

function updateTiles() {
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;

  const effectiveTileSize = tileSize * zoomScale;
  const startCol = Math.floor((cameraX - bufferTiles * effectiveTileSize) / tileSize);
  const endCol = Math.ceil((cameraX + viewWidth + bufferTiles * effectiveTileSize) / tileSize);
  const startRow = Math.floor((cameraY - bufferTiles * effectiveTileSize) / tileSize);
  const endRow = Math.ceil((cameraY + viewHeight + bufferTiles * effectiveTileSize) / tileSize);

  const neededTiles = new Set();

  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      const key = `${col},${row}`;
      neededTiles.add(key);
      if (!tiles.has(key)) {
        const fileObj = randomFile();
        const post = createPost(fileObj);
        if (!post) continue;
        post.style.left = `${col * tileSize}px`;
        post.style.top = `${row * tileSize}px`;
        gallery.appendChild(post);
        requestAnimationFrame(() => {
          post.classList.add('show');
        });
        tiles.set(key, post);
      }
    }
  }

  for (const [key, tile] of tiles) {
    if (!neededTiles.has(key)) {
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
      rect.right >= 0 &&
      rect.left <= window.innerWidth &&
      rect.bottom >= 0 &&
      rect.top <= window.innerHeight
    ) {
      if (media.tagName === 'IMG') {
        if (!media.src) {
          media.src = media.dataset.src;
        }
      } else if (media.tagName === 'VIDEO') {
        if (media.children.length === 0) {
          const source = document.createElement('source');
          source.src = media.dataset.src;
          source.type = 'video/mp4';
          media.appendChild(source);
          media.load();
        }
      }
    } else {
      if (media.tagName === 'IMG') {
        media.removeAttribute('src');
      } else if (media.tagName === 'VIDEO') {
        media.innerHTML = '';
      }
    }
  });
}

function moveCamera(dx, dy) {
  const now = Date.now();
  if (now - lastMove < 16) return;
  lastMove = now;

  cameraX += dx;
  cameraY += dy;
  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px) scale(${zoomScale})`;
  updateTiles();
}

function animate() {
  if (!isDragging) {
    if (Math.abs(velocityX) > 0.1 || Math.abs(velocityY) > 0.1) {
      moveCamera(-velocityX, -velocityY);
      velocityX *= 0.95;
      velocityY *= 0.95;
    }
  }
  requestAnimationFrame(animate);
}

document.addEventListener('mousedown', e => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  velocityX = 0;
  velocityY = 0;
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

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
  if (e.touches.length === 2) {
    pinchStartDist = getTouchDistance(e.touches);
    initialZoom = zoomScale;
  } else {
    isDragging = true;
    const touch = e.touches[0];
    dragStartX = touch.clientX;
    dragStartY = touch.clientY;
  }
});

document.addEventListener('touchend', () => {
  isDragging = false;
});

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

let pinchStartDist = 0;
let initialZoom = 1;

document.addEventListener('touchmove', e => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const newDist = getTouchDistance(e.touches);
    const scaleChange = newDist / pinchStartDist;
    zoomScale = Math.min(3, Math.max(0.5, initialZoom * scaleChange));
    gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px) scale(${zoomScale})`;
  } else if (isDragging) {
    e.preventDefault();
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

window.addEventListener('wheel', e => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const scaleChange = e.deltaY < 0 ? 1.1 : 0.9;
    zoomScale = Math.min(3, Math.max(0.5, zoomScale * scaleChange));
    gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px) scale(${zoomScale})`;
  } else {
    moveCamera(e.deltaX, e.deltaY);
  }
}, { passive: false });

window.addEventListener('keydown', e => {
  const speed = 20;
  if (e.key === 'ArrowUp') moveCamera(0, -speed);
  if (e.key === 'ArrowDown') moveCamera(0, speed);
  if (e.key === 'ArrowLeft') moveCamera(-speed, 0);
  if (e.key === 'ArrowRight') moveCamera(speed, 0);
});

async function init() {
  await loadAvailableFiles();
  if (!window.availableFiles || window.availableFiles.length === 0) {
    document.getElementById('loader').textContent = 'No images available.';
    return;
  }
  document.getElementById('loader').style.display = 'none';
  cameraX = 0;
  cameraY = 0;
  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px) scale(${zoomScale})`;
  updateTiles();
  animate();
}

init();
