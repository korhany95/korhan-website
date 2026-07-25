/* =========================================================================
   Lightbox pinch-zoom

   Every page ships the same lightbox markup (#lightbox / #lightboxImg), so
   this attaches itself to that pair and adds:

     - two-finger pinch, anchored on the midpoint between the fingers
     - one-finger drag to pan once the image is magnified
     - double-tap / double-click to toggle 2.5x at the tapped point
     - ctrl+wheel or trackpad pinch on desktop

   The browser's native pinch is deliberately taken over (touch-action:none
   on the image) — leaving it to the page meant fighting the smooth-scroll
   layer, which is exactly the "sometimes it works, never smoothly" problem.

   It resets itself when the lightbox closes or the image changes, so the
   host page needs no wiring beyond importing and calling it once.
   ========================================================================= */

import './lightbox-zoom.css'

const MIN_SCALE = 1
const MAX_SCALE = 5
const DOUBLE_TAP_MS = 320
const DOUBLE_TAP_SLOP = 30 // px between taps to still count as a double tap
const EASE = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)'

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))

export function initLightboxZoom({ hint = 'Yakınlaştırmak için iki parmak' } = {}) {
  const lightbox = document.getElementById('lightbox')
  const img = document.getElementById('lightboxImg')
  if (!lightbox || !img) return null

  const state = { scale: 1, x: 0, y: 0 }
  const pointers = new Map()
  let gesture = null // snapshot taken when the pointer count changes
  let dragged = false
  let lastTap = { t: 0, x: 0, y: 0 }

  /* ----------------------------------------------------------- affordance */
  let hintEl = null
  if (hint) {
    hintEl = document.createElement('span')
    hintEl.className = 'lightbox__zoomhint'
    hintEl.setAttribute('aria-hidden', 'true')
    hintEl.textContent = hint
    lightbox.appendChild(hintEl)
  }
  const dismissHint = () => hintEl?.classList.add('is-gone')

  /* -------------------------------------------------------------- helpers */
  const apply = () => {
    img.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`
    lightbox.classList.toggle('is-zoomed', state.scale > 1.01)
  }

  // Layout centre of the image in viewport coords. getBoundingClientRect()
  // reports the *transformed* box, and scaling happens about the centre, so
  // backing out the current translation recovers the untransformed centre.
  const layoutCenter = () => {
    const r = img.getBoundingClientRect()
    return { x: r.left + r.width / 2 - state.x, y: r.top + r.height / 2 - state.y }
  }

  // Never let the image be flung off screen: it may travel only as far as it
  // overflows the viewport, and snaps back to centre at 1x.
  const clampPan = () => {
    const w = img.offsetWidth * state.scale
    const h = img.offsetHeight * state.scale
    const maxX = Math.max(0, (w - window.innerWidth) / 2)
    const maxY = Math.max(0, (h - window.innerHeight) / 2)
    state.x = Math.min(maxX, Math.max(-maxX, state.x))
    state.y = Math.min(maxY, Math.max(-maxY, state.y))
  }

  // Scale to `next` while keeping whatever sits under (fx, fy) pinned there.
  const zoomAt = (next, fx, fy, animate = false) => {
    const target = clampScale(next)
    const c = layoutCenter()
    const k = target / state.scale
    state.x = fx - c.x - (fx - c.x - state.x) * k
    state.y = fy - c.y - (fy - c.y - state.y) * k
    state.scale = target
    if (target === MIN_SCALE) { state.x = 0; state.y = 0 }
    clampPan()
    img.style.transition = animate ? EASE : 'none'
    apply()
  }

  const reset = (animate = false) => {
    state.scale = MIN_SCALE
    state.x = 0
    state.y = 0
    img.style.transition = animate ? EASE : 'none'
    apply()
  }

  const snapshot = () => {
    const pts = [...pointers.values()]
    if (!pts.length) { gesture = null; return }
    gesture = {
      scale: state.scale,
      x: state.x,
      y: state.y,
      center: layoutCenter(),
      span: pts.length > 1 ? distance(pts[0], pts[1]) : 0,
      focal: pts.length > 1 ? midpoint(pts[0], pts[1]) : { ...pts[0] },
    }
  }

  const toggleZoom = (fx, fy) => {
    dismissHint()
    if (state.scale > 1.05) reset(true)
    else zoomAt(2.5, fx, fy, true)
  }

  /* --------------------------------------------------------------- events */
  img.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Touch/pen only: preventDefault here would also swallow the synthesized
    // mouse events desktop double-click relies on.
    if (e.pointerType !== 'mouse') e.preventDefault()
    try { img.setPointerCapture(e.pointerId) } catch { /* already captured */ }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    dragged = false
    img.style.transition = 'none'
    snapshot()
  })

  img.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.values()]
    e.preventDefault()

    if (pts.length > 1) {
      const span = distance(pts[0], pts[1])
      if (!gesture.span) { snapshot(); return }
      const target = clampScale(gesture.scale * (span / gesture.span))
      const k = target / gesture.scale
      const f = midpoint(pts[0], pts[1])
      const c = gesture.center
      // pinch pans with the midpoint as well as scaling — that's what makes
      // it feel like the picture is stuck to the fingers
      state.x = f.x - c.x - (gesture.focal.x - c.x - gesture.x) * k
      state.y = f.y - c.y - (gesture.focal.y - c.y - gesture.y) * k
      state.scale = target
      dragged = true
      dismissHint()
      clampPan()
      apply()
      return
    }

    if (state.scale > 1.01) {
      const dx = pts[0].x - gesture.focal.x
      const dy = pts[0].y - gesture.focal.y
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragged = true
      state.x = gesture.x + dx
      state.y = gesture.y + dy
      clampPan()
      apply()
    }
  })

  const endPointer = (e) => {
    if (!pointers.has(e.pointerId)) return
    pointers.delete(e.pointerId)
    try { img.releasePointerCapture(e.pointerId) } catch { /* already gone */ }

    if (pointers.size > 0) {
      snapshot() // pinch -> drag handover keeps the remaining finger anchored
      return
    }
    gesture = null

    // A pinch that ended below 1x settles back to fit
    if (state.scale <= 1.02) reset(true)

    if (!dragged && e.type === 'pointerup' && e.pointerType !== 'mouse') {
      const now = performance.now()
      const near =
        Math.abs(e.clientX - lastTap.x) < DOUBLE_TAP_SLOP &&
        Math.abs(e.clientY - lastTap.y) < DOUBLE_TAP_SLOP
      if (now - lastTap.t < DOUBLE_TAP_MS && near) {
        toggleZoom(e.clientX, e.clientY)
        lastTap = { t: 0, x: 0, y: 0 }
      } else {
        lastTap = { t: now, x: e.clientX, y: e.clientY }
      }
    }
  }

  img.addEventListener('pointerup', endPointer)
  img.addEventListener('pointercancel', endPointer)

  img.addEventListener('dblclick', (e) => {
    e.preventDefault()
    toggleZoom(e.clientX, e.clientY)
  })

  // Trackpad pinch arrives as ctrl+wheel; a plain wheel zooms too, since the
  // page behind the overlay is frozen anyway.
  lightbox.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      dismissHint()
      zoomAt(state.scale * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY)
    },
    { passive: false }
  )

  // Dragging a magnified image past its edge must not read as "clicked the
  // backdrop" — the host pages close on exactly that.
  lightbox.addEventListener(
    'click',
    (e) => {
      if (dragged) {
        e.stopPropagation()
        dragged = false
      }
    },
    true
  )

  /* ---------------------------------------------------------- auto-reset */
  // The host pages just assign a new src or flip aria-hidden; observing that
  // keeps this module independent of each page's own lightbox plumbing.
  new MutationObserver(() => reset()).observe(img, {
    attributes: true,
    attributeFilter: ['src'],
  })

  new MutationObserver(() => {
    if (lightbox.getAttribute('aria-hidden') === 'true') {
      reset()
      hintEl?.classList.remove('is-gone')
    }
  }).observe(lightbox, { attributes: true, attributeFilter: ['aria-hidden'] })

  window.addEventListener('resize', () => reset())

  reset()
  return { reset, zoomAt }
}
