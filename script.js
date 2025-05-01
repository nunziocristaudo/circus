const gallery = document.getElementById("gallery");
const loader = document.getElementById("loader");

const baseURL = 'https://dev.tinysquares.io/';
const workerURL = 'https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/';

let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;

// Lazy loading observer
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target.querySelector("img");
      if (img && img.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
      entry.target.classList.add("show");
      observer.unobserve(entry.target);
    }
  });
}, {
  root: null,
  rootMargin: "200px",
  threshold: 0.1
});

// Pan and zoom
const updateTransform = () => {
  gallery.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  requestAnimationFrame(updateTransform);
};
updateTransform();

gallery.addEventListener("mousedown", (e) => {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  gallery.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  translateX += e.clientX - lastX;
  translateY += e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
});

window.addEventListener("mouseup", () => {
  isDragging = false;
  gallery.style.cursor = "grab";
});

window.addEventListener("wheel", (e) => {
  const delta = -e.deltaY * 0.001;
  scale = Math.min(Math.max(0.5, scale + delta), 3);
});

// Create post from filename
function createPost(filename, index, cols) {
  const post = document.createElement("div");
  post.className = "post fade-in";

  const frame = document.createElement("div");
  frame.className = "frame";

  const ext = filename.split('.').pop().toLowerCase();
  let media;

  const src = `${baseURL}${filename}`;

  if (ext === 'mp4' || ext === 'mov') {
    media = document.createElement("video");
    media.src = src;
    media.muted = true;
    media.loop = true;
    media.autoplay = true;
    media.playsInline = true;
  } else {
    media = document.createElement("img");
    media.dataset.src = src;
    media.alt = "";
  }

  frame.appendChild(media);
  post.appendChild(frame);

  // Layout positioning
  const x = (index % cols) * 150;
  const y = Math.floor(index / cols) * 150;
  post.style.left = `${x}px`;
  post.style.top = `${y}px`;

  gallery.appendChild(post);
  observer.observe(post);
}

// Fetch media list and populate gallery
async function loadGallery() {
  try {
    const response = await fetch(workerURL);
    const files = await response.json();

    const cols = Math.floor(window.innerWidth / 150);
    files.forEach((filename, index) => {
      createPost(filename, index, cols);
    });

  } catch (err) {
    console.error("Error loading media:", err);
  } finally {
    loader.style.display = "none";
  }
}

loadGallery();
