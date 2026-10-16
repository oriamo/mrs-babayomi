const M = window.MEMORIAL;
const $ = (id) => document.getElementById(id);

// ---------- Header ----------
const fmt = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const age = (() => {
  const b = new Date(M.born + "T12:00:00"), d = new Date(M.died + "T12:00:00");
  let a = d.getFullYear() - b.getFullYear();
  if (d < new Date(d.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
})();
$("title").textContent = M.title;
$("first-names").textContent = M.firstNames;
$("surname").textContent = M.surname;
$("born-label").textContent = fmt(M.born);
$("died-label").textContent = fmt(M.died);
$("age").textContent = `${age} years`;
const verses = M.verses ?? (M.verse ? [{ text: M.verse, ref: M.verseRef }] : []);
$("verses").replaceChildren(
  ...verses.map(({ text, ref }) => {
    const q = Object.assign(document.createElement("blockquote"), { className: "reveal" });
    q.append(Object.assign(document.createElement("p"), { textContent: `“${text}”` }));
    if (ref) q.append(Object.assign(document.createElement("cite"), { textContent: ref }));
    return q;
  })
);
$("story").replaceChildren(...M.story.map((t) => Object.assign(document.createElement("p"), { textContent: t })));

// ---------- Reveal on scroll ----------
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
  { threshold: 0.12 }
);
const observe = (root = document) => root.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
observe();

const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props);
  n.append(...kids.filter(Boolean));
  return n;
};

// ---------- Media (family photos from media.json + photos shared by visitors) ----------
const { hero, items } = await fetch("media.json")
  .then((r) => (r.ok ? r.json() : {}))
  .catch(() => ({}))
  .then((j) => ({ hero: j.hero ?? null, items: j.items ?? [] }));
if (hero) $("hero-photo").src = hero;

const films = items.filter((i) => i.type === "video");
const familyPhotos = items.filter((i) => i.type === "image");
let shared = []; // filled live from Firestore
let media = [];

films.forEach((item, i) => {
  const fig = el("figure", { className: "film reveal" },
    item.poster && el("img", { src: item.poster, alt: "", loading: "lazy" }),
    el("span", { className: "play" }),
    el("figcaption", { textContent: "Watch" }));
  fig.onclick = () => openLightbox(i);
  $("films").append(fig);
});
observe($("films"));

function renderGallery() {
  media = [...films, ...familyPhotos, ...shared];
  $("gallery-empty").hidden = media.length > 0;
  const figs = [...familyPhotos, ...shared].map((item, k) => {
    const fig = el("figure", { className: `photo reveal${item.wide ? " wide" : ""}${item.by ? " shared" : ""}` },
      el("img", { src: item.src, alt: item.caption || "", loading: "lazy", decoding: "async" }));
    if (item.by) {
      fig.append(el("figcaption", {},
        el("span", { className: "cap", textContent: item.caption }),
        el("span", { className: "by", textContent: `Shared by ${item.by}` })));
    }
    fig.onclick = () => openLightbox(films.length + k);
    return fig;
  });
  $("gallery").replaceChildren(...figs);
  observe($("gallery"));
}
renderGallery();

// ---------- Lightbox ----------
let current = 0;
let fullLoader = null; // fetches a shared photo's full-size version
function openLightbox(i) {
  current = (i + media.length) % media.length;
  const item = media[current];
  const node = el(item.type === "video" ? "video" : "img", { src: item.src });
  if (item.type === "video") Object.assign(node, { controls: true, autoplay: true, playsInline: true, poster: item.poster || "" });
  $("lb-content").replaceChildren(node);
  if (item.fullId && fullLoader) {
    fullLoader(item.fullId).then((src) => { if (src && media[current] === item) node.src = src; });
  }
  const cap = $("lb-caption");
  cap.hidden = !item.by;
  $("lightbox").classList.toggle("has-caption", !!item.by);
  if (item.by) cap.replaceChildren(item.caption, el("small", { textContent: `Shared by ${item.by}` }));
  $("lb-count").textContent = `${current + 1} / ${media.length}`;
  $("lightbox").hidden = false;
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  $("lightbox").hidden = true;
  $("lb-content").replaceChildren();
  document.body.style.overflow = "";
}
document.querySelector(".lb-close").onclick = closeLightbox;
document.querySelector(".lb-prev").onclick = () => openLightbox(current - 1);
document.querySelector(".lb-next").onclick = () => openLightbox(current + 1);
$("lightbox").onclick = (e) => e.target.id === "lightbox" && closeLightbox();
document.addEventListener("keydown", (e) => {
  if ($("lightbox").hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") openLightbox(current - 1);
  if (e.key === "ArrowRight") openLightbox(current + 1);
});
let touchX = null;
$("lightbox").addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
$("lightbox").addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) openLightbox(current + (dx < 0 ? 1 : -1));
  touchX = null;
});

// ---------- Photo upload: shrink in the browser to a JPEG data URL under a size budget ----------
async function toJpeg(file, maxSide, maxChars) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  let scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  let q = 0.85;
  for (let tries = 0; tries < 12; tries++) {
    const c = el("canvas", { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", q);
    if (url.length <= maxChars) return { url, wide: c.width > c.height * 1.15 };
    if (q > 0.62) q -= 0.08;
    else scale *= 0.8;
  }
  throw new Error("too large");
}

const shareForm = $("share-form");
const shareStatus = (t) => ($("share-status").textContent = t);
$("share-file").onchange = () => {
  const f = $("share-file").files[0];
  const img = $("share-preview");
  if (img.src) URL.revokeObjectURL(img.src);
  img.hidden = !f;
  $("share-drop").classList.toggle("has-photo", !!f);
  if (f) {
    img.onerror = () => { img.hidden = true; $("share-drop").classList.remove("has-photo"); };
    img.src = URL.createObjectURL(f);
  }
  shareStatus("");
};

// ---------- Guestbook + shared photos (Firestore) ----------
function renderEntry({ name, relation, message, createdAt }, i) {
  const flame = el("div", { className: "flame" }, el("span"));
  flame.style.setProperty("--d", `${(i % 7) * -0.4}s`);
  const meta = [relation, createdAt?.toDate?.().toLocaleDateString("en-GB", { dateStyle: "long" })].filter(Boolean).join(" · ");
  const who = el("p", { className: "who", textContent: name }, meta && el("small", { textContent: meta }));
  return el("article", { className: "entry reveal" }, flame, el("p", { textContent: message }), who);
}

const form = $("gb-form");
if (!M.firebase) {
  form.querySelector("button").disabled = true;
  shareForm.querySelector("button").disabled = true;
  $("gb-status").textContent = "The book of remembrance opens very soon.";
} else {
  const SDK = M.firebaseSdk || "https://www.gstatic.com/firebasejs/11.10.0";
  const { initializeApp } = await import(`${SDK}/firebase-app.js`);
  const fs = await import(`${SDK}/firebase-firestore.js`);
  const db = fs.getFirestore(initializeApp(M.firebase));
  if (M.emulator) fs.connectFirestoreEmulator(db, M.emulator.host, M.emulator.port);
  const col = fs.collection(db, "tributes");

  // Live list: new candles appear for everyone without a refresh
  fs.onSnapshot(
    fs.query(col, fs.orderBy("createdAt", "desc")),
    (snap) => {
      $("gb-list").replaceChildren(...snap.docs.map((d, i) => renderEntry(d.data(), i)));
      observe($("gb-list"));
    },
    () => ($("gb-status").textContent = "Couldn't load the messages. Please refresh.")
  );

  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    const entry = {
      name: $("gb-name").value.trim(),
      relation: $("gb-relation").value.trim(),
      message: $("gb-message").value.trim(),
      createdAt: fs.serverTimestamp(),
    };
    if (!entry.name || !entry.message) return;
    btn.disabled = true;
    $("gb-status").textContent = "Lighting your candle…";
    try {
      await fs.addDoc(col, entry);
      form.reset();
      $("gb-status").textContent = "Thank you. Your candle is lit.";
    } catch {
      $("gb-status").textContent = "Sorry, that didn't go through. Please try again.";
    } finally {
      btn.disabled = false;
    }
  };

  // Shared photos: small version in "photos" (shown in the gallery),
  // full version in "photoFull" (loaded only when someone opens it).
  const photos = fs.collection(db, "photos");
  const fullCache = new Map();
  fullLoader = async (id) => {
    if (!fullCache.has(id)) {
      fullCache.set(id, fs.getDoc(fs.doc(db, "photoFull", id)).then((d) => d.data()?.full).catch(() => null));
    }
    return fullCache.get(id);
  };
  fs.onSnapshot(fs.query(photos, fs.orderBy("createdAt", "asc")), (snap) => {
    shared = snap.docs.map((d) => {
      const p = d.data();
      return { type: "image", src: p.thumb, wide: p.wide, caption: p.caption, by: p.name, fullId: d.id };
    });
    renderGallery();
  });

  shareForm.onsubmit = async (e) => {
    e.preventDefault();
    const btn = shareForm.querySelector("button");
    const file = $("share-file").files[0];
    const name = $("share-name").value.trim();
    const caption = $("share-caption").value.trim();
    if (!file || !name || !caption) return;
    btn.disabled = true;
    shareStatus("Preparing your photo…");
    try {
      let thumb, full;
      try {
        thumb = await toJpeg(file, 720, 140000);
        full = await toJpeg(file, 1800, 900000);
      } catch {
        shareStatus("Sorry, that photo couldn't be opened. Please choose a JPEG or PNG.");
        return;
      }
      shareStatus("Adding it to the gallery…");
      const ref = fs.doc(photos);
      const batch = fs.writeBatch(db);
      batch.set(ref, { name, caption, thumb: thumb.url, wide: thumb.wide, createdAt: fs.serverTimestamp() });
      batch.set(fs.doc(db, "photoFull", ref.id), { full: full.url, createdAt: fs.serverTimestamp() });
      await batch.commit();
      shareForm.reset();
      $("share-file").onchange();
      shareStatus("Thank you. Your photo is now in the gallery.");
    } catch {
      shareStatus("Sorry, that didn't go through. Please try again.");
    } finally {
      btn.disabled = false;
    }
  };
}
