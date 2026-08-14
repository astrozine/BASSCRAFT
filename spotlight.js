/* ==========================================================================
   BASSCRAFT — genre spotlight
   --------------------------------------------------------------------------
   Holds one clip large in the centre of a row with the rest smaller either
   side. Clicking a side clip promotes it to the centre; clicking the centre
   clip falls through to the normal video-lightbox handler in app.js.

   Two things worth knowing:

   1) Promotion is done with CSS `order`, never by moving nodes. Re-parenting a
      <video> tears down and restarts playback, so the clips would visibly
      re-buffer every time you picked one.

   2) The click is intercepted in the CAPTURE phase on the container. app.js
      binds its lightbox opener directly on each .vid-clickable, and capture
      runs root-to-target — so stopping it here keeps the lightbox from opening
      when the user only meant "bring that one forward".

   Desktop only. Under 768px the same row is a swipeable carousel (carousel.js),
   where three side-by-side tiles would be too small to read.
   ========================================================================== */

(function () {
  const DESKTOP = '(min-width: 769px)';

  function setup(stage) {
    const items = Array.from(stage.querySelectorAll(':scope > .genre-item'));
    if (items.length < 2) return null;

    let active = Math.floor(items.length / 2); // start with the middle one

    const paint = () => {
      // Non-active items fill the slots either side, keeping their original
      // relative order; the active one takes the middle slot.
      const others = items.filter((_, i) => i !== active);
      const half = Math.ceil(others.length / 2);
      others.forEach((el, k) => {
        el.style.order = String(k < half ? k : k + 1);
        el.classList.remove('is-active');
        el.querySelector('.vid-r')?.setAttribute('aria-label', 'Bring this genre forward');
      });
      const activeEl = items[active];
      activeEl.style.order = String(half);
      activeEl.classList.add('is-active');
      activeEl.querySelector('.vid-r')?.setAttribute('aria-label', 'Play this genre full screen');
    };

    const onCapture = (e) => {
      // Only meddle while the spotlight is the active layout.
      if (!stage.classList.contains('is-spotlight')) return;
      const item = e.target.closest('.genre-item');
      if (!item) return;
      const idx = items.indexOf(item);
      if (idx === -1 || idx === active) return; // centre click → let the lightbox open
      e.preventDefault();
      e.stopPropagation();
      active = idx;
      paint();
    };

    stage.addEventListener('click', onCapture, true);

    // Keyboard parity: the tiles are already focusable via the lightbox markup
    // in app.js, so mirror Enter/Space onto promotion for side items.
    stage.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (!stage.classList.contains('is-spotlight')) return;
      const item = e.target.closest('.genre-item');
      if (!item) return;
      const idx = items.indexOf(item);
      if (idx === -1 || idx === active) return;
      e.preventDefault();
      e.stopPropagation();
      active = idx;
      paint();
    }, true);

    return {
      enable() { stage.classList.add('is-spotlight'); paint(); },
      disable() {
        stage.classList.remove('is-spotlight');
        items.forEach(el => { el.style.order = ''; el.classList.remove('is-active'); });
      },
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const stages = Array.from(document.querySelectorAll('[data-spotlight]'));
    if (!stages.length) return;
    const mq = window.matchMedia(DESKTOP);
    const insts = stages.map(setup).filter(Boolean);

    const apply = () => insts.forEach(i => (mq.matches ? i.enable() : i.disable()));
    apply();
    mq.addEventListener('change', apply);
  });
})();
