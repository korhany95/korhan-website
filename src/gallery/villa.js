/* =========================================================================
   Villa Görselleri — render galerisi
   Fullscreen hero video, three captioned masonry sections (4K render seti,
   villa renderları, kemerli & karolajlı detaylar) and a lightbox that walks
   the whole wall in one continuous list.
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

const SECTIONS = [
  {
    id: 'set4k',
    title: 'Yüksek Kemerli ve <em>Karolajlı</em>',
    badge: 'Yüksek Kemerli',
    base: `${VILLA_BASE}/4k`,
    files: [
      ['03_day_exterior.webp', 'Gündüz Cephesi'],
      ['02_night_exterior.webp', 'Gece Cephesi'],
      ['10_pool_view.webp', 'Havuz Manzarası'],
      ['01_hallway_interior.webp', 'Giriş Holü'],
      ['05_living_room.webp', 'Salon'],
      ['04_kitchen.webp', 'Mutfak'],
      ['06_bedroom_view.webp', 'Yatak Odası'],
      ['09_staircase.webp', 'Merdiven'],
      ['08_bathroom.webp', 'Banyo'],
      ['07_garden_detail.webp', 'Bahçe Detayı'],
    ],
  },
  {
    id: 'villa',
    title: 'Karolaj Doğramalı <em>Taş Ev</em>',
    badge: 'Taş Ev',
    base: `${SURME_BASE}/Villa`,
    files: [
      ['Birds Eye shot.webp', 'Kuşbakışı'],
      ['On.webp', 'Ön Cephe'],
      ['On ve Balkon.webp', 'Ön Cephe ve Balkon'],
      ['Evin Onu.webp', 'Evin Önü'],
      ['Arka Bahce.webp', 'Arka Bahçe'],
      ['arka bahce 2.webp', 'Arka Bahçe II'],
      ['agacli.webp', 'Ağaçlı Bahçe'],
      ['karolaj Detay.webp', 'Karolaj Detayı'],
      ['image_1785439405666_07976d14.webp', 'Cephe Detayı'],
      ['Salon.webp', 'Salon'],
      ['Mutfak.webp', 'Mutfak'],
      ['Merdiven.webp', 'Merdiven'],
      ['Bedroom 1.webp', 'Yatak Odası I'],
      ['bedroom 2.webp', 'Yatak Odası II'],
    ],
  },
  {
    id: 'kemerli',
    title: 'Kemerli & <em>Karolajlı</em>',
    badge: 'Kemerli',
    base: `${SURME_BASE}/Kemerli ve Karolajlı Isı yalıtımlı (t100 seri)`,
    files: [
      ['Kemerli Karolajlı Sürme.webp', 'Kemerli Karolajlı Sürme'],
      ['Kemerli Karolajlı Sürme (içerden bakış).webp', 'İçerden Bakış'],
      ['Kemerli Karolajlı Sürme İçerden bakış 2.webp', 'İçerden Bakış II'],
      ['Kareloj Detay.webp', 'Karolaj Detayı'],
      ['Orta Kayıt Detay.webp', 'Orta Kayıt Detayı'],
      ['Üst ve Alt sabit, orta açılım, Karolajlı 2.webp', 'Üst-Alt Sabit, Orta Açılım'],
      ['image_1783755579429_2b4e5e05.webp', 'Kemerli Sürme Detay'],
    ],
  },
]

/* -------------------------------------------------------------------------
   Build the wall — one grid per section, one flat item list for the lightbox
   ------------------------------------------------------------------------- */
const wall = document.getElementById('wall')
const items = [] // { el, src, label, badge }

for (const section of SECTIONS) {
  const head = document.createElement('header')
  head.className = 'wall__head'
  head.innerHTML = `
    <h2 class="wall__title">${section.title}</h2>
    <span class="wall__count">${section.files.length} görsel</span>`
  wall.appendChild(head)

  const grid = document.createElement('div')
  grid.className = 'wall__grid'
  wall.appendChild(grid)

  for (const [file, label] of section.files) {
    const src = encPath(`${section.base}/${file}`)

    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'card'
    card.innerHTML = `
      <span class="card__media">
        <img class="card__img" src="${src}" alt="${label}" loading="lazy" decoding="async" />
      </span>
      <span class="card__meta">
        <span class="card__serie">${label}</span>
      </span>`
    grid.appendChild(card)
    items.push({ el: card, src, label, badge: section.badge })
  }
}

document.querySelector('[data-total-count]').textContent = items.length

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
  current = (i + items.length) % items.length
  const item = items[current]
  lightboxImg.src = item.src
  lightboxImg.alt = item.label
  lightboxCap.textContent = `${item.badge} · ${item.label} · ${current + 1} / ${items.length}`
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

items.forEach((item, i) => {
  item.el.addEventListener('click', () => openLightbox(i))
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
