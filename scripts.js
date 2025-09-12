// Mindcore Landing Interactions

(function() {
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // Smooth scroll for elements with data-scroll-to
  qsa('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-scroll-to');
      const el = qs(target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Scroll reveal using IntersectionObserver
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  qsa('[data-reveal]').forEach(el => io.observe(el));

  // Modal logic
  const modal = qs('#interest-modal');
  const form = qs('#interest-form');
  const success = qs('.form-success');
  let lastFocus = null;

  function openModal() {
    lastFocus = document.activeElement;
    modal.setAttribute('aria-hidden', 'false');
    modal.setAttribute('aria-modal', 'true');
    const firstInput = qs('input[name="email"]', form);
    setTimeout(() => firstInput && firstInput.focus(), 50);
    trapFocus(modal);
  }
  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-modal', 'false');
    releaseFocus();
    if (lastFocus) lastFocus.focus();
  }
  qsa('[data-open-modal]').forEach(el => el.addEventListener('click', openModal));
  qsa('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
  modal.addEventListener('click', (e) => {
    if (e.target.matches('.modal-backdrop')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
  });

  // Focus trap
  let focusTrapHandler = null;
  function trapFocus(container) {
    const FOCUSABLE = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusables = () => qsa(FOCUSABLE, container).filter(el => !el.hasAttribute('disabled'));
    focusTrapHandler = (e) => {
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', focusTrapHandler);
  }
  function releaseFocus() {
    if (focusTrapHandler) document.removeEventListener('keydown', focusTrapHandler);
  }

  // Interest form handling
  function composeMessage(email, use) {
    return `Early Access Interest\nEmail: ${email}\nUse case: ${use}`;
  }
  function updateMailto(email, use) {
    const a = qs('[data-mailto]');
    const subject = encodeURIComponent('Mindcore Early Access');
    const body = encodeURIComponent(composeMessage(email, use));
    a.href = `mailto:team@mindcore.local?subject=${subject}&body=${body}`;
  }
  function downloadJSON(data, filename = 'mindcore_interest.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  form.addEventListener('input', () => {
    const email = form.email.value.trim();
    const use = form.use.value.trim();
    updateMailto(email, use);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const use = form.use.value.trim();
    const record = { email, use, ts: new Date().toISOString() };
    try {
      const existing = JSON.parse(localStorage.getItem('mindcore_interest') || '[]');
      existing.push(record);
      localStorage.setItem('mindcore_interest', JSON.stringify(existing));
    } catch {}
    // Provide immediate feedback
    qs('.form', modal).hidden = true;
    success.hidden = false;
    // optional auto-close after delay
    setTimeout(closeModal, 1600);
  });

  qs('[data-copy]').addEventListener('click', async () => {
    const email = form.email.value.trim();
    const use = form.use.value.trim();
    try {
      await navigator.clipboard.writeText(composeMessage(email, use));
      qs('[data-copy]').textContent = 'Copied!';
      setTimeout(() => qs('[data-copy]').textContent = 'Copy message', 1400);
    } catch {}
  });

  const exportBtn = qs('[data-export]');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const email = form.email.value.trim();
      const use = form.use.value.trim();
      downloadJSON({ email, use, ts: new Date().toISOString() });
    });
  }

  // Background canvas particles
  const canvas = qs('#bg');
  const ctx = canvas.getContext('2d');
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let w = 0, h = 0;
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const NUM = 120; // particles
  const particles = [];
  const rand = (min, max) => Math.random() * (max - min) + min;
  const center = { x: () => w / 2, y: () => h / 2 };
  for (let i = 0; i < NUM; i++) {
    particles.push({
      radius: rand(0.6, 2.2),
      angle: rand(0, Math.PI * 2),
      dist: rand(40, Math.min(w, h) * 0.55),
      speed: rand(0.0006, 0.0018),
      twinkle: rand(0.2, 1),
    });
  }

  const mouse = { x: center.x(), y: center.y() };
  document.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    updateGradient(e.clientX, e.clientY);
  });
  function updateGradient(x, y) {
    const g = qs('#gradient');
    g.style.background = `radial-gradient(600px 600px at ${x}px ${y}px, rgba(255,255,255,0.10), transparent 60%),
      radial-gradient(800px 800px at 80% 20%, rgba(255,255,255,0.05), transparent 60%),
      radial-gradient(800px 800px at 20% 80%, rgba(255,255,255,0.05), transparent 60%)`;
  }
  updateGradient(center.x(), center.y());

  function tick(t) {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.angle += p.speed;
      const swayX = (mouse.x - center.x()) * 0.02;
      const swayY = (mouse.y - center.y()) * 0.02;
      const x = center.x() + Math.cos(p.angle) * p.dist + swayX;
      const y = center.y() + Math.sin(p.angle) * p.dist + swayY;
      const alpha = 0.35 + 0.35 * Math.sin(t * 0.002 + p.twinkle);
      ctx.beginPath();
      ctx.arc(x, y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();


