/* ==========================================================================
   BASSCRAFT — Countdown / urgency modal (Roadmap Priority 1)
   --------------------------------------------------------------------------
   ⚠ CONFIRM WITH DAN BEFORE THIS IS SHOWN PUBLICLY:
       BC_DEADLINE  — the pre-order cut-off the clock counts down to.
       The offer copy lives in index.html (.cd-offer) — it is placeholder text.
   Both are stubbed so the mechanic can be reviewed; neither is a real promise
   to a buyer yet.
   ========================================================================== */

// Sept 1 2026, 23:59 local — taken from the roadmap doc's "Sept 1 launch /
// pre-order deadline". Placeholder until the real date is locked.
const BC_DEADLINE = new Date('2026-09-01T23:59:00');

// How long after landing the modal appears, and how long a dismissal sticks.
const BC_DELAY_MS   = 4000;
const BC_SNOOZE_KEY = 'bc_countdown_dismissed_at';
const BC_SNOOZE_MS  = 1000 * 60 * 60 * 24 * 7; // a week

(function () {
  const overlay = document.getElementById('cd-overlay');
  if (!overlay) return;

  const els = {
    d: document.getElementById('cd-d'),
    h: document.getElementById('cd-h'),
    m: document.getElementById('cd-m'),
    s: document.getElementById('cd-s')
  };

  let ticker = null;

  const pad = n => String(Math.max(0, n)).padStart(2, '0');

  function tick() {
    const left = BC_DEADLINE - Date.now();
    if (left <= 0) {
      // Past the deadline the clock would count upward into negatives, which
      // looks broken — freeze at zero and let the copy carry the message.
      els.d.textContent = '00'; els.h.textContent = '00';
      els.m.textContent = '00'; els.s.textContent = '00';
      clearInterval(ticker);
      return;
    }
    const sec = Math.floor(left / 1000);
    els.d.textContent = pad(Math.floor(sec / 86400));
    els.h.textContent = pad(Math.floor(sec % 86400 / 3600));
    els.m.textContent = pad(Math.floor(sec % 3600 / 60));
    els.s.textContent = pad(sec % 60);
  }

  function open() {
    overlay.hidden = false;
    // Next frame, so the browser has a painted "hidden" state to transition from.
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    tick();
    ticker = setInterval(tick, 1000);
    document.body.style.overflow = 'hidden';
  }

  function close(remember) {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    clearInterval(ticker);
    if (remember) {
      try { localStorage.setItem(BC_SNOOZE_KEY, String(Date.now())); } catch (e) {}
    }
    // Match the CSS fade before pulling it out of the a11y tree.
    setTimeout(() => { overlay.hidden = true; }, 300);
  }

  function recentlyDismissed() {
    try {
      const at = Number(localStorage.getItem(BC_SNOOZE_KEY));
      return at && (Date.now() - at) < BC_SNOOZE_MS;
    } catch (e) { return false; }
  }

  document.getElementById('cd-close').addEventListener('click', () => close(true));
  document.getElementById('cd-dismiss').addEventListener('click', () => close(true));
  overlay.addEventListener('click', e => { if (e.target === overlay) close(true); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) close(true);
  });

  // No back end yet — capture is stubbed so the flow can be clicked through.
  // Swap for the real list provider (Klaviyo/Mailchimp/etc.) when it's chosen.
  document.getElementById('cd-form').addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('cd-email').value.trim();
    if (!email || !email.includes('@')) return;
    console.log('[countdown] capture stub —', email);
    const modal = overlay.querySelector('.cd-modal');
    modal.innerHTML = '<p class="cd-eyebrow">You\'re on the list.</p>' +
      '<h2 class="cd-title">See you at launch.</h2>' +
      '<p class="cd-offer">We\'ll email your founding-buyer code the moment pre-orders open.</p>';
    setTimeout(() => close(true), 2600);
  });

  if (!recentlyDismissed() && BC_DEADLINE > Date.now()) {
    setTimeout(open, BC_DELAY_MS);
  }
})();
