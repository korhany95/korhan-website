/* =========================================================================
   Villa & Apartman Görselleri — render galerisi
   Fullscreen hero video, a villa/apartman filter over captionless masonry
   sections, and a lightbox that walks whatever the filter left visible.
   ========================================================================= */

import './villa.css'
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
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/')

const VILLA_BASE = '/media/Villa Görselleri'
const SURME_BASE = '/media/Sürme Doğramalar'
const HERO_VIDEO = `${VILLA_BASE}/hero.mp4`

/* Zip'lerden gelen setler numaralandırılmış dosyalar: 01.webp … NN.webp */
const seq = (n) => Array.from({ length: n }, (_, i) => `${String(i + 1).padStart(2, '0')}.webp`)

const SECTIONS = [
  {
    id: 'set4k',
    cat: 'villa',
    title: 'Yüksek Kemerli ve <em>Karolajlı</em>',
    base: `${VILLA_BASE}/4k`,
    files: [
      '03_day_exterior.webp',
      '02_night_exterior.webp',
      '10_pool_view.webp',
      '01_hallway_interior.webp',
      '05_living_room.webp',
      '04_kitchen.webp',
      '06_bedroom_view.webp',
      '09_staircase.webp',
      '08_bathroom.webp',
      '07_garden_detail.webp',
    ],
  },
  {
    id: 'tasev',
    cat: 'villa',
    title: 'Karolaj Doğramalı <em>Taş Ev</em>',
    base: `${SURME_BASE}/Villa`,
    files: [
      'Birds Eye shot.webp',
      'On.webp',
      'On ve Balkon.webp',
      'Evin Onu.webp',
      'Arka Bahce.webp',
      'arka bahce 2.webp',
      'agacli.webp',
      'karolaj Detay.webp',
      'image_1785439405666_07976d14.webp',
      'Salon.webp',
      'Mutfak.webp',
      'Merdiven.webp',
      'Bedroom 1.webp',
      'bedroom 2.webp',
    ],
  },
  {
    id: 'kemerli',
    cat: 'villa',
    title: 'Kemerli & <em>Karolajlı</em>',
    base: `${SURME_BASE}/Kemerli ve Karolajlı Isı yalıtımlı (t100 seri)`,
    files: [
      'Kemerli Karolajlı Sürme.webp',
      'Kemerli Karolajlı Sürme (içerden bakış).webp',
      'Kemerli Karolajlı Sürme İçerden bakış 2.webp',
      'Kareloj Detay.webp',
      'Orta Kayıt Detay.webp',
      'Üst ve Alt sabit, orta açılım, Karolajlı 2.webp',
      'image_1783755579429_2b4e5e05.webp',
    ],
  },
  {
    id: 'girne',
    cat: 'villa',
    title: 'Girne <em>Lüks Villa</em>',
    base: `${VILLA_BASE}/girne-luks-villa`,
    files: seq(10),
  },
  {
    id: 'mutluyaka',
    cat: 'villa',
    title: 'Mutluyaka <em>Taş Ev</em>',
    base: `${VILLA_BASE}/mutluyaka-tas-ev`,
    files: seq(10),
  },
  {
    id: 'panoramik',
    cat: 'villa',
    title: 'Panoramik <em>Taş Villa</em>',
    base: `${VILLA_BASE}/panoramik-villa`,
    files: seq(8),
  },
  {
    id: 'akdeniz',
    cat: 'villa',
    title: 'Akdeniz <em>Villası</em>',
    base: `${VILLA_BASE}/sicakta-villa`,
    files: seq(8),
  },
  {
    id: 'yagmur',
    cat: 'villa',
    title: 'Yağmurda <em>Villa</em>',
    base: `${VILLA_BASE}/yagmurda-villa`,
    files: seq(6),
  },
  {
    id: 'apt-kemerli',
    cat: 'apartman',
    title: 'Kemerli ve Karolaj <em>Doğramalı Apartman</em>',
    base: `${VILLA_BASE}/apartman-kemerli-karolaj`,
    files: seq(14),
  },
  {
    id: 'apt-6katli',
    cat: 'apartman',
    title: '6 Katlı <em>Apartman</em>',
    base: `${VILLA_BASE}/apartman-6-katli`,
    files: seq(11),
  },
]

/* -------------------------------------------------------------------------
   Build the wall — one grid per section, captionless cards
   ------------------------------------------------------------------------- */
const wall = document.getElementById('wall')
const items = []  // { el, src, cat } — every card, in DOM order
const groups = [] // { cat, head, grid, items }

for (const section of SECTIONS) {
  const head = document.createElement('header')
  head.className = 'wall__head'
  head.dataset.cat = section.cat
  head.innerHTML = `
    <h2 class="wall__title">${section.title}</h2>
    <span class="wall__count">${section.files.length} görsel</span>`
  wall.appendChild(head)

  const grid = document.createElement('div')
  grid.className = 'wall__grid'
  grid.dataset.cat = section.cat
  wall.appendChild(grid)

  const groupItems = []
  for (const file of section.files) {
    const src = encPath(`${section.base}/${file}`)

    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'card'
    card.setAttribute('aria-label', 'Görseli büyüt')
    card.innerHTML = `
      <span class="card__media">
        <img class="card__img" src="${src}" alt="" loading="lazy" decoding="async" />
      </span>`
    grid.appendChild(card)

    const item = { el: card, src, cat: section.cat }
    items.push(item)
    groupItems.push(item)
  }

  groups.push({ cat: section.cat, head, grid, items: groupItems })
}

/* -------------------------------------------------------------------------
   Villa / Apartman filter
   ------------------------------------------------------------------------- */
const totalCount = document.querySelector('[data-total-count]')
const chips = [...document.querySelectorAll('.filters__chip')]
const counts = {
  all: items.length,
  villa: items.filter((it) => it.cat === 'villa').length,
  apartman: items.filter((it) => it.cat === 'apartman').length,
}
document.querySelectorAll('[data-filter-count]').forEach((el) => {
  el.textContent = counts[el.dataset.filterCount]
})

let visible = items.slice()

function applyFilter(cat) {
  visible = []
  for (const group of groups) {
    const on = cat === 'all' || group.cat === cat
    group.head.hidden = !on
    group.grid.hidden = !on
    if (on) visible.push(...group.items)
  }
  totalCount.textContent = visible.length
  chips.forEach((chip) => {
    const active = chip.dataset.filter === cat
    chip.classList.toggle('is-active', active)
    chip.setAttribute('aria-pressed', active ? 'true' : 'false')
  })
  ScrollTrigger.refresh()
}

chips.forEach((chip) => {
  chip.addEventListener('click', () => applyFilter(chip.dataset.filter))
})

applyFilter('all')

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
   Card entrances (batched)
   ------------------------------------------------------------------------- */
if (prefersReducedMotion) {
  items.forEach(({ el }) => el.classList.add('is-in'))
} else {
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
  current = (i + visible.length) % visible.length
  const item = visible[current]
  lightboxImg.src = item.src
  lightboxImg.alt = ''
  lightboxCap.textContent = `${current + 1} / ${visible.length}`
  if (!prefersReducedMotion) {
    gsap.fromTo('.lightbox__figure', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' })
  }
}

function openLightbox(index) {
  open = true
  show(index)
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
  item.el.addEventListener('click', () => openLightbox(visible.indexOf(item)))
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
