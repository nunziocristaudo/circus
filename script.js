const gallery = document.getElementById('gallery');
const loader = document.getElementById('loader');

const baseURL = 'https://dev.tinysquares.io/';
const workerURL = 'https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/';

let scale = 1;
let origin = { x: 0, y: 0 };
let isDragging = false;
let start = { x: 0, y: 0 };

function setTransform() {
  gallery.style.transform = `translate(${origin.x}px, ${origin.y}px) scale(${scale})`;
}

function loadImages() {
  fetch(workerURL)
    .then(res => res.json())
    .then(images => {
      images.forEach((filename, index) => {
        const post = document.createElement('div');
        post.className = 'post fade-in';
        post.style.left = `${(index % 10) * 160}px`;
        post.style.top = `${Math.floor(index / 10) * 160}px`;

        const frame = document.createElement('div');
        frame.className = 'frame';

        if (filename.endsWith('.mp4')) {
          const video = document.createElement('video');
          video.src = baseURL + filename;
          video.autoplay = true;
          video.loop = true;
          video.muted = true;
          frame.appendChild(video);
        } else {
          const img = document.createElement('img');
          img.src = baseURL + filename;
          frame.appendChild(img);
        }

        post.appendChild(frame);
        gallery.appendChild(post);

        setTimeout(() => {
          post.classList.add('show');
        }, 30 * index);
      });
    })
    .finally(() => loader.style.display = 'none');
}

function handlePointerEvents() {
  gallery.addEventListener('pointerdown', (e) => {
    isDragging = true;
    start = { x: e.clientX - origin.x, y: e.clientY - origin.y };
    gallery.style.cursor = 'grabbing';
  });

  gallery.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    origin.x = e.clientX - start.x;
    origin.y = e.clientY - start.y;
    setTransform();
  });

  gallery.addEventListener('pointerup', () => {
    isDragging = false;
    gallery.style.cursor = 'grab';
  });

  gallery.addEventListener('pointerleave', () => {
    isDragging = false;
    gallery.style.cursor = 'grab';
  });
}

function handleKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    const step = 50;
    switch (e.key) {
      case 'ArrowUp':
        origin.y += step;
        break;
      case 'ArrowDown':
        origin.y -= step;
        break;
      case 'ArrowLeft':
        origin.x += step;
        break;
      case 'ArrowRight':
        origin.x -= step;
        break;
      default:
        return;
    }
    setTransform();
  });
}

function handleMouseWheelZoom() {
  window.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;

    e.preventDefault();
    const zoomFactor = 0.1;
    const direction = e.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(5, Math.max(0.2, scale + zoomFactor * direction));

    // Zoom centered on cursor
    const rect = gallery.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    origin.x -= (cx / scale - cx / newScale);
    origin.y -= (cy / scale - cy / newScale);
    scale = newScale;

    setTransform();
  }, { passive: false });
}

loadImages();
handlePointerEvents();
handleKeyboardNavigation();
handleMouseWheelZoom();
