'use strict';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const navObserver = new IntersectionObserver(
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
  sectionLinks.forEach((_, section) => navObserver.observe(section));
}

// ============================================================================
// Header Scroll-Progress Bar & Subtle Hero Parallax
// ============================================================================
const scrollProgress = document.getElementById('scroll-progress');
const heroSection = document.getElementById('home');
let scrollTicking = false;

function updateScrollEffects() {
  scrollTicking = false;
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;

  if (scrollProgress) {
    const ratio = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
    scrollProgress.style.setProperty('--scroll-ratio', ratio.toFixed(4));
  }

  if (heroSection && !prefersReducedMotion && window.innerWidth > 700 && scrollTop < 700) {
    const offset = Math.min(36, Math.round(scrollTop * 0.07));
    heroSection.style.setProperty('--hero-parallax', `${offset}px`);
  }
}

window.addEventListener(
  'scroll',
  () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(updateScrollEffects);
    }
  },
  { passive: true }
);
updateScrollEffects();

// ============================================================================
// Music Player, Turntable, Peeking Vinyl Sleeve & Catalog Equalizer
// ============================================================================
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
const featureSleeve = document.getElementById('feature-sleeve');

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
        listenLink.innerHTML =
          '<span class="eq-bars" aria-hidden="true"><i></i><i></i><i></i></span> Selected';
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

  if (featureSleeve) {
    featureSleeve.classList.toggle('is-playing', trackId === '1827482453');
  }
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
// Interactive Pluckable Guitar-String Dividers
// ============================================================================
if (!prefersReducedMotion) {
  document.querySelectorAll('[data-guitar-string]').forEach(stringEl => {
    const paths = stringEl.querySelectorAll('path');
    if (paths.length === 0) return;

    let animId = 0;
    let pulledDisp = 0;
    let lastX = 500;

    function setCurve(cx, cy) {
      const d = `M0,16 Q${cx.toFixed(1)},${cy.toFixed(2)} 1000,16`;
      paths.forEach(p => p.setAttribute('d', d));
    }

    function pluck(x, initialDisp) {
      if (animId) cancelAnimationFrame(animId);
      let disp = initialDisp;
      let vel = 0;
      pulledDisp = 0;
      stringEl.classList.add('is-vibrating');

      function step() {
        const force = -0.45 * disp;
        vel = (vel + force) * 0.89;
        disp += vel;
        setCurve(x, 16 + disp);

        if (Math.abs(disp) > 0.12 || Math.abs(vel) > 0.12) {
          animId = requestAnimationFrame(step);
        } else {
          setCurve(500, 16);
          stringEl.classList.remove('is-vibrating');
          animId = 0;
        }
      }
      animId = requestAnimationFrame(step);
    }

    stringEl.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const rect = stringEl.getBoundingClientRect();
      if (!rect.width) return;
      lastX = Math.max(80, Math.min(920, ((event.clientX - rect.left) / rect.width) * 1000));
      const dy = event.clientY - (rect.top + rect.height / 2);

      if (Math.abs(dy) <= 13) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = 0;
        }
        pulledDisp = dy * 1.35;
        stringEl.classList.add('is-vibrating');
        setCurve(lastX, 16 + pulledDisp);
      } else if (Math.abs(pulledDisp) > 2) {
        pluck(lastX, pulledDisp);
      }
    });

    stringEl.addEventListener('pointerleave', () => {
      if (Math.abs(pulledDisp) > 1.5) {
        pluck(lastX, pulledDisp);
      } else if (!animId) {
        setCurve(500, 16);
        stringEl.classList.remove('is-vibrating');
      }
    });

    stringEl.addEventListener('pointerdown', event => {
      const rect = stringEl.getBoundingClientRect();
      if (!rect.width) return;
      const x = Math.max(80, Math.min(920, ((event.clientX - rect.left) / rect.width) * 1000));
      pluck(x, 13);
    });
  });
}

// ============================================================================
// Choreographed Scroll-Reveal Storytelling
// ============================================================================
if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js-motion');

  const staggerGroups = [
    { parent: '.song-list', children: '.song-row', step: 35, mod: 5 },
    { parent: '.video-grid', children: '.video', step: 80, mod: 2 },
    { parent: '.format-cards', children: 'article', step: 75, mod: 3 },
    { parent: '.venue-grid', children: ':scope > div', step: 75, mod: 3 },
    { parent: '.gallery-grid', children: '.gallery-item', step: 65, mod: 4 },
    { parent: '.press-photos', children: '.press-photo', step: 80, mod: 2 }
  ];

  const revealTargets = new Set();

  staggerGroups.forEach(({ parent, children, step, mod }) => {
    document.querySelectorAll(parent).forEach(group => {
      group.querySelectorAll(children).forEach((item, index) => {
        item.style.setProperty('--stagger', `${(index % mod) * step}ms`);
        revealTargets.add(item);
      });
    });
  });

  document
    .querySelectorAll(
      '[data-reveal], .section-head, .feature-sleeve-wrap, .upcoming, .about-image, .about-copy, .contact-grid > div, .press-facts'
    )
    .forEach(el => revealTargets.add(el));

  const viewportCutoff = window.innerHeight * 0.94;
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
  );

  revealTargets.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top > viewportCutoff) {
      el.classList.add('reveal-ready');
      revealObserver.observe(el);
    }
  });
}

// ============================================================================
// Tactile 3D Polaroid Hover Physics
// ============================================================================
if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      const rx = (-py * 7).toFixed(2);
      const ry = (px * 7).toFixed(2);
      card.style.setProperty('--rx', `${rx}deg`);
      card.style.setProperty('--ry', `${ry}deg`);
      card.classList.add('is-tilting');
    });

    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  });
}

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
      : 'Write your message to Reb here...';
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
// Gallery Lightbox with Smooth Crossfade & Keyboard Navigation
// ============================================================================
const lightbox = document.getElementById('photo-dialog');
const galleryButtons = Array.from(document.querySelectorAll('[data-photo]'));
let currentPhotoIndex = -1;
let lastPhotoButton = null;
let switchTimer = 0;

function renderLightboxPhoto(index, animate = false) {
  if (!lightbox || galleryButtons.length === 0) return;
  currentPhotoIndex = (index + galleryButtons.length) % galleryButtons.length;
  const button = galleryButtons[currentPhotoIndex];
  const img = document.getElementById('dialog-image');
  const title = document.getElementById('dialog-title');
  if (!img) return;

  const nextSrc = button.dataset.photo;
  const nextAlt = button.querySelector('img')?.alt || '';
  const nextTitle = button.querySelector('span')?.textContent || 'Performance photo';

  if (animate && !prefersReducedMotion) {
    clearTimeout(switchTimer);
    img.classList.add('is-switching');
    switchTimer = window.setTimeout(() => {
      img.onload = () => img.classList.remove('is-switching');
      img.src = nextSrc;
      img.alt = nextAlt;
      if (title) title.textContent = nextTitle;
      if (img.complete) img.classList.remove('is-switching');
    }, 130);
  } else {
    img.classList.remove('is-switching');
    img.src = nextSrc;
    img.alt = nextAlt;
    if (title) title.textContent = nextTitle;
  }
}

galleryButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    lastPhotoButton = button;
    renderLightboxPhoto(index, false);
    lightbox?.showModal();
  });
});

document.getElementById('prev-photo')?.addEventListener('click', () => {
  renderLightboxPhoto(currentPhotoIndex - 1, true);
});

document.getElementById('next-photo')?.addEventListener('click', () => {
  renderLightboxPhoto(currentPhotoIndex + 1, true);
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
    renderLightboxPhoto(currentPhotoIndex - 1, true);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    renderLightboxPhoto(currentPhotoIndex + 1, true);
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
    const range = document.createRange();
    range.selectNodeContents(shortBioText);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
});
