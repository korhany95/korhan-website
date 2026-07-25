/* =========================================================================
   Vitrin Doğramaları — "The Street"
   Split hero with RW60 video, then a pinned horizontal walk past
   storefront windows (glass sheen, number plates, live counter), and
   big 16:9 plates for the door & facade shots. Lightbox across all.
   ========================================================================= */

import './vitrin.css'
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
const BASE = '/media/Vitrin Dogramalari'
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/')
const HERO_VIDEO = `${BASE}/Kapı ve Dükkan Cepheleri/RW60.mp4`

const SHOPS = [
  '0231df72-c9fa-4c45-a065-856156fa412b_1783848004793_47acb803.webp',
  'fd793965-0dcb-401b-81f8-af56b7194f5f.webp',
  'image_1783883069680_c0933626.webp',
  'image_1783884631118_af92726e.webp',
  'image_1783885192135_c9633851.webp',
  'image_1783885868854_4428baf0.webp',
  'image_1783886593187_738fcede.webp',
  'image_1783886598645_e33aa767.webp',
  'image_1783886902927_2d810e47.webp',
].map((f) => encPath(`${BASE}/Dükkan örnekleri/${f}`))

const PLATES = [
  { file: 'C60 dükkan Cephesi.webp', cap: 'C60 dükkan cephesi' },
  {
    file: 'Genel Görünüş - C60 Kapılar ve Cam kombinasyonları.webp',
    cap: 'C60 kapılar ve cam kombinasyonları',
  },
  { file: 'İç mekan Ofis cephesi.webp', cap: 'İç mekan ofis cephesi' },
].map((p) => ({ ...p, src: encPath(`${BASE}/Kapı ve Dükkan Cepheleri/${p.file}`) }))

/* -------------------------------------------------------------------------
   Build: storefronts + plates
   ------------------------------------------------------------------------- */
const track = document.querySelector('[data-street-track]')
const flat = [] // lightbox items

SHOPS.forEach((src, i) => {
  const no = String(i + 1).padStart(2, '0')
  const cap = `Dükkan cephesi — ${no}`
  const idx = flat.push({ src, cap }) - 1

  const shop = document.createElement('figure')
  shop.className = 'shop'
  shop.tabIndex = 0
  shop.dataset.index = idx
  shop.innerHTML = `
    <div class="shop__window">
      <img class="shop__img" src="${src}" alt="${cap}" loading="lazy" decoding="async" />
      <span class="shop__sheen"></span>
      <span class="shop__plate">No <b>${no}</b></span>
    </div>
    <figcaption class="shop__cap"><span>${cap}</span><span>C60</span></figcaption>`
  track.appendChild(shop)
})

// closing CTA circle at the end of the street
const end = document.createElement('div')
end.className = 'shop shop--end'
end.innerHTML = `<a class="shop__cta" href="/#contact">Sıradaki<br />vitrin sizin →</a>`
track.appendChild(end)

document.getElementById('streetTotal').textContent = String(SHOPS.length).padStart(2, '0')

const platesWrap = document.getElementById('plates')
PLATES.forEach(({ src, cap }) => {
  const idx = flat.push({ src, cap }) - 1
  const plate = document.createElement('figure')
  plate.className = 'plate'
  plate.tabIndex = 0
  plate.dataset.index = idx
  plate.innerHTML = `
    <img class="plate__img" src="${src}" alt="${cap}" loading="lazy" decoding="async" />
    <figcaption class="plate__cap">${cap}</figcaption>`
  platesWrap.appendChild(plate)
})

/* -------------------------------------------------------------------------
   Smooth scroll + intro
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

const heroVideo = document.getElementById('heroVideo')
heroVideo.src = encPath(HERO_VIDEO)
heroVideo.play?.().catch(() => {})

const heroChars = []
document.querySelectorAll('[data-split]').forEach((el) => heroChars.push(...splitChars(el)))

if (!prefersReducedMotion) {
  gsap.timeline({ delay: 0.1 })
    .to(heroChars, { y: 0, duration: 1.05, ease: 'power4.out', stagger: 0.028 })
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
} else {
  gsap.set(heroChars, { y: 0 })
}

/* -------------------------------------------------------------------------
   The street: pin + horizontal scrub + parallax + counter
   ------------------------------------------------------------------------- */
const pin = document.querySelector('[data-street-pin]')
const streetNow = document.getElementById('streetNow')

if (!prefersReducedMotion) {
  const distance = () => track.scrollWidth - window.innerWidth

  const scrub = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '#street',
      start: 'top top',
      end: () => '+=' + distance(),
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onUpdate: (self) => {
        const i = Math.min(
          SHOPS.length,
          Math.max(1, Math.round(self.progress * SHOPS.length) + 0)
        )
        streetNow.textContent = String(Math.max(1, i)).padStart(2, '0')
      },
    },
  })

  // window contents drift as you walk past (parallax)
  document.querySelectorAll('.shop__img').forEach((img) => {
    gsap.fromTo(
      img,
      { xPercent: -7 },
      {
        xPercent: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: img.closest('.shop'),
          containerAnimation: scrub,
          start: 'left right',
          end: 'right left',
          scrub: true,
        },
      }
    )
  })
}

/* -------------------------------------------------------------------------
   Plates: clip-path reveal + parallax
   ------------------------------------------------------------------------- */
if (!prefersReducedMotion) {
  gsap.to('.plates [data-reveal]', {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.plates', start: 'top 75%' },
  })

  document.querySelectorAll('.plate').forEach((plate) => {
    const img = plate.querySelector('.plate__img')
    gsap.to(plate, {
      clipPath: 'inset(0 0 0% 0)',
      duration: 1.2,
      ease: 'power4.inOut',
      scrollTrigger: { trigger: plate, start: 'top 84%' },
    })
    gsap.to(img, {
      scale: 1,
      duration: 1.6,
      ease: 'power3.out',
      scrollTrigger: { trigger: plate, start: 'top 84%' },
    })
  })

  gsap.to('.outro__title, .outro__actions', {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.outro', start: 'top 80%' },
  })
  gsap.set('.outro__title, .outro__actions', { opacity: 0, y: 26 })
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

document.querySelectorAll('.shop[data-index], .plate[data-index]').forEach((el) => {
  const activate = () => openLightbox(parseInt(el.dataset.index, 10))
  el.addEventListener('click', activate)
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') activate() })
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
