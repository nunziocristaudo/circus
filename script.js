const gallery = document.getElementById("gallery");
const tileSize = 150;
const buffer = 2;
const baseURL = "https://dev.tinysquares.io/";
const workerURL = "https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/";
const clipAPI = "https://devtiny-clip-api.hf.space/embed";

let tiles = new Map();
let cameraX = 0, cameraY = 0;
let isDragging = false, dragStartX = 0, dragStartY = 0;
let velocityX = 0, velocityY = 0;
let lastRender = performance.now();

let tileData = [];

async function loadTiles() {
  try {
    const res = await fetch("tiles.json");
    tileData = await res.json();
    requestAnimationFrame(render);
  } catch (e) {
    console.error("Failed to load tiles.json", e);
  }
}

function render() {
  const now = performance.now();
  const delta = (now - lastRender) / 1000;
  lastRender = now;

  velocityX *= 0.9;
  velocityY *= 0.9;
  cameraX += velocityX * delta * 60;
  cameraY += velocityY * delta * 60;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const cols = Math.ceil(w / tileSize) + buffer * 2;
  const rows = Math.ceil(h / tileSize) + buffer * 2;

  const offsetX = Math.floor(cameraX / tileSize) - buffer;
  const offsetY = Math.floor(cameraY / tileSize) - buffer;

  const visible = new Set();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const gx = offsetX + x;
      const gy = offsetY + y;
      const id = `${gx},${gy}`;
      visible.add(id);

      if (!tiles.has(id)) {
        const idx = Math.abs((gx * 73856093 ^ gy * 19349663)) % tileData.length;
        const { url, tier, link } = tileData[idx];

        const div = document.createElement("div");
        div.className = "post fade-in" + (tier ? ` ${tier}` : "");
        div.style.left = gx * tileSize + "px";
        div.style.top = gy * tileSize + "px";

        const frame = document.createElement("div");
        frame.className = "frame";
        const ext = url.split(".").pop();
        const media = document.createElement(ext === "mp4" ? "video" : "img");
        media.src = baseURL + url;
        if (ext === "mp4") Object.assign(media, { autoplay: true, loop: true, muted: true });
        media.loading = "lazy";

        frame.appendChild(media);
        div.appendChild(frame);
        if (link) div.addEventListener("click", () => window.open(link, "_blank"));

        gallery.appendChild(div);
        requestAnimationFrame(() => div.classList.add("show"));
        tiles.set(id, div);
      }
    }
  }

  for (const [id, el] of tiles.entries()) {
    if (!visible.has(id)) {
      gallery.removeChild(el);
      tiles.delete(id);
    }
  }

  gallery.style.transform = `translate(${-cameraX}px, ${-cameraY}px)`;
  requestAnimationFrame(render);
}

window.addEventListener("mousedown", e => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
});

window.addEventListener("mousemove", e => {
  if (!isDragging) return;
  velocityX = dragStartX - e.clientX;
  velocityY = dragStartY - e.clientY;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
});

window.addEventListener("mouseup", () => isDragging = false);

// Touch support
window.addEventListener("touchstart", e => {
  isDragging = true;
  dragStartX = e.touches[0].clientX;
  dragStartY = e.touches[0].clientY;
});
window.addEventListener("touchmove", e => {
  if (!isDragging) return;
  velocityX = dragStartX - e.touches[0].clientX;
  velocityY = dragStartY - e.touches[0].clientY;
  dragStartX = e.touches[0].clientX;
  dragStartY = e.touches[0].clientY;
});
window.addEventListener("touchend", () => isDragging = false);

window.addEventListener("resize", () => {
  tiles.forEach(el => gallery.removeChild(el));
  tiles.clear();
});

const input = document.createElement("input");
input.type = "text";
input.placeholder = "Search...";
input.style.cssText = "position:fixed;top:1rem;left:1rem;z-index:10000;padding:0.5rem;";
document.body.appendChild(input);

input.addEventListener("keydown", async e => {
  if (e.key !== "Enter") return;
  const query = input.value.trim();
  if (!query) return;

  const res = await fetch(clipAPI, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: query })
  });

  const { embedding } = await res.json();
  const top = tileData.map((tile, i) => ({
    i,
    score: cosine(embedding, tile.embedding)
  })).sort((a, b) => b.score - a.score).slice(0, 100);

  cameraX = 0;
  cameraY = 0;
  tiles.forEach(el => gallery.removeChild(el));
  tiles.clear();
  tileData = top.map(({ i }) => tileData[i]);
});

function cosine(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] ** 2;
    normB += b[i] ** 2;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

loadTiles();
