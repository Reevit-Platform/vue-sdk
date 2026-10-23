/**
 * Parity harness: renders the real <ReevitCheckout> in one fixed state per URL, with
 * mock intents and NO network calls (providers, Stripe.js and fetch are stubbed here only).
 * Same URL scheme as the React SDK's preview/parity.tsx.
 *
 *   /parity.html?state=list&theme=light&provider=paystack
 *
 * state:    list | opening | stripe | mpesa-phone | mpesa-waiting | mpesa-failed |
 *           loading | processing | failure | receipt | confirm |
 *           Reevit's own mobile money screens (a session with `flow: direct`, frozen clock):
 *           momo-form | momo-wait | momo-declined | momo-insufficient | momo-timeout |
 *           momo-otp | momo-voucher | momo-failover | momo-failover-success | momo-mpesa-wait
 * theme:    light | dark
 * pointer:  1 = start closed and open from a real click on the merchant's Pay button
 *           (what screenshots use, so focus rings behave as for a mouse user)
 * provider: paystack | hubtel | flutterwave | monnify | stripe | mpesa
 */
import { createApp, defineComponent, h, onMounted, ref } from 'vue';
import ReevitCheckout from '../src/components/ReevitCheckout.vue';
import type { PaymentIntent, PaymentMethod } from '@reevit/core';
import '../src/styles.css';
import logoBlack from './img/logo-short-black.png';
import logoWhite from './img/logo-short-white.png';

const params = new URLSearchParams(location.search);
const state = params.get('state') || 'list';
/** Reevit's own mobile money screens, driven through a stubbed session + direct charge API. */
const direct = state.startsWith('momo');
const theme = params.get('theme') === 'dark' ? 'dark' : 'light';

// Mirrors the backend's default provider -> method map.
const PROVIDERS = {
  paystack: { name: 'Paystack', methods: ['card', 'mobile_money', 'bank_transfer'], currency: 'GHS' },
  hubtel: { name: 'Hubtel', methods: ['card', 'mobile_money'], currency: 'GHS' },
  flutterwave: { name: 'Flutterwave', methods: ['card', 'mobile_money', 'bank_transfer'], currency: 'GHS' },
  monnify: { name: 'Monnify', methods: ['card', 'bank_transfer'], currency: 'NGN' },
  mpesa: { name: 'M-Pesa', methods: ['mobile_money'], currency: 'KES' },
  stripe: { name: 'Stripe', methods: ['card'], currency: 'USD' },
} as const;

const provider = (params.get('provider') || (state.startsWith('mpesa') || state === 'momo-mpesa-wait' ? 'mpesa' : state === 'stripe' ? 'stripe' : 'paystack')) as keyof typeof PROVIDERS;
const cfg = PROVIDERS[provider];
const currency = params.get('currency') || (provider === 'monnify' ? 'NGN' : cfg.currency === 'USD' ? 'GHS' : cfg.currency);
const amount = 75500; // GHS 755.00 in minor units

const intent = {
  id: 'pay_preview_1',
  clientSecret: 'cs_preview_1',
  pspPublicKey: 'pk_preview',
  amount,
  currency,
  status: 'pending',
  recommendedPsp: provider,
  availableMethods: ['card', 'mobile_money', 'bank_transfer'],
  availableProviders: [{ provider, name: cfg.name, methods: [...cfg.methods] as PaymentMethod[] }],
} as PaymentIntent;

// What `GET /v1/checkout/sessions/{secret}` answers: the original payment, with per-method flow.
const intentResponse = {
  id: 'pay_preview_session',
  org_id: 'org_preview',
  connection_id: 'conn_preview',
  provider,
  status: 'pending',
  client_secret: 'pfsec_session',
  amount,
  currency,
  fee_amount: 0,
  fee_currency: currency,
  net_amount: amount,
  available_psps: [
    {
      provider,
      name: cfg.name,
      methods: provider === 'mpesa' ? ['mobile_money'] : ['card', 'mobile_money'],
      method_options: [
        provider === 'mpesa'
          ? { method: 'mobile_money', flow: 'direct', networks: ['mpesa'], needs: ['phone'] }
          : { method: 'mobile_money', flow: 'direct', networks: ['mtn', 'telecel', 'airteltigo'], needs: ['phone', 'network'], voucher_networks: ['telecel'] },
        { method: 'card', flow: 'hosted', networks: [], needs: [] },
      ],
    },
  ],
};

// ---- stubs (preview only) ----------------------------------------------------------------------

const never = new Promise<Response>(() => {});

// A frozen clock makes the countdown, the bar and the Resend cooldown the same in every shot.
let clock = Date.parse('2026-10-23T12:00:00Z');
if (direct) Date.now = () => clock;
const at = (offsetMs: number) => new Date(clock + offsetMs).toISOString();
const kesPreview = currency === 'KES';

function directView(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    status: 'pending',
    amount,
    currency,
    method: 'mobile_money',
    provider_display: cfg.name,
    client_secret: 'pfsec_preview',
    next_action: {
      type: 'mobile_money_prompt',
      network: kesPreview ? 'mpesa' : 'mtn',
      phone_masked: kesPreview ? '+254 712 ••• 678' : '024 ••• 8890',
      // The prototype's fast mode runs a 12 s window.
      expires_at: at(12_000),
      attempt: { n: 1, max: 3 },
      can_resend_at: at(-1000),
    },
    rerouted: false,
    poll_after_ms: 2000,
    ...over,
  };
}

const failedDirect = (code: string, category: string) =>
  directView('pay_preview_direct', { status: 'failed', next_action: undefined, poll_after_ms: 0, failure: { code, category, retryable: true, message: 'server wording' } });

function directCharge() {
  switch (state) {
    case 'momo-declined': return failedDirect('not_approved', 'not_approved');
    case 'momo-insufficient': return failedDirect('insufficient_funds', 'insufficient_funds');
    case 'momo-otp':
      return directView('pay_preview_direct', { status: 'requires_action', next_action: { type: 'otp', network: 'mtn', phone_masked: '024 ••• 8890', expires_at: at(120_000), attempt: { n: 1, max: 3 } } });
    case 'momo-voucher':
      return directView('pay_preview_direct', { status: 'requires_action', next_action: { type: 'voucher', network: 'telecel', phone_masked: '020 ••• 8890', expires_at: at(120_000), attempt: { n: 1, max: 3 }, voucher: { ussd: '*110#' } } });
    case 'momo-failover': return directView('pay_preview_direct', { rerouted: true });
    case 'momo-failover-success': return directView('pay_preview_direct', { status: 'succeeded', next_action: undefined, poll_after_ms: 0, rerouted: true });
    case 'momo-timeout': return directView('pay_preview_direct', { next_action: { ...directView('x').next_action, expires_at: at(400) } });
    default: return directView('pay_preview_direct');
  }
}
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
window.fetch = ((input: RequestInfo | URL) => {
  const url = String(input);
  if (direct) {
    if (url.includes('/v1/checkout/sessions/') && url.endsWith('/charge')) {
      // One second and three quarters into the window: "0:11" with the bar where the prototype shot has it.
      if (state === 'momo-wait' || state === 'momo-failover' || state === 'momo-mpesa-wait') setTimeout(() => { clock += 1750; }, 80);
      return json(directCharge());
    }
    if (url.includes('/v1/checkout/sessions/')) return json({ id: 'sess', client_secret: 'x', session_secret: 'cs_preview', payment_intent: intentResponse });
    if (url.endsWith('/status')) return json(directView('pay_preview_direct', { client_secret: undefined }));
  }
  if (url.includes('/confirm-intent')) {
    if (state === 'processing') return never;
    if (state === 'failure') return json({ message: 'Your card was declined. Try another card.' }, 402);
    return json({ id: 'pay_preview_1', status: 'succeeded', provider_ref_id: 'pay_wrvrzjvp' });
  }
  if (url.endsWith('/mpesa')) {
    if (state === 'mpesa-failed') return json({ message: 'The request could not be sent. Try again.' }, 500);
    return json({ checkout_request_id: 'ws_CO_2310202611570001' });
  }
  if (state === 'loading') return never;
  return json({});
}) as typeof fetch;

// The SDK's script loaders resolve immediately when their script tag already exists.
for (const id of ['paystack-script', 'stripe-script']) {
  const tag = document.createElement('script');
  tag.id = id;
  document.head.append(tag);
}

const pending = state === 'opening' || state === 'confirm';
window.PaystackPop = class {
  newTransaction() {}
  resumeTransaction(_code: string, cb: { onSuccess?: (r: unknown) => void }) {
    if (pending) return; // provider window stays open
    queueMicrotask(() => cb.onSuccess?.({ reference: 'pay_wrvrzjvp', trans: '1', status: 'success', message: 'ok', transaction: 'txn_1', trxref: 'pay_wrvrzjvp' }));
  }
} as unknown as typeof window.PaystackPop;

// Stripe: a stand-in for the Payment Element that follows the appearance object the SDK passes in.
type Appearance = { variables?: Record<string, string>; rules?: Record<string, Record<string, string>> };
(window as any).Stripe = () => ({
  elements: ({ appearance }: { appearance?: Appearance }) => ({
    create: () => {
      let host: HTMLElement | null = null;
      const v = appearance?.variables ?? {};
      const input = appearance?.rules?.['.Input'] ?? {};
      const label = appearance?.rules?.['.Label'] ?? {};
      const field = (name: string, placeholder: string) =>
        `<div style="margin-bottom:${v.spacingGridRow}"><div style="font-size:${label.fontSize};font-weight:${label.fontWeight};margin-bottom:${label.marginBottom};color:${label.color}">${name}</div>` +
        `<div style="height:${input.height};padding:0 14px;display:flex;align-items:center;border:${input.border};border-radius:${v.borderRadius};background:${input.backgroundColor};font-size:${input.fontSize};color:${v.colorTextPlaceholder}">${placeholder}</div></div>`;
      return {
        mount(el: HTMLElement) {
          host = el;
          el.style.fontFamily = v.fontFamily ?? '';
          el.innerHTML = field('Card number', '1234 1234 1234 1234') +
            `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${v.spacingGridColumn}">${field('Expiration date', 'MM / YY')}${field('Security code', 'CVC')}</div>`;
        },
        unmount() {},
        destroy() { if (host) host.innerHTML = ''; },
        on(event: string, handler: () => void) { if (event === 'ready') setTimeout(handler, 0); },
      };
    },
    submit: async () => ({}),
    getElement: () => null,
  }),
  confirmPayment: async () => ({ paymentIntent: { id: 'pi_preview', status: 'succeeded' } }),
});

// ---- drive the widget into the requested state -------------------------------------------------

async function drive() {
  const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
  const click = (sel: string) => $(sel)?.click();
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await wait(60);
  if (['opening', 'stripe', 'processing', 'failure', 'receipt', 'confirm'].includes(state)) {
    click('[data-reevit="row"][data-method="card"]');
  }
  if (state === 'confirm') {
    await wait(150);
    click('[data-reevit="close"]');
  }
  if (state === 'mpesa-waiting' || state === 'mpesa-failed') {
    await wait(60);
    click('[data-reevit="momo-form"] [data-reevit="cta"]');
  }
  if (direct) {
    // M-Pesa is the only method, so there is no list to pick from.
    if (state !== 'momo-mpesa-wait') click('[data-reevit="row"][data-method="mobile_money"]');
    await wait(120);
    if (state === 'momo-voucher') {
      const input = $<HTMLInputElement>('[data-reevit="momo-form"] input');
      if (input) {
        input.value = '0201234567';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await wait(60);
    }
    if (state !== 'momo-form') click('[data-reevit="momo-form"] [data-reevit="cta"]');
    await wait(state === 'momo-timeout' ? 2200 : 500);
  }
  document.documentElement.dataset.ready = state;
}

// The Vue SDK teleports its dialog to <body>. The React SDK renders in place, inside the fake
// merchant frame; this keeps the two screenshots comparable by moving the teleported root into
// the frame (whose transform makes the dialog's position:fixed resolve against the frame).
function keepDialogInFrame() {
  const frame = () => document.getElementById('frame');
  const adopt = (node: Node) => {
    if (node instanceof HTMLElement && node.classList.contains('reevit-root') && frame() && node.parentElement !== frame()) {
      // Moving a node blurs whatever is focused inside it; give focus back.
      const active = document.activeElement;
      frame()!.append(node);
      if (active instanceof HTMLElement && node.contains(active)) active.focus({ preventScroll: true });
    }
  };
  new MutationObserver((records) => records.forEach((r) => r.addedNodes.forEach(adopt))).observe(document.body, { childList: true });
}
keepDialogInFrame();

const Merchant = defineComponent({
  props: { showPay: Boolean },
  emits: ['pay'],
  setup(props, { emit }) {
    return () =>
      h('div', { class: 'mx' }, [
        h('div', { class: 'mx-nav' }, [h('img', { src: logoBlack, alt: '' }), h('b', 'Kente & Co.'), h('span', 'Cart · 3')]),
        h('main', { class: 'mx-main' }, [
          h('div', { class: 'mx-ph', role: 'img', 'aria-label': 'Product photo' }),
          h('div', [
            h('h1', 'Your basket'),
            h('p', { class: 'mx-p' }, `${currency} 755.00`),
            h('div', { class: 'mx-li' }, [h('span', 'Adinkra throw, hand-loomed'), h('i', `${currency} 480.00`)]),
            h('div', { class: 'mx-li' }, [h('span', 'Kente table runner × 2'), h('i', `${currency} 250.00`)]),
            h('div', { class: 'mx-li' }, [h('span', 'Delivery'), h('i', `${currency} 25.00`)]),
            props.showPay
              ? h('button', { class: 'mx-pay', type: 'button', onClick: () => emit('pay') }, `Pay ${currency} 755.00`)
              : null,
          ]),
        ]),
      ]);
  },
});

const App = defineComponent({
  setup() {
    const needsClick = params.get('pointer') === '1';
    const open = ref(!needsClick);
    onMounted(() => { if (open.value) void drive(); });
    return () =>
      h('div', { class: 'stage' }, [
        h('div', { class: 'frame', id: 'frame' }, [
          h(Merchant, { showPay: !open.value, onPay: () => { open.value = true; void drive(); } }),
          h(
            ReevitCheckout,
            {
              isOpen: open.value,
              onClose: () => { open.value = false; },
              ...(direct ? { sessionSecret: 'cs_preview' } : { publicKey: 'pfk_test_preview', amount, currency }),
              reference: 'ORD-24817',
              email: 'ama.owusu@example.com',
              phone: provider === 'mpesa' ? '0712345678' : '0244128890',
              paymentMethods: ['card', 'mobile_money', 'bank_transfer'],
              initialPaymentIntent: state === 'loading' || direct ? undefined : intent,
              successDelayMs: 600000,
              theme: { companyName: 'Kente & Co.', logoUrl: theme === 'dark' ? logoWhite : logoBlack, darkMode: theme === 'dark' },
            },
            // An empty slot would fall back to the default "Pay Now" trigger; the merchant owns the button here.
            { default: () => [h('span', { hidden: true })] }
          ),
        ]),
      ]);
  },
});

createApp(App).mount('#root');
