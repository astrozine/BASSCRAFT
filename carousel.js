/* ==========================================================================
   BASSCRAFT — mobile swipe carousels
   --------------------------------------------------------------------------
   Turns any row of side-by-side cards into a swipeable, snapping carousel with
   dot indicators on phones (the LiberNovo pattern), and leaves it as the normal
   grid on wider screens.

   Opt in from markup with data-carousel on the grid element. The dots are
   generated here rather than authored by hand so they can't drift out of sync
   with the number of cards.

   Deliberately its own file, not bolted onto app.js: it only reads scroll
   position and appends a <nav> sibling, so it can't interfere with the video /
   lightbox / accordion machinery in there.
   ========================================================================== */

(function () {
  const MOBILE = '(max-width: 768px)';

  function build(track) {
    const cards = Array.from(track.children).filter(el => !el.classList.contains('carousel-dots'));
    // One card is not a carousel, and two is marginal — but the client asked
    // for this on rows of three, so anything under two stays a plain grid.
    if (cards.length < 2) return null;

    const dots = document.createElement('nav');
    dots.className = 'carousel-dots';
    dots.setAttribute('aria-label', 'Choose a slide');

    cards.forEach((card, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `Go to item ${i + 1} of ${cards.length}`);
      dot.addEventListener('click', () => {
        // scrollIntoView on the card itself would also scroll the *page*
        // vertically to reach it; setting scrollLeft keeps it horizontal-only.
        track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: 'smooth' });
      });
      dots.appendChild(dot);
    });

    track.insertAdjacentElement('afterend', dots);

    // Reflect scroll position back onto the dots. rAF-throttled because scroll
    // fires far more often than we need to repaint six dots.
    let ticking = false;
    const sync = () => {
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = 0, bestDist = Infinity;
      cards.forEach((card, i) => {
        const c = card.offsetLeft - track.offsetLeft + card.offsetWidth / 2;
        const d = Math.abs(c - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      dots.querySelectorAll('.carousel-dot').forEach((d, i) => {
        d.classList.toggle('is-active', i === best);
      });
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    };
    track.addEventListener('scroll', onScroll, { passive: true });

    return { dots, onScroll, track, sync };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tracks = Array.from(document.querySelectorAll('[data-carousel]'));
    if (!tracks.length) return;

    const mq = window.matchMedia(MOBILE);
    const built = new Map();

    const apply = () => {
      tracks.forEach(track => {
        if (mq.matches && !built.has(track)) {
          track.classList.add('is-carousel');
          const inst = build(track);
          if (inst) { built.set(track, inst); inst.sync(); }
          else track.classList.remove('is-carousel');
        } else if (!mq.matches && built.has(track)) {
          const inst = built.get(track);
          track.classList.remove('is-carousel');
          track.removeEventListener('scroll', inst.onScroll);
          inst.dots.remove();
          built.delete(track);
          track.scrollLeft = 0;
        }
      });
    };

    apply();
    // addEventListener on MediaQueryList (not the deprecated addListener).
    mq.addEventListener('change', apply);
  });
})();
