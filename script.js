const gallery = document.getElementById('gallery');
const tileSize = 150;
const bufferTiles = 1;
let tiles = new Map();

const baseURL = 'https://dev.tinysquares.io/';
const workerURL = 'https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/';

let cameraX = 0;
let cameraY = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let velocityX = 0;
let velocityY = 0;

let lastMove = 0;

async function loadAvailableFiles() {
  const workerURL = 'https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/';
  const localTilesURL = 'tiles.json';

  try {
    const [remoteRes, localRes] = await Promise.all([
      fetch(workerURL).then(res => res.json()).catch(() => []),
      fetch(localTilesURL).then(res => res.json()).catch(() => [])
    ]);

    const normalize = (item) =>
      typeof item === 'string'
        ? { url: item }
        : item;

    const remoteFiles = remoteRes.map(normalize);
    const localFiles = localRes.map(normalize);

    window.availableFiles = [...remoteFiles, ...localFiles];

    console.log(`Loaded ${window.availableFiles.length} total tiles.`);
  } catch (err) {
    console.error('Error loading tile sources:', err);
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

  // ✅ Correct the path using baseURL
  media.dataset.src = baseURL + fileObj.url;
  frame.appendChild(media);

  const post = document.createElement('div');
  post.className = 'post fade-in';
  if (fileObj.tier === 'featured') post.classList.add('featured');
  if (fileObj.tier === 'paid') post.classList.add('paid');
  post.appendChild(frame);

  if (fileObj.link) {
    post.style.cursor = 'pointer';
    post.style.pointerEvents = 'auto';
    post.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(fileObj.link, '_blank');
    });
  }

  return post;
}

function updateTiles() {
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;

  const startCol = Math.floor((cameraX - bufferTiles * tileSize) / tileSize);
  const endCol = Math.ceil((cameraX + viewWidth + bufferTiles * tileSize) / tileSize);
  const startRow = Math.floor((cameraY - bufferTiles * tileSize) / tileSize);
  const endRow = Math.ceil((cameraY + viewHeight + bufferTiles * tileSize) / tileSize);

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
  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`;
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
  e.preventDefault();
  isDragging = true;
  const touch = e.touches[0];
  dragStartX = touch.clientX;
  dragStartY = touch.clientY;
});

document.addEventListener('touchend', () => {
  isDragging = false;
});

document.addEventListener('touchmove', e => {
  if (isDragging) {
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
});

window.addEventListener('wheel', e => {
  moveCamera(e.deltaX, e.deltaY);
});

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
  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`;
  updateTiles();
  animate();
}
init();

const lightbox = document.getElementById('lightbox');
const mediaContainer = document.getElementById('mediaContainer');
const closeBtn = document.getElementById('closeBtn');
const likeBox = document.querySelector('.like-box');
const likeCountSpan = document.getElementById('likeCount');
const heart = document.querySelector('.heart');
const linkBox = document.getElementById('linkBox');

let currentMediaUrl = '';

function openLightbox(fileObj) {
  currentMediaUrl = fileObj.url;
  mediaContainer.innerHTML = '';
  linkBox.innerHTML = '';

  const ext = currentMediaUrl.toLowerCase().split('.').pop();
  let media;
  if (['mp4', 'webm', 'mov'].includes(ext)) {
    media = document.createElement('video');
    media.src = currentMediaUrl;
    media.autoplay = true;
    media.loop = true;
    media.muted = false;
    media.controls = true;
    media.playsInline = true;
  } else {
    media = document.createElement('img');
    media.src = currentMediaUrl;
  }

  mediaContainer.appendChild(media);
  likeCountSpan.textContent = getLikes(currentMediaUrl);
  heart.textContent = '♡';
  lightbox.classList.remove('hidden');

  if (fileObj.link) {
    const link = document.createElement('a');
    link.href = fileObj.link;
    link.textContent = 'Learn more or support this creator →';
    link.target = '_blank';
    link.rel = 'noopener';
    linkBox.appendChild(link);
  }
}

function closeLightbox() {
  lightbox.classList.add('hidden');
  mediaContainer.innerHTML = '';
  linkBox.innerHTML = '';
}

function getLikes(url) {
  return parseInt(localStorage.getItem(`likes_${url}`) || '0', 10);
}

function incrementLikes(url) {
  const current = getLikes(url);
  const updated = current + 1;
  localStorage.setItem(`likes_${url}`, updated);
  return updated;
}

// Hook up modal close and like button
closeBtn.addEventListener('click', closeLightbox);
heart.addEventListener('click', () => {
  const updated = incrementLikes(currentMediaUrl);
  likeCountSpan.textContent = updated;
  heart.textContent = '❤️';
  heart.classList.add('clicked');
  setTimeout(() => heart.classList.remove('clicked'), 400);
});
