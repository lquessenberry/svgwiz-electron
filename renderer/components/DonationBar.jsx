import React, { useMemo, useState, useEffect, useCallback } from 'react';
import gwizRaw from '../../assets/icons/gwiz.svg?raw';

const DonationBar = () => {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState('free');
  const [installId, setInstallId] = useState('');
  const HAS_PAID = plan && plan !== 'free';

  // Stripe Buy Button environment-driven config (set in .env as VITE_* vars)
  const STRIPE_BUY_BUTTON_ID = import.meta.env.VITE_STRIPE_BUY_BUTTON_ID || '';
  const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  const STRIPE_PAYMENT_LINK_URL = import.meta.env.VITE_STRIPE_PAYMENT_LINK_URL || '';
  const HAS_STRIPE_BUTTON = Boolean(STRIPE_BUY_BUTTON_ID && STRIPE_PUBLISHABLE_KEY);
  const copyPayPal = useCallback(async () => {
    try {
      await navigator.clipboard.writeText('https://paypal.me/lquessenberry');
    } catch (_) {
      // No-op; user can select the visible link text below
    }
  }, []);
  const gwizMarkup = useMemo(() => {
    // strip xml prolog if present
    let markup = String(gwizRaw || '').replace(/<\?xml[^>]*>/, '');
    // ensure the root <svg> gets our classes and a11y attrs
    markup = markup.replace(
      /<svg(\s|>)/,
      '<svg class="h-24 w-auto select-none ion-glow rudolph-glow" aria-hidden="true" focusable="false"$1'
    );
    return markup;
  }, []);

  // Initialize plan/install info and subscribe to updates
  useEffect(() => {
    let unsub = null;
    (async () => {
      try { setPlan(await window.api.getPlan()); } catch (_) {}
      try { setInstallId(await window.api.getInstallId()); } catch (_) {}
      try { unsub = window.api.onPlanUpdated((p) => setPlan(p)); } catch (_) {}
    })();
    return () => { try { unsub && unsub(); } catch (_) {} };
  }, []);

  // Load Stripe Buy Button script on demand when modal opens
  useEffect(() => {
    if (!open || !HAS_STRIPE_BUTTON) return;
    const id = 'stripe-buy-button-js';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id;
      s.async = true;
      s.src = 'https://js.stripe.com/v3/buy-button.js';
      document.head.appendChild(s);
    }
  }, [open, HAS_STRIPE_BUTTON]);

  if (HAS_PAID) return null;

  return (
    <div className="w-full border-t border-border bg-[color:var(--color-surface)]/95 backdrop-blur sticky bottom-14 md:bottom-0 z-20">
      <div className="relative max-w-7xl mx-auto px-3 py-2">
        <div className="absolute inset-0 -z-10 cta-gradient rounded" aria-hidden="true" />

        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <span className="sparkle-host ion-waves-host twitch" aria-hidden="true">
              <span
                dangerouslySetInnerHTML={{ __html: gwizMarkup }}
              />
              {/* Sparkle stars (positions + randomized delays) */}
              <span className="sparkle" style={{ left: '10%', top: '20%', '--d': '3.6s', '--delay': '0.2s' }} />
              <span className="sparkle" style={{ left: '22%', top: '70%', '--d': '4.2s', '--delay': '0.9s' }} />
              <span className="sparkle" style={{ left: '48%', top: '6%',  '--d': '3.2s', '--delay': '1.2s' }} />
              <span className="sparkle" style={{ left: '72%', top: '28%', '--d': '3.8s', '--delay': '0.4s' }} />
              <span className="sparkle" style={{ left: '85%', top: '62%', '--d': '4.6s', '--delay': '1.0s' }} />
              <span className="sparkle" style={{ left: '58%', top: '88%', '--d': '3.9s', '--delay': '1.6s' }} />
            </span>
            <div className="text-left">
              <div className="glitch-text uppercase tracking-wider font-semibold text-sm" data-text="Spare some change?">Spare some change?</div>
              <div className="text-xs opacity-90">Fuel the Hivemind • Keep SVGs clean and mean</div>
            </div>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="relative overflow-hidden px-4 py-2 rounded-md bg-primary text-white shadow-lg shadow-primary/40 hover:scale-[1.03] active:scale-[0.98] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
          >
            I'd buy that for a dollar!
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Donate">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-[min(720px,95vw)] max-h-[90vh] overflow-auto rounded-lg border border-border bg-background text-text shadow-xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-semibold">Hivemind Hall of Fame</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded hover:bg-surface/80"
                  aria-label="Close donation modal"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-sm opacity-90">Choose your path:</p>
                  <ul className="text-sm space-y-2">
                    <li>
                      <strong>PayPal (tip):</strong>{' '}
                      <span className="inline-flex items-center gap-2 align-middle">
                        <span className="font-mono text-xs select-all">paypal.me/lquessenberry</span>
                        <button onClick={copyPayPal} className="underline">Copy</button>
                      </span>
                    </li>
                    <li>
                      <strong>Stripe (full license):</strong>{' '}
                      {HAS_STRIPE_BUTTON ? (
                        <span className="inline-block align-middle">Use the button ➡️</span>
                      ) : STRIPE_PAYMENT_LINK_URL ? (
                        <button
                          onClick={() => { try { window.api.openExternal(STRIPE_PAYMENT_LINK_URL); } catch (_) {} }}
                          className="underline text-left"
                        >
                          Open Stripe Purchase
                        </button>
                      ) : (
                        <span className="opacity-70">Configure Stripe in .env to enable in-app purchase</span>
                      )}
                    </li>
                  </ul>
                  <p className="text-xs text-text-light">After purchase, you'll be redirected back to SVGwiz and the banner will disappear.</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm opacity-90">Recent Assimilations:</p>
                  <div className="border border-border rounded p-3 h-40 overflow-auto text-sm">
                    <div className="opacity-70">No donors yet. Be the first!</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 sm:px-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {HAS_STRIPE_BUTTON && (
                <div className="min-w-[260px]">
                  {/* Stripe Buy Button */}
                  <stripe-buy-button
                    buy-button-id={STRIPE_BUY_BUTTON_ID}
                    publishable-key={STRIPE_PUBLISHABLE_KEY}
                  >
                  </stripe-buy-button>
                </div>
              )}
              <div className="flex-1 text-right">
                <button onClick={() => setOpen(false)} className="px-4 py-2 rounded bg-surface border border-border hover:bg-surface/80">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="pb-[env(safe-area-inset-bottom)] md:pb-0" />
    </div>
  );
};

export default DonationBar;
