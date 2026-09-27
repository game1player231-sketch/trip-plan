const STORAGE_KEY = "trip-plan:v1";
const INSTALL_DISMISS_KEY = "trip-plan:a2hs-dismissed";
const MAX_PHOTOS = 4;
const PHOTO_MAX_SIZE = 1280;
const PHOTO_QUALITY = 0.72;

const els = {
  topbar: document.getElementById("topbar"),
  screen: document.getElementById("screen"),
  fab: document.getElementById("fab"),
  sheetRoot: document.getElementById("sheet-root"),
  sheetBody: document.getElementById("sheet-body"),
  toast: document.getElementById("toast"),
  importFile: document.getElementById("import-file"),
  lightbox: document.getElementById("lightbox"),
  lightboxImage: document.getElementById("lightbox-image"),
};

const icons = {
  plus: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>`,
  back: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M15.4 5.4 8.8 12l6.6 6.6-1.4 1.4L6 12l8-8z"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="m9.4 5.4 6.6 6.6-6.6 6.6-1.4-1.4 5.2-5.2-5.2-5.2z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 17.2V20h2.8l8.3-8.3-2.8-2.8L4 17.2zm13.7-8.3c.4-.4.4-1 0-1.4l-1.2-1.2c-.4-.4-1-.4-1.4 0l-1 1 2.6 2.6 1-1z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 20h8a1 1 0 0 0 1-1V8H7v11a1 1 0 0 0 1 1zM17 5h-3.1l-.7-1H10.8l-.7 1H7v2h10z"/></svg>`,
  more: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="6" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="18" cy="12" r="1.8" fill="currentColor"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M7 6.4 12 11.3 17 6.4 18.4 7.8 13.4 12.8 18.4 17.8 17 19.2 12 14.2 7 19.2 5.6 17.8 10.6 12.8 5.6 7.8z"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M9 4h6l1.2 1.6H20a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.6a1 1 0 0 1 1-1h3.8L9 4zm3 14.2A4.2 4.2 0 1 0 12 9.8a4.2 4.2 0 0 0 0 8.4zm0-2.4a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10.5 3.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm4.7 11.1 5.2 5.2 1.4-1.4-5.2-5.2z"/></svg>`,
};

let state = loadState();
let sheetContext = null;
let toastTimer = 0;
let draftPhotos = [];
let homeSearch = "";
let tripSearch = "";
let lastTripId = null;

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { trips: [] };
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.trips)) return { trips: [] };
    return { trips: data.trips.map(normalizeTrip) };
  } catch {
    return { trips: [] };
  }
}

function normalizeTrip(trip) {
  return {
    id: trip.id || uid(),
    name: String(trip.name || "Untitled trip"),
    createdAt: trip.createdAt || new Date().toISOString(),
    locations: Array.isArray(trip.locations) ? trip.locations.map(normalizeLocation) : [],
  };
}

function normalizeLocation(location) {
  return {
    id: location.id || uid(),
    name: String(location.name || "Untitled location"),
    details: String(location.details || ""),
    collapsed: Boolean(location.collapsed),
    places: Array.isArray(location.places) ? location.places.map(normalizePlace) : [],
  };
}

function normalizePlace(place) {
  return {
    id: place.id || uid(),
    name: String(place.name || "Untitled place"),
    mapUrl: String(place.mapUrl || ""),
    mapType: place.mapType === "apple" ? "apple" : "google",
    photos: normalizePhotos(place.photos),
  };
}

function normalizePhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.filter((src) => typeof src === "string" && src.startsWith("data:image")).slice(0, MAX_PHOTOS);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    state = loadState();
    showToast("Not enough space for that photo. Try a smaller picture or remove one.");
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function initials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "T";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function placeCount(trip) {
  return trip.locations.reduce((sum, location) => sum + location.places.length, 0);
}

function getRoute() {
  const hash = (location.hash || "#/").replace(/^#/, "") || "/";
  const match = hash.match(/^\/trip\/([^/]+)/);
  if (match) return { name: "trip", id: decodeURIComponent(match[1]) };
  return { name: "home" };
}

function findTrip(id) {
  return state.trips.find((trip) => trip.id === id);
}

function findLocation(trip, id) {
  return trip.locations.find((location) => location.id === id);
}

function searchBarHtml(id, placeholder, value) {
  return `
    <label class="search-bar">
      <span class="search-icon" aria-hidden="true">${icons.search}</span>
      <input id="${id}" type="search" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(value)}" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" />
    </label>
  `;
}

function normalizeQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function applyHomeSearch() {
  const input = document.getElementById("home-search");
  const empty = document.getElementById("search-empty");
  if (!input) return;
  homeSearch = input.value;
  const q = normalizeQuery(homeSearch);
  let shown = 0;
  document.querySelectorAll(".trip-card").forEach((card) => {
    const hit = !q || (card.dataset.search || "").includes(q);
    card.hidden = !hit;
    if (hit) shown += 1;
  });
  if (empty) empty.hidden = shown > 0;
}

function applyTripSearch() {
  const input = document.getElementById("trip-search");
  const empty = document.getElementById("search-empty");
  if (!input) return;
  tripSearch = input.value;
  const q = normalizeQuery(tripSearch);
  const searching = Boolean(q);
  let shown = 0;
  document.querySelectorAll(".location-card").forEach((card) => {
    const locHit = !q || (card.dataset.name || "").includes(q) || (card.dataset.details || "").includes(q);
    let placeHits = 0;
    card.querySelectorAll(".place").forEach((place) => {
      const placeHit = !q || (place.dataset.search || "").includes(q);
      const showPlace = !searching || locHit || placeHit;
      place.hidden = !showPlace;
      if (showPlace) placeHits += 1;
    });
    const showLoc = !searching || locHit || placeHits > 0;
    card.hidden = !showLoc;
    if (showLoc) shown += 1;
    if (searching && showLoc) card.classList.remove("is-collapsed");
    else card.classList.toggle("is-collapsed", card.dataset.collapsed === "true");
  });
  if (empty) empty.hidden = shown > 0;
}

function syncCollapseAllButton(trip) {
  const button = document.querySelector("[data-action='toggle-collapse-all']");
  if (!button || !trip) return;
  const allCollapsed = trip.locations.length > 0 && trip.locations.every((location) => location.collapsed);
  button.textContent = allCollapsed ? "Expand all" : "Collapse all";
}

function detectMapType(url) {
  const value = String(url).trim().toLowerCase();
  if (!value) return null;
  if (value.includes("maps.apple.com") || value.startsWith("maps:")) return "apple";
  if (
    value.includes("google.com/maps") ||
    value.includes("maps.google.") ||
    value.includes("maps.app.goo.gl") ||
    value.includes("goo.gl/maps")
  ) {
    return "google";
  }
  return null;
}

function isSafeMapUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:", "maps:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

function isIosDevice() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function shouldShowInstallTip() {
  return isIosDevice() && !isStandalone() && !localStorage.getItem(INSTALL_DISMISS_KEY);
}

function showToast(message) {
  els.toast.hidden = false;
  els.toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2400);
}

function closeSheet() {
  els.sheetRoot.hidden = true;
  els.sheetBody.innerHTML = "";
  sheetContext = null;
  draftPhotos = [];
  document.body.classList.remove("sheet-open");
}

function openSheet(html, context) {
  sheetContext = context || null;
  els.toast.hidden = true;
  els.sheetBody.innerHTML = html;
  els.sheetRoot.hidden = false;
  document.body.classList.add("sheet-open");
  const focusable = [...els.sheetBody.querySelectorAll("input, textarea, button, select")].find(
    (el) => el.type !== "hidden" && el.type !== "file" && !el.disabled
  );
  if (focusable) {
    focusable.focus();
    if (typeof focusable.select === "function" && focusable.value) focusable.select();
  }
}

function drawImageToDataUrl(source) {
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(width, height, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
}

async function compressImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const dataUrl = drawImageToDataUrl(bitmap);
      if (bitmap.close) bitmap.close();
      return dataUrl;
    } catch {
      /* fall through to Image() */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        resolve(drawImageToDataUrl(image));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read photo"));
    };
    image.src = url;
  });
}

function photoPickerHtml() {
  const tiles = draftPhotos
    .map(
      (src, index) => `
        <div class="photo-tile">
          <img src="${src}" alt="Place photo ${index + 1}" />
          <button class="photo-remove" type="button" data-action="remove-draft-photo" data-index="${index}" aria-label="Remove photo">${icons.close}</button>
        </div>`
    )
    .join("");
  const addButton =
    draftPhotos.length < MAX_PHOTOS
      ? `<label class="photo-add">
          <input id="place-photo" type="file" accept="image/*" />
          ${icons.camera}
          <span>${draftPhotos.length ? "Add another" : "Add photo"}</span>
        </label>`
      : "";
  return `<div class="photo-row">${tiles}${addButton}</div>`;
}

function refreshPhotoPicker() {
  const host = document.getElementById("photo-picker");
  if (host) host.innerHTML = photoPickerHtml();
}

function openLightbox(src, alt) {
  if (!els.lightbox || !els.lightboxImage || !src) return;
  els.lightboxImage.src = src;
  els.lightboxImage.alt = alt || "Place photo";
  els.lightbox.hidden = false;
  document.body.classList.add("lightbox-open");
}

function closeLightbox() {
  if (!els.lightbox || !els.lightboxImage) return;
  els.lightbox.hidden = true;
  els.lightboxImage.removeAttribute("src");
  els.lightboxImage.alt = "";
  document.body.classList.remove("lightbox-open");
}

function tripForm(trip) {
  const editing = Boolean(trip);
  return `
    <h2 id="sheet-title">${editing ? "Rename trip" : "New trip"}</h2>
    <p class="sheet-lead">${editing ? "A short code or city name works well." : "Give this trip a name you will recognize later, like BKK2026."}</p>
    <form data-form="trip">
      <input type="hidden" name="id" value="${escapeHtml(trip?.id || "")}" />
      <div class="field">
        <label for="trip-name">Trip name</label>
        <input id="trip-name" name="name" maxlength="80" required placeholder="BKK2026" value="${escapeHtml(trip?.name || "")}" />
      </div>
      <div class="sheet-actions">
        <button class="btn btn-primary" type="submit">${editing ? "Save" : "Create trip"}</button>
        <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
      </div>
    </form>
  `;
}

function locationForm(tripId, location) {
  const editing = Boolean(location);
  return `
    <h2 id="sheet-title">${editing ? "Edit location" : "Add location"}</h2>
    <p class="sheet-lead">${editing ? "Update the neighborhood or area." : "A location is a neighborhood, street, or area — for example Song Wat."}</p>
    <form data-form="location">
      <input type="hidden" name="tripId" value="${escapeHtml(tripId)}" />
      <input type="hidden" name="id" value="${escapeHtml(location?.id || "")}" />
      <div class="field">
        <label for="location-name">Location name</label>
        <input id="location-name" name="name" maxlength="80" required placeholder="Song Wat" value="${escapeHtml(location?.name || "")}" />
      </div>
      <div class="field">
        <label for="location-details">Details <span class="optional">(optional)</span></label>
        <textarea id="location-details" name="details" maxlength="400" placeholder="Old town river streets, best in the morning">${escapeHtml(location?.details || "")}</textarea>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-primary" type="submit">${editing ? "Save" : "Add location"}</button>
        <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
      </div>
    </form>
  `;
}

function placeForm(tripId, locationId, place) {
  const editing = Boolean(place);
  const detected = place ? `Saved as ${place.mapType === "apple" ? "Apple Maps" : "Google Maps"}` : "";
  return `
    <h2 id="sheet-title">${editing ? "Edit place" : "Add a place"}</h2>
    <p class="sheet-lead">Paste a map link so you can open it later in one tap — no searching on the street.</p>
    <form data-form="place">
      <input type="hidden" name="tripId" value="${escapeHtml(tripId)}" />
      <input type="hidden" name="locationId" value="${escapeHtml(locationId)}" />
      <input type="hidden" name="id" value="${escapeHtml(place?.id || "")}" />
      <div class="field">
        <label for="place-name">Place name</label>
        <input id="place-name" name="name" maxlength="80" required placeholder="Baan Sarn Cafe" value="${escapeHtml(place?.name || "")}" />
      </div>
      <div class="field">
        <label for="place-url">Map link</label>
        <input id="place-url" name="mapUrl" required inputmode="url" placeholder="https://maps.app.goo.gl/…" value="${escapeHtml(place?.mapUrl || "")}" />
        <p class="help">In Google Maps or Apple Maps, tap Share, copy the link, then paste it here.</p>
        <p class="detect" id="map-detect">${escapeHtml(detected)}</p>
      </div>
      <div class="field">
        <span>Map type</span>
        <div class="map-choice" role="radiogroup" aria-label="Map type">
          <label class="map-choice-option">
            <input type="radio" name="mapType" value="google" ${!place || place.mapType === "google" ? "checked" : ""} />
            <span>Google Maps</span>
          </label>
          <label class="map-choice-option">
            <input type="radio" name="mapType" value="apple" ${place?.mapType === "apple" ? "checked" : ""} />
            <span>Apple Maps</span>
          </label>
        </div>
      </div>
      <div class="field">
        <span>Photos <span class="optional">(optional)</span></span>
        <div id="photo-picker">${photoPickerHtml()}</div>
        <p class="help">Take a photo or pick from your library so you remember the spot.</p>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-primary" type="submit">${editing ? "Save place" : "Add place"}</button>
        <button class="btn btn-ghost" type="button" data-action="close-sheet">Cancel</button>
      </div>
    </form>
  `;
}

function confirmForm({ title, body, confirmLabel, action, payload }) {
  return `
    <h2 id="sheet-title">${escapeHtml(title)}</h2>
    <p class="sheet-lead">${escapeHtml(body)}</p>
    <div class="sheet-actions">
      <button class="btn btn-danger" type="button" data-action="${escapeHtml(action)}" ${payload}>${escapeHtml(confirmLabel)}</button>
      <button class="btn btn-ghost" type="button" data-action="close-sheet">Keep it</button>
    </div>
  `;
}

function backupForm() {
  return `
    <h2 id="sheet-title">Backup</h2>
    <p class="sheet-lead">Trips and photos are saved on this phone or computer only. Export a JSON file before switching browsers.</p>
    <div class="sheet-actions">
      <button class="btn btn-teal" type="button" data-action="export-json">Export backup</button>
      <button class="btn btn-primary" type="button" data-action="choose-import">Import backup</button>
      <button class="btn btn-ghost btn-wide" type="button" data-action="close-sheet">Close</button>
    </div>
  `;
}

function tripMenu(trip) {
  return `
    <h2 id="sheet-title">${escapeHtml(trip.name)}</h2>
    <p class="sheet-lead">Rename this trip or remove it from this device.</p>
    <div class="sheet-actions">
      <button class="btn btn-teal" type="button" data-action="edit-trip" data-id="${escapeHtml(trip.id)}">Rename</button>
      <button class="btn btn-danger" type="button" data-action="ask-delete-trip" data-id="${escapeHtml(trip.id)}">Delete trip</button>
      <button class="btn btn-ghost btn-wide" type="button" data-action="close-sheet">Close</button>
    </div>
  `;
}

function renderHome() {
  document.title = "Trip Plan";
  els.topbar.innerHTML = `
    <div class="topbar-title">
      <h1 class="brand">Trip Plan</h1>
      <p class="brand-sub">Your pocket itinerary</p>
    </div>
    <button class="btn btn-primary header-cta" type="button" data-action="new-trip">${icons.plus} New trip</button>
    <button class="icon-btn" type="button" data-action="open-backup" aria-label="Backup trips">${icons.more}</button>
  `;

  const installTip = shouldShowInstallTip()
    ? `<aside class="install-tip">
        <p>Add Trip Plan to your Home Screen for one-tap access. Tap Share, then <strong>Add to Home Screen</strong>.</p>
        <button class="icon-btn" type="button" data-action="dismiss-install" aria-label="Dismiss tip">${icons.close}</button>
      </aside>`
    : "";

  if (!state.trips.length) {
    els.screen.innerHTML = `
      ${installTip}
      <section class="welcome">
        <div class="welcome-copy">
          <p class="page-kicker">Start here</p>
          <h2>Plan a trip you can open on the street</h2>
          <p>Create a trip, add areas you will visit, then save each place with a Google Maps or Apple Maps link. When you are there, tap Open Maps — no searching.</p>
          <div class="welcome-actions">
            <button class="btn btn-primary" type="button" data-action="new-trip">${icons.plus} Create trip</button>
          </div>
        </div>
        <ol class="welcome-steps">
          <li><span>1</span><div><strong>Trip</strong><p>BKK2026</p></div></li>
          <li><span>2</span><div><strong>Location</strong><p>Song Wat, with optional notes</p></div></li>
          <li><span>3</span><div><strong>Place + map</strong><p>Paste a Google or Apple Maps link</p></div></li>
        </ol>
      </section>
    `;
  } else {
    const cards = [...state.trips]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map((trip) => {
        const locations = trip.locations.length;
        const places = placeCount(trip);
        return `
          <button class="trip-card" type="button" data-action="open-trip" data-id="${escapeHtml(trip.id)}" data-search="${escapeHtml(trip.name.toLowerCase())}">
            <span class="trip-mark">${escapeHtml(initials(trip.name))}</span>
            <span>
              <h2>${escapeHtml(trip.name)}</h2>
              <p class="meta">${locations} location${locations === 1 ? "" : "s"} · ${places} place${places === 1 ? "" : "s"} · ${escapeHtml(formatDate(trip.createdAt))}</p>
            </span>
            <span class="chevron">${icons.chevron}</span>
          </button>
        `;
      })
      .join("");

    els.screen.innerHTML = `
      ${installTip}
      <p class="page-kicker">Ready when you are</p>
      <h2 class="page-title">Your trips</h2>
      <p class="page-copy">Open a trip to see locations and one-tap map links.</p>
      ${searchBarHtml("home-search", "Search trips", homeSearch)}
      <div class="list trips">${cards}</div>
      <p class="search-empty" id="search-empty" hidden>No trips match that search.</p>
      <p class="hint">Saved on this device only. Use Backup to export a JSON file you can restore later.</p>
    `;
  }

  if (state.trips.length) {
    showFab("New trip", "new-trip");
  } else {
    hideFab();
  }
  applyHomeSearch();
}

function renderTrip(trip) {
  document.title = `${trip.name} · Trip Plan`;
  els.topbar.innerHTML = `
    <button class="icon-btn" type="button" data-action="go-home" aria-label="Back to trips">${icons.back}</button>
    <div class="topbar-title">
      <h1 class="brand">${escapeHtml(trip.name)}</h1>
      <p class="brand-sub">${trip.locations.length} location${trip.locations.length === 1 ? "" : "s"}</p>
    </div>
    <button class="btn btn-primary header-cta" type="button" data-action="add-location" data-trip-id="${escapeHtml(trip.id)}">${icons.plus} Add location</button>
    <button class="icon-btn" type="button" data-action="trip-menu" data-id="${escapeHtml(trip.id)}" aria-label="Trip options">${icons.more}</button>
  `;

  if (!trip.locations.length) {
    els.screen.innerHTML = `
      <section class="welcome">
        <div class="welcome-copy">
          <p class="page-kicker">${escapeHtml(trip.name)}</p>
          <h2>Add your first location</h2>
          <p>A location is a neighborhood or area, like Song Wat. After that, add each café, temple, or market with its map link.</p>
          <div class="welcome-actions">
            <button class="btn btn-primary" type="button" data-action="add-location" data-trip-id="${escapeHtml(trip.id)}">${icons.plus} Add location</button>
          </div>
        </div>
        <ol class="welcome-steps">
          <li><span>1</span><div><strong>Location name</strong><p>Song Wat</p></div></li>
          <li><span>2</span><div><strong>Details</strong><p>Optional notes for yourself</p></div></li>
          <li><span>3</span><div><strong>Places</strong><p>Name + Google or Apple Maps</p></div></li>
        </ol>
      </section>
    `;
  } else {
    const cards = trip.locations
      .map((location) => {
        const places = location.places.length
          ? location.places
              .map((place) => {
                const safe = isSafeMapUrl(place.mapUrl);
                const mapsControl = safe
                      ? `<a class="btn btn-maps" href="${escapeHtml(place.mapUrl)}" target="_blank" rel="noopener noreferrer">${icons.pin} Open Maps</a>`
                  : `<button class="btn btn-maps" type="button" disabled>Map link missing</button>`;
                const photos = (place.photos || [])
                  .map(
                    (src, index) => `
                      <button class="place-photo" type="button" data-action="view-photo" aria-label="View photo ${index + 1} of ${escapeHtml(place.name)}">
                        <img src="${src}" alt="" />
                      </button>`
                  )
                  .join("");
                return `
                  <article class="place" data-search="${escapeHtml(place.name.toLowerCase())}">
                    ${photos ? `<div class="place-photos">${photos}</div>` : ""}
                    <div class="place-top">
                      <p class="place-name">${escapeHtml(place.name)}</p>
                      <span class="pill ${place.mapType}">${place.mapType === "apple" ? "Apple Maps" : "Google Maps"}</span>
                    </div>
                    <div class="place-actions">
                      ${mapsControl}
                      <button class="icon-btn" type="button" data-action="edit-place" data-trip-id="${escapeHtml(trip.id)}" data-location-id="${escapeHtml(location.id)}" data-id="${escapeHtml(place.id)}" aria-label="Edit ${escapeHtml(place.name)}">${icons.edit}</button>
                      <button class="icon-btn" type="button" data-action="ask-delete-place" data-trip-id="${escapeHtml(trip.id)}" data-location-id="${escapeHtml(location.id)}" data-id="${escapeHtml(place.id)}" aria-label="Delete ${escapeHtml(place.name)}">${icons.trash}</button>
                    </div>
                  </article>
                `;
              })
              .join("")
          : `<p class="mini-empty">No places here yet. Add a café, market, or temple and paste its Maps link.</p>`;

        const placeLabel = `${location.places.length} place${location.places.length === 1 ? "" : "s"}`;
        const collapsed = Boolean(location.collapsed);
        return `
          <article class="location-card ${collapsed ? "is-collapsed" : ""}" data-collapsed="${collapsed}" data-name="${escapeHtml(location.name.toLowerCase())}" data-details="${escapeHtml((location.details || "").toLowerCase())}">
            <div class="location-head">
              <button class="location-toggle" type="button" data-action="toggle-location" data-trip-id="${escapeHtml(trip.id)}" data-id="${escapeHtml(location.id)}" aria-expanded="${collapsed ? "false" : "true"}" aria-label="${collapsed ? "Expand" : "Collapse"} ${escapeHtml(location.name)}">
                <span class="collapse-chevron" aria-hidden="true">${icons.chevron}</span>
                <span class="location-toggle-copy">
                  <h2>${escapeHtml(location.name)}</h2>
                  <p class="meta">${placeLabel}</p>
                  ${location.details ? `<p class="location-details">${escapeHtml(location.details)}</p>` : ""}
                </span>
              </button>
              <button class="icon-btn" type="button" data-action="edit-location" data-trip-id="${escapeHtml(trip.id)}" data-id="${escapeHtml(location.id)}" aria-label="Edit ${escapeHtml(location.name)}">${icons.edit}</button>
              <button class="icon-btn" type="button" data-action="ask-delete-location" data-trip-id="${escapeHtml(trip.id)}" data-id="${escapeHtml(location.id)}" aria-label="Delete ${escapeHtml(location.name)}">${icons.trash}</button>
            </div>
            <div class="location-body">
              <div class="place-list">${places}</div>
              <div class="location-add">
                <button class="btn btn-ghost" type="button" data-action="add-place" data-trip-id="${escapeHtml(trip.id)}" data-location-id="${escapeHtml(location.id)}">${icons.plus} Add place</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    els.screen.innerHTML = `
      <p class="page-copy">Open Maps from any place when you are nearby. No searching required.</p>
      <div class="trip-tools">
        ${searchBarHtml("trip-search", "Search locations and places", tripSearch)}
        <button class="btn btn-ghost collapse-all" type="button" data-action="toggle-collapse-all" data-trip-id="${escapeHtml(trip.id)}">${trip.locations.every((location) => location.collapsed) ? "Expand all" : "Collapse all"}</button>
      </div>
      <p class="search-empty" id="search-empty" hidden>No locations or places match that search.</p>
      <div class="list">${cards}</div>
    `;
  }

  showFab("Add location", "add-location", { tripId: trip.id });
  applyTripSearch();
}

function hideFab() {
  els.fab.hidden = true;
  els.fab.removeAttribute("data-action");
  document.body.classList.remove("has-fab");
}

function showFab(label, action, dataset = {}) {
  els.fab.hidden = false;
  document.body.classList.add("has-fab");
  delete els.fab.dataset.action;
  delete els.fab.dataset.tripId;
  delete els.fab.dataset.locationId;
  delete els.fab.dataset.id;
  els.fab.dataset.action = action;
  Object.entries(dataset).forEach(([key, value]) => {
    els.fab.dataset[key] = value;
  });
  els.fab.innerHTML = `${icons.plus} ${escapeHtml(label)}`;
}

function render() {
  const route = getRoute();
  if (route.name === "trip") {
    if (lastTripId !== route.id) {
      tripSearch = "";
      lastTripId = route.id;
    }
    const trip = findTrip(route.id);
    if (!trip) {
      location.hash = "#/";
      renderHome();
      return;
    }
    renderTrip(trip);
    return;
  }
  renderHome();
}

function createTrip(name) {
  const trip = {
    id: uid(),
    name,
    createdAt: new Date().toISOString(),
    locations: [],
  };
  state.trips.unshift(trip);
  persist();
  location.hash = `#/trip/${encodeURIComponent(trip.id)}`;
  showToast("Trip created");
}

function updateTrip(id, name) {
  const trip = findTrip(id);
  if (!trip) return;
  trip.name = name;
  persist();
  render();
  showToast("Trip updated");
}

function deleteTrip(id) {
  state.trips = state.trips.filter((trip) => trip.id !== id);
  persist();
  location.hash = "#/";
  showToast("Trip deleted");
}

function createLocation(tripId, name, details) {
  const trip = findTrip(tripId);
  if (!trip) return;
  trip.locations.push({
    id: uid(),
    name,
    details,
    collapsed: false,
    places: [],
  });
  persist();
  render();
  showToast("Location added");
}

function updateLocation(tripId, id, name, details) {
  const trip = findTrip(tripId);
  const location = trip && findLocation(trip, id);
  if (!location) return;
  location.name = name;
  location.details = details;
  persist();
  render();
  showToast("Location updated");
}

function deleteLocation(tripId, id) {
  const trip = findTrip(tripId);
  if (!trip) return;
  trip.locations = trip.locations.filter((location) => location.id !== id);
  persist();
  render();
  showToast("Location deleted");
}

function createPlace(tripId, locationId, fields) {
  const trip = findTrip(tripId);
  const location = trip && findLocation(trip, locationId);
  if (!location) return;
  location.places.push({
    id: uid(),
    name: fields.name,
    mapUrl: fields.mapUrl,
    mapType: fields.mapType,
    photos: normalizePhotos(fields.photos),
  });
  if (!persist()) {
    render();
    return;
  }
  render();
  showToast("Place added");
}

function updatePlace(tripId, locationId, id, fields) {
  const trip = findTrip(tripId);
  const location = trip && findLocation(trip, locationId);
  const place = location && location.places.find((item) => item.id === id);
  if (!place) return;
  Object.assign(place, fields);
  place.photos = normalizePhotos(fields.photos);
  if (!persist()) {
    render();
    return;
  }
  render();
  showToast("Place updated");
}

function deletePlace(tripId, locationId, id) {
  const trip = findTrip(tripId);
  const location = trip && findLocation(trip, locationId);
  if (!location) return;
  location.places = location.places.filter((place) => place.id !== id);
  persist();
  render();
  showToast("Place deleted");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `trip-plan-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Backup downloaded");
}

function importJson(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.trips)) throw new Error("Not a Trip Plan backup");
  state = { trips: data.trips.map(normalizeTrip) };
  persist();
  location.hash = "#/";
  render();
  showToast(`Imported ${state.trips.length} trip${state.trips.length === 1 ? "" : "s"}`);
}

function handleAction(action, target) {
  const tripId = target.dataset.tripId || target.dataset.id;
  const locationId = target.dataset.locationId;
  const id = target.dataset.id;

  if (action === "close-sheet") {
    closeSheet();
    return;
  }
  if (action === "close-lightbox") {
    closeLightbox();
    return;
  }
  if (action === "view-photo") {
    const image = target.querySelector("img");
    if (image && image.src) openLightbox(image.src, target.getAttribute("aria-label") || "Place photo");
    return;
  }
  if (action === "remove-draft-photo") {
    const index = Number(target.dataset.index);
    if (!Number.isNaN(index)) {
      draftPhotos.splice(index, 1);
      refreshPhotoPicker();
    }
    return;
  }
  if (action === "go-home") {
    location.hash = "#/";
    return;
  }
  if (action === "open-trip") {
    location.hash = `#/trip/${encodeURIComponent(tripId)}`;
    return;
  }
  if (action === "new-trip") {
    openSheet(tripForm());
    return;
  }
  if (action === "edit-trip") {
    const trip = findTrip(tripId);
    if (trip) openSheet(tripForm(trip));
    return;
  }
  if (action === "trip-menu") {
    const trip = findTrip(tripId);
    if (trip) openSheet(tripMenu(trip));
    return;
  }
  if (action === "ask-delete-trip") {
    const trip = findTrip(tripId);
    if (!trip) return;
    openSheet(
      confirmForm({
        title: `Delete ${trip.name}?`,
        body: "This removes the trip, its locations, and every saved map link on this device.",
        confirmLabel: "Delete trip",
        action: "delete-trip",
        payload: `data-id="${escapeHtml(trip.id)}"`,
      })
    );
    return;
  }
  if (action === "delete-trip") {
    closeSheet();
    deleteTrip(tripId);
    return;
  }
  if (action === "toggle-location") {
    if (normalizeQuery(tripSearch)) return;
    const trip = findTrip(target.dataset.tripId);
    const location = trip && findLocation(trip, id);
    if (!location) return;
    location.collapsed = !location.collapsed;
    persist();
    const card = target.closest(".location-card");
    if (card) {
      card.classList.toggle("is-collapsed", location.collapsed);
      card.dataset.collapsed = String(location.collapsed);
      target.setAttribute("aria-expanded", location.collapsed ? "false" : "true");
    } else {
      render();
    }
    syncCollapseAllButton(trip);
    return;
  }
  if (action === "toggle-collapse-all") {
    const trip = findTrip(target.dataset.tripId || getRoute().id);
    if (!trip || !trip.locations.length) return;
    const collapse = trip.locations.some((location) => !location.collapsed);
    trip.locations.forEach((location) => {
      location.collapsed = collapse;
    });
    persist();
    render();
    return;
  }
  if (action === "add-location") {
    const currentTripId = target.dataset.tripId || getRoute().id;
    openSheet(locationForm(currentTripId));
    return;
  }
  if (action === "edit-location") {
    const trip = findTrip(target.dataset.tripId);
    const location = trip && findLocation(trip, id);
    if (location) openSheet(locationForm(trip.id, location));
    return;
  }
  if (action === "ask-delete-location") {
    const trip = findTrip(target.dataset.tripId);
    const location = trip && findLocation(trip, id);
    if (!location) return;
    openSheet(
      confirmForm({
        title: `Delete ${location.name}?`,
        body: "Places saved under this location will be removed too.",
        confirmLabel: "Delete location",
        action: "delete-location",
        payload: `data-trip-id="${escapeHtml(trip.id)}" data-id="${escapeHtml(location.id)}"`,
      })
    );
    return;
  }
  if (action === "delete-location") {
    closeSheet();
    deleteLocation(target.dataset.tripId, id);
    return;
  }
  if (action === "add-place") {
    draftPhotos = [];
    openSheet(placeForm(target.dataset.tripId, locationId));
    return;
  }
  if (action === "edit-place") {
    const trip = findTrip(target.dataset.tripId);
    const location = trip && findLocation(trip, locationId);
    const place = location && location.places.find((item) => item.id === id);
    if (place) {
      draftPhotos = normalizePhotos(place.photos);
      openSheet(placeForm(trip.id, location.id, place));
    }
    return;
  }
  if (action === "ask-delete-place") {
    const trip = findTrip(target.dataset.tripId);
    const location = trip && findLocation(trip, locationId);
    const place = location && location.places.find((item) => item.id === id);
    if (!place) return;
    openSheet(
      confirmForm({
        title: `Delete ${place.name}?`,
        body: "You can add it again later if you still have the map link.",
        confirmLabel: "Delete place",
        action: "delete-place",
        payload: `data-trip-id="${escapeHtml(trip.id)}" data-location-id="${escapeHtml(location.id)}" data-id="${escapeHtml(place.id)}"`,
      })
    );
    return;
  }
  if (action === "delete-place") {
    closeSheet();
    deletePlace(target.dataset.tripId, locationId, id);
    return;
  }
  if (action === "open-backup") {
    openSheet(backupForm());
    return;
  }
  if (action === "export-json") {
    exportJson();
    return;
  }
  if (action === "choose-import") {
    els.importFile.click();
    return;
  }
  if (action === "dismiss-install") {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    render();
  }
}

function onSubmit(event) {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();

  if (form.dataset.form === "trip") {
    if (!name) return;
    const id = String(data.get("id") || "");
    closeSheet();
    if (id) updateTrip(id, name);
    else createTrip(name);
    return;
  }

  if (form.dataset.form === "location") {
    if (!name) return;
    closeSheet();
    const details = String(data.get("details") || "").trim();
    const id = String(data.get("id") || "");
    const tripId = String(data.get("tripId") || "");
    if (id) updateLocation(tripId, id, name, details);
    else createLocation(tripId, name, details);
    return;
  }

  if (form.dataset.form === "place") {
    if (!name) return;
    const mapUrl = String(data.get("mapUrl") || "").trim();
    if (!isSafeMapUrl(mapUrl)) {
      showToast("Paste a Google or Apple Maps link");
      form.querySelector("[name=mapUrl]")?.focus();
      return;
    }
    const detected = detectMapType(mapUrl);
    const mapType = detected || String(data.get("mapType") || "google");
    const payload = {
      name,
      mapUrl,
      mapType: mapType === "apple" ? "apple" : "google",
      photos: [...draftPhotos],
    };
    const id = String(data.get("id") || "");
    const tripId = String(data.get("tripId") || "");
    const locationId = String(data.get("locationId") || "");
    closeSheet();
    if (id) updatePlace(tripId, locationId, id, payload);
    else createPlace(tripId, locationId, payload);
  }
}

function updateMapDetect(input) {
  const detect = document.getElementById("map-detect");
  const typeInput = document.querySelector('input[name="mapType"][value="google"]');
  const appleInput = document.querySelector('input[name="mapType"][value="apple"]');
  if (!detect) return;
  const type = detectMapType(input.value);
  if (type === "google") {
    detect.textContent = "Looks like a Google Maps link";
    if (typeInput) typeInput.checked = true;
  } else if (type === "apple") {
    detect.textContent = "Looks like an Apple Maps link";
    if (appleInput) appleInput.checked = true;
  } else if (input.value.trim()) {
    detect.textContent = "Choose Google or Apple if we cannot tell from the link";
  } else {
    detect.textContent = "";
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  handleAction(target.dataset.action, target);
});

document.addEventListener("submit", onSubmit);

document.addEventListener("input", (event) => {
  if (!event.target) return;
  if (event.target.id === "place-url") updateMapDetect(event.target);
  if (event.target.id === "trip-search") applyTripSearch();
  if (event.target.id === "home-search") applyHomeSearch();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.target.id === "trip-search" || event.target.id === "home-search")) {
    event.preventDefault();
    event.target.blur();
    return;
  }
  if (event.key !== "Escape") return;
  if (els.lightbox && !els.lightbox.hidden) {
    closeLightbox();
    return;
  }
  if (!els.sheetRoot.hidden) closeSheet();
});

document.addEventListener("change", async (event) => {
  if (!event.target || event.target.id !== "place-photo") return;
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Please choose a photo");
    return;
  }
  if (draftPhotos.length >= MAX_PHOTOS) {
    showToast(`You can add up to ${MAX_PHOTOS} photos`);
    return;
  }
  try {
    const dataUrl = await compressImage(file);
    draftPhotos.push(dataUrl);
    refreshPhotoPicker();
  } catch {
    showToast("Could not add that photo");
  }
});

els.importFile.addEventListener("change", async (event) => {
  const file = event.target.files && event.target.files[0];
  event.target.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    importJson(text);
    closeSheet();
  } catch {
    showToast("Could not import that file");
  }
});

window.addEventListener("hashchange", render);

window.addEventListener("scroll", () => {
  els.topbar.classList.toggle("is-scrolled", window.scrollY > 4);
}, { passive: true });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

if (!location.hash) location.hash = "#/";
render();
