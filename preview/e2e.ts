/**
 * Live checkout against a real backend, no stubs:
 *
 *   /e2e.html?api=http://localhost:8081&session=cs_...
 *
 * Create the session on the server (POST /v1/checkout/sessions with an API key)
 * and pass its `session_secret`. With the backend's `stub` provider, the number's
 * last digits pick the outcome (see adapters/psp/stub). Events are written to
 * `window.__events` so a script can assert on them.
 */
import { createApp, defineComponent, h, ref } from 'vue';
import ReevitCheckout from '../src/components/ReevitCheckout.vue';
import '../src/styles.css';

const params = new URLSearchParams(location.search);
const events: string[] = [];
(window as unknown as { __events: string[] }).__events = events;

const App = defineComponent({
  setup() {
    const open = ref(true);
    return () =>
      h(
        ReevitCheckout,
        {
          isOpen: open.value,
          sessionSecret: params.get('session') || '',
          apiBaseUrl: params.get('api') || 'http://localhost:8080',
          reference: 'ORD-24817',
          paymentMethods: ['card', 'mobile_money', 'bank_transfer'],
          successDelayMs: 600000,
          theme: { companyName: 'Kente & Co.' },
          onSuccess: (r: { paymentId: string }) => events.push(`success:${r.paymentId}`),
          onError: (e: { code: string }) => events.push(`error:${e.code}`),
          onClose: () => {
            open.value = false;
            events.push('close');
          },
        },
        { default: () => [h('span', { hidden: true })] },
      );
  },
});

createApp(App).mount('#root');
