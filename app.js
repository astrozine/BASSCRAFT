/* ==========================================================================
   BASSCRAFT — Scroll Engine v4
   Responsive Video Swap · Sticky Scrub · Sound Toggles · Web Audio Knobs
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

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
    const preferTall = v.closest('.spec-visual-item') !== null || v.hasAttribute('data-prefer-tall');
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
      v.removeAttribute('preload'); // ensure preload=none doesn't block loading
      v.load();
      // Force metadata load for scrub videos on mobile
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          if (!v.hasAttribute('autoplay') || v.closest('.vid-paused')) {
            v.pause();
          }
        }).catch(() => {});
      }
    }
  });
}

setResponsiveVideoSources();
window.addEventListener('resize', setResponsiveVideoSources);

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
window.addEventListener('resize', setResponsiveImageSources);

/* ══════════════════════════════════════════════════════════════
   2. NAV
   ══════════════════════════════════════════════════════════════ */
// Nav starts transparent over the hero (so the video isn't cropped by a solid bar)
// and picks up its solid/blurred background once scrolled past it.
const navbarEl = document.querySelector('.navbar');
if (navbarEl) {
  const toggleNavScrolled = () => {
    navbarEl.classList.toggle('scrolled', window.scrollY > 40);
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
    if (!visible.length) return;
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

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Mobile hamburger menu — same destinations as .nav-links, just reachable
// below the 768px breakpoint where that bar is hidden.
(() => {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-nav-menu');
  if (!btn || !menu) return;

  const closeMenu = () => {
    menu.classList.remove('is-open');
    btn.classList.remove('is-active');
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', () => {
    const willOpen = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', willOpen);
    btn.classList.toggle('is-active', willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      closeMenu();
      if (href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
   3. HERO — Logo + CTA fades out on scroll
   ══════════════════════════════════════════════════════════════ */
const heroLogo = document.getElementById('hero-logo');
const heroCta = document.getElementById('hero-cta');
if (heroLogo) {
  gsap.to([heroLogo, heroCta, '.hero-tagline'], {
    opacity: 0,
    scale: 0.92,
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: '50% top',
      scrub: true,
    }
  });
}

// Hero CTA smooth scroll
if (heroCta) {
  heroCta.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* ══════════════════════════════════════════════════════════════
   4. VIDEO SCROLL-SCRUB ENGINE
   ══════════════════════════════════════════════════════════════ */
let mm = gsap.matchMedia();

mm.add("(max-width: 768px)", () => {
  // MOBILE: Force background videos to autoplay naturally
  // Exclude skit cards EXCEPT the three-knobs video which should autoplay
  document.querySelectorAll('.sticky-vp video:not(.skit-card video), #ctrl-intro-vid').forEach(v => {
    v.setAttribute('autoplay', '');
    v.setAttribute('loop', '');
    v.play().catch(e => console.log('Autoplay blocked'));
  });
});

mm.add("(min-width: 769px)", () => {
  // DESKTOP: Ensure videos are paused so GSAP can scrub them
  document.querySelectorAll('.sticky-vp video').forEach(v => {
    v.removeAttribute('autoplay');
    v.removeAttribute('loop');
    v.pause();
  });
const sequenceHandlers = {};
document.querySelectorAll('.sticky-vp').forEach(vp => {
  let scrubVid = vp.querySelector('.scrub-vid') || vp.querySelector('video');
  if (scrubVid) scrubVid.pause();

  let endVal = '+=100%';
  if (vp.id === 'nobt-trigger') endVal = '+=250%';
  if (vp.id === 'hand-trigger') endVal = '+=50%';
  if (vp.id === 'stealth-trigger') endVal = '+=100%';

  let st = ScrollTrigger.create({
    trigger: vp.parentElement,
    start: 'top top',
    end: endVal,
    pin: true,
    scrub: 0.3,
    onToggle: (self) => {
      if (vp.id === 'hand-trigger') {
        gsap.to(document.body, { backgroundColor: self.isActive ? '#d3bfb4' : '#0f0f0f', duration: 0.5 });
      }
    },
    onUpdate: (self) => {
      if (scrubVid && scrubVid.duration) {
        // Exploded view sections: video completes at 50% scroll so cards have more time
        const isExplode = vp.id === 'cush-explode-trigger' || vp.id === 'ctrl-explode-trigger';
        const vidProg = isExplode ? Math.min(self.progress / 0.5, 1) : self.progress;
        scrubVid.currentTime = vidProg * scrubVid.duration;
      }
      if (sequenceHandlers[vp.id]) {
        sequenceHandlers[vp.id](self);
      }
    },
    onLeave: () => pauseAllVideos(vp),
    onLeaveBack: () => pauseAllVideos(vp)
  });
});

function pauseAllVideos(container) {
  container.querySelectorAll('video').forEach(v => {
    if (!v.classList.contains('scrub-vid')) {
      v.pause();
      let btn = v.parentElement.querySelector('.play-btn');
      if(btn) btn.style.opacity = '1';
    }
  });
}

sequenceHandlers['cush-explode-trigger'] = (self) => {
  const cushCards = document.querySelectorAll('#cush-callouts .callout');
  cushCards.forEach((card) => {
    let pIn = Math.max(0, Math.min((self.progress - 0.5) / 0.1, 1));
    let pOut = Math.max(0, Math.min((self.progress - 0.9) / 0.1, 1));
    let op = pIn - pOut;
    let y = (1 - Math.pow(pIn, 3)) * 50; // 50px slide up
    card.style.opacity = op;
    card.style.setProperty('--y', `${y}px`);
  });
};

/* ══════════════════════════════════════════════════════════════
   5. NO BLUETOOTH SEQUENCE
   ══════════════════════════════════════════════════════════════ */
sequenceHandlers['nobt-trigger'] = (self) => {
    const vid = document.getElementById('nobt-bg-vid');
    if (vid && vid.readyState >= 1 && vid.duration) {
      let p = Math.min(self.progress / 0.20, 1);
      vid.currentTime = vid.duration * (0.85 * p);
    }

    // 2. Graphic slides up
    const graphic = document.getElementById('nobt-graphic');
    if (graphic) {
      let gp = Math.max(0, Math.min(self.progress / 0.10, 1));
      let ease = 1 - Math.pow(1 - gp, 3);
      graphic.style.opacity = gp;
      graphic.style.transform = `translateY(${(1-ease)*100}vh)`;
    }

    const nobtCard = document.getElementById('nobt-skit-card');
    const skitVid = document.getElementById('skit-video');
    if (nobtCard) {
      let spIn = Math.max(0, Math.min((self.progress - 0.15) / 0.10, 1));
      let spOut = Math.max(0, Math.min((self.progress - 0.60) / 0.10, 1));
      let easeIn = 1 - Math.pow(1 - spIn, 3);
      let easeOut = Math.pow(spOut, 3);

      nobtCard.style.opacity = easeIn - easeOut;
      nobtCard.style.transform = `translate(-50%, ${120 - 170 * easeIn - 100 * easeOut}%)`;

      if (skitVid) {
        if (self.progress >= 0.20 && self.progress < 0.60) {
          if (skitVid.paused) {
            skitVid.muted = window.globalAudioMuted ? true : false;
            skitVid.play().catch(e => { skitVid.muted = true; skitVid.play(); });
          }
        } else {
          if (!skitVid.paused) {
            skitVid.pause();
          }
        }
      }
    }

    const demoCard = document.getElementById('demo-skit-card');
    const demoVid = document.getElementById('demo-video');
    if (demoCard) {
      let dp = Math.max(0, Math.min((self.progress - 0.75) / 0.10, 1));
      let ease = 1 - Math.pow(1 - dp, 3);

      demoCard.style.opacity = ease;
      demoCard.style.transform = `translate(${100 - 150 * ease}%, -50%)`;

      if (demoVid) {
        if (self.isActive && self.progress >= 0.85 && demoVid.paused) {
          demoVid.muted = window.globalAudioMuted ? true : false;
          demoVid.play().catch(e => { demoVid.muted = true; demoVid.play(); });
        } else if (self.progress < 0.85 && !demoVid.paused) {
          demoVid.pause();
        }
      }
    }
  };

/* ══════════════════════════════════════════════════════════════
   6. COMMAND CENTRAL SEQUENCE
   ══════════════════════════════════════════════════════════════ */
sequenceHandlers['ctrl-hero-trigger'] = (self) => {
    const vid = document.getElementById('ctrl-hero-vid');
    if (vid && vid.readyState >= 1 && vid.duration) {
      let p = Math.min(self.progress / 0.95, 1);
      vid.currentTime = vid.duration * (0.85 * p);
    }

    const txt = document.getElementById('command-central-text');
    if (txt) {
      let tp = Math.max(0, Math.min((self.progress - 0.10) / 0.25, 1));
      txt.style.opacity = tp;
    }

    const ctrlCard = document.getElementById('ctrl-intro-card');
    const ctrlVid = document.getElementById('ctrl-intro-vid');
    if (ctrlCard) {
      let cp = Math.max(0, Math.min((self.progress - 0.40) / 0.50, 1));
      let ease = 1 - Math.pow(1 - cp, 3);
      ctrlCard.style.opacity = ease;
      ctrlCard.style.setProperty('--ease', ease);

      if (ctrlVid) {
        if (self.isActive && self.progress >= 0.70 && ctrlVid.paused && !ctrlVid.dataset.userPaused) {
          ctrlVid.muted = window.globalAudioMuted ? true : false;
          ctrlVid.play().catch(e => { ctrlVid.muted = true; ctrlVid.play(); });
        } else if (self.progress < 0.70 && !ctrlVid.paused) {
          ctrlVid.pause();
          delete ctrlVid.dataset.userPaused;
        }
      }
    }
  };

/* ══════════════════════════════════════════════════════════════
   7. CONTROLLER EXPLODED VIEW
   ══════════════════════════════════════════════════════════════ */
sequenceHandlers['ctrl-explode-trigger'] = (self) => {
  const topCopy = document.getElementById('ctrl-top-copy');
  if (topCopy) {
    let tpIn = Math.max(0, Math.min(self.progress / 0.05, 1));
    let tpOut = Math.max(0, Math.min((self.progress - 0.9) / 0.1, 1));
    topCopy.style.opacity = tpIn - tpOut;
  }
  
  const ctrlCards = document.querySelectorAll('#ctrl-callouts .callout');
  ctrlCards.forEach((card) => {
    let pIn = Math.max(0, Math.min((self.progress - 0.5) / 0.1, 1));
    let pOut = Math.max(0, Math.min((self.progress - 0.9) / 0.1, 1));
    let op = pIn - pOut;
    let y = (1 - Math.pow(pIn, 3)) * 50;
    card.style.opacity = op;
    card.style.setProperty('--y', `${y}px`);
  });
};

/* ══════════════════════════════════════════════════════════════
   8. FITS IN ONE HAND — Sticky + Always in Reach Overlay
   ══════════════════════════════════════════════════════════════ */
const handVid = document.getElementById('hand-bg-vid');
if (handVid) {
  handVid.pause();
  handVid.currentTime = 0;
}
sequenceHandlers['hand-sticky-trigger'] = (self) => {
  if (handVid && handVid.readyState >= 1 && handVid.duration) {
        let p = Math.min(self.progress / 0.7, 1);
        handVid.currentTime = handVid.duration * (0.85 * p);
      }

      const handText = document.getElementById('hand-text');
      if (handText) {
        let tp = Math.max(0, Math.min((self.progress - 0.4) / 0.2, 1));
        handText.style.opacity = tp;
      }

      const reachCard = document.getElementById('reach-card');
      if (reachCard) {
        let rp = Math.max(0, Math.min((self.progress - 0.20) / 0.20, 1));
        let ease = 1 - Math.pow(1 - rp, 3);
        reachCard.style.opacity = ease;
        reachCard.style.setProperty('--ease', ease);

        const reachVid = reachCard.querySelector('video');
        if (reachVid) {
          if (ease >= 1 && reachVid.paused) {
            reachVid.play().catch(e => console.log('Reach vid auto-play blocked', e));
          } else if (ease < 1 && !reachVid.paused) {
            reachVid.pause();
          }
        }
      }
  };

/* ══════════════════════════════════════════════════════════════
   9. STEALTH MODE — Sticky BG + Skit Overlay
   ══════════════════════════════════════════════════════════════ */
const stealthVid = document.getElementById('stealth-bg-vid');
if (stealthVid) {
  stealthVid.pause();
  stealthVid.currentTime = 0;
}
sequenceHandlers['stealth-trigger'] = (self) => {
  if (stealthVid && stealthVid.readyState >= 1 && stealthVid.duration) {
        let p = Math.min(self.progress / 0.7, 1);
        stealthVid.currentTime = stealthVid.duration * (0.85 * p);
        const hideVid = document.getElementById('hide-skit-vid');
      if (hideVid) {
        if (self.isActive && self.progress >= 0.7 && hideVid.paused) {
          hideVid.muted = window.globalAudioMuted ? true : false;
          hideVid.play().catch(e => { hideVid.muted = true; hideVid.play(); });
        } else if (self.progress < 0.7 && !hideVid.paused) {
          hideVid.pause();
        }
      }
    }

      const stealthText = document.getElementById('stealth-text');
      if (stealthText) {
        let tp = Math.max(0, Math.min((self.progress - 0.05) / 0.3, 1));
        stealthText.style.opacity = tp;
      }

      const stealthCard = document.getElementById('stealth-skit-card');
      if (stealthCard) {
        let sp = Math.max(0, Math.min((self.progress - 0.65) / 0.1, 1));
        let ease = 1 - Math.pow(1 - sp, 3);
        stealthCard.style.setProperty('--ease', ease);
      }
  };
}); // end matchMedia

/* ══════════════════════════════════════════════════════════════
   10. PLAY BUTTONS — Click to Play/Unmute
   ══════════════════════════════════════════════════════════════ */
function setupPlayBtn(btnId, videoId, wrapId) {
  const btn = document.getElementById(btnId);
  const video = document.getElementById(videoId);
  const wrap = wrapId ? document.getElementById(wrapId) : btn?.closest('.vid-paused');
  if (!btn || !video) return;

  video.pause();
  video.currentTime = 0.001;

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (video.paused) {
      video.muted = window.globalAudioMuted ? true : false;
      video.play().catch(err => console.log('Manual play blocked', err));
    } else {
      video.pause();
      video.muted = true;
    }
  };

  // Sync UI state natively
  video.addEventListener('play', () => {
    if (wrap) wrap.classList.add('is-playing');
    if (btn) {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    }
  });
  video.addEventListener('pause', () => {
    if (wrap) wrap.classList.remove('is-playing');
    if (btn) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  if (btn) btn.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);
}

setupPlayBtn('play-nobt', 'skit-video', 'skit-wrap');
setupPlayBtn('play-demo', 'demo-video', 'demo-wrap');
setupPlayBtn('play-hide', 'hide-skit-vid', 'hide-wrap');

/* ══════════════════════════════════════════════════════════════
   11. SOUND TOGGLE BUTTONS (Autoplay videos)
   ══════════════════════════════════════════════════════════════ */
function setupSoundToggle(btnId, videoId) {
  const btn = document.getElementById(btnId);
  const video = document.getElementById(videoId);
  if (!btn || !video) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (video.muted) {
      video.muted = window.globalAudioMuted ? true : false;
      btn.textContent = '🔊';
    } else {
      video.muted = true;
      btn.textContent = '🔇';
    }
  });
}

  const playPauseCtrl = document.getElementById('play-pause-ctrl-intro');
  const ctrlIntroVid = document.getElementById('ctrl-intro-vid');
  if (playPauseCtrl && ctrlIntroVid) {
    playPauseCtrl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ctrlIntroVid.paused) {
        ctrlIntroVid.play();
        delete ctrlIntroVid.dataset.userPaused;
      } else {
        ctrlIntroVid.pause();
        ctrlIntroVid.dataset.userPaused = 'true';
      }
    });
    ctrlIntroVid.addEventListener('play', () => {
      document.getElementById('icon-ctrl-play').style.display = 'none';
      document.getElementById('icon-ctrl-pause').style.display = 'block';
    });
    ctrlIntroVid.addEventListener('pause', () => {
      document.getElementById('icon-ctrl-play').style.display = 'block';
      document.getElementById('icon-ctrl-pause').style.display = 'none';
    });
  }
setupSoundToggle('sound-knobs', 'knobs-vid');

/* ══════════════════════════════════════════════════════════════
   12. GENRE CARDS — Still, Click to Play with Sound
   ══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.genre-card').forEach(card => {
  const video = card.querySelector('video');
  const btn = card.querySelector('.genre-play');
  const wrap = card.querySelector('.vid-wrap');
  if (!video || !btn) return;

  video.pause();
  video.currentTime = 0.001;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!video.paused && !video.muted) {
      video.pause();
      video.muted = true;
      return;
    }

    document.querySelectorAll('.genre-card').forEach(otherCard => {
      if (otherCard === card) return;
      const otherVid = otherCard.querySelector('video');
      const otherWrap = otherCard.querySelector('.vid-wrap');
      if (otherVid) { otherVid.pause(); otherVid.muted = true; }
    });

    video.play();
    video.muted = window.globalAudioMuted ? true : false;
  });

  if (video) {
    video.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!video.paused && !video.muted) {
        video.pause();
        video.muted = true;
      } else {
        video.play();
        video.muted = window.globalAudioMuted ? true : false;
      }
    });
  }
});

/* ══════════════════════════════════════════════════════════════
   13. CANVAS VISUALIZERS
   ══════════════════════════════════════════════════════════════ */

// Acoustic spectrum
const acCanvas = document.getElementById('acoustic-canvas');
if (acCanvas) {
  const ctx = acCanvas.getContext('2d');
  function resizeAc() {
    acCanvas.width = acCanvas.parentElement.clientWidth;
    acCanvas.height = acCanvas.parentElement.clientHeight || 200;
  }
  resizeAc();
  window.addEventListener('resize', resizeAc);
  let t = 0;
  function drawAc() {
    const { width: w, height: h } = acCanvas;
    ctx.clearRect(0, 0, w, h);
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      const amp = 30 - layer * 8;
      const freq = 0.015 + layer * 0.005;
      for (let x = 0; x < w; x++) {
        ctx.lineTo(x, h / 2 + Math.sin(x * freq + t + layer) * amp * Math.sin(x * 0.003 + t * 0.3));
      }
      ctx.strokeStyle = `rgba(180,225,255,${0.5 - layer * 0.15})`;
      ctx.lineWidth = 2.5 - layer * 0.5;
      ctx.stroke();
    }
    t += 0.04;
    requestAnimationFrame(drawAc);
  }
  drawAc();
}

/* ══════════════════════════════════════════════════════════════
   14. INTERACTIVE CONTROLLER DEMO — Web Audio API
   ══════════════════════════════════════════════════════════════ */
const controllerDemo = document.getElementById('controller-demo');
if (controllerDemo) {
  let audioCtx = null;
  let oscillator = null;
  let gainNode = null;
  let noiseFilter = null;
  let noiseSource = null;
  let isAudioActive = false;

  // Knob values
  const knobValues = {
    freq: 0.3,
    intensity: 0.5,
    noise: 0.4,
  };

  // Map knob values to audio params
  function getFreq() { return 20 + knobValues.freq * 100; } // 20-120 Hz
  function getGain() { return knobValues.intensity * 0.4; } // 0-0.4
  function getFilterCutoff() { return 100 + knobValues.noise * 1900; } // 100-2000 Hz

  function startAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)(); window.demoAudioCtx = audioCtx;

    // Oscillator (sub-bass)
    oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = getFreq();

    // Gain
    gainNode = audioCtx.createGain();
    gainNode.gain.value = getGain();

    // Noise source
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = getFilterCutoff();

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.05;

    // Connect
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    oscillator.start();
    noiseSource.start();
    isAudioActive = true; window.demoIsAudioActive = true;
  }

  function updateAudio() {
    if (!isAudioActive || !audioCtx) return;
    oscillator.frequency.setTargetAtTime(getFreq(), audioCtx.currentTime, 0.05);
    gainNode.gain.setTargetAtTime(getGain(), audioCtx.currentTime, 0.05);
    noiseFilter.frequency.setTargetAtTime(getFilterCutoff(), audioCtx.currentTime, 0.05);
  }

  // Audio Scroll Trigger (suspend/resume automatically)
  ScrollTrigger.create({
    trigger: '#controller-demo',
    start: 'top bottom',
    end: 'bottom top',
    onLeave: () => {
      if (isAudioActive && audioCtx && audioCtx.state === 'running') audioCtx.suspend();
    },
    onLeaveBack: () => {
      if (isAudioActive && audioCtx && audioCtx.state === 'running') audioCtx.suspend();
    },
    onEnter: () => {
      if (isAudioActive && audioCtx && audioCtx.state === 'suspended' && !window.globalAudioMuted) audioCtx.resume();
    },
    onEnterBack: () => {
      if (isAudioActive && audioCtx && audioCtx.state === 'suspended' && !window.globalAudioMuted) audioCtx.resume();
    }
  });

  // Knob interaction
  document.querySelectorAll('.dial-v2').forEach(dial => {
    let startY = 0;
    let startValue = 0;
    const knobId = dial.id;
    const indicator = dial.querySelector('.dial-indicator');

    function getKey() {
      if (knobId === 'dial-freq') return 'freq';
      if (knobId === 'dial-intensity') return 'intensity';
      return 'noise';
    }

    function updateVisual() {
      const val = knobValues[getKey()];
      const angle = -135 + val * 270; // -135 to 135 degrees
      if (indicator) indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }

    // Initialize visual
    updateVisual();

    function onPointerDown(e) {
      e.preventDefault();
      startY = e.clientY || e.touches?.[0]?.clientY || 0;
      startValue = knobValues[getKey()];

      // Auto-start audio on interaction
      if (!isAudioActive) {
        startAudio();
      } else if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      function onPointerMove(e) {
        const y = e.clientY || e.touches?.[0]?.clientY || 0;
        const delta = (startY - y) / 150;
        knobValues[getKey()] = Math.max(0, Math.min(1, startValue + delta));
        updateVisual();
        updateAudio();
      }

      function onPointerUp() {
        window.removeEventListener('mousemove', onPointerMove);
        window.removeEventListener('mouseup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);
      }

      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    }

    dial.addEventListener('mousedown', onPointerDown);
    dial.addEventListener('touchstart', onPointerDown, { passive: false });
  });

  // Interactive canvas visualizer (reacts to knob values)
  const intCanvas = document.getElementById('interactive-canvas');
  if (intCanvas) {
    const ctx2 = intCanvas.getContext('2d');
    function resizeInt() {
      intCanvas.width = intCanvas.parentElement.clientWidth;
      intCanvas.height = intCanvas.parentElement.clientHeight || 150;
    }
    resizeInt();
    window.addEventListener('resize', resizeInt);
    let t2 = 0;
    function drawInt() {
      const { width: w, height: h } = intCanvas;
      ctx2.clearRect(0, 0, w, h);

      const amp = 10 + knobValues.intensity * 50;
      const freq = 0.01 + knobValues.freq * 0.04;
      const noiseAmt = knobValues.noise * 15;

      ctx2.beginPath();
      ctx2.moveTo(0, h / 2);
      for (let x = 0; x < w; x++) {
        const noise = (Math.random() - 0.5) * noiseAmt;
        ctx2.lineTo(x, h / 2 + Math.sin(x * freq + t2) * amp + noise);
      }
      ctx2.strokeStyle = `rgba(180,225,255,${0.5 + knobValues.intensity * 0.4})`;
      ctx2.lineWidth = 2.5;
      ctx2.stroke();

      // Second layer
      ctx2.beginPath();
      ctx2.moveTo(0, h / 2);
      for (let x = 0; x < w; x++) {
        ctx2.lineTo(x, h / 2 + Math.sin(x * freq * 1.5 + t2 * 0.7) * amp * 0.5);
      }
      ctx2.strokeStyle = `rgba(180,225,255,0.2)`;
      ctx2.lineWidth = 1.5;
      ctx2.stroke();

      t2 += 0.06 + knobValues.freq * 0.1;
      requestAnimationFrame(drawInt);
    }
    drawInt();
  }
}

/* --------------------------------------------------------------
   15. SCROLL-TRIGGERED FADE-INS
   -------------------------------------------------------------- */
document.querySelectorAll('.s-dark, .s-light').forEach(section => {
  const targets = section.querySelectorAll('h2, p, .vid-r, .vid-grid, .genre-grid, .specs-tbl, .sales-flex, .diagram-img, .grid-2 > div, .feat-row > div, .vid-r-sm, .duo-grid, .glass-card, .white-vid-item, .controller-demo');
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
   18. CART & UPSELL LOGIC
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
  cartOverlay.classList.add('is-active');
  if (view === 'upsell') {
    cartUpsellView.style.display = 'block';
    cartCheckoutView.style.display = 'none';
  } else {
    cartUpsellView.style.display = 'none';
    cartCheckoutView.style.display = 'block';
  }
}

function closeCart() {
  if (cartOverlay) cartOverlay.classList.remove('is-active');
}

let cartQty = 1;

function updateCartUI() {
  const isPlural = cartQty > 1;
  const isPair = cartQty % 2 === 0;
  
  if (itemImg) {
    const src = cartQty >= 2 ? 'assets/images/2 products one controller.webp' : 'assets/images/basscraft_studio_product.jpg';
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

// Tap the product photo (either cart view) to see it full screen.
const cartLightbox = document.getElementById('cart-image-lightbox');
const cartLightboxImg = document.getElementById('cart-lightbox-img');
function openCartLightbox(src) {
  if (!cartLightbox || !cartLightboxImg || !src) return;
  cartLightboxImg.src = src;
  cartLightbox.classList.add('is-active');
}
function closeCartLightbox() {
  if (cartLightbox) cartLightbox.classList.remove('is-active');
}
document.querySelectorAll('.cart-media-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const src = btn.id === 'cart-media-expand-btn' ? itemImg?.src : btn.dataset.lightboxSrc;
    openCartLightbox(src);
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

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const isStarterBtn = btn.closest('.pricing-card') && !btn.closest('.featured');
    if (isStarterBtn) {
      openCart('upsell');
    } else {
      cartQty = 2;
      updateCartUI();
      openCart('checkout');
    }
  });
});
// Global Audio Mute
let globalAudioMuted = false;
const globalMuteBtn = document.getElementById('global-mute-btn');
if (globalMuteBtn) {
  const iconOn = document.getElementById('icon-audio-on');
  const iconOff = document.getElementById('icon-audio-off');
  globalMuteBtn.addEventListener('click', () => {
    globalAudioMuted = !globalAudioMuted;

    if (iconOn && iconOff) {
      iconOn.style.display = globalAudioMuted ? 'none' : 'block';
      iconOff.style.display = globalAudioMuted ? 'block' : 'none';
    }
    globalMuteBtn.style.opacity = globalAudioMuted ? '0.6' : '1';

    // Update currently playing playable videos
    document.querySelectorAll('video:not(.scrub-vid)').forEach(vid => {
      if (!vid.hasAttribute('autoplay')) {
        vid.muted = globalAudioMuted;
      }
    });
  });
}

// Flashing Play/Pause Indicator
document.querySelectorAll('video').forEach(vid => {
  if (vid.classList.contains('scrub-vid')) return; // Skip background scrub videos
  if (vid.hasAttribute('autoplay')) return; // Skip ambient loops

  const indicator = document.createElement('div');
  indicator.className = 'vid-status-indicator';
  indicator.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';

  const wrapper = vid.parentElement;
  if (getComputedStyle(wrapper).position === 'static') {
    wrapper.style.position = 'relative';
  }
  wrapper.appendChild(indicator);

  indicator.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (vid.paused) {
      vid.muted = window.globalAudioMuted ? true : false;
      vid.play();
    } else {
      vid.pause();
    }
  });

  vid.addEventListener('play', () => {
    indicator.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    indicator.classList.add('show', 'flashing');
    if (globalAudioMuted) vid.muted = true;
  });
  vid.addEventListener('pause', () => {
  indicator.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    indicator.classList.add('show', 'flashing');
  });
});


// Global Intersection Observer to pause out-of-view videos
const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) {
      if (!entry.target.paused) {
        entry.target.pause();
        let btn = entry.target.parentElement.querySelector('.play-btn');
        if (btn) btn.style.opacity = '1';
      }
    } else {
      if (entry.target.hasAttribute('autoplay') && entry.target.paused) {
        entry.target.play().catch(() => {});
      }
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('video').forEach(vid => {
  if (!vid.classList.contains('scrub-vid')) {
    videoObserver.observe(vid);
  }
});



// Toggle interactive controller demo audio on mute button click
const globalMuteBtnRef = document.getElementById('global-mute-btn');
if (globalMuteBtnRef) {
  globalMuteBtnRef.addEventListener('click', () => {
    if (window.demoIsAudioActive && window.demoAudioCtx) {
      if (globalAudioMuted && window.demoAudioCtx.state === 'running') {
        window.demoAudioCtx.suspend();
      } else if (!globalAudioMuted && window.demoAudioCtx.state === 'suspended') {
        const demoNode = document.getElementById('controller-demo');
        if (demoNode) {
          const rect = demoNode.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            window.demoAudioCtx.resume();
          }
        }
      }
    }
  });
}

/* ==========================================================================
   13. MOBILE VERTICAL VIDEO SWAPS
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
      powerVideo.play();
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

    window.addEventListener('resize', applyCurrent);
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

  function placeActiveVideo() {
    visItems.forEach((vi, i) => {
      const targetParent = (isMobile() && i === activeIndex) ? techItems[i] : visualPanel;
      if (vi.parentElement !== targetParent) targetParent.appendChild(vi);
    });
  }

  techItems.forEach((item, index) => {
    item.addEventListener('click', (e) => {
      const clickedVideo = e.target.closest('.spec-visual-item');
      
      if (item.classList.contains('active')) {
        if (clickedVideo && isMobile()) {
          if (clickedVideo.classList.contains('fullscreen-overlay')) {
            clickedVideo.classList.remove('fullscreen-overlay');
          } else {
            clickedVideo.classList.add('fullscreen-overlay');
          }
        } else {
          item.classList.remove('active');
          if (visItems[index]) {
            visItems[index].classList.remove('active');
            visItems[index].classList.remove('fullscreen-overlay');
          }
        }
      } else {
        techItems.forEach(i => i.classList.remove('active'));
        visItems.forEach(v => {
          v.classList.remove('active');
          v.classList.remove('fullscreen-overlay');
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

  window.addEventListener('resize', placeActiveVideo);
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
      vid.play();
    };
  });
});
