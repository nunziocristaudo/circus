const baseURL = 'https://dev.tinysquares.io/';
const workerURL = 'https://quiet-mouse-8001.flaxen-huskier-06.workers.dev/';
const POST_SIZE = 150;

const IMAGE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.heic'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm'];

function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * window.innerWidth * 2) - window.innerWidth,
    y: Math.floor(Math.random() * window.innerHeight * 2) - window.innerHeight,
  };
}

function createMediaElement(src) {
  const isVideo = VIDEO_EXTENSIONS.some(ext => src.toLowerCase().endsWith(ext));
  const el = document.createElement(isVideo ? 'video' : 'img');

  if (isVideo) {
    el.src = src;
    el.muted = true;
    el.autoplay = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = 'metadata';
  } else {
    el.src = src;
    el.loading = 'lazy';
    el.decoding = 'async';
  }

  el.classList.add('fade-in');
  el.onload = () => el.classList.add('show');
  return el;
}

function createPost(src) {
  const post = document.createElement('div');
  post.className = 'post';
  const { x, y } = getRandomPosition();
  post.style.transform = `translate(${x}px, ${y}px)`;

  const frame = document.createElement('div');
  frame.className = 'frame';
  post.appendChild(frame);

  post.dataset.src = src;
  observer.observe(post);

  return post;
}

const observer = new IntersectionObserver((entries, obs) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const post = entry.target;
      const frame = post.querySelector('.frame');
      const media = createMediaElement(post.dataset.src);
      frame.appendChild(media);
      obs.unobserve(post);
    }
  }
}, {
  root: null,
  rootMargin: '300px',
  threshold: 0.01,
});

async function init() {
  try {
    const response = await fetch(workerURL);
    const mediaList = await response.json(); // Expects array of filenames
    const gallery = document.getElementById('gallery');

    mediaList.forEach(filename => {
      const lower = filename.toLowerCase();
      const isValid = IMAGE_EXTENSIONS.concat(VIDEO_EXTENSIONS).some(ext => lower.endsWith(ext));
      if (!isValid) return;

      const src = baseURL + filename;
      const post = createPost(src);
      gallery.appendChild(post);
    });

    document.getElementById('loader').style.display = 'none';
  } catch (err) {
    console.error('Error loading media list:', err);
  }
}

init();
