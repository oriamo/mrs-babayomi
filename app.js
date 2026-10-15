const M = window.MEMORIAL;
const $ = (id) => document.getElementById(id);

// --- Header & story ---
$("name").textContent = M.fullName;
$("dates").textContent = `${M.born} – ${M.died}`;
$("quote").textContent = M.quote ? `“${M.quote}”` : "";
$("tribute").textContent = M.tribute;
document.title = `In Loving Memory of ${M.knownAs || M.fullName}`;

// --- Gallery (media.json is written by build-media.sh) ---
let media = [];
fetch("media.json")
  .then((r) => (r.ok ? r.json() : { hero: null, items: [] }))
  .catch(() => ({ hero: null, items: [] }))
  .then(({ hero, items }) => {
    media = items;
    if (hero) {
      $("hero-photo").src = hero;
      $("hero-photo").hidden = false;
    }
    $("gallery-empty").hidden = items.length > 0;
    items.forEach((item, i) => {
      const fig = document.createElement("figure");
      if (item.type === "video") {
        const v = document.createElement("video");
        v.src = item.src + "#t=0.5"; // first frame as thumbnail
        v.preload = "metadata";
        v.muted = true;
        v.playsInline = true;
        fig.append(v);
        const play = document.createElement("div");
        play.className = "play";
        play.textContent = "▶";
        fig.append(play);
      } else {
        const img = document.createElement("img");
        img.src = item.src;
        img.loading = "lazy";
        img.alt = "";
        fig.append(img);
      }
      fig.onclick = () => openLightbox(i);
      $("gallery").append(fig);
    });
  });

// --- Lightbox ---
let current = 0;
function openLightbox(i) {
  current = (i + media.length) % media.length;
  const item = media[current];
  const el = document.createElement(item.type === "video" ? "video" : "img");
  el.src = item.src;
  if (item.type === "video") {
    el.controls = true;
    el.autoplay = true;
    el.playsInline = true;
  }
  $("lb-content").replaceChildren(el);
  $("lightbox").hidden = false;
}
function closeLightbox() {
  $("lightbox").hidden = true;
  $("lb-content").replaceChildren();
}
document.querySelector(".lb-close").onclick = closeLightbox;
document.querySelector(".lb-prev").onclick = () => openLightbox(current - 1);
document.querySelector(".lb-next").onclick = () => openLightbox(current + 1);
$("lightbox").onclick = (e) => { if (e.target.id === "lightbox") closeLightbox(); };
document.addEventListener("keydown", (e) => {
  if ($("lightbox").hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") openLightbox(current - 1);
  if (e.key === "ArrowRight") openLightbox(current + 1);
});

// --- Guestbook (Supabase REST, table "tributes") ---
const gbReady = M.supabaseUrl && M.supabaseAnonKey;
const api = `${M.supabaseUrl}/rest/v1/tributes`;
const headers = {
  apikey: M.supabaseAnonKey,
  Authorization: `Bearer ${M.supabaseAnonKey}`,
  "Content-Type": "application/json",
};

function renderEntry({ name, relation, message, created_at }) {
  const div = document.createElement("div");
  div.className = "entry";
  const p = document.createElement("p");
  p.textContent = message;
  const who = document.createElement("p");
  who.className = "who";
  const date = new Date(created_at).toLocaleDateString(undefined, { dateStyle: "long" });
  who.textContent = `— ${name}${relation ? `, ${relation}` : ""} · ${date}`;
  div.append(p, who);
  return div;
}

async function loadEntries() {
  const r = await fetch(`${api}?select=name,relation,message,created_at&order=created_at.desc`, { headers });
  if (!r.ok) throw new Error(r.status);
  $("gb-list").replaceChildren(...(await r.json()).map(renderEntry));
}

if (!gbReady) {
  $("gb-form").querySelector("button").disabled = true;
  $("gb-status").textContent = "The guestbook is being set up — please check back soon.";
} else {
  loadEntries().catch(() => ($("gb-status").textContent = "Couldn't load messages. Please refresh."));
  $("gb-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    const entry = {
      name: $("gb-name").value.trim(),
      relation: $("gb-relation").value.trim() || null,
      message: $("gb-message").value.trim(),
    };
    if (!entry.name || !entry.message) return;
    btn.disabled = true;
    $("gb-status").textContent = "Sending…";
    try {
      const r = await fetch(api, { method: "POST", headers, body: JSON.stringify(entry) });
      if (!r.ok) throw new Error(r.status);
      e.target.reset();
      $("gb-status").textContent = "Thank you. Your words have been added.";
      await loadEntries();
    } catch {
      $("gb-status").textContent = "Sorry, that didn't send. Please try again.";
    } finally {
      btn.disabled = false;
    }
  };
}
