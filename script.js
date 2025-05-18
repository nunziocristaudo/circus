const gallery = document.getElementById('gallery');
const tileSize = 150;
let tiles = new Map();

const baseURL = 'https://dev.tinysquares.io/';
const clipAPI = 'https://devtiny-clip-api.hf.space/embed';

let cameraX = 0;
let cameraY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let velocityX = 0;
let velocityY = 0;

let allTiles = [];

fetch('tiles.json')
  .then(res => res.json())
  .then(data => {
    allTiles = data;
    renderTiles(shuffle([...allTiles])); // show random 100 on load
    init();
  });

// Dragging
function init() {
  requestAnimationFrame(update);

  window.addEventListener('mousedown', e => {
    isDragging = true;
    dragStartX = e.clientX - cameraX;
    dragStartY = e.clientY - cameraY;
  });

  window.addEventListener('mouseup', () => isDragging = false);

  window.addEventListener('mousemove', e => {
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

// Animate loop
function update() {
  if (!isDragging) {
    cameraX += velocityX;
    cameraY += velocityY;
    velocityX *= 0.9;
    velocityY *= 0.9;
  }

  requestAnimationFrame(update);
}

// Render
function renderTiles(tilesToShow = allTiles) {
  gallery.innerHTML = '';
  tiles.clear();

  const cols = Math.ceil(window.innerWidth / tileSize) + bufferTiles * 2;
  const rows = Math.ceil(window.innerHeight / tileSize) + bufferTiles * 2;

  const startX = Math.floor(-cameraX / tileSize) - bufferTiles;
  const startY = Math.floor(-cameraY / tileSize) - bufferTiles;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = (row + startY) * 1000 + (col + startX); // a fake global index
      const tile = tilesToShow[i % tilesToShow.length]; // cycle through tiles

      const div = document.createElement('div');
      div.className = 'tile';
      div.style.left = `${(col + startX) * tileSize + cameraX}px`;
      div.style.top = `${(row + startY) * tileSize + cameraY}px`;

      const media = document.createElement('img');
      media.src = baseURL + tile.url;
      media.loading = 'lazy';
      media.width = tileSize;
      media.height = tileSize;

      div.appendChild(media);
      gallery.appendChild(div);
    }
  }
}

// Search
async function onSearch(e) {
  const query = e.target.value.trim();
  if (!query) {
    renderTiles(shuffle([...allTiles]).slice(0, 100));
    return;
  }

  try {
    const res = await fetch(clipAPI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query })
    });

    const { embedding } = await res.json();

    const matches = allTiles.map(tile => {
      const dot = tile.embedding.reduce((sum, v, i) => sum + v * embedding[i], 0);
      const normA = Math.sqrt(tile.embedding.reduce((sum, v) => sum + v * v, 0));
      const normB = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      const similarity = dot / (normA * normB);
      return { ...tile, similarity };
    });

    matches.sort((a, b) => b.similarity - a.similarity);
    renderTiles(matches.slice(0, 100));
  } catch (err) {
    console.error('❌ Error fetching embedding:', err);
  }
}

// Shuffle helper
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Debounce
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
