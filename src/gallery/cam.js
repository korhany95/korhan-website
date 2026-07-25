/* =========================================================================
   Cam Türleri — "Prism"
   The "Cam variyantları" video is scrubbed frame-by-frame with scroll
   (progress ring tracks it), then a draggable fan comparison morphs
   between kapalı and açık yelpaze, and the catalog plate zooms in.
   ========================================================================= */

import './cam.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { splitChars } from '../split.js'
import { initCursor } from '../cursor.js'
import { initLightboxZoom } from '../lightbox-zoom.js'

gsap.registerPlugin(ScrollTrigger)
initCursor()

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (prefersReducedMotion) document.documentElement.classList.add('reduce-motion')

// Mark the session so the home page skips its intro loader on return
try { sessionStorage.setItem('tyc-visited', '1') } catch { /* private mode */ }

/* -------------------------------------------------------------------------
   Content
   ------------------------------------------------------------------------- */
const BASE = '/media/Cam türleri'
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/')
const FAN_CLOSED = `${BASE}/Yelpazae Kapalı.webp`
const FAN_OPEN = `${BASE}/Açık yelpaze.webp`
const TYPES = `${BASE}/Türler.webp`

// The scrub video pre-extracted into a WebP frame sequence
// (see /public/frames-cam) — canvas scrubbing is butter-smooth where
// seeking a compressed mp4 stutters between keyframes.
const FRAME_COUNT = 242
const FRAME_DIR = window.matchMedia('(max-width: 768px)').matches
  ? '/frames-cam/mobile'
  : '/frames-cam/desktop'
const frameUrl = (i) => `${FRAME_DIR}/frame_${String(i + 1).padStart(4, '0')}.webp`

document.getElementById('fanClosed').src = encPath(FAN_CLOSED)
document.getElementById('fanOpen').src = encPath(FAN_OPEN)
document.getElementById('typesImg').src = encPath(TYPES)

/* -------------------------------------------------------------------------
   Smooth scroll
   ------------------------------------------------------------------------- */
let lenis = null
if (!prefersReducedMotion) {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
  })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

/* -------------------------------------------------------------------------
   Intro text
   ------------------------------------------------------------------------- */
const heroChars = []
document.querySelectorAll('[data-split]').forEach((el) => heroChars.push(...splitChars(el)))

if (!prefersReducedMotion) {
  gsap.timeline({ delay: 0.15 })
    .to(heroChars, { y: 0, duration: 1.1, ease: 'power4.out', stagger: 0.03 })
    .to('[data-fade]', {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.12,
    }, '-=0.6')
} else {
  gsap.set(heroChars, { y: 0 })
}

/* -------------------------------------------------------------------------
   Scroll-scrubbed frame sequence (same technique as the home page hero)
   ------------------------------------------------------------------------- */
const canvas = document.getElementById('scrubCanvas')
const ctx = canvas.getContext('2d', { alpha: false })

const ring = document.getElementById('scrubRing')
const pct = document.getElementById('scrubPct')
const RING_LEN = 119.4

const frames = new Array(FRAME_COUNT)
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

/* Nearest loaded frame at or below `i` (falls forward if nothing behind),
   so scrubbing stays visually continuous while frames stream in. */
function nearestLoaded(i) {
  for (let k = i; k >= 0; k--) if (frames[k]?.complete && frames[k].naturalWidth) return k
  for (let k = i + 1; k < FRAME_COUNT; k++) if (frames[k]?.complete && frames[k].naturalWidth) return k
  return -1
}

function drawFrame(index) {
  const wanted = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(index)))
  const i = nearestLoaded(wanted)
  if (i < 0 || i === lastDrawn) return
  lastDrawn = i
  const img = frames[i]

  const cw = window.innerWidth
  const ch = window.innerHeight
  const iw = naturalW || img.naturalWidth
  const ih = naturalH || img.naturalHeight
  const scale = Math.max(cw / iw, ch / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, (cw - dw) * 0.5, (ch - dh) * 0.5, dw, dh)
}

function loadFrame(i) {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (!naturalW) { naturalW = img.naturalWidth; naturalH = img.naturalHeight }
      frames[i] = img
      resolve()
    }
    img.onerror = resolve
    img.src = frameUrl(i)
    frames[i] = img
  })
}

async function preloadFrames() {
  // First frame immediately so the stage never sits black
  await loadFrame(0)
  lastDrawn = -1
  drawFrame(frameState.index)

  const CONCURRENCY = 10
  let cursor = 1
  async function worker() {
    while (cursor < FRAME_COUNT) {
      const i = cursor++
      await loadFrame(i)
      // repaint if the streamed-in frame is closer to where we are
      lastDrawn = -1
      drawFrame(frameState.index)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

setCanvasSize()
preloadFrames()

if (!prefersReducedMotion) {
  gsap.to(frameState, {
    index: FRAME_COUNT - 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '#scrub',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.35,
    },
    onUpdate: () => drawFrame(frameState.index),
  })

  ScrollTrigger.create({
    trigger: '#scrub',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      ring.style.strokeDashoffset = String(RING_LEN * (1 - self.progress))
      pct.textContent = `${Math.round(self.progress * 100)}%`
      // UI fades once the journey starts
      gsap.to('.scrub__ui', {
        opacity: self.progress > 0.06 ? 0 : 1,
        y: self.progress > 0.06 ? -24 : 0,
        duration: 0.5,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    },
  })
}

/* -------------------------------------------------------------------------
   Fan comparison: drag the handle to open the yelpaze
   ------------------------------------------------------------------------- */
const stage = document.getElementById('fanStage')
const openImg = document.getElementById('fanOpen')
const handle = document.getElementById('fanHandle')
let fanPos = 18 // percent

function setFan(p) {
  fanPos = Math.max(0, Math.min(100, p))
  openImg.style.clipPath = `inset(0 0 0 ${fanPos}%)`
  handle.style.left = `${fanPos}%`
  handle.setAttribute('aria-valuenow', String(Math.round(fanPos)))
}

// (drag logic — pointer events on the whole stage for a generous hit area)
let dragging = false

function posFromEvent(e) {
  const r = stage.getBoundingClientRect()
  return ((e.clientX - r.left) / r.width) * 100
}

stage.addEventListener('pointerdown', (e) => {
  dragging = true
  stage.setPointerCapture(e.pointerId)
  setFan(posFromEvent(e))
})
stage.addEventListener('pointermove', (e) => {
  if (dragging) setFan(posFromEvent(e))
})
stage.addEventListener('pointerup', () => { dragging = false })
stage.addEventListener('pointercancel', () => { dragging = false })

handle.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') setFan(fanPos - 4)
  if (e.key === 'ArrowRight') setFan(fanPos + 4)
})

// Auto-tease the fan open when it scrolls into view
if (!prefersReducedMotion) {
  ScrollTrigger.create({
    trigger: stage,
    start: 'top 70%',
    once: true,
    onEnter: () => {
      const proxy = { v: 18 }
      gsap.to(proxy, {
        v: 62,
        duration: 1.6,
        ease: 'power3.inOut',
        onUpdate: () => { if (!dragging) setFan(proxy.v) },
      })
    },
  })
}

setFan(18)

/* -------------------------------------------------------------------------
   Reveals + plate zoom
   ------------------------------------------------------------------------- */
if (!prefersReducedMotion) {
  document.querySelectorAll('.fan, .types, .outro').forEach((section) => {
    const items = section.querySelectorAll('[data-reveal]')
    if (!items.length) return
    gsap.to(items, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.1,
      scrollTrigger: { trigger: section, start: 'top 74%' },
    })
  })

  gsap.set('.outro__title, .outro__actions', { opacity: 0, y: 26 })
  gsap.to('.outro__title, .outro__actions', {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.outro', start: 'top 80%' },
  })

  gsap.fromTo(
    '#typesImg',
    { scale: 1.12 },
    {
      scale: 1,
      ease: 'none',
      scrollTrigger: { trigger: '#typesPlate', start: 'top bottom', end: 'center center', scrub: true },
    }
  )
}

/* -------------------------------------------------------------------------
   Lightbox (types plate + fan images)
   ------------------------------------------------------------------------- */
const lightbox = document.getElementById('lightbox')
const lightboxImg = document.getElementById('lightboxImg')
const lightboxCap = document.getElementById('lightboxCap')

function openLightbox(src, cap) {
  lightboxImg.src = src
  lightboxImg.alt = cap
  lightboxCap.textContent = cap
  lightbox.setAttribute('aria-hidden', 'false')
  gsap.to(lightbox, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
  if (!prefersReducedMotion) {
    gsap.fromTo('.lightbox__figure', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' })
  }
  if (lenis) lenis.stop()
}

function closeLightbox() {
  lightbox.setAttribute('aria-hidden', 'true')
  gsap.to(lightbox, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
  if (lenis) lenis.start()
}

document.getElementById('typesPlate').addEventListener('click', () => {
  openLightbox(encPath(TYPES), 'Cam türleri — katalog')
})
document.getElementById('lightboxClose').addEventListener('click', closeLightbox)
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox() })
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox() })

/* -------------------------------------------------------------------------
   Resize
   ------------------------------------------------------------------------- */
let resizeTimer = null
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    setCanvasSize()
    ScrollTrigger.refresh()
  }, 150)
})

/* -------------------------------------------------------------------------
   Pinch / double-tap zoom for the lightbox image
   ------------------------------------------------------------------------- */
initLightboxZoom()
