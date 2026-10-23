import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import type { PaymentMethod } from '@reevit/core';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ReevitCheckout from './ReevitCheckout.vue';

const NUMBER = '712345678';
const E164 = '254712345678';

function intent(id: string, status = 'pending') {
  return {
    id,
    org_id: 'org_1',
    connection_id: 'conn_mpesa',
    provider: 'mpesa',
    method: 'mobile_money',
    status,
    client_secret: `secret_${id}`,
    psp_public_key: '',
    amount: 75500,
    currency: 'KES',
    fee_amount: 0,
    fee_currency: 'KES',
    net_amount: 75500,
    available_psps: [{ provider: 'mpesa', name: 'M-Pesa', methods: ['mobile_money'] }],
  };
}

type Call = { url: string; method: string; body: Record<string, unknown> };

/**
 * A fake backend. `confirm` decides what each confirm-intent poll answers; the
 * default is that the payment stays pending.
 */
function fakeBackend(confirm: (paymentId: string, poll: number) => { status: number; body: unknown } = () => ({ status: 200, body: { status: 'pending' } })) {
  const calls: Call[] = [];
  const polls = new Map<string, number>();
  let selects = 0;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ url, method, body });
    const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status });

    if (url.includes('/confirm-intent')) {
      const id = /payments\/([^/]+)\/confirm-intent/.exec(url)![1];
      const n = (polls.get(id) ?? 0) + 1;
      polls.set(id, n);
      const answer = confirm(id, n);
      return json(answer.status, answer.body);
    }
    if (url.endsWith('/select')) {
      selects += 1;
      return json(200, { payment_intent: intent(`pay_mpesa_${selects}`) });
    }
    if (url.includes('/v1/checkout/sessions/')) {
      return json(200, { id: 'sess', client_secret: 'x', session_secret: 'cs_unused', payment_intent: intent('pay_original') });
    }
    if (url.endsWith('/v1/payments/intents')) {
      return json(201, intent('pay_mpesa_intent'));
    }
    return json(404, { message: 'not found' });
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, polls, fetchMock, confirmCalls: () => calls.filter((c) => c.url.includes('/confirm-intent')) };
}

async function advance(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  await nextTick();
}

async function flush() {
  await advance(0);
}

async function payWithMpesa() {
  await flush();
  await fireEvent.update(screen.getByLabelText('M-Pesa number'), NUMBER);
  await fireEvent.click(screen.getByRole('button', { name: 'Pay KES 755.00' }));
  await flush();
}

// @reevit/core caches intents per session/reference for ten minutes, so every test gets its own.
let seq = 0;
const sessionProps = () => ({ isOpen: true, sessionSecret: `cs_mpesa_${++seq}`, paymentMethods: ['mobile_money'] as PaymentMethod[], successDelayMs: 0 });
const intentProps = () => ({ isOpen: true, publicKey: 'pfk_test', amount: 75500, currency: 'KES', reference: `order_${++seq}`, paymentMethods: ['mobile_money'] as PaymentMethod[], successDelayMs: 0 });

const q = (hook: string) => document.querySelector(`[data-reevit="${hook}"]`) as HTMLElement | null;

describe('M-Pesa completes in the checkout', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends the number with the session selection and never calls the /mpesa route', async () => {
    const backend = fakeBackend();
    render(ReevitCheckout, { props: sessionProps() });
    await payWithMpesa();

    expect(screen.getByText('Approve on your phone')).toBeTruthy();
    const select = backend.calls.find((c) => c.url.endsWith('/select'));
    expect(select?.body).toEqual({ method: 'mobile_money', provider: 'mpesa', phone: E164 });
    expect(backend.calls.some((c) => /\/mpesa(\?|$)/.test(c.url))).toBe(false);
    for (const call of backend.fetchMock.mock.calls) {
      const headers = ((call[1] as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
      expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain('x-reevit-public-key');
      // The number never rides in a URL or in a header.
      expect(String(call[0])).not.toContain(E164);
      expect(JSON.stringify(headers)).not.toContain(E164);
    }
  });

  it('sends the number when the intent is created (public-key mode)', async () => {
    const backend = fakeBackend();
    render(ReevitCheckout, { props: intentProps() });
    await payWithMpesa();

    const intents = backend.calls.filter((c) => c.url.endsWith('/v1/payments/intents'));
    expect(intents.length).toBeGreaterThan(0);
    const mine = intents[intents.length - 1];
    expect((mine.body.metadata as Record<string, unknown>).customer_phone).toBe(E164);
    expect(backend.calls.some((c) => /\/mpesa(\?|$)/.test(c.url))).toBe(false);
  });

  it('keeps waiting while the payment is pending and never reports success', async () => {
    const backend = fakeBackend();
    const { emitted } = render(ReevitCheckout, { props: sessionProps() });
    await payWithMpesa();

    await advance(4000);
    await advance(4000);
    await advance(4000);

    expect(backend.confirmCalls().length).toBe(3);
    expect(screen.getByText('Approve on your phone')).toBeTruthy();
    expect(q('receipt')).toBeNull();
    expect(emitted().success).toBeUndefined();
  });

  it('ends on succeeded with the receipt and delivers success once', async () => {
    fakeBackend((_id, poll) => ({ status: 200, body: { id: 'pay_mpesa_1', status: poll >= 3 ? 'succeeded' : 'pending', provider_ref_id: 'ws_CO_1' } }));
    const { emitted } = render(ReevitCheckout, { props: sessionProps() });
    await payWithMpesa();

    await advance(4000);
    await advance(4000);
    expect(emitted().success).toBeUndefined();
    await advance(4000);
    await flush();

    expect(emitted().success).toHaveLength(1);
    expect((emitted().success[0] as unknown[])[0]).toMatchObject({ paymentId: 'pay_mpesa_1', status: 'success', pspReference: 'ws_CO_1' });
  });

  it('ends on a failed payment with the failure panel and Try again sends a fresh prompt', async () => {
    const backend = fakeBackend((id) => ({ status: 200, body: { id, status: id === 'pay_mpesa_1' ? 'failed' : 'pending' } }));
    const { emitted } = render(ReevitCheckout, { props: sessionProps() });
    await payWithMpesa();

    await advance(4000);

    expect(q('failure')?.textContent).toContain('Payment not approved');
    expect(emitted().success).toBeUndefined();
    expect((emitted().error[0] as unknown[])[0]).toMatchObject({ code: 'PAYMENT_DECLINED' });

    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await flush();

    const selects = backend.calls.filter((c) => c.url.endsWith('/select'));
    expect(selects).toHaveLength(2);
    expect(selects[1].body).toEqual({ method: 'mobile_money', provider: 'mpesa', phone: E164, attempt: 1 });
    expect(screen.getByText('Approve on your phone')).toBeTruthy();
  });

  it('treats a cancelled or expired payment as a terminal failure', async () => {
    fakeBackend(() => ({ status: 200, body: { status: 'expired' } }));
    render(ReevitCheckout, { props: sessionProps() });
    await payWithMpesa();
    await advance(4000);
    expect(q('failure')).not.toBeNull();
  });

  it('gives up at the timeout with the timeout wording and never reports success', async () => {
    const backend = fakeBackend();
    const { emitted } = render(ReevitCheckout, { props: sessionProps() });
    await payWithMpesa();

    await advance(119_000);
    expect(screen.getByText('Approve on your phone')).toBeTruthy();
    await advance(2_000);

    expect(q('failure')?.textContent).toContain('No response in time');
    expect(emitted().success).toBeUndefined();
    expect((emitted().error[0] as unknown[])[0]).toMatchObject({ code: 'PAYMENT_TIMEOUT' });

    const polled = backend.confirmCalls().length;
    await advance(60_000);
    expect(backend.confirmCalls().length).toBe(polled);
  });

  it('backs off after errors and still finishes when the backend recovers', async () => {
    const backend = fakeBackend((_id, poll) =>
      poll <= 3 ? { status: 503, body: { message: 'down' } } : { status: 200, body: { status: 'succeeded' } });
    const { emitted } = render(ReevitCheckout, { props: sessionProps() });
    await payWithMpesa();

    await advance(4000); // poll 1 -> error, next wait 8 s
    expect(backend.confirmCalls().length).toBe(1);
    await advance(7000);
    expect(backend.confirmCalls().length).toBe(1);
    await advance(1000); // poll 2 -> error, next wait 16 s
    expect(backend.confirmCalls().length).toBe(2);
    await advance(16_000); // poll 3 -> error, still 16 s (capped)
    expect(backend.confirmCalls().length).toBe(3);
    await advance(16_000); // poll 4 -> succeeded
    await flush();
    expect(backend.confirmCalls().length).toBeGreaterThanOrEqual(4);
    expect(emitted().success).toHaveLength(1);
  });

  it('stops polling when the checkout is closed', async () => {
    const backend = fakeBackend();
    const props = sessionProps();
    const view = render(ReevitCheckout, { props });
    await payWithMpesa();
    await advance(4000);
    expect(backend.confirmCalls().length).toBe(1);

    await view.rerender({ isOpen: false });
    await advance(30_000);
    expect(backend.confirmCalls().length).toBe(1);
  });

  it('stops polling when the component unmounts', async () => {
    const backend = fakeBackend();
    const view = render(ReevitCheckout, { props: sessionProps() });
    await payWithMpesa();
    await advance(4000);
    view.unmount();
    await advance(30_000);
    expect(backend.confirmCalls().length).toBe(1);
  });
});

describe('ReevitCheckout never treats a pending payment as paid', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete window.PaystackPop;
  });

  async function providerSaysPaid(confirm: (poll: number) => unknown) {
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      document.head.appendChild(script);
    }
    const resumeTransaction = vi.fn();
    window.PaystackPop = class {
      newTransaction = vi.fn();
      resumeTransaction = resumeTransaction;
    } as any;
    let poll = 0;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(confirm(++poll)), { status: 200 })));
    const view = render(ReevitCheckout, {
      props: {
        isOpen: true,
        publicKey: 'pfk_test',
        paymentMethods: ['card'],
        successDelayMs: 0,
        initialPaymentIntent: {
          id: 'pay_mock_1',
          clientSecret: 'cs_mock_1',
          amount: 75500,
          currency: 'GHS',
          status: 'pending',
          recommendedPsp: 'paystack',
          availableMethods: ['card'],
          availableProviders: [{ provider: 'paystack', name: 'Paystack', methods: ['card'] }],
        },
      },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    await flush();
    resumeTransaction.mock.calls[0][1].onSuccess({ reference: 'ref_1', trans: '1', status: 'success', message: 'ok', transaction: 't', trxref: 'ref_1' });
    await flush();
    return view;
  }

  it('keeps checking while the backend says pending, and succeeds once it says succeeded', async () => {
    const { emitted } = await providerSaysPaid((poll) => ({ id: 'pay_mock_1', status: poll >= 3 ? 'succeeded' : 'pending' }));
    expect(emitted().success).toBeUndefined();

    await advance(2500);
    expect(emitted().success).toBeUndefined();
    await advance(2500);

    expect(emitted().success).toHaveLength(1);
    expect((emitted().success[0] as unknown[])[0]).toMatchObject({ status: 'success' });
  });

  it('reports an error, not success, when the backend is still pending after the wait', async () => {
    const { emitted } = await providerSaysPaid(() => ({ id: 'pay_mock_1', status: 'pending' }));

    await advance(25_000);

    expect(emitted().success).toBeUndefined();
    expect((emitted().error[0] as unknown[])[0]).toMatchObject({ code: 'PAYMENT_NOT_CONFIRMED' });
    expect(q('failure')).not.toBeNull();
  });

  it('shows the failure panel, not a receipt, when the backend says the payment failed', async () => {
    const { emitted } = await providerSaysPaid(() => ({ id: 'pay_mock_1', status: 'failed' }));

    expect(emitted().success).toBeUndefined();
    expect((emitted().error[0] as unknown[])[0]).toMatchObject({ code: 'PAYMENT_FAILED' });
    expect(q('failure')).not.toBeNull();
  });
});
