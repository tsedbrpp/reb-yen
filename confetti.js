'use strict';

/* ------------------------------------------------------------------
   Thank-you page celebration: one confetti burst after a contact
   form is sent. Skipped for prefers-reduced-motion. The canvas is
   non-interactive, aria-hidden, and removed when the burst ends.
------------------------------------------------------------------- */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) return;

  const COLORS = ['#df733f', '#ee8a57', '#f7eedf', '#e3d2b8', '#f2c14e', '#862d0e', '#246460'];

  function burst() {
    if (document.hidden) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return; }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);

    const card = document.querySelector('.thanks-card h1');
    const rect = card ? card.getBoundingClientRect() : { top: H * 0.4, height: 0 };
    const originY = Math.min(H * 0.65, Math.max(rect.top + rect.height / 2, H * 0.3));
    const count = W < 700 ? 80 : 150;
    const pieces = [];
    const launch = (x, dir) => {
      for (let i = 0; i < count / 2; i++) {
        const angle = (-Math.PI / 2) + dir * (0.25 + Math.random() * 0.7);
        const speed = (W < 700 ? 10 : 13) + Math.random() * 7;
        pieces.push({
          x, y: originY,
          vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.6),
          vy: Math.sin(angle) * speed,
          w: 6 + Math.random() * 6,
          h: 4 + Math.random() * 5,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.35,
          tilt: Math.random() * Math.PI * 2,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          round: Math.random() < 0.28
        });
      }
    };
    launch(W * 0.08, 1);
    launch(W * 0.92, -1);

    const DURATION = 3000;
    const start = performance.now();
    let rafId = 0;
    const stop = () => { cancelAnimationFrame(rafId); canvas.remove(); };
    reduceMotion.addEventListener?.('change', e => { if (e.matches) stop(); });

    const frame = now => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = t > DURATION - 800 ? Math.max(0, (DURATION - t) / 800) : 1;
      for (const p of pieces) {
        p.vy += 0.32;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.tilt += 0.12;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.h / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const squash = Math.abs(Math.cos(p.tilt));
          ctx.fillRect(-p.w / 2, -(p.h * squash) / 2, p.w, p.h * squash + 0.5);
        }
        ctx.restore();
      }
      if (t < DURATION) rafId = requestAnimationFrame(frame);
      else stop();
    };
    rafId = requestAnimationFrame(frame);
  }

  const go = () => setTimeout(burst, 350);
  if (document.readyState === 'complete') go();
  else window.addEventListener('load', go, { once: true });
})();
