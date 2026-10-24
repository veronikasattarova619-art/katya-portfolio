(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- переход между страницами: затемнение ---------- */

  const enter = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  enter();

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      root.classList.remove('is-leaving');
      enter();
    }
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    root.classList.add('is-leaving');
    setTimeout(() => { location.href = url.href; }, reduce ? 0 : 560);
  });

  /* ---------- появление при скролле ---------- */

  const items = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('reveal-on');
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- рассвет в рассказе: свет растёт со скроллом ---------- */

  const dawn = document.querySelector('[data-dawn]');
  if (dawn) {
    let queued = false;
    const update = () => {
      queued = false;
      const r = dawn.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / (span || 1)));
      dawn.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ---------- лайтбокс ---------- */

  const groups = {};
  document.querySelectorAll('[data-lightbox]').forEach((a) => {
    (groups[a.dataset.lightbox] ||= []).push(a);
  });
  if (!Object.keys(groups).length) return;

  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Просмотр изображения');
  lb.innerHTML = `
    <button class="lb__prev" type="button" aria-label="Предыдущее">←</button>
    <figure><img alt=""><figcaption class="kicker"></figcaption></figure>
    <button class="lb__next" type="button" aria-label="Следующее">→</button>
    <button class="lb__close" type="button">Закрыть ✕</button>`;
  document.body.appendChild(lb);

  const pic = lb.querySelector('img');
  const cap = lb.querySelector('figcaption');
  let group = [];
  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + group.length) % group.length;
    const a = group[index];
    const thumb = a.querySelector('img');
    pic.src = a.href;
    pic.alt = thumb ? thumb.alt : '';
    cap.textContent = `${a.dataset.caption || ''} · ${index + 1} / ${group.length}`;
    lb.classList.toggle('is-paper', a.dataset.lightbox === 'looks');
  };

  const open = (name, i, from) => {
    group = groups[name];
    opener = from;
    show(i);
    lb.classList.add('is-open');
    root.style.overflow = 'hidden';
    lb.querySelector('.lb__close').focus();
  };

  const close = () => {
    lb.classList.remove('is-open');
    root.style.overflow = '';
    if (opener) opener.focus();
  };

  Object.entries(groups).forEach(([name, list]) => {
    list.forEach((a, i) => a.addEventListener('click', (e) => {
      e.preventDefault();
      open(name, i, a);
    }));
  });

  lb.querySelector('.lb__prev').addEventListener('click', () => show(index - 1));
  lb.querySelector('.lb__next').addEventListener('click', () => show(index + 1));
  lb.querySelector('.lb__close').addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'FIGURE') close(); });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
