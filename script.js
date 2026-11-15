(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  $('#year').textContent = new Date().getFullYear();

  /* ---------- split headlines into words ---------- */
  $$('[data-split]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words
      .map((w, i) => `<span class="w" aria-hidden="true"><span class="wi" style="--d:${(i * 0.08).toFixed(2)}s">${w}</span></span>`)
      .join(' ');
  });

  /* ---------- stagger children ---------- */
  $$('[data-stagger]').forEach((group) => {
    $$('[data-reveal]', group).forEach((child, i) => child.style.setProperty('--d', `${(i * 0.09).toFixed(2)}s`));
  });

  /* ---------- scroll reveal (replays each time an element re-enters from below) ---------- */
  const timers = new WeakMap();

  const onReveal = (el) => {
    el.classList.add('is-in');
    const t = [setTimeout(() => el.classList.add('is-settled'), 1400)];
    if (el.dataset.step) t.push(...runSteps(el));
    timers.set(el, t);
  };

  const onHide = (el) => {
    (timers.get(el) || []).forEach(clearTimeout);
    el.classList.remove('is-in', 'is-settled');
    el.style.transform = '';
    $$('.steps li', el).forEach((li) => li.classList.remove('is-done', 'is-now'));
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (!e.target.classList.contains('is-in')) onReveal(e.target);
        } else if (!reduced && e.boundingClientRect.top > innerHeight * 0.6) {
          // left through the bottom edge: reset so it animates in again on the way back down
          onHide(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal], [data-split]').forEach((el) => io.observe(el));
  } else {
    $$('[data-reveal], [data-split]').forEach(onReveal);
  }

  /* ---------- pipeline steppers ---------- */
  function runSteps(card) {
    const n = +card.dataset.step;
    return $$('.steps li', card).slice(0, n).map((li, i) => setTimeout(() => {
      li.classList.add('is-done');
      if (i === n - 1) li.classList.add('is-now');
    }, 500 + i * 260));
  }

  /* ---------- scroll-driven: progress bar, nav, timeline ---------- */
  const progress = $('#progress');
  const nav = $('#nav');
  const timeline = $('#timeline');
  const fill = $('#timelineFill');
  const heroPhoto = $('#heroPhoto');
  let lastY = 0;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    nav.classList.toggle('is-scrolled', y > 30);
    const menuOpen = $('#navLinks').classList.contains('is-open');
    nav.classList.toggle('is-hidden', !menuOpen && y > 500 && y > lastY + 4);
    if (y < lastY - 4) nav.classList.remove('is-hidden');
    lastY = y;

    if (heroPhoto && !reduced && y < innerHeight * 1.2) {
      heroPhoto.style.transform = `translateY(${y * 0.09}px)`;
    }

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      fill.style.transform = `scaleY(${clamp((innerHeight * 0.62 - r.top) / r.height, 0, 1)})`;
    }
    ticking = false;
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- active nav link ---------- */
  const links = $$('#navLinks a');
  const byId = Object.fromEntries(links.map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('is-active'));
        const a = byId[e.target.id];
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => spy.observe(s));
  }

  /* ---------- mobile menu ---------- */
  const toggle = $('#navToggle');
  const menu = $('#navLinks');
  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  links.forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- rotating phrase ---------- */
  const rot = $('#rotator');
  const phrases = ['brain signals', 'muscle activity', 'human movement', 'noisy biosignals'];
  if (rot && !reduced) {
    let i = 0;
    setInterval(() => {
      rot.classList.add('is-out');
      setTimeout(() => {
        i = (i + 1) % phrases.length;
        rot.textContent = phrases[i];
        rot.classList.remove('is-out');
      }, 360);
    }, 2600);
  }

  /* ---------- pointer effects (desktop only) ---------- */
  if (finePointer && !reduced) {
    // custom cursor
    const cursor = $('#cursor');
    let cx = 0, cy = 0, tx = 0, ty = 0;
    addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; cursor.classList.add('is-on'); });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
    (function follow() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(follow);
    })();
    $$('a, button, [data-tilt]').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });

    // 3D tilt + spotlight
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        if (!el.classList.contains('is-settled')) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
        el.style.transition = 'transform .12s linear, border-color .3s, box-shadow .4s, background .35s, color .35s';
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 7}deg) translateY(-4px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = '';
        el.style.transform = '';
      });
    });

    // magnetic buttons
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.3}px, ${dy * 0.4}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- contact ---------- */
  const EMAIL = 'sukritghosh03@gmail.com';
  const copyBtn = $('#copyMail');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      copyBtn.textContent = 'Copied ✓';
    } catch {
      copyBtn.textContent = EMAIL;
    }
    copyBtn.classList.add('is-done');
    setTimeout(() => { copyBtn.textContent = 'Copy email'; copyBtn.classList.remove('is-done'); }, 2000);
  });

  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = `${f.get('message')}\n\n— ${f.get('name')}`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(f.get('subject'))}&body=${encodeURIComponent(body)}`;
  });

  /* ---------- hero signal canvas (multi-channel biosignal traces) ---------- */
  const canvas = $('#signal');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const CH = 9;                       // channels
    const ACCENT = [2, 6];              // highlighted channels
    let w = 0, h = 0, dpr = 1, visible = true;
    let mx = -9999, my = -9999;

    const chans = Array.from({ length: CH }, (_, i) => ({
      f1: 0.006 + i * 0.0011,
      f2: 0.019 + ((i * 7) % 5) * 0.004,
      f3: 0.052 + ((i * 3) % 4) * 0.011,
      ph: i * 1.7,
      speed: 0.5 + ((i * 5) % 4) * 0.14,
      burst: 0.00055 + ((i * 3) % 5) * 0.00012,
    }));

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const gap = h / (CH + 1);
      const step = w < 700 ? 5 : 3;

      chans.forEach((c, i) => {
        const base = gap * (i + 1);
        const isAccent = ACCENT.includes(i);
        const shift = t * 0.06 * c.speed;
        ctx.beginPath();
        for (let x = 0; x <= w; x += step) {
          const u = x + shift;
          // slow envelope produces occasional "bursts" of activity
          const env = 0.35 + 0.65 * Math.pow(Math.abs(Math.sin(u * c.burst * 6 + c.ph)), 6);
          // proximity to the pointer boosts amplitude
          const d = Math.hypot(x - mx, base - my);
          const boost = 1 + 2.2 * Math.exp(-(d * d) / 26000);
          const y = base + env * boost * gap * 0.3 * (
            Math.sin(u * c.f1 + c.ph) * 0.55 +
            Math.sin(u * c.f2 + c.ph * 2.1) * 0.3 +
            Math.sin(u * c.f3 + c.ph * 0.7) * 0.22 +
            Math.sin(u * 0.21 + i) * 0.07
          );
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineWidth = isAccent ? 1.8 : 1.1;
        ctx.strokeStyle = isAccent ? 'rgba(37,99,235,.85)' : 'rgba(11,11,12,.2)';
        ctx.stroke();
      });
    }

    function loop(t) {
      if (visible) draw(t);
      requestAnimationFrame(loop);
    }

    resize();
    addEventListener('resize', resize);
    const hero = canvas.parentElement;
    hero.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
    });
    hero.addEventListener('mouseleave', () => { mx = my = -9999; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    }
    if (reduced) draw(0); else requestAnimationFrame(loop);
  }
})();
