/* =========================================================================
   Taner Yolcu Aluminium Works — "Precision in Metal"

   - Scroll-scrubbed WebP frame sequence on a fixed canvas (cinematic bg)
   - Three.js metallic dust field layered above it (mouse + velocity aware)
   - Lenis smooth scroll driving GSAP ScrollTrigger
   - Split-char 3D hero reveal, word-scrub manifesto, velocity marquees,
     pinned horizontal RW60 gallery with parallax, counters, tilt cards,
     magnetic buttons and a custom cursor
   - Respects prefers-reduced-motion throughout
   ========================================================================= */

import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { FRAME_CONFIG, buildFrameUrls } from './config.js'
import { initCursor } from './cursor.js'
import { splitChars, splitWords } from './split.js'
import { initLightboxZoom } from './lightbox-zoom.js'
import { initAnalytics } from './analytics.js'

gsap.registerPlugin(ScrollTrigger)

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (prefersReducedMotion) document.documentElement.classList.add('reduce-motion')

/* -------------------------------------------------------------------------
   Elements
   ------------------------------------------------------------------------- */
const canvas = document.getElementById('scene')
const ctx = canvas.getContext('2d', { alpha: false })
const loader = document.getElementById('loader')
const loaderFill = document.getElementById('loaderFill')
const loaderPct = document.getElementById('loaderPct')
const scrollHint = document.getElementById('scrollHint')
const progressFill = document.getElementById('progressFill')

const isMobile = window.matchMedia(`(max-width: ${FRAME_CONFIG.mobileBreakpoint}px)`).matches
const frameUrls = buildFrameUrls(isMobile)

/* -------------------------------------------------------------------------
   Frame-sequence canvas
   ------------------------------------------------------------------------- */
const images = new Array(frameUrls.length)
const frameState = { index: 0 }
let lastDrawn = -1
let naturalW = 0
let naturalH = 0

function setCanvasSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  lastDrawn = -1
  drawFrame(frameState.index)
}

function isLoaded(img) {
  return !!img && img.complete && img.naturalWidth > 0
}

// While the background fill is still streaming, fall back to the closest
// frame that has arrived so the scrub never shows a blank canvas.
function nearestLoadedIndex(want) {
  if (isLoaded(images[want])) return want
  for (let d = 1; d < images.length; d++) {
    const lo = want - d
    const hi = want + d
    if (lo >= 0 && isLoaded(images[lo])) return lo
    if (hi < images.length && isLoaded(images[hi])) return hi
  }
  return -1
}

function drawFrame(index) {
  const want = Math.max(0, Math.min(images.length - 1, Math.round(index)))
  const i = nearestLoadedIndex(want)
  if (i < 0 || i === lastDrawn) return
  const img = images[i]
  lastDrawn = i

  const cw = window.innerWidth
  const ch = window.innerHeight
  const iw = naturalW || img.naturalWidth
  const ih = naturalH || img.naturalHeight

  const scale = Math.max(cw / iw, ch / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, (cw - dw) * 0.5, (ch - dh) * 0.5, dw, dh)
}

function loadImage(url, index) {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (!naturalW) { naturalW = img.naturalWidth; naturalH = img.naturalHeight }
      images[index] = img
      resolve(img)
    }
    img.onerror = () => { images[index] = img; resolve(img) }
    img.src = url
  })
}

async function preloadFrames(indices, concurrency, onProgress) {
  let loaded = 0
  const total = indices.length
  let cursor = 0
  async function worker() {
    while (cursor < total) {
      const i = indices[cursor++]
      await loadImage(frameUrls[i], i)
      loaded++
      if (onProgress) onProgress(loaded / total)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker))
}

// The reveal only waits for a sparse keyframe set (~1/8 of the sequence);
// the rest streams in behind the page. Nearest-frame fallback in drawFrame
// covers the gaps until the fill finishes.
const KEYFRAME_STRIDE = 8

function splitFrameIndices() {
  const key = []
  const rest = []
  for (let i = 0; i < frameUrls.length; i++) {
    if (i % KEYFRAME_STRIDE === 0 || i === frameUrls.length - 1) key.push(i)
    else rest.push(i)
  }
  return { key, rest }
}

/* -------------------------------------------------------------------------
   Boot: brand video loader -> upward wipe -> hero intro
   ------------------------------------------------------------------------- */
const loaderVideo = document.getElementById('loaderVideo')
const heroChars = []

// Keep the intro video on screen at least this long so it registers,
// even when everything is already cached. (The video itself is ~2.6s and
// freezes on its final frame if the network is slower than that.)
const LOADER_MIN_MS = 2600

// Never hold the reveal hostage waiting for the video (autoplay blocked,
// stalled download, etc.) — past this point we wipe regardless.
const LOADER_MAX_MS = 4000

// Returning visitors (e.g. navigating back from a gallery page) have the
// frames cached and have already seen the brand moment — skip the video
// and minimum display time so the loader just flashes through.
const RETURNING = (() => {
  try { return sessionStorage.getItem('tyc-visited') === '1' } catch { return false }
})()
try { sessionStorage.setItem('tyc-visited', '1') } catch { /* private mode */ }

function prepareHeroText() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    heroChars.push(...splitChars(el))
  })
}

async function boot() {
  setCanvasSize()
  prepareHeroText()

  const bootStart = performance.now()

  // Autoplay is set in the markup; nudge it for browsers that ignore the
  // attribute. Muted + playsinline keeps iOS happy. Failure just leaves a
  // still frame — acceptable.
  if (RETURNING) {
    loader.classList.add('loader--skip')
    if (loaderVideo) { loaderVideo.pause(); loaderVideo.removeAttribute('src'); loaderVideo.load() }
  } else if (loaderVideo) {
    loaderVideo.play?.().catch(() => {})
  }

  if (!prefersReducedMotion && !RETURNING) {
    gsap.from('.loader__ui', { autoAlpha: 0, y: 16, duration: 0.9, ease: 'power3.out', delay: 0.2 })
  }

  // The bar tracks whichever is slower: the real download or the minimum
  // display time. Cached loads finish downloading instantly — without the
  // time component the bar would just sit at 100% for three seconds.
  const progress = { real: 0, shown: 0 }
  const renderProgress = () => {
    const timeP = prefersReducedMotion || RETURNING
      ? 1
      : Math.min((performance.now() - bootStart) / LOADER_MIN_MS, 1)
    const target = Math.min(progress.real, timeP)
    progress.shown += (target - progress.shown) * 0.14 // smooth approach
    if (target === 1 && target - progress.shown < 0.002) progress.shown = 1
    const n = Math.round(progress.shown * 100)
    loaderPct.textContent = String(n).padStart(2, '0')
    loaderFill.style.width = progress.shown * 100 + '%'
  }
  gsap.ticker.add(renderProgress)

  const { key, rest } = splitFrameIndices()
  await preloadFrames(key, 12, (p) => { progress.real = p })

  lastDrawn = -1
  drawFrame(0)

  // Fill the in-between frames behind the page, front to back. Each arrival
  // redraws only if it improves the frame currently on screen.
  preloadFrames(rest, 6, () => drawFrame(frameState.index))

  // Give the brand video its moment (skipped for reduced motion / returns):
  // wait for it to finish playing, but never past LOADER_MAX_MS total.
  if (!prefersReducedMotion && !RETURNING) {
    const elapsed = performance.now() - bootStart
    if (elapsed < LOADER_MIN_MS) {
      await new Promise((r) => setTimeout(r, LOADER_MIN_MS - elapsed))
    }
    if (loaderVideo && !loaderVideo.ended && !loaderVideo.paused) {
      await new Promise((resolve) => {
        const budget = LOADER_MAX_MS - (performance.now() - bootStart)
        if (budget <= 0) return resolve()
        const timer = setTimeout(resolve, budget)
        loaderVideo.addEventListener(
          'ended',
          () => { clearTimeout(timer); resolve() },
          { once: true }
        )
      })
    }
  }

  gsap.ticker.remove(renderProgress)
  loaderPct.textContent = '100'
  loaderFill.style.width = '100%'

  initScroll()
  initEffects()

  // --- Reveal choreography -------------------------------------------------
  if (prefersReducedMotion) {
    loader.classList.add('is-hidden')
    gsap.set(loader, { autoAlpha: 0, display: 'none' })
    gsap.set(heroChars, { y: 0, rotateX: 0 })
    if (loaderVideo) loaderVideo.pause()
    loader.setAttribute('aria-busy', 'false')
    return
  }

  if (RETURNING) {
    // Quick dissolve instead of the full cinematic curtain
    loader.setAttribute('aria-busy', 'false')
    gsap.timeline()
      .to(loader, { autoAlpha: 0, duration: 0.45, ease: 'power2.inOut' })
      .add(() => {
        loader.classList.add('is-hidden')
        gsap.set(loader, { display: 'none' })
      })
      .to(heroChars, {
        y: 0,
        rotateX: 0,
        duration: 0.9,
        ease: 'power4.out',
        stagger: { each: 0.015, from: 'start' },
      }, '-=0.2')
      .to('.hero__eyebrow, .hero__foot [data-reveal]', {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
      }, '-=0.5')
    return
  }

  const tl = gsap.timeline({ defaults: { ease: 'power4.inOut' } })

  tl.to('.loader__ui', { autoAlpha: 0, y: -12, duration: 0.45, ease: 'power2.in', overwrite: 'auto' })
    // the whole loader wipes upward while the video gently scales — cinema cut
    .to('.loader__video', { scale: 1.07, duration: 1.15, ease: 'power2.inOut' }, '<')
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.15 }, '-=0.95')
    .add(() => {
      loader.classList.add('is-hidden')
      gsap.set(loader, { display: 'none' })
      if (loaderVideo) { loaderVideo.pause(); loaderVideo.removeAttribute('src'); loaderVideo.load() }
      loader.setAttribute('aria-busy', 'false')
    })
    // hero title chars flip up out of their line masks
    .to(heroChars, {
      y: 0,
      rotateX: 0,
      duration: 1.1,
      ease: 'power4.out',
      stagger: { each: 0.024, from: 'start' },
    }, '-=0.5')
    .to('.hero__eyebrow, .hero__foot [data-reveal]', {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.1,
    }, '-=0.6')
}

/* -------------------------------------------------------------------------
   Lenis + ScrollTrigger core
   ------------------------------------------------------------------------- */
let lenis = null
let particles = null

function initScroll() {
  if (!prefersReducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
    })
    lenis.on('scroll', (e) => {
      ScrollTrigger.update()
      if (particles) particles.setVelocity(e.velocity)
    })
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)

    // Anchor links ride the smooth scroller
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'))
        if (!target) return
        e.preventDefault()
        lenis.scrollTo(target, { offset: 0, duration: 1.6 })
      })
    })
  }

  // --- Frame scrub across the whole document ------------------------------
  gsap.to(frameState, {
    index: images.length - 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: prefersReducedMotion ? true : 0.35,
    },
    onUpdate: () => drawFrame(frameState.index),
  })
  ScrollTrigger.addEventListener('refresh', () => drawFrame(frameState.index))

  // --- Scroll progress bar -------------------------------------------------
  gsap.to(progressFill, {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.2,
    },
  })

  // --- Generic reveals -------------------------------------------------------
  document.querySelectorAll('.panel').forEach((panel) => {
    const items = panel.querySelectorAll('[data-reveal]')
    if (!items.length) return
    if (prefersReducedMotion) {
      gsap.set(items, { opacity: 1, y: 0 })
      return
    }
    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: 'power3.out',
      stagger: 0.09,
      scrollTrigger: { trigger: panel, start: 'top 72%', toggleActions: 'play none none reverse' },
    })
  })

  // --- Scroll hint -----------------------------------------------------------
  ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'top top',
    end: '+=200',
    onLeave: () => scrollHint.classList.add('is-gone'),
    onEnterBack: () => scrollHint.classList.remove('is-gone'),
  })

  initMarquees()
  initManifesto()
  initServices()
  initGallery()
  initStats()

  ScrollTrigger.refresh()
}

/* -------------------------------------------------------------------------
   Marquees: seamless loop + scroll-velocity skew & speed
   ------------------------------------------------------------------------- */
function initMarquees() {
  document.querySelectorAll('[data-marquee]').forEach((marquee) => {
    const track = marquee.querySelector('[data-marquee-track]')

    // Duplicate content until we can loop a full track width seamlessly
    const original = track.innerHTML
    track.innerHTML = original + original + original
    const loopWidth = track.scrollWidth / 3

    if (prefersReducedMotion) return

    const proxy = { x: 0 }
    const speed = marquee.classList.contains('marquee--ghost') ? 55 : 80 // px/s

    gsap.ticker.add((_, dt) => {
      const boost = lenis ? Math.min(Math.abs(lenis.velocity) * 0.06, 6) : 0
      proxy.x -= (speed * (1 + boost) * dt) / 1000
      if (proxy.x <= -loopWidth) proxy.x += loopWidth
      gsap.set(track, { x: proxy.x })
    })

    // Skew with velocity for that molten feel
    gsap.ticker.add(() => {
      const v = lenis ? gsap.utils.clamp(-8, 8, lenis.velocity * 0.12) : 0
      gsap.set(track, { skewX: -v })
    })
  })
}

/* -------------------------------------------------------------------------
   Manifesto: word-by-word color scrub with inline images scaling in
   ------------------------------------------------------------------------- */
function initManifesto() {
  const el = document.querySelector('[data-manifesto]')
  if (!el) return
  const words = splitWords(el)
  const imgs = el.querySelectorAll('.manifesto__img')

  if (prefersReducedMotion) {
    gsap.set(words, { color: 'var(--ink)' })
    return
  }

  gsap.set(imgs, { scale: 0, transformOrigin: '50% 50%' })

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: el,
      start: 'top 78%',
      end: 'bottom 42%',
      scrub: 0.6,
    },
  })

  // Interleave: reveal every child of the paragraph in document order
  const inline = el.querySelectorAll('.word, .manifesto__img')
  inline.forEach((node, i) => {
    const at = i * 0.05
    if (node.classList.contains('word')) {
      tl.to(node, { color: '#ece7dd', duration: 0.35, ease: 'none' }, at)
    } else {
      tl.to(node, { scale: 1, duration: 0.5, ease: 'back.out(1.6)' }, at)
    }
  })
}

/* -------------------------------------------------------------------------
   Services: staggered entrance + preview image chasing the cursor
   ------------------------------------------------------------------------- */
function initServices() {
  const items = document.querySelectorAll('[data-service]')
  if (!prefersReducedMotion && items.length) {
    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.1,
      scrollTrigger: { trigger: '[data-services]', start: 'top 78%', toggleActions: 'play none none reverse' },
    })
  } else {
    gsap.set(items, { opacity: 1, y: 0 })
  }

  // Preview follower (fine pointers only)
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const preview = document.getElementById('servicePreview')
  const previewImg = document.getElementById('servicePreviewImg')
  const list = document.querySelector('[data-services]')
  if (!preview || !list) return

  const pos = { x: 0, y: 0 }
  const eased = { x: 0, y: 0 }
  let active = false

  gsap.ticker.add(() => {
    eased.x += (pos.x - eased.x) * 0.12
    eased.y += (pos.y - eased.y) * 0.12
    if (active) gsap.set(preview, { x: eased.x + 32, y: eased.y - 120 })
  })

  list.addEventListener('pointermove', (e) => {
    pos.x = e.clientX
    pos.y = e.clientY
  })
  list.addEventListener('pointerenter', (e) => {
    pos.x = eased.x = e.clientX
    pos.y = eased.y = e.clientY
    active = true
    gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'power3.out' })
  })
  list.addEventListener('pointerleave', () => {
    active = false
    gsap.to(preview, { autoAlpha: 0, scale: 0.85, duration: 0.35, ease: 'power3.in' })
  })
  items.forEach((item) => {
    item.addEventListener('pointerenter', () => {
      const src = item.dataset.preview
      if (src && previewImg.getAttribute('src') !== src) {
        gsap.fromTo(previewImg, { scale: 1.18 }, { scale: 1, duration: 0.6, ease: 'power3.out' })
        previewImg.src = src
      }
    })
  })
}

/* -------------------------------------------------------------------------
   RW60 horizontal gallery: pin + scrub + per-image parallax
   ------------------------------------------------------------------------- */
function initGallery() {
  const pin = document.querySelector('[data-hpin]')
  const track = document.querySelector('[data-htrack]')
  if (!pin || !track) return

  // Touch devices (phones/tablets) get a native swipeable strip instead of
  // the scroll-pinned scrub; same for reduced motion.
  const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  if (prefersReducedMotion || coarse) {
    pin.classList.add('hpin--swipe')
    return
  }

  const distance = () => track.scrollWidth - window.innerWidth

  const scrub = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin.parentElement,
      start: 'top top',
      end: () => '+=' + distance(),
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  })

  // Parallax inside each media frame while the track slides
  document.querySelectorAll('[data-slide-img]').forEach((img) => {
    gsap.fromTo(
      img,
      { xPercent: -6 },
      {
        xPercent: 6,
        ease: 'none',
        scrollTrigger: {
          trigger: img.closest('[data-slide]'),
          containerAnimation: scrub,
          start: 'left right',
          end: 'right left',
          scrub: true,
        },
      }
    )
  })

  // The giant outlined RW60 heading drifts slower (depth)
  gsap.to('.hpin__head', {
    x: () => -distance() * 0.12,
    ease: 'none',
    scrollTrigger: {
      trigger: pin.parentElement,
      start: 'top top',
      end: () => '+=' + distance(),
      scrub: 0.5,
    },
  })

  // Dim the cinematic background + particles while the gallery owns the screen
  ScrollTrigger.create({
    trigger: pin.parentElement,
    start: 'top 60%',
    end: 'bottom 40%',
    onEnter: () => dimStage(0.25),
    onLeave: () => dimStage(1),
    onEnterBack: () => dimStage(0.25),
    onLeaveBack: () => dimStage(1),
  })
}

function dimStage(target) {
  gsap.to('#scene', { opacity: target, duration: 0.8, ease: 'power2.out' })
  if (particles) particles.setOpacity(target === 1 ? 1 : 0.4)
}

/* -------------------------------------------------------------------------
   Stats counters
   ------------------------------------------------------------------------- */
function initStats() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseInt(el.dataset.count, 10)
    if (prefersReducedMotion) {
      el.textContent = end
      return
    }
    const state = { v: 0 }
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () =>
        gsap.to(state, {
          v: end,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => { el.textContent = Math.round(state.v) },
        }),
    })
  })
}

/* -------------------------------------------------------------------------
   Pointer-driven effects: particles, hero depth, tilt cards, cursor
   ------------------------------------------------------------------------- */
function initEffects() {
  initCursor()

  if (prefersReducedMotion) return

  // Three.js dust field — loaded lazily so three.js stays out of the
  // critical bundle; every consumer already guards on `if (particles)`.
  const particlesCanvas = document.getElementById('particles')
  import('./particles.js')
    .then(({ createParticles }) => {
      particles = createParticles(particlesCanvas)
    })
    .catch((err) => {
      console.warn('WebGL unavailable — particles disabled', err)
      particlesCanvas.remove()
    })

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches

  if (fine) {
    // Normalized mouse -> particles parallax + hero title 3D sway
    const heroTitle = document.querySelector('[data-depth]')
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      if (particles) particles.setMouse(nx, ny)
      if (heroTitle) {
        gsap.to(heroTitle, {
          rotationY: nx * 3.5,
          rotationX: -ny * 2.5,
          duration: 1.1,
          ease: 'power2.out',
        })
      }
    })

    // Tilt cards
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        gsap.to(card, {
          rotationY: px * 10,
          rotationX: -py * 8,
          transformPerspective: 700,
          duration: 0.5,
          ease: 'power2.out',
        })
      })
      card.addEventListener('pointerleave', () => {
        gsap.to(card, { rotationY: 0, rotationX: 0, duration: 0.9, ease: 'elastic.out(1, 0.5)' })
      })
    })
  }
}

/* -------------------------------------------------------------------------
   Resize
   ------------------------------------------------------------------------- */
let resizeTimer = null
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    setCanvasSize()
    if (particles) particles.resize()
    ScrollTrigger.refresh()
  }, 150)
})

// Footer year
const yearEl = document.getElementById('year')
if (yearEl) yearEl.textContent = new Date().getFullYear()

/* -------------------------------------------------------------------------
   Mobile menu (hamburger drawer)
   ------------------------------------------------------------------------- */
const chromeEl = document.getElementById('chrome')
const burgerEl = document.getElementById('chromeBurger')
if (chromeEl && burgerEl) {
  const setMenu = (open) => {
    chromeEl.classList.toggle('is-open', open)
    burgerEl.setAttribute('aria-expanded', String(open))
    if (lenis) { if (open) lenis.stop(); else lenis.start() }
  }
  burgerEl.addEventListener('click', () =>
    setMenu(!chromeEl.classList.contains('is-open'))
  )
  chromeEl.querySelectorAll('.chrome__menu a').forEach((a) =>
    a.addEventListener('click', () => setMenu(false))
  )
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chromeEl.classList.contains('is-open')) setMenu(false)
  })
}

/* -------------------------------------------------------------------------
   Lightbox: RW60 gallery images fullscreen
   ------------------------------------------------------------------------- */
const lightboxEl = document.getElementById('lightbox')
if (lightboxEl) {
  const lightboxImg = document.getElementById('lightboxImg')
  const lightboxCap = document.getElementById('lightboxCap')
  const lbSlides = [...document.querySelectorAll('[data-slide]')].filter((s) =>
    s.querySelector('[data-slide-img]')
  )
  let lbIndex = 0
  let lbOpen = false

  const showSlide = (i) => {
    lbIndex = (i + lbSlides.length) % lbSlides.length
    const slide = lbSlides[lbIndex]
    const img = slide.querySelector('[data-slide-img]')
    const title = slide.querySelector('.slide__title')?.textContent.trim() || ''
    lightboxImg.src = img.currentSrc || img.src
    lightboxImg.alt = img.alt
    lightboxCap.textContent = `${title} · ${lbIndex + 1} / ${lbSlides.length}`
    if (!prefersReducedMotion) {
      gsap.fromTo(
        '.lightbox__figure',
        { opacity: 0, scale: 0.96 },
        { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' }
      )
    }
  }

  const openLightbox = (slide) => {
    lbOpen = true
    showSlide(lbSlides.indexOf(slide))
    lightboxEl.setAttribute('aria-hidden', 'false')
    gsap.to(lightboxEl, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
    if (lenis) lenis.stop()
  }

  const closeLightbox = () => {
    lbOpen = false
    lightboxEl.setAttribute('aria-hidden', 'true')
    gsap.to(lightboxEl, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
    if (lenis) lenis.start()
  }

  lbSlides.forEach((slide) => {
    slide
      .querySelector('.slide__media')
      .addEventListener('click', () => openLightbox(slide))
  })
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox)
  document.getElementById('lightboxPrev').addEventListener('click', () => showSlide(lbIndex - 1))
  document.getElementById('lightboxNext').addEventListener('click', () => showSlide(lbIndex + 1))
  lightboxEl.addEventListener('click', (e) => { if (e.target === lightboxEl) closeLightbox() })
  window.addEventListener('keydown', (e) => {
    if (!lbOpen) return
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') showSlide(lbIndex - 1)
    if (e.key === 'ArrowRight') showSlide(lbIndex + 1)
  })

  initLightboxZoom()
}

boot()

initAnalytics()
