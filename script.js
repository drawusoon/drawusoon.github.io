const copy = window.DRAWUSOON_COPY || { ru: {}, en: {} };

const albumKeys = {
  portraits: "albumPortraits",
  fullbody: "albumFullbody",
  stars: "albumStars",
  wide: "albumWide",
};

const fallback = {
  works: ["works/01.jpg", "works/02.jpg", "works/03.jpg", "works/04.jpg"],
  about: ["about/01.jpg", "about/02.jpg", "about/03.jpg", "about/04.jpg"],
  albums: {
    portraits: { cover: "albums/portraits/cover.jpg", images: ["albums/portraits/01.jpg"] },
    fullbody: { cover: "albums/fullbody/cover.jpg", images: ["albums/fullbody/01.jpg"] },
    stars: { cover: "albums/stars/cover.jpg", images: ["albums/stars/01.jpg"] },
    wide: { cover: "albums/wide/cover.jpg", images: ["albums/wide/01.jpg"] },
  },
};

const intervalMs = 5600;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const home = document.getElementById("home");
const albumView = document.getElementById("album-view");
const albumGrid = document.getElementById("album-grid");
const albumHeading = document.getElementById("album-heading");
const albumEmpty = document.getElementById("album-empty");
const albumBackBottom = document.getElementById("album-back-bottom");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");
const track = document.getElementById("work-track");
const aboutStage = document.getElementById("about-stage");
const aboutBody = document.getElementById("about-body");
const aboutToggle = document.getElementById("about-toggle");
const headerBar = document.getElementById("chrome");

let media = fallback;
let slides = [];
let index = 0;
let timer = null;
let lang = "ru";

function readLang() {
  try {
    return localStorage.getItem("drawusoon-lang") === "en" ? "en" : "ru";
  } catch {
    return "ru";
  }
}

function writeLang(value) {
  try {
    localStorage.setItem("drawusoon-lang", value);
  } catch {
    // file:// or private mode can block storage
  }
}

function pushUrl(url, state = {}) {
  try {
    history.pushState(state, "", url);
  } catch {
    location.hash = url.startsWith("#") ? url.slice(1) : url;
  }
}

function normalizeMedia(data) {
  return {
    works: data.works?.length ? data.works : fallback.works,
    about: data.about?.length ? data.about : fallback.about,
    albums: { ...fallback.albums, ...(data.albums || {}) },
  };
}

function applyMedia(data) {
  media = normalizeMedia(data);
  fillWorks(media.works);
  fillAbout(media.about);
  fillAlbumCovers();
  if (location.hash.startsWith("#album-")) {
    openAlbum(location.hash.replace("#album-", ""));
  }
}

function loadMedia() {
  if (window.__MEDIA__) {
    applyMedia(window.__MEDIA__);
    return;
  }
  if (location.protocol === "file:") {
    applyMedia(fallback);
    return;
  }
  fetch("images/manifest.json", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : fallback))
    .catch(() => fallback)
    .then(applyMedia);
}

lang = readLang();
let marqueeOffset = 0;
let marqueeReady = false;

function asset(src) {
  if (!src) return "";
  return src.startsWith("images/") ? src : `images/${src}`;
}

function applyLang() {
  const pack = copy[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (pack[key]) el.textContent = pack[key];
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.lang === lang);
  });
  if (lightboxClose) lightboxClose.setAttribute("aria-label", pack.lightboxClose);
  updateAboutToggleLabel();
  updateAboutCollapsedHeight();
  writeLang(lang);
}

function updateAboutCollapsedHeight() {
  if (!aboutBody) return;
  const paras = aboutBody.querySelectorAll("p");
  if (paras.length < 2) return;
  const lineHeight = parseFloat(getComputedStyle(paras[1]).lineHeight) || 26;
  const collapsedHeight = paras[0].offsetHeight + lineHeight * 2.2 + 4;
  aboutBody.style.setProperty("--about-collapsed-height", `${collapsedHeight}px`);
}

function updateAboutToggleLabel() {
  const label = document.querySelector(".about-toggle-label");
  if (!label || !aboutBody) return;
  const expanded = aboutBody.classList.contains("is-expanded");
  label.textContent = copy[lang][expanded ? "aboutCollapse" : "aboutExpand"];
}

function setAboutExpanded(expanded) {
  if (!aboutBody || !aboutToggle) return;
  aboutBody.classList.toggle("is-expanded", expanded);
  aboutBody.classList.toggle("is-collapsed", !expanded);
  aboutToggle.setAttribute("aria-expanded", String(expanded));
  updateAboutToggleLabel();
}

function show(next) {
  if (!slides.length) return;
  slides[index]?.classList.remove("is-active");
  index = (next + slides.length) % slides.length;
  slides[index].classList.add("is-active");
}

function stop() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
}

function play() {
  if (reduceMotion || slides.length < 2) return;
  stop();
  timer = window.setInterval(() => show(index + 1), intervalMs);
}

function fillWorks(list) {
  if (!track) return;
  if (track.children.length) {
    marqueeReady = true;
    return;
  }
  track.innerHTML = "";
  const urls = list.length ? list : fallback.works;
  const cards = [...urls, ...urls];
  cards.forEach((src) => {
    const card = document.createElement("div");
    card.className = "work-card";
    const img = document.createElement("img");
    img.src = asset(src);
    img.alt = "";
    card.appendChild(img);
    track.appendChild(card);
  });
  marqueeReady = true;
}

function fillAbout(list) {
  if (!aboutStage) return;
  if (aboutStage.children.length) {
    slides = [...aboutStage.querySelectorAll(".about-card")];
    index = 0;
    if (!reduceMotion) play();
    return;
  }
  const urls = list.length ? list : fallback.about;
  urls.forEach((src, i) => {
    const card = document.createElement("div");
    card.className = "about-card";
    if (i === 0) card.classList.add("is-active");
    const img = document.createElement("img");
    img.src = asset(src);
    img.alt = "";
    card.appendChild(img);
    aboutStage.appendChild(card);
  });
  slides = [...aboutStage.querySelectorAll(".about-card")];
  index = 0;
  if (!reduceMotion) play();
}

function fillAlbumCovers() {
  document.querySelectorAll("[data-album]").forEach((btn) => {
    const id = btn.dataset.album;
    const img = btn.querySelector("img");
    const cover = media.albums[id]?.cover;
    if (img && cover) img.src = asset(cover);
    else if (img) img.hidden = true;
  });
}

function startMarquee() {
  if (!track) return;
  function loop() {
    if (!reduceMotion && !home.hidden && marqueeReady && track.scrollWidth > 0) {
      marqueeOffset += 0.38;
      const loopAt = track.scrollWidth / 2;
      if (loopAt > 0 && marqueeOffset >= loopAt) marqueeOffset -= loopAt;
      track.style.transform = `translateX(${-marqueeOffset}px)`;
    }
    window.requestAnimationFrame(loop);
  }
  loop();
}

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    lang = btn.dataset.lang;
    applyLang();
  });
});

function openLightbox(src, isWide = false) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.classList.toggle("is-wide", isWide);
  lightbox.hidden = false;
  document.body.classList.add("is-lightbox-open");
}

function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.hidden = true;
  lightboxImg.removeAttribute("src");
  lightboxImg.classList.remove("is-wide");
  document.body.classList.remove("is-lightbox-open");
}

function openAlbum(id) {
  const album = media.albums[id];
  if (!album) return;
  stop();
  home.hidden = true;
  albumView.hidden = false;
  albumHeading.textContent = copy[lang][albumKeys[id]];
  albumGrid.innerHTML = "";
  if (!album.images.length) {
    albumEmpty.hidden = false;
    if (albumBackBottom) albumBackBottom.hidden = true;
  } else {
    albumEmpty.hidden = true;
    if (albumBackBottom) albumBackBottom.hidden = false;
    album.images.forEach((src) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "album-thumb";
      if (id === "wide") btn.classList.add("is-wide");
      const img = document.createElement("img");
      const url = asset(src);
      img.src = url;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      btn.appendChild(img);
      btn.addEventListener("click", () => openLightbox(url, id === "wide"));
      albumGrid.appendChild(btn);
    });
  }
  window.scrollTo(0, 0);
  pushUrl(`#album-${id}`, { album: id });
}

function closeAlbum() {
  closeLightbox();
  albumView.hidden = true;
  home.hidden = false;
  play();
  pushUrl("#albums");
  document.getElementById("albums").scrollIntoView();
}

document.querySelectorAll(".nav a, .brand, .view-all").forEach((a) => {
  a.addEventListener("click", () => {
    if (!albumView.hidden) {
      albumView.hidden = true;
      home.hidden = false;
      play();
    }
  });
});

document.querySelectorAll("[data-album]").forEach((btn) => {
  btn.addEventListener("click", () => openAlbum(btn.dataset.album));
});

document.querySelectorAll(".album-back").forEach((btn) => {
  btn.addEventListener("click", closeAlbum);
});

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox || event.target === lightboxClose) closeLightbox();
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox && !lightbox.hidden) closeLightbox();
});

window.addEventListener("popstate", () => {
  const match = location.hash.match(/^#album-(.+)$/);
  if (match) openAlbum(match[1]);
  else if (!albumView.hidden) {
    albumView.hidden = true;
    home.hidden = false;
    play();
  }
});

window.addEventListener(
  "scroll",
  () => {
    headerBar?.classList.toggle("is-solid", window.scrollY > 12);
  },
  { passive: true }
);

function boot() {
  applyLang();
  updateAboutCollapsedHeight();
  startMarquee();
  loadMedia();
}

window.addEventListener("resize", updateAboutCollapsedHeight);

if (aboutToggle) {
  aboutToggle.addEventListener("click", () => {
    setAboutExpanded(!aboutBody.classList.contains("is-expanded"));
  });
}

try {
  boot();
} catch (error) {
  console.error("drawusoon boot error:", error);
}
