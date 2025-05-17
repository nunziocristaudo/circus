const gallery = document.getElementById('gallery');
const tileSize = 150;
const bufferTiles = 1;
let tiles = new Map();

const baseURL = 'https://dev.tinysquares.io/';
const workerURL = 'https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/';
const clipAPI = 'https://devtiny-clip-api.hf.space/embed';

let cameraX = 0;
let cameraY = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let velocityX = 0;
let velocityY = 0;

let lastMove = 0;

let allTiles = [];

// Load tile metadata
fetch('tiles.json')
  .then(res => res.json())
  .then(data => {
    allTiles = data;
    init();
  });

// Set up canvas dragging and momentum
function init() {
  requestAnimationFrame(update);

  window.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX - cameraX;
    dragStartY = e.clientY - cameraY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const newCameraX = e.clientX - dragStartX;
      const newCameraY = e.clientY - dragStartY;
      velocityX = newCameraX - cameraX;
      velocityY = newCameraY - cameraY;
      cameraX = newCameraX;
      cameraY = newCameraY;
    }
  });

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(onSearch, 400));
  }
}

// Rendering loop
function update() {
  if (!isDragging) {
    cameraX += velocityX;
    cameraY += velocityY;
    velocityX *= 0.9;
    velocityY *= 0.9;
  }

  renderTiles();
  requestAnimationFrame(update);
}

function renderTiles(tilesToShow = allTiles) {
  gallery.innerHTML = '';
  tiles.clear();

  // Shuffle tilesToShow
  const shuffled = [...tilesToShow].sort(() => Math.random() - 0.5);

  shuffled.forEach((tile) => {
    const div = document.createElement('div');
    div.className = 'tile';

    const media = document.createElement('img');
    media.src = baseURL + tile.url;
    media.loading = 'lazy';
    media.width = tileSize;
    media.height = tileSize;

    div.appendChild(media);
    gallery.appendChild(div);
  });
}

// Tag matching using cosine similarity
async function onSearch(e) {
  const query = e.target.value.trim();
  if (!query) {
    renderTiles();
    return;
  }

  const response = await fetch(clipAPI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: query })
  });

  const result = await response.json();
  const inputEmbedding = result.embedding;
  const matches = allTiles
    .map(tile => {
      return {
        ...tile,
        similarity: cosineSimilarity(inputEmbedding, tile.embedding)
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 50);

  gallery.innerHTML = '';
  tiles.clear();

  matches.forEach((tile, i) => {
    const div = document.createElement('div');
    div.className = 'tile';
    div.style.left = `${(i % 10) * tileSize}px`;
    div.style.top = `${Math.floor(i / 10) * tileSize}px`;

    const media = document.createElement('img');
    media.src = baseURL + tile.url;
    media.loading = 'lazy';
    media.width = tileSize;
    media.height = tileSize;
    div.appendChild(media);

    gallery.appendChild(div);
  });
}

// Cosine similarity helper
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Debounce helper
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
