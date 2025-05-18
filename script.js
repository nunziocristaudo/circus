const gallery = document.getElementById('gallery');
const tileSize = 150;
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
let lastFrameTime = performance.now();

let embeddingData = [];
let allTiles = [];

const loadTilesJSON = async () => {
    const response = await fetch('tiles.json');
    const data = await response.json();
    allTiles = data;
    embeddingData = data.map(t => ({ url: t.url, embedding: t.embedding, tier: t.tier || "standard", link: t.link || "" }));
};

const cosineSimilarity = (a, b) => {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
};

const renderTiles = (tileList) => {
    gallery.innerHTML = '';
    const cols = Math.ceil(window.innerWidth / tileSize);
    const rows = Math.ceil(window.innerHeight / tileSize);
    let index = 0;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (index >= tileList.length) return;
            const tile = tileList[index++];
            const el = document.createElement('div');
            el.className = 'post fade-in ' + (tile.tier === 'featured' ? 'featured' : tile.tier === 'paid' ? 'paid' : '');
            el.style.left = `${x * tileSize}px`;
            el.style.top = `${y * tileSize}px`;
            el.style.width = `${tileSize}px`;
            el.style.height = `${tileSize}px`;

            const frame = document.createElement('div');
            frame.className = 'frame';

            const mediaURL = baseURL + tile.url;
            if (tile.url.endsWith('.mp4')) {
                const vid = document.createElement('video');
                vid.src = mediaURL;
                vid.autoplay = true;
                vid.loop = true;
                vid.muted = true;
                vid.playsInline = true;
                vid.loading = "lazy";
                frame.appendChild(vid);
            } else {
                const img = document.createElement('img');
                img.src = mediaURL;
                img.loading = "lazy";
                frame.appendChild(img);
            }

            el.appendChild(frame);
            gallery.appendChild(el);
            requestAnimationFrame(() => el.classList.add('show'));
        }
    }
};

const fetchSearchEmbedding = async (query) => {
    const response = await fetch(clipAPI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
    });
    return await response.json();
};

const performSearch = async (query) => {
    const { embedding } = await fetchSearchEmbedding(query);
    const ranked = embeddingData
        .map(tile => ({
            ...tile,
            score: cosineSimilarity(embedding, tile.embedding)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);
    renderTiles(ranked);
};

document.getElementById('searchInput').addEventListener('input', e => {
    const query = e.target.value.trim();
    if (query.length >= 3) {
        performSearch(query);
    } else {
        renderTiles(embeddingData.sort(() => Math.random() - 0.5));
    }
});

const animate = (time) => {
    const dt = (time - lastFrameTime) / 1000;
    lastFrameTime = time;
    cameraX += velocityX * dt;
    cameraY += velocityY * dt;
    velocityX *= 0.9;
    velocityY *= 0.9;
    gallery.style.transform = `translate(${cameraX}px, ${cameraY}px)`;
    requestAnimationFrame(animate);
};

gallery.addEventListener('mousedown', e => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
});

document.addEventListener('mouseup', () => isDragging = false);

document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    velocityX = e.clientX - dragStartX;
    velocityY = e.clientY - dragStartY;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
});

window.addEventListener('resize', () => renderTiles(embeddingData.sort(() => Math.random() - 0.5)));

(async () => {
    await loadTilesJSON();
    renderTiles(embeddingData.sort(() => Math.random() - 0.5));
    requestAnimationFrame(animate);
})();
