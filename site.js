'use strict';

// ============================================================================
// Mobile Navigation & Active Section Spy
// ============================================================================
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

function closeMenu() {
  if (!navigation || !menuButton) return;
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
}

menuButton?.addEventListener('click', () => {
  const open = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
});

navigation?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

document.addEventListener('click', event => {
  if (
    navigation?.classList.contains('is-open') &&
    !navigation.contains(event.target) &&
    !menuButton?.contains(event.target)
  ) {
    closeMenu();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation?.classList.contains('is-open')) {
    closeMenu();
    menuButton?.focus();
  }
});

const sectionLinks = new Map();
navigation?.querySelectorAll('a[href^="#"]').forEach(link => {
  const id = link.getAttribute('href').slice(1);
  const section = id ? document.getElementById(id) : null;
  if (section) sectionLinks.set(section, link);
});

if (sectionLinks.size > 0 && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          sectionLinks.forEach(navLink => navLink.removeAttribute('aria-current'));
          sectionLinks.get(entry.target)?.setAttribute('aria-current', 'location');
        }
      });
    },
    { rootMargin: '-25% 0px -60% 0px' }
  );
  sectionLinks.forEach((_, section) => observer.observe(section));
}

// ============================================================================
// Music Player & Catalog Coordination
// ============================================================================
// Keep one Bandcamp iframe alive when minimized. Only selecting a different song
// or explicitly stopping playback replaces its source.
const player = document.getElementById('music-player');
const frame = document.getElementById('bandcamp-player');
const playerBody = document.getElementById('player-body');
const playerTitle = document.getElementById('player-title');
const minimizeBtn = document.getElementById('player-minimize');
const stopBtn = document.getElementById('player-stop');
const prevBtn = document.getElementById('player-prev');
const nextBtn = document.getElementById('player-next');
const playerStatus = document.getElementById('player-status');
const heroRecord = document.getElementById('hero-record');
const heroTrack = document.getElementById('hero-track');
const recordCta = document.getElementById('record-cta');
const recordCtaIcon = document.getElementById('record-cta-icon');
const recordCtaText = document.getElementById('record-cta-text');

const catalogRows = Array.from(document.querySelectorAll('.song-row[data-song]'));
let selectedTrack = null;

function setExpanded(expanded) {
  if (!playerBody || !minimizeBtn) return;
  playerBody.hidden = !expanded;
  playerBody.inert = !expanded;
  minimizeBtn.setAttribute('aria-expanded', String(expanded));
  minimizeBtn.setAttribute(
    'aria-label',
    expanded
      ? 'Minimize music player'
      : selectedTrack
        ? 'Expand music player'
        : 'Load featured song in player'
  );
  minimizeBtn.textContent = expanded ? '−' : '+';
}

function updateCatalogSelection(trackId) {
  catalogRows.forEach(row => {
    const isCurrent = row.dataset.song === trackId;
    const listenLink = row.querySelector('.listen-link');
    const title = listenLink?.dataset.title || 'song';
    if (isCurrent) {
      row.setAttribute('aria-current', 'true');
      if (listenLink) {
        listenLink.innerHTML = '<span aria-hidden="true">♫</span> Selected';
        listenLink.setAttribute('aria-label', `${title} (currently selected in player)`);
      }
    } else {
      row.removeAttribute('aria-current');
      if (listenLink) {
        listenLink.innerHTML = '<span aria-hidden="true">▶</span> Listen';
        listenLink.setAttribute('aria-label', `Listen to ${title}`);
      }
    }
  });
}

function setRecordStatus(trackId) {
  if (!heroRecord || !heroTrack || !recordCta) return;
  if (trackId) heroTrack.value = trackId;
  const name = heroTrack.options[heroTrack.selectedIndex]?.text || 'selected song';
  const isLoaded = Boolean(trackId && trackId === heroTrack.value);
  heroRecord.classList.toggle('selected', isLoaded);
  heroRecord.setAttribute('aria-label', `Open song player for ${name}`);
  const statusMsg = isLoaded
    ? `${name} is loaded — press play in the player below.`
    : `Tap the record to load ${name}`;
  if (recordCtaText) {
    recordCtaText.textContent = statusMsg;
    if (recordCtaIcon) recordCtaIcon.textContent = isLoaded ? '♫' : '▶';
  } else {
    recordCta.textContent = statusMsg;
  }
}

function selectTrackById(trackId, options = { dock: true, focusPlayer: true }) {
  if (!player || !frame) return;
  const targetLink =
    document.querySelector(`#music .listen-link[data-track="${trackId}"]`) ||
    document.querySelector(`[data-track="${trackId}"]`);
  if (!targetLink) return;

  const title = targetLink.dataset.title || 'Selected song';
  const href = targetLink.getAttribute('href') || 'https://rebyen.bandcamp.com/';

  if (trackId !== selectedTrack) {
    frame.src = `https://bandcamp.com/EmbeddedPlayer/track=${encodeURIComponent(trackId)}/size=small/bgcol=fffaf1/linkcol=a8411a/transparent=true/`;
    selectedTrack = trackId;
  }

  frame.title = `${title} by Reb Yen — Bandcamp audio player`;
  if (playerTitle) playerTitle.textContent = title;
  if (stopBtn) stopBtn.hidden = false;

  if (options.dock) {
    player.classList.add('is-docked');
    document.body.classList.add('has-player');
  }
  setExpanded(true);
  updateCatalogSelection(trackId);

  const fallback = document.getElementById('player-fallback');
  if (fallback && href.startsWith('http')) fallback.href = href;

  if (playerStatus) {
    playerStatus.textContent = `${title} loaded. Press play in the Bandcamp player to listen.`;
  }
  setRecordStatus(trackId);

  if (options.focusPlayer) {
    player.focus({ preventScroll: true });
  }
}

function stepTrack(offset) {
  if (catalogRows.length === 0) return;
  const currentIndex = catalogRows.findIndex(row => row.dataset.song === selectedTrack);
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + offset + catalogRows.length) % catalogRows.length;
  const nextTrackId = catalogRows[nextIndex]?.dataset.song;
  if (nextTrackId) {
    selectTrackById(nextTrackId, { dock: true, focusPlayer: false });
  }
}

document.querySelectorAll('[data-track]').forEach(link => {
  if (link.tagName !== 'A') return;
  link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectTrackById(link.dataset.track, { dock: true, focusPlayer: true });
  });
});

minimizeBtn?.addEventListener('click', () => {
  if (!selectedTrack) {
    const defaultTrack = frame?.dataset.track || catalogRows[0]?.dataset.song;
    if (defaultTrack) selectTrackById(defaultTrack, { dock: false, focusPlayer: false });
    return;
  }
  setExpanded(playerBody.hidden);
});
prevBtn?.addEventListener('click', () => stepTrack(-1));
nextBtn?.addEventListener('click', () => stepTrack(1));

document.getElementById('player-return')?.addEventListener('click', () => {
  player?.classList.remove('is-docked');
  document.body.classList.remove('has-player');
  setExpanded(true);
});

stopBtn?.addEventListener('click', () => {
  if (frame) frame.src = 'about:blank';
  selectedTrack = null;
  if (stopBtn) stopBtn.hidden = true;
  player?.classList.remove('is-docked');
  document.body.classList.remove('has-player');
  if (playerTitle) playerTitle.textContent = 'Choose a song to listen';
  setExpanded(false);
  updateCatalogSelection(null);
  if (playerStatus) {
    playerStatus.textContent = 'Player closed. Choose any Listen button to load a song.';
  }
  setRecordStatus(null);
  document.querySelector('#music [data-track]')?.focus({ preventScroll: true });
});

heroRecord?.addEventListener('click', () => {
  if (heroTrack?.value) {
    selectTrackById(heroTrack.value, { dock: true, focusPlayer: true });
  }
});

heroTrack?.addEventListener('change', () => {
  if (heroTrack.value) {
    selectTrackById(heroTrack.value, { dock: true, focusPlayer: false });
  }
});

setExpanded(false);
setRecordStatus(null);

// ============================================================================
// Video Facades (Click-to-Load YouTube)
// ============================================================================
document.querySelectorAll('.video-poster[data-video-id]').forEach(button => {
  button.addEventListener('click', () => {
    const id = button.dataset.videoId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    const video = document.createElement('iframe');
    video.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    video.title = (button.getAttribute('aria-label') || 'Live performance video').replace(/^Play /, '');
    video.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    video.allowFullscreen = true;
    button.replaceWith(video);
    video.focus({ preventScroll: true });
  });
});

// ============================================================================
// Booking Format Quick-Select & Contact Form Adaptation
// ============================================================================
const topicSelect = document.getElementById('cf-topic');
const formatSelect = document.getElementById('cf-format');
const bookingDetailsRow = document.getElementById('booking-details-row');
const messageField = document.getElementById('cf-msg');

const bookingTopics = new Set(['Venue or club', 'Festival', 'Private event']);

function syncContactFormFields() {
  if (!topicSelect || !bookingDetailsRow) return;
  const isBooking = bookingTopics.has(topicSelect.value);
  bookingDetailsRow.hidden = !isBooking;
  bookingDetailsRow.inert = !isBooking;
  if (messageField) {
    messageField.placeholder = isBooking
      ? "For bookings, please include the date, venue/city, approximate set length, and whether you'd like solo, duo or band."
      : "Write your message to Reb here...";
  }
}

topicSelect?.addEventListener('change', syncContactFormFields);
syncContactFormFields();

document.querySelectorAll('[data-select-format]').forEach(link => {
  link.addEventListener('click', () => {
    const chosenFormat = link.dataset.selectFormat;
    if (topicSelect && !bookingTopics.has(topicSelect.value)) {
      topicSelect.value = 'Venue or club';
      syncContactFormFields();
    }
    if (formatSelect && chosenFormat) {
      formatSelect.value = chosenFormat;
    }
  });
});

// ============================================================================
// Gallery Lightbox with Previous / Next & Keyboard Navigation
// ============================================================================
const lightbox = document.getElementById('photo-dialog');
const galleryButtons = Array.from(document.querySelectorAll('[data-photo]'));
let currentPhotoIndex = -1;
let lastPhotoButton = null;

function renderLightboxPhoto(index) {
  if (!lightbox || galleryButtons.length === 0) return;
  currentPhotoIndex = (index + galleryButtons.length) % galleryButtons.length;
  const button = galleryButtons[currentPhotoIndex];
  const img = document.getElementById('dialog-image');
  const title = document.getElementById('dialog-title');
  if (img) {
    img.src = button.dataset.photo;
    img.alt = button.querySelector('img')?.alt || '';
  }
  if (title) {
    title.textContent = button.querySelector('span')?.textContent || 'Performance photo';
  }
}

galleryButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    lastPhotoButton = button;
    renderLightboxPhoto(index);
    lightbox?.showModal();
  });
});

document.getElementById('prev-photo')?.addEventListener('click', () => {
  renderLightboxPhoto(currentPhotoIndex - 1);
});

document.getElementById('next-photo')?.addEventListener('click', () => {
  renderLightboxPhoto(currentPhotoIndex + 1);
});

document.getElementById('close-photo')?.addEventListener('click', () => {
  lightbox?.close();
});

lightbox?.addEventListener('click', event => {
  if (event.target === lightbox) {
    const box = lightbox.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    ) {
      lightbox.close();
    }
  }
});

lightbox?.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    renderLightboxPhoto(currentPhotoIndex - 1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    renderLightboxPhoto(currentPhotoIndex + 1);
  }
});

lightbox?.addEventListener('close', () => {
  lastPhotoButton?.focus();
});

// ============================================================================
// Press Kit Actions (Print & Copy Short Bio)
// ============================================================================
document.getElementById('print-kit')?.addEventListener('click', () => window.print());

const copyBioBtn = document.getElementById('copy-bio');
const shortBioText = document.getElementById('short-bio-text');

copyBioBtn?.addEventListener('click', async () => {
  if (!shortBioText || !navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(shortBioText.textContent.trim());
    const originalLabel = copyBioBtn.textContent;
    copyBioBtn.textContent = 'Copied to clipboard ✓';
    setTimeout(() => {
      copyBioBtn.textContent = originalLabel;
    }, 2200);
  } catch {
    // Fallback: select text if clipboard API fails
    const range = document.createRange();
    range.selectNodeContents(shortBioText);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
});
