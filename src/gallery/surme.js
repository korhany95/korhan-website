/* =========================================================================
   Sürme Doğramaları — "Showroom"
   Light theme, split hero with floating video, sticky filter chips and a
   filterable masonry wall with staggered entrances + lightbox.
   ========================================================================= */

import './surme.css'
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
const BASE = '/media/Sürme Doğramalar'
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/')
const HERO_VIDEO = `${BASE}/t100/Intro.mp4`

const SERIES = {
  s3200: {
    label: '3200',
    dir: '3200 seri',
    files: [
      '3200 series 2.webp',
      '3200 series 3.webp',
      '3200 series kanat.webp',
      '3200 Silver Pervazsız.webp',
      '3200 Teşhir Kesit 2.webp',
      '3200 Teşhir kesit 3.webp',
      '3200 Teşhir Kesit.webp',
      '3200 Şampanya pervazlı 2 ray.webp',
      '3200 Şampanya.webp',
      'pervazlı 2 ray kasa.webp',
    ],
  },
  t100: {
    label: 'T100',
    dir: 't100',
    files: [
      'Karşıdan kesit siyah..webp',
      'Oval Kenet duruş.webp',
      'Su tahliye.webp',
      'Yan kesit.webp',
      '2 ray pervazlı kasa.webp',
    ],
  },
  rst116: {
    label: 'RST116',
    dir: 'RST116',
    files: [
      '30ef0acf-2e3d-499b-b4d0-fed26e12a873.webp',
      'b320d7db-5802-4dc8-a276-43580ac07492.webp',
      'image_1783946379550_f68996c8.webp',
      'image_1783947425257_16f7b8af.webp',
      'image_1783948716166_794b663d.webp',
      'image_1783948720707_123380eb.webp',
      'image_1783948892772_26a6758e.webp',
      'image_1783948893035_43560ac8.webp',
      'image_1783959865154_9124adf5.webp',
      'image_1783976607084_4f01e96d.webp',
      'image_1784114670962_d702e0bf.webp',
      'image_1784114679958_e95fa78e.webp',
      'image_1784115064291_2b8ed5e5.webp',
      'image_1784115764143_457c2b90.webp',
      'image_1784115836811_3ad4c035.webp',
    ],
  },
  kemerli: {
    label: 'Villa Görselleri',
    dir: 'Kemerli ve Karolajlı Isı yalıtımlı (t100 seri)',
    files: [
      'Kemerli Karolajlı Sürme.webp',
      'Kemerli Karolajlı Sürme (içerden bakış).webp',
      'Kemerli Karolajlı Sürme İçerden bakış 2.webp',
      'Kareloj Detay.webp',
      'Orta Kayıt Detay.webp',
      'Üst ve Alt sabit, orta açılım, Karolajlı 2.webp',
      'image_1783755579429_2b4e5e05.webp',
      // Villa render seti — kendi klasöründen
      { dir: 'Villa', file: 'Birds Eye shot.webp' },
      { dir: 'Villa', file: 'On.webp' },
      { dir: 'Villa', file: 'On ve Balkon.webp' },
      { dir: 'Villa', file: 'Evin Onu.webp' },
      { dir: 'Villa', file: 'Arka Bahce.webp' },
      { dir: 'Villa', file: 'arka bahce 2.webp' },
      { dir: 'Villa', file: 'agacli.webp' },
      { dir: 'Villa', file: 'karolaj Detay.webp' },
      { dir: 'Villa', file: 'image_1785439405666_07976d14.webp' },
      { dir: 'Villa', file: 'Salon.webp' },
      { dir: 'Villa', file: 'Mutfak.webp' },
      { dir: 'Villa', file: 'Merdiven.webp' },
      { dir: 'Villa', file: 'Bedroom 1.webp' },
      { dir: 'Villa', file: 'bedroom 2.webp' },
    ],
  },
}

const url = (dir, file) => encPath(`${BASE}/${dir}/${file}`)
const srcOf = (serie, entry) =>
  typeof entry === 'string' ? url(serie.dir, entry) : url(entry.dir, entry.file)

/* -------------------------------------------------------------------------
   Build the wall — interleave series so "Tümü" mixes them visually
   ------------------------------------------------------------------------- */
const wall = document.getElementById('wall')
const items = [] // { el, key, src, cap }

const keys = Object.keys(SERIES)
const maxLen = Math.max(...keys.map((k) => SERIES[k].files.length))

for (let i = 0; i < maxLen; i++) {
  for (const key of keys) {
    const serie = SERIES[key]
    const entry = serie.files[i]
    if (!entry) continue
    const src = srcOf(serie, entry)

    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'card'
    card.dataset.serie = key
    card.innerHTML = `
      <span class="card__media">
        <img class="card__img" src="${src}" alt="${serie.label}" loading="lazy" decoding="async" />
      </span>
      <span class="card__meta">
        <span class="card__serie">${serie.label}</span>
      </span>`
    wall.appendChild(card)
    items.push({ el: card, key, src, label: serie.label })
  }
}

// Counters (hero total + chips)
document.querySelector('[data-total-count]').textContent = items.length
document.querySelectorAll('[data-filter-count]').forEach((el) => {
  const key = el.dataset.filterCount
  el.textContent = key === 'all' ? items.length : SERIES[key].files.length
})

/* -------------------------------------------------------------------------
   Smooth scroll + intro
   ------------------------------------------------------------------------- */
let lenis = null
if (!prefersReducedMotion) {
  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
  })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

const heroVideo = document.getElementById('heroVideo')
heroVideo.src = encPath(HERO_VIDEO)
heroVideo.play?.().catch(() => {})

const heroChars = []
document.querySelectorAll('[data-split]').forEach((el) => heroChars.push(...splitChars(el)))

if (!prefersReducedMotion) {
  gsap.timeline({ delay: 0.1 })
    .to(heroChars, { y: 0, duration: 1.05, ease: 'power4.out', stagger: 0.028 })
    .to('[data-stagger]', {
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
} else {
  gsap.set(heroChars, { y: 0 })
}

/* -------------------------------------------------------------------------
   Card entrances (batched) — replays when cards re-enter after filtering
   ------------------------------------------------------------------------- */
function observeEntrances() {
  if (prefersReducedMotion) {
    items.forEach(({ el }) => el.classList.add('is-in'))
    return
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return
        const el = entry.target
        setTimeout(() => el.classList.add('is-in'), (i % 6) * 70)
        io.unobserve(el)
      })
    },
    { rootMargin: '0px 0px -6% 0px' }
  )
  items.forEach(({ el }) => io.observe(el))
  return io
}
observeEntrances()

/* -------------------------------------------------------------------------
   Filtering: fade the wall out, swap visibility, cascade back in
   ------------------------------------------------------------------------- */
const chips = document.querySelectorAll('.filters__chip')
let activeFilter = 'all'
let filtering = false

function applyFilter(key) {
  if (filtering || key === activeFilter) return
  filtering = true
  activeFilter = key

  chips.forEach((c) => c.classList.toggle('is-active', c.dataset.filter === key))

  const swap = () => {
    items.forEach(({ el, key: k }) => {
      const show = key === 'all' || k === key
      el.classList.toggle('is-hidden', !show)
      el.classList.remove('is-in')
    })
    ScrollTrigger.refresh()
  }

  if (prefersReducedMotion) {
    swap()
    items.forEach(({ el }) => el.classList.add('is-in'))
    filtering = false
    return
  }

  gsap.to(wall, {
    opacity: 0,
    y: 14,
    duration: 0.28,
    ease: 'power2.in',
    onComplete: () => {
      swap()
      gsap.set(wall, { y: 0 })
      gsap.to(wall, { opacity: 1, duration: 0.3, ease: 'power2.out' })
      const visible = items.filter(({ el }) => !el.classList.contains('is-hidden'))
      visible.forEach(({ el }, i) => {
        setTimeout(() => el.classList.add('is-in'), Math.min(i * 45, 700))
      })
      filtering = false
    },
  })
}

chips.forEach((chip) => {
  chip.addEventListener('click', () => applyFilter(chip.dataset.filter))
})

/* -------------------------------------------------------------------------
   Lightbox — navigates within the active filter
   ------------------------------------------------------------------------- */
const lightbox = document.getElementById('lightbox')
const lightboxImg = document.getElementById('lightboxImg')
const lightboxCap = document.getElementById('lightboxCap')
let current = 0
let open = false

const visibleItems = () => items.filter(({ el }) => !el.classList.contains('is-hidden'))

function show(i) {
  const list = visibleItems()
  current = (i + list.length) % list.length
  const item = list[current]
  lightboxImg.src = item.src
  lightboxImg.alt = item.label
  lightboxCap.textContent = `${item.label} · ${current + 1} / ${list.length}`
  if (!prefersReducedMotion) {
    gsap.fromTo('.lightbox__figure', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' })
  }
}

function openLightbox(item) {
  open = true
  show(visibleItems().indexOf(item))
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

items.forEach((item) => {
  item.el.addEventListener('click', () => openLightbox(item))
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

initAnalytics()
