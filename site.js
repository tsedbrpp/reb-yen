'use strict';

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let prefersReducedMotion = reducedMotionQuery.matches;
const reducedMotionCleanups = [];

function onReducedMotionChange(event) {
  prefersReducedMotion = Boolean(event.matches);
  if (prefersReducedMotion) {
    reducedMotionCleanups.forEach(fn => fn());
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
  const homeSection = document.getElementById('home');
  const navObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          sectionLinks.forEach(navLink => navLink.removeAttribute('aria-current'));
          if (entry.target !== homeSection) {
            sectionLinks.get(entry.target)?.setAttribute('aria-current', 'location');
          }
        }
      });
    },
    { rootMargin: '-25% 0px -60% 0px' }
  );
  if (homeSection) navObserver.observe(homeSection);
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
    href: "https://www.reverbnation.com/rebyen/song/33863436-take-me-crazy-original",
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
    href: "https://www.reverbnation.com/rebyen/song/32896520-the-solitude-original--live",
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
    href: "https://www.reverbnation.com/rebyen/song/33992872-a-new-beginning-original",
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
    href: "https://www.reverbnation.com/rebyen/song/33391779-are-you-listening-now-original",
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
    desc: "An original studio recording written, arranged and performed by Reb on vocals, rhythm guitar, lead guitar and cajon—one of three songs featured on the ReverbNation homepage.",
    img: "images/songs/rn-35163458.jpg",
    pos: "50% 36%",
    alt: "Reb Yen singing and playing sunburst acoustic guitar on stage",
    caption: "Original studio recording · All tracks by Reb Yen",
    href: "https://www.reverbnation.com/rebyen/song/33355990-should-i-original",
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
    href: "https://www.reverbnation.com/rebyen/song/32930467-missing-clues-original--live",
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
    desc: "Written, arranged and performed by Reb (vocals, guitar, cajon) about knowing when to step back, heal and move forward—featured on the ReverbNation homepage.",
    img: "images/songs/rn-35109995.jpg",
    pos: "50% 38%",
    alt: "Reb Yen playing acoustic guitar on stage",
    caption: "Written, arranged & performed by Reb Yen",
    href: "https://www.reverbnation.com/rebyen/song/33993499-gotta-let-go-by-reb-yen-original",
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
    href: "https://www.reverbnation.com/rebyen/song/33866102-birds-of-prey-original--live",
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
    href: "https://www.reverbnation.com/rebyen/song/32896774-take-a-stand-original--live",
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
    href: "https://www.reverbnation.com/rebyen/song/32929366-i-can-feel-u--original",
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
    href: "https://www.reverbnation.com/rebyen/song/32981405-in-cyber-love--original-live",
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
    href: "https://www.reverbnation.com/rebyen/song/32557441-out-of-body--original",
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
    href: "https://www.reverbnation.com/rebyen/song/32901138-time-machine--original-live",
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
    href: "https://www.reverbnation.com/rebyen/song/32563022-the-storm--original-live",
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
    href: "https://www.reverbnation.com/rebyen/song/32693242-for-you-to-know-original-live",
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
    href: "https://www.reverbnation.com/rebyen/song/32520637-crawled-to-edge-original-1st-draft",
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
    href: "https://www.reverbnation.com/rebyen/song/33353012-rsvp--original-live",
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
    href: "https://www.reverbnation.com/rebyen/song/32943176-shut-in-world--reb-yen-jim-orourke",
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
    href: "https://www.reverbnation.com/rebyen/song/32178754-birds-prey-original-solo-version",
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
    href: "https://www.reverbnation.com/rebyen/song/31360418-dancing-with-my-cell-original-",
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
    href: "https://www.reverbnation.com/rebyen/song/32271655-solitude--original-full-version",
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
    href: "https://www.reverbnation.com/rebyen/song/31438949-are-you-listening-original-live",
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

// iOS WebKit blocks cross-origin iframe autoplay even with allow="autoplay", so
// on iPhone/iPad a freshly loaded track stays "cued" until the visitor taps ▶
// inside the ReverbNation widget. Desktop & Android start playing automatically.
const requiresWidgetTap =
  /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let isCued = false;
const ALBUM_MOTION_KEY = 'rebyen_album_motion_off';
let albumMotionOff = document.documentElement.classList.contains('album-motion-off');
try {
  if (window.localStorage.getItem(ALBUM_MOTION_KEY) === '1') {
    albumMotionOff = true;
  }
} catch {
  // Ignore storage restrictions
}
document.documentElement.classList.toggle('album-motion-off', albumMotionOff);

function isAlbumMotionDisabled() {
  return Boolean(prefersReducedMotion || albumMotionOff);
}

function createVinylPlatterController(el, baseTransform = '', rpmMs = 2800) {
  let spinAnim = null;
  let coastAnim = null;
  let rampRaf = 0;
  let isSpinning = false;

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
      spinAnim.playbackRate = 0.25 + 0.75 * (1 - Math.pow(1 - p, 2));
      if (p < 1) {
        rampRaf = requestAnimationFrame(ramp);
      } else {
        spinAnim.playbackRate = 1;
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

    coastAnim = el.animate(
      [
        { transform: `${baseTransform}rotate(${startDeg}deg)` },
        { transform: `${baseTransform}rotate(${startDeg + coastDelta}deg)` }
      ],
      { duration, easing: 'cubic-bezier(0.14, 0.74, 0.26, 1)' }
    );
    coastAnim.onfinish = () => {
      coastAnim = null;
    };
    coastAnim.oncancel = () => {
      coastAnim = null;
    };
  }

  return { start, easeToStop, stopImmediate };
}

const heroPlatter = createVinylPlatterController(heroDisc, '', 2800);
const sleevePlatter = createVinylPlatterController(sleeveDisc, 'translateY(-50%) ', 3400);

const albumMotionButtons = Array.from(
  document.querySelectorAll('[data-toggle-album-motion]')
);

function syncAlbumMotionButtons() {
  albumMotionButtons.forEach(btn => {
    btn.hidden = prefersReducedMotion;
    btn.setAttribute('aria-pressed', String(albumMotionOff));
    btn.setAttribute(
      'aria-label',
      albumMotionOff ? 'Resume album animation' : 'Stop album animation'
    );
    const icon = btn.querySelector('.motion-toggle-icon');
    const label = btn.querySelector('.motion-toggle-label');
    if (icon) icon.textContent = albumMotionOff ? '↻' : '⏸';
    if (label) {
      label.textContent = albumMotionOff ? 'Resume animation' : 'Stop animation';
    }
  });
}

function setAlbumMotionOff(nextOff, { persist = true } = {}) {
  albumMotionOff = Boolean(nextOff);
  document.documentElement.classList.toggle('album-motion-off', albumMotionOff);

  if (persist) {
    try {
      if (albumMotionOff) {
        window.localStorage.setItem(ALBUM_MOTION_KEY, '1');
      } else {
        window.localStorage.removeItem(ALBUM_MOTION_KEY);
      }
    } catch {
      // Ignore storage restrictions
    }
  }

  if (albumMotionOff) {
    heroTurntable?.classList.add('has-entered');
    const featureArt = featureSleeve?.querySelector('.feature-art');
    if (featureArt) {
      featureArt.classList.remove('is-tilting');
      featureArt.style.removeProperty('--rx');
      featureArt.style.removeProperty('--ry');
    }
  }

  syncAlbumMotionButtons();
  syncPlatters();

  if (playerStatus) {
    playerStatus.textContent = albumMotionOff
      ? 'Album animation stopped.'
      : 'Album animation resumed.';
  }
}

albumMotionButtons.forEach(btn => {
  btn.addEventListener('click', event => {
    event.stopPropagation();
    setAlbumMotionOff(!albumMotionOff);
  });
});

function syncPlatters() {
  if (isAlbumMotionDisabled()) {
    heroPlatter.stopImmediate();
    sleevePlatter.stopImmediate();
    return;
  }
  const shouldSpin = Boolean(selectedTrack && !isCued);
  if (shouldSpin) {
    heroPlatter.start();
    sleevePlatter.start();
  } else {
    heroPlatter.easeToStop();
    sleevePlatter.easeToStop();
  }
}

syncAlbumMotionButtons();

reducedMotionCleanups.push(() => {
  heroPlatter.stopImmediate();
  sleevePlatter.stopImmediate();
  heroSection?.style.removeProperty('--hero-parallax');
  heroTurntable?.classList.add('has-entered');
  syncAlbumMotionButtons();
});
reducedMotionQuery?.addEventListener?.('change', syncAlbumMotionButtons);

if (heroTurntable) {
  if (isAlbumMotionDisabled()) {
    heroTurntable.classList.add('has-entered');
  } else {
    window.setTimeout(() => {
      heroTurntable.classList.add('has-entered');
    }, 1350);
  }
}

function reverbnationEmbedUrl(trackId) {
  return `https://www.reverbnation.com/widget_code/html_widget/artist_6720947?widget_id=55&pwc[included_songs]=0&pwc[song_ids]=${encodeURIComponent(trackId)}&context_type=song&pwc[size]=small&pwc[autoplay]=1`;
}

function setCued(cued) {
  isCued = Boolean(cued && selectedTrack);
  player?.classList.toggle('is-cued', isCued);
  heroRecord?.classList.toggle('is-cued', isCued);
  featureSleeve?.classList.toggle('is-cued', isCued);
  syncPlatters();
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
  if (featureSleeve) {
    featureSleeve.setAttribute('aria-label', `Play featured song: ${meta.title}`);
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

  featureSleeve?.classList.toggle('is-playing', Boolean(isPlaying));
}

featureSleeve?.addEventListener('click', () => {
  featuredListenBtn?.click();
});
featureSleeve?.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    featuredListenBtn?.click();
  }
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
    isLoaded ? `Change song — now playing ${name}` : 'Tap to pick a song'
  );
  if (recordLabelTitle) recordLabelTitle.textContent = isLoaded ? name : 'Tap to pick a song';

  if (recordNowLabel) {
    if (recordNowLabelText) {
      recordNowLabelText.textContent = isCued ? 'Selected · Tap ▶ in player' : 'Now playing';
    }
    recordNowLabel.hidden = !isLoaded;
  }
  if (playerEyebrow) {
    playerEyebrow.innerHTML = isLoaded
      ? `<span class="eq-bars eq-bars-now" aria-hidden="true"><i></i><i></i><i></i><i></i></span> ${isCued ? 'Selected · Tap ▶ below' : 'Now playing'}`
      : 'Music player';
  }
  syncPlatters();
  if (recordNowTitle) {
    recordNowTitle.textContent = isLoaded ? name : 'Original songs';
    recordNowTitle.classList.toggle('is-idle', !isLoaded);
  }
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

function renderCatalogPage({ animate = false, announce = false, scrollCatalogIntoView = false } = {}) {
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
    row.classList.remove('is-filtered-in');
    if (visible && animate && !prefersReducedMotion) {
      void row.offsetWidth;
      row.classList.add('is-filtered-in');
    }
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

  if (announce && playerStatus && total > 0) {
    playerStatus.textContent = `Page ${currentCatalogPage} of ${totalPages}: showing songs ${startIdx + 1} to ${endIdx} of ${total}.`;
  }

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

// Hero turntable & Listen button: tapping opens the 22-song picker.
heroRecord?.addEventListener('click', openSongPicker);
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
  });
});

// ============================================================================
// Choreographed Scroll-Reveal Storytelling (Sections & Staggered Cards)
// ============================================================================
if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js-motion');

  const staggerGroups = [
    { parent: '.moment-grid', children: '.moment-card', step: 45, mod: 5 },
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

  // Fade whole below-the-fold sections in as you scroll (for #music, fade its
  // top-level blocks individually so #music-player can dock fixed at any time).
  document.querySelectorAll('main > section:not(#home):not(#music)').forEach(sec => {
    revealTargets.add(sec);
  });

  document
    .querySelectorAll(
      '#music .section-head, #music .feature-sleeve-wrap, #music .featured-copy > :not(.player-slot), #music .player-slot, #music .catalog-head, #music .song-list, [data-reveal], .recognition-inner, .section-head, .upcoming, .stage-spec-panel, .about-image, .about-copy, .contact-grid > div, .press-main h2, .press-main > p, .press-facts'
    )
    .forEach(el => revealTargets.add(el));

  staggerGroups.forEach(({ parent, children, step, mod }) => {
    document.querySelectorAll(parent).forEach(group => {
      group.querySelectorAll(children).forEach((item, index) => {
        item.style.setProperty('--stagger', `${(index % mod) * step}ms`);
        revealTargets.add(item);
      });
    });
  });

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
    { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
  );

  revealTargets.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top > viewportCutoff) {
      el.classList.add('reveal-ready');
      revealObserver.observe(el);
    }
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
    if (momentListenLabel) momentListenLabel.textContent = 'Playing';
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
    TRACK_META[pairing.trackId]?.href || 'https://www.reverbnation.com/rebyen';
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
    window.requestAnimationFrame(() => {
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
