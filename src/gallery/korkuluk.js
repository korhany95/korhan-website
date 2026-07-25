/* =========================================================================
   Cam Korkuluk ve Küpeşteler — "The Stack"
   Full-screen collection cards that pile on top of each other with
   scroll: the previous card sinks, scales and dims while the next one
   slides over it. Each card carries a drifting thumb rail -> lightbox.
   ========================================================================= */

import './korkuluk.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
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
const BASE = '/media/Cam Korkuluklar ve Küpeşteler'
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/')
const u = (path) => encPath(`${BASE}/${path}`)

const CARDS = [
  {
    intro: true,
    video: u('Kare Küpeşte/kare Siyah Küpeşte.mp4'),
    eyebrow: '3 koleksiyon — 20 görsel',
    title: 'Cam Korkuluk <em>&amp;</em> Küpeşteler',
    desc: 'Camın hafifliği, alüminyumun gücü. Balkondan merdivene, her boşluğa güven ve zarafet.',
  },
  {
    no: '01',
    title: 'Kare <em>Dikmeli</em>',
    desc: 'Kare profil dikmeler, cam tutamaklı küpeşteler — bronz ve füme laminasyonlu cam seçenekleriyle.',
    cover: u('kare dikmeli cam tutamaklı küpeşteler/kare dikmeli - Bronze+Bronze (5+5) cam.webp'),
    dir: 'kare dikmeli cam tutamaklı küpeşteler',
    files: [
      'kare dikmeli - Bronze+Bronze (5+5) cam.webp',
      'Siyah kare dikmeli  4+4 Füme Füme laminasyonlu.webp',
      'Siyah kare dikmeli  4+4 Füme Füme laminasyonlu  (1).webp',
      'Siyah kare dikmeli - Tutamaklı - Füme cam (4+4).webp',
      'Siyah kare dikmeli - tutamaklı - füme cam (5+5).webp',
      'gorsel_set2_3_alt_sol.webp',
    ],
  },
  {
    no: '02',
    title: 'Kütüklü <em>&amp; Kapaklı</em>',
    desc: 'Kütük profilli, kapaklı cam balkon korkulukları — antrasit ve şampanya renklerinde, kesit detaylarıyla.',
    cover: u('Kütüklü, Kapaklı Cam Balkon Korkulukları/Şampanya Renk, 4+4 şeffaf şeffaf Laminasyonlu   ve Kapaklı.webp'),
    dir: 'Kütüklü, Kapaklı Cam Balkon Korkulukları',
    files: [
      'Antrasit Kütük , 4+4 Füme Füme Laminasyonlu ve kapaklı.webp',
      'Antrasit Kütük , 4+4 Füme Füme Laminasyonlu ve kapaklı Kesit.webp',
      'Şampanya Renk, 4+4 şeffaf şeffaf Laminasyonlu   ve Kapaklı.webp',
      'Şampanya Renk, 4+4 şeffaf şeffaf Laminasyonlu   ve Kapaklı. Montajlı.webp',
      'Şampanya Renk, 4+4 şeffaf şeffaf Laminasyonlu   ve Kapaklı. Tam kesit.webp',
      'Kütüklü Cam Tutamağı - macro kesit.webp',
      'Üst tutamak kesit 1.webp',
      'Üst tutamak kesit 2.webp',
    ],
  },
  {
    no: '03',
    title: 'Yuvarlak <em>Dikmeli</em>',
    desc: 'Boru dikmeli, cam tutamaklı küpeşteler — silver eloksal finish, yuvarlak hatlar.',
    video: u('Yuvarlak Dikmeli Cam tutamaklı küpeşte/Scroll driven 1.mp4'),
    dir: 'Yuvarlak Dikmeli Cam tutamaklı küpeşte',
    files: [
      'Yuvarlak Dikmeli Cam tutamakli korkuluk.webp',
      'Düz camlı Dikmeli tutamaklı korkuluk. Yuvarlak Küpeşte.webp',
      'Boru Siver küpeşte.webp',
      'Cam tutamaklı boru silver küpeşte.webp',
      'image_1783937780406_6b611db4.webp',
      'image_1783937786692_44ff5588.webp',
    ],
  },
]

function caption(file, label, i) {
  const name = file.replace(/\.[a-z0-9]+$/i, '').replace(/\s+/g, ' ').trim()
  if (/^image_\d+/i.test(name) || /^gorsel_/i.test(name)) {
    return `${label} — ${String(i + 1).padStart(2, '0')}`
  }
  return name
}

/* -------------------------------------------------------------------------
   Build the cards
   ------------------------------------------------------------------------- */
const stack = document.getElementById('stack')
const flat = [] // lightbox items

CARDS.forEach((card, ci) => {
  const section = document.createElement('section')
  section.className = `card${card.intro ? ' card--intro' : ''}`

  const media = card.video
    ? `<video src="${card.video}" muted autoplay loop playsinline preload="auto" disablepictureinpicture aria-hidden="true"></video>`
    : `<img src="${card.cover}" alt="" aria-hidden="true" decoding="async" />`

  let railHtml = ''
  if (card.files) {
    const label = card.title.replace(/<[^>]+>/g, '')
    const thumbs = card.files
      .map((file, i) => {
        const src = u(`${card.dir}/${file}`)
        const cap = caption(file, label, i)
        const idx = flat.push({ src, cap }) - 1
        return `<button type="button" class="thumb" data-index="${idx}" aria-label="${cap}">
          <img src="${src}" alt="${cap}" loading="lazy" decoding="async" />
        </button>`
      })
      .join('')
    railHtml = `<div class="card__rail"><div class="card__rail-track" data-rail="${ci % 2}">${thumbs}</div></div>`
  }

  section.innerHTML = `
    <div class="card__media">${media}</div>
    <div class="card__scrim"></div>
    <div class="card__fade"></div>
    <div class="card__inner">
      ${card.intro ? `<span class="card__eyebrow">${card.eyebrow}</span>` : ''}
      <div class="card__head">
        <div>
          ${card.no ? `<span class="card__no">Koleksiyon ${card.no}</span>` : ''}
          <h2 class="card__title">${card.title}</h2>
          <p class="card__desc">${card.desc}</p>
        </div>
        ${card.files ? `<span class="card__count">${card.files.length} görsel</span>` : ''}
      </div>
      ${railHtml}
    </div>
    ${card.intro ? `<div class="card__scrolldown"><span>Koleksiyonlar</span><span class="card__scrolldown-line"></span></div>` : ''}`

  stack.appendChild(section)

  // Dwell space. Each card is sticky inside .stack, so without a gap in the
  // flow the next card starts climbing over it on the very first pixel of
  // scroll — which buried the thumb rail before anyone could tap it. The
  // spacer holds the card still for a screenful before the hand-over starts.
  if (ci < CARDS.length - 1) {
    const spacer = document.createElement('div')
    spacer.className = 'card__dwell'
    spacer.setAttribute('aria-hidden', 'true')
    stack.appendChild(spacer)
  }
})

/* -------------------------------------------------------------------------
   Smooth scroll
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

/* -------------------------------------------------------------------------
   Stacking: as the next card arrives, the previous one sinks away
   ------------------------------------------------------------------------- */
const cards = gsap.utils.toArray('.card')

if (!prefersReducedMotion) {
  // Outgoing card: gentle sink + veil fade while the next card covers it.
  // (opacity on a dedicated overlay stays on the compositor — animating
  // filter/brightness repaints the whole card and visibly pops.)
  cards.forEach((card, i) => {
    const next = cards[i + 1]
    if (!next) return
    const veil = card.querySelector('.card__fade')
    const range = {
      trigger: next,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
    }
    gsap.to(card, { scale: 0.96, yPercent: -2, ease: 'none', scrollTrigger: { ...range } })
    gsap.fromTo(veil, { opacity: 0 }, { opacity: 0.72, ease: 'none', scrollTrigger: { ...range } })
  })

  // Incoming card: media settles from a slight zoom while its veil clears —
  // together with the outgoing dim this reads as one continuous crossfade.
  cards.slice(1).forEach((card) => {
    const mediaEl = card.querySelector('.card__media')
    const veil = card.querySelector('.card__fade')
    const range = {
      trigger: card,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
    }
    gsap.fromTo(mediaEl, { scale: 1.14, yPercent: -6 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { ...range } })
    gsap.fromTo(veil, { opacity: 0.5 }, { opacity: 0, ease: 'none', scrollTrigger: { ...range } })
  })

  // intro copy entrance
  const intro = cards[0]
  gsap.from(intro.querySelectorAll('.card__inner > *'), {
    opacity: 0,
    y: 34,
    duration: 1.1,
    ease: 'power3.out',
    stagger: 0.12,
    delay: 0.2,
  })

  // per-card copy reveal when the card takes the screen
  cards.slice(1).forEach((card) => {
    gsap.from(card.querySelectorAll('.card__head > *, .card__rail'), {
      opacity: 0,
      y: 40,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.1,
      scrollTrigger: { trigger: card, start: 'top 55%' },
    })
  })
}

/* -------------------------------------------------------------------------
   Thumb rails: slow marquee drift, alternating direction
   ------------------------------------------------------------------------- */
const coarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches

document.querySelectorAll('[data-rail]').forEach((track) => {
  const rail = track.parentElement

  // On touch there is no hover to pause on, and a strip that keeps sliding
  // under your thumb is what made these images hard to open. Give phones a
  // plain swipeable row instead of a marquee.
  if (coarsePointer || prefersReducedMotion) {
    rail.classList.add('card__rail--swipe')
    return
  }

  const original = track.innerHTML
  track.innerHTML = original + original
  const dirRight = track.dataset.rail === '1'
  const loopWidth = () => track.scrollWidth / 2

  // Hovering to aim at a thumbnail stops the drift
  let paused = false
  rail.addEventListener('pointerenter', () => { paused = true })
  rail.addEventListener('pointerleave', () => { paused = false })

  const proxy = { x: dirRight ? -1 : 0 }
  gsap.ticker.add((_, dt) => {
    if (paused) return
    const lw = loopWidth()
    if (!lw) return
    const speed = 22 // px/s
    proxy.x += ((dirRight ? 1 : -1) * speed * dt) / 1000
    if (proxy.x <= -lw) proxy.x += lw
    if (proxy.x > 0) proxy.x -= lw
    gsap.set(track, { x: proxy.x })
  })
})

/* -------------------------------------------------------------------------
   Outro reveal
   ------------------------------------------------------------------------- */
if (!prefersReducedMotion) {
  gsap.set('.outro__title, .outro__actions', { opacity: 0, y: 26 })
  gsap.to('.outro__title, .outro__actions', {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.outro', start: 'top 80%' },
  })
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

document.querySelectorAll('.thumb').forEach((thumb) => {
  thumb.addEventListener('click', () => openLightbox(parseInt(thumb.dataset.index, 10)))
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

initAnalytics()
