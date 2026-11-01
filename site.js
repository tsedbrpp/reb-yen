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
  '1827482453': {
    title: 'Take Me Crazy',
    vinyl: 'TAKE ME\nCRAZY',
    eyebrow: 'Featured original · ReverbNation Spotlight',
    desc: 'Reb calls it a realistic love song: candid, playful and about accepting one another as we are. Written, arranged and performed by Reb — live performance filmed in Nashville.',
    img: 'images/take_me_crazy.jpg',
    alt: 'Reb Yen performing Take Me Crazy in Nashville',
    caption: 'On stage at the Commodore Grille, Nashville',
    href: 'https://rebyen.bandcamp.com/track/take-me-crazy'
  },
  '235047036': {
    title: 'Should I?',
    vinyl: 'SHOULD\nI?',
    eyebrow: 'Original studio recording · ReverbNation Spotlight',
    desc: 'An original studio recording written, arranged and performed by Reb—one of three songs featured on the ReverbNation homepage.',
    img: 'images/hero-guitar.jpg',
    pos: '52% 30%',
    bright: true,
    alt: 'Reb Yen singing and playing acoustic guitar',
    caption: 'Reb Yen · Original studio recording',
    href: 'https://rebyen.bandcamp.com/track/should-i'
  },
  '4028698566': {
    title: 'Gotta Let It Go',
    vinyl: 'GOTTA LET\nIT GO',
    eyebrow: 'Featured original · ReverbNation Spotlight',
    desc: 'Written and arranged by Reb about knowing when to let go and move forward—featured on the ReverbNation homepage.',
    img: 'images/gotta_let_it_go.jpg',
    alt: 'Reb Yen singing Gotta Let It Go with acoustic guitar',
    caption: 'Gotta Let It Go ? from the lyric video',
    href: 'https://rebyen.bandcamp.com/track/gotta-let-it-go-2'
  },
  '1271869476': {
    title: 'The Solitude',
    vinyl: 'THE\nSOLITUDE',
    eyebrow: 'Original song · Live recording',
    desc: 'Captured live on stage—an atmospheric original showcasing Reb’s electric guitar work and expressive storytelling.',
    img: 'images/solitude.jpg',
    alt: 'Reb Yen performing The Solitude live on electric guitar',
    caption: 'Performing The Solitude live at Roots Music Project',
    href: 'https://rebyen.bandcamp.com/track/the-solitude-live'
  },
  '1638570894': {
    title: 'A New Beginning',
    vinyl: 'A NEW\nBEGINNING',
    eyebrow: 'Original song · Studio recording',
    desc: 'Written on loss, remembrance and beginning again—“Don’t call it the end; it’s a new beginning.”',
    img: 'images/newbeginning.jpg',
    alt: 'Reb Yen performing A New Beginning with guitar and harmonica',
    caption: 'A New Beginning · Live at The Copper Rocket',
    href: 'https://rebyen.bandcamp.com/track/a-new-beginning'
  },
  '3496903015': {
    title: 'Are You Listening Now?',
    vinyl: 'ARE YOU\nLISTENING',
    eyebrow: 'Original song · Studio recording',
    desc: 'An original studio recording blending folk-rock urgency with Reb’s direct, observational songwriting.',
    img: 'images/are_you_listening.jpg',
    alt: 'Reb Yen performing on stage with her trio at The Alley',
    caption: 'Reb Yen performing with her trio at The Alley',
    href: 'https://rebyen.bandcamp.com/track/are-you-listening-now'
  },
  '1698636065': {
    title: 'Birds Of Prey',
    vinyl: 'BIRDS OF\nPREY',
    eyebrow: 'Original song · Live recording',
    desc: 'Recorded live on stage, bringing raw room energy to Reb’s original songwriting and arrangement.',
    img: 'images/storm.jpg',
    alt: 'Reb Yen performing live with her band',
    caption: 'Live stage performance · Original catalog',
    href: 'https://rebyen.bandcamp.com/track/birds-of-prey-live'
  },
  '1560882348': {
    title: 'Take A Stand',
    vinyl: 'TAKE A\nSTAND',
    eyebrow: 'Original song · Live recording',
    desc: 'A live original recording driven by conviction, acoustic rhythm and the immediacy of the stage.',
    img: 'images/are_you_listening.jpg',
    alt: 'Reb Yen singing and playing acoustic guitar on stage',
    caption: 'On stage · Original live recording',
    href: 'https://rebyen.bandcamp.com/track/take-a-stand-live'
  },
  '244119541': {
    title: 'Out Of Body',
    vinyl: 'OUT OF\nBODY',
    eyebrow: 'Original song · Studio recording',
    desc: 'An introspective studio original exploring perspective and reflection across Reb’s indie-folk palette.',
    img: 'images/reb_yen_photo.jpg',
    pos: '50% 38%',
    alt: 'Artistic portrait of Reb Yen with guitar fretboard',
    caption: 'Reb Yen · Studio original',
    href: 'https://rebyen.bandcamp.com/track/out-of-body'
  }
};

// Reb's full ReverbNation catalogue (legacy.reverbnation.com/rebyen), played through
// ReverbNation's official embeddable player. `bc` links a song to its Bandcamp twin
// so the catalog "Listen" buttons and the jukebox sleeve stay in sync.
const REVERBNATION_ARTIST_ID = '6720947';
const RN_SONGS = [
  { rn: '33863436', title: "Take Me Crazy", note: "Original · ReverbNation Featured", length: '3:48', bc: '1827482453', featured: true, art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/35118509/original/resize:600x600/crop:x0y800w3199h2399/hash:1684988150/IMG_6558.jpeg?1684988150" },
  { rn: '33355990', title: "Should I?", note: "Original · ReverbNation Featured", length: '3:08', bc: '235047036', featured: true, art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/35163458/original/resize:600x642/crop:x0y158w992h744/hash:1687447680/IMG_6543.jpeg?1687447680" },
  { rn: '33993499', title: "Gotta Let It Go", note: "Original · ReverbNation Featured", length: '3:35', bc: '4028698566', featured: true, art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/35109995/original/resize:600x600/crop:x0y400w3200h2400/hash:1684513132/295BBB59-4422-44E8-A4EE-53831EA73C89.jpeg?1684513132" },
  { rn: '33992872', title: "A New Beginning", note: "Original", length: '3:03', bc: '1638570894', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/35284339/original/resize:600x620/crop:x0y155w1103h827/hash:1694148385/IMG_1691.jpeg?1694148385" },
  { rn: '33391779', title: "Are You Listening Now?", note: "Original", length: '3:10', bc: '3496903015', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/34023239/original/resize:600x687/crop:x0y194w981h736/hash:1631534546/320DA474-EB68-4D57-9929-D69BB813292B.jpeg?1631534546" },
  { rn: '32557441', title: "Out Of Body", note: "Original", length: '3:19', bc: '244119541', art: "https://d3e6ckxkrs5ntg.cloudfront.net/artists/images/6720947/original/resize:600x600/crop:x0y230w2000h1500/hash:1780613206/IMG_8485.jpeg?1780613206" },
  { rn: '32929366', title: "I Can Feel U", note: "Original", length: '2:56', art: "https://d3e6ckxkrs5ntg.cloudfront.net/artists/images/6720947/original/resize:600x600/crop:x0y230w2000h1500/hash:1780613206/IMG_8485.jpeg?1780613206" },
  { rn: '32943176', title: "Shut In World", note: "Original · Reb Yen & Jim O’Rourke", length: '2:23', art: "https://d3e6ckxkrs5ntg.cloudfront.net/artists/images/6720947/original/resize:600x600/crop:x0y230w2000h1500/hash:1780613206/IMG_8485.jpeg?1780613206" },
  { rn: '32520637', title: "Crawled To The Edge", note: "Original · first draft", length: '2:35', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/33848828/original/resize:702x600/crop:x0y199w1995h1497/hash:1623612105/D9082673-E086-42D8-86AA-59A3F7B7C78B.jpeg?1623612105" },
  { rn: '32896520', title: "The Solitude", note: "Original · live", length: '1:34', bc: '1271869476', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/35623740/original/resize:600x600/crop:x0y399w3199h2399/hash:1713789906/IMG_8300.jpeg?1713789906" },
  { rn: '32271655', title: "The Solitude", note: "Original · full version", length: '2:56', art: "https://d3e6ckxkrs5ntg.cloudfront.net/artists/images/6720947/original/resize:600x600/crop:x0y230w2000h1500/hash:1780613206/IMG_8485.jpeg?1780613206" },
  { rn: '33866102', title: "Birds Of Prey", note: "Original · live", length: '2:37', bc: '1698636065', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/34053201/original/resize:673x600/crop:x0y211w2044h1533/hash:1632942680/DD998DBB-2202-4924-BC13-EF1FA7691E37.jpeg?1632942680" },
  { rn: '32178754', title: "Birds Of Prey", note: "Original · solo version", length: '2:14', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/34053201/original/resize:673x600/crop:x0y211w2044h1533/hash:1632942680/DD998DBB-2202-4924-BC13-EF1FA7691E37.jpeg?1632942680" },
  { rn: '32896774', title: "Take A Stand", note: "Original · live", length: '3:06', bc: '1560882348', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/35163458/original/resize:600x642/crop:x0y158w992h744/hash:1687447680/IMG_6543.jpeg?1687447680" },
  { rn: '32563022', title: "The Storm", note: "Original · live", length: '3:09', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/34023522/original/resize:724x600/crop:x0y70w1576h1182/hash:1631546248/EEBAE3F0-62FA-4D37-8D32-FCD4B2A04732.jpeg?1631546248" },
  { rn: '32930467', title: "Missing Clues", note: "Original · live", length: '1:24', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/34053201/original/resize:673x600/crop:x0y211w2044h1533/hash:1632942680/DD998DBB-2202-4924-BC13-EF1FA7691E37.jpeg?1632942680" },
  { rn: '32981405', title: "In Cyber Love", note: "Original · live", length: '1:49', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/35163458/original/resize:600x642/crop:x0y158w992h744/hash:1687447680/IMG_6543.jpeg?1687447680" },
  { rn: '32901138', title: "Time Machine", note: "Original · live", length: '2:32', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/34053201/original/resize:673x600/crop:x0y211w2044h1533/hash:1632942680/DD998DBB-2202-4924-BC13-EF1FA7691E37.jpeg?1632942680" },
  { rn: '32693242', title: "For You To Know", note: "Original · live", length: '2:41', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/34053201/original/resize:673x600/crop:x0y211w2044h1533/hash:1632942680/DD998DBB-2202-4924-BC13-EF1FA7691E37.jpeg?1632942680" },
  { rn: '33353012', title: "RSVP", note: "Original · live", length: '3:03', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/35217783/original/resize:600x753/crop:x0y339w1340h1005/hash:1690464691/IMG_6723.jpeg?1690464691" },
  { rn: '31360418', title: "Dancing With My Cell", note: "Original · live", length: '1:58', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/33848828/original/resize:702x600/crop:x0y199w1995h1497/hash:1623612105/D9082673-E086-42D8-86AA-59A3F7B7C78B.jpeg?1623612105" },
  { rn: '31438949', title: "Are You Listening?", note: "Original · live version", length: '2:30', art: "https://d3e6ckxkrs5ntg.cloudfront.net/photos/images/34023239/original/resize:600x687/crop:x0y194w981h736/hash:1631534546/320DA474-EB68-4D57-9929-D69BB813292B.jpeg?1631534546" }
];

const RN_BY_BC = Object.fromEntries(RN_SONGS.filter(s => s.bc).map(s => [s.bc, s]));
const RN_BY_ID = Object.fromEntries(RN_SONGS.map(s => [s.rn, s]));

// A "track key" is the Bandcamp id for songs that also appear in the catalog
// below (keeps the catalog + sleeve in sync), or "rn:<id>" for ReverbNation-only songs.
function keyForSong(song) {
  return song.bc || `rn:${song.rn}`;
}
function songForKey(key) {
  if (!key) return null;
  return key.startsWith('rn:') ? RN_BY_ID[key.slice(3)] || null : RN_BY_BC[key] || null;
}
const PLAYLIST_KEYS = RN_SONGS.map(keyForSong);

const player = document.getElementById('music-player');
const frame = document.getElementById('song-frame');
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
const recordPlayIcon = document.getElementById('record-play-icon');
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

// ReverbNation's player is asked to autoplay. Browsers allow that right after the
// visitor's tap on the vinyl/song (the iframe has allow="autoplay"), but some — notably
// iOS Safari — still need a tap inside the player. Until the visitor interacts with the
// player we show a gentle "No sound? Tap ▶" hint; a tap inside moves focus into the
// iframe, which we observe via window blur + document.activeElement.
let isCued = false;

function reverbnationEmbedUrl(rnSongId) {
  const params = new URLSearchParams({
    widget_id: '55',
    'pwc[song_ids]': rnSongId,
    'pwc[autoplay]': '1',
    context_type: 'song',
    id_unique: `song_${rnSongId}`
  });
  return `https://legacy.reverbnation.com/widget_code/html_widget/artist_${REVERBNATION_ARTIST_ID}?${params}`;
}

function setCued(cued) {
  isCued = Boolean(cued && selectedTrack);
  player?.classList.toggle('is-cued', isCued);
}

window.addEventListener('blur', () => {
  setTimeout(() => {
    if (isCued && frame && document.activeElement === frame) setCued(false);
  }, 0);
});

function updateJukeboxSleeve(trackId, isPlaying) {
  const effectiveId = trackId && TRACK_META[trackId] ? trackId : '1827482453';
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
  }

  featureSleeve?.classList.toggle('is-playing', Boolean(isPlaying));
}

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

  updateJukeboxSleeve(trackId, Boolean(trackId && TRACK_META[trackId]));
}

function setRecordStatus(trackId) {
  if (!heroRecord) return;
  const isLoaded = Boolean(trackId);
  const name = songForKey(trackId)?.title || 'this song';

  heroRecord.classList.toggle('selected', isLoaded);
  heroRecord.setAttribute(
    'aria-label',
    isLoaded ? `Change song — now playing ${name}` : 'Choose a song to play'
  );
  if (recordLabelTitle) recordLabelTitle.textContent = isLoaded ? name : 'Pick a song';
  if (recordPlayIcon) recordPlayIcon.textContent = isLoaded ? '♫' : '▶';

  if (recordNowLabel) recordNowLabel.textContent = isLoaded ? 'Now on the turntable' : 'Reb’s jukebox';
  if (recordNowTitle) {
    recordNowTitle.textContent = isLoaded ? name : `${RN_SONGS.length} original songs`;
    recordNowTitle.classList.toggle('is-idle', !isLoaded);
  }
  if (recordStopBtn) recordStopBtn.hidden = !isLoaded;

  const statusMsg = !isLoaded
    ? 'Tap the vinyl to choose a song'
    : `♫ Now playing “${name}” · tap the vinyl to change songs`;
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
    const groups = [
      { label: 'Featured on ReverbNation', songs: RN_SONGS.filter(s => s.featured) },
      { label: 'More originals', songs: RN_SONGS.filter(s => !s.featured) }
    ];
    groups.forEach(group => {
      const heading = document.createElement('li');
      heading.className = 'picker-group';
      heading.setAttribute('role', 'presentation');
      heading.textContent = group.label;
      songPickerList.append(heading);

      group.songs.forEach(song => {
        const key = keyForSong(song);
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'picker-song';
        btn.dataset.pick = key;

        const img = document.createElement('img');
        img.className = 'picker-thumb';
        img.src = song.art;
        img.alt = '';
        img.width = 56;
        img.height = 56;
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';

        const text = document.createElement('span');
        text.className = 'picker-text';
        const strong = document.createElement('strong');
        strong.textContent = song.title;
        const small = document.createElement('small');
        small.textContent = `${song.note} · ${song.length}`;
        text.append(strong, small);

        const go = document.createElement('span');
        go.className = 'picker-go';
        go.setAttribute('aria-hidden', 'true');

        btn.append(img, text, go);
        btn.addEventListener('click', () => pickSong(key));
        li.append(btn);
        songPickerList.append(li);
      });
    });
  }

  songPickerList.querySelectorAll('.picker-song').forEach(btn => {
    const current = btn.dataset.pick === selectedTrack;
    const song = songForKey(btn.dataset.pick);
    const label = song ? `${song.title} (${song.note})` : 'song';
    if (current) btn.setAttribute('aria-current', 'true');
    else btn.removeAttribute('aria-current');
    btn.setAttribute('aria-label', current ? `${label} — now playing` : `Play ${label}`);
    const go = btn.querySelector('.picker-go');
    if (go) {
      go.innerHTML = current
        ? '<span class="eq-bars"><i></i><i></i><i></i></span> Playing'
        : '▶';
    }
  });
  if (songPickerFoot) songPickerFoot.hidden = !selectedTrack;
}

function openSongPicker() {
  if (!songPicker) return;
  renderSongPicker();
  openDialog(songPicker);
  const target =
    songPickerList?.querySelector('.picker-song[aria-current="true"]') ||
    songPickerList?.querySelector('.picker-song');
  target?.focus({ preventScroll: false });
}

function closeSongPicker() {
  closeDialog(songPicker);
}

function pickSong(trackId) {
  closeSongPicker();
  if (trackId !== selectedTrack) {
    selectTrackById(trackId, { dock: true, focusPlayer: false });
  }
  heroRecord?.focus({ preventScroll: true });
}

function selectTrackById(trackId, options = { dock: true, focusPlayer: true }) {
  if (!player || !frame) return;
  const song = songForKey(trackId);
  if (!song) return;

  const title = song.title;
  const songUrl = `https://legacy.reverbnation.com/rebyen/song/${song.rn}`;

  if (trackId !== selectedTrack) {
    frame.src = reverbnationEmbedUrl(song.rn);
    selectedTrack = trackId;
    setCued(true);
  }

  frame.title = `${title} by Reb Yen — ReverbNation player`;
  if (playerTitle) playerTitle.textContent = title;
  if (stopBtn) stopBtn.hidden = false;

  if (options.dock) {
    player.classList.add('is-docked');
    document.body.classList.add('has-player');
  }
  setExpanded(true);
  updateCatalogSelection(trackId);

  const fallback = document.getElementById('player-fallback');
  if (fallback) fallback.href = songUrl;

  if (playerStatus) {
    playerStatus.textContent = `Playing ${title}. If you don't hear it, press play in the ReverbNation player.`;
  }
  setRecordStatus(trackId);

  if (options.focusPlayer) {
    player.focus({ preventScroll: true });
  }
}

function stepTrack(offset) {
  if (PLAYLIST_KEYS.length === 0) return;
  const currentIndex = PLAYLIST_KEYS.indexOf(selectedTrack);
  const nextIndex =
    currentIndex === -1
      ? offset >= 0
        ? 0
        : PLAYLIST_KEYS.length - 1
      : (currentIndex + offset + PLAYLIST_KEYS.length) % PLAYLIST_KEYS.length;
  const nextTrackId = PLAYLIST_KEYS[nextIndex];
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

// Hero turntable: the vinyl is the song selector — tapping it opens the picker.
heroRecord?.addEventListener('click', openSongPicker);
recordStopBtn?.addEventListener('click', () => {
  stopPlayer({ returnFocus: false });
  heroRecord?.focus({ preventScroll: true });
});
document.getElementById('song-picker-close')?.addEventListener('click', closeSongPicker);
document.getElementById('song-picker-stop')?.addEventListener('click', () => {
  closeSongPicker();
  stopPlayer({ returnFocus: false });
  heroRecord?.focus({ preventScroll: true });
});
// Click on the dimmed backdrop closes the picker
songPicker?.addEventListener('click', event => {
  if (event.target !== songPicker) return;
  const box = songPicker.getBoundingClientRect();
  const outside =
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom;
  if (outside) closeSongPicker();
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
      '[data-reveal], .section-head, .feature-sleeve-wrap, .upcoming, .stage-spec-panel, .about-image, .about-copy, .contact-grid > div, .press-facts'
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
    instruments: 'Lead vocals with acoustic guitar, banjo, keyboard or harmonica',
    venues: 'Listening rooms, bistros, house concerts & private gatherings',
    cta: 'Inquire about Solo →'
  },
  Duo: {
    title: 'Acoustic Duo · Harmonies & Counterpoint',
    instruments: 'Two performers with vocal harmonies, acoustic guitars & multi-instrumental textures',
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
    text: 'Now based in Boulder, performing originals and curated covers on guitar, banjo, keyboard and harmonica at Roots Music Project, St. Julien Hotel, Bricks On Main, The Alley and Attic Bistro.'
  }
];

const journeyStops = Array.from(document.querySelectorAll('.journey-stop[data-stop]'));
const journeyDetail = document.getElementById('journey-detail');
const journeyDetailTitle = document.getElementById('journey-detail-title');
const journeyDetailText = document.getElementById('journey-detail-text');

function activateJourneyStop(index, focusTab = false) {
  const chapter = JOURNEY_CHAPTERS[index];
  if (!chapter || journeyStops.length === 0) return;

  journeyStops.forEach((btn, idx) => {
    const active = idx === index;
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
}

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
