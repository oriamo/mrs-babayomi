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
$("verse-text").textContent = `“${M.verse}”`;
$("verse-ref").textContent = M.verseRef;
$("story").replaceChildren(...M.story.map((t) => Object.assign(document.createElement("p"), { textContent: t })));

// ---------- Reveal on scroll ----------
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
  { threshold: 0.12 }
);
const observe = (root = document) => root.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
observe();

// ---------- Media (media.json is written by build-media.sh) ----------
let media = [];
const { hero, items } = await fetch("media.json")
  .then((r) => (r.ok ? r.json() : {}))
  .catch(() => ({}))
  .then((j) => ({ hero: j.hero ?? null, items: j.items ?? [] }));

media = [...items.filter((i) => i.type === "video"), ...items.filter((i) => i.type === "image")];
if (hero) $("hero-photo").src = hero;
$("gallery-empty").hidden = media.length > 0;

media.forEach((item, i) => {
  if (item.type === "video") {
    const fig = document.createElement("figure");
    fig.className = "film reveal";
    if (item.poster) fig.append(Object.assign(document.createElement("img"), { src: item.poster, alt: "", loading: "lazy" }));
    fig.append(Object.assign(document.createElement("span"), { className: "play" }));
    fig.append(Object.assign(document.createElement("figcaption"), { textContent: "Watch" }));
    fig.onclick = () => openLightbox(i);
    $("films").append(fig);
  } else {
    const fig = document.createElement("figure");
    fig.className = `photo reveal${item.wide ? " wide" : ""}`;
    fig.append(Object.assign(document.createElement("img"), { src: item.src, alt: "", loading: "lazy", decoding: "async" }));
    fig.onclick = () => openLightbox(i);
    $("gallery").append(fig);
  }
});
observe();

// ---------- Lightbox ----------
let current = 0;
function openLightbox(i) {
  current = (i + media.length) % media.length;
  const item = media[current];
  const el = document.createElement(item.type === "video" ? "video" : "img");
  el.src = item.src;
  if (item.type === "video") Object.assign(el, { controls: true, autoplay: true, playsInline: true, poster: item.poster || "" });
  $("lb-content").replaceChildren(el);
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

// ---------- Guestbook (Firestore collection "tributes") ----------
function renderEntry({ name, relation, message, createdAt }, i) {
  const div = document.createElement("article");
  div.className = "entry reveal";
  const flame = document.createElement("div");
  flame.className = "flame";
  flame.style.setProperty("--d", `${(i % 7) * -0.4}s`);
  flame.append(document.createElement("span"));
  const p = Object.assign(document.createElement("p"), { textContent: message });
  const who = Object.assign(document.createElement("p"), { className: "who", textContent: name });
  const meta = [relation, createdAt?.toDate?.().toLocaleDateString("en-GB", { dateStyle: "long" })].filter(Boolean).join(" · ");
  if (meta) who.append(Object.assign(document.createElement("small"), { textContent: meta }));
  div.append(flame, p, who);
  return div;
}
function setCount(n) {
  $("count").textContent = n;
  $("count-label").textContent = n === 1 ? "candle lit in her memory" : "candles lit in her memory";
}

const form = $("gb-form");
if (!M.firebase) {
  form.querySelector("button").disabled = true;
  $("gb-status").textContent = "The book of remembrance opens very soon.";
} else {
  const V = "11.10.0";
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const db = fs.getFirestore(initializeApp(M.firebase));
  const col = fs.collection(db, "tributes");

  // Live list: new candles appear for everyone without a refresh
  fs.onSnapshot(
    fs.query(col, fs.orderBy("createdAt", "desc")),
    (snap) => {
      setCount(snap.size);
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
}
