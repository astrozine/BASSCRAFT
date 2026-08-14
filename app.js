/* ==========================================================================
   BASSCRAFT — Front-end v4
   Responsive media swap · Overlays & lightboxes · Video power management · Cart
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════════════════════════════════
   0. SCROLL LOCK — shared by every full-screen overlay
   ══════════════════════════════════════════════════════════════
   `overflow: hidden` on <body> alone does NOT stop the page scrolling
   behind a fixed overlay on mobile Safari — a swipe over the backdrop
   still scrolls the real page underneath it. The fix that actually holds
   there is pinning <body> itself with position:fixed and restoring the
   saved scrollY on release.

   Keyed by owner (not a bare counter) so nested overlays — the cart, then
   its product-photo viewer opened on top of it — hold independent claims:
   the inner one closing doesn't unlock the page while the cart is still
   open underneath, and re-locking with a key that's already held is just
   a no-op instead of requiring every call site to track "did I already
   lock this?" itself. `reset(...keys)` releases specific claims at once —
   the chrome's own nav/buy controls use it to drop every VIEWER on top of
   the cart without touching the cart's own claim, since the two disagree
   about what should happen to the cart next. */
const scrollLock = (() => {
  const holders = new Set();
  let savedY = 0;
  const apply = () => {
    savedY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  };
  const release = () => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, savedY);
  };
  const lock = (key) => {
    if (holders.size === 0) apply();
    holders.add(key);
  };
  const unlock = (key) => {
    // Bail before touching anything if this key was never actually held —
    // callers that unlock defensively/unconditionally (setSpecFullscreen(el,
    // false) runs on every tab switch whether or not fullscreen was ever
    // entered) would otherwise still see holders.size hit 0 and fire
    // release(), which unconditionally scrollTo(0, savedY)'s the page —
    // savedY being 0 (or stale) since nothing genuinely locked it. That's
    // what caused desktop Tech Specs clicks to jump the page to the top.
    if (!holders.has(key)) return;
    holders.delete(key);
    if (holders.size === 0) release();
  };
  const reset = (...keys) => {
    if (holders.size === 0) return; // nothing held — same guard as unlock()
    keys.forEach(k => holders.delete(k));
    if (holders.size === 0) release();
  };
  return { lock, unlock, reset };
})();

// The video-lightbox and doc-lightbox each define their real close function
// (with its display:none-after-fade teardown) inside their own IIFE further
// down — not reachable from the shared chrome's "close whatever's open"
// logic otherwise. Each IIFE registers itself here once it runs; the chrome
// calls through this rather than touching those overlays' DOM/classes
// directly, so there's exactly one close path per overlay, not two that can
// drift out of sync.
const lightboxCloseFns = {};

// Global UI sync for all video play buttons & Hero fade
document.querySelectorAll('video').forEach(vid => {
  vid.addEventListener('play', function() {
    const w = this.closest('.vid-wrap') || this.closest('.vid-paused');
    if (w) w.classList.add('is-playing');
  });
  vid.addEventListener('pause', function() {
    const w = this.closest('.vid-wrap') || this.closest('.vid-paused');
    if (w) w.classList.remove('is-playing');
  });
});

// NOTE: hero text/CTA used to fade out near the end of each loop of the hero
// video. Client feedback (July 24 meeting) was explicit that the Buy button
// must be ever-present, so the hero overlay no longer hides on loop.

/* ══════════════════════════════════════════════════════════════
   1. RESPONSIVE VIDEO SOURCE SWAP
   ══════════════════════════════════════════════════════════════ */
/* Mobile browsers fire `resize` continuously while you scroll — collapsing and
   re-expanding the URL bar changes innerHeight, which counts as a resize. Every
   responsive handler here keys off innerWidth ONLY, so those height-only events
   are pure waste: each one re-ran querySelectorAll over every video plus a
   .closest() per video, and could re-enter the source-swap/appendChild paths,
   all on the scroll thread. That's what made the videos stutter while scrolling.
   Gate on a real width change and debounce the rest. */
function onWidthResize(fn) {
  let lastWidth = window.innerWidth;
  let timer = null;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;   // URL-bar height change only
    lastWidth = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(fn, 150);
  });
}

function setResponsiveVideoSources() {
  const isMobile = window.innerWidth <= 768;
  // #hero-video handles its own responsive source swap + load/play timing
  // (inline script next to its markup) — this generic handler's speculative
  // play()-then-pause()-if-not-autoplay would fight it now that it no longer
  // autoplays natively.
  document.querySelectorAll('video[data-h]:not(#hero-video)').forEach(v => {
    const h = v.dataset.h;
    const vert = v.dataset.v;
    const sq = v.dataset.sq;
    // Videos in a narrow column (Tech Specs accordion panels, or any 2-column layout
    // explicitly marked data-prefer-tall) render small as horizontal clips even on
    // desktop — they always prefer vertical/square over horizontal, any breakpoint.
    // data-prefer-wide opts back out: the controller-placement diagram lives in
    // a Tech Specs panel but is a wide document, so the vertical cut would be
    // the wrong asset for it.
    const preferTall = v.hasAttribute('data-prefer-tall')
      || (v.closest('.spec-visual-item') !== null && !v.hasAttribute('data-prefer-wide'));
    let target;
    if (isMobile || preferTall) {
      target = vert || sq || h;
    } else {
      target = h;
    }
    if (!target) return;
    const currentSrc = v.querySelector('source')?.getAttribute('src') || '';
    if (currentSrc !== target) {
      v.innerHTML = '';
      const source = document.createElement('source');
      source.src = target;
      source.type = 'video/mp4';
      v.appendChild(source);
      // Swap the source and stop there. This used to also strip preload="none"
      // and call play() outright to "force metadata load for scrub videos" —
      // but the scrub engine is long gone, and on mobile that fired at page
      // load for clips sitting far below the fold, downloading and decoding
      // them immediately and defeating the exact preload="none" the markup
      // asks for. load() on an element carrying `autoplay` starts it by itself
      // once it's genuinely on screen, and the observer owns it after that.
      v.load();
    }
  });
}

setResponsiveVideoSources();
onWidthResize(setResponsiveVideoSources);

/* Same idea as setResponsiveVideoSources, for plain <img data-h> elements
   (e.g. the controller diagram still) — kept JS-driven rather than a
   <picture>/media-query source, to match how every other responsive swap
   on this page works. */
function setResponsiveImageSources() {
  const isMobile = window.innerWidth <= 768;
  document.querySelectorAll('img[data-h]').forEach(img => {
    const h = img.dataset.h, vert = img.dataset.v, sq = img.dataset.sq;
    const target = isMobile ? (vert || sq || h) : h;
    if (target && img.getAttribute('src') !== target) img.src = target;
  });
}
setResponsiveImageSources();
onWidthResize(setResponsiveImageSources);

/* ══════════════════════════════════════════════════════════════
   2. NAV
   ══════════════════════════════════════════════════════════════ */
// Nav starts transparent over the hero (so the video isn't cropped by a solid bar)
// and picks up its solid/blurred background once scrolled past it.
const navbarEl = document.querySelector('.navbar');
const navHeroCta = document.getElementById('hero-cta');
if (navbarEl) {
  const toggleNavScrolled = () => {
    navbarEl.classList.toggle('scrolled', window.scrollY > 40);
    if (navHeroCta) {
      navbarEl.classList.toggle('show-buy-btn', navHeroCta.getBoundingClientRect().bottom < 90);
    } else {
      navbarEl.classList.toggle('show-buy-btn', window.scrollY > 400);
    }
  };
  toggleNavScrolled();
  window.addEventListener('scroll', toggleNavScrolled, { passive: true });
}

// Scroll-spy: subtly marks whichever nav link matches the section currently
// centered in the viewport (.nav-active — see the glow/particle styling in
// styles.css), so people can tell where they are on the page.
(() => {
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = Array.from(navLinks)
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;

  const setActive = (id) => {
    navLinks.forEach(a => a.classList.toggle('nav-active', a.getAttribute('href') === `#${id}`));
  };

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) {
      const heroVid = document.getElementById('hero-video');
      if (heroVid && heroVid.paused) heroVid.play().catch(e => {});
      return;
    }
    // Whichever visible section's top is closest to the centered band wins.
    const best = visible.reduce((a, b) =>
      Math.abs(b.boundingClientRect.top) < Math.abs(a.boundingClientRect.top) ? b : a
    );
    setActive(best.target.id);
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  sections.forEach(s => observer.observe(s));
})();

document.getElementById('nav-logo').addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* Smooth-scroll a section into view, accounting for the fixed navbar height.
   On mobile the drawer slides the content ~90px lower so an extra -16px nudge
   keeps the heading from hiding behind the bar. */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const navH = document.querySelector('.navbar')?.offsetHeight || 90;
  const offset = window.innerWidth <= 768 ? navH + 16 : navH;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      scrollToSection(href.slice(1));
    }
  });
});

// Mobile hamburger menu — same destinations as .nav-links, just reachable
// below the 768px breakpoint where that bar is hidden.
(() => {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-nav-menu');
  if (!btn || !menu) return;

  // The menu covers the page but nothing scrolls when it opens, so the
  // IntersectionObserver never fires and every clip behind it keeps decoding.
  // videoPower (defined further down) is the same machinery every overlay
  // uses; the menu is just one more owner of a suspend claim.
  const closeMenu = () => {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    btn.classList.remove('is-active');
    btn.setAttribute('aria-expanded', 'false');
    videoPower.resume('menu');
  };

  btn.addEventListener('click', () => {
    const willOpen = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', willOpen);
    btn.classList.toggle('is-active', willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) videoPower.suspend('menu'); else videoPower.resume('menu');
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      closeMenu();
      if (href && href.startsWith('#')) {
        e.preventDefault();
        scrollToSection(href.slice(1));
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (menu.classList.contains('is-open') && !menu.contains(e.target) && !btn.contains(e.target)) {
      closeMenu();
    }
  });
})();

/* ══════════════════════════════════════════════════════════════
   3. HERO — CTA
   ══════════════════════════════════════════════════════════════ */
// Hero CTA smooth scroll
const heroCta = document.getElementById('hero-cta');
if (heroCta) {
  heroCta.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToSection('order');
  });
}

/* --------------------------------------------------------------
   4. SCROLL-TRIGGERED FADE-INS
   -------------------------------------------------------------- */
document.querySelectorAll('.s-dark, .s-light').forEach(section => {
  // Trimmed to the classes this page actually has — the list had accumulated a
  // dozen selectors (.genre-grid, .specs-tbl, .duo-grid, .controller-demo …)
  // belonging to sections that no longer exist in the markup.
  const targets = section.querySelectorAll('h2, p, .vid-r');
  if (targets.length === 0) return;
  gsap.from(targets, {
    y: 30,
    opacity: 0,
    duration: 0.7,
    stagger: 0.12,
    scrollTrigger: {
      trigger: section,
      start: 'top 80%',
      once: true,
    }
  });
});



/* ══════════════════════════════════════════════════════════════
   5. CART & UPSELL LOGIC
   ══════════════════════════════════════════════════════════════ */
const cartOverlay = document.getElementById('cart-overlay');
const cartUpsellView = document.getElementById('cart-upsell-view');
const cartCheckoutView = document.getElementById('cart-checkout-view');
const cartClose = document.getElementById('cart-close');

const itemImg = document.getElementById('cart-item-img');
const itemImgBlur = document.getElementById('cart-item-img-blur');
const itemTitle = document.getElementById('cart-item-title');
const itemDesc = document.getElementById('cart-item-desc');
const itemPrice = document.getElementById('cart-item-price');
const cartSubtotal = document.getElementById('cart-subtotal');

function openCart(view) {
  if (!cartOverlay) return;
  // Also called to switch views (upsell -> checkout) on an already-open
  // cart — re-locking with the same key is a no-op, so no need to guard it.
  cartOverlay.classList.add('is-active');
  // Lets CSS lift the navbar above the cart's scrim — see body.cart-open.
  document.body.classList.add('cart-open');
  scrollLock.lock('cart');
  if (view === 'upsell') {
    cartUpsellView.style.display = 'block';
    cartCheckoutView.style.display = 'none';
  } else {
    cartUpsellView.style.display = 'none';
    cartCheckoutView.style.display = 'block';
  }
}

function closeCart() {
  if (!cartOverlay || !cartOverlay.classList.contains('is-active')) return;
  cartOverlay.classList.remove('is-active');
  document.body.classList.remove('cart-open');
  scrollLock.unlock('cart');
}

let cartQty = 1;

function updateCartUI() {
  const isPlural = cartQty > 1;
  const isPair = cartQty % 2 === 0;
  
  if (itemImg) {
    const src = cartQty >= 2 ? 'assets/images/hero-cart-dual-product.webp' : 'assets/images/hero-cart-single-product.webp';
    itemImg.src = src;
    if (itemImgBlur) itemImgBlur.src = src;
  }
  
  if (itemTitle) {
    itemTitle.textContent = cartQty === 1 ? 'Starter Kit' : (cartQty === 2 ? 'Double Kit' : 'BASSCRAFT Kits');
  }
  
  if (itemDesc) {
    itemDesc.textContent = `${cartQty} Cushion${isPlural ? 's' : ''} + ${cartQty} Controller${isPlural ? 's' : ''}`;
  }

  const basePrice = cartQty * 300;
  const discount = Math.floor(cartQty / 2) * 100;
  const finalPrice = basePrice - discount;

  if (itemPrice) itemPrice.textContent = `$${finalPrice}`;
  if (cartSubtotal) cartSubtotal.textContent = `$${finalPrice}`;

  const cartItemBadge = document.getElementById('cart-item-badge');
  const origPrice = document.getElementById('cart-item-original-price');
  
  if (discount > 0) {
    if (cartItemBadge) {
      cartItemBadge.style.display = 'inline-block';
      cartItemBadge.textContent = `YOU'RE SAVING $${discount}!`;
    }
    if (origPrice) {
      origPrice.style.display = 'block';
      origPrice.textContent = `$${basePrice}`;
    }
  } else {
    if (cartItemBadge) cartItemBadge.style.display = 'none';
    if (origPrice) origPrice.style.display = 'none';
  }

  const qtyVal = document.getElementById('cart-qty-val');
  if (qtyVal) qtyVal.textContent = cartQty;

  const downgradeBtn = document.getElementById('cart-downgrade-btn');
  if (downgradeBtn) downgradeBtn.style.display = 'none'; // Replaced by qty selector

  const upsellLink = document.getElementById('cart-upsell-link');
  if (upsellLink) upsellLink.style.display = 'none'; // Replaced by qty selector
}

document.getElementById('cart-qty-minus')?.addEventListener('click', () => {
  if (cartQty > 1) {
    cartQty--;
    updateCartUI();
  }
});
document.getElementById('cart-qty-plus')?.addEventListener('click', () => {
  cartQty++;
  updateCartUI();
});

if (cartClose) {
  cartClose.addEventListener('click', closeCart);
}
if (cartOverlay) {
  cartOverlay.addEventListener('click', (e) => {
    if (e.target === cartOverlay) closeCart();
  });
}

/* Shared lightbox chrome — the nav's B mark + BUY NOW, floated into whichever
   expanded viewer is open so the site's two anchors stay reachable instead of
   vanishing behind a full-screen overlay. Tracked as a set rather than a
   boolean: the cart's photo viewer opens on top of the cart modal, so "is
   anything still open?" has to survive one of them closing. */
const lightboxChrome = (() => {
  const el = document.getElementById('lightbox-chrome');
  const openIds = new Set();
  const sync = () => {
    if (!el) return;
    const any = openIds.size > 0;
    el.classList.toggle('is-active', any);
    document.body.classList.toggle('lightbox-active', any);
    // The cart's product-photo viewer is the one lightbox whose background is
    // the photo itself — shot on near-white — rather than a dark backdrop, so
    // the mark needs the opposite treatment there (see .chrome-on-light in CSS).
    el.classList.toggle('chrome-on-light', openIds.has('cart-image') || openIds.has('doc'));
    el.setAttribute('aria-hidden', any ? 'false' : 'true');
  };
  return {
    show: (id) => { openIds.add(id); sync(); },
    hide: (id) => { openIds.delete(id); sync(); },
    closeAll: () => { openIds.clear(); sync(); },
  };
})();

// Both chrome controls behave exactly like their navbar counterparts, after
// first dismissing whatever viewer (and the cart) is covering the page.
(() => {
  const logo = document.getElementById('lightbox-chrome-logo');
  const buy = document.getElementById('lightbox-chrome-buy');
  // Dismiss whichever viewer is open, without touching the cart — the two
  // controls disagree about what should happen to it next.
  const closeViewers = () => {
    // Each of these already no-ops if it isn't the one currently open, and
    // each already unlocks its own scrollLock claim and schedules its own
    // display:none teardown — calling through them (rather than reaching
    // into their DOM/classes directly) is what keeps that teardown firing
    // no matter which control the user actually closed with.
    closeCartLightbox();
    lightboxCloseFns.video?.();
    lightboxCloseFns.doc?.();
    lightboxCloseFns.specFullscreen?.();
    lightboxChrome.closeAll();
  };
  // Instead of jumping to the top of the page, clicking the B logo while in a
  // viewer now acts as a "back" button, returning the user to where they were.
  logo?.addEventListener('click', (e) => {
    e.preventDefault();
    closeViewers();
  });
  // Matches the navbar's own BUY NOW, which opens the cart straight at checkout
  // on the Double Kit rather than scrolling to the order section.
  buy?.addEventListener('click', (e) => {
    e.preventDefault();
    closeViewers();
    cartQty = 2;
    updateCartUI();
    openCart('checkout');
  });
})();

// Tap the product photo (either cart view) to see it full screen.
const cartLightbox = document.getElementById('cart-image-lightbox');
const cartLightboxImg = document.getElementById('cart-lightbox-img');
function openCartLightbox(src) {
  if (!cartLightbox || !cartLightboxImg || !src) return;
  cartLightboxImg.src = src;
  cartLightbox.classList.add('is-active');
  lightboxChrome.show('cart-image');
  scrollLock.lock('cart-image');
}
function closeCartLightbox() {
  if (!cartLightbox || !cartLightbox.classList.contains('is-active')) return;
  cartLightbox.classList.remove('is-active');
  lightboxChrome.hide('cart-image');
  scrollLock.unlock('cart-image');
}
document.querySelectorAll('.cart-media-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const src = btn.id === 'cart-media-expand-btn' ? itemImg?.src : btn.dataset.lightboxSrc;
    openCartLightbox(src);
  });
});
// The pricing cards' product shots open the same full-screen viewer as the
// cart's own photo — the one that keeps the floating B mark and BUY NOW on top.
document.querySelectorAll('.pricing-card-image img').forEach(img => {
  img.addEventListener('click', (e) => {
    e.stopPropagation();
    openCartLightbox(img.currentSrc || img.src);
  });
});
document.getElementById('cart-lightbox-close')?.addEventListener('click', closeCartLightbox);
cartLightboxImg?.addEventListener('click', closeCartLightbox);
cartLightbox?.addEventListener('click', (e) => {
  if (e.target === cartLightbox) closeCartLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCartLightbox();
});

// Video lightbox: the sub-cultural genre clips + "no bluetooth" demo open
// bigger, with sound, on a frosted backdrop instead of their small muted
// autoplay loop. [data-lightbox-playlist] plays multiple clips back-to-back
// (the "no bluetooth" demo-then-skit pair); [data-lightbox-src] is just one.
(() => {
  const lightbox = document.getElementById('video-lightbox');
  const player = document.getElementById('video-lightbox-player');
  const closeBtn = document.getElementById('video-lightbox-close');
  if (!lightbox || !player || !closeBtn) return;

  let queue = [];
  let queueIdx = 0;

  function playCurrent() {
    player.src = queue[queueIdx];
    const p = player.play();
    if (p !== undefined) p.catch(() => {});
  }

  // Multi-clip playlists still advance/loop via 'ended' — each clip is a
  // genuinely different file, so a reload between them is unavoidable.
  // Single clips use the native `loop` property instead (set in
  // openVideoLightbox below): reassigning the SAME .src every cycle here
  // forced a full reload each loop, which flashed the aspect ratio (box
  // sizing depends on videoWidth/videoHeight, unknown again until
  // 'loadedmetadata' re-fires) and the native play button, and was tied up
  // with audio dropping on restart too. Native loop reloads nothing — the
  // media element just seeks back to 0 and keeps playing, 'ended' never
  // fires at all — which is what "as seamless as possible" actually needs.
  player.addEventListener('ended', () => {
    if (queue.length <= 1) return;
    queueIdx = queueIdx < queue.length - 1 ? queueIdx + 1 : 0;
    playCurrent();
  });

  // Same reasoning as the document viewer: this backdrop's blur(26px) is a
  // continuous, real-time compositing cost, and opacity:0 + pointer-events:none
  // alone don't stop the browser from still running it on an invisible layer
  // forever after first use. display:none (delayed past the fade so it isn't
  // visible) tears that down properly instead of leaving it running.
  let closeCleanupTimer = null;

  const titleEl = document.getElementById('video-lightbox-title');
  const subtitleEl = document.getElementById('video-lightbox-subtitle');

  function openVideoLightbox(sources, posterUrl, playOnce, title, subtitle) {
    if (!sources || !sources.length) return;
    clearTimeout(closeCleanupTimer);
    lightbox.style.display = '';
    if (titleEl) {
      titleEl.textContent = title || '';
    }
    if (subtitleEl) {
      subtitleEl.textContent = subtitle || '';
    }
    if (posterUrl) player.poster = posterUrl;
    else player.removeAttribute('poster');
    queue = sources;
    queueIdx = 0;
    // playOnce mirrors the inline video's own .play-once behaviour (the first
    // four Tech Specs panels — reveal/exploded-view animations that read as
    // finished once they've run, rather than ambient loops).
    player.loop = queue.length === 1 && !playOnce;
    player.muted = false;
    playCurrent();
    lightbox.classList.add('is-active');
    lightboxChrome.show('video');
    scrollLock.lock('video');
  }

  function closeVideoLightbox() {
    if (!lightbox.classList.contains('is-active')) return;
    lightbox.classList.remove('is-active');
    lightboxChrome.hide('video');
    scrollLock.unlock('video');
    player.pause();
    player.removeAttribute('src');
    player.load();
    clearTimeout(closeCleanupTimer);
    closeCleanupTimer = setTimeout(() => { lightbox.style.display = 'none'; }, 300);
  }
  lightboxCloseFns.video = closeVideoLightbox;

  document.querySelectorAll('.vid-clickable[data-lightbox-src]').forEach(el => {
    el.addEventListener('click', () => {
      const vid = el.querySelector('video');
      let src = el.dataset.lightboxSrc;
      if (window.innerWidth <= 768 && vid) {
        src = vid.getAttribute('data-v') || vid.getAttribute('data-sq') || vid.getAttribute('data-h') || src;
      }
      // Reuse the inline video's own .play-once marker as the signal, so the
      // expanded view matches what that panel already does on the page
      // instead of tracking the same intent in two separate places.
      let title = el.getAttribute('data-title') || '';
      let subtitle = el.getAttribute('data-subtitle') || '';

      openVideoLightbox([src], vid ? vid.getAttribute('poster') : null,
        !!(vid && vid.classList.contains('play-once')), title, subtitle);
    });
  });
  document.querySelectorAll('.vid-clickable[data-lightbox-playlist]').forEach(el => {
    el.addEventListener('click', () => {
      try {
        const vid = el.querySelector('video');
        let playlist = JSON.parse(el.dataset.lightboxPlaylist);
        if (window.innerWidth <= 768 && vid && vid.hasAttribute('data-playlist')) {
          const inlinePlaylist = JSON.parse(vid.dataset.playlist);
          if (Array.isArray(inlinePlaylist) && inlinePlaylist.length === playlist.length) {
            playlist = inlinePlaylist.map(item => item.v || item.sq || item.h || (typeof item === 'string' ? item : Object.values(item)[0]));
          }
        }
        let title = el.getAttribute('data-title') || '';
        let subtitle = el.getAttribute('data-subtitle') || '';
        openVideoLightbox(playlist, vid ? vid.getAttribute('poster') : null, false, title, subtitle);
      } catch (e) {}
    });
  });

  closeBtn.addEventListener('click', closeVideoLightbox);
  // With no native controls there's nothing to interact with on the video
  // itself, so all the empty space around it should dismiss. That includes
  // the gap beside the video on mobile, which belongs to
  // .video-lightbox-inner (the video is sized to its own aspect ratio, so
  // it's narrower than that row) rather than to the backdrop element.
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('video-lightbox-inner')) {
      closeVideoLightbox();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-active')) closeVideoLightbox();
  });
})();

/* ══════════════════════════════════════════════════════════════
   DOCUMENT LIGHTBOX — drag-to-pan / pinch-to-zoom viewer
   ══════════════════════════════════════════════════════════════
   The controller-placement scans are dense multi-panel documents: at page size
   you can tell there are three options but can't read any of them. This opens
   the full-resolution file on a pannable stage.

   Pointer Events (not separate mouse/touch paths) so drag, pinch and pen all
   run through one code path, with setPointerCapture keeping a drag alive if
   the cursor leaves the stage mid-gesture. */
(() => {
  const lb = document.getElementById('doc-lightbox');
  const stage = document.getElementById('doc-stage');
  const paper = document.getElementById('doc-paper');
  const img = document.getElementById('doc-lightbox-img');
  const hint = document.getElementById('doc-hint');
  const closeBtn = document.getElementById('doc-lightbox-close');
  const zoomInBtn = document.getElementById('doc-zoom-in');
  const zoomOutBtn = document.getElementById('doc-zoom-out');
  if (!lb || !stage || !paper || !img) return;

  const hotspotLayer = document.getElementById('doc-hotspots');
  const frame = document.getElementById('doc-frame');

  let nw = 0, nh = 0;               // document's natural pixel size
  let scale = 1, fitScale = 1, maxScale = 1;
  let tx = 0, ty = 0;
  const pointers = new Map();
  let pinch = null;
  let moved = false;
  let downTarget = null;            // real pointerdown target, pre-capture
  let hintTookThisTap = false;

  /* The three placement options, as tap targets.

     Coordinates are fractions of the image, not pixels, so they survive the
     responsive swap and any future re-export at a different resolution. The
     two scans are laid out completely differently — the vertical stacks its
     panels, the wide one puts 1 and 2 down the left and 3 on the right — so
     each gets its own list, chosen by aspect ratio when the image loads.

     `mx/my` is where the marker sits — placed directly over the number already
     printed on the sheet, so the badge covers it and you read one number
     rather than two. `x/y/w/h` is the separate region it frames, which stays
     on the placement itself. The two are deliberately not the same point: the
     printed numbers sit out in the margin of each panel, and centring the zoom
     there would frame empty paper.

     The regions frame the cushion-plus-controller-and-cable assembly rather
     than the whole panel: a panel spans almost the full width of the sheet, so
     on a phone "fit the panel" is width-constrained and buys only about 1.2x —
     barely a zoom at all. */
  const HOTSPOTS = {
    tall: [
      { n: 1, mx: 0.125, my: 0.142, x: 0.340, y: 0.235, w: 0.45, h: 0.150 },
      { n: 2, mx: 0.130, my: 0.422, x: 0.200, y: 0.475, w: 0.57, h: 0.155 },
      { n: 3, mx: 0.145, my: 0.736, x: 0.390, y: 0.765, w: 0.36, h: 0.170 },
    ],
    wide: [
      { n: 1, mx: 0.091, my: 0.468, x: 0.180, y: 0.250, w: 0.26, h: 0.190 },
      { n: 2, mx: 0.454, my: 0.845, x: 0.150, y: 0.550, w: 0.32, h: 0.250 },
      { n: 3, mx: 0.767, my: 0.342, x: 0.680, y: 0.460, w: 0.25, h: 0.270 },
    ],
  };

  function apply() {
    paper.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    if (zoomInBtn) zoomInBtn.disabled = scale >= maxScale - 0.0005;
    if (zoomOutBtn) zoomOutBtn.disabled = scale <= fitScale + 0.0005;
    // The markers ride inside the transformed paper so they stay glued to the
    // artwork, which also means they'd balloon with it — counter-scale each one
    // so it holds a constant size on screen at any zoom.
    if (hotspotLayer) {
      hotspotLayer.style.setProperty('--hs-counter', 1 / (scale || 1));
      // Once you're actually zoomed in they've done their job and would just
      // sit on top of the detail you came to look at.
      hotspotLayer.classList.toggle('is-dimmed', scale > fitScale * 1.6);
    }
  }

  /* NOTE: the zoom cluster and the close X are positioned purely in CSS, from
     the viewer's own corners, and nothing here ever touches them.

     An earlier revision had this function offset them from the SHEET's
     on-screen corner so they'd sit on the paper when zoomed out. That was the
     wrong model: the sheet's corner moves with every pan and zoom, so the
     controls crept around the screen and slid off as you zoomed in. Controls
     belong to the viewer, not to the artwork — they get one fixed home and
     hold it at every zoom level. */

  /* Size the window to the loaded scan's shape.

     This is what makes the whole thing behave like the small rounded card on
     the page: a frame with a definite size and place, that you look at the
     document THROUGH. The sheet fills it exactly at rest — no grey gutter down
     the sides — and zooming happens strictly inside it. Everything else here
     measures against the stage, which is now this frame, so the fit maths and
     the pan clamp both fall out of it for free.

     The top gutter is the chrome strip (B mark + BUY NOW), so the frame — and
     therefore the close button pinned to its corner — always starts clear of
     the pill without any element having to know the pill exists. */
  function sizeFrame() {
    if (!frame || !nw || !nh) return;
    const vw = lb.clientWidth, vh = lb.clientHeight;
    const narrow = vw <= 768;
    const side = narrow ? 16 : 40;
    const top = narrow ? 92 : 104;      // clears the chrome bar
    const bottom = narrow ? 28 : 44;
    const availW = Math.max(120, vw - side * 2);
    const availH = Math.max(120, vh - top - bottom);
    let w = availW, h = w * nh / nw;
    if (h > availH) { h = availH; w = h * nw / nh; }
    frame.style.width = Math.round(w) + 'px';
    frame.style.height = Math.round(h) + 'px';
    // Centre inside the area left over once the chrome strip is reserved,
    // rather than in the raw viewport, so it doesn't ride up under the bar.
    frame.style.top = Math.round(top + availH / 2) + 'px';
  }

  /* Frame one option: zoom so the region fills most of the stage, then centre
     it. Same clamping as every other zoom path, so it can never land somewhere
     panning couldn't have reached. */
  function focusRegion(r) {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    if (!nw || !nh || !sw || !sh) return;
    const fit = Math.min((sw * 0.9) / (r.w * nw), (sh * 0.9) / (r.h * nh));
    scale = Math.min(maxScale, Math.max(fitScale, fit));
    tx = sw / 2 - (r.x + r.w / 2) * nw * scale;
    ty = sh / 2 - (r.y + r.h / 2) * nh * scale;
    clampOffsets();
    paper.classList.add('is-animating');
    apply();
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => paper.classList.remove('is-animating'), 560);
  }
  let focusTimer = null;

  function buildHotspots() {
    if (!hotspotLayer || !nw || !nh) return;
    const set = HOTSPOTS[nw >= nh ? 'wide' : 'tall'];
    hotspotLayer.innerHTML = '';
    set.forEach(r => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'doc-hotspot';
      // Sits on the printed number, not on the region it frames.
      b.style.left = (r.mx * 100) + '%';
      b.style.top  = (r.my * 100) + '%';
      b.setAttribute('aria-label', `Zoom to placement option ${r.n}`);
      b.innerHTML = `<span class="doc-hotspot-dot">${r.n}</span>`;
      // The markers sit inside .doc-stage, whose pointerdown starts a pan and
      // whose click closes the viewer. Keep both out of it.
      b.addEventListener('pointerdown', e => e.stopPropagation());
      b.addEventListener('click', e => {
        e.stopPropagation();
        dismissHint();
        focusRegion(r);
      });
      hotspotLayer.appendChild(b);
    });
  }

  // Centre on whichever axis the document is smaller than the stage; otherwise
  // pin it so panning can never expose empty space past an edge.
  /* Strict clamp — the window is always completely filled with artwork. The old
     rule allowed up to 150px of overscroll past each edge, which was fine when
     the sheet floated in a large grey stage but would now let you drag the
     document off its own frame and expose bare white inside the window. */
  function clampOffsets() {
    const w = nw * scale, h = nh * scale;
    const sw = stage.clientWidth, sh = stage.clientHeight;
    tx = w <= sw ? (sw - w) / 2 : Math.min(0, Math.max(sw - w, tx));
    ty = h <= sh ? (sh - h) / 2 : Math.min(0, Math.max(sh - h, ty));
  }

  function computeBounds() {
    const sw = stage.clientWidth, sh = stage.clientHeight;
    if (!nw || !nh || !sw || !sh) return;
    // The frame already carries the margin, and it matches the scan's aspect
    // ratio, so "fit" here means fill the window exactly, edge to edge.
    fitScale = Math.min(sw / nw, sh / nh);
    // Always allow at least native 1:1 — that's the zoom where the fibre reads.
    maxScale = Math.max(fitScale * 4, 1);
  }

  // Zoom about a focal point in stage coordinates, so the pixel under the
  // cursor/pinch-centre stays put instead of the view lurching to the middle.
  function zoomTo(next, fx, fy) {
    const target = Math.min(maxScale, Math.max(fitScale, next));
    const k = target / scale;
    tx = fx - k * (fx - tx);
    ty = fy - k * (fy - ty);
    scale = target;
    clampOffsets();
    apply();
  }

  function zoomByStep(factor) {
    zoomTo(scale * factor, stage.clientWidth / 2, stage.clientHeight / 2);
    dismissHint();
  }

  function dismissHint() { hint?.classList.add('is-hidden'); }
  // The hint itself is pointer-events:none (it used to block the pan outright —
  // see .doc-hint in the CSS), so it can't be clicked away directly. Touching
  // the stage at all is the signal that the instruction has landed.

  function layout(initial) {
    nw = img.naturalWidth; nh = img.naturalHeight;
    if (!nw || !nh) return;
    paper.style.width = nw + 'px';
    paper.style.height = nh + 'px';
    sizeFrame();       // the window takes the scan's shape before anything measures it
    computeBounds();
    buildHotspots();   // which set applies depends on the loaded image's shape
    if (initial) {
      // Open fully zoomed out so the entire document is visible at a glance.
      scale = fitScale;
      tx = (stage.clientWidth - nw * scale) / 2;
      ty = (stage.clientHeight - nh * scale) / 2;
    } else {
      scale = Math.min(maxScale, Math.max(fitScale, scale));
    }
    clampOffsets();
    apply();
  }

  // The document is a full-resolution scan (up to ~3770x2936px) that can end
  // up zoomed in well past its own footprint. .doc-lightbox only ever went
  // opacity:0 + pointer-events:none when closed — never display:none — so
  // that huge transformed layer, and its own GPU-promoted compositing layer
  // (see .doc-paper's `will-change: transform`), stayed fully alive and
  // composited behind the entire site indefinitely after first use, invisible
  // but still costing the compositor on every subsequent scroll frame. That's
  // what the reported post-close "layers flickering / rendering conflict"
  // traced back to. display:none now tears the whole layer down once the
  // fade-out finishes; the timer just gives the CSS opacity transition time
  // to actually play first.
  let closeCleanupTimer = null;

  function openDoc(src) {
    if (!src) return;
    clearTimeout(closeCleanupTimer);
    lb.style.display = '';
    hint?.classList.remove('is-hidden');
    const start = () => layout(true);
    if (img.getAttribute('src') !== src) {
      img.addEventListener('load', start, { once: true });
      img.src = src;
    } else if (img.complete && img.naturalWidth) {
      start();
    } else {
      img.addEventListener('load', start, { once: true });
    }
    lb.classList.add('is-active');
    scrollLock.lock('doc');
    lightboxChrome.show('doc');
  }

  function closeDoc() {
    if (!lb.classList.contains('is-active')) return;
    lb.classList.remove('is-active');
    scrollLock.unlock('doc');
    lightboxChrome.hide('doc');
    clearTimeout(closeCleanupTimer);
    closeCleanupTimer = setTimeout(() => { lb.style.display = 'none'; }, 320);
  }
  lightboxCloseFns.doc = closeDoc;

  stage.addEventListener('pointerdown', (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Read the true target BEFORE setPointerCapture starts retargeting, and
    // note whether the instructions were still up — the tap that clears them
    // is a tap that means "got it", not "take me back to the page".
    downTarget = e.target;
    hintTookThisTap = !!hint && !hint.classList.contains('is-hidden');
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    moved = false;
    dismissHint();
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, scale };
    }
    stage.classList.add('is-grabbing');
  });

  stage.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const prevX = p.x, prevY = p.y;
    p.x = e.clientX; p.y = e.clientY;

    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const rect = stage.getBoundingClientRect();
      zoomTo(pinch.scale * (dist / pinch.dist),
             (a.x + b.x) / 2 - rect.left,
             (a.y + b.y) / 2 - rect.top);
      moved = true;
      dismissHint();
      return;
    }

    const dx = e.clientX - prevX, dy = e.clientY - prevY;
    if (Math.abs(dx) + Math.abs(dy) > 0) {
      tx += dx; ty += dy;
      clampOffsets(); apply();
      if (Math.abs(dx) + Math.abs(dy) > 2) { moved = true; dismissHint(); }
    }
  });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) stage.classList.remove('is-grabbing');
  };
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    zoomTo(scale * Math.exp(-e.deltaY * 0.0018), e.clientX - rect.left, e.clientY - rect.top);
    dismissHint();
  }, { passive: false });

  stage.addEventListener('dblclick', (e) => {
    const rect = stage.getBoundingClientRect();
    const zoomedIn = scale > fitScale * 1.8;
    zoomTo(zoomedIn ? fitScale : Math.min(maxScale, fitScale * 2.8),
           e.clientX - rect.left, e.clientY - rect.top);
    dismissHint();
  });

  /* Clicking the empty margin around the sheet closes — but never when that
     "click" was the tail end of a drag that happened to finish off-sheet, and
     never when it was the tap that dismissed the instructions.

     This tests `downTarget`, captured on pointerdown, rather than the click
     event's own target. setPointerCapture() — which is what keeps a drag alive
     when the finger leaves the stage — RETARGETS every later event in the
     gesture to the capturing element, so by the time the click arrives its
     target is always the stage, whether you tapped the sheet or the margin.
     Reading it there meant any tap at all closed the viewer. */
  stage.addEventListener('click', () => {
    if (hintTookThisTap) { hintTookThisTap = false; return; }
    if (!moved && downTarget === stage) closeDoc();
  });

  /* Click-outside-to-close. This used to be the rule above, back when the sheet
     floated inside a full-bleed stage and the bare stage WAS the backdrop. Now
     the artwork fills its window exactly, so nothing outside the window belongs
     to the stage at all — the backdrop is the lightbox itself, and the test has
     to live here or dismissing by clicking away stops working entirely. */
  lb.addEventListener('click', (e) => { if (e.target === lb) closeDoc(); });

  zoomInBtn?.addEventListener('click', () => zoomByStep(1.4));
  zoomOutBtn?.addEventListener('click', () => zoomByStep(1 / 1.4));
  closeBtn?.addEventListener('click', closeDoc);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lb.classList.contains('is-active')) closeDoc();
  });
  window.addEventListener('resize', () => {
    if (lb.classList.contains('is-active')) layout(false);
  });

  document.querySelectorAll('.doc-clickable').forEach(el => {
    // Read the still's live src so the viewer opens whichever responsive
    // variant is currently on screen, not a hardcoded one.
    const srcOf = () => {
      const still = el.querySelector('.diagram-still');
      return still ? (still.currentSrc || still.src) : el.dataset.docSrc;
    };
    el.addEventListener('click', () => openDoc(srcOf()));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(srcOf()); }
    });
  });
})();

document.getElementById('upsell-accept-btn')?.addEventListener('click', () => {
  cartQty = 2;
  updateCartUI();
  openCart('checkout');
});
document.getElementById('upsell-decline-btn')?.addEventListener('click', () => {
  cartQty = 1;
  updateCartUI();
  openCart('checkout');
});

document.querySelectorAll('a[href="#order"], .hero-cta, .buy-btn, .nav-cta').forEach(btn => {
  if (btn.closest('#cart-overlay')) return;
  // The lightbox chrome's BUY NOW is also an a[href="#order"], but it has to
  // dismiss the open viewer first — it runs its own handler instead of this one.
  if (btn.closest('#lightbox-chrome')) return;
  // The plain "ORDER" link in the nav list / mobile drawer is also an
  // a[href="#order"] — but it's a section-navigation link like its HOME/
  // INSTALLATION/etc. siblings, not a buy CTA, and already has its own
  // scrollIntoView handler. Without this, both handlers fired on the same
  // click: this one opened the cart and locked scroll mid-animation, which
  // froze the smooth-scroll before it could actually move the page.
  if (btn.closest('.nav-links') || btn.closest('#mobile-nav-menu')) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const isStarterBtn = btn.closest('.pricing-card') && !btn.closest('.featured');
    // Scroll the page to the order section in the background so it's
    // visible behind the cart overlay when it closes.
    scrollToSection('order');
    if (isStarterBtn) {
      openCart('upsell');
    } else {
      cartQty = 2;
      updateCartUI();
      openCart('checkout');
    }
  });
});
/* ══════════════════════════════════════════════════════════════
   6. VIDEO POWER MANAGEMENT
   ══════════════════════════════════════════════════════════════
   Every inline clip on this page is a muted, autoplaying ambient loop, so the
   only thing keeping the page cheap is being strict about which of them is
   allowed to decode at any moment. Mobile SoCs have a small number of hardware
   video decoders (commonly 2-4); once you exceed that, the extra streams fall
   back to software decode and EVERY video on the page turns choppy at once —
   the reported "all the videos get slow and laggy".

   Three things can make a video unnecessary, and all three funnel through here:
     1. it scrolled out of view          -> the IntersectionObserver below
     2. something covers the page        -> suspend()/resume(), keyed by owner
     3. the tab/app went to the background -> the visibilitychange hook

   (2) is keyed the same way scrollLock is, so nested owners — the cart with a
   photo viewer opened on top of it — each hold an independent claim and the
   inner one closing doesn't resume playback while the outer is still up. */
// A clip has to be at least this much on screen to be worth decoding.
const VISIBLE_ENOUGH = 0.25;

const videoPower = (() => {
  const suspenders = new Set();
  let suspended = [];

  // A video inside the thing that's covering the page is the whole point of
  // that overlay — it must keep playing. Only what's *behind* gets suspended.
  const isForeground = (v) =>
    v.id === 'video-lightbox-player' || !!v.closest('.fullscreen-overlay');

  const applySuspend = () => {
    suspended = [...document.querySelectorAll('video')]
      .filter(v => !v.paused && !isForeground(v));
    suspended.forEach(v => v.pause());
  };

  // Same "is it worth decoding" rule the observer uses, measured directly —
  // the observer can't answer for us here because nothing has scrolled, so it
  // has no fresh entry to hand over.
  const visibleEnough = (v) => {
    const r = v.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    return shown / r.height >= VISIBLE_ENOUGH;
  };

  const applyResume = () => {
    suspended.forEach(v => {
      // The page can still move under an overlay, so something suspended may
      // have left the viewport since. Restarting it would undo the observer's
      // work — resume only what is genuinely still on screen.
      if (v.isConnected && visibleEnough(v)) v.play().catch(() => {});
    });
    suspended = [];
  };

  /* THE important guard.

     `autoplay` is not a one-time instruction — the browser re-applies it every
     time the element has enough data to start, which includes each load() from
     the responsive source swap and each src change from the playlist/power
     rotations. So a clip the observer had correctly paused would quietly start
     itself again a moment later, and because nothing scrolled, no intersection
     callback ever fired to stop it a second time.

     Measured on a 390x844 viewport before this existed: 15 of the 16 videos on
     the page were playing at once, most of them at intersection ratio 0 and
     several inside display:none panels. That is the "all the videos get slow
     and lag" report — every one of them downloading and decoding in parallel,
     far past any mobile decoder budget.

     Catching it on the 'play' event is what makes this airtight: whatever
     starts a video — autoplay, a stray play() call, a source swap — has to
     pass the same test, and there's no path around it. */
  const allowed = (v) =>
    isForeground(v) || (suspenders.size === 0 && visibleEnough(v));

  document.querySelectorAll('video').forEach(v => {
    v.addEventListener('play', () => { if (!allowed(v)) v.pause(); });
  });

  return {
    suspend(key) {
      if (suspenders.size === 0) applySuspend();
      suspenders.add(key);
    },
    resume(key) {
      if (!suspenders.has(key)) return;
      suspenders.delete(key);
      if (suspenders.size === 0) applyResume();
    },
    // The observer must consult this before starting anything: locking the
    // page shifts <body> to position:fixed, which is enough to make
    // intersections recalculate, and an unguarded observer would then happily
    // restart the very clips that were just suspended.
    isSuspended: () => suspenders.size > 0,
  };
})();

// Switching apps / locking the phone leaves every on-screen video decoding in
// the background — the observer never fires because nothing scrolled.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) videoPower.suspend('page-hidden');
  else videoPower.resume('page-hidden');
});

/* Pause what's behind ANY full-screen overlay. Every one of them (cart, photo
   viewer, video lightbox, document viewer, Tech Specs fullscreen) already
   funnels through scrollLock, so wrapping it here covers all of them at once
   and can't drift out of sync the way five separate call sites would. */
(() => {
  const { lock, unlock, reset } = scrollLock;
  scrollLock.lock = (key) => { lock(key); videoPower.suspend('overlay:' + key); };
  scrollLock.unlock = (key) => { unlock(key); videoPower.resume('overlay:' + key); };
  scrollLock.reset = (...keys) => { reset(...keys); keys.forEach(k => videoPower.resume('overlay:' + k)); };
})();

/* Pause out-of-view videos.

   A clip has to be a quarter visible to be worth decoding. The old rule was a
   10% sliver, so a fast scroll past the sub-cultural grid spun up three of them
   purely in transit; a quarter is roughly where a clip is actually being
   looked at, and it also stands them down sooner on the way out.

   The test is `intersectionRatio`, NOT `entry.isIntersecting` — those are not
   the same question. isIntersecting is true for any overlap at all, however
   slight, no matter what threshold the observer was given; the threshold only
   decides when the callback fires. Keying off it would have played a video
   sitting 10% on screen. The thresholds list needs the 0 as well as the 0.25,
   so there's still a callback at the moment a clip fully leaves. */
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const v = entry.target;
    if (entry.intersectionRatio < VISIBLE_ENOUGH) {
      if (!v.paused) v.pause();
      return;
    }
    // Scrolling back into view is not permission to play while an overlay,
    // the menu, or a backgrounded tab is holding everything down.
    if (videoPower.isSuspended()) return;
    if (v.paused && (v.hasAttribute('autoplay') || v.id === 'hero-video')) {
      if (v.id === 'hero-video') v.currentTime = 0;
      v.play().catch(() => {});
    }
  });
}, { threshold: [0, VISIBLE_ENOUGH] });
document.querySelectorAll('video').forEach(vid => videoObserver.observe(vid));

/* ==========================================================================
   7. MOBILE VERTICAL VIDEO SWAPS
   ========================================================================== */
/* REMOVED: legacy updateVideoSources().
   It duplicated setResponsiveVideoSources() (top of this file) but ran AFTER it,
   selected video[data-v], had no tall-preference logic, and on desktop force-
   reloaded data-h — silently clobbering the vertical sources on every Tech Specs
   panel. setResponsiveVideoSources() selects video[data-h] (a superset here) and
   already handles h/v/sq plus preferTall, so this was pure redundancy. */






// ==========================================================================
// Power Options panel: alternate between the two power-source clips
// (cigarette DC + USB-C) end-to-end in the same box instead of picking one.
// ==========================================================================
// Diagram animation: plays once filling the frame completely (object-fit:cover +
// the frame's aspect-ratio matched to the video's real dimensions), then on 'ended'
// fades out and the frame reshapes to the still image's real dimensions instead —
// so neither asset ever gets cropped or letterboxed against a mismatched box.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.diagram-frame-inner').forEach(frame => {
    const vid = frame.querySelector('.diagram-anim');
    const img = frame.querySelector('.diagram-still');
    if (!vid || !img) return;
    let hasEnded = false;

    const matchVideo = () => {
      if (!hasEnded && vid.videoWidth && vid.videoHeight) {
        frame.style.aspectRatio = `${vid.videoWidth} / ${vid.videoHeight}`;
      }
    };
    const matchImage = () => {
      if (img.naturalWidth && img.naturalHeight) {
        frame.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
      }
    };

    vid.addEventListener('loadedmetadata', matchVideo);
    if (vid.readyState >= 1) matchVideo();

    img.addEventListener('load', () => { if (hasEnded) matchImage(); });

    vid.addEventListener('ended', () => {
      hasEnded = true;
      vid.style.opacity = '0';
      matchImage();
      img.style.opacity = '1';
    });

    // Replay whenever the block comes back into view, so anyone who scrolled past
    // the animation the first time can scroll back and actually watch it.
    if ('IntersectionObserver' in window) {
      let wasVisible = false;
      new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !wasVisible) {
            wasVisible = true;
            hasEnded = false;
            vid.style.opacity = '1';
            img.style.opacity = '0';
            matchVideo();
            vid.currentTime = 0;
            vid.play().catch(() => {});
          } else if (!entry.isIntersecting) {
            wasVisible = false;
          }
        });
      }, { threshold: 0.35 }).observe(frame);
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.power-options-video[data-power-sources]').forEach(powerVideo => {
    const sources = powerVideo.dataset.powerSources.split(',');
    let idx = 0;
    powerVideo.addEventListener('ended', () => {
      idx = (idx + 1) % sources.length;
      powerVideo.src = sources[idx];
      powerVideo.play()?.catch(() => {});
    });
  });
});

// ==========================================================================
// Tech Specs panel sizing: rather than guessing a fixed shape per panel (some
// panels' active clip differs by breakpoint AND by playlist position — e.g. a
// square-only clip followed by one with a real horizontal export), size each
// .spec-visual-item from whatever video is actually loaded, every time it
// changes (responsive swap, power-options alternation, or playlist advance —
// all of these already fire a native 'loadedmetadata' event on src change).
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.spec-visual-item video, .playlist-video, [data-prefer-tall]').forEach(vid => {
    // .spec-visual-video-box (when present) is the inner box that should be sized to
    // the video — e.g. a panel with a caption below needs the caption to sit outside
    // the ratio-locked area, not squeezed inside it.
    const panel = vid.closest('.spec-visual-video-box') || vid.closest('.spec-visual-item, .vid-r');
    if (!panel) return;
    const applyRatio = () => {
      if (vid.videoWidth && vid.videoHeight) {
        panel.style.aspectRatio = `${vid.videoWidth} / ${vid.videoHeight}`;
      }
    };
    vid.addEventListener('loadedmetadata', applyRatio);
    if (vid.readyState >= 1) applyRatio();
  });
});

// ==========================================================================
// Playlist videos: like the Power Options alternation above, but each clip in
// the list can itself have horizontal/square/vertical variants — so a panel
// can both cycle through multiple clips AND stay responsive per breakpoint.
// data-playlist='[{"h":"...","sq":"...","v":"..."}, ...]'
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.playlist-video[data-playlist]').forEach(v => {
    let playlist;
    try { playlist = JSON.parse(v.dataset.playlist); } catch (e) { return; }
    if (!Array.isArray(playlist) || !playlist.length) return;

    let idx = 0;
    v.dataset.playlistIdx = '0'; // track current clip index for caption system
    const preferTall = v.closest('.spec-visual-item') !== null || v.hasAttribute('data-prefer-tall');
    const resolve = (item) => {
      const isMobile = window.innerWidth <= 768;
      return (isMobile || preferTall) ? (item.v || item.sq || item.h) : (item.h || item.sq || item.v);
    };

    // Resolve the FIRST clip immediately. Without this the element kept whatever
    // src= the HTML shipped with until an 'ended' or 'resize' fired — so on initial
    // load a panel could show the wrong ratio (e.g. horizontal in a tall column).
    const applyCurrent = () => {
      const isMobile = window.innerWidth <= 768;
      while (isMobile && playlist[idx].mobile_skip && playlist.length > 1) {
         idx = (idx + 1) % playlist.length;
      }
      const target = resolve(playlist[idx]);
      if (target && v.getAttribute('src') !== target) {
        const wasPlaying = !v.paused;
        v.src = target;
        v.load();
        if (wasPlaying || v.hasAttribute('autoplay')) {
          const p = v.play();
          if (p !== undefined) p.catch(() => {});
        }
      }
    };
    applyCurrent();

    let isTransitioning = false;
    v.addEventListener('ended', () => {
      if (isTransitioning) return;
      isTransitioning = true;

      const isMobile = window.innerWidth <= 768;
      do {
        idx = (idx + 1) % playlist.length;
      } while (isMobile && playlist[idx].mobile_skip && playlist.length > 1);
      v.dataset.playlistIdx = String(idx); // update tracker for caption system
      
      const nextSrc = resolve(playlist[idx]);
      const parent = v.parentElement;
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      
      const nextV = v.cloneNode(true);
      nextV.removeAttribute('data-playlist');
      nextV.removeAttribute('id');
      nextV.src = nextSrc;
      nextV.style.position = 'absolute';
      nextV.style.inset = '0';
      nextV.style.zIndex = '2';
      nextV.style.opacity = '0';
      nextV.style.transition = 'opacity 0.16s ease-in-out';
      
      parent.insertBefore(nextV, v.nextSibling);
      nextV.load();
      
      let transitionStarted = false;
      const startTransition = () => {
        if (transitionStarted) return;
        transitionStarted = true;
        const p1 = nextV.play();
        if (p1 !== undefined) p1.catch(()=>{});
        
        requestAnimationFrame(() => {
          nextV.style.opacity = '1';
        });
        
        setTimeout(() => {
          v.src = nextSrc;
          v.load();
          const p2 = v.play();
          if (p2 !== undefined) p2.catch(()=>{});
          
          const onPlaying = () => {
            v.removeEventListener('playing', onPlaying);
            if (nextV.parentNode) nextV.parentNode.removeChild(nextV);
            isTransitioning = false;
          };
          v.addEventListener('playing', onPlaying);
          
          setTimeout(() => {
            if (nextV.parentNode) nextV.parentNode.removeChild(nextV);
            isTransitioning = false;
          }, 1000);
        }, 160);
      };
      
      nextV.addEventListener('loadeddata', startTransition, {once: true});
      setTimeout(startTransition, 2000);
    });

    onWidthResize(applyCurrent);
  });
});

// ==========================================================================
// Video captions overlaid on muted clips where someone is talking — e.g. the
// No Bluetooth actor clip. data-captions is a JSON array of {start,end,text}
// in seconds, and applies only to the FIRST clip of that video's playlist.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.playlist-video[data-captions]').forEach(v => {
    let cues;
    try { cues = JSON.parse(v.dataset.captions); } catch (e) { return; }
    if (!Array.isArray(cues) || !cues.length) return;

    // .media-with-caption wraps the video and its absolutely-positioned caption pill.
    const captionEl = v.closest('.media-with-caption')?.querySelector('.video-caption');
    if (!captionEl) return;

    // Use data-playlist-idx to know which clip is active — set by the playlist engine
    // above on every transition. idx===0 means first clip (captions on), else off.
    const onFirstClip = () => {
      const idx = parseInt(v.dataset.playlistIdx || '0', 10);
      return idx === 0;
    };

    v.addEventListener('timeupdate', () => {
      if (!onFirstClip()) {
        captionEl.classList.remove('is-visible');
        return;
      }
      const cue = cues.find(c => v.currentTime >= c.start && v.currentTime < c.end);
      if (cue) {
        captionEl.textContent = cue.text;
        captionEl.classList.add('is-visible');
      } else {
        captionEl.classList.remove('is-visible');
      }
    });
  });
});

// ==========================================================================
// AirPods-Style Tech Specs Accordion
// Desktop: list and video sit side-by-side (video stays in the shared panel).
// Mobile: the video for the active item is physically moved to unfold directly
// underneath that item, instead of living in a panel far below the whole list.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const techItems = document.querySelectorAll('.tech-item');
  const visItems = document.querySelectorAll('.spec-visual-item');
  const visualPanel = document.querySelector('.tech-specs-visual');
  if (!techItems.length || !visItems.length || !visualPanel) return;

  const isMobile = () => window.innerWidth <= 768;
  let activeIndex = 0;

  // The other Tech Specs panels (cushion/controller exploded views, cables,
  // power options, etc.) had no chrome at all — the B mark and BUY NOW only
  // showed up in the one panel ("No Bluetooth") that had already been moved
  // to the newer video-lightbox. Routing this legacy in-place toggle through
  // the same shared lightboxChrome/scrollLock (used everywhere else on the
  // site) closes that gap without changing how this feature itself works.
  /* This overlay is the one viewer with no close button of its own — it was
     built as "tap anywhere to dismiss" with a text pill saying so. Now that
     every other viewer on the site closes via the same silver X, it gets one
     too, injected on open and removed on close (the element it lives in is a
     real Tech Specs panel that goes back into the page afterwards, so nothing
     is left behind). Tap-anywhere still works; this just makes the way out
     visible and consistent. Uses the --viewport variant because this media is
     effectively full-bleed, so its own corner is the screen's corner and would
     otherwise land under the BUY NOW pill. */
  const SPEC_CLOSE_CLASS = 'spec-fullscreen-close';
  const addSpecClose = (el) => {
    if (el.querySelector('.' + SPEC_CLOSE_CLASS)) return;
    const btn = document.createElement('button');
    btn.className = `media-close media-close--viewport ${SPEC_CLOSE_CLASS}`;
    btn.setAttribute('aria-label', 'Close video');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    btn.addEventListener('click', (e) => { e.stopPropagation(); setSpecFullscreen(el, false); });
    el.appendChild(btn);
  };

  const setSpecFullscreen = (el, on) => {
    el.classList.toggle('fullscreen-overlay', on);
    if (on) {
      addSpecClose(el);
      lightboxChrome.show('spec-fullscreen');
      scrollLock.lock('spec-fullscreen');
    } else {
      el.querySelector('.' + SPEC_CLOSE_CLASS)?.remove();
      lightboxChrome.hide('spec-fullscreen');
      scrollLock.unlock('spec-fullscreen');
    }
  };
  // So the chrome's own logo/BUY NOW controls can dismiss this too, same as
  // the other three overlay types.
  lightboxCloseFns.specFullscreen = () => {
    document.querySelectorAll('.spec-visual-item.fullscreen-overlay')
      .forEach(el => setSpecFullscreen(el, false));
  };

  function placeActiveVideo() {
    visItems.forEach((vi, i) => {
      const targetParent = (isMobile() && i === activeIndex) ? techItems[i] : visualPanel;
      if (vi.parentElement !== targetParent) targetParent.appendChild(vi);
    });
  }

  techItems.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      const clickedVideo = e.target.closest('.spec-visual-item');
      // A panel "owns its viewer" when something else already binds a click on
      // it: .vid-clickable opens the video-lightbox, .doc-clickable (the
      // controller-placement diagram, moved here from Installation) opens the
      // zoomable document viewer. Either way this legacy in-place fullscreen
      // must stay out of the way, or both fire on one tap and stack.
      const ownsViewer = !!clickedVideo && (
        clickedVideo.classList.contains('vid-clickable') ||
        clickedVideo.classList.contains('doc-clickable') ||
        !!clickedVideo.querySelector('.doc-clickable')
      );

      if (item.classList.contains('active')) {
        // .vid-clickable panels (the "no bluetooth" demo) now open the real
        // video-lightbox instead — that binds its own click handler directly
        // on this element. Without this guard both fired on the same tap:
        // the lightbox opened (z-index 10000) ON TOP of this legacy in-place
        // fullscreen (z-index 9999), which stayed alive underneath — still
        // full-viewport, still cycling its own separate copy of the same
        // clips — so closing the lightbox dropped you into THAT instead of
        // the normal page. Exactly the "goes to a previous window, trips
        // between the 2 videos" report.
        if (clickedVideo && isMobile() && !ownsViewer) {
          setSpecFullscreen(clickedVideo, !clickedVideo.classList.contains('fullscreen-overlay'));
        } else if (!clickedVideo || !ownsViewer) {
          item.classList.remove('active');
          if (visItems[index]) {
            visItems[index].classList.remove('active');
            setSpecFullscreen(visItems[index], false);
          }
        }
      } else {
        techItems.forEach(i => i.classList.remove('active'));
        visItems.forEach(v => {
          v.classList.remove('active');
          setSpecFullscreen(v, false);
        });

        item.classList.add('active');
        if (visItems[index]) visItems[index].classList.add('active');

        // Play-once videos (cushion + controller exploded views) don't loop
        // on their own anymore — replay them from the start whenever their
        // panel is reopened, so they don't just sit frozen from last time.
        visItems[index]?.querySelectorAll('video.play-once').forEach(vid => vid.resetAndPlay?.());

        activeIndex = index;
        placeActiveVideo();
      }
    });
  });

  // Width-gated: this appendChild()s a <video> between two parents, which tears
  // down and rebuilds its rendering. Only the mobile/desktop breakpoint changes
  // where it belongs, so a URL-bar height change must never trigger it.
  onWidthResize(placeActiveVideo);
  placeActiveVideo();
});

// Plain play-once videos (no native loop, no reverse — just start to end and
// stop there): gets a resetAndPlay() so the Tech Specs accordion below can
// replay it from the start when reopened. An optional data-rate speeds
// specific clips up (the controller exploded view played too slowly at 1x).
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('video.play-once').forEach(vid => {
    const rate = parseFloat(vid.dataset.rate) || 1;
    vid.playbackRate = rate;
    // Belt-and-suspenders: some browsers silently reset playbackRate back to
    // 1 once real playback actually starts, even though it was set correctly
    // beforehand — re-assert it every time so a custom rate actually sticks.
    if (rate !== 1) vid.addEventListener('playing', () => { vid.playbackRate = rate; });
    vid.resetAndPlay = () => {
      vid.currentTime = 0;
      vid.playbackRate = rate;
      // Swallow the "play() interrupted by a new load request" rejection —
      // switching panels quickly replaces the source mid-play by design.
      vid.play()?.catch(() => {});
    };
  });
});
