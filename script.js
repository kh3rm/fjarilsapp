import { SUPABASE_CONFIG } from './supabase-config.js?v=1.5.61';

const APP_ID = 'annies-fjarilar';
const DATA_URL = './data/butterflies.json?v=1.5.61';
const COLLECTION_KEY = 'fjarilsguiden.collection.v1';
const CUSTOM_SPECIES_KEY = 'fjarilsguiden.customSpecies.v1';
const BUTTERFLY_EDITS_KEY = 'annies-fjarilar.butterflyEdits.v1';
const DELETED_BUTTERFLIES_KEY = 'annies-fjarilar.deletedButterflies.v1';
const AUTH_KEY = 'annies-fjarilar.supabase-session.v1';
const DB_NAME = 'annies-fjarilar-db';
const DB_VERSION = 2;
const COLLECTION_STORE = 'collection';
const CUSTOM_SPECIES_STORE = 'customSpecies';
const IMAGE_PLACEHOLDER = './assets/butterfly-placeholder.svg';
const IMAGE_MAX_BYTES = SUPABASE_CONFIG.maxImageBytes || 1024 * 1024;
const IMAGE_MAX_SIDE = SUPABASE_CONFIG.maxImageSide || 2000;
const SUPABASE_ENABLED = Boolean(SUPABASE_CONFIG?.enabled && SUPABASE_CONFIG.url && SUPABASE_CONFIG.publishableKey && SUPABASE_CONFIG.bucket);
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
let appDbPromise = null;

const state = {
  baseButterflies: [],
  customButterflies: [],
  collection: [],
  butterflyEdits: {},
  deletedButterflyIds: [],
  butterfliesTableAvailable: false,
  editingButterflyId: '',
  editingObservationId: '',
  query: '',
  pendingImageData: '',
  pendingFileName: '',
  pendingMimeType: '',
  pendingLocation: null,
  auth: null,
  syncBusy: false,
  cloudImageUrls: new Map(),
  leafletPromise: null,
  activeLocationMap: null,
  preloadedReferenceImages: new Set(),
  shareCardObjectUrl: '',
  shareCardCurrent: null,
};

const refs = {
  tabButtons: Array.from(document.querySelectorAll('.tab-button')),
  views: Array.from(document.querySelectorAll('.panel-view')),
  panel: document.getElementById('content-panel'),
  annieButton: document.getElementById('annie-button'),
  searchInput: document.getElementById('search-input'),
  butterflyList: document.getElementById('butterfly-list'),
  resultLine: document.getElementById('result-line'),
  speciesSelect: document.getElementById('species-select'),
  collector: document.getElementById('collector'),
  collectionFormTitle: document.getElementById('collection-form-title'),
  collectionFormLead: document.getElementById('collection-form-lead'),
  collectionTools: document.getElementById('collection-tools'),
  showCollectionForm: document.getElementById('show-collection-form'),
  closeCollectionForm: document.getElementById('close-collection-form'),
  uploadPreview: document.getElementById('upload-preview'),
  photoInput: document.getElementById('photo-input'),
  previewImage: document.getElementById('preview-image'),
  previewPlaceholder: document.getElementById('preview-placeholder'),
  form: document.getElementById('collection-form'),
  note: document.getElementById('observation-note'),
  collectionStory: document.getElementById('observation-story'),
  date: document.getElementById('observation-date'),
  addLocation: document.getElementById('add-location'),
  removeLocation: document.getElementById('remove-location'),
  locationStatus: document.getElementById('location-status'),
  locationStatusText: document.getElementById('location-status-text'),
  addButton: document.getElementById('add-observation'),
  collectionGrid: document.getElementById('collection-grid'),
  emptyTemplate: document.getElementById('empty-collection-template'),
  exportButton: document.getElementById('export-collection'),
  importButton: document.getElementById('import-local'),
  importFile: document.getElementById('import-file'),
  clearButton: document.getElementById('clear-collection'),
  storageHint: document.getElementById('storage-hint'),
  metricSpecies: document.getElementById('metric-species'),
  metricCollection: document.getElementById('metric-collection'),
  customSpeciesPanel: document.getElementById('custom-species-panel'),
  customSpeciesForm: document.getElementById('custom-species-form'),
  customName: document.getElementById('custom-name'),
  customScientific: document.getElementById('custom-scientific'),
  customDescription: document.getElementById('custom-description'),
  customTags: document.getElementById('custom-tags'),
  customImageOne: document.getElementById('custom-image-one'),
  customImageTwo: document.getElementById('custom-image-two'),
  cloudPanel: document.getElementById('cloud-panel'),
  cloudTitle: document.getElementById('cloud-title'),
  cloudStatus: document.getElementById('cloud-status'),
  authForm: document.getElementById('auth-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginButton: document.getElementById('login-button'),
  logoutButton: document.getElementById('logout-button'),
  syncNow: document.getElementById('sync-now'),
  mapModal: document.getElementById('map-modal'),
  mapModalClose: document.getElementById('map-modal-close'),
  locationMap: document.getElementById('location-map'),
  mapModalMeta: document.getElementById('map-modal-meta'),
  mapExternalLink: document.getElementById('map-external-link'),
  shareCardModal: document.getElementById('share-card-modal'),
  shareCardClose: document.getElementById('share-card-close'),
  shareCardPreview: document.getElementById('share-card-preview'),
  shareCardStatus: document.getElementById('share-card-status'),
  shareCardDownload: document.getElementById('share-card-download'),
  shareCardNative: document.getElementById('share-card-native'),
  shareCardCopy: document.getElementById('share-card-copy'),
  shareCardMail: document.getElementById('share-card-mail'),
  lightbox: document.getElementById('lightbox'),
  lightboxImage: document.getElementById('lightbox-image'),
  lightboxClose: document.getElementById('lightbox-close'),
  butterflyEditor: document.getElementById('butterfly-editor'),
  butterflyEditorForm: document.getElementById('butterfly-editor-form'),
  butterflyEditorTitle: document.getElementById('butterfly-editor-title'),
  butterflyEditorClose: document.getElementById('butterfly-editor-close'),
  butterflyEditorCancel: document.getElementById('butterfly-editor-cancel'),
  butterflyEditorDelete: document.getElementById('delete-butterfly'),
  butterflyEditorId: document.getElementById('butterfly-editor-id'),
  butterflyEditorName: document.getElementById('butterfly-editor-name'),
  butterflyEditorScientific: document.getElementById('butterfly-editor-scientific'),
  butterflyEditorDescription: document.getElementById('butterfly-editor-description'),
  butterflyEditorTags: document.getElementById('butterfly-editor-tags'),
  butterflyEditorImageOne: document.getElementById('butterfly-editor-image-one'),
  butterflyEditorImageTwo: document.getElementById('butterfly-editor-image-two'),
};

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

init();

async function init() {
  wireNavigation();
  wireAnnie();
  wireSearch();
  wireCollectionForm();
  wireCustomSpeciesForm();
  wireButterflyEditor();
  wireAuth();
  wireLightbox();
  wireLocationMap();
  wireShareCardModal();
  registerServiceWorker();
  setToday();
  loadButterflyLocalEdits();

  await loadCollection();
  await loadCustomSpecies();
  await loadBaseButterflies();
  await restoreSession();

  if (state.auth) {
    await loadCloudData();
    syncAll({ silent: true });
  }

  renderEverything();
  updateStorageHint();
  renderCloudPanel();
}

async function loadBaseButterflies() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Kunde inte läsa ${DATA_URL}`);
    state.baseButterflies = await response.json();
  } catch (error) {
    console.error(error);
    showToast('Kunde inte ladda fjärilsdata. Kontrollera data/butterflies.json.');
    state.baseButterflies = [];
  }
}


function normalizeButterflyImages(images) {
  return Array.isArray(images)
    ? images.filter(Boolean).map((image) => ({
      ...image,
      url: image.url || image.src || '',
      path: image.path || image.imagePath || '',
      imagePath: image.imagePath || image.path || '',
      author: image.author || image.commons_author || image.fotograf || '',
      license: image.license || image.licens || '',
    }))
    : [];
}

function catalogRowToButterfly(row = {}) {
  return {
    id: String(row.id || ''),
    remoteId: row.id || null,
    custom: Boolean(row.is_custom),
    svenskt_namn: row.swedish_name || '',
    vetenskapligt_namn: row.scientific_name || '',
    beskrivning: row.description || '',
    bildkategori_commons_url: row.commons_category_url || '',
    taggar: Array.isArray(row.tags) ? row.tags : [],
    images: normalizeButterflyImages(row.images),
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || '',
    deletedAt: row.deleted_at || null,
    syncStatus: 'synced',
    syncError: '',
  };
}

function butterflyToCatalogRow(butterfly = {}, options = {}) {
  const images = normalizeButterflyImages(butterfly.images).map((image) => {
    const cleaned = { ...image };
    if (isDataUrl(cleaned.url) && cleaned.path) cleaned.url = '';
    if (!cleaned.path) delete cleaned.path;
    if (!cleaned.imagePath) delete cleaned.imagePath;
    return cleaned;
  });

  return {
    id: String(butterfly.id),
    app_id: APP_ID,
    swedish_name: butterfly.svenskt_namn || '',
    scientific_name: butterfly.vetenskapligt_namn || null,
    description: butterfly.beskrivning || null,
    tags: Array.isArray(butterfly.taggar) ? butterfly.taggar : [],
    images,
    commons_category_url: butterfly.bildkategori_commons_url || null,
    sort_order: Number.isFinite(Number(butterfly.sortOrder)) ? Number(butterfly.sortOrder) : null,
    is_custom: Boolean(butterfly.custom),
    deleted_at: options.deletedAt ?? butterfly.deletedAt ?? null,
  };
}

function sortCatalogButterflies(items) {
  return [...items].sort((a, b) => {
    const sortA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : Number.POSITIVE_INFINITY;
    const sortB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : Number.POSITIVE_INFINITY;
    if (sortA !== sortB) return sortA - sortB;
    const idA = Number(a.id);
    const idB = Number(b.id);
    if (Number.isFinite(idA) && Number.isFinite(idB) && idA !== idB) return idA - idB;
    return String(a.svenskt_namn || a.id).localeCompare(String(b.svenskt_namn || b.id), 'sv');
  });
}

function wireNavigation() {
  refs.tabButtons.forEach((button) => {
    button.setAttribute('aria-controls', `view-${button.dataset.view}`);
    button.addEventListener('click', () => activateView(button.dataset.view, { scrollToPanel: true }));
  });
}

function wireAnnie() {
  if (!refs.annieButton) return;
  const moves = [
    'is-hop',
    'is-hop-medium',
    'is-hop-small',
    'is-lean-left-soft',
    'is-lean-left-deep',
    'is-lean-right-soft',
    'is-lean-right-deep',
  ];
  refs.annieButton.addEventListener('click', () => {
    if (reducedMotionQuery.matches) return;
    moves.forEach((move) => refs.annieButton.classList.remove(move));
    const move = moves[Math.floor(Math.random() * moves.length)];
    void refs.annieButton.offsetWidth;
    refs.annieButton.classList.add(move);
    window.setTimeout(() => refs.annieButton.classList.remove(move), 1250);
  });
}

function activateView(viewName, options = {}) {
  refs.tabButtons.forEach((button) => {
    const active = button.dataset.view === viewName;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  refs.views.forEach((view) => {
    const active = view.id === `view-${viewName}`;
    view.hidden = !active;
    view.classList.toggle('is-visible', active);
  });

  refs.panel.dataset.activeView = viewName;
  refs.panel.focus({ preventScroll: true });

  if (options.scrollToPanel) {
    requestAnimationFrame(() => {
      refs.panel.scrollIntoView({ block: 'start', behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' });
    });
  }
}

function wireSearch() {
  refs.searchInput.addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderButterflies();
  });

  refs.butterflyList.addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-action="edit-butterfly"]');
    if (editButton) {
      openButterflyEditor(editButton.dataset.id);
      return;
    }

    const quickAddButton = event.target.closest('[data-action="quick-add"]');
    if (quickAddButton) {
      primeCollectionForm(quickAddButton.dataset.id);
      return;
    }

    const image = event.target.closest('img');
    if (image && image.currentSrc && !image.currentSrc.endsWith('butterfly-placeholder.svg')) {
      openLightbox(image.currentSrc, image.alt);
    }
  });
}

function wireCollectionForm() {
  refs.photoInput.addEventListener('change', async (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Välj en bildfil.');
      return;
    }

    refs.addButton.disabled = true;
    refs.storageHint.textContent = 'Komprimerar bilden…';

    try {
      const prepared = await compressImage(file, { maxSide: IMAGE_MAX_SIDE, maxBytes: IMAGE_MAX_BYTES });
      state.pendingImageData = prepared.dataUrl;
      state.pendingMimeType = prepared.mimeType;
      state.pendingFileName = file.name;
      refs.previewImage.src = state.pendingImageData;
      refs.previewImage.hidden = false;
      refs.previewPlaceholder.hidden = true;
      refs.storageHint.textContent = state.editingObservationId
        ? `Ny bild klar (${formatBytes(prepared.blob.size)}). Tryck “Spara ändringar”.`
        : `Bild klar (${formatBytes(prepared.blob.size)}). Välj art och tryck “Lägg till”.`;
      updateAddButtonState();
    } catch (error) {
      console.error(error);
      showToast('Kunde inte läsa eller komprimera bilden. Prova en annan fil.');
      resetPendingImage();
      updateAddButtonState();
    }
  });

  refs.speciesSelect.addEventListener('change', updateAddButtonState);
  refs.addLocation?.addEventListener('click', captureObservationLocation);
  refs.removeLocation?.addEventListener('click', clearPendingLocation);

  refs.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await saveCollectionForm();
  });

  refs.showCollectionForm?.addEventListener('click', () => {
    resetCollectionForm();
    setCollectionFormVisible(true, { scrollToForm: true });
  });

  refs.closeCollectionForm?.addEventListener('click', () => {
    resetCollectionForm();
    setCollectionFormVisible(false);
  });

  refs.collectionGrid.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-action="delete-observation"]');
    if (deleteButton) {
      await deleteObservation(deleteButton.dataset.id);
      return;
    }

    const editButton = event.target.closest('[data-action="edit-observation"]');
    if (editButton) {
      await openObservationEditor(editButton.dataset.id);
      return;
    }

    const shareButton = event.target.closest('[data-action="share-card"]');
    if (shareButton) {
      await shareCollectionCard(shareButton.dataset.id);
      return;
    }

    const retryButton = event.target.closest('[data-action="retry-sync"]');
    if (retryButton) {
      await syncAll({ silent: false });
      return;
    }

    const locationButton = event.target.closest('[data-action="view-location"]');
    if (locationButton) {
      openLocationMap(locationButton.dataset.id);
      return;
    }

    const image = event.target.closest('img');
    if (image && image.currentSrc && !image.currentSrc.endsWith('butterfly-placeholder.svg')) {
      openLightbox(image.currentSrc, image.alt);
    }
  });


  refs.exportButton?.addEventListener('click', exportCollection);
  refs.importButton?.addEventListener('click', () => refs.importFile.click());
  refs.importFile?.addEventListener('change', importCollection);
  refs.clearButton?.addEventListener('click', clearCollection);
}


async function captureObservationLocation() {
  if (!refs.addLocation) return;

  refs.addLocation.disabled = true;
  refs.addLocation.textContent = 'Hämtar plats…';

  try {
    state.pendingLocation = await requestCurrentLocation();
    renderPendingLocationState();
    showToast('Plats tillagd.');
  } catch (error) {
    console.warn('Kunde inte hämta plats.', error);
    showToast(geolocationErrorMessage(error));
  } finally {
    refs.addLocation.disabled = false;
    if (!state.pendingLocation) refs.addLocation.textContent = 'Lägg till plats';
  }
}

function clearPendingLocation() {
  state.pendingLocation = null;
  renderPendingLocationState();
}

function renderPendingLocationState() {
  if (!refs.addLocation || !refs.locationStatus || !refs.locationStatusText) return;
  const location = normalizeLocation(state.pendingLocation);

  if (!location) {
    refs.addLocation.hidden = false;
    refs.addLocation.textContent = 'Lägg till plats';
    refs.locationStatus.hidden = true;
    refs.locationStatusText.textContent = '';
    return;
  }

  refs.addLocation.hidden = true;
  refs.locationStatus.hidden = false;
  refs.locationStatusText.textContent = `Plats tillagd${location.accuracy ? ` · ${formatLocationAccuracy(location.accuracy)}` : ''}`;
}

function requestCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: roundCoordinate(position.coords.latitude),
          lon: roundCoordinate(position.coords.longitude),
          accuracy: Number.isFinite(position.coords.accuracy) ? Math.max(0, Math.round(position.coords.accuracy)) : 0,
          capturedAt: new Date().toISOString(),
        });
      },
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

function geolocationErrorMessage(error) {
  if (error?.message === 'unsupported') return 'Platsdata stöds inte i den här webbläsaren.';
  if (error?.code === 1) return 'Platsåtkomst nekades. Ingen plats sparades.';
  if (error?.code === 2) return 'Kunde inte hitta aktuell plats just nu.';
  if (error?.code === 3) return 'Platsförfrågan tog för lång tid. Försök igen.';
  return 'Kunde inte hämta plats just nu.';
}

function roundCoordinate(value) {
  return Number(Number(value).toFixed(6));
}

function normalizeLocation(location) {
  if (!location || typeof location !== 'object') return null;
  const lat = Number(location.lat ?? location.latitude);
  const lon = Number(location.lon ?? location.lng ?? location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  const accuracy = Math.max(0, Math.round(Number(location.accuracy) || 0));
  return {
    lat: roundCoordinate(lat),
    lon: roundCoordinate(lon),
    accuracy,
    capturedAt: location.capturedAt || location.captured_at || new Date().toISOString(),
  };
}

function formatLocationAccuracy(accuracy) {
  const meters = Math.max(0, Math.round(Number(accuracy) || 0));
  return meters ? `±${meters} m` : '';
}

function wireCustomSpeciesForm() {
  refs.customSpeciesForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await addCustomSpecies();
  });
}


function wireButterflyEditor() {
  refs.butterflyEditorForm?.addEventListener('submit', saveButterflyEditor);
  refs.butterflyEditorClose?.addEventListener('click', closeButterflyEditor);
  refs.butterflyEditorCancel?.addEventListener('click', closeButterflyEditor);
  refs.butterflyEditor?.addEventListener('click', (event) => {
    if (event.target === refs.butterflyEditor) closeButterflyEditor();
  });
  refs.butterflyEditorDelete?.addEventListener('click', deleteEditingButterfly);
}

function openButterflyEditor(id) {
  const butterfly = findButterfly(id);
  if (!butterfly || !refs.butterflyEditorForm) return;

  state.editingButterflyId = String(butterfly.id);
  const images = butterfly.images || [];
  refs.butterflyEditorId.value = String(butterfly.id);
  refs.butterflyEditorTitle.textContent = `Redigera ${butterfly.svenskt_namn}`;
  refs.butterflyEditorName.value = butterfly.svenskt_namn || '';
  refs.butterflyEditorScientific.value = butterfly.vetenskapligt_namn || '';
  refs.butterflyEditorDescription.value = butterfly.beskrivning || '';
  refs.butterflyEditorTags.value = (butterfly.taggar || []).join(', ');
  refs.butterflyEditorImageOne.value = images[0]?.url || images[0]?.imagePath || '';
  refs.butterflyEditorImageTwo.value = images[1]?.url || images[1]?.imagePath || '';
  refs.butterflyEditor.hidden = false;
  requestAnimationFrame(() => refs.butterflyEditorName?.focus?.({ preventScroll: true }));
}

function closeButterflyEditor() {
  if (!refs.butterflyEditor) return;
  refs.butterflyEditor.hidden = true;
  state.editingButterflyId = '';
  refs.butterflyEditorForm?.reset();
}

async function saveButterflyEditor(event) {
  event.preventDefault();
  const id = refs.butterflyEditorId.value || state.editingButterflyId;
  const existing = findButterfly(id);
  if (!existing) return;

  const nextData = readButterflyEditorFields(existing);
  const updatedAt = new Date().toISOString();

  if (existing.custom) {
    const target = state.customButterflies.find((item) => String(item.id) === String(id));
    if (!target) return;
    Object.assign(target, nextData, { custom: true, updatedAt });
    if (state.auth) target.syncStatus = 'pending';
    await saveCustomSpecies();
  } else {
    state.butterflyEdits[String(id)] = { ...nextData, updatedAt };
    saveButterflyLocalEdits();
  }

  await updateCollectionNamesForButterfly(id, nextData);
  closeButterflyEditor();
  renderEverything();
  showToast('Fjärilen uppdaterades.');

  if (state.auth) {
    syncAll({ silent: true });
  }
}

function readButterflyEditorFields(existing = {}) {
  const imageOne = refs.butterflyEditorImageOne.value.trim();
  const imageTwo = refs.butterflyEditorImageTwo.value.trim();
  const previousImages = existing.images || [];
  const images = [];

  if (imageOne) {
    images.push({
      ...(previousImages[0] || {}),
      url: imageOne,
      path: imageOne === previousImages[0]?.url || (!isDataUrl(imageOne) && previousImages[0]?.path) ? previousImages[0]?.path || null : null,
      author: previousImages[0]?.author || 'Bildlänk',
      license: previousImages[0]?.license || '',
    });
  } else if (previousImages[0]) {
    images.push(previousImages[0]);
  }

  if (imageTwo) {
    images.push({
      ...(previousImages[1] || {}),
      url: imageTwo,
      path: imageTwo === previousImages[1]?.url || (!isDataUrl(imageTwo) && previousImages[1]?.path) ? previousImages[1]?.path || null : null,
      author: previousImages[1]?.author || 'Bildlänk',
      license: previousImages[1]?.license || '',
    });
  } else if (previousImages[1]?.path && !previousImages[1]?.url) {
    images.push(previousImages[1]);
  }

  return {
    svenskt_namn: refs.butterflyEditorName.value.trim(),
    vetenskapligt_namn: refs.butterflyEditorScientific.value.trim(),
    beskrivning: refs.butterflyEditorDescription.value.trim(),
    bildkategori_commons_url: existing.bildkategori_commons_url || '',
    taggar: splitTags(refs.butterflyEditorTags.value),
    images,
  };
}

function splitTags(value = '') {
  return normalizeTagList(value);
}

function normalizeTagList(value = []) {
  const rawTags = Array.isArray(value) ? value : String(value || '').split(',');
  return rawTags
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .filter((tag, index, tags) => tags.findIndex((candidate) => candidate.toLowerCase() === tag.toLowerCase()) === index);
}

async function deleteEditingButterfly() {
  const id = refs.butterflyEditorId.value || state.editingButterflyId;
  const butterfly = findButterfly(id);
  if (!butterfly) return;

  const confirmed = window.confirm(`Vill du ta bort fjärilen "${butterfly.svenskt_namn}" från listan? Gamla samlingsposter behåller sin koppling.`);
  if (!confirmed) return;

  if (butterfly.custom) {
    const removed = state.customButterflies.find((item) => String(item.id) === String(id));
    state.customButterflies = state.customButterflies.filter((item) => String(item.id) !== String(id));
    await saveCustomSpecies();
    if (removed && state.auth) {
      softDeleteCatalogButterfly(removed).catch((error) => console.warn('Kunde inte dölja fjärilen i katalogen.', error));
      if (!state.butterfliesTableAvailable && removed.remoteId) {
        deleteRemoteCustomButterfly(removed).catch((error) => console.warn('Kunde inte ta bort fjärilen i legacy-tabellen.', error));
      }
    }
  } else {
    state.deletedButterflyIds = [...new Set([...state.deletedButterflyIds, String(id)])];
    delete state.butterflyEdits[String(id)];
    saveButterflyLocalEdits();
    if (state.auth) {
      softDeleteCatalogButterfly(butterfly).catch((error) => console.warn('Kunde inte dölja fjärilen i katalogen.', error));
    }
  }

  closeButterflyEditor();
  renderEverything();
  showToast('Fjärilen togs bort från listan.');
}

function wireLocationMap() {
  refs.mapModalClose?.addEventListener('click', closeLocationMap);
  refs.mapModal?.addEventListener('click', (event) => {
    if (event.target === refs.mapModal) closeLocationMap();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && refs.mapModal && !refs.mapModal.hidden) closeLocationMap();
  });
}

async function openLocationMap(entryId) {
  const entry = state.collection.find((item) => String(item.id) === String(entryId));
  const location = normalizeLocation(entry?.location);
  if (!entry || !location || !refs.mapModal || !refs.locationMap) return;

  closeLocationMap({ keepModalClosed: true });
  refs.mapModal.hidden = false;
  document.body.classList.add('has-modal-open');
  refs.mapModalMeta.textContent = buildLocationMeta(location);
  refs.mapExternalLink.href = buildOsmMapUrl(location);
  refs.locationMap.innerHTML = '<div class="map-loading">Laddar karta…</div>';

  try {
    const L = await ensureLeaflet();
    if (refs.mapModal.hidden) return;
    refs.locationMap.innerHTML = '';

    const zoom = location.accuracy && location.accuracy > 120 ? 15 : 16;
    const map = L.map(refs.locationMap, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView([location.lat, location.lon], zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    if (location.accuracy) {
      L.circle([location.lat, location.lon], {
        radius: Math.min(location.accuracy, 600),
        color: '#214c33',
        weight: 1,
        opacity: 0.55,
        fillColor: '#214c33',
        fillOpacity: 0.12,
      }).addTo(map);
    }

    L.circleMarker([location.lat, location.lon], {
      radius: 7,
      color: '#171410',
      weight: 2,
      fillColor: '#fff9ed',
      fillOpacity: 1,
    }).addTo(map);

    state.activeLocationMap = map;
    window.setTimeout(() => map.invalidateSize(), 120);
  } catch (error) {
    console.warn('Kunde inte ladda Leaflet-karta.', error);
    refs.locationMap.innerHTML = `
      <div class="map-fallback">
        <p>Kartan kunde inte laddas just nu.</p>
        <a href="${escapeAttr(buildOsmMapUrl(location))}" target="_blank" rel="noopener noreferrer">Öppna i OpenStreetMap</a>
      </div>
    `;
  }
}

function closeLocationMap(options = {}) {
  if (state.activeLocationMap) {
    state.activeLocationMap.remove();
    state.activeLocationMap = null;
  }

  if (refs.locationMap) refs.locationMap.innerHTML = '';
  if (!options.keepModalClosed && refs.mapModal) refs.mapModal.hidden = true;
  document.body.classList.remove('has-modal-open');
}

function ensureLeaflet() {
  if (window.L?.map) return Promise.resolve(window.L);
  if (state.leafletPromise) return state.leafletPromise;

  state.leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS_URL;
      link.dataset.leafletCss = 'true';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => window.L?.map ? resolve(window.L) : reject(new Error('Leaflet kunde inte initieras.'));
    script.onerror = () => {
      state.leafletPromise = null;
      reject(new Error('Leaflet kunde inte laddas.'));
    };
    document.head.appendChild(script);
  });

  return state.leafletPromise;
}

function buildOsmMapUrl(location) {
  const lat = Number(location.lat);
  const lon = Number(location.lon);
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=16/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;
}

function buildLocationMeta(location) {
  const pieces = ['Plats sparad'];
  const accuracy = formatLocationAccuracy(location.accuracy);
  if (accuracy) pieces.push(accuracy);
  const date = formatDateTime(location.capturedAt);
  if (date) pieces.push(date);
  return pieces.join(' · ');
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

async function updateCollectionNamesForButterfly(id, data) {
  let changed = false;
  state.collection = state.collection.map((entry) => {
    if (String(entry.butterflyId) !== String(id)) return entry;
    changed = true;
    return {
      ...entry,
      butterflyName: data.svenskt_namn || entry.butterflyName,
      scientificName: data.vetenskapligt_namn || entry.scientificName,
    };
  });
  if (changed) await saveCollection();
}

function loadButterflyLocalEdits() {
  try {
    const edits = JSON.parse(localStorage.getItem(BUTTERFLY_EDITS_KEY) || '{}');
    state.butterflyEdits = edits && typeof edits === 'object' && !Array.isArray(edits) ? edits : {};
  } catch {
    state.butterflyEdits = {};
  }

  state.deletedButterflyIds = readLegacyArray(DELETED_BUTTERFLIES_KEY).map(String);
}

function saveButterflyLocalEdits() {
  localStorage.setItem(BUTTERFLY_EDITS_KEY, JSON.stringify(state.butterflyEdits));
  localStorage.setItem(DELETED_BUTTERFLIES_KEY, JSON.stringify(state.deletedButterflyIds));
}

function wireAuth() {
  if (!refs.cloudPanel) return;

  refs.authForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await signInFromForm();
  });

  refs.logoutButton?.addEventListener('click', () => {
    state.auth = null;
    localStorage.removeItem(AUTH_KEY);
    renderCloudPanel();
    showToast('Du är utloggad. Lokala bilder finns kvar på enheten.');
  });

  refs.syncNow?.addEventListener('click', () => syncAll({ silent: false }));
}

function wireLightbox() {
  refs.lightboxClose?.addEventListener('click', closeLightbox);
  refs.lightbox?.addEventListener('click', (event) => {
    if (event.target === refs.lightbox) closeLightbox();
  });
  refs.lightboxImage?.addEventListener('click', () => refs.lightboxImage.classList.toggle('is-zoomed'));
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (refs.butterflyEditor && !refs.butterflyEditor.hidden) closeButterflyEditor();
    if (!refs.lightbox.hidden) closeLightbox();
  });
}

function openLightbox(src, alt = '') {
  refs.lightboxImage.src = src;
  refs.lightboxImage.alt = alt || 'Förstorad fjärilsbild';
  refs.lightboxImage.classList.remove('is-zoomed');
  refs.lightbox.hidden = false;
}

function closeLightbox() {
  refs.lightbox.hidden = true;
  refs.lightboxImage.removeAttribute('src');
}

function setToday() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  refs.date.value = `${yyyy}-${mm}-${dd}`;
}

function getBaseButterflies() {
  return sortCatalogButterflies(state.baseButterflies)
    .filter((butterfly) => !isButterflyDeleted(butterfly.id, butterfly))
    .map((butterfly) => applyButterflyEdit(butterfly));
}

function getCustomButterflies() {
  return sortByCreatedAt(state.customButterflies).filter((butterfly) => !isButterflyDeleted(butterfly.id, butterfly));
}

function getButterflies() {
  return [...getBaseButterflies(), ...getCustomButterflies()];
}

function isButterflyDeleted(id, butterfly = null) {
  if (butterfly?.deletedAt || butterfly?.deleted_at) return true;
  return state.deletedButterflyIds.some((deletedId) => String(deletedId) === String(id));
}

function applyButterflyEdit(butterfly) {
  const edit = state.butterflyEdits[String(butterfly.id)];
  if (!edit) return butterfly;

  return {
    ...butterfly,
    svenskt_namn: edit.svenskt_namn || butterfly.svenskt_namn,
    vetenskapligt_namn: edit.vetenskapligt_namn || butterfly.vetenskapligt_namn,
    beskrivning: edit.beskrivning || butterfly.beskrivning,
    bildkategori_commons_url: edit.bildkategori_commons_url ?? butterfly.bildkategori_commons_url,
    taggar: Array.isArray(edit.taggar) ? edit.taggar : butterfly.taggar,
    images: Array.isArray(edit.images) ? edit.images : butterfly.images,
    edited: true,
  };
}

function renderEverything() {
  refs.metricSpecies.textContent = String(getButterflies().length);
  renderSpeciesOptions();
  renderButterflies();
  renderCollection();
  renderCloudPanel();
}

function renderSpeciesOptions() {
  const current = refs.speciesSelect.value;
  const butterflies = getButterflies();

  const baseOptions = getBaseButterflies()
    .map((butterfly) => `<option value="${escapeAttr(butterfly.id)}">${escapeHtml(butterfly.svenskt_namn)}</option>`)
    .join('');

  const customButterflies = getCustomButterflies();
  const customOptions = customButterflies.length
    ? `
      <optgroup label="Egna fjärilar">
        ${customButterflies
          .map((butterfly) => `<option value="${escapeAttr(butterfly.id)}">${escapeHtml(butterfly.svenskt_namn)}</option>`)
          .join('')}
      </optgroup>
    `
    : '';

  refs.speciesSelect.innerHTML = `<option value="">Välj art</option>${baseOptions}${customOptions}`;

  if (butterflies.some((butterfly) => String(butterfly.id) === String(current))) {
    refs.speciesSelect.value = current;
  }
}

function renderButterflies() {
  const butterflies = getButterflies();
  const filtered = butterflies.filter((butterfly) => {
    const queryText = [
      butterfly.svenskt_namn,
      butterfly.vetenskapligt_namn,
      butterfly.beskrivning,
      ...(butterfly.taggar || []),
      butterfly.custom ? 'egen egenart egen fjäril' : '',
    ].join(' ').toLowerCase();

    return !state.query || queryText.includes(state.query);
  });

  refs.resultLine.textContent = `${filtered.length} av ${butterflies.length} arter visas`;

  if (!filtered.length) {
    refs.butterflyList.innerHTML = `
      <article class="empty-state">
        <div class="empty-orb">?</div>
        <h3>Inga träffar</h3>
        <p>Testa ett enklare sökord: gul, blå, nässlor, äng eller trädgård.</p>
      </article>
    `;
    return;
  }

  refs.butterflyList.innerHTML = filtered.map(renderButterflyCard).join('');
  hydrateCloudImages();
  warmReferenceImageCache(filtered);
}

function renderButterflyCard(butterfly, index = 0) {
  const firstImage = butterfly.images?.[0] || { url: IMAGE_PLACEHOLDER };
  const secondImage = butterfly.images?.[1];
  const hasSecondImage = Boolean(secondImage?.url || secondImage?.path);
  const tags = (butterfly.taggar || []).slice(0, 6).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  const cardNumber = butterfly.custom ? 'egen' : `#${butterfly.id}`;
  const sourceNote = butterfly.custom ? renderSyncMini(butterfly) : (butterfly.edited ? 'Redigerad fjäril' : '');

  return `
    <article class="butterfly-card" data-butterfly-id="${escapeAttr(butterfly.id)}">
      <div class="card-content">
        <div class="card-top">
          <div>
            <h3 class="butterfly-name">${escapeHtml(butterfly.svenskt_namn)}</h3>
            <p class="scientific-name"><em>${escapeHtml(butterfly.vetenskapligt_namn)}</em></p>
          </div>
          <div class="card-controls">
            <span class="card-index ${butterfly.custom ? 'is-custom' : ''}">${escapeHtml(cardNumber)}</span>
            <button class="butterfly-edit-button" type="button" data-action="edit-butterfly" data-id="${escapeAttr(butterfly.id)}" aria-label="Redigera ${escapeAttr(butterfly.svenskt_namn)}">✎</button>
          </div>
        </div>
        <p class="description">${escapeHtml(butterfly.beskrivning)}</p>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      </div>
      <div class="card-media ${hasSecondImage ? '' : 'is-single'}" aria-label="Referensbilder för ${escapeHtml(butterfly.svenskt_namn)}">
        <div class="card-media-main">
          ${renderImage(firstImage, butterfly.svenskt_namn, { eager: index < 4, highPriority: index < 2 })}
        </div>
        ${hasSecondImage ? `
          <div class="card-media-secondary">
            ${renderImage(secondImage, `${butterfly.svenskt_namn}, extra referensbild`, { eager: index < 2 })}
          </div>
        ` : ''}
      </div>
      <div class="card-actions">
        <button class="card-button" type="button" data-action="quick-add" data-id="${escapeAttr(butterfly.id)}">Lägg till i samling</button>
        ${sourceNote ? `<span class="source-note">${sourceNote}</span>` : ''}
      </div>
    </article>
  `;
}

function renderImage(image = {}, alt = '', options = {}) {
  const path = image.path || image.imagePath || '';
  const cached = path ? state.cloudImageUrls.get(path) : '';
  const src = image.url || cached || IMAGE_PLACEHOLDER;
  const cloudAttr = path && !image.url && !cached ? `data-cloud-image="${escapeAttr(path)}"` : '';
  const loading = options.eager ? 'eager' : 'lazy';
  const priority = options.highPriority ? 'high' : 'low';
  return `<img src="${escapeAttr(src)}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async" fetchpriority="${priority}" ${cloudAttr} onerror="this.src='${IMAGE_PLACEHOLDER}'" />`;
}

function warmReferenceImageCache(butterflies = []) {
  if (!Array.isArray(butterflies) || !butterflies.length) return;
  if (navigator.connection?.saveData) return;

  const urls = [];
  for (const butterfly of butterflies) {
    for (const image of butterfly.images || []) {
      const url = image?.url;
      if (url && !isDataUrl(url) && !state.preloadedReferenceImages.has(url)) urls.push(url);
    }
  }

  if (!urls.length) return;

  let index = 0;
  const loadNext = () => {
    const url = urls[index++];
    if (!url) return;
    state.preloadedReferenceImages.add(url);
    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.onload = image.onerror = () => {
      const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 120));
      schedule(loadNext, { timeout: 900 });
    };
    image.src = url;
    if (typeof image.decode === 'function') image.decode().catch(() => {});
  };

  const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 160));
  schedule(loadNext, { timeout: 1200 });
}

function renderSyncMini(item) {
  if (item?.syncStatus === 'error') return 'Egen art · sparad lokalt';
  return 'Egen art';
}

function primeCollectionForm(butterflyId) {
  refs.speciesSelect.value = String(butterflyId);
  updateAddButtonState();
  activateView('collection', { scrollToPanel: true });
  setCollectionFormVisible(true, { scrollToForm: true });
  showToast('Art vald. Lägg till en egen bild från galleriet.');
  requestAnimationFrame(() => refs.uploadPreview?.focus?.({ preventScroll: true }));
}

function setCollectionFormVisible(isVisible, options = {}) {
  if (!refs.collector || !refs.showCollectionForm) return;

  refs.collector.hidden = !isVisible;
  refs.collector.classList.toggle('is-visible', isVisible);
  if (refs.collectionTools) refs.collectionTools.hidden = isVisible;
  refs.showCollectionForm.hidden = isVisible;
  refs.showCollectionForm.setAttribute('aria-expanded', String(isVisible));

  if (isVisible && options.scrollToForm) {
    requestAnimationFrame(() => {
      refs.collector.scrollIntoView({ block: 'start', behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' });
    });
  }
}

function setCollectionFormMode(mode = 'add') {
  const isEdit = mode === 'edit';
  if (refs.collectionFormTitle) refs.collectionFormTitle.textContent = isEdit ? 'Redigera kort' : 'Ny fjäril';
  if (refs.collectionFormLead) refs.collectionFormLead.textContent = isEdit
    ? 'Justera bild, art, berättelse eller plats.'
    : 'Ladda upp en bild, beskriv, spara.';
  if (refs.addButton) refs.addButton.textContent = isEdit ? 'Spara ändringar' : 'Lägg till';
  if (refs.uploadPreview) refs.uploadPreview.setAttribute('aria-label', isEdit ? 'Byt fjärilsbild' : 'Ladda upp fjärilsbild');
}

function getEditingObservation() {
  if (!state.editingObservationId) return null;
  return state.collection.find((item) => String(item.id) === String(state.editingObservationId)) || null;
}

function updateAddButtonState() {
  const editingEntry = getEditingObservation();
  const hasImage = Boolean(state.pendingImageData || editingEntry?.imageData || editingEntry?.imagePath);
  refs.addButton.disabled = !(hasImage && refs.speciesSelect.value);
}

async function saveCollectionForm() {
  if (state.editingObservationId) {
    await updateObservation();
    return;
  }
  await addObservation();
}

async function addObservation() {
  const butterfly = findButterfly(refs.speciesSelect.value);
  if (!butterfly || !state.pendingImageData) return;

  const observation = {
    id: safeRandomId('samling'),
    remoteId: null,
    butterflyId: butterfly.id,
    butterflyName: butterfly.svenskt_namn,
    scientificName: butterfly.vetenskapligt_namn,
    imageData: state.pendingImageData,
    imageMimeType: state.pendingMimeType || dataUrlMimeType(state.pendingImageData),
    imagePath: null,
    originalFileName: state.pendingFileName,
    note: refs.note.value.trim(),
    story: (refs.collectionStory?.value || '').trim(),
    date: refs.date.value || new Date().toISOString().slice(0, 10),
    location: state.pendingLocation ? { ...state.pendingLocation } : null,
    createdAt: new Date().toISOString(),
    customSpecies: Boolean(butterfly.custom),
    syncStatus: state.auth ? 'pending' : 'local',
    syncError: '',
  };

  state.collection.unshift(observation);
  await saveCollection();
  renderCollection();
  resetCollectionForm();
  setCollectionFormVisible(false);
  showToast(`${butterfly.svenskt_namn} lades till i samlingen.`);

  if (state.auth) {
    syncAll({ silent: true });
  }
}

async function updateObservation() {
  const entry = getEditingObservation();
  const butterfly = findButterfly(refs.speciesSelect.value);
  if (!entry || !butterfly) return;

  const hasNewImage = Boolean(state.pendingImageData);
  if (!hasNewImage && !entry.imageData && !entry.imagePath) {
    showToast('Välj en bild innan du sparar kortet.');
    return;
  }

  Object.assign(entry, {
    butterflyId: butterfly.id,
    butterflyName: butterfly.svenskt_namn,
    scientificName: butterfly.vetenskapligt_namn,
    imageData: hasNewImage ? state.pendingImageData : (entry.imageData || ''),
    imageMimeType: hasNewImage
      ? (state.pendingMimeType || dataUrlMimeType(state.pendingImageData) || entry.imageMimeType || 'image/jpeg')
      : (entry.imageMimeType || dataUrlMimeType(entry.imageData || '') || 'image/jpeg'),
    imagePath: hasNewImage ? null : (entry.imagePath || null),
    originalFileName: hasNewImage ? (state.pendingFileName || entry.originalFileName || '') : (entry.originalFileName || ''),
    note: refs.note.value.trim(),
    story: (refs.collectionStory?.value || '').trim(),
    date: refs.date.value || new Date().toISOString().slice(0, 10),
    location: state.pendingLocation ? { ...state.pendingLocation } : null,
    customSpecies: Boolean(butterfly.custom),
    updatedAt: new Date().toISOString(),
    syncStatus: state.auth ? 'pending' : 'local',
    syncError: '',
  });

  await saveCollection();
  renderCollection();
  resetCollectionForm();
  setCollectionFormVisible(false);
  showToast('Kortet uppdaterades.');

  if (state.auth) {
    syncAll({ silent: true });
  }
}

async function openObservationEditor(id) {
  const entry = state.collection.find((item) => String(item.id) === String(id));
  if (!entry) return;

  state.editingObservationId = String(entry.id);
  setCollectionFormMode('edit');
  setCollectionFormVisible(true, { scrollToForm: true });

  refs.speciesSelect.value = String(entry.butterflyId || '');
  refs.note.value = entry.note || '';
  if (refs.collectionStory) refs.collectionStory.value = entry.story || '';
  refs.date.value = entry.date || new Date().toISOString().slice(0, 10);
  state.pendingLocation = normalizeLocation(entry.location);
  renderPendingLocationState();

  state.pendingImageData = '';
  state.pendingMimeType = entry.imageMimeType || '';
  state.pendingFileName = entry.originalFileName || '';
  refs.photoInput.value = '';

  const imageSrc = await resolveCollectionImageSource(entry).catch(() => entry.imageData || IMAGE_PLACEHOLDER);
  refs.previewImage.src = imageSrc;
  refs.previewImage.hidden = false;
  refs.previewPlaceholder.hidden = true;
  refs.storageHint.textContent = 'Kortet redigeras. Byt bild vid behov och tryck “Spara ändringar”.';
  updateAddButtonState();
}

async function addCustomSpecies() {
  const name = refs.customName.value.trim();
  const scientific = refs.customScientific.value.trim();
  const description = refs.customDescription.value.trim();
  const [firstFile] = Array.from(refs.customImageOne.files || []);
  const [secondFile] = Array.from(refs.customImageTwo.files || []);

  if (!name || !scientific || !description || !firstFile) {
    showToast('Namn, latinskt namn, bild och beskrivning behövs.');
    return;
  }
  if (!firstFile.type.startsWith('image/') || (secondFile && !secondFile.type.startsWith('image/'))) {
    showToast('Välj bara bildfiler.');
    return;
  }

  const submitButton = refs.customSpeciesForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Komprimerar…';

  try {
    const first = await compressImage(firstFile, { maxSide: IMAGE_MAX_SIDE, maxBytes: IMAGE_MAX_BYTES });
    const images = [{ url: first.dataUrl, path: null, author: 'Egen bild', license: 'Privat' }];

    if (secondFile) {
      const second = await compressImage(secondFile, { maxSide: IMAGE_MAX_SIDE, maxBytes: IMAGE_MAX_BYTES });
      images.push({ url: second.dataUrl, path: null, author: 'Egen bild', license: 'Privat' });
    }

    const customButterfly = {
      id: safeRandomId('custom'),
      remoteId: null,
      custom: true,
      svenskt_namn: name,
      vetenskapligt_namn: scientific,
      beskrivning: description,
      bildkategori_commons_url: '',
      taggar: splitTags(refs.customTags?.value || ''),
      images,
      createdAt: new Date().toISOString(),
      syncStatus: state.auth ? 'pending' : 'local',
      syncError: '',
    };

    state.customButterflies.unshift(customButterfly);
    await saveCustomSpecies();
    refs.customSpeciesForm.reset();
    refs.customSpeciesPanel.open = false;
    renderEverything();
    showToast(`${name} lades till som egen fjäril.`);

    if (state.auth) {
      syncAll({ silent: true });
    }
  } catch (error) {
    console.error(error);
    showToast('Kunde inte spara den egna fjärilen. Prova med en mindre bild.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Spara egen fjäril';
  }
}

function renderCollection() {
  refs.metricCollection.textContent = String(state.collection.length);

  if (!state.collection.length) {
    const empty = refs.emptyTemplate.content.cloneNode(true);
    refs.collectionGrid.replaceChildren(empty);
    updateStorageHint();
    return;
  }

  const entries = state.collection.map((entry) => {
    const cloudSrc = entry.imagePath ? state.cloudImageUrls.get(entry.imagePath) : '';
    const imageSrc = entry.imageData || cloudSrc || IMAGE_PLACEHOLDER;
    const cloudAttr = entry.imagePath && !entry.imageData && !cloudSrc ? `data-cloud-image="${escapeAttr(entry.imagePath)}"` : '';
    const story = renderCollectionStory(entry);
    return `
      <article class="collection-card">
        <div class="collection-photo">
          <img src="${escapeAttr(imageSrc)}" ${cloudAttr} alt="Egen bild: ${escapeHtml(entry.butterflyName)}" loading="lazy" />
          ${renderSyncChip(entry)}
        </div>
        <div class="collection-body">
          <div class="collection-head">
            <h3>${escapeHtml(entry.butterflyName)}</h3>
            <div class="card-controls">
              <button class="butterfly-edit-button" type="button" data-action="edit-observation" data-id="${escapeAttr(entry.id)}" aria-label="Redigera ${escapeAttr(entry.butterflyName)}">✎</button>
            </div>
          </div>
          <p class="collection-meta"><em>${escapeHtml(entry.scientificName)}</em> · ${formatDate(entry.date)}</p>
          ${entry.note ? `<p class="collection-note">${escapeHtml(entry.note)}</p>` : ''}
          ${story}
          ${renderCollectionLocation(entry)}
          <div class="collection-card-actions">
            <button class="mini-button share-card-button" type="button" data-action="share-card" data-id="${escapeAttr(entry.id)}">Skapa kort</button>
            ${entry.syncStatus === 'error' ? `<button class="mini-button" type="button" data-action="retry-sync">Försök igen</button>` : ''}
            <button class="delete-button" type="button" data-action="delete-observation" data-id="${escapeAttr(entry.id)}">Ta bort</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  refs.collectionGrid.innerHTML = entries;
  hydrateCloudImages();
  updateStorageHint();
}

function renderCollectionStory(entry) {
  const story = String(entry?.story || '').trim();
  if (!story) return '';

  return `
    <div class="collection-story">
      <span>Annies fjärilberättelse</span>
      <p>${escapeHtml(story)}</p>
    </div>
  `;
}

function renderCollectionLocation(entry) {
  const location = normalizeLocation(entry?.location);
  if (!location) return '';

  return `
    <div class="collection-location">
      <span>Plats sparad${location.accuracy ? ` · ${escapeHtml(formatLocationAccuracy(location.accuracy))}` : ''}</span>
      <button class="mini-button" type="button" data-action="view-location" data-id="${escapeAttr(entry.id)}">Visa karta</button>
    </div>
  `;
}


function wireShareCardModal() {
  refs.shareCardClose?.addEventListener('click', closeShareCardModal);
  refs.shareCardModal?.addEventListener('click', (event) => {
    if (event.target === refs.shareCardModal) closeShareCardModal();
  });
  refs.shareCardNative?.addEventListener('click', shareCurrentCardFromModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && refs.shareCardModal && !refs.shareCardModal.hidden) closeShareCardModal();
  });
}

async function shareCollectionCard(entryId) {
  const entry = state.collection.find((item) => String(item.id) === String(entryId));
  if (!entry) return;

  const button = document.querySelector(`[data-action="share-card"][data-id="${cssEscape(String(entryId))}"]`);
  const previousText = button?.textContent || '';
  if (button) {
    button.disabled = true;
    button.textContent = 'Skapar kort…';
  }

  try {
    const card = await createShareCard(entry);
    openShareCardModal(card);
  } catch (error) {
    console.error('Kunde inte skapa fjärilskort.', error);
    showToast('Kunde inte skapa fjärilskortet just nu.');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = previousText || 'Skapa kort';
    }
  }
}

async function createShareCard(entry) {
  const imageSrc = await resolveCollectionImageSource(entry);
  const image = await loadCanvasImage(imageSrc);
  const appIcon = await loadCanvasImage('./assets/pwa/icon-192x192.png?v=1.5.61').catch(() => null);
  const mapMarker = await loadCanvasImage('./assets/map-pin-clean.svg?v=1.5.61').catch(() => null);
  const location = normalizeLocation(entry.location);
  const cardBlob = await drawShareCard(entry, image, location, appIcon, mapMarker);
  const objectUrl = URL.createObjectURL(cardBlob);
  const title = `${entry.butterflyName || 'Fjäril'} · Annies fjärilar`;
  const locationUrl = location ? buildOsmMapUrl(location) : '';
  const fileName = `${slugify(entry.butterflyName || 'annies-fjaril')}-kort.png`;
  return { blob: cardBlob, objectUrl, title, locationUrl, fileName };
}

async function resolveCollectionImageSource(entry) {
  if (entry.imageData) return entry.imageData;
  if (entry.imagePath && state.cloudImageUrls.has(entry.imagePath)) return state.cloudImageUrls.get(entry.imagePath);
  if (entry.imagePath && state.auth) return getCloudImageUrl(entry.imagePath);
  return IMAGE_PLACEHOLDER;
}

async function drawShareCard(entry, image, location, appIcon = null, mapMarker = null) {
  const width = 1200;
  const margin = 72;
  const contentWidth = width - margin * 2;
  const tempCanvas = document.createElement('canvas');
  const ctx = tempCanvas.getContext('2d');
  const colors = {
    paper: '#fbf7ef',
    panel: '#f7f1e6',
    panelWarm: '#f8eed4',
    ink: '#1b1713',
    muted: '#6b655b',
    line: '#241f19',
    lineSoft: 'rgba(36, 31, 25, 0.14)',
    leaf: '#d7e6c4',
    leafDeep: '#214c33',
  };

  const titleLines = wrapCanvasText(ctx, entry.butterflyName || 'Okänd fjäril', contentWidth - 300, '700 80px "Latin Modern Roman", Georgia, serif', 2);
  const noteLines = entry.note ? wrapCanvasText(ctx, entry.note, contentWidth - 84, '500 30px Inter, system-ui, sans-serif', 8) : [];
  const story = String(entry.story || '').trim();
  const storyLines = story ? wrapCanvasText(ctx, story, contentWidth - 92, '500 32px "Latin Modern Roman", Georgia, serif', 24) : [];
  const hasNotes = noteLines.length || storyLines.length;
  const photoHeight = 612;
  const titleHeight = titleLines.length * 86;
  const noteBlockHeight = noteLines.length ? 88 + noteLines.length * 42 : 0;
  const storyBlockHeight = storyLines.length ? 92 + storyLines.length * 46 : 0;
  const locationBlockHeight = location ? 168 : 0;
  const emptyCopyHeight = hasNotes ? 0 : 82;
  const footerBlockHeight = 128;
  const height = Math.max(1440, 48 + 34 + titleHeight + 72 + photoHeight + 34 + noteBlockHeight + storyBlockHeight + emptyCopyHeight + locationBlockHeight + footerBlockHeight + 54);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const draw = canvas.getContext('2d');

  draw.fillStyle = colors.paper;
  draw.fillRect(0, 0, width, height);

  drawBrandLockup(draw, appIcon, width - margin, 70, colors);

  let y = 92;
  draw.font = '700 80px "Latin Modern Roman", Georgia, serif';
  draw.fillStyle = colors.ink;
  titleLines.forEach((line) => {
    draw.fillText(line, margin, y);
    y += 86;
  });

  draw.font = 'italic 34px "Latin Modern Roman", Georgia, serif';
  draw.fillStyle = colors.muted;
  const scientific = entry.scientificName ? entry.scientificName : 'Egen samlingsfjäril';
  draw.fillText(scientific, margin, y + 2);

  y += 54;
  drawFramedSharePhoto(draw, image, margin, y, contentWidth, photoHeight, colors);
  y += photoHeight + 34;

  if (noteLines.length) {
    y = drawTextPanel(draw, {
      x: margin,
      y,
      width: contentWidth,
      label: 'ANTECKNING',
      lines: noteLines,
      font: '500 30px Inter, system-ui, sans-serif',
      lineHeight: 42,
      colors,
    });
  }

  if (storyLines.length) {
    y = drawTextPanel(draw, {
      x: margin,
      y,
      width: contentWidth,
      label: 'ANNIES FJÄRILBERÄTTELSE',
      lines: storyLines,
      font: '500 32px "Latin Modern Roman", Georgia, serif',
      lineHeight: 46,
      colors,
      warm: true,
    });
  }

  if (!hasNotes) {
    draw.font = '500 29px Inter, system-ui, sans-serif';
    draw.fillStyle = colors.muted;
    draw.fillText('En ny fjäril i Annies samling.', margin + 2, y + 24);
    y += 82;
  }

  if (location) {
    y = drawLocationSharePanel(draw, location, margin, y, contentWidth, colors, mapMarker);
  }

  const footerY = height - 46;
  draw.strokeStyle = colors.lineSoft;
  draw.lineWidth = 2;
  draw.beginPath();
  draw.moveTo(margin, footerY - 52);
  draw.lineTo(width - margin, footerY - 52);
  draw.stroke();

  drawAnnieSignature(draw, width / 2, footerY + 2, 0.9, colors);

  return canvasToBlob(canvas, 'image/png', 0.96);
}

function drawSubtlePaperTexture(ctx, width, height) {
  const soft = ctx.createRadialGradient(width * 0.15, height * 0.08, 0, width * 0.15, height * 0.08, 460);
  soft.addColorStop(0, 'rgba(255, 249, 237, 0.82)');
  soft.addColorStop(1, 'rgba(255, 249, 237, 0)');
  ctx.fillStyle = soft;
  ctx.fillRect(0, 0, width, height);

  const warm = ctx.createRadialGradient(width * 0.86, height * 0.92, 0, width * 0.86, height * 0.92, 500);
  warm.addColorStop(0, 'rgba(242, 207, 117, 0.15)');
  warm.addColorStop(1, 'rgba(242, 207, 117, 0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, width, height);
}

function drawFramedSharePhoto(ctx, image, x, y, width, height, colors) {
  roundRect(ctx, x, y, width, height, 28);
  ctx.fillStyle = '#f4eee2';
  ctx.fill();
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  const mat = { x: x + 18, y: y + 18, width: width - 36, height: height - 36, radius: 22 };
  roundRect(ctx, mat.x, mat.y, mat.width, mat.height, mat.radius);
  ctx.fillStyle = '#fffaf1';
  ctx.fill();
  ctx.strokeStyle = 'rgba(36, 31, 25, 0.12)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const imageBox = { x: mat.x + 20, y: mat.y + 20, width: mat.width - 40, height: mat.height - 40, radius: 16 };
  drawImageContained(ctx, image, imageBox.x, imageBox.y, imageBox.width, imageBox.height, imageBox.radius, '#f7f1e6');
  roundRect(ctx, imageBox.x, imageBox.y, imageBox.width, imageBox.height, imageBox.radius);
  ctx.strokeStyle = 'rgba(36, 31, 25, 0.16)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
}

function drawSmallCornerLeaf(ctx, x, y, flipX, flipY, colors) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.strokeStyle = 'rgba(33, 76, 51, 0.62)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 28);
  ctx.quadraticCurveTo(10, 14, 26, 0);
  ctx.stroke();
  ctx.fillStyle = colors.leaf;
  ctx.beginPath();
  ctx.ellipse(23, 8, 6, 12, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTextPanel(ctx, { x, y, width, label, lines, font, lineHeight, colors, warm = false }) {
  const height = 72 + lines.length * lineHeight;
  roundRect(ctx, x, y, width, height, 24);
  ctx.fillStyle = warm ? colors.panelWarm : colors.panel;
  ctx.fill();
  ctx.strokeStyle = colors.lineSoft;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.font = '900 21px Inter, system-ui, sans-serif';
  ctx.fillStyle = warm ? colors.leafDeep : colors.muted;
  ctx.fillText(label, x + 38, y + 40);

  ctx.font = font;
  ctx.fillStyle = colors.ink;
  let textY = y + 86;
  lines.forEach((line) => {
    ctx.fillText(line, x + 38, textY);
    textY += lineHeight;
  });

  return y + height + 22;
}

function drawLocationSharePanel(ctx, location, x, y, width, colors, markerImage = null) {
  const height = 168;
  roundRect(ctx, x, y, width, height, 24);
  ctx.fillStyle = '#eef4ea';
  ctx.fill();
  ctx.strokeStyle = colors.lineSoft;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  const markerSize = 62;
  const markerX = x + 40;
  const markerY = y + (height - markerSize) / 2;
  if (markerImage) {
    ctx.drawImage(markerImage, markerX, markerY, markerSize, markerSize);
  }

  const textX = markerX + markerSize + 28;
  ctx.font = '700 39px Inter, system-ui, sans-serif';
  ctx.fillStyle = colors.ink;
  ctx.fillText('Här hittades den', textX, y + 66);

  ctx.font = '600 27px Inter, system-ui, sans-serif';
  ctx.fillStyle = colors.muted;
  ctx.fillText(`${Number(location.lat).toFixed(5)}, ${Number(location.lon).toFixed(5)}`, textX, y + 108);

  const captured = formatDateTime(location.capturedAt);
  if (captured) {
    ctx.font = '600 21px Inter, system-ui, sans-serif';
    ctx.fillStyle = colors.muted;
    ctx.fillText(captured, textX, y + 138);
  }

  return y + height + 22;
}

function drawMapPin(ctx, cx, cy, colors, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.shadowColor = 'rgba(23, 20, 16, 0.18)';
  ctx.shadowBlur = 13;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = colors.rose;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -22, 27, Math.PI * 0.12, Math.PI * 1.88);
  ctx.lineTo(0, 48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.arc(0, -22, 10, 0, Math.PI * 2);
  ctx.fillStyle = colors.paper;
  ctx.fill();
  ctx.strokeStyle = 'rgba(28, 24, 18, 0.16)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawAnnieSignature(ctx, centerX, baselineY, scale, colors) {
  ctx.save();
  ctx.translate(centerX, baselineY);
  ctx.rotate(-0.02);
  ctx.font = `italic ${Math.round(58 * scale)}px "Latin Modern Roman", Georgia, serif`;
  ctx.fillStyle = colors.ink;
  ctx.textAlign = 'center';
  ctx.fillText('/ Annie', 0, 0);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawBrandLockup(ctx, appIcon, rightX, baselineY, colors) {
  const iconSize = 40;
  const iconGap = 12;
  const text = 'Annies fjärilar';
  ctx.textAlign = 'right';
  ctx.font = '900 24px Inter, system-ui, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const iconX = rightX - iconSize;
  const textRight = iconX - iconGap;
  const iconY = baselineY - iconSize / 2 - 1;
  if (appIcon) {
    drawAppIcon(ctx, appIcon, iconX, iconY, iconSize);
  }
  ctx.fillStyle = colors.leafDeep;
  ctx.fillText(text, textRight, baselineY + 8);
  ctx.textAlign = 'left';
}


function drawAppIcon(ctx, image, x, y, size) {
  ctx.save();
  roundRect(ctx, x, y, size, size, size * 0.22);
  ctx.clip();
  ctx.drawImage(image, x, y, size, size);
  ctx.restore();
  roundRect(ctx, x, y, size, size, size * 0.22);
  ctx.strokeStyle = 'rgba(28, 24, 18, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawButterflyMark(ctx, x, y, size, colors) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.scale(size / 120, size / 120);
  ctx.fillStyle = colors.nectar;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(-24, -8, 28, 38, -0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.blue;
  ctx.beginPath();
  ctx.ellipse(24, -8, 28, 38, 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.leafDeep;
  roundRect(ctx, -7, -38, 14, 78, 8);
  ctx.fill();
  ctx.restore();
}

function drawImageContained(ctx, image, x, y, width, height, radius, background = '#dce4d3') {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.fillStyle = background;
  ctx.fillRect(x, y, width, height);
  const sourceWidth = image.naturalWidth || image.width || 1;
  const sourceHeight = image.naturalHeight || image.height || 1;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = y + (height - drawHeight) / 2;
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  ctx.restore();
}

function wrapCanvasText(ctx, text, maxWidth, font, maxLines = Infinity) {
  ctx.font = font;
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return [];
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
      return;
    }
    lines.push(line);
    line = word;
  });
  if (line) lines.push(line);

  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines);
    let last = clipped[clipped.length - 1];
    while (last.length && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1).trim();
    clipped[clipped.length - 1] = `${last}…`;
    return clipped;
  }
  return lines;
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Kunde inte läsa bilden till delningskortet.'));
    if (!isDataUrl(src) && !String(src).startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.src = src;
  });
}

function canvasToBlob(canvas, type = 'image/png', quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Kunde inte exportera bildkort.'));
    }, type, quality);
  });
}

function openShareCardModal(card) {
  if (!refs.shareCardModal || !refs.shareCardPreview) return;
  revokeShareCardObjectUrl();
  state.shareCardObjectUrl = card.objectUrl;
  state.shareCardCurrent = {
    ...card,
    file: createShareCardFile(card),
  };

  refs.shareCardPreview.src = card.objectUrl;
  refs.shareCardPreview.alt = `Förhandsvisning av fjärilskort för ${card.title}`;
  if (refs.shareCardDownload) {
    refs.shareCardDownload.href = card.objectUrl;
    refs.shareCardDownload.download = card.fileName;
  }

  const canShare = canShareCurrentCard();
  if (refs.shareCardNative) {
    refs.shareCardNative.hidden = !canShare;
    refs.shareCardNative.disabled = false;
    refs.shareCardNative.textContent = 'Dela kort';
  }
  if (refs.shareCardStatus) {
    refs.shareCardStatus.textContent = canShare
      ? 'Kortet är klart. Ladda ner det eller dela här direkt.'
      : 'Kortet är klart. Ladda ner det på vanligt sätt.';
  }

  refs.shareCardModal.hidden = false;
  document.body.classList.add('has-modal-open');
}

function createShareCardFile(card) {
  if (typeof File !== 'function' || !card?.blob) return null;
  return new File([card.blob], card.fileName, { type: card.blob.type || 'image/png' });
}

function isMobileShareSurface() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function canShareCurrentCard() {
  const file = state.shareCardCurrent?.file;
  if (!file || !isMobileShareSurface() || !navigator.share) return false;
  const sharePayload = { files: [file] };
  if (state.shareCardCurrent?.locationUrl) sharePayload.url = state.shareCardCurrent.locationUrl;
  return !navigator.canShare || navigator.canShare(sharePayload);
}

async function shareCurrentCardFromModal() {
  const card = state.shareCardCurrent;
  if (!card?.file || !canShareCurrentCard()) return;

  if (refs.shareCardNative) {
    refs.shareCardNative.disabled = true;
    refs.shareCardNative.textContent = 'Delar…';
  }

  try {
    const sharePayload = { files: [card.file] };
    if (card.locationUrl) sharePayload.url = card.locationUrl;
    await navigator.share(sharePayload);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      console.warn('Kunde inte dela fjärilskort.', error);
      showToast('Kunde inte dela kortet automatiskt. Ladda ner det istället.');
    }
  } finally {
    if (refs.shareCardNative) {
      refs.shareCardNative.disabled = false;
      refs.shareCardNative.textContent = 'Dela kort';
    }
  }
}

function closeShareCardModal() {
  if (refs.shareCardModal) refs.shareCardModal.hidden = true;
  if (refs.shareCardPreview) refs.shareCardPreview.removeAttribute('src');
  if (refs.shareCardNative) refs.shareCardNative.hidden = true;
  state.shareCardCurrent = null;
  revokeShareCardObjectUrl();
  document.body.classList.remove('has-modal-open');
}

function revokeShareCardObjectUrl(url = state.shareCardObjectUrl) {
  if (url) URL.revokeObjectURL(url);
  if (url === state.shareCardObjectUrl) state.shareCardObjectUrl = '';
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function slugify(value) {
  return String(value || 'fjäril')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'fjaril';
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function renderSyncChip(entry) {
  // Cloud backup should feel automatic, not like a visible technical mode.
  // Only show a small marker when something needs attention.
  if (entry.syncStatus === 'error') return '<span class="sync-chip is-error">sparad lokalt</span>';
  return '';
}

async function deleteObservation(id) {
  const entry = state.collection.find((item) => item.id === id);
  if (!entry) return;

  const confirmed = window.confirm(`Vill du ta bort "${entry.butterflyName || 'Okänd fjäril'}" från samlingen?`);
  if (!confirmed) return;

  state.collection = state.collection.filter((item) => item.id !== id);
  await saveCollection();
  renderCollection();
  showToast('Togs bort från samlingen.');

  if (entry?.remoteId && state.auth) {
    deleteRemoteObservation(entry).catch((error) => console.warn('Kunde inte ta bort fjärrpost.', error));
  }
}

async function clearCollection() {
  if (!state.collection.length) {
    showToast('Samlingen är redan tom.');
    return;
  }

  const confirmed = window.confirm('Vill du ta bort alla sparade fjärilar från den här webbläsaren?');
  if (!confirmed) return;

  const remoteEntries = state.collection.filter((entry) => entry.remoteId);
  state.collection = [];
  await saveCollection();
  renderCollection();
  showToast('Samlingen tömdes.');

  if (state.auth) {
    remoteEntries.forEach((entry) => deleteRemoteObservation(entry).catch((error) => console.warn(error)));
  }
}

function exportCollection() {
  if (!state.collection.length && !state.customButterflies.length) {
    showToast('Det finns inget att exportera ännu.');
    return;
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Annies fjärilar',
    observations: state.collection,
    customSpecies: state.customButterflies,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `annies-fjarilar-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importCollection(event) {
  const [file] = Array.from(event.target.files || []);
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const observations = Array.isArray(payload.observations) ? payload.observations : [];
    const customSpecies = Array.isArray(payload.customSpecies) ? payload.customSpecies : [];
    state.collection = mergeById(state.collection, observations);
    state.customButterflies = mergeById(state.customButterflies, customSpecies);
    await saveCollection();
    await saveCustomSpecies();
    renderEverything();
    showToast('Import klar.');
    if (state.auth) syncAll({ silent: true });
  } catch (error) {
    console.error(error);
    showToast('Kunde inte importera filen. Kontrollera att det är en export från appen.');
  } finally {
    refs.importFile.value = '';
  }
}

function resetCollectionForm() {
  state.editingObservationId = '';
  setCollectionFormMode('add');
  resetPendingImage();
  refs.photoInput.value = '';
  refs.note.value = '';
  if (refs.collectionStory) refs.collectionStory.value = '';
  refs.speciesSelect.value = '';
  state.pendingLocation = null;
  renderPendingLocationState();
  setToday();
  updateAddButtonState();
}

function resetPendingImage() {
  state.pendingImageData = '';
  state.pendingFileName = '';
  state.pendingMimeType = '';
  refs.previewImage.removeAttribute('src');
  refs.previewImage.hidden = true;
  refs.previewPlaceholder.hidden = false;
  refs.storageHint.textContent = storageCopy();
}

async function loadCollection() {
  try {
    if (supportsIndexedDb()) {
      state.collection = sortByCreatedAt(await idbGetAll(COLLECTION_STORE));
      await migrateLegacyArray(COLLECTION_KEY, COLLECTION_STORE, 'collection');
      normalizeLocalState();
      return;
    }

    state.collection = readLegacyArray(COLLECTION_KEY);
    normalizeLocalState();
  } catch (error) {
    console.warn('Kunde inte läsa samlingen från lokal lagring.', error);
    state.collection = readLegacyArray(COLLECTION_KEY);
    normalizeLocalState();
  }
}

async function saveCollection() {
  try {
    if (supportsIndexedDb()) {
      await idbReplaceAll(COLLECTION_STORE, state.collection);
      updateStorageHint();
      return;
    }

    localStorage.setItem(COLLECTION_KEY, JSON.stringify(state.collection));
  } catch (error) {
    console.error(error);
    showToast('Kunde inte spara bilden. Den lokala lagringen kan vara full. Exportera gärna en backup.');
  }
}

async function loadCustomSpecies() {
  try {
    if (supportsIndexedDb()) {
      state.customButterflies = sortByCreatedAt(await idbGetAll(CUSTOM_SPECIES_STORE));
      await migrateLegacyArray(CUSTOM_SPECIES_KEY, CUSTOM_SPECIES_STORE, 'customButterflies');
      normalizeLocalState();
      return;
    }

    state.customButterflies = readLegacyArray(CUSTOM_SPECIES_KEY);
    normalizeLocalState();
  } catch (error) {
    console.warn('Kunde inte läsa egna fjärilar från lokal lagring.', error);
    state.customButterflies = readLegacyArray(CUSTOM_SPECIES_KEY);
    normalizeLocalState();
  }
}

async function saveCustomSpecies() {
  try {
    if (supportsIndexedDb()) {
      await idbReplaceAll(CUSTOM_SPECIES_STORE, state.customButterflies);
      updateStorageHint();
      return;
    }

    localStorage.setItem(CUSTOM_SPECIES_KEY, JSON.stringify(state.customButterflies));
  } catch (error) {
    console.error(error);
    showToast('Kunde inte spara egen fjäril. Den lokala lagringen kan vara full. Exportera gärna en backup.');
  }
}

function normalizeLocalState() {
  state.collection = state.collection.map((entry) => {
    const { tags, ...rest } = entry || {};
    return {
      syncStatus: 'local',
      syncError: '',
      remoteId: null,
      imagePath: null,
      imageMimeType: rest.imageMimeType || dataUrlMimeType(rest.imageData || '') || 'image/jpeg',
      ...rest,
      story: String(rest.story || '').trim(),
      location: normalizeLocation(rest.location),
    };
  });

  state.customButterflies = state.customButterflies.map((entry) => ({
    syncStatus: 'local',
    syncError: '',
    remoteId: null,
    custom: true,
    ...entry,
  }));
}

function supportsIndexedDb() {
  return Boolean(window.indexedDB);
}

function openAppDb() {
  if (!supportsIndexedDb()) return Promise.reject(new Error('IndexedDB stöds inte i den här webbläsaren.'));
  if (appDbPromise) return appDbPromise;

  appDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(COLLECTION_STORE)) {
        db.createObjectStore(COLLECTION_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CUSTOM_SPECIES_STORE)) {
        db.createObjectStore(CUSTOM_SPECIES_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Kunde inte öppna lokal databas.'));
  });

  return appDbPromise;
}

async function idbGetAll(storeName) {
  const db = await openAppDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => reject(request.error || new Error(`Kunde inte läsa ${storeName}.`));
  });
}

async function idbReplaceAll(storeName, items) {
  const db = await openAppDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    items.forEach((item) => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error(`Kunde inte spara ${storeName}.`));
    tx.onabort = () => reject(tx.error || new Error(`Sparningen avbröts för ${storeName}.`));
  });
}

function readLegacyArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function migrateLegacyArray(key, storeName, stateKey) {
  const legacyItems = readLegacyArray(key);
  if (!legacyItems.length) return;

  const currentItems = Array.isArray(state[stateKey]) ? state[stateKey] : [];
  const byId = new Map(currentItems.map((item) => [String(item.id), item]));
  let changed = false;

  legacyItems.forEach((item) => {
    if (!item?.id) return;
    const id = String(item.id);
    if (!byId.has(id)) {
      byId.set(id, item);
      changed = true;
    }
  });

  if (!changed) return;
  state[stateKey] = sortByCreatedAt(Array.from(byId.values()));
  await idbReplaceAll(storeName, state[stateKey]);
}

function sortByCreatedAt(items) {
  return [...items].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

async function updateStorageHint() {
  if (!refs.storageHint) return;
  if (!navigator.storage?.estimate) {
    refs.storageHint.textContent = storageCopy();
    return;
  }
  try {
    const estimate = await navigator.storage.estimate();
    if (!estimate.usage || !estimate.quota) {
      refs.storageHint.textContent = storageCopy();
      return;
    }
    const used = Math.round(estimate.usage / 1024 / 1024);
    const quota = Math.round(estimate.quota / 1024 / 1024);
    refs.storageHint.textContent = `${storageCopy()} Lokal cache: ungefär ${used} MB av ${quota} MB.`;
  } catch {
    refs.storageHint.textContent = storageCopy();
  }
}

function storageCopy() {
  if (!SUPABASE_ENABLED) return 'Sparas lokalt på den här enheten.';
  if (!state.auth) return 'Sparas lokalt på den här enheten.';
  return 'Sparat direkt. Backup sker automatiskt när internet finns.';
}

function findButterfly(id) {
  return getButterflies().find((butterfly) => String(butterfly.id) === String(id));
}

function formatDate(value) {
  if (!value) return 'okänt datum';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

async function compressImage(file, { maxSide = 2000, maxBytes = 1024 * 1024 } = {}) {
  const imageBitmap = await loadImageBitmap(file);
  const mimeCandidates = ['image/webp', 'image/jpeg'];
  const qualityCandidates = [0.86, 0.8, 0.74, 0.68, 0.62];
  const sideCandidates = [maxSide, 1800, 1600, 1400, 1200, 1000].filter((side, index, arr) => side <= maxSide && arr.indexOf(side) === index);
  let best = null;

  try {
    for (const side of sideCandidates) {
      const canvas = drawToCanvas(imageBitmap, side);
      for (const mimeType of mimeCandidates) {
        for (const quality of qualityCandidates) {
          const blob = await canvasToBlob(canvas, mimeType, quality);
          if (!blob) continue;
          best = !best || blob.size < best.blob.size ? { blob, mimeType } : best;
          if (blob.size <= maxBytes) {
            return { blob, mimeType, dataUrl: await blobToDataUrl(blob) };
          }
        }
      }
    }

    if (best) {
      return { blob: best.blob, mimeType: best.mimeType, dataUrl: await blobToDataUrl(best.blob) };
    }
  } finally {
    if (typeof imageBitmap.close === 'function') imageBitmap.close();
  }

  throw new Error('Bilden kunde inte komprimeras.');
}

function drawToCanvas(imageBitmap, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(imageBitmap.width, imageBitmap.height));
  const width = Math.max(1, Math.round(imageBitmap.width * scale));
  const height = Math.max(1, Math.round(imageBitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#f8f2e5';
  context.fillRect(0, 0, width, height);
  context.drawImage(imageBitmap, 0, 0, width, height);
  return canvas;
}


function loadImageBitmap(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file, { imageOrientation: 'from-image' });

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Kunde inte läsa bilden.'));
    };
    image.src = objectUrl;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Kunde inte läsa blob.'));
    reader.readAsDataURL(blob);
  });
}

function isDataUrl(value = '') {
  return /^data:image\//i.test(String(value));
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = String(dataUrl).split(',');
  const mime = dataUrlMimeType(dataUrl) || 'image/jpeg';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

function dataUrlMimeType(dataUrl = '') {
  const match = String(dataUrl).match(/^data:([^;]+);base64,/);
  return match?.[1] || '';
}

function extensionForMime(mimeType = '') {
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('png')) return 'png';
  return 'jpg';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} byte`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function restoreSession() {
  if (!SUPABASE_ENABLED) return;
  const saved = readAuthSession();
  if (!saved?.access_token || !saved?.refresh_token) return;
  state.auth = saved;

  if (isSessionExpiring(saved)) {
    try {
      state.auth = await refreshSession(saved.refresh_token);
      saveAuthSession(state.auth);
    } catch (error) {
      console.warn('Kunde inte förnya session.', error);
      state.auth = null;
      localStorage.removeItem(AUTH_KEY);
    }
  }
}

function readAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveAuthSession(session) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

function isSessionExpiring(session) {
  const expiresAt = Number(session.expires_at || 0);
  return !expiresAt || Date.now() > expiresAt - 60_000;
}

async function signInFromForm() {
  if (!SUPABASE_ENABLED) {
    showToast('Supabase är inte konfigurerat.');
    return;
  }

  const email = refs.loginEmail.value.trim();
  const password = refs.loginPassword.value;
  refs.loginButton.disabled = true;
  refs.loginButton.textContent = 'Loggar in…';
  refs.cloudStatus.textContent = 'Loggar in…';

  try {
    const session = await signIn(email, password);
    state.auth = session;
    saveAuthSession(session);
    refs.authForm.reset();
    renderCloudPanel();
    await loadCloudData();
    await syncAll({ silent: false });
    renderEverything();
    showToast('Inloggad. Samlingen synkas.');
  } catch (error) {
    console.error(error);
    refs.cloudStatus.textContent = 'Inloggningen misslyckades.';
    showToast('Kunde inte logga in. Kontrollera e-post och lösenord.');
  } finally {
    refs.loginButton.disabled = false;
    refs.loginButton.textContent = 'Logga in';
  }
}

async function signIn(email, password) {
  const response = await supabaseFetch('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, { auth: false });
  return normalizeSession(response);
}

async function refreshSession(refreshToken) {
  const response = await supabaseFetch('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  }, { auth: false });
  return normalizeSession(response);
}

function normalizeSession(response) {
  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    expires_at: Date.now() + Number(response.expires_in || 3600) * 1000,
    user: response.user || null,
  };
}

function renderCloudPanel() {
  if (!refs.cloudPanel) return;

  if (!SUPABASE_ENABLED) {
    refs.cloudPanel.hidden = true;
    refs.authForm.hidden = true;
    refs.syncNow.hidden = true;
    refs.logoutButton.hidden = true;
    return;
  }

  if (!state.auth) {
    refs.cloudPanel.hidden = false;
    refs.authForm.hidden = false;
    refs.syncNow.hidden = true;
    refs.logoutButton.hidden = true;
    refs.cloudTitle.textContent = 'Logga in';
    refs.cloudStatus.textContent = 'Logga in en gång för automatisk backup av samlingen.';
    return;
  }

  // När användaren är inloggad sker backup/synk automatiskt i bakgrunden.
  refs.cloudPanel.hidden = true;
  refs.authForm.hidden = true;
  refs.syncNow.hidden = true;
  refs.logoutButton.hidden = true;
}

function countPendingItems() {
  const observations = state.collection.filter((entry) => entry.syncStatus !== 'synced').length;
  const customs = state.customButterflies.filter((entry) => entry.syncStatus !== 'synced').length;
  return observations + customs;
}

async function ensureFreshSession() {
  if (!state.auth) throw new Error('Inte inloggad.');
  if (!isSessionExpiring(state.auth)) return state.auth;
  state.auth = await refreshSession(state.auth.refresh_token);
  saveAuthSession(state.auth);
  return state.auth;
}

async function loadCloudData() {
  if (!state.auth) return;
  try {
    await ensureFreshSession();
    await loadCatalogButterflies();

    const [remoteCustom, remoteSightings] = await Promise.all([
      restSelect('/rest/v1/custom_butterflies?select=*&order=created_at.desc').catch((error) => {
        console.warn('Kunde inte läsa legacy-tabellen custom_butterflies.', error);
        return [];
      }),
      restSelect('/rest/v1/sightings?select=*&order=created_at.desc'),
    ]);

    if (!state.butterfliesTableAvailable) {
      mergeRemoteCustomButterflies(Array.isArray(remoteCustom) ? remoteCustom : []);
    }
    mergeRemoteSightings(Array.isArray(remoteSightings) ? remoteSightings : []);
    await saveCustomSpecies();
    await saveCollection();
  } catch (error) {
    console.warn('Kunde inte läsa molndata.', error);
    showToast('Kunde inte läsa molnsamlingen just nu. Lokala data finns kvar.');
  }
}

async function loadCatalogButterflies() {
  if (!state.auth) return;
  try {
    let rows = await fetchCatalogButterflies();
    state.butterfliesTableAvailable = true;

    if (Array.isArray(rows) && !rows.length && state.baseButterflies.length) {
      await seedCatalogFromJson();
      rows = await fetchCatalogButterflies();
    }

    mergeCatalogButterflies(Array.isArray(rows) ? rows : []);
  } catch (error) {
    state.butterfliesTableAvailable = false;
    console.warn('Kunde inte läsa public.butterflies. Fallback till lokal JSON/legacy-tabell används.', error);
  }
}

async function fetchCatalogButterflies() {
  return restSelect(`/rest/v1/butterflies?select=*&app_id=eq.${encodeURIComponent(APP_ID)}&order=sort_order.asc,id.asc`);
}

async function seedCatalogFromJson() {
  const rows = state.baseButterflies.map((butterfly, index) => butterflyToCatalogRow({
    ...butterfly,
    custom: false,
    sortOrder: Number.isFinite(Number(butterfly.sortOrder)) ? Number(butterfly.sortOrder) : index + 1,
  }));
  if (rows.length) await restUpsert('/rest/v1/butterflies?on_conflict=id', rows);
}

function mergeCatalogButterflies(rows) {
  const base = [];
  const custom = [];

  rows.forEach((row) => {
    const butterfly = catalogRowToButterfly(row);
    if (!butterfly.id || butterfly.deletedAt) return;
    if (butterfly.custom) custom.push(butterfly);
    else base.push(butterfly);
  });

  if (base.length) {
    state.baseButterflies = sortCatalogButterflies(base);
  }

  if (custom.length) {
    const byId = new Map(state.customButterflies.map((item) => [String(item.id), item]));
    custom.forEach((item) => byId.set(String(item.id), { ...(byId.get(String(item.id)) || {}), ...item, custom: true }));
    state.customButterflies = sortByCreatedAt(Array.from(byId.values()));
  }
}

async function saveCatalogButterfly(butterfly) {
  if (!state.auth) throw new Error('Inte inloggad.');
  if (!state.butterfliesTableAvailable) await loadCatalogButterflies();
  if (!state.butterfliesTableAvailable) throw new Error('Fjärilskatalogen saknas i Supabase.');

  const prepared = await prepareCatalogImages(butterfly);
  const rows = await restUpsert('/rest/v1/butterflies?on_conflict=id', butterflyToCatalogRow({ ...butterfly, images: prepared }));
  const row = Array.isArray(rows) ? rows[0] : rows;
  return row ? catalogRowToButterfly(row) : butterfly;
}

async function softDeleteCatalogButterfly(butterfly) {
  if (!state.auth) return;
  if (!state.butterfliesTableAvailable) await loadCatalogButterflies();
  if (!state.butterfliesTableAvailable) return;
  await restUpsert('/rest/v1/butterflies?on_conflict=id', butterflyToCatalogRow(butterfly, { deletedAt: new Date().toISOString() }));
}

async function prepareCatalogImages(butterfly) {
  const folder = butterfly.custom ? 'custom-butterflies' : 'butterflies';
  const images = normalizeButterflyImages(butterfly.images);
  const prepared = [];

  for (const image of images) {
    if (image.path) {
      prepared.push({ ...image, url: isDataUrl(image.url) ? '' : image.url || '', imagePath: image.path });
      continue;
    }
    if (image.url && isDataUrl(image.url)) {
      const path = await uploadDataUrlToStorage(image.url, `${state.auth.user.id}/${folder}/${safeUuid()}`);
      prepared.push({ ...image, url: '', path, imagePath: path, author: image.author || 'Egen bild', license: image.license || 'Privat' });
      continue;
    }
    prepared.push(image);
  }

  return prepared.filter((image) => image.url || image.path || image.imagePath);
}

async function syncButterflyCatalogChanges() {
  if (!state.auth) return;
  if (!state.butterfliesTableAvailable) await loadCatalogButterflies();
  if (!state.butterfliesTableAvailable) return;

  const syncedEditIds = [];
  for (const [id, edit] of Object.entries(state.butterflyEdits)) {
    const base = state.baseButterflies.find((butterfly) => String(butterfly.id) === String(id));
    if (!base) continue;
    const saved = await saveCatalogButterfly({ ...base, ...edit, custom: false });
    const index = state.baseButterflies.findIndex((butterfly) => String(butterfly.id) === String(id));
    if (index >= 0) state.baseButterflies[index] = { ...state.baseButterflies[index], ...saved, custom: false };
    syncedEditIds.push(String(id));
  }

  const syncedDeleteIds = [];
  for (const id of state.deletedButterflyIds) {
    const butterfly = state.baseButterflies.find((item) => String(item.id) === String(id));
    if (!butterfly) continue;
    const deletedAt = new Date().toISOString();
    butterfly.deletedAt = deletedAt;
    await softDeleteCatalogButterfly({ ...butterfly, deletedAt });
    syncedDeleteIds.push(String(id));
  }

  syncedEditIds.forEach((id) => delete state.butterflyEdits[id]);
  state.deletedButterflyIds = state.deletedButterflyIds.filter((id) => !syncedDeleteIds.includes(String(id)));
  if (syncedEditIds.length || syncedDeleteIds.length) saveButterflyLocalEdits();
}

function mergeRemoteCustomButterflies(rows) {
  const byRemoteId = new Map(state.customButterflies.filter((item) => item.remoteId).map((item) => [String(item.remoteId), item]));
  const byAppId = new Map(state.customButterflies.map((item) => [String(item.id), item]));

  rows.forEach((row) => {
    const appId = row.app_id || `egen-${row.id}`;
    const existing = byRemoteId.get(String(row.id)) || byAppId.get(String(appId));
    const merged = {
      ...(existing || {}),
      id: existing?.id || appId,
      remoteId: row.id,
      custom: true,
      svenskt_namn: row.swedish_name,
      vetenskapligt_namn: row.scientific_name,
      beskrivning: row.description,
      bildkategori_commons_url: '',
      taggar: Array.isArray(existing?.taggar) ? existing.taggar : [],
      images: [
        { url: existing?.images?.[0]?.url || '', path: row.image_1_path, author: 'Egen bild', license: 'Privat' },
        row.image_2_path ? { url: existing?.images?.[1]?.url || '', path: row.image_2_path, author: 'Egen bild', license: 'Privat' } : null,
      ].filter(Boolean),
      createdAt: row.created_at || existing?.createdAt || new Date().toISOString(),
      syncStatus: 'synced',
      syncError: '',
    };

    if (existing) Object.assign(existing, merged);
    else state.customButterflies.push(merged);
  });

  state.customButterflies = sortByCreatedAt(dedupeById(state.customButterflies));
}

function mergeRemoteSightings(rows) {
  const byRemoteId = new Map(state.collection.filter((item) => item.remoteId).map((item) => [String(item.remoteId), item]));

  rows.forEach((row) => {
    const butterfly = findButterfly(row.butterfly_id) || {};
    const existing = byRemoteId.get(String(row.id));
    const merged = {
      ...(existing || {}),
      id: existing?.id || `remote-${row.id}`,
      remoteId: row.id,
      butterflyId: row.butterfly_id,
      butterflyName: existing?.butterflyName || butterfly.svenskt_namn || 'Okänd fjäril',
      scientificName: existing?.scientificName || butterfly.vetenskapligt_namn || '',
      imageData: existing?.imageData || '',
      imageMimeType: existing?.imageMimeType || 'image/webp',
      imagePath: row.image_path,
      originalFileName: existing?.originalFileName || '',
      note: row.note || '',
      story: row.story || existing?.story || '',
      date: row.spotted_at || row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      location: normalizeLocation(row.location || existing?.location),
      createdAt: row.created_at || existing?.createdAt || new Date().toISOString(),
      customSpecies: Boolean(butterfly.custom),
      syncStatus: 'synced',
      syncError: '',
    };

    if (existing) Object.assign(existing, merged);
    else state.collection.push(merged);
  });

  state.collection = sortByCreatedAt(dedupeByRemoteOrId(state.collection));
}

async function syncAll({ silent = false } = {}) {
  if (!SUPABASE_ENABLED || !state.auth || state.syncBusy) return;
  if (!navigator.onLine) {
    if (!silent) showToast('Du verkar vara offline. Synk sker när nätet är tillbaka.');
    return;
  }

  state.syncBusy = true;
  renderCloudPanel();

  try {
    await ensureFreshSession();
    await syncButterflyCatalogChanges();

    for (const item of state.customButterflies) {
      if (item.syncStatus !== 'synced') await syncCustomButterfly(item);
    }
    await saveCustomSpecies();
    renderButterflies();

    for (const item of state.collection) {
      if (item.syncStatus !== 'synced') await syncObservation(item);
    }
    await saveCollection();

    renderEverything();
    if (!silent) showToast('Synk klar.');
  } catch (error) {
    console.error(error);
    if (!silent) showToast('Synken stoppade. Nya saker ligger kvar lokalt.');
  } finally {
    state.syncBusy = false;
    renderCloudPanel();
  }
}

async function syncObservation(entry) {
  if (!entry.imageData && !entry.imagePath) {
    entry.syncStatus = 'error';
    entry.syncError = 'Saknar bilddata.';
    return;
  }

  entry.syncStatus = 'syncing';
  entry.syncError = '';
  renderCollection();

  try {
    let imagePath = entry.imagePath;
    if (!imagePath) {
      const blob = dataUrlToBlob(entry.imageData);
      const ext = extensionForMime(blob.type);
      imagePath = `${state.auth.user.id}/sightings/${safeUuid()}.${ext}`;
      await uploadStorageObject(imagePath, blob, blob.type || entry.imageMimeType || 'image/jpeg');
    }

    const story = String(entry.story || '').trim();
    const location = normalizeLocation(entry.location);
    const payload = {
      butterfly_id: entry.butterflyId,
      image_path: imagePath,
      note: entry.note || null,
      story: story || null,
      spotted_at: entry.date || new Date().toISOString().slice(0, 10),
      location: location || null,
    };

    const rows = entry.remoteId
      ? await restPatch(`/rest/v1/sightings?id=eq.${encodeURIComponent(entry.remoteId)}`, payload)
      : await restInsert('/rest/v1/sightings', payload);

    const row = Array.isArray(rows) ? rows[0] : rows;
    entry.remoteId = row?.id || entry.remoteId;
    entry.imagePath = imagePath;
    entry.syncStatus = 'synced';
    entry.syncError = '';
  } catch (error) {
    console.warn('Kunde inte synka samlingspost.', error);
    entry.syncStatus = 'error';
    entry.syncError = readableError(error);
  }
}

async function syncCustomButterfly(item) {
  item.syncStatus = 'syncing';
  item.syncError = '';
  renderButterflies();

  try {
    const images = item.images || [];
    if (!images[0]?.url && !images[0]?.path) throw new Error('Saknar obligatorisk bild.');

    if (state.butterfliesTableAvailable) {
      const saved = await saveCatalogButterfly({ ...item, custom: true });
      Object.assign(item, saved, { custom: true, syncStatus: 'synced', syncError: '' });
      return;
    }

    const image1Path = images[0].path || (isDataUrl(images[0].url) ? await uploadDataUrlToStorage(images[0].url, `${state.auth.user.id}/custom-butterflies/${safeUuid()}`) : null);
    const image2Path = images[1]?.path || (isDataUrl(images[1]?.url) ? await uploadDataUrlToStorage(images[1].url, `${state.auth.user.id}/custom-butterflies/${safeUuid()}`) : null);
    if (!image1Path) throw new Error('Egen fjäril behöver en lokal bild för molnsynk.');

    const payload = {
      app_id: item.id,
      swedish_name: item.svenskt_namn,
      scientific_name: item.vetenskapligt_namn,
      description: item.beskrivning,
      image_1_path: image1Path,
      image_2_path: image2Path,
    };

    const rows = item.remoteId
      ? await restPatch(`/rest/v1/custom_butterflies?id=eq.${encodeURIComponent(item.remoteId)}`, payload)
      : await restInsert('/rest/v1/custom_butterflies', payload);

    const row = Array.isArray(rows) ? rows[0] : rows;
    item.remoteId = row?.id || item.remoteId;
    item.images[0].path = image1Path;
    if (image2Path && item.images[1]) item.images[1].path = image2Path;
    item.syncStatus = 'synced';
    item.syncError = '';
  } catch (error) {
    console.warn('Kunde inte synka egen fjäril.', error);
    item.syncStatus = 'error';
    item.syncError = readableError(error);
  }
}

async function uploadDataUrlToStorage(dataUrl, pathWithoutExt) {
  const blob = dataUrlToBlob(dataUrl);
  const ext = extensionForMime(blob.type);
  const path = `${pathWithoutExt}.${ext}`;
  await uploadStorageObject(path, blob, blob.type || 'image/jpeg');
  return path;
}

async function uploadStorageObject(path, blob, contentType) {
  await ensureFreshSession();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${encodedPath}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${state.auth.access_token}`,
      'Content-Type': contentType,
      'x-upsert': 'false',
    },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function hydrateCloudImages() {
  if (!state.auth) return;
  const images = Array.from(document.querySelectorAll('img[data-cloud-image]'));
  await Promise.all(images.map(async (image) => {
    const path = image.dataset.cloudImage;
    if (!path) return;
    try {
      const url = await getCloudImageUrl(path);
      image.src = url;
      image.removeAttribute('data-cloud-image');
    } catch (error) {
      console.warn('Kunde inte hämta bild.', error);
    }
  }));
}

async function getCloudImageUrl(path) {
  if (state.cloudImageUrls.has(path)) return state.cloudImageUrls.get(path);
  await ensureFreshSession();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/authenticated/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${encodedPath}`, {
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${state.auth.access_token}`,
    },
  });

  if (!response.ok) throw new Error(await response.text());
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  state.cloudImageUrls.set(path, objectUrl);
  return objectUrl;
}

async function deleteRemoteObservation(entry) {
  if (!entry.remoteId) return;
  await restDelete(`/rest/v1/sightings?id=eq.${encodeURIComponent(entry.remoteId)}`);
  if (entry.imagePath) {
    await deleteStorageObjects([entry.imagePath]).catch((error) => console.warn('Kunde inte radera bildobjekt.', error));
  }
}


async function deleteRemoteCustomButterfly(item) {
  if (!item.remoteId) return;
  await restDelete(`/rest/v1/custom_butterflies?id=eq.${encodeURIComponent(item.remoteId)}`);
  const paths = (item.images || []).map((image) => image?.path).filter(Boolean);
  if (paths.length) {
    await deleteStorageObjects(paths).catch((error) => console.warn('Kunde inte radera fjärilsbilder.', error));
  }
}

async function deleteStorageObjects(paths) {
  if (!paths.length) return;
  await ensureFreshSession();
  const response = await fetch(`${SUPABASE_CONFIG.url}/storage/v1/object/${encodeURIComponent(SUPABASE_CONFIG.bucket)}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${state.auth.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!response.ok) throw new Error(await response.text());
}

async function restSelect(path) {
  return supabaseFetch(path, { method: 'GET' });
}

async function restInsert(path, body) {
  return supabaseFetch(path, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
}

async function restPatch(path, body) {
  return supabaseFetch(path, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
}

async function restUpsert(path, body) {
  return supabaseFetch(path, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(body),
  });
}

async function restDelete(path) {
  return supabaseFetch(path, { method: 'DELETE' });
}

async function supabaseFetch(path, options = {}, { auth = true } = {}) {
  const headers = {
    apikey: SUPABASE_CONFIG.publishableKey,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (auth) {
    await ensureFreshSession();
    headers.Authorization = `Bearer ${state.auth.access_token}`;
  }

  const response = await fetch(`${SUPABASE_CONFIG.url}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? tryJson(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.error || text || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function tryJson(text) {
  try { return JSON.parse(text); } catch { return text; }
}

function readableError(error) {
  return error?.message || 'Okänt fel';
}

function safeRandomId(prefix) {
  return `${prefix}-${safeUuid()}`;
}

function safeUuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mergeById(current, incoming) {
  const map = new Map(current.map((item) => [String(item.id), item]));
  incoming.forEach((item) => {
    if (item?.id) map.set(String(item.id), { ...(map.get(String(item.id)) || {}), ...item });
  });
  return sortByCreatedAt(Array.from(map.values()));
}

function dedupeById(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    map.set(String(item.id), { ...(map.get(String(item.id)) || {}), ...item });
  });
  return Array.from(map.values());
}

function dedupeByRemoteOrId(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = item.remoteId ? `remote:${item.remoteId}` : `local:${item.id}`;
    map.set(key, { ...(map.get(key) || {}), ...item });
  });
  return Array.from(map.values());
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker kunde inte registreras.', error));
  });
}

window.addEventListener('online', () => {
  if (state.auth) syncAll({ silent: true });
});

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
