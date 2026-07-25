/* =========================================================================
   Özel Renkler — "Finish Lab"
   Anodize configurator: choosing a finish crossfades the twin frames and
   re-tints the entire page (aurora, accents, watermark). Below, kutu
   profil kaplama with the Organik Morph video and catalog pages.
   ========================================================================= */

import './renkler.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { splitChars } from '../split.js'
import { initCursor } from '../cursor.js'
import { initLightboxZoom } from '../lightbox-zoom.js'
import { initAnalytics } from '../analytics.js'

gsap.registerPlugin(ScrollTrigger)
initCursor()

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (prefersReducedMotion) document.documentElement.classList.add('reduce-motion')

// Mark the session so the home page skips its intro loader on return
try { sessionStorage.setItem('tyc-visited', '1') } catch { /* private mode */ }

/* -------------------------------------------------------------------------
   Content
   ------------------------------------------------------------------------- */
const BASE = '/media/Ozel Renkler'
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/')
const u = (path) => encPath(`${BASE}/${path}`)

const HERO_VIDEO = u('özelrenkler.mp4')

const FINISHES = [
  {
    key: 'matt',
    name: 'Matt',
    tint: '#aab0b8',
    note: 'Yansımasız, sakin yüzey — parmak izi tutmaz.',
    a: u('Anodize boyalar/matt.webp'),
    b: u('Anodize boyalar/Matt (1).webp'),
  },
  {
    key: 'polished',
    name: 'Polished',
    tint: '#e4e7ec',
    note: 'Ayna parlaklığında eloksal — ışığı geri verir.',
    a: u('Anodize boyalar/Polished.webp'),
    b: u('Anodize boyalar/polished (1).webp'),
  },
  {
    key: 'brushed-matt',
    name: 'Brushed & Matt',
    tint: '#c9b48a',
    note: 'Fırça dokusu + mat bitiş — sıcak, dokunsal karakter.',
    a: u('Anodize boyalar/Brushed & matt.webp'),
    b: u('Anodize boyalar/Brushed & Matt (1).webp'),
  },
  {
    key: 'brushed-polished',
    name: 'Brushed & Polished',
    tint: '#d9cba6',
    note: 'Fırça izi ile parlaklık aynı yüzeyde buluşur.',
    a: u('Anodize boyalar/brushed and polished.webp'),
    b: u('Anodize boyalar/Brushed & Polished (1).webp'),
  },
  {
    key: 'sandblast',
    name: 'Sandblast',
    tint: '#9aa3ad',
    note: 'Kumlama dokusu — ipeksi, homojen, derin.',
    a: u('Anodize boyalar/Sandblast.webp'),
    b: u('Anodize boyalar/Sandblasted (1),.webp'),
  },
]

const KUTU_VIDEO = u('Kutu profil kaplama/Organik Morph.mp4')
const KUTU_PAGES = [
  { file: 'Kutu profil kaplama-kapak.webp', cap: 'Kaplama — kapak' },
  { file: '1nci sayfa.webp', cap: 'Katalog — sayfa 1' },
  { file: '2nci sayfa.webp', cap: 'Katalog — sayfa 2' },
  { file: '3ncü sayfa.webp', cap: 'Katalog — sayfa 3' },
].map((p) => ({ ...p, src: u(`Kutu profil kaplama/${p.file}`) }))

/* -------------------------------------------------------------------------
   Static media
   ------------------------------------------------------------------------- */
const heroVideo = document.getElementById('heroVideo')
heroVideo.src = HERO_VIDEO
heroVideo.play?.().catch(() => {})
const kutuVideo = document.getElementById('kutuVideo')
kutuVideo.src = KUTU_VIDEO
kutuVideo.play?.().catch(() => {})

/* -------------------------------------------------------------------------
   Build the lab rail + kutu pages
   ------------------------------------------------------------------------- */
const rail = document.getElementById('labRail')
FINISHES.forEach((f, i) => {
  const chip = document.createElement('button')
  chip.type = 'button'
  chip.className = `lab__chip${i === 0 ? ' is-active' : ''}`
  chip.setAttribute('role', 'tab')
  chip.setAttribute('aria-selected', i === 0 ? 'true' : 'false')
  chip.dataset.key = f.key
  chip.innerHTML = `<span class="lab__dot" style="background:${f.tint}"></span>${f.name}`
  chip.addEventListener('click', () => selectFinish(f.key))
  rail.appendChild(chip)
})

const kutuRow = document.getElementById('kutuRow')
KUTU_PAGES.forEach(({ src, cap }) => {
  const card = document.createElement('button')
  card.type = 'button'
  card.className = 'page-card'
  card.innerHTML = `<img src="${src}" alt="${cap}" loading="lazy" decoding="async" /><span>${cap}</span>`
  card.addEventListener('click', () => openLightbox(src, cap))
  kutuRow.appendChild(card)
})

/* -------------------------------------------------------------------------
   Finish selection: crossfade frames + retint the page
   ------------------------------------------------------------------------- */
const imgB = document.getElementById('imgB')
const watermark = document.getElementById('labWatermark')
const note = document.getElementById('labNote')
let activeKey = null

function applyFinish(f) {
  imgB.src = f.b
  imgB.alt = `${f.name} — anodize finiş, detay`
  watermark.textContent = f.name
  note.innerHTML = `<b>${f.name}</b> — ${f.note}`
  document.documentElement.style.setProperty('--tint', f.tint)
}

function selectFinish(key) {
  if (key === activeKey) return
  activeKey = key
  const f = FINISHES.find((x) => x.key === key)

  rail.querySelectorAll('.lab__chip').forEach((c) => {
    const on = c.dataset.key === key
    c.classList.toggle('is-active', on)
    c.setAttribute('aria-selected', on ? 'true' : 'false')
  })

  if (prefersReducedMotion) {
    applyFinish(f)
    return
  }

  gsap.to('[data-swap]', {
    opacity: 0,
    y: 10,
    duration: 0.28,
    ease: 'power2.in',
    stagger: 0.05,
    onComplete: () => {
      applyFinish(f)
      gsap.to('[data-swap]', {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.07,
      })
    },
  })
  gsap.fromTo(watermark, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out', delay: 0.25 })
}

applyFinish(FINISHES[0])
activeKey = FINISHES[0].key

/* -------------------------------------------------------------------------
   Smooth scroll + reveals
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

const heroChars = []
document.querySelectorAll('[data-split]').forEach((el) => heroChars.push(...splitChars(el)))

if (!prefersReducedMotion) {
  gsap.timeline({ delay: 0.1 })
    .to(heroChars, { y: 0, duration: 1.05, ease: 'power4.out', stagger: 0.03 })
    .to('[data-fade]', {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.12,
    }, '-=0.6')

  // Fullscreen hero video drifts + copy recedes as you leave (like cephe)
  gsap.to('.hero__video', {
    yPercent: 16,
    scale: 1.12,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  })
  gsap.to('.hero__inner', {
    yPercent: -14,
    opacity: 0.25,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true },
  })

  // Lab entrance
  gsap.from('.lab__rail .lab__chip', {
    opacity: 0,
    x: -26,
    duration: 0.8,
    ease: 'power3.out',
    stagger: 0.07,
    scrollTrigger: { trigger: '#lab', start: 'top 72%' },
  })
  gsap.from('.lab__frames .lab__frame', {
    opacity: 0,
    y: 44,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.12,
    scrollTrigger: { trigger: '#lab', start: 'top 72%' },
  })

  gsap.to('.kutu [data-reveal]', {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.kutu', start: 'top 74%' },
  })
  gsap.to('.page-card', {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.08,
    scrollTrigger: { trigger: '#kutuRow', start: 'top 82%' },
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
} else {
  gsap.set(heroChars, { y: 0 })
}

/* -------------------------------------------------------------------------
   Lightbox
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

document.getElementById('frameB').addEventListener('click', () => {
  const f = FINISHES.find((x) => x.key === activeKey)
  openLightbox(f.b, `${f.name} — anodize finiş, detay`)
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
  resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 150)
})

/* -------------------------------------------------------------------------
   Pinch / double-tap zoom for the lightbox image
   ------------------------------------------------------------------------- */
initLightboxZoom()

initAnalytics()
