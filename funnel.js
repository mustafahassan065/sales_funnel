/* ============================================
   EP FITNESS SALES FUNNEL — SHARED JS
   funnel.js
   ============================================ */

// ── CONFIG ──────────────────────────────────
const CONFIG = {
  stripeKey: 'pk_live_YOUR_STRIPE_PUBLISHABLE_KEY', // replace
  fbPixelId:  'YOUR_PIXEL_ID',                       // replace
  gaId:       'G-YOUR_GA_ID',                        // replace
  calendlyUrl:'https://calendly.com/ep_fitness/fitness-assessment-consultation',
  emailCoach: 'epfitness24@gmail.com',
  emailEJ:    'ejukulele@gmail.com',

  // Stripe Price IDs — replace with real ones from your Stripe dashboard
  prices: {
    nutrition_basic:    { php: null,  usd: 'price_USD_NUT_BASIC' },
    nutrition_standard: { php: null,  usd: 'price_USD_NUT_STD'  },
    nutrition_premium:  { php: null,  usd: 'price_USD_NUT_PREM' },
    online_basic:       { php: 'price_PHP_ONL_BASIC',  usd: null },
    online_standard:    { php: 'price_PHP_ONL_STD',    usd: null },
    online_premium:     { php: 'price_PHP_ONL_PREM',   usd: null },
    live_10:            { php: 'price_PHP_LIVE_10',    usd: 'price_USD_LIVE_10'  },
    live_16:            { php: 'price_PHP_LIVE_16',    usd: 'price_USD_LIVE_16'  },
    live_20:            { php: 'price_PHP_LIVE_20',    usd: 'price_USD_LIVE_20'  },
    live_30:            { php: 'price_PHP_LIVE_30',    usd: 'price_USD_LIVE_30'  },
  }
};

// ── ANALYTICS HELPERS ────────────────────────
function trackEvent(name, params = {}) {
  try {
    if (typeof gtag !== 'undefined') gtag('event', name, params);
    if (typeof fbq  !== 'undefined') fbq('track', name === 'purchase' ? 'Purchase' : 'Lead', params);
  } catch(e) { /* silently fail */ }
}

function trackPageView() {
  try {
    if (typeof fbq !== 'undefined') fbq('track', 'PageView');
    if (typeof gtag !== 'undefined') gtag('event', 'page_view');
  } catch(e) {}
}

// ── LOCAL STORAGE HELPERS ────────────────────
function saveToStorage(key, data) {
  try { localStorage.setItem('epf_' + key, JSON.stringify({ ...data, ts: Date.now() })); }
  catch(e) {}
}

function getFromStorage(key) {
  try { return JSON.parse(localStorage.getItem('epf_' + key) || 'null'); }
  catch(e) { return null; }
}

// ── LEAD CAPTURE ────────────────────────────
async function submitLead(data, source = 'funnel') {
  const payload = { ...data, source, timestamp: new Date().toISOString() };
  saveToStorage('last_lead', payload);

  // Save all leads list
  let leads = [];
  try { leads = JSON.parse(localStorage.getItem('epf_leads') || '[]'); } catch(e) {}
  leads.push(payload);
  localStorage.setItem('epf_leads', JSON.stringify(leads));

  // Track
  trackEvent('generate_lead', { method: source });

  // Send to webhook (replace URL with your Make/n8n/Zapier endpoint)
  try {
    await fetch('https://YOUR_WEBHOOK_ENDPOINT', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch(e) { console.log('[EP Fitness] Webhook offline — lead saved locally.'); }

  return payload;
}

// ── STRIPE CHECKOUT ──────────────────────────
async function redirectToCheckout(priceId, leadData) {
  if (!priceId) {
    // No Stripe price configured — fallback to Calendly booking
    window.open(CONFIG.calendlyUrl, '_blank');
    return;
  }
  const stripe = Stripe(CONFIG.stripeKey);
  await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: 'payment',
    successUrl: window.location.origin + '/thankyou.html?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl:  window.location.href,
    customerEmail: leadData?.email || undefined,
    clientReferenceId: leadData?.name || undefined,
  });
}

// ── NAV SCROLL EFFECT ────────────────────────
function initNavScroll() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ── SCROLL REVEAL ────────────────────────────
function initScrollReveal() {
  if (!('IntersectionObserver' in window)) return;
  const els = document.querySelectorAll('[data-reveal]');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.animation = `fadeUp .65s ease ${e.target.dataset.delay || '0s'} both`;
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => {
    el.style.opacity = '0';
    obs.observe(el);
  });
}

// ── COUNTDOWN TIMER ──────────────────────────
function initCountdown(elementId, durationHours = 24) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const STORAGE_KEY = 'epf_cd_end';
  let endTime = parseInt(localStorage.getItem(STORAGE_KEY) || '0');
  if (!endTime || endTime < Date.now()) {
    endTime = Date.now() + durationHours * 3600 * 1000;
    localStorage.setItem(STORAGE_KEY, endTime);
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  const tick = setInterval(() => {
    const diff = Math.max(0, endTime - Date.now());
    const h = Math.floor(diff / 3.6e6);
    const m = Math.floor((diff % 3.6e6) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.innerHTML = `
      <span class="cd-block"><span class="cd-num">${pad(h)}</span><span class="cd-lbl">hrs</span></span>
      <span class="cd-sep">:</span>
      <span class="cd-block"><span class="cd-num">${pad(m)}</span><span class="cd-lbl">min</span></span>
      <span class="cd-sep">:</span>
      <span class="cd-block"><span class="cd-num">${pad(s)}</span><span class="cd-lbl">sec</span></span>`;
    if (diff === 0) clearInterval(tick);
  }, 1000);
}

// ── FORM VALIDATION ──────────────────────────
function validateEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function validatePhone(p) { return /^\+?[\d\s\-()]{7,}$/.test(p); }

function showFieldError(inputEl, msg) {
  clearFieldError(inputEl);
  inputEl.style.borderColor = '#DC2626';
  const err = document.createElement('span');
  err.className = 'field-error';
  err.style.cssText = 'color:#f87171;font-size:.78rem;margin-top:4px;display:block';
  err.textContent = msg;
  inputEl.parentNode.appendChild(err);
}

function clearFieldError(inputEl) {
  inputEl.style.borderColor = '';
  const prev = inputEl.parentNode.querySelector('.field-error');
  if (prev) prev.remove();
}

// ── PACKAGE SELECTION STATE ──────────────────
let selectedPackage = null;

function selectPackage(pkgId, pkgName, price, currency) {
  selectedPackage = { id: pkgId, name: pkgName, price, currency };
  saveToStorage('selected_pkg', selectedPackage);

  // Update all select buttons
  document.querySelectorAll('[data-pkg]').forEach(btn => {
    const active = btn.dataset.pkg === pkgId;
    btn.classList.toggle('btn-primary', active);
    btn.classList.toggle('btn-outline', !active);
    btn.textContent = active ? '✓ Selected' : 'Select Plan';
  });

  // Scroll to CTA / form
  const target = document.getElementById('lead-form-section') || document.getElementById('checkout-section');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });

  trackEvent('select_package', { package: pkgName, value: price, currency });
}

// ── CURRENCY TOGGLE ──────────────────────────
let activeCurrency = 'PHP';

function switchCurrency(cur) {
  activeCurrency = cur;
  document.querySelectorAll('.price-php').forEach(el => el.classList.toggle('hidden', cur !== 'PHP'));
  document.querySelectorAll('.price-usd').forEach(el => el.classList.toggle('hidden', cur !== 'USD'));
  document.querySelectorAll('.pkg-php-only').forEach(el => el.style.display = cur === 'PHP' ? '' : 'none');
  document.querySelectorAll('.pkg-usd-only').forEach(el => el.style.display = cur === 'USD' ? '' : 'none');

  // Toggle buttons
  document.querySelectorAll('.cur-btn').forEach(btn => {
    const isActive = btn.dataset.cur === cur;
    btn.classList.toggle('btn-primary', isActive);
    btn.classList.toggle('btn-outline', !isActive);
  });

  // Reset selected package if currency doesn't match
  if (selectedPackage && selectedPackage.currency !== cur) {
    selectedPackage = null;
    document.querySelectorAll('[data-pkg]').forEach(btn => {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
      btn.textContent = 'Select Plan';
    });
  }
}

// ── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  trackPageView();
  initNavScroll();
  initScrollReveal();
});
