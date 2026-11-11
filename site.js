'use strict';

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let prefersReducedMotion = reducedMotionQuery.matches;
const reducedMotionCleanups = [];

function onReducedMotionChange(event) {
  prefersReducedMotion = Boolean(event.matches);
  if (prefersReducedMotion) {
    reducedMotionCleanups.forEach(fn => fn());
  } else {
    syncPlatters();
  }
}

if (typeof reducedMotionQuery.addEventListener === 'function') {
  reducedMotionQuery.addEventListener('change', onReducedMotionChange);
} else if (typeof reducedMotionQuery.addListener === 'function') {
  reducedMotionQuery.addListener(onReducedMotionChange);
}

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
  hoveredNavLink = null;
  requestNavUnderline();
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

// One shared underline follows hover/keyboard focus, then returns to the current
// section. It is decorative; aria-current remains the source of accessible state.
const navUnderline = navigation ? document.createElement('span') : null;
let hoveredNavLink = null;
let navFrame = 0;
if (navUnderline) {
  navUnderline.className = 'nav-underline';
  navUnderline.setAttribute('aria-hidden', 'true');
  navigation.append(navUnderline);
}

function positionNavUnderline() {
  navFrame = 0;
  if (!navigation || !navUnderline) return;
  const focused = navigation.contains(document.activeElement) && document.activeElement.matches(':focus-visible')
    ? document.activeElement.closest('a') : null;
  const link = hoveredNavLink || focused || navigation.querySelector('a[aria-current]');
  const navRect = navigation.getBoundingClientRect();
  if (!link || !navRect.width || !navRect.height) {
    navUnderline.classList.remove('is-visible', 'is-ready');
    return;
  }
  const range = document.createRange();
  range.selectNodeContents(link);
  const labelRect = range.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  // Underline the label, including in the full-width mobile menu.
  const width = Math.min(labelRect.width, linkRect.width - 24);
  const x = labelRect.left - navRect.left - navigation.clientLeft + navigation.scrollLeft;
  const y = linkRect.bottom - navRect.top - navigation.clientTop + navigation.scrollTop - 6;
  navUnderline.style.width = `${Math.max(0, width)}px`;
  navUnderline.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  navUnderline.classList.add('is-visible');
  // First placement and reopening a hidden mobile menu never fly in from (0,0).
  if (!navUnderline.classList.contains('is-ready')) {
    void navUnderline.offsetWidth;
    navUnderline.classList.add('is-ready');
  }
}

function requestNavUnderline() {
  if (!navFrame) navFrame = requestAnimationFrame(positionNavUnderline);
}

function updateActiveNavSection() {
  if (!sectionLinks.size) return;
  const threshold = Math.max((siteHeader?.offsetHeight || 0) + 24, window.innerHeight * 0.28);
  let active = null;
  sectionLinks.forEach((link, section) => {
    if (section.getBoundingClientRect().top <= threshold) active = link;
  });
  // The final section can be too short to reach the upper viewport marker.
  if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
    active = Array.from(sectionLinks.values()).at(-1);
  }
  sectionLinks.forEach(link => {
    if (link === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  requestNavUnderline();
}

navigation?.addEventListener('pointerover', event => {
  if (event.pointerType === 'touch') return;
  hoveredNavLink = event.target.closest('a');
  requestNavUnderline();
});
navigation?.addEventListener('pointerleave', () => {
  hoveredNavLink = null;
  requestNavUnderline();
});
navigation?.addEventListener('focusin', requestNavUnderline);
navigation?.addEventListener('focusout', requestNavUnderline);
window.addEventListener('resize', updateActiveNavSection, { passive: true });
window.addEventListener('pageshow', updateActiveNavSection);
window.addEventListener('hashchange', updateActiveNavSection);
document.fonts?.ready.then(requestNavUnderline);
if ('ResizeObserver' in window && navigation) {
  new ResizeObserver(requestNavUnderline).observe(navigation);
}
reducedMotionCleanups.push(() => {
  navUnderline?.getAnimations().forEach(animation => animation.cancel());
  requestNavUnderline();
});

// ============================================================================
// Header Scroll-Progress Bar & Subtle Hero Parallax
// ============================================================================
const scrollProgress = document.getElementById('scroll-progress');
const heroSection = document.getElementById('home');
let scrollTicking = false;

function updateScrollEffects() {
  scrollTicking = false;
  updateActiveNavSection();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;

  if (scrollProgress) {
    const ratio = docHeight > 0 ? Math.min(1, Math.max(0, scrollTop / docHeight)) : 0;
    scrollProgress.style.setProperty('--scroll-ratio', ratio.toFixed(4));
  }

  if (heroSection) {
    if (!prefersReducedMotion && window.innerWidth > 700 && scrollTop < 700) {
      const offset = Math.min(36, Math.round(scrollTop * 0.07));
      heroSection.style.setProperty('--hero-parallax', `${offset}px`);
    } else if (prefersReducedMotion) {
      heroSection.style.removeProperty('--hero-parallax');
    }
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
const TRACK_ORDER = ["33863436","32896520","33992872","33391779","33355990","32930467","33993499","33866102","32896774","32929366","32981405","32557441","32901138","32563022","32693242","32520637","33353012","32943176","32178754","31360418","32271655","31438949"];

const TRACK_META = {
  "33863436": {
    num: "01",
    title: "Take Me Crazy",
    vinyl: "TAKE ME\nCRAZY",
    catNo: "RY-01 · ORIGINAL",
    duration: "3:48",
    eyebrow: "Featured original · ReverbNation Spotlight",
    subtitle: "A realistic love song · studio recording · 3:48 · ReverbNation Featured",
    desc: "Reb calls it a realistic love song: candid, playful and about accepting one another as we are. Written, arranged and performed by Reb — guitar, vocals, banjo, keyboard and cajon.",
    img: "images/songs/rn-35118509.jpg",
    lpIdleImg: "images/featured-reb-guitar.jpg",
    pos: "50% 42%",
    alt: "Reb Yen — Take Me Crazy artwork",
    caption: "Written, arranged & performed by Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-1"
  },
  "32896520": {
    num: "02",
    title: "The Solitude (Live)",
    vinyl: "THE\nSOLITUDE",
    catNo: "RY-02 · LIVE",
    duration: "1:34",
    eyebrow: "Original song · Live recording",
    subtitle: "Original live performance · guitar & vocals · 1:34",
    desc: "Captured live on stage—an atmospheric acoustic original showcasing Reb’s guitar work and expressive storytelling.",
    img: "images/songs/rn-35623740.jpg",
    pos: "50% 36%",
    alt: "Reb Yen performing The Solitude live with acoustic guitar",
    caption: "Live performance · Guitar & vocals by Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-4"
  },
  "33992872": {
    num: "03",
    title: "A New Beginning",
    vinyl: "A NEW\nBEGINNING",
    catNo: "RY-03 · STUDIO",
    duration: "3:03",
    eyebrow: "Original song · Studio recording",
    subtitle: "On loss, remembrance & beginning again · studio recording · 3:03",
    desc: "Written on loss, remembrance and beginning again—“Don’t call it the end; it’s a new beginning.” Performed by Reb on acoustic guitar, vocals and cello keyboard.",
    img: "images/songs/rn-35284339.jpg",
    pos: "50% 34%",
    alt: "Reb Yen performing A New Beginning with acoustic guitar",
    caption: "Written, arranged & performed by Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-5"
  },
  "33391779": {
    num: "04",
    title: "Are You Listening Now?",
    vinyl: "ARE YOU\nLISTENING",
    catNo: "RY-04 · STUDIO",
    duration: "3:10",
    eyebrow: "Original song · Studio recording",
    subtitle: "Original studio remake · all instruments & vocals by Reb · 3:10",
    desc: "An original studio recording blending folk-rock urgency with Reb’s direct songwriting—featuring acoustic and electric guitars, layered vocals, bass and drums by Reb.",
    img: "images/songs/rn-34023239.jpg",
    pos: "50% 35%",
    alt: "Stage portrait of Reb Yen at the microphone",
    caption: "Original studio recording · All tracks by Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-6"
  },
  "33355990": {
    num: "05",
    title: "Should I?",
    vinyl: "SHOULD\nI?",
    catNo: "RY-05 · STUDIO",
    duration: "3:08",
    eyebrow: "Original studio recording · ReverbNation Spotlight",
    subtitle: "Original studio recording · 3:08 · ReverbNation Featured",
    desc: "An original studio recording written, arranged and performed by Reb on vocals, rhythm guitar, lead guitar and cajon—one of three songs featured on ReverbNation.com’s featured artist page.",
    img: "images/songs/rn-35163458.jpg",
    pos: "50% 36%",
    alt: "Reb Yen singing and playing sunburst acoustic guitar on stage",
    caption: "Original studio recording · All tracks by Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-2"
  },
  "32930467": {
    num: "06",
    title: "Missing Clues (Live)",
    vinyl: "MISSING\nCLUES",
    catNo: "RY-06 · LIVE",
    duration: "1:24",
    eyebrow: "Original song · Live recording",
    subtitle: "Original live duet · acoustic guitar, harmonica & vocals · 1:24",
    desc: "Written and performed live by Reb Yen (guitar, vocals) and Jim O’Rourke (harmonica, vocals)—tracing life’s mysteries, missing pages and untold stories.",
    img: "images/songs/rn-34053201.jpg",
    pos: "50% 42%",
    alt: "Double-exposure silhouette artwork by the water",
    caption: "Live performance · Reb Yen & Jim O’Rourke",
    href: "#music",
    lyricsHref: "songbook.html#song-10"
  },
  "33993499": {
    num: "07",
    title: "Gotta Let It Go",
    vinyl: "GOTTA LET\nIT GO",
    catNo: "RY-07 · ORIGINAL",
    duration: "3:35",
    eyebrow: "Featured original · ReverbNation Spotlight",
    subtitle: "About knowing when to let go · studio recording · 3:35 · ReverbNation Featured",
    desc: "Written, arranged and performed by Reb (vocals, guitar, cajon) about knowing when to step back, heal and move forward—featured on ReverbNation.com’s featured artist page.",
    img: "images/songs/rn-35109995.jpg",
    pos: "50% 38%",
    alt: "Reb Yen playing acoustic guitar on stage",
    caption: "Written, arranged & performed by Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-3"
  },
  "33866102": {
    num: "08",
    title: "Birds Of Prey (Live)",
    vinyl: "BIRDS OF\nPREY",
    catNo: "RY-08 · LIVE",
    duration: "2:37",
    eyebrow: "Original song · Live recording",
    subtitle: "Original live recording · guitar & vocals · 2:37",
    desc: "Recorded live on stage with guitar and vocals, bringing raw acoustic immediacy to Reb’s songwriting about reclaiming your own sky.",
    img: "images/songs/rn-34053201.jpg",
    pos: "50% 42%",
    alt: "Birds Of Prey song artwork",
    caption: "Original live recording · Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-7"
  },
  "32896774": {
    num: "09",
    title: "Take A Stand (Live)",
    vinyl: "TAKE A\nSTAND",
    catNo: "RY-09 · LIVE",
    duration: "3:06",
    eyebrow: "Original song · Live recording",
    subtitle: "Original live recording · conviction & acoustic rhythm · 3:06",
    desc: "A live original recording driven by conviction, acoustic rhythm and the immediacy of the stage.",
    img: "images/songs/rn-35163458.jpg",
    pos: "50% 36%",
    alt: "Reb Yen singing and playing acoustic guitar on stage",
    caption: "Original live recording · Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-8"
  },
  "32929366": {
    num: "10",
    title: "I Can Feel U",
    vinyl: "I CAN\nFEEL U",
    catNo: "RY-10 · STUDIO",
    duration: "2:56",
    eyebrow: "Original song · Studio recording",
    subtitle: "Original studio recording · guitar & vocals · 2:56",
    desc: "An atmospheric original collaboration © 2021 by Reb Yen (guitar, vocals) and Jim O’Rourke (lead guitar, backing vocals).",
    img: "images/songs/rn-portrait.jpg",
    pos: "50% 32%",
    alt: "Portrait of Reb Yen with her acoustic guitar",
    caption: "I Can Feel U © 2021 Reb Yen & Jim O’Rourke",
    href: "#music",
    lyricsHref: "songbook.html#song-11"
  },
  "32981405": {
    num: "11",
    title: "In Cyber Love (Live)",
    vinyl: "IN CYBER\nLOVE",
    catNo: "RY-11 · LIVE",
    duration: "1:49",
    eyebrow: "Original song · Live recording",
    subtitle: "Original live performance · vocals & acoustic guitar · 1:49",
    desc: "Performed live by Reb on vocals and acoustic guitar—a sharp, bittersweet reflection on modern connection and “text message lovers” in cyberspace.",
    img: "images/songs/rn-35163458.jpg",
    pos: "50% 36%",
    alt: "Reb Yen performing live on acoustic guitar",
    caption: "Live performance · Written & performed by Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-12"
  },
  "32557441": {
    num: "12",
    title: "Out Of Body",
    vinyl: "OUT OF\nBODY",
    catNo: "RY-12 · STUDIO",
    duration: "3:19",
    eyebrow: "Original song · Studio recording",
    subtitle: "Original studio recording · guitar, vocals & keyboard · 3:19",
    desc: "An introspective studio original exploring night-sky perspective and reflection, performed by Reb on guitar, vocals and keyboard.",
    img: "images/songs/rn-portrait.jpg",
    pos: "50% 32%",
    alt: "Portrait of Reb Yen with her acoustic guitar",
    caption: "Original studio recording · Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-9"
  },
  "32901138": {
    num: "13",
    title: "Time Machine (Live)",
    vinyl: "TIME\nMACHINE",
    catNo: "RY-13 · LIVE",
    duration: "2:32",
    eyebrow: "Original song · Live recording",
    subtitle: "Original live recording · finding your dream again · 2:32",
    desc: "“Wish I could take you in my time machine, to that time when you had a dream.” Performed live with Reb on lead vocals and rhythm guitar.",
    img: "images/songs/rn-34053201.jpg",
    pos: "50% 42%",
    alt: "Time Machine song artwork",
    caption: "Live recording · Written by Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-13"
  },
  "32563022": {
    num: "14",
    title: "The Storm (Live)",
    vinyl: "THE\nSTORM",
    catNo: "RY-14 · LIVE",
    duration: "3:09",
    eyebrow: "Original song · Live recording",
    subtitle: "Original live recording · acoustic guitar & harmonica · 3:09",
    desc: "A urgent, dramatic live original written and arranged by Reb—featuring acoustic guitar, harmonica solo and electric lead.",
    img: "images/songs/rn-34023522.jpg",
    pos: "50% 50%",
    alt: "Circular double-exposure silhouette artwork for The Storm",
    caption: "The Storm © 2021 Reb Yen · Live recording",
    href: "#music",
    lyricsHref: "songbook.html#song-14"
  },
  "32693242": {
    num: "15",
    title: "For You To Know (Live)",
    vinyl: "FOR YOU\nTO KNOW",
    catNo: "RY-15 · LIVE",
    duration: "2:41",
    eyebrow: "Original song · Live recording",
    subtitle: "Intimate live original · vocals & acoustic guitar · 2:41",
    desc: "Written and performed solo live by Reb on vocals and acoustic guitar—a tender remembrance of love, memory and devotion.",
    img: "images/songs/rn-34053201.jpg",
    pos: "50% 42%",
    alt: "For You To Know song artwork",
    caption: "For You To Know © 2019 Reb Yen · Live acoustic",
    href: "#music",
    lyricsHref: "songbook.html#song-15"
  },
  "32520637": {
    num: "16",
    title: "Crawled To The Edge (1st Draft)",
    vinyl: "CRAWLED TO\nTHE EDGE",
    catNo: "RY-16 · DRAFT",
    duration: "2:35",
    eyebrow: "Original song · First-draft recording",
    subtitle: "Original first-draft recording · raw songwriter work-tape · 2:35",
    desc: "An intimate first-draft original recording capturing the raw spark of Reb’s songwriting process as the arrangement first took shape.",
    img: "images/songs/rn-33848828.jpg",
    pos: "46% 36%",
    alt: "Reb Yen smiling under warm stage string lights",
    caption: "Original first-draft recording · Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-16"
  },
  "33353012": {
    num: "17",
    title: "RSVP (Live)",
    vinyl: "RSVP\nLIVE",
    catNo: "RY-17 · LIVE",
    duration: "3:03",
    eyebrow: "Original song · Live recording",
    subtitle: "Original live performance · guitar, harmonica & vocals · 3:03",
    desc: "Captured live on stage—RSVP showcases Reb’s dynamic live phrasing, acoustic rhythm guitar and stage presence.",
    img: "images/songs/rn-35217783.jpg",
    pos: "48% 30%",
    alt: "Reb Yen singing live with acoustic guitar and harmonica",
    caption: "RSVP © 2019 Reb Yen · Live performance",
    href: "#music",
    lyricsHref: "songbook.html#song-17"
  },
  "32943176": {
    num: "18",
    title: "Shut In World",
    vinyl: "SHUT IN\nWORLD",
    catNo: "RY-18 · STUDIO",
    duration: "2:23",
    eyebrow: "Original song · Studio collaboration",
    subtitle: "Original collaboration · Reb Yen & Jim O’Rourke · 2:23",
    desc: "A spirited commentary on tuning out the noise and choosing empathy—music and arrangement by Reb Yen and Jim O’Rourke.",
    img: "images/songs/rn-portrait.jpg",
    pos: "50% 32%",
    alt: "Portrait of Reb Yen with acoustic guitar",
    caption: "Shut In World © Reb Yen & Jim O’Rourke",
    href: "#music",
    lyricsHref: "songbook.html#song-18"
  },
  "32178754": {
    num: "19",
    title: "Birds Of Prey (Solo Version)",
    vinyl: "BIRDS OF\nPREY SOLO",
    catNo: "RY-19 · SOLO",
    duration: "2:14",
    eyebrow: "Original song · Solo acoustic version",
    subtitle: "Original solo version · stripped-back guitar & vocals · 2:14",
    desc: "The stripped-back solo acoustic version of Birds Of Prey—putting Reb’s lyric and vocal delivery front and center.",
    img: "images/songs/rn-34053201.jpg",
    pos: "50% 42%",
    alt: "Birds Of Prey solo version artwork",
    caption: "Birds Of Prey © 2020 Reb Yen · Solo version",
    href: "#music",
    lyricsHref: "songbook.html#song-19"
  },
  "31360418": {
    num: "20",
    title: "Dancing With My Cell (Live)",
    vinyl: "DANCING\nWITH CELL",
    catNo: "RY-20 · LIVE",
    duration: "1:58",
    eyebrow: "Original song · Live recording",
    subtitle: "Playful live original · upbeat acoustic groove · 1:58",
    desc: "Witty, upbeat live original about skipping the drama and dancing happily on your own—“I can dance with my own cell phone.”",
    img: "images/songs/rn-33848828.jpg",
    pos: "46% 36%",
    alt: "Reb Yen smiling under warm cafe lights",
    caption: "Dancing With My Cell © Reb Yen · Live performance",
    href: "#music",
    lyricsHref: "songbook.html#song-20"
  },
  "32271655": {
    num: "21",
    title: "The Solitude (Full Version)",
    vinyl: "SOLITUDE\nFULL",
    catNo: "RY-21 · FULL",
    duration: "2:56",
    eyebrow: "Original song · Full-length version",
    subtitle: "Full-length original recording · complete arrangement · 2:56",
    desc: "The complete 2:56 version of The Solitude—“Where it dazzles in your sky that’s where you go / When the music’s in your soul that’s when you’re home.”",
    img: "images/songs/rn-portrait.jpg",
    pos: "50% 32%",
    alt: "Portrait of Reb Yen with her acoustic guitar",
    caption: "The Solitude (Full Version) © Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-21"
  },
  "31438949": {
    num: "22",
    title: "Are You Listening? (Live)",
    vinyl: "ARE YOU\nLISTENING",
    catNo: "RY-22 · LIVE",
    duration: "2:30",
    eyebrow: "Original song · Live version",
    subtitle: "Original live version · “Gotta be your own fan” · 2:30",
    desc: "Live stage version of Are You Listening?—capturing the raw acoustic energy of its bridge: “Gotta do it for yourself… gotta be your own fan.”",
    img: "images/songs/rn-34023239.jpg",
    pos: "50% 35%",
    alt: "Stage portrait of Reb Yen singing at the microphone",
    caption: "Are You Listening? (Live) © Reb Yen",
    href: "#music",
    lyricsHref: "songbook.html#song-22"
  }
};

// ----------------------------------------------------------------------------
// "What Kind of Moment Are You In?" — Proposed Song Pairings
// ----------------------------------------------------------------------------
// Maintenance note for Reb:
// - Update any explanation, lyric line, or photo right here.
// - To add a 20–30 second recorded voice introduction for any song later,
//   upload the audio clip (e.g. 'audio/intro-a-new-beginning.mp3') and set
//   introSrc to that path (plus optional introDuration, e.g. '0:26').
//   The voice-intro button appears automatically whenever introSrc is set.
const MOMENT_PAIRINGS = {
  'starting-over': {
    slug: 'starting-over',
    momentLabel: 'Starting over',
    trackId: '33992872',
    songTitle: 'A New Beginning',
    lyricsHref: 'songbook.html#song-5',
    img: 'images/newbeginning.jpg',
    imgWidth: 480,
    imgHeight: 360,
    imgPos: '50% 56%',
    imgScale: '1.38',
    alt: 'Reb Yen performing A New Beginning live with acoustic guitar and harmonica',
    caption: 'A New Beginning · Live at The Copper Rocket',
    why: 'Written about turning the page after loss or a closed chapter—honoring the years behind you while finding the strength to climb back up and begin again.',
    lyric: '“As the pages turn, and your soul is set free… Don’t call it the end; it’s a new beginning.”',
    introSrc: null,
    introLabel: 'Hear Reb’s story behind this song',
    introDuration: '0:25'
  },
  'letting-go': {
    slug: 'letting-go',
    momentLabel: 'Letting go',
    trackId: '33993499',
    songTitle: 'Gotta Let It Go',
    lyricsHref: 'songbook.html#song-3',
    img: 'images/gotta_let_it_go.jpg',
    imgWidth: 480,
    imgHeight: 360,
    imgPos: '50% 50%',
    imgScale: '1.24',
    imgOrigin: '50% 44%',
    alt: 'Reb Yen singing Gotta Let It Go with acoustic guitar',
    caption: 'Gotta Let It Go · Original recording',
    why: 'For the moment you stop trying to force a story that isn’t working—and finally give yourself room to step back, heal, and move forward.',
    lyric: '“Gotta let it go when it’s falling apart… time to heal, time to recover.”',
    introSrc: null,
    introLabel: 'Hear Reb’s story behind this song',
    introDuration: '0:25'
  },
  'love-is-complicated': {
    slug: 'love-is-complicated',
    momentLabel: 'Love is complicated',
    trackId: '33863436',
    songTitle: 'Take Me Crazy',
    lyricsHref: 'songbook.html#song-1',
    img: 'images/take_me_crazy.jpg',
    imgWidth: 480,
    imgHeight: 360,
    imgPos: '56% 42%',
    imgScale: '1.14',
    alt: 'Reb Yen performing Take Me Crazy live in Nashville',
    caption: 'Take Me Crazy · Live in Nashville',
    why: 'Skips fairy-tale perfection for real-world love—the tug-of-war, the humor in the middle ground, and choosing each other honestly as we actually are.',
    lyric: '“Cause it’s never all or nothing, just something in between… Take me as I am, and I’ll take you as you are.”',
    introSrc: null,
    introLabel: 'Hear Reb’s story behind this song',
    introDuration: '0:25'
  },
  'finding-my-own-way': {
    slug: 'finding-my-own-way',
    momentLabel: 'Finding my own way',
    trackId: '32896520',
    songTitle: 'The Solitude',
    lyricsHref: 'songbook.html#song-4',
    img: 'images/about-solitude.jpg',
    imgWidth: 434,
    imgHeight: 544,
    imgPos: '46% 8%',
    imgScale: '1',
    alt: 'Reb Yen performing The Solitude live at Roots Music Project',
    caption: 'The Solitude · Live at Roots Music Project',
    why: 'Turns quietness from loneliness into self-direction—trusting your own inner compass when the road ahead feels undecided.',
    lyric: '“Where it dazzles in your sky that’s where you go / When the music’s in your soul that’s when you know.”',
    introSrc: null,
    introLabel: 'Hear Reb’s story behind this song',
    introDuration: '0:25'
  },
  'ready-to-speak-up': {
    slug: 'ready-to-speak-up',
    momentLabel: 'Ready to speak up',
    trackId: '32896774',
    songTitle: 'Take A Stand',
    lyricsHref: 'songbook.html#song-8',
    img: 'images/are_you_listening.jpg',
    imgWidth: 480,
    imgHeight: 360,
    imgPos: '52% 46%',
    imgScale: '1.12',
    alt: 'Reb Yen singing and playing acoustic guitar live on stage',
    caption: 'Take A Stand · Live original recording',
    why: 'Driven by live acoustic urgency, this song meets the moment you stop watching from the sidelines and step forward for someone—or something—that matters.',
    lyric: '“Don’t just sit while it goes by, got a cause don’t let it die… You’ve gotta take a stand.”',
    introSrc: null,
    introLabel: 'Hear Reb’s story behind this song',
    introDuration: '0:25'
  }
};
let syncMomentListenState = () => {};

const player = document.getElementById('music-player');
const frame = document.getElementById('reverbnation-player');
const playerBody = document.getElementById('player-body');
const playerEyebrow = document.getElementById('player-eyebrow');
const playerTitle = document.getElementById('player-title');
const minimizeBtn = document.getElementById('player-minimize');
const stopBtn = document.getElementById('player-stop');
const prevBtn = document.getElementById('player-prev');
const nextBtn = document.getElementById('player-next');
const playerStatus = document.getElementById('player-status');
const heroTurntable = document.getElementById('hero-turntable');
const heroRecord = document.getElementById('hero-record');
const heroDisc = heroRecord?.querySelector('.disc') || null;
const recordCta = document.getElementById('record-cta');
const recordCtaText = document.getElementById('record-cta-text');
const recordLabelTitle = document.getElementById('record-label-title');
const recordNowLabel = document.getElementById('record-now-label');
const recordNowLabelText = document.getElementById('record-now-label-text');
const recordNowTitle = document.getElementById('record-now-title');
const recordStopBtn = document.getElementById('record-stop-btn');
const songPicker = document.getElementById('song-picker');
const songPickerList = document.getElementById('song-picker-list');
const songPickerFoot = document.getElementById('song-picker-foot');

const featureSleeve = document.getElementById('feature-sleeve');
const lpPlaySurface = document.getElementById('lp-play-surface');
const sleeveDisc = featureSleeve?.querySelector('.sleeve-vinyl') || null;
const sleeveVinylLabel = document.getElementById('sleeve-vinyl-label');
const featuredImg = document.getElementById('featured-img');
const featuredCaption = document.getElementById('featured-caption');
const featuredCoverTitle = document.getElementById('featured-cover-title');
const featuredCatNo = document.getElementById('featured-cat-no');
const featuredEyebrow = document.getElementById('featured-eyebrow');
const featuredHeading = document.getElementById('featured-heading');
const featuredDesc = document.getElementById('featured-desc');
const featuredListenBtn = document.getElementById('featured-listen-btn');
const featuredListenLabel = document.getElementById('featured-listen-label');
const featuredLyricsLink = document.getElementById('featured-lyrics-link');

const catalogRows = Array.from(document.querySelectorAll('.song-row[data-song]'));
let selectedTrack = null;
let sleeveSwapTimer = 0;

// This cross-origin player exposes no verified playback state. Selection and
// iframe focus are not evidence that audio is playing.
let isCued = false;
let albumMotionOff = false;
try {
  window.localStorage.removeItem('rebyen_album_motion_off');
} catch {
  // Ignore storage restrictions
}
document.documentElement.classList.remove('album-motion-off');

function isAlbumMotionDisabled() {
  return Boolean(prefersReducedMotion || albumMotionOff);
}

function createVinylPlatterController(el, baseTransform = '', rpmMs = 2800) {
  let spinAnim = null;
  let coastAnim = null;
  let rampRaf = 0;
  let isSpinning = false;
  let speedMult = 1;

  function getRotationDeg() {
    if (!el) return 0;
    const tr = window.getComputedStyle(el).transform;
    if (!tr || tr === 'none') return 0;
    const m = tr.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const parts = m[1].split(',').map(Number);
    const angle = Math.atan2(parts[1], parts[0]) * (180 / Math.PI);
    return ((angle % 360) + 360) % 360;
  }

  function stopImmediate() {
    isSpinning = false;
    if (rampRaf) {
      cancelAnimationFrame(rampRaf);
      rampRaf = 0;
    }
    if (spinAnim) {
      spinAnim.cancel();
      spinAnim = null;
    }
    if (coastAnim) {
      coastAnim.cancel();
      coastAnim = null;
    }
    el?.style.removeProperty('transform');
  }

  function start() {
    if (!el || typeof el.animate !== 'function' || isAlbumMotionDisabled()) {
      stopImmediate();
      return;
    }
    if (isSpinning && spinAnim) return;

    const startDeg = getRotationDeg();
    if (coastAnim) {
      coastAnim.cancel();
      coastAnim = null;
    }
    if (rampRaf) {
      cancelAnimationFrame(rampRaf);
      rampRaf = 0;
    }

    spinAnim = el.animate(
      [
        { transform: `${baseTransform}rotate(${startDeg}deg)` },
        { transform: `${baseTransform}rotate(${startDeg + 360}deg)` }
      ],
      { duration: rpmMs, iterations: Infinity, easing: 'linear' }
    );
    isSpinning = true;
    spinAnim.playbackRate = 0.25;

    const t0 = performance.now();
    const rampDuration = 360;
    function ramp(now) {
      if (!spinAnim || !isSpinning || isAlbumMotionDisabled()) {
        rampRaf = 0;
        if (isAlbumMotionDisabled()) stopImmediate();
        return;
      }
      const p = Math.min(1, (now - t0) / rampDuration);
      spinAnim.playbackRate = (0.25 + 0.75 * (1 - Math.pow(1 - p, 2))) * speedMult;
      if (p < 1) {
        rampRaf = requestAnimationFrame(ramp);
      } else {
        spinAnim.playbackRate = speedMult;
        rampRaf = 0;
      }
    }
    rampRaf = requestAnimationFrame(ramp);
  }

  function easeToStop() {
    if (!el) return;
    if (isAlbumMotionDisabled() || typeof el.animate !== 'function') {
      stopImmediate();
      return;
    }
    if (!isSpinning) return;

    isSpinning = false;
    if (rampRaf) {
      cancelAnimationFrame(rampRaf);
      rampRaf = 0;
    }
    const startDeg = getRotationDeg();
    if (spinAnim) {
      spinAnim.cancel();
      spinAnim = null;
    }

    const rem = (360 - startDeg) % 360;
    const coastDelta = rem < 55 ? rem + 360 : rem;
    const duration = Math.round(720 + (coastDelta / 360) * 760);

    const coast = el.animate(
      [
        { transform: `${baseTransform}rotate(${startDeg}deg)` },
        { transform: `${baseTransform}rotate(${startDeg + coastDelta}deg)` }
      ],
      { duration, easing: 'cubic-bezier(0.14, 0.74, 0.26, 1)' }
    );
    coastAnim = coast;
    coast.onfinish = coast.oncancel = () => {
      // A cancelled, older coast must not clear a newer animation's handle.
      if (coastAnim === coast) coastAnim = null;
    };
  }

  function setSpeedMultiplier(mult) {
    speedMult = mult || 1;
    if (spinAnim && isSpinning && !rampRaf) {
      spinAnim.playbackRate = speedMult;
    }
  }

  return { start, easeToStop, stopImmediate, setSpeedMultiplier };
}

const heroPlatter = createVinylPlatterController(heroDisc, '', 2800);
const sleevePlatter = createVinylPlatterController(sleeveDisc, 'translateY(-50%) ', 3400);

// Album motion toggle buttons removed

function syncPlatters() {
  if (isAlbumMotionDisabled() || document.hidden) {
    heroPlatter.stopImmediate();
    sleevePlatter.stopImmediate();
    return;
  }
  // Decorative motion follows the visitor's song selection, not playback.
  // The embedded player cannot reliably report play, pause, or track changes.
  const shouldSpin = Boolean(selectedTrack);
  // Hero record: idle "attract" spin draws attention to the control; every
  // spin pauses while the song picker is open (the visitor is choosing).
  const pickerEl = document.getElementById('song-picker');
  const picking = Boolean(pickerEl && !pickerEl.hidden);
  heroTurntable?.classList.toggle('is-attract', !shouldSpin);
  heroTurntable?.classList.toggle('is-picking', picking);
  if (shouldSpin && !picking) {
    heroPlatter.start();
  } else {
    heroPlatter.easeToStop();
  }
  if (shouldSpin) {
    sleevePlatter.start();
  } else {
    sleevePlatter.easeToStop();
  }
}

document.addEventListener('visibilitychange', syncPlatters);

reducedMotionCleanups.push(() => {
  heroPlatter.stopImmediate();
  sleevePlatter.stopImmediate();
  heroSection?.style.removeProperty('--hero-parallax');
  heroTurntable?.classList.add('has-entered');
  
});


if (heroTurntable) {
  heroTurntable.classList.add('is-attract');
  if (isAlbumMotionDisabled()) {
    heroTurntable.classList.add('has-entered');
  } else {
    window.setTimeout(() => {
      heroTurntable.classList.add('has-entered');
    }, 1350);
  }
}

function reverbnationEmbedUrl(trackId) {
  const idx = TRACK_ORDER.indexOf(String(trackId));
  if (idx !== -1) {
    return `https://www.reverbnation.com/widget_code/html_widget/artist_6720947?widget_id=55&pwc[included_songs]=1&pwc[track]=${idx}&pwc[size]=small&pwc[autoplay]=1&_t=${Date.now()}`;
  }
  return `https://www.reverbnation.com/widget_code/html_widget/artist_6720947?widget_id=55&pwc[included_songs]=0&pwc[song_ids]=${encodeURIComponent(trackId)}&context_type=song&pwc[size]=small&pwc[autoplay]=1&_t=${Date.now()}`;
}

// Let the embedded playlist manage its own next-track behavior. A duration
// timer cannot know about pauses, buffering, seeks, or blocked autoplay.
function setCued(cued) {
  isCued = Boolean(cued && selectedTrack);
  player?.classList.toggle('is-cued', isCued);
  heroRecord?.classList.toggle('is-cued', isCued);
  featureSleeve?.classList.toggle('is-cued', isCued);
  syncPlatters();
}

function updateJukeboxSleeve(trackId, isPlaying) {
  const isIdle = !trackId || !TRACK_META[trackId];
  const effectiveId = isIdle ? '33863436' : trackId;
  const meta = TRACK_META[effectiveId];
  if (!meta) return;
  const targetSleeveImg = isIdle && meta.lpIdleImg ? meta.lpIdleImg : meta.img;
  const targetSleevePos = isIdle && meta.lpIdleImg ? '50% 24%' : (meta.pos || '50% 45%');

  if (sleeveVinylLabel) sleeveVinylLabel.textContent = meta.vinyl;
  if (featuredCoverTitle) featuredCoverTitle.textContent = meta.title;
  if (featuredCatNo) featuredCatNo.textContent = meta.catNo || 'ORIGINAL';
  if (featuredEyebrow) featuredEyebrow.textContent = meta.eyebrow;
  if (featuredHeading) featuredHeading.textContent = meta.title;
  if (featuredDesc) featuredDesc.textContent = meta.desc;
  if (featuredCaption) featuredCaption.textContent = meta.caption;

  const lpBackCat = document.getElementById('lp-back-cat');
  const lpBackTitle = document.getElementById('lp-back-title');
  const lpBackDesc = document.getElementById('lp-back-desc');
  const lpBackLyrics = document.getElementById('lp-back-lyrics');
  if (lpBackCat) lpBackCat.textContent = `${meta.catNo || 'ORIGINAL'} · BOULDER, COLORADO`;
  if (lpBackTitle) lpBackTitle.textContent = meta.title;
  if (lpBackDesc) lpBackDesc.textContent = meta.desc;
  if (lpBackLyrics) {
    lpBackLyrics.href = meta.lyricsHref || 'songbook.html#song-1';
    lpBackLyrics.dataset.songHash = (meta.lyricsHref || 'songbook.html#song-1').split('#')[1] || 'song-1';
    lpBackLyrics.dataset.trackId = effectiveId;
  }
  if (typeof renderBackCoverSongbook === 'function') {
    renderBackCoverSongbook(effectiveId);
  }

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
  if (lpPlaySurface) {
    lpPlaySurface.setAttribute('aria-label', `Play featured song: ${meta.title}`);
  }

  if (featuredImg && featuredImg.getAttribute('src') !== targetSleeveImg) {
    clearTimeout(sleeveSwapTimer);
    if (!isAlbumMotionDisabled()) {
      featureSleeve?.classList.add('is-swapping-disc');
    }
    const applyLpImgStyles = () => {
      featuredImg.style.setProperty('--lp-pos', targetSleevePos);
      featuredImg.style.setProperty('--lp-scale', meta.scale || '1');
      featuredImg.style.setProperty('--lp-origin', meta.origin || 'center center');
      featuredImg.classList.toggle('is-brightened', Boolean(meta.bright));
    };

    const applyImg = () => {
      featuredImg.onload = () => featuredImg.classList.remove('is-swapping');
      featuredImg.setAttribute('src', targetSleeveImg);
      featuredImg.alt = meta.alt;
      applyLpImgStyles();
      featureSleeve?.classList.remove('is-swapping-disc');
      if (featuredImg.complete) featuredImg.classList.remove('is-swapping');
    };

    if (!isAlbumMotionDisabled()) {
      featuredImg.classList.add('is-swapping');
      sleeveSwapTimer = window.setTimeout(applyImg, 180);
    } else {
      applyImg();
    }
  } else if (featuredImg) {
    featuredImg.style.setProperty('--lp-pos', targetSleevePos);
    featuredImg.style.setProperty('--lp-scale', meta.scale || '1');
    featuredImg.style.setProperty('--lp-origin', meta.origin || 'center center');
    featuredImg.classList.toggle('is-brightened', Boolean(meta.bright));
  }

  featureSleeve?.classList.toggle('has-selection', !isIdle);
}

lpPlaySurface?.addEventListener('click', () => featuredListenBtn?.click());
// The vinyl peeking out of the sleeve plays the featured song too.
sleeveDisc?.addEventListener('click', () => {
  if (featureSleeve?.classList.contains('is-flipped')) return;
  featuredListenBtn?.click();
});

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
  syncMomentListenState();
}

function setRecordStatus(trackId) {
  if (!heroRecord) return;
  const isLoaded = Boolean(trackId);
  if (isLoaded && heroTurntable) {
    heroTurntable.classList.add('has-entered');
  }
  const name = (trackId && TRACK_META[trackId]?.title) || 'this song';

  heroRecord.classList.toggle('selected', isLoaded);
  heroRecord.setAttribute(
    'aria-label',
    isLoaded ? `Change song — ${name} selected` : 'Tap to pick a song'
  );
  if (recordLabelTitle) recordLabelTitle.textContent = isLoaded ? name : 'Tap to pick a song';

  if (recordNowLabel) {
    if (recordNowLabelText) {
      recordNowLabelText.textContent = 'Selected song';
    }
    recordNowLabel.hidden = !isLoaded;
  }
  if (playerEyebrow) {
    playerEyebrow.innerHTML = isLoaded
      ? 'Selected song'
      : 'Music player';
  }
  syncPlatters();
  if (recordNowTitle) {
    if (isLoaded) {
      recordNowTitle.textContent = name;
    } else {
      recordNowTitle.innerHTML = '<span>A</span><span>Voice</span><span>All</span><span>Her</span><span>Own</span>';
    }
    recordNowTitle.classList.toggle('is-idle', !isLoaded);
  }
  if (recordStopBtn) recordStopBtn.hidden = !isLoaded;

  const statusMsg = !isLoaded
    ? ''
    : `“${name}” selected · use the music player to play or pause`;
  if (recordCta) recordCta.hidden = !isLoaded;
  if (recordCtaText) recordCtaText.textContent = statusMsg;
  else if (recordCta) recordCta.textContent = statusMsg;

  renderSongPicker();
}

// ----------------------------------------------------------------------------
// Song picker pop-up (all 22 ReverbNation songs with images, search & playback)
// ----------------------------------------------------------------------------
const songPickerSearch = document.getElementById('song-picker-search');
const songPickerCount = document.getElementById('song-picker-count');
const songPickerEmpty = document.getElementById('song-picker-empty');

function filterSongPickerList() {
  if (!songPickerList) return;
  const q = (songPickerSearch?.value || '').trim().toLowerCase();
  let shown = 0;
  songPickerList.querySelectorAll('li').forEach(li => {
    const btn = li.querySelector('.picker-song');
    const id = btn?.dataset.pick || '';
    const meta = TRACK_META[id];
    const hay = meta
      ? `${meta.num} ${meta.title} ${meta.subtitle} ${meta.desc}`.toLowerCase()
      : (li.textContent || '').toLowerCase();
    const match = !q || hay.includes(q);
    li.hidden = !match;
    if (match) shown++;
  });
  if (songPickerCount) {
    songPickerCount.textContent = q
      ? `${shown} of ${TRACK_ORDER.length}`
      : `${TRACK_ORDER.length} songs`;
  }
  if (songPickerEmpty) {
    songPickerEmpty.hidden = shown > 0;
  }
}

function renderSongPicker() {
  if (!songPickerList) return;
  if (!songPickerList.childElementCount) {
    TRACK_ORDER.forEach(id => {
      const meta = TRACK_META[id];
      if (!meta) return;

      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'picker-song';
      btn.dataset.pick = id;

      const num = document.createElement('span');
      num.className = 'picker-num';
      num.setAttribute('aria-hidden', 'true');
      num.textContent = meta.num || '';

      const img = document.createElement('img');
      img.className = 'picker-thumb';
      img.src = meta.img;
      img.alt = '';
      img.width = 56;
      img.height = 56;
      img.decoding = 'async';
      if (meta.pos) img.style.objectPosition = meta.pos;

      const text = document.createElement('span');
      text.className = 'picker-text';
      const strong = document.createElement('strong');
      strong.textContent = meta.title;
      const small = document.createElement('small');
      small.textContent = meta.subtitle || '';
      text.append(strong, small);

      const go = document.createElement('span');
      go.className = 'picker-go';
      go.setAttribute('aria-hidden', 'true');

      btn.append(num, img, text, go);
      li.append(btn);
      songPickerList.append(li);
    });
  }

  songPickerList.querySelectorAll('.picker-song').forEach(btn => {
    const current = btn.dataset.pick === selectedTrack;
    const title = TRACK_META[btn.dataset.pick]?.title || 'song';
    btn.toggleAttribute('aria-current', current);
    if (current) btn.setAttribute('aria-current', 'true');
    btn.setAttribute('aria-label', current ? `${title} (selected in player)` : `Play ${title}`);
    const go = btn.querySelector('.picker-go');
    if (go) {
      go.innerHTML = current
        ? '<span aria-hidden="true">✓</span> Selected'
        : '▶';
    }
  });
  const pickerStopBtn = document.getElementById('song-picker-stop');
  if (pickerStopBtn) pickerStopBtn.hidden = !selectedTrack;
  filterSongPickerList();
}

songPickerSearch?.addEventListener('input', filterSongPickerList);

function openSongPicker(event) {
  if (!songPicker) return;
  closeMenu();
  if (songPickerSearch && songPickerSearch.value) {
    songPickerSearch.value = '';
  }
  renderSongPicker();
  songPicker.hidden = false;
  document.body.classList.add('dialog-open');
  syncPlatters();

  // Gently center the currently playing track inside the 22-song list if one is selected
  if (selectedTrack && songPickerList) {
    const activeBtn = songPickerList.querySelector(`.picker-song[data-pick="${selectedTrack}"]`);
    activeBtn?.scrollIntoView({ block: 'nearest' });
  } else if (songPickerList) {
    songPickerList.scrollTop = 0;
  }

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
  syncPlatters();
}

// ----------------------------------------------------------------------------
// "Explore the originals" — 5 Songs Per Page Pagination + Filter Pills
// ----------------------------------------------------------------------------
const CATALOG_PAGE_SIZE = 5;
let activeCatalogFilter = 'all';
let currentCatalogPage = 1;

const filterPills = Array.from(document.querySelectorAll('.filter-pill[data-filter]'));
const catalogSearch = document.getElementById('catalog-search');
const catalogPagination = document.getElementById('catalog-pagination');
const catalogPageInfo = document.getElementById('catalog-page-info');
const catalogPageNums = document.getElementById('catalog-page-nums');
const catalogPagePrev = document.getElementById('catalog-page-prev');
const catalogPageNext = document.getElementById('catalog-page-next');

function getMatchingCatalogRows(filter = activeCatalogFilter) {
  const q = (catalogSearch?.value || '').trim().toLowerCase();
  return catalogRows.filter(row => {
    if (filter !== 'all') {
      const tags = (row.dataset.tags || '').split(/\s+/);
      if (!tags.includes(filter)) return false;
    }
    if (q) {
      const id = row.dataset.song || '';
      const meta = TRACK_META[id];
      const hay = meta
        ? `${meta.num} ${meta.title} ${meta.subtitle} ${meta.desc}`.toLowerCase()
        : (row.textContent || '').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function commitCatalogPage({ announce = false, scrollCatalogIntoView = false } = {}) {
  const focusedPage = catalogPageNums?.contains(document.activeElement)
    ? document.activeElement.dataset.catalogPage : null;
  const matching = getMatchingCatalogRows(activeCatalogFilter);
  const total = matching.length;
  const totalPages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  currentCatalogPage = Math.min(Math.max(1, currentCatalogPage), totalPages);

  const startIdx = (currentCatalogPage - 1) * CATALOG_PAGE_SIZE;
  const endIdx = Math.min(startIdx + CATALOG_PAGE_SIZE, total);
  const pageSet = new Set(matching.slice(startIdx, endIdx));

  catalogRows.forEach(row => {
    const visible = pageSet.has(row);
    row.hidden = !visible;
  });

  if (catalogPageInfo) {
    if (total === 0) {
      catalogPageInfo.textContent = 'No songs match this filter';
    } else {
      catalogPageInfo.innerHTML =
        totalPages > 1
          ? `Showing <strong>${startIdx + 1}–${endIdx}</strong> of <strong>${total}</strong> songs · Page ${currentCatalogPage} of ${totalPages}`
          : `Showing <strong>1–${total}</strong> of <strong>${total}</strong> songs`;
    }
  }

  if (catalogPageNums) {
    catalogPageNums.innerHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-num-btn' + (p === currentCatalogPage ? ' is-active' : '');
      btn.dataset.catalogPage = String(p);
      btn.textContent = String(p);
      btn.setAttribute('aria-label', `Page ${p}`);
      if (p === currentCatalogPage) btn.setAttribute('aria-current', 'page');
      catalogPageNums.append(btn);
    }
  }

  const controlsWrap = document.getElementById('catalog-page-controls');
  if (controlsWrap) {
    controlsWrap.hidden = totalPages <= 1;
  }
  if (catalogPagePrev) {
    catalogPagePrev.disabled = currentCatalogPage <= 1;
  }
  if (catalogPageNext) {
    catalogPageNext.disabled = currentCatalogPage >= totalPages;
  }

  if (focusedPage) {
    const replacement = catalogPageNums?.querySelector(`[data-catalog-page="${focusedPage}"]`)
      || catalogPageNums?.querySelector('[aria-current="page"]');
    if (totalPages > 1) replacement?.focus({ preventScroll: true });
    else filterPills.find(pill => pill.classList.contains('is-active'))?.focus({ preventScroll: true });
  }

  if (announce && playerStatus) {
    playerStatus.textContent = total > 0
      ? `Page ${currentCatalogPage} of ${totalPages}: showing songs ${startIdx + 1} to ${endIdx} of ${total}.`
      : 'No songs match this filter.';
  }
  updateActiveNavSection();

  if (scrollCatalogIntoView) {
    const head = document.getElementById('explore-originals');
    if (head) {
      const r = head.getBoundingClientRect();
      if (r.top < 60) {
        head.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }
  }
}

const catalogSongList = document.getElementById('catalog-song-list');
let catalogAnimations = [];
let catalogTransitionToken = 0;
let pendingCatalogRender = null;

function cancelCatalogTransition() {
  catalogTransitionToken++;
  catalogAnimations.forEach(animation => animation.cancel());
  catalogAnimations = [];
  pendingCatalogRender = null;
  catalogSongList?.classList.remove('is-transitioning');
  catalogSongList?.removeAttribute('aria-busy');
}

function renderCatalogPage(options = {}) {
  // A newer filter, search, page, or selected song always wins. No stale timers.
  cancelCatalogTransition();
  if (!catalogSongList || !options.animate || prefersReducedMotion || !catalogSongList.animate) {
    commitCatalogPage(options);
    return;
  }
  const token = catalogTransitionToken;
  pendingCatalogRender = options;
  catalogSongList.setAttribute('aria-busy', 'true');
  const outgoing = catalogSongList.animate([{ opacity: 1 }, { opacity: 0.35 }], {
    duration: 90, easing: 'ease-out', fill: 'forwards'
  });
  catalogAnimations.push(outgoing);
  outgoing.finished.then(() => {
    if (token !== catalogTransitionToken) return;
    const oldHeight = catalogSongList.getBoundingClientRect().height;
    outgoing.cancel();
    catalogAnimations = [];
    pendingCatalogRender = null;
    commitCatalogPage(options);
    const newHeight = catalogSongList.getBoundingClientRect().height;
    if (Math.abs(oldHeight - newHeight) > 1) {
      catalogSongList.classList.add('is-transitioning');
      catalogAnimations.push(catalogSongList.animate([
        { height: `${oldHeight}px` }, { height: `${newHeight}px` }
      ], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }));
    }
    catalogRows.filter(row => !row.hidden).forEach((row, index) => {
      catalogAnimations.push(row.animate([
        { opacity: 0.35, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 190, delay: index * 18, fill: 'backwards', easing: 'ease-out' }));
    });
    Promise.all(catalogAnimations.map(animation => animation.finished)).then(() => {
      if (token !== catalogTransitionToken) return;
      cancelCatalogTransition();
      updateActiveNavSection();
    }).catch(() => {}); // Cancellation is expected when the next action arrives.
  }).catch(() => {});
}

reducedMotionCleanups.push(() => {
  const pending = pendingCatalogRender;
  cancelCatalogTransition();
  if (pending) commitCatalogPage(pending);
});
// A keyboard user who moves into the results should never meet a faded row.
catalogSongList?.addEventListener('focusin', () => {
  const pending = pendingCatalogRender;
  cancelCatalogTransition();
  if (pending) {
    const focusedRow = document.activeElement.closest('.song-row');
    commitCatalogPage(pending);
    if (focusedRow?.hidden) {
      const fallback = catalogSongList.querySelector('.song-row:not([hidden]) a')
        || filterPills.find(pill => pill.classList.contains('is-active'));
      fallback?.focus({ preventScroll: true });
    }
  }
});

function syncCatalogPageForTrack(trackId) {
  if (!trackId || catalogRows.length === 0) return;
  if (catalogSearch && catalogSearch.value) {
    catalogSearch.value = '';
  }
  let matching = getMatchingCatalogRows(activeCatalogFilter);
  let idx = matching.findIndex(r => r.dataset.song === trackId);
  if (idx === -1 && activeCatalogFilter !== 'all') {
    activeCatalogFilter = 'all';
    filterPills.forEach(btn => {
      const active = (btn.dataset.filter || 'all') === 'all';
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    matching = getMatchingCatalogRows('all');
    idx = matching.findIndex(r => r.dataset.song === trackId);
  }
  if (idx !== -1) {
    const targetPage = Math.floor(idx / CATALOG_PAGE_SIZE) + 1;
    if (targetPage !== currentCatalogPage) {
      currentCatalogPage = targetPage;
    }
    renderCatalogPage({ animate: false });
  }
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
  const href = meta?.href || targetLink?.getAttribute('href') || 'https://rebyen.com/#music';

  if (options.dock) {
    player.classList.add('is-docked');
    document.body.classList.add('has-player');
  }
  setExpanded(true);

  if (options.forceReload || trackId !== selectedTrack || !frame.src || frame.src === 'about:blank') {
    frame.src = reverbnationEmbedUrl(trackId);
    selectedTrack = trackId;
    setCued(true);
  }

  frame.title = `${title} by Reb Yen — ReverbNation audio player`;
  if (playerTitle) playerTitle.textContent = title;
  if (stopBtn) stopBtn.hidden = false;
  syncCatalogPageForTrack(trackId);
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
  const matching = getMatchingCatalogRows(activeCatalogFilter);
  const pool = matching.length > 0 ? matching.map(r => r.dataset.song) : TRACK_ORDER;
  if (pool.length === 0) return;
  const currentIndex = pool.indexOf(selectedTrack);
  const nextIndex =
    currentIndex === -1
      ? offset >= 0
        ? 0
        : pool.length - 1
      : (currentIndex + offset + pool.length) % pool.length;
  const nextTrackId = pool[nextIndex];
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

// Hero turntable & Listen button: tapping opens the 22-song picker (no crackle until a song actually plays).
heroRecord?.addEventListener('click', event => {
  openSongPicker(event);
});
document.getElementById('hero-listen-btn')?.addEventListener('click', openSongPicker);
catalogSearch?.addEventListener('input', () => {
  currentCatalogPage = 1;
  renderCatalogPage({ animate: false, announce: true });
});
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

// Catalog Filter Pills (All 22 / Featured 3 / Studio 11 / Live 11) + Pagination
filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    activeCatalogFilter = pill.dataset.filter || 'all';
    currentCatalogPage = 1;
    filterPills.forEach(btn => {
      const active = btn === pill;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    renderCatalogPage({ animate: true, announce: true });
  });
});

catalogPagePrev?.addEventListener('click', () => {
  if (currentCatalogPage > 1) {
    currentCatalogPage--;
    renderCatalogPage({ animate: true, announce: true, scrollCatalogIntoView: true });
  }
});

catalogPageNext?.addEventListener('click', () => {
  const totalPages = Math.max(
    1,
    Math.ceil(getMatchingCatalogRows(activeCatalogFilter).length / CATALOG_PAGE_SIZE)
  );
  if (currentCatalogPage < totalPages) {
    currentCatalogPage++;
    renderCatalogPage({ animate: true, announce: true, scrollCatalogIntoView: true });
  }
});

catalogPageNums?.addEventListener('click', event => {
  const btn = event.target.closest('.page-num-btn[data-catalog-page]');
  if (!btn) return;
  const nextPage = Number(btn.dataset.catalogPage);
  if (Number.isFinite(nextPage) && nextPage !== currentCatalogPage) {
    currentCatalogPage = nextPage;
    renderCatalogPage({ animate: true, announce: true, scrollCatalogIntoView: true });
  }
});

renderCatalogPage({ animate: false });
setExpanded(false);
setRecordStatus(null);

// ============================================================================
// Web Audio API Karplus-Strong Acoustic Harmonics & Pluckable Guitar Strings
// ============================================================================
const stringSoundToggle = document.getElementById('string-sound-toggle');
const stringSoundIcon = document.getElementById('string-sound-icon');
const stringSoundLabel = document.getElementById('string-sound-label');
let stringSoundEnabled = false; // UI sound effects off: no unexpected audio
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
  if (!stringSoundEnabled) return;
  const ctx = ensureAudioUnlocked();
  if (!ctx) return;
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
      if (prefersReducedMotion) {
        setCurve(500, 16);
        stringEl.classList.remove('is-vibrating');
        animId = 0;
        return;
      }
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

  reducedMotionCleanups.push(() => {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = 0;
    }
    pulledDisp = 0;
    setCurve(500, 16);
    stringEl.classList.remove('is-vibrating');
  });

  if (!prefersReducedMotion && paths.length > 0) {
    stringEl.addEventListener('pointermove', event => {
      if (prefersReducedMotion || event.pointerType === 'touch') return;
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
    handleGuitarStringEasterEgg(event.clientX, event.clientY);
  });
});

// ============================================================================
// Musical Easter Eggs:
// 1. Playable Hero Instrument Strip (Guitar · Banjo · Keyboard · Harmonica)
// 2. 33⅓ / 45 / 78 RPM Turntable Speed Switch (#lp-rpm-btn)
// 3. 12" LP Jacket Back-Cover Liner Notes Flip (#sleeve-flip-btn)
// 5. Secret Open-D Chord & Songwriter Quote Toast on 3 Guitar Plucks
// 6. Encore Stage-Spotlight Mode (Header Logo Dot / typing "encore")
// ============================================================================
function spawnFloatingNote(x, y, symbol = '♪') {
  if (prefersReducedMotion || isAlbumMotionDisabled()) return;
  const note = document.createElement('span');
  note.className = 'floating-music-note';
  note.setAttribute('aria-hidden', 'true');
  note.textContent = symbol;
  const jitterX = (Math.random() - 0.5) * 26;
  note.style.left = `${Math.round(x + jitterX)}px`;
  note.style.top = `${Math.round(y - 8)}px`;
  document.body.appendChild(note);
  window.setTimeout(() => note.remove(), 1150);
}

let easterToastEl = null;
let easterToastTimer = 0;

function showEasterEggToast(htmlContent, actionCallback = null) {
  if (!easterToastEl) {
    easterToastEl = document.createElement('aside');
    easterToastEl.className = 'easter-egg-toast';
    easterToastEl.setAttribute('role', 'status');
    easterToastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(easterToastEl);
  }
  clearTimeout(easterToastTimer);
  easterToastEl.innerHTML = htmlContent;
  easterToastEl.hidden = false;
  requestAnimationFrame(() => easterToastEl.classList.add('is-visible'));

  if (actionCallback) {
    easterToastEl.querySelector('[data-toast-action]')?.addEventListener('click', () => {
      actionCallback();
      easterToastEl.classList.remove('is-visible');
    });
  }

  easterToastTimer = window.setTimeout(() => {
    easterToastEl?.classList.remove('is-visible');
  }, 4600);
}

// Easter Egg #1: Multi-Instrument Synth (Guitar, Banjo, Keyboard, Harmonica)
function playInstrumentSample(instrument) {
  if (!stringSoundEnabled) return;
  const ctx = ensureAudioUnlocked();
  if (!ctx) return;

  const now = ctx.currentTime;
  if (instrument === 'guitar') {
    // Warm Open-G 6-string acoustic guitar strum
    const notes = [196.0, 246.94, 293.66, 392.0, 493.88, 587.33];
    notes.forEach((f, idx) => {
      window.setTimeout(() => playGuitarHarmonic(f, 0.78), idx * 32);
    });
  } else if (instrument === 'banjo') {
    // Crisp 5-string Scruggs-style forward banjo roll
    const roll = [587.33, 293.66, 392.0, 493.88, 587.33, 783.99, 493.88, 587.33];
    roll.forEach((f, idx) => {
      window.setTimeout(() => playGuitarHarmonic(f, 0.85), idx * 66);
    });
  } else if (instrument === 'keyboard') {
    // Warm electric-piano Dmaj9 voicing
    const chord = [293.66, 369.99, 440.0, 554.37, 659.25];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const bell = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      bell.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.018);
      bell.frequency.setValueAtTime(freq * 2, now + i * 0.018);

      const peak = (selectedTrack ? 0.025 : 0.05) / Math.sqrt(chord.length);
      gain.gain.setValueAtTime(0.0001, now + i * 0.018);
      gain.gain.linearRampToValueAtTime(peak, now + i * 0.018 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);

      osc.connect(gain);
      bell.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.018);
      bell.start(now + i * 0.018);
      osc.stop(now + 1.6);
      bell.stop(now + 1.6);
    });
  } else if (instrument === 'harmonica') {
    // Folk-blues harmonica breath swell with gentle pitch bend & vibrato
    const reeds = [392.0, 493.88, 587.33, 783.99];
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1150;
    filter.Q.value = 1.6;
    filter.connect(ctx.destination);

    reeds.forEach(freq => {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Subtle blues draw-bend up into the note
      osc.frequency.setValueAtTime(freq * 0.965, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.16);

      lfo.frequency.value = 5.4;
      lfoGain.gain.value = 2.8;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const peak = selectedTrack ? 0.016 : 0.032;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      lfo.start(now);
      osc.stop(now + 1.4);
      lfo.stop(now + 1.4);
    });
  }
}

document.querySelectorAll('.inst-easter-btn[data-instrument]').forEach(btn => {
  btn.addEventListener('click', event => {
    const inst = btn.dataset.instrument;
    playInstrumentSample(inst);
    const rect = btn.getBoundingClientRect();
    const cx = event.clientX || rect.left + rect.width / 2;
    const cy = event.clientY || rect.top;
    spawnFloatingNote(cx, cy, '♪');
    window.setTimeout(() => spawnFloatingNote(cx + 12, cy - 6, '♫'), 120);
    btn.classList.remove('is-playing-note');
    void btn.offsetWidth;
    btn.classList.add('is-playing-note');
  });
});

// Easter Egg #2: 33⅓ / 45 / 78 RPM Speed Switch on the 12" LP Cover
const lpRpmBtn = document.getElementById('lp-rpm-btn');
const RPM_MODES = [
  { key: '33', label: 'STEREO · 33⅓', mult: 1, toast: 'Turntable set to 33⅓ RPM · Long Play LP' },
  { key: '45', label: '45 RPM · SINGLE', mult: 1.38, toast: 'Turntable switched to 45 RPM · Jukebox Single speed' },
  { key: '78', label: '78 RPM · VINTAGE', mult: 2.15, toast: 'Turntable switched to 78 RPM · Vintage shellac warmth' }
];
let currentRpmIdx = 0;

function cycleRpmMode(event) {
  event?.stopPropagation();
  currentRpmIdx = (currentRpmIdx + 1) % RPM_MODES.length;
  const mode = RPM_MODES[currentRpmIdx];
  if (lpRpmBtn) lpRpmBtn.textContent = mode.label;
  document.documentElement.dataset.rpm = mode.key;
  heroPlatter.setSpeedMultiplier(mode.mult);
  sleevePlatter.setSpeedMultiplier(mode.mult);
  if (stringSoundEnabled) {
    ensureAudioUnlocked();
    playGuitarHarmonic(mode.key === '78' ? 587.33 : mode.key === '45' ? 440 : 329.63, 0.55);
  }
  showEasterEggToast(`<span>💿 <strong>${mode.label}</strong> — ${mode.toast}</span>`);
}

lpRpmBtn?.addEventListener('click', cycleRpmMode);


// Easter Egg #3: Flip the 12" LP Jacket + Easy Liner Notes Zoom + In-Sleeve Songbook (Without Stopping Playback)
const sleeveFlipBtn = document.getElementById('sleeve-flip-btn');
const sleeveFlipLabel = document.getElementById('sleeve-flip-label');
const lpCornerFlip = document.getElementById('lp-corner-flip');
const lpBackReturnBtn = document.getElementById('lp-back-return-btn');
const lpBackCover = document.getElementById('lp-back-cover');
const lpZoomOutBtn = document.getElementById('lp-zoom-out');
const lpZoomInBtn = document.getElementById('lp-zoom-in');
const lpZoomExpandBtn = document.getElementById('lp-zoom-expand');
const lpTabNotes = document.getElementById('lp-tab-notes');
const lpTabSongbook = document.getElementById('lp-tab-songbook');
const lpPanelNotes = document.getElementById('lp-panel-notes');
const lpPanelSongbook = document.getElementById('lp-panel-songbook');
const lpSongbookContent = document.getElementById('lp-songbook-content');
const lpBackLyricsLink = document.getElementById('lp-back-lyrics');
const lpOpenModalBtn = document.getElementById('lp-open-modal');

const FEATURED_DEFAULT_ID = '33863436';
let lpZoomScale = 1;
let lpActiveTab = 'notes';
let songbookCachePromise = null;
const songbookEntriesByHash = new Map();

function ensureSongbookLoaded() {
  if (songbookCachePromise) return songbookCachePromise;
  songbookCachePromise = fetch('songbook.html')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load songbook.html');
      return res.text();
    })
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('article.page[id^="song-"]').forEach(article => {
        const id = article.id;
        const trackNum = article.querySelector('.song-track-num')?.textContent?.trim() || '';
        const title = article.querySelector('h2')?.textContent?.trim() || '';
        const credits = article.querySelector('.song-credits')?.textContent?.trim() || '';
        const storyHtml = article.querySelector('.song-story')?.innerHTML?.trim() || '';
        const stanzasHtml = Array.from(article.querySelectorAll('.lyrics-columns .stanza'))
          .map(p => p.outerHTML)
          .join('');
        songbookEntriesByHash.set(id, { id, trackNum, title, credits, storyHtml, stanzasHtml });
      });
      return songbookEntriesByHash;
    })
    .catch(err => {
      console.warn('Songbook fetch error:', err);
      return songbookEntriesByHash;
    });
  return songbookCachePromise;
}

function getTrackIdForSongHash(songHash) {
  const targetHref = `songbook.html#${songHash}`;
  return TRACK_ORDER.find(tid => TRACK_META[tid]?.lyricsHref === targetHref) || selectedTrack || FEATURED_DEFAULT_ID;
}

function renderBackCoverSongbook(trackId) {
  const effectiveId = trackId && TRACK_META[trackId] ? trackId : selectedTrack || FEATURED_DEFAULT_ID;
  const meta = TRACK_META[effectiveId] || TRACK_META[FEATURED_DEFAULT_ID];
  const songHash = (meta.lyricsHref || 'songbook.html#song-1').split('#')[1] || 'song-1';
  if (!lpSongbookContent) return;

  ensureSongbookLoaded().then(entries => {
    const entry = entries.get(songHash);
    if (!entry) {
      lpSongbookContent.innerHTML = `
        <div class="lp-sb-header">
          <span class="lp-sb-num">${meta.catNo || 'ORIGINAL'}</span>
          <h4 class="lp-sb-title">${meta.title}</h4>
          <p class="lp-sb-credits">${meta.caption || ''}</p>
        </div>
        <div class="lp-sb-story"><p>${meta.desc || ''}</p></div>
      `;
      return;
    }
    lpSongbookContent.innerHTML = `
      <div class="lp-sb-header">
        <span class="lp-sb-num">${entry.trackNum} · SONGBOOK</span>
        <h4 class="lp-sb-title">${entry.title}</h4>
        <p class="lp-sb-credits">${entry.credits}</p>
      </div>
      <div class="lp-sb-lyrics">${entry.stanzasHtml}</div>
      ${entry.storyHtml ? `<div class="lp-sb-story">${entry.storyHtml}</div>` : ''}
    `;
  });
}

function setLpBackTab(tab, { autoExpand = false } = {}) {
  lpActiveTab = tab === 'songbook' ? 'songbook' : 'notes';
  const isSongbook = lpActiveTab === 'songbook';
  lpTabNotes?.classList.toggle('is-active', !isSongbook);
  lpTabNotes?.setAttribute('aria-selected', String(!isSongbook));
  lpTabSongbook?.classList.toggle('is-active', isSongbook);
  lpTabSongbook?.setAttribute('aria-selected', String(isSongbook));
  if (lpTabNotes) lpTabNotes.tabIndex = isSongbook ? -1 : 0;
  if (lpTabSongbook) lpTabSongbook.tabIndex = isSongbook ? 0 : -1;
  if (lpPanelNotes) lpPanelNotes.hidden = isSongbook;
  if (lpPanelSongbook) lpPanelSongbook.hidden = !isSongbook;
  if (lpBackLyricsLink) {
    lpBackLyricsLink.textContent = isSongbook ? '← Liner Notes' : 'Open Songbook →';
  }
  const bodyEl = document.getElementById('lp-back-body');
  if (bodyEl) bodyEl.scrollTop = 0;
  if (isSongbook) {
    renderBackCoverSongbook(selectedTrack || FEATURED_DEFAULT_ID);
    if (autoExpand && featureSleeve && !featureSleeve.classList.contains('is-sleeve-zoomed')) {
      setLpSleeveExpanded(true);
    }
  }
}

function setLpZoomScale(nextScale) {
  lpZoomScale = Math.min(1.6, Math.max(0.9, Math.round(nextScale * 100) / 100));
  lpBackCover?.style.setProperty('--lp-zoom', String(lpZoomScale));
}

function setLpSleeveExpanded(expanded) {
  if (!featureSleeve) return;
  featureSleeve.classList.toggle('is-sleeve-zoomed', Boolean(expanded));
  lpZoomExpandBtn?.setAttribute('aria-pressed', String(Boolean(expanded)));
  if (lpZoomExpandBtn) {
    lpZoomExpandBtn.textContent = expanded ? '⤡ Fit' : '🔍 Zoom';
  }
  if (expanded && lpZoomScale < 1.12) {
    setLpZoomScale(1.15);
  } else if (!expanded && lpZoomScale === 1.15) {
    setLpZoomScale(1);
  }
}

lpZoomOutBtn?.addEventListener('click', event => {
  event.stopPropagation();
  setLpZoomScale(lpZoomScale - 0.12);
});

lpZoomInBtn?.addEventListener('click', event => {
  event.stopPropagation();
  setLpZoomScale(lpZoomScale + 0.12);
  if (lpZoomScale >= 1.2 && featureSleeve && !featureSleeve.classList.contains('is-sleeve-zoomed')) {
    setLpSleeveExpanded(true);
  }
});

lpZoomExpandBtn?.addEventListener('click', event => {
  event.stopPropagation();
  const next = !featureSleeve?.classList.contains('is-sleeve-zoomed');
  setLpSleeveExpanded(next);
});

lpTabNotes?.addEventListener('click', event => {
  event.stopPropagation();
  setLpBackTab('notes');
});

lpTabSongbook?.addEventListener('click', event => {
  event.stopPropagation();
  setLpBackTab('songbook', { autoExpand: true });
});

[lpTabNotes, lpTabSongbook].forEach((tab, index, tabs) => {
  tab?.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
    setLpBackTab(next === 0 ? 'notes' : 'songbook');
    tabs[next]?.focus();
  });
});

lpBackLyricsLink?.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  if (lpActiveTab === 'songbook') {
    setLpBackTab('notes');
  } else {
    setLpBackTab('songbook', { autoExpand: true });
  }
});

function toggleLpCoverFlip(event) {
  event?.stopPropagation();
  if (!featureSleeve) return;
  featureSleeve.classList.remove('is-peek-teasing');
  const flipped = featureSleeve.classList.toggle('is-flipped');
  if (!flipped) {
    setLpSleeveExpanded(false);
  } else {
    renderBackCoverSongbook(selectedTrack || FEATURED_DEFAULT_ID);
  }
  sleeveFlipBtn?.setAttribute('aria-pressed', String(flipped));
  if (sleeveFlipLabel) {
    sleeveFlipLabel.textContent = flipped ? 'Back to front cover' : 'Flip for liner notes';
  }
  if (lpBackCover) {
    lpBackCover.inert = !flipped;
    lpBackCover.setAttribute('aria-hidden', String(!flipped));
  }
  // Only the visible face belongs in the keyboard/accessibility tree.
  const frontCaption = featureSleeve.querySelector('.lp-cover-overlay');
  if (frontCaption) {
    frontCaption.inert = flipped;
    frontCaption.setAttribute('aria-hidden', String(flipped));
  }
  if (lpPlaySurface) lpPlaySurface.inert = flipped;
  if (flipped) {
    (lpActiveTab === 'songbook' ? lpTabSongbook : lpTabNotes)?.focus();
  } else {
    (sleeveFlipBtn || lpCornerFlip)?.focus();
  }
  if (stringSoundEnabled) {
    ensureAudioUnlocked();
    playGuitarHarmonic(flipped ? 392.0 : 329.63, 0.5);
  }
}

sleeveFlipBtn?.addEventListener('click', toggleLpCoverFlip);
lpCornerFlip?.addEventListener('click', toggleLpCoverFlip);
lpBackReturnBtn?.addEventListener('click', toggleLpCoverFlip);

// Full-Screen In-Page Songbook Reader Modal (opens from ⤢ Full Screen or any Lyrics button without stopping music)
const songbookReader = document.getElementById('songbook-reader');
const songbookReaderTitle = document.getElementById('songbook-reader-title');
const songbookReaderSelect = document.getElementById('songbook-reader-select');
const songbookReaderBody = document.getElementById('songbook-reader-body');
const songbookReaderClose = document.getElementById('songbook-reader-close');
const sbModalZoomOut = document.getElementById('sb-modal-zoom-out');
const sbModalZoomIn = document.getElementById('sb-modal-zoom-in');
const sbModalZoomVal = document.getElementById('sb-modal-zoom-val');
const sbModalPrev = document.getElementById('sb-modal-prev');
const sbModalNext = document.getElementById('sb-modal-next');
const sbModalPlay = document.getElementById('sb-modal-play');
const sbModalPlayLabel = document.getElementById('sb-modal-play-label');
const sbModalPrintLink = document.getElementById('sb-modal-print-link');
const sbModalDone = document.getElementById('sb-modal-done');

let sbModalZoom = 1;
let currentModalSongHash = 'song-1';

function populateSongbookSelect() {
  if (!songbookReaderSelect || songbookReaderSelect.childElementCount > 0) return;
  TRACK_ORDER.forEach(tid => {
    const meta = TRACK_META[tid];
    if (!meta) return;
    const hash = (meta.lyricsHref || 'songbook.html#song-1').split('#')[1] || 'song-1';
    const opt = document.createElement('option');
    opt.value = hash;
    opt.textContent = `${meta.num}. ${meta.title}`;
    songbookReaderSelect.appendChild(opt);
  });
}

function setSbModalZoom(nextZoom) {
  sbModalZoom = Math.min(1.6, Math.max(0.85, Math.round(nextZoom * 100) / 100));
  const card = songbookReader?.querySelector('.songbook-modal-card');
  card?.style.setProperty('--sb-zoom', String(sbModalZoom));
  if (sbModalZoomVal) {
    sbModalZoomVal.textContent = `${Math.round(sbModalZoom * 100)}%`;
  }
}

function renderSongbookModalSong(songHash) {
  currentModalSongHash = songHash || 'song-1';
  populateSongbookSelect();
  if (songbookReaderSelect) songbookReaderSelect.value = currentModalSongHash;
  const trackId = getTrackIdForSongHash(currentModalSongHash);
  const meta = TRACK_META[trackId] || TRACK_META[FEATURED_DEFAULT_ID];

  if (songbookReaderTitle) songbookReaderTitle.textContent = meta.title;
  if (sbModalPrintLink) sbModalPrintLink.href = `songbook.html#${currentModalSongHash}`;
  if (sbModalPlay) {
    const isPlayingThis = selectedTrack === trackId && frame && frame.src && frame.src !== 'about:blank';
    sbModalPlay.classList.toggle('is-playing', Boolean(isPlayingThis));
    sbModalPlay.innerHTML = isPlayingThis
      ? `<span class="eq-bars" aria-hidden="true"><i></i><i></i><i></i></span> <span id="sb-modal-play-label">Selected: ${meta.title}</span>`
      : `<span aria-hidden="true">▶</span> <span id="sb-modal-play-label">Play ${meta.title}</span>`;
  }

  ensureSongbookLoaded().then(entries => {
    const entry = entries.get(currentModalSongHash);
    if (!songbookReaderBody) return;
    if (!entry) {
      songbookReaderBody.innerHTML = `
        <p class="sb-modal-credits">${meta.caption || ''}</p>
        <div class="sb-modal-story"><p>${meta.desc || ''}</p></div>
      `;
      return;
    }
    if (songbookReaderTitle) songbookReaderTitle.textContent = entry.title || meta.title;
    songbookReaderBody.innerHTML = `
      <p class="sb-modal-credits"><strong>${entry.trackNum}</strong> · ${entry.credits}</p>
      <div class="sb-modal-stanzas">${entry.stanzasHtml}</div>
      ${entry.storyHtml ? `<div class="sb-modal-story">${entry.storyHtml}</div>` : ''}
    `;
    songbookReaderBody.scrollTop = 0;
  });
}

let songbookOpener = null;
let songbookBackground = [];
const songbookFocusable = 'a[href], button, input, select, textarea, [tabindex]';
function songbookFocusTargets() {
  return Array.from(songbookReader.querySelectorAll(songbookFocusable)).filter(el =>
    el.tabIndex >= 0 && !el.disabled && !el.closest('[hidden], [inert]') && el.getClientRects().length
  );
}
function openSongbookModal(songHash) {
  if (!songbookReader) return;
  if (songbookReader.hidden) {
    songbookOpener = document.activeElement;
    songbookBackground = Array.from(document.body.children)
      .filter(el => el !== songbookReader && !['SCRIPT', 'STYLE'].includes(el.tagName))
      .map(el => ({ el, inert: el.inert }));
    songbookBackground.forEach(({ el }) => { el.inert = true; });
  }
  const effectiveHash = songHash || (TRACK_META[selectedTrack || FEATURED_DEFAULT_ID]?.lyricsHref || 'songbook.html#song-1').split('#')[1] || 'song-1';
  renderSongbookModalSong(effectiveHash);
  songbookReader.hidden = false;
  document.body.classList.add('dialog-open');
  songbookReaderTitle?.focus({ preventScroll: true });
}
function closeSongbookModal() {
  if (!songbookReader || songbookReader.hidden) return;
  songbookReader.hidden = true;
  songbookBackground.forEach(({ el, inert }) => { el.inert = inert; });
  songbookBackground = [];
  document.body.classList.remove('dialog-open');
  if (songbookOpener?.isConnected && !songbookOpener.closest('[hidden], [inert]')) {
    songbookOpener.focus({ preventScroll: true });
  }
  songbookOpener = null;
}
songbookReader?.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const targets = songbookFocusTargets();
  const first = targets[0];
  const last = targets[targets.length - 1];
  const active = document.activeElement;
  if (!first) {
    event.preventDefault();
    songbookReaderTitle?.focus();
  } else if (event.shiftKey && (active === first || !targets.includes(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !targets.includes(active))) {
    event.preventDefault();
    first.focus();
  }
});
document.addEventListener('focusin', event => {
  if (songbookReader && !songbookReader.hidden && !songbookReader.contains(event.target)) {
    songbookReaderTitle?.focus({ preventScroll: true });
  }
});

lpOpenModalBtn?.addEventListener('click', event => {
  event.stopPropagation();
  const hash = lpBackLyricsLink?.dataset.songHash || (TRACK_META[selectedTrack || FEATURED_DEFAULT_ID]?.lyricsHref || 'songbook.html#song-1').split('#')[1] || 'song-1';
  openSongbookModal(hash);
});

songbookReaderClose?.addEventListener('click', closeSongbookModal);
sbModalDone?.addEventListener('click', closeSongbookModal);
songbookReader?.querySelector('[data-close-songbook]')?.addEventListener('click', closeSongbookModal);

sbModalZoomOut?.addEventListener('click', () => setSbModalZoom(sbModalZoom - 0.1));
sbModalZoomIn?.addEventListener('click', () => setSbModalZoom(sbModalZoom + 0.1));

songbookReaderSelect?.addEventListener('change', () => {
  renderSongbookModalSong(songbookReaderSelect.value);
});

sbModalPrev?.addEventListener('click', () => {
  const num = parseInt(currentModalSongHash.replace('song-', ''), 10) || 1;
  const prevNum = num <= 1 ? 22 : num - 1;
  renderSongbookModalSong(`song-${prevNum}`);
});

sbModalNext?.addEventListener('click', () => {
  const num = parseInt(currentModalSongHash.replace('song-', ''), 10) || 1;
  const nextNum = num >= 22 ? 1 : num + 1;
  renderSongbookModalSong(`song-${nextNum}`);
});

sbModalPlay?.addEventListener('click', event => {
  event.preventDefault();
  event.stopPropagation();
  const trackId = getTrackIdForSongHash(currentModalSongHash);
  const meta = TRACK_META[trackId] || TRACK_META[FEATURED_DEFAULT_ID];
  if (trackId && meta) {
    selectTrackById(trackId, { dock: true, focusPlayer: false, forceReload: true });
    renderSongbookModalSong(currentModalSongHash);
  }
});

// Intercept catalog .lyrics-link and #moment-lyrics-link so clicking "Lyrics" never stops the music!
document.addEventListener('click', event => {
  const lyricsAnchor = event.target.closest('a.lyrics-link, a#moment-lyrics-link');
  if (!lyricsAnchor) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const href = lyricsAnchor.getAttribute('href') || '';
  if (!href.includes('songbook.html')) return;
  event.preventDefault();
  const hash = href.split('#')[1] || 'song-1';
  openSongbookModal(hash);
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && songbookReader && !songbookReader.hidden) {
    closeSongbookModal();
  }
});

// One-time 3D "Peek Flip" teaser when the 12" LP cover scrolls into view
if (featureSleeve && 'IntersectionObserver' in window) {
  let hasPeekTeased = false;
  const peekObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasPeekTeased) {
          hasPeekTeased = true;
          peekObserver.disconnect();
          if (!prefersReducedMotion && !isAlbumMotionDisabled() && !featureSleeve.classList.contains('is-flipped')) {
            window.setTimeout(() => {
              if (!featureSleeve.classList.contains('is-flipped') && !isAlbumMotionDisabled()) {
                featureSleeve.classList.add('is-peek-teasing');
                window.setTimeout(() => {
                  featureSleeve.classList.remove('is-peek-teasing');
                }, 1450);
              }
            }, 420);
          }
        }
      });
    },
    { threshold: 0.55 }
  );
  peekObserver.observe(featureSleeve);
}

// Easter Egg #5: Secret Chord & Songwriter Quote After 3 Guitar-String Plucks
let guitarPluckStreak = 0;
let lastPluckTimestamp = 0;
const SONGWRITER_QUOTES = [
  '“Don’t call it the end; it’s a new beginning.” — A New Beginning',
  '“Stop breaking your heart… you gotta let it go.” — Gotta Let It Go',
  '“Sometimes the quiet is where the song finds its voice.” — The Solitude',
  '“Original songs. Real stories. 100% live vocals & instruments.” — Reb Yen'
];
let quoteIdx = 0;

function handleGuitarStringEasterEgg(clientX, clientY) {
  const now = performance.now();
  if (clientX && clientY) {
    spawnFloatingNote(clientX, clientY, guitarPluckStreak % 2 === 0 ? '♪' : '♫');
  }
  if (now - lastPluckTimestamp > 6000) {
    guitarPluckStreak = 0;
  }
  lastPluckTimestamp = now;
  guitarPluckStreak++;

  if (guitarPluckStreak === 3) {
    guitarPluckStreak = 0;
    const openD = [146.83, 220.0, 293.66, 369.99, 440.0, 587.33];
    openD.forEach((f, idx) => {
      window.setTimeout(() => playGuitarHarmonic(f, 0.72), idx * 38);
    });
    const quote = SONGWRITER_QUOTES[quoteIdx % SONGWRITER_QUOTES.length];
    quoteIdx++;
    showEasterEggToast(`<span>🎸 <strong>Secret Open-D Chord!</strong> ${quote}</span>`);
  }
}

// Easter Egg #6: Encore Stage-Spotlight Mode (Typing "encore" or Shift-clicking Header Logo)
let keyBuffer = '';
function triggerEncoreMode() {
  const active = document.body.classList.toggle('encore-stage-mode');
  if (active) {
    playInstrumentSample('guitar');
    const deepCuts = ['32563022', '32981405', '32901138', '32178754', '33353012'];
    const randomId = deepCuts[Math.floor(Math.random() * deepCuts.length)];
    const meta = TRACK_META[randomId];
    showEasterEggToast(
      `<span>✨ <strong>Encore Stage Mode!</strong> Ready for a deep cut? <button type="button" class="toast-action-btn" data-toast-action>▶ Play “${meta?.title || 'The Storm'}”</button></span>`,
      () => selectTrackById(randomId, { dock: true, focusPlayer: true })
    );
  } else {
    showEasterEggToast('<span>💡 House lights restored.</span>');
  }
}

document.addEventListener('keydown', event => {
  if (event.target.closest('input, textarea, select')) return;
  if (event.key.length === 1) {
    keyBuffer = (keyBuffer + event.key.toLowerCase()).slice(-6);
    if (keyBuffer === 'encore') {
      keyBuffer = '';
      triggerEncoreMode();
    }
  }
});

document.querySelector('.site-header .logo')?.addEventListener('dblclick', event => {
  event.preventDefault();
  triggerEncoreMode();
});

// ============================================================================
// One-time Scroll Reveals (one animation layer per content block)
// ============================================================================
if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js-motion');

  const staggerGroups = [
    { parent: '.moment-grid', children: '.moment-card', step: 45, mod: 5 },
    { parent: '.song-list', children: '.song-row', step: 35, mod: 5 },
    { parent: '.video-grid', children: '.video', step: 40, mod: 2 },
    { parent: '.format-cards', children: 'article', step: 40, mod: 3 },
    { parent: '.venue-grid', children: ':scope > div', step: 40, mod: 3 },
    { parent: '.about-chips', children: 'span', step: 35, mod: 4 },
    { parent: '.journey-rail', children: '.journey-stop', step: 35, mod: 6 },
    { parent: '.gallery-grid', children: '.gallery-item', step: 40, mod: 3 },
    { parent: '.press-photos', children: '.press-photo', step: 40, mod: 2 }
  ];

  const revealTargets = new Set();

  document
    .querySelectorAll(
      '#music .section-head, #music .feature-sleeve-wrap, #music .featured-copy > :not(.player-slot), #music .player-slot, #music .catalog-head, [data-reveal], .recognition-inner, .section-head, .upcoming, .stage-spec-panel, .about-image, .about-copy, .contact-grid > div, .press-main h2, .press-main > p, .press-facts'
    )
    .forEach(el => revealTargets.add(el));

  staggerGroups.forEach(({ parent, children, step, mod }) => {
    document.querySelectorAll(parent).forEach(group => {
      group.querySelectorAll(children).forEach((item, index) => {
        item.style.setProperty('--stagger', `${Math.min((index % mod) * step, 120)}ms`);
        revealTargets.add(item);
      });
    });
  });

  // Prefer the parent block when nested candidates exist (for example About
  // copy and its chips). Never hide or move both a section and its children.
  revealTargets.forEach(el => {
    let ancestor = el.parentElement;
    while (ancestor) {
      if (revealTargets.has(ancestor)) {
        revealTargets.delete(el);
        el.style.removeProperty('--stagger');
        break;
      }
      ancestor = ancestor.parentElement;
    }
  });

  function revealElement(el) {
    el.style.removeProperty('--stagger');
    el.classList.add('is-revealed');
    revealObserver.unobserve(el);
  }

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
    { threshold: 0, rootMargin: '0px 0px -16px 0px' }
  );

  revealTargets.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (!el.hidden && rect.top > viewportCutoff) {
      el.classList.add('reveal-ready');
      revealObserver.observe(el);
    }
  });

  // Keyboard navigation and in-page anchors must never land on hidden content.
  document.addEventListener('focusin', event => {
    const target = event.target.closest?.('.reveal-ready');
    if (target && !target.classList.contains('is-revealed')) revealElement(target);
  });

  reducedMotionCleanups.push(() => {
    revealObserver.disconnect();
    document.documentElement.classList.remove('js-motion');
    revealTargets.forEach(el => {
      el.classList.add('is-revealed');
      el.classList.remove('reveal-ready');
    });
  });
}

// ============================================================================
// Tactile 3D Polaroid Hover Physics & Magnetic Copper-Sheen Primary Buttons
// ============================================================================
if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('pointermove', event => {
      if (prefersReducedMotion || (albumMotionOff && card.classList.contains('feature-art'))) return;
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
      if (prefersReducedMotion) return;
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

  reducedMotionCleanups.push(() => {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.classList.remove('is-tilting');
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
    document.querySelectorAll('.button.primary').forEach(btn => {
      btn.style.removeProperty('--mx');
      btn.style.removeProperty('--my');
    });
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
// Contact Form Redirect Target
// ============================================================================
const contactNextField = document.querySelector('.contact-form input[name="_next"]');
if (contactNextField && /^https?:$/.test(window.location.protocol)) {
  contactNextField.value = new URL('thanks.html', window.location.href).href;
}

// ============================================================================
// Contact Form: tailored placeholder + descriptive email subject
// ============================================================================
(() => {
  const form = document.querySelector('.contact-form');
  const typeSelect = document.getElementById('cf-type');
  if (!form || !typeSelect) return;
  const subjectField = form.querySelector('input[name="_subject"]');
  const message = document.getElementById('cf-msg');

  const isBooking = () => Boolean(typeSelect.selectedOptions[0]?.hasAttribute('data-booking'));
  const sync = () => {
    if (!message) return;
    message.placeholder = isBooking()
      ? 'Share your event date, location, and plans, plus any song requests or questions for Reb.'
      : 'Tell Reb a little about your plans, or ask about her music, songwriting, or recordings.';
  };
  typeSelect.addEventListener('change', sync);
  sync();

  form.addEventListener('submit', () => {
    if (!subjectField) return;
    const type = typeSelect.value || 'General message';
    subjectField.value = (isBooking() ? 'Booking inquiry: ' : 'Website message: ') + type;
  });
})();

// ============================================================================
// Mobile "show more" toggles (About copy & extra videos)
// ============================================================================
(() => {
  const wire = (btnId, targetId, openClass, labels) => {
    const btn = document.getElementById(btnId);
    const target = document.getElementById(targetId);
    if (!btn || !target) return;
    btn.addEventListener('click', () => {
      const open = target.classList.toggle(openClass);
      btn.setAttribute('aria-expanded', String(open));
      btn.innerHTML = open ? labels.close : labels.open;
      if (!open) btn.scrollIntoView({ block: 'nearest' });
    });
  };
  wire('about-more-toggle', 'about-more', 'is-open', {
    open: 'Read more about Reb <span aria-hidden="true">↓</span>',
    close: 'Show less <span aria-hidden="true">↑</span>'
  });
  wire('video-more-toggle', 'video-grid', 'is-expanded', {
    open: 'Show 3 more videos',
    close: 'Show fewer videos'
  });
})();

// ============================================================================
// Interactive "Stages & Chapters" Tour-Stop Strip
// ============================================================================
const JOURNEY_CHAPTERS = [
  {
    title: 'Boulder & the Front Range · Roots Music Project & Beyond',
    text: 'Now based in Boulder, performing originals and curated covers on guitar, keyboard and harmonica at Roots Music Project, St. Julien Hotel, Bricks On Main, The Alley and Attic Bistro.'
  },
  {
    title: 'Nashville · Songwriting Community & Commodore Grille',
    text: 'Immersed in Nashville’s songwriting community and performed her original songs live on stage at the Commodore Grille.'
  },
  {
    title: 'North America & Europe · Original Performance Art',
    text: 'Created and toured an original performance-art production bringing live music, dance and illusion together across North America and Europe.'
  },
  {
    title: 'Orlando & Central Florida · Walt Disney World',
    text: 'Worked as a singer, dancer and producer at Walt Disney World, alongside Central Florida performances at Universal Studios and Hard Rock Café.'
  },
  {
    title: 'New York City · Lincoln Center',
    text: 'Performed on stage at Lincoln Center in New York as part of the Aman World Music & Dance Ensemble.'
  },
  {
    title: 'Los Angeles · Aman World Music & Dance Ensemble',
    text: 'Began her professional performance career as a singer and dancer with the acclaimed Aman World Music & Dance Ensemble in Los Angeles.'
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

// ============================================================================
// "What Kind of Moment Are You In?" — Interactive Song Pairing & Measurement
// ============================================================================
const MOMENT_METRICS_KEY = 'rebyen_moment_metrics_v1';

function readMomentMetrics() {
  try {
    const raw = window.localStorage.getItem(MOMENT_METRICS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // Ignore storage errors (e.g., private browsing restrictions)
  }
  return { totals: {}, bySong: {} };
}

function trackMomentEvent(action, pairing, extra = {}) {
  const payload = {
    moment: pairing?.slug || 'none',
    momentLabel: pairing?.momentLabel || '',
    trackId: pairing?.trackId || '',
    songTitle: pairing?.songTitle || '',
    ...extra
  };

  try {
    const store = readMomentMetrics();
    store.totals = store.totals || {};
    store.bySong = store.bySong || {};
    store.totals[action] = (store.totals[action] || 0) + 1;
    if (payload.songTitle) {
      const songStats = store.bySong[payload.songTitle] || {};
      songStats[action] = (songStats[action] || 0) + 1;
      store.bySong[payload.songTitle] = songStats;
    }
    window.localStorage.setItem(MOMENT_METRICS_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors
  }

  try {
    if (typeof window.va === 'function') {
      window.va('event', { name: action, data: payload });
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', action, payload);
    }
    if (typeof window.plausible === 'function') {
      window.plausible(action, { props: payload });
    }
    window.dispatchEvent(
      new CustomEvent('rebyen:moment_metric', {
        detail: { action, ...payload }
      })
    );
  } catch {
    // Never let analytics hooks interrupt playback or navigation
  }
}

const momentSection = document.getElementById('moments');
const momentCards = Array.from(document.querySelectorAll('.moment-card[data-moment]'));
const momentSurpriseBtn = document.getElementById('moment-surprise-btn');
const momentResult = document.getElementById('moment-result');
const momentCloseBtn = document.getElementById('moment-close-btn');
const momentImg = document.getElementById('moment-img');
const momentCaption = document.getElementById('moment-photo-caption');
const momentKicker = document.getElementById('moment-kicker');
const momentSongTitle = document.getElementById('moment-song-title');
const momentWhy = document.getElementById('moment-why');
const momentLyric = document.getElementById('moment-lyric');
const momentVoiceWrap = document.getElementById('moment-voice');
const momentVoiceBtn = document.getElementById('moment-voice-btn');
const momentVoiceIcon = document.getElementById('moment-voice-icon');
const momentVoiceLabel = document.getElementById('moment-voice-label');
const momentVoiceTime = document.getElementById('moment-voice-time');
const momentVoiceAudio = document.getElementById('moment-voice-audio');
const momentListenBtn = document.getElementById('moment-listen-btn');
const momentListenIcon = document.getElementById('moment-listen-icon');
const momentListenLabel = document.getElementById('moment-listen-label');
const momentLyricsLink = document.getElementById('moment-lyrics-link');
const momentShareBtn = document.getElementById('moment-share-btn');
const momentShareLabel = document.getElementById('moment-share-label');

let activeMomentSlug = null;

function formatClipTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const rounded = Math.max(1, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = String(rounded % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function pauseMomentVoiceIntro(resetTime = false) {
  if (!momentVoiceAudio) return;
  if (!momentVoiceAudio.paused) {
    momentVoiceAudio.pause();
  }
  if (resetTime) {
    try {
      momentVoiceAudio.currentTime = 0;
    } catch {
      // Ignore if metadata not loaded yet
    }
  }
  momentVoiceBtn?.setAttribute('aria-pressed', 'false');
  if (momentVoiceIcon) momentVoiceIcon.textContent = '▶';
}

syncMomentListenState = () => {
  if (!momentListenBtn) return;
  const pairing = activeMomentSlug ? MOMENT_PAIRINGS[activeMomentSlug] : null;
  if (!pairing) return;
  const isCurrent = Boolean(selectedTrack && selectedTrack === pairing.trackId);
  if (isCurrent) {
    if (momentListenIcon) {
      momentListenIcon.innerHTML =
        '<span class="eq-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
    }
    if (momentListenLabel) momentListenLabel.textContent = 'Selected';
    momentListenBtn.setAttribute(
      'aria-label',
      `${pairing.songTitle} (currently loaded in music player)`
    );
  } else {
    if (momentListenIcon) momentListenIcon.textContent = '▶';
    if (momentListenLabel) momentListenLabel.textContent = 'Listen';
    momentListenBtn.setAttribute('aria-label', `Listen to ${pairing.songTitle}`);
  }
};

function syncMomentVoiceUi(pairing) {
  pauseMomentVoiceIntro(true);
  if (!momentVoiceWrap || !momentVoiceAudio) return;

  const src = typeof pairing?.introSrc === 'string' ? pairing.introSrc.trim() : '';
  if (!src) {
    momentVoiceWrap.hidden = true;
    momentVoiceAudio.removeAttribute('src');
    return;
  }

  momentVoiceWrap.hidden = false;
  if (momentVoiceLabel) {
    momentVoiceLabel.textContent = pairing.introLabel || 'Hear Reb’s story behind this song';
  }
  if (momentVoiceTime) {
    momentVoiceTime.textContent = pairing.introDuration || '0:25';
  }
  if (momentVoiceAudio.getAttribute('src') !== src) {
    momentVoiceAudio.src = src;
  }
}

function closeMomentPairing({ focusTrigger = false } = {}) {
  const prevSlug = activeMomentSlug;
  activeMomentSlug = null;
  pauseMomentVoiceIntro(true);

  momentCards.forEach(card => {
    card.classList.remove('is-active');
    card.setAttribute('aria-pressed', 'false');
    const cue = card.querySelector('.moment-card-cue');
    if (cue) cue.textContent = cue.dataset.defaultCue || 'Open song →';
  });

  if (momentResult) {
    momentResult.hidden = true;
    momentResult.classList.remove('is-revealing-moment');
  }

  if (focusTrigger && prevSlug) {
    const trigger = momentCards.find(c => c.dataset.moment === prevSlug);
    trigger?.focus({ preventScroll: true });
  }
}

function openMomentPairing(slug, { source = 'card', scrollIntoView = false } = {}) {
  const pairing = MOMENT_PAIRINGS[slug];
  if (!pairing || !momentResult) return null;

  activeMomentSlug = slug;

  momentCards.forEach(card => {
    const active = card.dataset.moment === slug;
    card.classList.toggle('is-active', active);
    card.setAttribute('aria-pressed', String(active));
    const cue = card.querySelector('.moment-card-cue');
    if (cue) {
      cue.textContent = active
        ? `♪ ${pairing.songTitle}`
        : cue.dataset.defaultCue || 'Open song →';
    }
  });

  if (momentImg) {
    momentImg.src = pairing.img;
    momentImg.alt = pairing.alt;
    momentImg.width = pairing.imgWidth || 480;
    momentImg.height = pairing.imgHeight || 360;
    momentImg.style.setProperty('--img-pos', pairing.imgPos || '50% 45%');
    momentImg.style.setProperty('--img-scale', pairing.imgScale || '1');
    momentImg.style.setProperty('--img-origin', pairing.imgOrigin || 'center center');
  }
  if (momentCaption) momentCaption.textContent = pairing.caption;
  if (momentKicker) momentKicker.textContent = `${pairing.momentLabel} · Suggested song`;
  if (momentSongTitle) momentSongTitle.textContent = pairing.songTitle;
  if (momentWhy) momentWhy.textContent = pairing.why;
  if (momentLyric) momentLyric.textContent = pairing.lyric;

  const trackHref =
    TRACK_META[pairing.trackId]?.href || 'https://rebyen.com/#music';
  if (momentListenBtn) {
    momentListenBtn.href = trackHref;
  }
  if (momentLyricsLink) {
    momentLyricsLink.href = pairing.lyricsHref;
    momentLyricsLink.setAttribute('aria-label', `Read lyrics for ${pairing.songTitle}`);
  }
  if (momentShareLabel) {
    momentShareLabel.textContent = 'Share this song';
  }

  syncMomentVoiceUi(pairing);
  syncMomentListenState();

  momentResult.hidden = false;
  momentResult.classList.remove('is-revealing-moment');
  if (!prefersReducedMotion) {
    void momentResult.offsetWidth;
    momentResult.classList.add('is-revealing-moment');
  }

  if (source === 'surprise') {
    trackMomentEvent('moment_surprise', pairing);
  } else if (source === 'deeplink') {
    trackMomentEvent('moment_deeplink', pairing);
  } else if (source === 'card') {
    trackMomentEvent('moment_select', pairing);
  }

  if (scrollIntoView) {
    window.requestAnimationFrame(() => {
      const rect = momentResult.getBoundingClientRect();
      const outOfView = rect.bottom > window.innerHeight - 16 || rect.top < 76;
      if (outOfView) {
        momentResult.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'nearest'
        });
      }
    });
  }

  return pairing;
}

if (momentCards.length > 0 && momentResult) {
  momentCards.forEach((card, index) => {
    card.addEventListener('click', () => {
      const slug = card.dataset.moment;
      if (!slug) return;
      if (activeMomentSlug === slug && !momentResult.hidden) {
        closeMomentPairing();
        return;
      }
      openMomentPairing(slug, { source: 'card', scrollIntoView: true });
    });

    card.addEventListener('keydown', event => {
      let nextIndex = -1;
      if (event.key === 'ArrowRight') {
        nextIndex = (index + 1) % momentCards.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (index - 1 + momentCards.length) % momentCards.length;
      }
      if (nextIndex !== -1) {
        event.preventDefault();
        momentCards[nextIndex]?.focus();
      }
    });
  });

  momentSurpriseBtn?.addEventListener('click', () => {
    const slugs = Object.keys(MOMENT_PAIRINGS);
    if (slugs.length === 0) return;
    const candidates =
      slugs.length > 1 ? slugs.filter(s => s !== activeMomentSlug) : slugs;
    const randomSlug = candidates[Math.floor(Math.random() * candidates.length)];
    openMomentPairing(randomSlug, { source: 'surprise', scrollIntoView: true });
  });

  momentCloseBtn?.addEventListener('click', () => {
    closeMomentPairing({ focusTrigger: true });
  });

  momentListenBtn?.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const pairing = activeMomentSlug ? MOMENT_PAIRINGS[activeMomentSlug] : null;
    if (!pairing) return;
    event.preventDefault();
    pauseMomentVoiceIntro();
    trackMomentEvent('moment_listen', pairing);
    selectTrackById(pairing.trackId, { dock: true, focusPlayer: true });
  });

  momentLyricsLink?.addEventListener('click', () => {
    const pairing = activeMomentSlug ? MOMENT_PAIRINGS[activeMomentSlug] : null;
    if (!pairing) return;
    pauseMomentVoiceIntro();
    trackMomentEvent('moment_lyrics', pairing);
  });

  momentShareBtn?.addEventListener('click', () => {
    const pairing = activeMomentSlug ? MOMENT_PAIRINGS[activeMomentSlug] : null;
    if (!pairing) return;
    const shareUrl = `${siteShareOrigin}/?moment=${encodeURIComponent(pairing.slug)}#moments`;
    trackMomentEvent('moment_share', pairing);
    shareOrCopyLink(
      {
        title: `“${pairing.songTitle}” — Reb Yen`,
        text: `For a “${pairing.momentLabel.toLowerCase()}” moment — listen to “${pairing.songTitle}” and read the lyrics by Reb Yen:`,
        url: shareUrl
      },
      momentShareLabel,
      'Share this song'
    );
  });

  momentVoiceBtn?.addEventListener('click', () => {
    if (!momentVoiceAudio || momentVoiceWrap?.hidden) return;
    const pairing = activeMomentSlug ? MOMENT_PAIRINGS[activeMomentSlug] : null;
    if (momentVoiceAudio.paused) {
      momentVoiceAudio
        .play()
        .then(() => {
          momentVoiceBtn.setAttribute('aria-pressed', 'true');
          if (momentVoiceIcon) momentVoiceIcon.textContent = '❚❚';
          if (pairing) trackMomentEvent('moment_voice_intro', pairing);
        })
        .catch(() => {});
    } else {
      pauseMomentVoiceIntro(false);
    }
  });

  momentVoiceAudio?.addEventListener('loadedmetadata', () => {
    const formatted = formatClipTime(momentVoiceAudio.duration);
    if (formatted && momentVoiceTime) {
      momentVoiceTime.textContent = formatted;
    }
  });

  momentVoiceAudio?.addEventListener('timeupdate', () => {
    if (!momentVoiceTime || !Number.isFinite(momentVoiceAudio.duration)) return;
    const remaining = Math.max(0, momentVoiceAudio.duration - momentVoiceAudio.currentTime);
    const formatted = formatClipTime(remaining);
    if (formatted) momentVoiceTime.textContent = formatted;
  });

  momentVoiceAudio?.addEventListener('ended', () => {
    pauseMomentVoiceIntro(true);
    const pairing = activeMomentSlug ? MOMENT_PAIRINGS[activeMomentSlug] : null;
    const full = formatClipTime(momentVoiceAudio.duration) || pairing?.introDuration || '0:25';
    if (momentVoiceTime) momentVoiceTime.textContent = full;
  });

  // Open automatically if visitor arrives via a shared ?moment=<slug> link
  const initialMoment = new URLSearchParams(window.location.search).get('moment');
  if (initialMoment && MOMENT_PAIRINGS[initialMoment]) {
    openMomentPairing(initialMoment, { source: 'deeplink', scrollIntoView: false });
    if (!window.rebYenReloadToTop) window.requestAnimationFrame(() => {
      momentSection?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  }
}

window.rebYenMoments = {
  pairings: MOMENT_PAIRINGS,
  open: openMomentPairing,
  close: closeMomentPairing,
  syncVoiceUi: () => {
    const pairing = activeMomentSlug ? MOMENT_PAIRINGS[activeMomentSlug] : null;
    if (pairing) syncMomentVoiceUi(pairing);
  },
  getMetrics: readMomentMetrics
};

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
  clearTimeout(switchTimer);
  currentPhotoIndex = (index + galleryButtons.length) % galleryButtons.length;
  const button = galleryButtons[currentPhotoIndex];
  const img = document.getElementById('dialog-image');
  const title = document.getElementById('dialog-title');
  if (!img) return;

  const nextSrc = button.dataset.photo;
  const nextAlt = button.querySelector('img')?.alt || '';
  const nextTitle = button.querySelector('span')?.textContent || 'Performance photo';
  updateLightboxShareTargets(nextSrc, nextTitle);
  const caption = `${nextTitle} · ${currentPhotoIndex + 1} of ${galleryButtons.length}`;

  if (animate && !prefersReducedMotion) {
    clearTimeout(switchTimer);
    img.classList.add('is-switching');
    switchTimer = window.setTimeout(() => {
      img.onload = img.onerror = () => img.classList.remove('is-switching');
      img.src = nextSrc;
      img.alt = nextAlt;
      if (title) title.textContent = caption;
      if (img.complete) img.classList.remove('is-switching');
    }, 90);
  } else {
    img.classList.remove('is-switching');
    img.src = nextSrc;
    img.alt = nextAlt;
    if (title) title.textContent = caption;
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
    document.getElementById('close-photo')?.focus({ preventScroll: true });
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
  if (event.key === 'Tab') {
    const controls = Array.from(lightbox.querySelectorAll('button:not([disabled]), a[href]'))
      .filter(el => !el.hidden && el.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === lightbox)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    renderLightboxPhoto(currentPhotoIndex - 1, true);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    renderLightboxPhoto(currentPhotoIndex + 1, true);
  }
});

lightbox?.addEventListener('close', () => {
  clearTimeout(switchTimer);
  document.getElementById('dialog-image')?.classList.remove('is-switching');
  lastPhotoButton?.focus({ preventScroll: true });
});

// Horizontal, one-finger gestures only. Vertical scrolling and pinch zoom stay
// native; buttons remain available so a gesture is never the only way to browse.
const photoSurface = lightbox?.querySelector('.lightbox-figure');
let photoSwipe = null;
photoSurface?.addEventListener('touchstart', event => {
  photoSwipe = event.touches.length === 1
    ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
    : null;
}, { passive: true });
photoSurface?.addEventListener('touchmove', event => {
  if (event.touches.length !== 1) photoSwipe = null;
}, { passive: true });
photoSurface?.addEventListener('touchcancel', () => { photoSwipe = null; }, { passive: true });
photoSurface?.addEventListener('touchend', event => {
  const start = photoSwipe;
  photoSwipe = null;
  if (!start || event.touches.length || !event.changedTouches.length) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - start.x;
  const dy = touch.clientY - start.y;
  if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  renderLightboxPhoto(currentPhotoIndex + (dx < 0 ? 1 : -1), true);
}, { passive: true });

reducedMotionCleanups.push(() => {
  clearTimeout(switchTimer);
  if (lightbox?.open && currentPhotoIndex >= 0) renderLightboxPhoto(currentPhotoIndex, false);
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
