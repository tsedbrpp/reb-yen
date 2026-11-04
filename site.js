'use strict';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================================
// Dialog helpers — native <dialog> where supported (Safari 15.4+, all modern
// browsers), with a fixed-position overlay fallback for older iOS Safari.
// ============================================================================
const supportsDialog =
  typeof HTMLDialogElement === 'function' &&
  typeof HTMLDialogElement.prototype.showModal === 'function';
let dialogFallbackBackdrop = null;

function openDialog(dialog) {
  if (!dialog) return;
  document.body.classList.add('dialog-open');
  if (supportsDialog) {
    if (!dialog.open) dialog.showModal();
    return;
  }
  dialog.setAttribute('open', '');
  dialog.classList.add('is-fallback-open');
  if (!dialogFallbackBackdrop) {
    dialogFallbackBackdrop = document.createElement('div');
    dialogFallbackBackdrop.className = 'dialog-fallback-backdrop';
    dialogFallbackBackdrop.addEventListener('click', () => {
      closeDialog(document.querySelector('dialog.is-fallback-open'));
    });
    document.body.append(dialogFallbackBackdrop);
  }
  dialogFallbackBackdrop.hidden = false;
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (supportsDialog) {
    if (dialog.open) dialog.close();
    return;
  }
  if (!dialog.hasAttribute('open')) return;
  dialog.removeAttribute('open');
  dialog.classList.remove('is-fallback-open');
  if (dialogFallbackBackdrop) dialogFallbackBackdrop.hidden = true;
  dialog.dispatchEvent(new Event('close'));
}

document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !supportsDialog) {
    closeDialog(document.querySelector('dialog.is-fallback-open'));
  }
});

// ============================================================================
// Mobile Navigation & Active Section Spy
// ============================================================================
const siteHeader = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
let navBackdrop = null;

function syncMenuUI(open) {
  if (!navigation || !menuButton) return;
  navigation.classList.toggle('is-open', open);
  siteHeader?.classList.toggle('is-menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.innerHTML = open
    ? 'Close <span aria-hidden="true">✕</span>'
    : 'Menu <span aria-hidden="true">☰</span>';
  if (open && !navBackdrop) {
    navBackdrop = document.createElement('div');
    navBackdrop.className = 'nav-backdrop';
    navBackdrop.addEventListener('click', closeMenu);
    document.body.append(navBackdrop);
  }
  if (navBackdrop) {
    navBackdrop.hidden = !open;
  }
}

function closeMenu() {
  syncMenuUI(false);
}

menuButton?.addEventListener('click', () => {
  const open = !navigation?.classList.contains('is-open');
  syncMenuUI(open);
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

window.addEventListener(
  'resize',
  () => {
    if (window.innerWidth > 700 && navigation?.classList.contains('is-open')) {
      closeMenu();
    }
  },
  { passive: true }
);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (navigation?.classList.contains('is-open')) {
      closeMenu();
      menuButton?.focus();
      return;
    }
    document.querySelector('.video-section.is-cinema-mode')?.classList.remove('is-cinema-mode');
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
// Dynamic Jukebox Sleeve, Music Player, Turntable & Track Filters
// ============================================================================
const TRACK_META = {
  '33863436': {
    title: 'Take Me Crazy',
    vinyl: 'TAKE ME\nCRAZY',
    eyebrow: 'Featured original · ReverbNation Spotlight',
    desc: 'Reb calls it a realistic love song: candid, playful and about accepting one another as we are. Written, arranged and performed by Reb — live performance filmed in Nashville.',
    img: 'images/featured-reb-guitar.jpg',
    portrait: true,
    alt: 'Singer-songwriter Reb Yen with her acoustic guitar',
    caption: 'Reb Yen · Singer-songwriter',
    href: 'https://www.reverbnation.com/rebyen/song/33863436-take-me-crazy-original'
  },
  '33355990': {
    title: 'Should I?',
    vinyl: 'SHOULD\nI?',
    eyebrow: 'Original studio recording · ReverbNation Spotlight',
    desc: 'An original studio recording written, arranged and performed by Reb—one of three songs featured on the ReverbNation homepage.',
    img: 'images/hero-guitar.jpg',
    pos: '52% 30%',
    bright: true,
    alt: 'Reb Yen singing and playing acoustic guitar',
    caption: 'Reb Yen · Original studio recording',
    href: 'https://www.reverbnation.com/rebyen/song/33355990-should-i-original'
  },
  '33993499': {
    title: 'Gotta Let It Go',
    vinyl: 'GOTTA LET\nIT GO',
    eyebrow: 'Featured original · ReverbNation Spotlight',
    desc: 'Written and arranged by Reb about knowing when to let go and move forward—featured on the ReverbNation homepage.',
    img: 'images/gotta_let_it_go.jpg',
    alt: 'Reb Yen singing Gotta Let It Go with acoustic guitar',
    caption: 'Gotta Let It Go · from the lyric video',
    href: 'https://www.reverbnation.com/rebyen/song/33993499-gotta-let-go-by-reb-yen-original'
  },
  '32896520': {
    title: 'The Solitude',
    vinyl: 'THE\nSOLITUDE',
    eyebrow: 'Original song · Live recording',
    desc: 'Captured live on stage—an atmospheric original showcasing Reb’s acoustic guitar work and expressive storytelling.',
    img: 'images/solitude.jpg',
    alt: 'Reb Yen performing The Solitude live on acoustic guitar',
    caption: 'Performing The Solitude live at Roots Music Project',
    href: 'https://www.reverbnation.com/rebyen/song/32896520-the-solitude-original--live'
  },
  '33992872': {
    title: 'A New Beginning',
    vinyl: 'A NEW\nBEGINNING',
    eyebrow: 'Original song · Studio recording',
    desc: 'Written on loss, remembrance and beginning again—“Don’t call it the end; it’s a new beginning.”',
    img: 'images/newbeginning.jpg',
    alt: 'Reb Yen performing A New Beginning with guitar and harmonica',
    caption: 'A New Beginning · Live at The Copper Rocket',
    href: 'https://www.reverbnation.com/rebyen/song/33992872-a-new-beginning-original'
  },
  '33391779': {
    title: 'Are You Listening Now?',
    vinyl: 'ARE YOU\nLISTENING',
    eyebrow: 'Original song · Studio recording',
    desc: 'An original studio recording blending folk-rock urgency with Reb’s direct, observational songwriting.',
    img: 'images/are_you_listening.jpg',
    alt: 'Reb Yen performing on stage with her trio at The Alley',
    caption: 'Reb Yen performing with her trio at The Alley',
    href: 'https://www.reverbnation.com/rebyen/song/33391779-are-you-listening-now-original'
  },
  '33866102': {
    title: 'Birds Of Prey',
    vinyl: 'BIRDS OF\nPREY',
    eyebrow: 'Original song · Live recording',
    desc: 'Recorded live on stage, bringing raw room energy to Reb’s original songwriting and arrangement.',
    img: 'images/storm.jpg',
    alt: 'Reb Yen performing live with her band',
    caption: 'Live stage performance · Original catalog',
    href: 'https://www.reverbnation.com/rebyen/song/33866102-birds-of-prey-original--live'
  },
  '32896774': {
    title: 'Take A Stand',
    vinyl: 'TAKE A\nSTAND',
    eyebrow: 'Original song · Live recording',
    desc: 'A live original recording driven by conviction, acoustic rhythm and the immediacy of the stage.',
    img: 'images/are_you_listening.jpg',
    alt: 'Reb Yen singing and playing acoustic guitar on stage',
    caption: 'On stage · Original live recording',
    href: 'https://www.reverbnation.com/rebyen/song/32896774-take-a-stand-original--live'
  },
  '32557441': {
    title: 'Out Of Body',
    vinyl: 'OUT OF\nBODY',
    eyebrow: 'Original song · Studio recording',
    desc: 'An introspective studio original exploring perspective and reflection across Reb’s indie-folk palette.',
    img: 'images/reb_yen_photo.jpg',
    pos: '50% 38%',
    alt: 'Artistic portrait of Reb Yen with guitar fretboard',
    caption: 'Reb Yen · Studio original',
    href: 'https://www.reverbnation.com/rebyen/song/32557441-out-of-body--original'
  }
};

const player = document.getElementById('music-player');
const frame = document.getElementById('reverbnation-player');
const playerBody = document.getElementById('player-body');
const playerTitle = document.getElementById('player-title');
const minimizeBtn = document.getElementById('player-minimize');
const stopBtn = document.getElementById('player-stop');
const prevBtn = document.getElementById('player-prev');
const nextBtn = document.getElementById('player-next');
const playerStatus = document.getElementById('player-status');
const heroRecord = document.getElementById('hero-record');
const recordCta = document.getElementById('record-cta');
const recordCtaText = document.getElementById('record-cta-text');
const recordLabelTitle = document.getElementById('record-label-title');
const recordNowLabel = document.getElementById('record-now-label');
const recordNowTitle = document.getElementById('record-now-title');
const recordStopBtn = document.getElementById('record-stop-btn');
const songPicker = document.getElementById('song-picker');
const songPickerList = document.getElementById('song-picker-list');
const songPickerFoot = document.getElementById('song-picker-foot');

const featureSleeve = document.getElementById('feature-sleeve');
const sleeveVinylLabel = document.getElementById('sleeve-vinyl-label');
const featuredImg = document.getElementById('featured-img');
const featuredCaption = document.getElementById('featured-caption');
const featuredEyebrow = document.getElementById('featured-eyebrow');
const featuredHeading = document.getElementById('featured-heading');
const featuredDesc = document.getElementById('featured-desc');
const featuredListenBtn = document.getElementById('featured-listen-btn');
const featuredListenLabel = document.getElementById('featured-listen-label');
const featuredLyricsLink = document.getElementById('featured-lyrics-link');

const catalogRows = Array.from(document.querySelectorAll('.song-row[data-song]'));
let selectedTrack = null;
let sleeveSwapTimer = 0;

// iOS WebKit blocks cross-origin iframe autoplay even with allow="autoplay", so
// on iPhone/iPad a freshly loaded track stays "cued" until the visitor taps ▶
// inside the ReverbNation widget. Desktop & Android start playing automatically.
const requiresWidgetTap =
  /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let isCued = false;

function reverbnationEmbedUrl(trackId) {
  return `https://www.reverbnation.com/widget_code/html_widget/artist_6720947?widget_id=55&pwc[included_songs]=0&pwc[song_ids]=${encodeURIComponent(trackId)}&context_type=song&pwc[size]=small&pwc[autoplay]=1`;
}

function setCued(cued) {
  isCued = Boolean(cued && selectedTrack);
  player?.classList.toggle('is-cued', isCued);
  heroRecord?.classList.toggle('is-cued', isCued);
  featureSleeve?.classList.toggle('is-cued', isCued);
}

window.addEventListener('blur', () => {
  setTimeout(() => {
    if (isCued && frame && document.activeElement === frame) {
      setCued(false);
      setRecordStatus(selectedTrack);
      if (playerStatus) playerStatus.textContent = `Now playing ${playerTitle?.textContent || 'the song'}.`;
    }
  }, 0);
});

function updateJukeboxSleeve(trackId, isPlaying) {
  const effectiveId = trackId && TRACK_META[trackId] ? trackId : '33863436';
  const meta = TRACK_META[effectiveId];
  if (!meta) return;

  if (sleeveVinylLabel) sleeveVinylLabel.textContent = meta.vinyl;
  if (featuredEyebrow) featuredEyebrow.textContent = meta.eyebrow;
  if (featuredHeading) featuredHeading.textContent = meta.title;
  if (featuredDesc) featuredDesc.textContent = meta.desc;
  if (featuredCaption) featuredCaption.textContent = meta.caption;

  if (featuredListenBtn) {
    featuredListenBtn.href = meta.href;
    featuredListenBtn.dataset.track = effectiveId;
    featuredListenBtn.dataset.title = meta.title;
  }
  if (featuredListenLabel) {
    featuredListenLabel.textContent = isPlaying
      ? `${meta.title} loaded in player`
      : `Listen to ${meta.title}`;
  }
  if (featuredLyricsLink) {
    featuredLyricsLink.href = meta.href;
  }

  if (featuredImg && featuredImg.getAttribute('src') !== meta.img) {
    clearTimeout(sleeveSwapTimer);
    const applyImg = () => {
      featuredImg.onload = () => featuredImg.classList.remove('is-swapping');
      featuredImg.setAttribute('src', meta.img);
      featuredImg.alt = meta.alt;
      featuredImg.style.objectPosition = meta.pos || '50% 50%';
      featuredImg.classList.toggle('is-brightened', Boolean(meta.bright));
      featuredImg.classList.toggle('is-portrait', Boolean(meta.portrait));
      featureSleeve?.classList.toggle('is-portrait-sleeve', Boolean(meta.portrait));
      if (featuredImg.complete) featuredImg.classList.remove('is-swapping');
    };

    if (!prefersReducedMotion) {
      featuredImg.classList.add('is-swapping');
      sleeveSwapTimer = window.setTimeout(applyImg, 120);
    } else {
      applyImg();
    }
  } else if (featuredImg) {
    featuredImg.style.objectPosition = meta.pos || '50% 50%';
    featuredImg.classList.toggle('is-brightened', Boolean(meta.bright));
    featuredImg.classList.toggle('is-portrait', Boolean(meta.portrait));
    featureSleeve?.classList.toggle('is-portrait-sleeve', Boolean(meta.portrait));
  }

  featureSleeve?.classList.toggle('is-playing', Boolean(isPlaying));
}

function setExpanded(expanded) {
  if (!playerBody || !minimizeBtn) return;
  playerBody.hidden = !expanded;
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

  updateJukeboxSleeve(trackId, Boolean(trackId));
}

function setRecordStatus(trackId) {
  if (!heroRecord) return;
  const isLoaded = Boolean(trackId);
  const name = (trackId && TRACK_META[trackId]?.title) || 'this song';

  heroRecord.classList.toggle('selected', isLoaded);
  heroRecord.setAttribute(
    'aria-label',
    isLoaded ? `Change song — now playing ${name}` : 'Tap to pick a song'
  );
  if (recordLabelTitle) recordLabelTitle.textContent = isLoaded ? name : 'Tap to pick a song';

  if (recordNowLabel) {
    recordNowLabel.textContent = 'Now playing';
    recordNowLabel.hidden = !isLoaded;
  }
  if (recordNowTitle) {
    recordNowTitle.textContent = isLoaded ? name : 'Original songs';
    recordNowTitle.classList.toggle('is-idle', !isLoaded);
  }
  const browsePill = document.getElementById('record-browse-pill');
  if (browsePill) browsePill.textContent = isLoaded ? 'Change track ▾' : 'Choose track ▾';
  if (recordStopBtn) recordStopBtn.hidden = !isLoaded;

  const statusMsg = !isLoaded
    ? ''
    : isCued
      ? `Almost there — tap the big ▶ in the music player to start “${name}”`
      : `♫ Now playing “${name}” · tap to change songs`;
  if (recordCta) recordCta.hidden = !isLoaded;
  if (recordCtaText) recordCtaText.textContent = statusMsg;
  else if (recordCta) recordCta.textContent = statusMsg;

  renderSongPicker();
}

// ----------------------------------------------------------------------------
// Song picker pop-up (tap the vinyl → choose a song → it loads in the player)
// ----------------------------------------------------------------------------
function renderSongPicker() {
  if (!songPickerList) return;
  if (!songPickerList.childElementCount) {
    catalogRows.forEach(row => {
      const id = row.dataset.song;
      const meta = TRACK_META[id];
      if (!meta) return;
      const subtitle = row.querySelector('.song-info p')?.textContent.trim() || '';

      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'picker-song';
      btn.dataset.pick = id;

      const img = document.createElement('img');
      img.className = 'picker-thumb';
      img.src = meta.img;
      img.alt = '';
      img.width = 56;
      img.height = 56;
      if (meta.pos) img.style.objectPosition = meta.pos;

      const text = document.createElement('span');
      text.className = 'picker-text';
      const strong = document.createElement('strong');
      strong.textContent = meta.title;
      const small = document.createElement('small');
      small.textContent = subtitle;
      text.append(strong, small);

      const go = document.createElement('span');
      go.className = 'picker-go';
      go.setAttribute('aria-hidden', 'true');

      btn.append(img, text, go);
      li.append(btn);
      songPickerList.append(li);
    });
  }

  songPickerList.querySelectorAll('.picker-song').forEach(btn => {
    const current = btn.dataset.pick === selectedTrack;
    const title = TRACK_META[btn.dataset.pick]?.title || 'song';
    btn.toggleAttribute('aria-current', current);
    if (current) btn.setAttribute('aria-current', 'true');
    btn.setAttribute('aria-label', current ? `${title} (now playing)` : `Play ${title}`);
    const go = btn.querySelector('.picker-go');
    if (go) {
      go.innerHTML = current
        ? '<span class="eq-bars"><i></i><i></i><i></i></span> Playing'
        : '▶';
    }
  });
  const pickerStopBtn = document.getElementById('song-picker-stop');
  if (pickerStopBtn) pickerStopBtn.hidden = !selectedTrack;
}

function openSongPicker(event) {
  if (!songPicker) return;
  closeMenu();
  renderSongPicker();
  songPicker.hidden = false;
  document.body.classList.add('dialog-open');
  const openedByKeyboard = Boolean(event && event.type === 'click' && event.detail === 0);
  if (openedByKeyboard) {
    document.getElementById('song-picker-close')?.focus({ preventScroll: true });
  } else {
    if (!songPicker.hasAttribute('tabindex')) songPicker.setAttribute('tabindex', '-1');
    songPicker.focus({ preventScroll: true });
  }
}

function closeSongPicker() {
  if (!songPicker || songPicker.hidden) return;
  songPicker.hidden = true;
  document.body.classList.remove('dialog-open');
}

function pickSong(trackId) {
  closeSongPicker();
  if (trackId) {
    selectTrackById(trackId, { dock: true, focusPlayer: false });
  }
}

function selectTrackById(trackId, options = { dock: true, focusPlayer: true }) {
  if (!player || !frame) return;
  const targetLink =
    document.querySelector(`#music .listen-link[data-track="${trackId}"]`) ||
    document.querySelector(`[data-track="${trackId}"]`);
  const meta = TRACK_META[trackId];
  if (!meta && !targetLink) return;

  const title = meta?.title || targetLink?.dataset.title || 'Selected song';
  const href = meta?.href || targetLink?.getAttribute('href') || 'https://www.reverbnation.com/rebyen';

  if (options.dock) {
    player.classList.add('is-docked');
    document.body.classList.add('has-player');
  }
  setExpanded(true);

  if (trackId !== selectedTrack || !frame.src || frame.src === 'about:blank') {
    frame.src = reverbnationEmbedUrl(trackId);
    selectedTrack = trackId;
    setCued(requiresWidgetTap);
  }

  frame.title = `${title} by Reb Yen — ReverbNation audio player`;
  if (playerTitle) playerTitle.textContent = title;
  if (stopBtn) stopBtn.hidden = false;
  updateCatalogSelection(trackId);

  const fallback = document.getElementById('player-fallback');
  if (fallback && href.startsWith('http')) fallback.href = href;

  if (playerStatus) {
    playerStatus.textContent = `${title} loaded. Press play in the ReverbNation player to listen.`;
  }
  setRecordStatus(trackId);

  if (options.focusPlayer) {
    player.focus({ preventScroll: true });
  }
}

function stepTrack(offset) {
  if (catalogRows.length === 0) return;
  const visibleRows = catalogRows.filter(row => !row.hidden);
  const pool = visibleRows.length > 0 ? visibleRows : catalogRows;
  const currentIndex = pool.findIndex(row => row.dataset.song === selectedTrack);
  const nextIndex =
    currentIndex === -1
      ? offset >= 0
        ? 0
        : pool.length - 1
      : (currentIndex + offset + pool.length) % pool.length;
  const nextTrackId = pool[nextIndex]?.dataset.song;
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

function stopPlayer({ returnFocus = true } = {}) {
  if (frame) frame.src = 'about:blank';
  selectedTrack = null;
  setCued(false);
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
  if (returnFocus) {
    document.querySelector('#music [data-track]')?.focus({ preventScroll: true });
  }
}

stopBtn?.addEventListener('click', () => stopPlayer());

// Hero turntable: tapping the vinyl or card opens the picker.
heroRecord?.addEventListener('click', openSongPicker);
document.getElementById('hero-turntable')?.addEventListener('click', event => {
  if (event.target.closest('#hero-record, #record-stop-btn, .record-more-link, a, button')) return;
  openSongPicker();
});
catalogRows.forEach(row => {
  row.addEventListener('click', event => {
    if (event.target.closest('a, button')) return;
    if (row.dataset.song) selectTrackById(row.dataset.song, { dock: true, focusPlayer: false });
  });
});
songPickerList?.addEventListener('click', event => {
  const btn = event.target.closest('.picker-song[data-pick]');
  if (!btn) return;
  event.preventDefault();
  pickSong(btn.dataset.pick);
});
recordStopBtn?.addEventListener('click', () => {
  stopPlayer({ returnFocus: false });
  heroRecord?.focus({ preventScroll: true });
});
document.getElementById('song-picker-close')?.addEventListener('click', closeSongPicker);
document.getElementById('song-picker-dismiss')?.addEventListener('click', () => {
  closeSongPicker();
  heroRecord?.focus({ preventScroll: true });
});
document.getElementById('song-picker-backdrop')?.addEventListener('click', closeSongPicker);
document.getElementById('song-picker-stop')?.addEventListener('click', () => {
  closeSongPicker();
  stopPlayer({ returnFocus: false });
  heroRecord?.focus({ preventScroll: true });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && songPicker && !songPicker.hidden) {
    closeSongPicker();
    heroRecord?.focus({ preventScroll: true });
  }
});

// Catalog Filter Pills (All / Featured / Studio / Live)
const filterPills = Array.from(document.querySelectorAll('.filter-pill[data-filter]'));
filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    const filter = pill.dataset.filter || 'all';
    filterPills.forEach(btn => {
      const active = btn === pill;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    catalogRows.forEach(row => {
      const tags = (row.dataset.tags || '').split(/\s+/);
      const match = filter === 'all' || tags.includes(filter);
      row.hidden = !match;
      row.classList.remove('is-filtered-in');
      if (match && !prefersReducedMotion) {
        void row.offsetWidth;
        row.classList.add('is-filtered-in');
      }
    });
  });
});

setExpanded(false);
setRecordStatus(null);

// ============================================================================
// Web Audio API Karplus-Strong Acoustic Harmonics & Pluckable Guitar Strings
// ============================================================================
const stringSoundToggle = document.getElementById('string-sound-toggle');
const stringSoundIcon = document.getElementById('string-sound-icon');
const stringSoundLabel = document.getElementById('string-sound-label');
let stringSoundEnabled = true;
let audioCtx = null;

function ensureAudioUnlocked() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

document.addEventListener(
  'pointerdown',
  () => {
    if (stringSoundEnabled) ensureAudioUnlocked();
  },
  { once: true, passive: true }
);

function playGuitarHarmonic(freq, velocity = 0.8) {
  if (!stringSoundEnabled || !audioCtx || audioCtx.state !== 'running') return;
  const sr = audioCtx.sampleRate;
  const duration = 1.65;
  const length = Math.floor(sr * duration);
  const period = Math.max(8, Math.round(sr / freq));

  const buffer = audioCtx.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);

  // Warm thumb-plucked initial excitation (2-pass smoothed noise burst)
  const burst = new Float32Array(period);
  for (let i = 0; i < period; i++) {
    burst[i] = Math.random() * 2 - 1;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < period; i++) {
      burst[i] = 0.55 * burst[i] + 0.45 * burst[i - 1];
    }
  }
  for (let i = 0; i < period; i++) {
    data[i] = burst[i];
  }

  // Karplus-Strong 1-pole low-pass waveguide loop
  const decay = 0.9962;
  for (let i = period; i < length; i++) {
    data[i] = decay * (0.54 * data[i - period] + 0.46 * data[i - period + 1]);
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const bodyFilter = audioCtx.createBiquadFilter();
  bodyFilter.type = 'lowshelf';
  bodyFilter.frequency.value = 240;
  bodyFilter.gain.value = 2.5;

  const gainNode = audioCtx.createGain();
  const baseGain = selectedTrack ? 0.065 : 0.14;
  const peak = baseGain * Math.min(1, Math.max(0.35, velocity));
  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(peak, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(bodyFilter);
  bodyFilter.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  source.start(now);
  source.onended = () => {
    source.disconnect();
    bodyFilter.disconnect();
    gainNode.disconnect();
  };
}

stringSoundToggle?.addEventListener('click', () => {
  stringSoundEnabled = !stringSoundEnabled;
  stringSoundToggle.setAttribute('aria-pressed', String(stringSoundEnabled));
  if (stringSoundIcon) stringSoundIcon.textContent = stringSoundEnabled ? '♪' : '✕';
  if (stringSoundLabel) {
    stringSoundLabel.textContent = stringSoundEnabled ? 'Strings: On' : 'Strings: Off';
  }
  if (stringSoundEnabled) {
    ensureAudioUnlocked();
    playGuitarHarmonic(293.66, 0.65);
  }
});

document.querySelectorAll('[data-guitar-string]').forEach(stringEl => {
  const paths = stringEl.querySelectorAll('path');
  const noteFreq = parseFloat(stringEl.dataset.note || '196') || 196;
  let animId = 0;
  let pulledDisp = 0;
  let lastX = 500;
  let lastPluckSoundAt = 0;

  function triggerNote(velocity) {
    const now = performance.now();
    if (now - lastPluckSoundAt < 70) return;
    lastPluckSoundAt = now;
    playGuitarHarmonic(noteFreq, velocity);
  }

  function setCurve(cx, cy) {
    const d = `M0,16 Q${cx.toFixed(1)},${cy.toFixed(2)} 1000,16`;
    paths.forEach(p => p.setAttribute('d', d));
  }

  function pluck(x, initialDisp) {
    triggerNote(Math.abs(initialDisp) / 14);
    if (prefersReducedMotion || paths.length === 0) return;

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

  if (!prefersReducedMotion && paths.length > 0) {
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
  }

  stringEl.addEventListener('pointerdown', event => {
    if (stringSoundEnabled) ensureAudioUnlocked();
    const rect = stringEl.getBoundingClientRect();
    const x = rect.width
      ? Math.max(80, Math.min(920, ((event.clientX - rect.left) / rect.width) * 1000))
      : 500;
    pluck(x, 13);
  });
});

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
    { parent: '.about-chips', children: 'span', step: 55, mod: 4 },
    { parent: '.journey-rail', children: '.journey-stop', step: 50, mod: 6 },
    { parent: '.gallery-grid', children: '.gallery-item', step: 65, mod: 3 },
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
      '[data-reveal], .recognition-inner, .section-head, .feature-sleeve-wrap, .upcoming, .stage-spec-panel, .about-image, .about-copy, .contact-grid > div, .press-main h2, .press-main > p, .press-facts'
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
// Tactile 3D Polaroid Hover Physics & Magnetic Copper-Sheen Primary Buttons
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

  document.querySelectorAll('.button.primary').forEach(btn => {
    btn.addEventListener('pointermove', event => {
      const rect = btn.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const mx = (((event.clientX - rect.left) / rect.width - 0.5) * 7).toFixed(2);
      const my = (((event.clientY - rect.top) / rect.height - 0.5) * 4.5).toFixed(2);
      btn.style.setProperty('--mx', `${mx}px`);
      btn.style.setProperty('--my', `${my}px`);
    });

    const resetMagnet = () => {
      btn.style.removeProperty('--mx');
      btn.style.removeProperty('--my');
    };
    btn.addEventListener('pointerleave', resetMagnet);
    btn.addEventListener('blur', resetMagnet);
  });
}

// ============================================================================
// Video Facades & "House Lights Down" Cinema Mode
// ============================================================================
document.querySelectorAll('.video-poster[data-video-id]').forEach(button => {
  button.addEventListener('click', () => {
    const id = button.dataset.videoId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;

    const videoCard = button.closest('.video');
    const videoSection = button.closest('.video-section');
    if (videoSection) {
      videoSection.classList.add('is-cinema-mode');
      videoSection
        .querySelectorAll('.video.is-playing-video')
        .forEach(el => el.classList.remove('is-playing-video'));
    }
    videoCard?.classList.add('is-playing-video');

    const video = document.createElement('iframe');
    video.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    video.title = (button.getAttribute('aria-label') || 'Live performance video').replace(
      /^Play /,
      ''
    );
    video.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    video.allowFullscreen = true;
    button.replaceWith(video);
    video.focus({ preventScroll: true });
  });
});

// ============================================================================
// Stage Plot & Lineup Configurator + Contact Form Adaptation
// ============================================================================
const STAGE_SPECS = {
  Solo: {
    title: 'Solo Acoustic · Intimate Storytelling',
    instruments: 'Lead vocals with guitar, keyboard or harmonica',
    venues: 'Listening rooms, bistros, house concerts & private gatherings',
    cta: 'Inquire about Solo →'
  },
  Duo: {
    title: 'Acoustic Duo · Harmonies & Counterpoint',
    instruments: 'Two performers with vocal harmonies, guitars & multi-instrumental textures',
    venues: 'Wine bars, hotel lounges, receptions & intimate stages',
    cta: 'Inquire about Duo →'
  },
  'Full band': {
    title: 'Full Band · High-Energy Stage Set',
    instruments: 'Full ensemble performing Reb’s originals and carefully chosen covers',
    venues: 'Festivals, concert series, main stages & lively club rooms',
    cta: 'Inquire about Full band →'
  }
};

const topicSelect = document.getElementById('cf-topic');
const formatSelect = document.getElementById('cf-format');
const bookingDetailsRow = document.getElementById('booking-details-row');
const messageField = document.getElementById('cf-msg');
const formatCards = Array.from(document.querySelectorAll('[data-format-card]'));
const specTitle = document.getElementById('spec-title');
const specInstruments = document.getElementById('spec-instruments');
const specVenues = document.getElementById('spec-venues');
const specCta = document.getElementById('spec-cta');
const specGrid = document.querySelector('.stage-spec-grid');

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

function selectStageFormat(formatKey) {
  const spec = STAGE_SPECS[formatKey];
  if (!spec) return;

  formatCards.forEach(card => {
    card.classList.toggle('is-selected-format', card.dataset.formatCard === formatKey);
  });

  if (specTitle) specTitle.textContent = spec.title;
  if (specInstruments) specInstruments.textContent = spec.instruments;
  if (specVenues) specVenues.textContent = spec.venues;
  if (specCta) {
    specCta.textContent = spec.cta;
    specCta.dataset.selectFormat = formatKey;
  }

  if (specGrid && !prefersReducedMotion) {
    specGrid.classList.remove('is-animating');
    void specGrid.offsetWidth;
    specGrid.classList.add('is-animating');
  }

  if (formatSelect) {
    formatSelect.value = formatKey;
  }
}

formatCards.forEach(card => {
  card.addEventListener('click', () => {
    if (card.dataset.formatCard) selectStageFormat(card.dataset.formatCard);
  });

  card.addEventListener('keydown', event => {
    if (event.target.closest('a')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (card.dataset.formatCard) selectStageFormat(card.dataset.formatCard);
    }
  });
});

const contactNextField = document.querySelector('.contact-form input[name="_next"]');
if (contactNextField && /^https?:$/.test(window.location.protocol)) {
  contactNextField.value = new URL('thanks.html', window.location.href).href;
}

topicSelect?.addEventListener('change', syncContactFormFields);
syncContactFormFields();

document.querySelectorAll('[data-select-format]').forEach(link => {
  link.addEventListener('click', () => {
    const chosenFormat = link.dataset.selectFormat;
    if (chosenFormat && STAGE_SPECS[chosenFormat]) {
      selectStageFormat(chosenFormat);
    }
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
// Interactive "Stages & Chapters" Tour-Stop Strip
// ============================================================================
const JOURNEY_CHAPTERS = [
  {
    title: 'Los Angeles · Aman World Music & Dance Ensemble',
    text: 'Began her professional performance career as a singer and dancer with the acclaimed Aman World Music & Dance Ensemble in Los Angeles.'
  },
  {
    title: 'New York City · Lincoln Center',
    text: 'Performed on stage at Lincoln Center in New York as part of the Aman World Music & Dance Ensemble.'
  },
  {
    title: 'Orlando & Central Florida · Walt Disney World',
    text: 'Worked as a singer, dancer and producer at Walt Disney World, alongside Central Florida performances at Universal Studios and Hard Rock Café.'
  },
  {
    title: 'North America & Europe · Original Performance Art',
    text: 'Created and toured an original performance-art production bringing live music, dance and illusion together across North America and Europe.'
  },
  {
    title: 'Nashville · Songwriting Community & Commodore Grille',
    text: 'Immersed in Nashville’s songwriting community and performed her original songs live on stage at the Commodore Grille.'
  },
  {
    title: 'Boulder & the Front Range · Roots Music Project & Beyond',
    text: 'Now based in Boulder, performing originals and curated covers on guitar, keyboard and harmonica at Roots Music Project, St. Julien Hotel, Bricks On Main, The Alley and Attic Bistro.'
  }
];

const journeyStops = Array.from(document.querySelectorAll('.journey-stop[data-stop]'));
const journeyDetail = document.getElementById('journey-detail');
const journeyDetailTitle = document.getElementById('journey-detail-title');
const journeyDetailText = document.getElementById('journey-detail-text');
let currentJourneyIndex = 0;

function activateJourneyStop(index, focusTab = false) {
  if (journeyStops.length === 0) return;
  currentJourneyIndex = (index + journeyStops.length) % journeyStops.length;
  const chapter = JOURNEY_CHAPTERS[currentJourneyIndex];
  if (!chapter) return;

  journeyStops.forEach((btn, idx) => {
    const active = idx === currentJourneyIndex;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
    btn.tabIndex = active ? 0 : -1;
    if (active && focusTab) btn.focus();
  });

  if (journeyDetailTitle) journeyDetailTitle.textContent = chapter.title;
  if (journeyDetailText) journeyDetailText.textContent = chapter.text;

  if (journeyDetail && !prefersReducedMotion) {
    journeyDetail.classList.remove('is-animating');
    void journeyDetail.offsetWidth;
    journeyDetail.classList.add('is-animating');
  }
}

if (journeyStops.length > 0) {
  journeyStops.forEach((btn, index) => {
    btn.tabIndex = index === 0 ? 0 : -1;
    btn.addEventListener('click', () => activateJourneyStop(index, false));
    btn.addEventListener('keydown', event => {
      let nextIdx = -1;
      if (event.key === 'ArrowRight') {
        nextIdx = (index + 1) % journeyStops.length;
      } else if (event.key === 'ArrowLeft') {
        nextIdx = (index - 1 + journeyStops.length) % journeyStops.length;
      } else if (event.key === 'Home') {
        nextIdx = 0;
      } else if (event.key === 'End') {
        nextIdx = journeyStops.length - 1;
      }
      if (nextIdx !== -1) {
        event.preventDefault();
        activateJourneyStop(nextIdx, true);
      }
    });
  });

  document.getElementById('journey-prev')?.addEventListener('click', () => {
    activateJourneyStop(currentJourneyIndex - 1, false);
  });
  document.getElementById('journey-next')?.addEventListener('click', () => {
    activateJourneyStop(currentJourneyIndex + 1, false);
  });
}

// ============================================================================
// Gallery Share, Email & Lightbox with Smooth Crossfade & Keyboard Navigation
// ============================================================================
const siteShareOrigin = /^https?:$/.test(window.location.protocol)
  ? window.location.origin
  : 'https://rebyen.com';

function buildMailtoHref(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function shareOrCopyLink({ title, text, url }, labelEl, defaultLabel) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }

  let copied = false;
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = false;
    }
  }

  if (!copied) {
    const temp = document.createElement('textarea');
    temp.value = url;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.append(temp);
    temp.select();
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }
    temp.remove();
  }

  if (copied && labelEl) {
    labelEl.textContent = 'Link copied ✓';
    window.setTimeout(() => {
      labelEl.textContent = defaultLabel;
    }, 2200);
  }
}

const shareGalleryBtn = document.getElementById('share-gallery-btn');
const shareGalleryLabel = document.getElementById('share-gallery-label');
const emailGalleryBtn = document.getElementById('email-gallery-btn');
const galleryShareUrl = `${siteShareOrigin}/#gallery`;

if (emailGalleryBtn) {
  emailGalleryBtn.href = buildMailtoHref(
    'Reb Yen — On Stage & Original Music',
    `Take a look at singer-songwriter Reb Yen on stage and hear her original songs:\n\n${galleryShareUrl}`
  );
}

shareGalleryBtn?.addEventListener('click', () => {
  shareOrCopyLink(
    {
      title: 'Reb Yen — On Stage & Original Music',
      text: 'Take a look at singer-songwriter Reb Yen on stage and hear her original songs:',
      url: galleryShareUrl
    },
    shareGalleryLabel,
    'Share'
  );
});

const lightbox = document.getElementById('photo-dialog');
const galleryButtons = Array.from(document.querySelectorAll('[data-photo]'));
const sharePhotoBtn = document.getElementById('share-photo-btn');
const sharePhotoLabel = document.getElementById('share-photo-label');
const emailPhotoBtn = document.getElementById('email-photo-btn');
let currentPhotoIndex = -1;
let lastPhotoButton = null;
let switchTimer = 0;

function updateLightboxShareTargets(photoSrc, photoTitle) {
  const fullPhotoUrl = new URL(photoSrc, `${siteShareOrigin}/`).href;
  if (emailPhotoBtn) {
    emailPhotoBtn.href = buildMailtoHref(
      `Reb Yen — ${photoTitle}`,
      `${photoTitle} — Reb Yen on stage:\n${fullPhotoUrl}\n\nExplore more music and videos:\n${galleryShareUrl}`
    );
  }
  if (sharePhotoLabel) {
    sharePhotoLabel.textContent = 'Share photo';
  }
}

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
  updateLightboxShareTargets(nextSrc, nextTitle);

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

sharePhotoBtn?.addEventListener('click', () => {
  if (currentPhotoIndex < 0 || !galleryButtons[currentPhotoIndex]) return;
  const button = galleryButtons[currentPhotoIndex];
  const photoTitle = button.querySelector('span')?.textContent || 'Performance photo';
  const fullPhotoUrl = new URL(button.dataset.photo, `${siteShareOrigin}/`).href;
  shareOrCopyLink(
    {
      title: `Reb Yen — ${photoTitle}`,
      text: `${photoTitle} — Reb Yen on stage`,
      url: fullPhotoUrl
    },
    sharePhotoLabel,
    'Share photo'
  );
});

galleryButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    lastPhotoButton = button;
    renderLightboxPhoto(index, false);
    openDialog(lightbox);
  });
});

document.getElementById('prev-photo')?.addEventListener('click', () => {
  renderLightboxPhoto(currentPhotoIndex - 1, true);
});

document.getElementById('next-photo')?.addEventListener('click', () => {
  renderLightboxPhoto(currentPhotoIndex + 1, true);
});

document.getElementById('close-photo')?.addEventListener('click', () => {
  closeDialog(lightbox);
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
      closeDialog(lightbox);
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
// Webmail + Mailto Chooser (ensures Email works on Gmail/Yahoo/Outlook Web)
// ============================================================================
const emailChooser = document.getElementById('email-chooser');
const ecCloseBtn = document.getElementById('email-chooser-close');
const ecGmail = document.getElementById('ec-gmail');
const ecYahoo = document.getElementById('ec-yahoo');
const ecOutlook = document.getElementById('ec-outlook');
const ecMailto = document.getElementById('ec-mailto');
const ecCopy = document.getElementById('ec-copy');
const ecCopyLabel = document.getElementById('ec-copy-label');
const ecSub = document.getElementById('email-chooser-sub');
let activeEmailPayload = { subject: '', body: '' };

function parseMailtoHref(href) {
  const out = { subject: '', body: '' };
  const qIndex = href.indexOf('?');
  if (qIndex === -1) return out;
  href
    .slice(qIndex + 1)
    .split('&')
    .forEach(pair => {
      const eq = pair.indexOf('=');
      if (eq === -1) return;
      const k = decodeURIComponent(pair.slice(0, eq)).toLowerCase();
      const v = decodeURIComponent(pair.slice(eq + 1));
      if (k === 'subject') out.subject = v;
      if (k === 'body') out.body = v;
    });
  return out;
}

document.querySelectorAll('#email-gallery-btn, #email-photo-btn').forEach(link => {
  link.addEventListener('click', event => {
    if (!emailChooser) return;
    event.preventDefault();
    const rawHref = link.getAttribute('href') || '';
    const parsed = parseMailtoHref(rawHref);
    activeEmailPayload = parsed;
    const encSub = encodeURIComponent(parsed.subject);
    const encBody = encodeURIComponent(parsed.body);

    if (ecSub) ecSub.textContent = parsed.subject || 'Choose your email service:';
    if (ecGmail) ecGmail.href = `https://mail.google.com/mail/?view=cm&fs=1&su=${encSub}&body=${encBody}`;
    if (ecYahoo) ecYahoo.href = `https://compose.mail.yahoo.com/?subject=${encSub}&body=${encBody}`;
    if (ecOutlook) ecOutlook.href = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encSub}&body=${encBody}`;
    if (ecMailto) ecMailto.href = rawHref || 'mailto:';
    if (ecCopyLabel) ecCopyLabel.textContent = 'Copy Email Message & Link';

    openDialog(emailChooser);
  });
});

[ecGmail, ecYahoo, ecOutlook, ecMailto].forEach(el => {
  el?.addEventListener('click', () => {
    setTimeout(() => closeDialog(emailChooser), 120);
  });
});

ecCopy?.addEventListener('click', async () => {
  const fullText = `${activeEmailPayload.subject ? `${activeEmailPayload.subject}\n\n` : ''}${activeEmailPayload.body}`;
  try {
    await navigator.clipboard.writeText(fullText);
    if (ecCopyLabel) ecCopyLabel.textContent = 'Copied to clipboard ✓';
    setTimeout(() => closeDialog(emailChooser), 900);
  } catch {
    window.prompt('Copy email message:', fullText);
  }
});

ecCloseBtn?.addEventListener('click', () => closeDialog(emailChooser));
emailChooser?.addEventListener('click', event => {
  if (event.target === emailChooser) {
    const r = emailChooser.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) {
      closeDialog(emailChooser);
    }
  }
});
