/* =========================================================================
   Google Analytics 4

   One place to configure tracking for every page. Each entry script calls
   initAnalytics() once; GA4 then reports pageviews, geography, device,
   referrer and engagement time on its own.

   On top of the defaults we send two events that map to what this site is
   actually for:
     · email_click / phone_click — someone reached out
     · image_open               — someone opened a gallery image fullscreen

   -------------------------------------------------------------------------
   SETUP: replace the placeholder below with the Measurement ID from
   Google Analytics (Admin -> Data Streams -> your web stream). It looks
   like G-ABC1234XYZ. Nothing is loaded until a real ID is present.

   On Vercel you can instead set an environment variable named VITE_GA_ID
   and leave this line alone — the env var wins.
   ========================================================================= */

const GA_ID = (import.meta.env.VITE_GA_ID || 'G-ZQLBX2S243').trim()

const CONFIGURED = /^G-[A-Z0-9]{6,}$/.test(GA_ID) && GA_ID !== 'G-XXXXXXXXXX'

window.dataLayer = window.dataLayer || []
function gtag() {
  // gtag insists on the real `arguments` object — no rest/spread here
  window.dataLayer.push(arguments)
}

/** Send a custom event. No-op until a Measurement ID is configured. */
export function trackEvent(name, params = {}) {
  if (!CONFIGURED) return
  gtag('event', name, params)
}

/* --------------------------------------------------------- contact intent */
function watchContactLinks() {
  // Capture phase: some cards animate or navigate on click, and we want the
  // event recorded either way.
  document.addEventListener(
    'click',
    (e) => {
      const link = e.target.closest?.('a[href^="mailto:"], a[href^="tel:"]')
      if (!link) return
      const href = link.getAttribute('href')
      trackEvent(href.startsWith('mailto:') ? 'email_click' : 'phone_click', {
        link_url: href,
        link_text: link.textContent.trim().slice(0, 100),
        page_path: location.pathname,
      })
    },
    true
  )
}

/* ------------------------------------------------------- gallery lightbox */
function watchLightbox() {
  const lightbox = document.getElementById('lightbox')
  if (!lightbox) return
  let wasOpen = lightbox.getAttribute('aria-hidden') === 'false'
  new MutationObserver(() => {
    const isOpen = lightbox.getAttribute('aria-hidden') === 'false'
    if (isOpen && !wasOpen) {
      trackEvent('image_open', { page_path: location.pathname })
    }
    wasOpen = isOpen
  }).observe(lightbox, { attributes: true, attributeFilter: ['aria-hidden'] })
}

/* -------------------------------------------------------------- bootstrap */
export function initAnalytics() {
  if (!CONFIGURED) {
    console.info(
      '[analytics] no GA4 Measurement ID yet — set VITE_GA_ID or edit GA_ID in src/analytics.js'
    )
    return
  }
  if (document.getElementById('ga4')) return // already booted

  const script = document.createElement('script')
  script.id = 'ga4'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)

  gtag('js', new Date())
  gtag('config', GA_ID)

  watchContactLinks()
  watchLightbox()
}
