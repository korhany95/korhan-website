/* =========================================================================
   Güneş Kırıcılar — "Solstice"
   A fixed fullscreen stage where each image swap happens through
   venetian-blind louvre flips (horizontal strips rotating on X), driven
   by scroll or by the prev/next arrows, while a lamel-angle readout ticks
   along with deck progress. Technical section follows.
   ========================================================================= */

import './gunes.css'
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
const BASE = '/media/Güneş Kırıcılar'
const encPath = (p) => p.split('/').map(encodeURIComponent).join('/')
const u = (file) => encPath(`${BASE}/${file}`)

const SLIDES = [
  {
    src: u('Villa 1.webp'),
    kicker: 'Koleksiyon — Lamel Sistemleri',
    title: 'Güneş <em>Kırıcılar</em>',
    sub: 'Işığı ve gölgeyi derecesiyle yönetin — kaydırdıkça lameller açılır.',
  },
  {
    src: u('Villa 2.webp'),
    kicker: '02 — Villa uygulaması',
    title: 'Villa <em>Serisi</em>',
    sub: 'Cepheyle bütünleşen yatay lamel ritmi.',
  },
  {
    src: u('Villa 3.webp'),
    kicker: '03 — Villa uygulaması',
    title: 'Gölge <em>Hattı</em>',
    sub: 'Öğle güneşinde bile serin, aydınlık iç mekânlar.',
  },
  {
    src: u('Villa 4.webp'),
    kicker: '04 — Villa uygulaması',
    title: 'Yatay <em>Ritim</em>',
    sub: 'Alüminyum lamellerin cephe boyunca kesintisiz akışı.',
  },
  {
    src: u('Villa 5.webp'),
    kicker: '05 — Villa uygulaması',
    title: 'Keskin <em>Detay</em>',
    sub: 'Bıçak ağızlı profil — ince, net, iddialı.',
  },
  {
    src: u('Ofis karşıdan bakış (1).webp'),
    kicker: '06 — Ticari uygulama',
    title: 'Ofis <em>Cephesi</em>',
    sub: 'Çalışma alanlarında kamaşmayı kesen kontrollü ışık.',
  },
  {
    src: u('Ofis arka balkon.webp'),
    kicker: '07 — Ticari uygulama',
    title: 'Arka <em>Balkon</em>',
    sub: 'Yarı açık alanlarda gölge ve mahremiyet dengesi.',
  },
]

const TECH = [
  { file: 'Badem louvre(lamel), kesit.webp', cap: 'Badem lamel — kesit' },
  { file: 'Bıcak ağızlı louvre (lamel).webp', cap: 'Bıçak ağızlı lamel' },
  { file: 'Dereceler Temsili.webp', cap: 'Derece temsili' },
  {
    file: 'Güneş kırıcı için montaj şekli (derece verildikten sonra sabitleme).webp',
    cap: 'Montaj şekli',
  },
  { file: 'Kesit.webp', cap: 'Sistem kesiti' },
]

const TECH_VIDEO = u('Lamel animasyon scroll driven.mp4')

/* -------------------------------------------------------------------------
   Stage: base layer + louvre strips
   ------------------------------------------------------------------------- */
const stageBase = document.getElementById('stageBase')
const stageStrips = document.getElementById('stageStrips')
const STRIP_COUNT = window.matchMedia('(max-width: 640px)').matches ? 8 : 11

const strips = []
for (let i = 0; i < STRIP_COUNT; i++) {
  const s = document.createElement('div')
  s.className = 'strip'
  stageStrips.appendChild(s)
  strips.push(s)
}

function layoutStrips() {
  const vh = window.innerHeight
  const stripH = vh / STRIP_COUNT
  strips.forEach((s, i) => {
    // 1px overlap hides subpixel seams between strips
    s.style.top = `${i * stripH - 0.5}px`
    s.style.height = `${stripH + 1}px`
  })
}
layoutStrips()

// Preloaded Image objects so we can compute cover geometry per strip
const loaded = new Array(SLIDES.length)
function preload(i) {
  if (loaded[i]) return loaded[i]
  loaded[i] = new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(img)
    img.src = SLIDES[i].src
  })
  return loaded[i]
}

function coverGeom(img) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const iw = img.naturalWidth || vw
  const ih = img.naturalHeight || vh
  const scale = Math.max(vw / iw, vh / ih)
  const bgW = iw * scale
  const bgH = ih * scale
  return { bgW, bgH, offX: (vw - bgW) / 2, offY: (vh - bgH) / 2 }
}

function paintStrips(img, src) {
  const { bgW, bgH, offX, offY } = coverGeom(img)
  const stripH = window.innerHeight / STRIP_COUNT
  strips.forEach((s, i) => {
    s.style.backgroundImage = `url("${src}")`
    s.style.backgroundSize = `${bgW}px ${bgH}px`
    s.style.backgroundPosition = `${offX}px ${offY - (i * stripH - 0.5)}px`
  })
}

/* -------------------------------------------------------------------------
   HUD text
   ------------------------------------------------------------------------- */
const hudText = document.getElementById('hudText')
const hudKicker = document.getElementById('hudKicker')
const hudTitle = document.getElementById('hudTitle')
const hudSub = document.getElementById('hudSub')
const hudCount = document.getElementById('hudCount')
const hudAngle = document.getElementById('hudAngle')

function setHud(i) {
  const s = SLIDES[i]
  hudKicker.textContent = s.kicker
  hudTitle.innerHTML = s.title
  hudSub.textContent = s.sub
  hudCount.innerHTML = `${String(i + 1).padStart(2, '0')} <small>/ ${String(SLIDES.length).padStart(2, '0')}</small>`
}

/* -------------------------------------------------------------------------
   Louvre transition engine
   ------------------------------------------------------------------------- */
let current = 0
let pending = null
let transitioning = false
let kenBurns = null

function startKenBurns() {
  if (prefersReducedMotion) return
  if (kenBurns) kenBurns.kill()
  kenBurns = gsap.fromTo(
    stageBase,
    { scale: 1 },
    { scale: 1.07, duration: 9, ease: 'none' }
  )
}

async function goTo(next, dir = 1) {
  if (next === current) return
  if (transitioning) {
    pending = next
    return
  }
  transitioning = true

  const img = await preload(next)

  if (prefersReducedMotion) {
    stageBase.style.backgroundImage = `url("${SLIDES[next].src}")`
    setHud(next)
    current = next
    transitioning = false
    return
  }

  paintStrips(img, SLIDES[next].src)
  stageStrips.style.visibility = 'visible'
  gsap.set(strips, {
    rotationX: dir > 0 ? -92 : 92,
    opacity: 0,
    transformOrigin: '50% 50%',
  })

  // Text out while the blinds flip in
  gsap.to(hudText, { y: -20, opacity: 0, duration: 0.3, ease: 'power2.in' })

  gsap.to(strips, {
    rotationX: 0,
    opacity: 1,
    duration: 0.72,
    ease: 'power3.out',
    stagger: { each: 0.045, from: dir > 0 ? 'start' : 'end' },
    onComplete: () => {
      stageBase.style.backgroundImage = `url("${SLIDES[next].src}")`
      startKenBurns()
      stageStrips.style.visibility = 'hidden'
      current = next
      transitioning = false

      setHud(next)
      gsap.fromTo(
        hudText,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }
      )

      if (pending !== null && pending !== current) {
        const target = pending
        pending = null
        goTo(target, target > current ? 1 : -1)
      } else {
        pending = null
      }
    },
  })
}

/* -------------------------------------------------------------------------
   Boot: first slide + intro
   ------------------------------------------------------------------------- */
const deck = document.getElementById('deck')
deck.style.height = `${SLIDES.length * 100}vh`

setHud(0)
preload(0).then(() => {
  stageBase.style.backgroundImage = `url("${SLIDES[0].src}")`
  startKenBurns()
  if (!prefersReducedMotion) {
    gsap.from(stageBase, { opacity: 0, scale: 1.12, duration: 1.4, ease: 'power3.out' })
    gsap.from(hudText, { y: 34, opacity: 0, duration: 1, delay: 0.4, ease: 'power3.out' })
    gsap.from('.hud__meta', { opacity: 0, duration: 1, delay: 0.7, ease: 'power2.out' })
  }
})
// Warm the next couple of slides
preload(1)
preload(2)

/* -------------------------------------------------------------------------
   Scroll: Lenis + deck progress -> slide index, lamel angle, arrow state
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

const deckPrev = document.getElementById('deckPrev')
const deckNext = document.getElementById('deckNext')

function syncNav(index) {
  deckPrev.disabled = index <= 0
  deckNext.disabled = index >= SLIDES.length - 1
}
syncNav(0)

const deckTrigger = ScrollTrigger.create({
  trigger: deck,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    const p = self.progress
    hudAngle.textContent = Math.round(15 + p * 60)

    const target = Math.round(p * (SLIDES.length - 1))
    syncNav(target)
    if (target !== current && !transitioning) {
      goTo(target, target > current ? 1 : -1)
    } else if (target !== current) {
      pending = target
    }
    preload(Math.min(target + 1, SLIDES.length - 1))
  },
})

/* Arrows drive the same scroll runway the deck reads from, so a click and a
   swipe end up in exactly the same place. */
function scrollToSlide(index) {
  const idx = Math.max(0, Math.min(SLIDES.length - 1, index))
  const { start, end } = deckTrigger
  const y = start + (idx / (SLIDES.length - 1)) * (end - start)
  if (lenis) lenis.scrollTo(y, { duration: 0.85 })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

// `current` lags during a transition; step from what the deck is aiming at
const aimedSlide = () =>
  pending !== null ? pending : Math.round(deckTrigger.progress * (SLIDES.length - 1))

deckPrev.addEventListener('click', () => scrollToSlide(aimedSlide() - 1))
deckNext.addEventListener('click', () => scrollToSlide(aimedSlide() + 1))

window.addEventListener('keydown', (e) => {
  if (lightbox.getAttribute('aria-hidden') === 'false') return
  if (e.key === 'ArrowLeft') scrollToSlide(aimedSlide() - 1)
  if (e.key === 'ArrowRight') scrollToSlide(aimedSlide() + 1)
})

// Hide the scroll hint after the first movement; fade stage as tech arrives
const stageHint = document.getElementById('stageHint')
ScrollTrigger.create({
  trigger: deck,
  start: 'top top-=40',
  onEnter: () => gsap.to(stageHint, { autoAlpha: 0, duration: 0.5 }),
  onLeaveBack: () => gsap.to(stageHint, { autoAlpha: 1, duration: 0.5 }),
})

gsap.to('#stage', {
  opacity: 0,
  ease: 'none',
  scrollTrigger: { trigger: '.after', start: 'top 55%', end: 'top 6%', scrub: true },
})

// The stage only fades — take its arrows out of reach once the technical
// section owns the screen, or they'd stay clickable at opacity 0.
const deckNav = document.getElementById('deckNav')
ScrollTrigger.create({
  trigger: '.after',
  start: 'top 55%',
  onEnter: () => deckNav.classList.add('is-hidden'),
  onLeaveBack: () => deckNav.classList.remove('is-hidden'),
})

/* -------------------------------------------------------------------------
   Technical section
   ------------------------------------------------------------------------- */
const techGrid = document.getElementById('techGrid')
TECH.forEach(({ file, cap }, i) => {
  const card = document.createElement('button')
  card.type = 'button'
  card.className = 'tech-card'
  card.innerHTML = `
    <span class="tech-card__media">
      <img class="tech-card__img" src="${u(file)}" alt="${cap}" loading="lazy" decoding="async" />
    </span>
    <span class="tech-card__cap">
      <span>${cap}</span>
      <span class="tech-card__no">${String(i + 1).padStart(2, '0')}</span>
    </span>`
  techGrid.appendChild(card)
})

const techVideo = document.getElementById('techVideo')
techVideo.src = TECH_VIDEO
techVideo.play?.().catch(() => {})

if (!prefersReducedMotion) {
  gsap.to('.tech [data-reveal], .outro [data-reveal]', {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.tech', start: 'top 72%' },
  })
  gsap.to('.tech-card', {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.09,
    scrollTrigger: { trigger: '#techGrid', start: 'top 80%' },
  })
} else {
  gsap.set('.tech [data-reveal], .outro [data-reveal], .tech-card', { opacity: 1, y: 0 })
}

/* -------------------------------------------------------------------------
   Lightbox (technical images)
   ------------------------------------------------------------------------- */
const lightbox = document.getElementById('lightbox')
const lightboxImg = document.getElementById('lightboxImg')
const lightboxCap = document.getElementById('lightboxCap')

function openLightbox(i) {
  lightboxImg.src = u(TECH[i].file)
  lightboxImg.alt = TECH[i].cap
  lightboxCap.textContent = TECH[i].cap
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

techGrid.querySelectorAll('.tech-card').forEach((card, i) => {
  card.addEventListener('click', () => openLightbox(i))
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
    layoutStrips()
    ScrollTrigger.refresh()
  }, 150)
})

/* -------------------------------------------------------------------------
   Pinch / double-tap zoom for the lightbox image
   ------------------------------------------------------------------------- */
initLightboxZoom()

initAnalytics()
