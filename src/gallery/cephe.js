/* =========================================================================
   Cephe Doğramaları — "Cinematic Editorial"
   Video hero with split-char title, sticky chapters, clip-path image
   reveals + inner parallax, velocity marquee divider and a lightbox.
   ========================================================================= */

import './cephe.css'
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
const BASE = '/media/Cephe Dogramalari'
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/')
const HERO_VIDEO = `${BASE}/Kapaklı Cephe Yüksek kat kaplama/r50 cephe kesit.mp4`

const CHAPTERS = {
  villa: {
    label: 'Müstakil Villa',
    dir: 'Kapaklı Cephe Müstakil Villa',
    files: [
      'image_1783864445995_de7ad059.webp',
      'image_1783865036921_d14b75e2.webp',
      'image_1783866018715_5fba33d0.webp',
      'image_1783866198482_4230309c.webp',
      'image_1783866325747_9579a40a.webp',
      'image_1783866330730_14f688e0.webp',
      'image_1783866331223_9c5275f8.webp',
      'image_1783866331352_74a42248.webp',
      'image_1783866483595_a7bd8be6.webp',
      'image_1783866583906_f47ca06c.webp',
      'image_1783866799544_683e11dc.webp',
      'image_1783866885615_c374eb46.webp',
      'image_1783866889802_f18490a4.webp',
      'image_1783866892354_f13939c3.webp',
      'image_1783866897347_b13bf5e3.webp',
      'image_1783867120742_22c9e4ee.webp',
    ],
  },
  tower: {
    label: 'Yüksek Kat',
    dir: 'Kapaklı Cephe Yüksek kat kaplama',
    files: [
      'R50 kapaklı cephe - karşıdan.webp',
      'image_1783864583174_78722c0b.webp',
      'image_1783864584804_d7e30ec4.webp',
      'r50 bronze cam siyah background.webp',
      'Kapaklı Cephe Kesit - Mavi renk.webp',
      'Kapaklı cephe kesit - mavi renk 2.webp',
      'image_1783864844367_68bab6a9.webp',
    ],
  },
}

const url = (dir, file) => encPath(`${BASE}/${dir}/${file}`)

/* Human caption from a filename; generic uploads fall back to a number. */
function caption(file, label, i) {
  const name = file.replace(/\.[a-z0-9]+$/i, '')
  if (/^image_\d+/i.test(name) || /^[0-9a-f-]{20,}$/i.test(name)) {
    return `${label} — ${String(i + 1).padStart(2, '0')}`
  }
  return name
}

/* Editorial rhythm: wide, half, half, tall, tall, wide … */
const RHYTHM = ['wide', '', '', 'tall', 'tall', '', '']

/* -------------------------------------------------------------------------
   Build the grids
   ------------------------------------------------------------------------- */
const flat = [] // for the lightbox: { src, cap }

document.querySelectorAll('[data-chapter]').forEach((section) => {
  const chapter = CHAPTERS[section.dataset.chapter]
  const grid = section.querySelector('[data-chapter-grid]')
  const count = section.querySelector('[data-chapter-count]')
  if (!chapter || !grid) return

  count.textContent = `${chapter.files.length} görsel`

  chapter.files.forEach((file, i) => {
    const src = url(chapter.dir, file)
    const cap = caption(file, chapter.label, i)
    const kind = RHYTHM[i % RHYTHM.length]
    const globalIndex = flat.push({ src, cap }) - 1

    const fig = document.createElement('figure')
    fig.className = `shot${kind ? ` shot--${kind}` : ''}`
    fig.tabIndex = 0
    fig.dataset.index = globalIndex
    fig.innerHTML = `
      <img class="shot__img" src="${src}" alt="${cap}" loading="lazy" decoding="async" />
      <span class="shot__veil"></span>
      <figcaption class="shot__cap">
        <span>${cap}</span>
        <span class="shot__cap-no">${String(i + 1).padStart(2, '0')}</span>
      </figcaption>`
    grid.appendChild(fig)
  })
})

/* -------------------------------------------------------------------------
   Smooth scroll + scroll choreography
   ------------------------------------------------------------------------- */
let lenis = null

if (!prefersReducedMotion) {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
  })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

// Progress bar
gsap.to('#progressFill', {
  scaleX: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: document.documentElement,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.2,
  },
})

// Hero video + intro
const heroVideo = document.getElementById('heroVideo')
heroVideo.src = encPath(HERO_VIDEO)
heroVideo.play?.().catch(() => {})

const heroChars = []
document.querySelectorAll('[data-split]').forEach((el) => heroChars.push(...splitChars(el)))

if (!prefersReducedMotion) {
  const tl = gsap.timeline({ delay: 0.15 })
  tl.to(heroChars, {
    y: 0,
    rotateX: 0,
    duration: 1.15,
    ease: 'power4.out',
    stagger: { each: 0.03 },
  })
    .to('[data-hero-fade]', {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.12,
    }, '-=0.65')

  // Hero video drifts + scrim deepens as you leave
  gsap.to('.hero__video', {
    yPercent: 16,
    scale: 1.12,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  })
  gsap.to('.hero__inner', {
    yPercent: -18,
    opacity: 0.2,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true },
  })
} else {
  gsap.set(heroChars, { y: 0, rotateX: 0 })
}

// Image reveals: clip-path wipe + inner zoom-out + slow parallax.
// On compact screens the shots are full-width and tall, so a mid-viewport
// trigger feels late — reveal as soon as the shot enters instead.
const isCompact = window.matchMedia('(max-width: 900px)').matches
const revealStart = isCompact ? 'top bottom' : 'top 86%'

document.querySelectorAll('.shot').forEach((shot) => {
  const img = shot.querySelector('.shot__img')

  if (prefersReducedMotion) return

  gsap.to(shot, {
    clipPath: 'inset(0% 0 0% 0)',
    duration: isCompact ? 0.9 : 1.2,
    ease: 'power4.inOut',
    scrollTrigger: { trigger: shot, start: revealStart, toggleActions: 'play none none none' },
  })
  gsap.to(img, {
    scale: 1,
    duration: isCompact ? 1.2 : 1.6,
    ease: 'power3.out',
    scrollTrigger: { trigger: shot, start: revealStart, toggleActions: 'play none none none' },
  })
  gsap.fromTo(
    img,
    { yPercent: -8 },
    {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: { trigger: shot, start: 'top bottom', end: 'bottom top', scrub: true },
    }
  )
})

// Chapter side text reveal
document.querySelectorAll('.chapter__sticky').forEach((side) => {
  if (prefersReducedMotion) return
  gsap.from(side.children, {
    opacity: 0,
    y: 30,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.1,
    scrollTrigger: { trigger: side.closest('.chapter'), start: 'top 75%' },
  })
})

// Outro reveals
gsap.to('.outro [data-reveal]', {
  opacity: 1,
  y: 0,
  duration: 1.1,
  ease: 'power3.out',
  stagger: 0.1,
  scrollTrigger: { trigger: '.outro', start: 'top 75%' },
})

// Marquee divider: velocity-aware drift
const stripTrack = document.querySelector('[data-strip-track]')
if (stripTrack) {
  const original = stripTrack.innerHTML
  stripTrack.innerHTML = original + original + original
  const loopWidth = () => stripTrack.scrollWidth / 3

  if (!prefersReducedMotion) {
    const proxy = { x: 0 }
    gsap.ticker.add((_, dt) => {
      const boost = lenis ? Math.min(Math.abs(lenis.velocity) * 0.06, 6) : 0
      proxy.x -= (70 * (1 + boost) * dt) / 1000
      if (proxy.x <= -loopWidth()) proxy.x += loopWidth()
      gsap.set(stripTrack, { x: proxy.x })
    })
  }
}

/* -------------------------------------------------------------------------
   Lightbox
   ------------------------------------------------------------------------- */
const lightbox = document.getElementById('lightbox')
const lightboxImg = document.getElementById('lightboxImg')
const lightboxCap = document.getElementById('lightboxCap')
let current = 0
let open = false

function show(i) {
  current = (i + flat.length) % flat.length
  lightboxImg.src = flat[current].src
  lightboxImg.alt = flat[current].cap
  lightboxCap.textContent = `${flat[current].cap} · ${current + 1} / ${flat.length}`
  if (!prefersReducedMotion) {
    gsap.fromTo('.lightbox__figure', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' })
  }
}

function openLightbox(i) {
  open = true
  show(i)
  lightbox.setAttribute('aria-hidden', 'false')
  gsap.to(lightbox, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
  if (lenis) lenis.stop()
}

function closeLightbox() {
  open = false
  lightbox.setAttribute('aria-hidden', 'true')
  gsap.to(lightbox, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
  if (lenis) lenis.start()
}

document.querySelectorAll('.shot').forEach((shot) => {
  const activate = () => openLightbox(parseInt(shot.dataset.index, 10))
  shot.addEventListener('click', activate)
  shot.addEventListener('keydown', (e) => { if (e.key === 'Enter') activate() })
})

document.getElementById('lightboxClose').addEventListener('click', closeLightbox)
document.getElementById('lightboxPrev').addEventListener('click', () => show(current - 1))
document.getElementById('lightboxNext').addEventListener('click', () => show(current + 1))
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox() })

window.addEventListener('keydown', (e) => {
  if (!open) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') show(current - 1)
  if (e.key === 'ArrowRight') show(current + 1)
})

/* -------------------------------------------------------------------------
   Pinch / double-tap zoom for the lightbox image
   ------------------------------------------------------------------------- */
initLightboxZoom()
