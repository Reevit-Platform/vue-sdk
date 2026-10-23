import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import type { PaymentIntent, PaymentMethod } from '@reevit/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const packed = import.meta.env.VITE_REEVIT_PACKED_ENTRY
  ? await import(/* @vite-ignore */ import.meta.env.VITE_REEVIT_PACKED_ENTRY)
  : null;
const ReevitCheckout = packed ? packed.ReevitCheckout : (await import('./ReevitCheckout.vue')).default;
const MobileMoneyForm = packed ? packed.MobileMoneyForm : (await import('./MobileMoneyForm.vue')).default;

const SESSION_SECRET = 'cs_checkout_session_secret';

// vitest runs without globals here, so Testing Library cannot auto-clean up.
afterEach(() => {
  cleanup();
});

/** The same fixture the React SDK's server-session test uses. */
function sessionResponse(accessCode: string, method = 'card') {
  return {
    id: 'checkout_session_payment',
    client_secret: accessCode,
    session_secret: SESSION_SECRET,
    payment_intent: {
      id: method === 'card' ? 'pay_initial_card' : 'pay_selected_mobile_money',
      org_id: 'org_123',
      connection_id: 'conn_paystack',
      provider: 'paystack',
      method,
      status: 'requires_action',
      client_secret: accessCode,
      amount: 1000,
      currency: 'GHS',
      fee_amount: 0,
      fee_currency: 'GHS',
      net_amount: 1000,
      available_psps: [
        {
          provider: 'paystack',
          name: 'Paystack',
          methods: ['card', 'mobile_money'],
        },
      ],
    },
  };
}

function installPaystackBridge() {
  if (!document.getElementById('paystack-script')) {
    const script = document.createElement('script');
    script.id = 'paystack-script';
    document.head.appendChild(script);
  }
  const newTransaction = vi.fn();
  const resumeTransaction = vi.fn();
  window.PaystackPop = class {
    newTransaction = newTransaction;
    resumeTransaction = resumeTransaction;
  } as any;
  return { newTransaction, resumeTransaction };
}

describe('ReevitCheckout server-created sessions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.PaystackPop;
  });

  it('renders the session amount and never creates a browser intent', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(sessionResponse('card-only-access-code')), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    render(ReevitCheckout, {
      props: {
        sessionSecret: SESSION_SECRET,
        paymentMethods: ['card', 'mobile_money'],
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: /pay now/i }));

    // The amount comes from the session's payment intent, not from any prop.
    await waitFor(() => {
      expect(screen.getByText(/GH.*10\.00/)).toBeTruthy();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit | undefined];
    expect(String(url)).toContain(`/v1/checkout/sessions/${SESSION_SECRET}`);
    expect(init?.method ?? 'GET').toBe('GET');

    // No intent POST anywhere: the session secret must bypass intent creation entirely.
    for (const call of fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>) {
      expect((call[1]?.method ?? 'GET').toUpperCase()).toBe('GET');
    }
  });

  it('opens the checkout when the parent passes isOpen, without a trigger click', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify(sessionResponse('controlled-access-code')), { status: 200 })
    ));

    render(ReevitCheckout, {
      props: { isOpen: true, sessionSecret: SESSION_SECRET + '_controlled', paymentMethods: ['card', 'mobile_money'] },
    });

    expect(await screen.findByRole('button', { name: 'Mobile money' })).toBeTruthy();
  });

  it('routes to the recommended provider when several support the method, with no processor picker', async () => {
    const { resumeTransaction } = installPaystackBridge();

    const initial = sessionResponse('initial-access-code');
    initial.payment_intent.available_psps = [
      { provider: 'flutterwave', name: 'Flutterwave', methods: ['card', 'mobile_money'] },
      { provider: 'paystack', name: 'Paystack', methods: ['card', 'mobile_money'] },
    ];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(initial), { status: 200 })));

    render(ReevitCheckout, {
      props: {
        isOpen: true,
        sessionSecret: SESSION_SECRET + '_provider',
        paymentMethods: ['card', 'mobile_money'],
        email: 'shopper@example.com',
        phone: '0241234567',
      },
    });

    await screen.findByRole('button', { name: 'Mobile money' });
    expect(screen.queryByRole('button', { name: 'Paystack' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Flutterwave' })).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Mobile money' }));

    // The session's recommended provider is Paystack, so that is the window that opens.
    await waitFor(() => expect(resumeTransaction).toHaveBeenCalledTimes(1));
    expect(document.querySelector('[data-reevit="footer-logo"]')?.getAttribute('data-provider')).toBe('paystack');
  });

  it('never logs the shopper to the console while starting a payment', async () => {
    const { resumeTransaction } = installPaystackBridge();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify(sessionResponse('pii-card-access-code')), { status: 200 })
    ));

    render(ReevitCheckout, {
      props: {
        isOpen: true,
        sessionSecret: SESSION_SECRET + '_pii',
        paymentMethods: ['card', 'mobile_money'],
        email: 'shopper@example.com',
        phone: '0241234567',
      },
    });

    await fireEvent.click(await screen.findByRole('button', { name: 'Card' }));
    await waitFor(() => expect(resumeTransaction).toHaveBeenCalledTimes(1));

    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logSpy).not.toHaveBeenCalled();
    expect(logged).not.toContain('shopper@example.com');
    expect(logged).not.toContain('0241234567');
    expect(logged).not.toContain('pii-card-access-code');
  });

  it('keeps the public-key intent refresh flow working and deduplicates repeated taps', async () => {
    const { resumeTransaction } = installPaystackBridge();

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const intent = body.method === 'mobile_money'
        ? sessionResponse('public-key-mobile-money-code', 'mobile_money').payment_intent
        : sessionResponse('public-key-initial-code').payment_intent;
      return new Response(JSON.stringify(intent), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(ReevitCheckout, {
      props: {
        isOpen: true,
        publicKey: 'pfk_test_public_key',
        amount: 1000,
        currency: 'GHS',
        reference: 'public-key-regression',
        paymentMethods: ['card', 'mobile_money'],
        email: 'public-key-shopper@example.com',
        phone: '0241234567',
      },
    });

    const row = await screen.findByRole('button', { name: 'Mobile money' });
    row.click();
    row.click();

    await waitFor(() => expect(resumeTransaction).toHaveBeenCalledWith(
      'public-key-mobile-money-code',
      expect.any(Object),
    ));
    expect(resumeTransaction).toHaveBeenCalledTimes(1);
    const mobileMoneyCalls = fetchMock.mock.calls.filter(([, init]) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return body.method === 'mobile_money' && body.policy?.allowed_providers?.[0] === 'paystack';
    });
    expect(mobileMoneyCalls).toHaveLength(1);
  });
});


function mockIntent(
  providers: { provider: string; name: string; methods: PaymentMethod[] }[],
  recommendedPsp: PaymentIntent['recommendedPsp'] = 'paystack',
): PaymentIntent {
  return {
    id: 'pay_mock_1',
    clientSecret: 'cs_mock_1',
    amount: 75500,
    currency: 'GHS',
    status: 'pending',
    recommendedPsp,
    availableMethods: ['card', 'mobile_money', 'bank_transfer'],
    availableProviders: providers,
  } as PaymentIntent;
}

const ALL_METHODS: PaymentMethod[] = ['card', 'mobile_money', 'bank_transfer'];
const PAYSTACK_CARD = () => mockIntent([{ provider: 'paystack', name: 'Paystack', methods: ['card'] }]);

function rowLabels() {
  return Array.from(document.querySelectorAll('[data-reevit="row"] .reevit-row-label')).map((n) => n.textContent);
}

const q = (hook: string) => document.querySelector(`[data-reevit="${hook}"]`) as HTMLElement | null;

describe('ReevitCheckout method list and routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.PaystackPop;
    delete window.FlutterwaveCheckout;
  });

  it('shows the union of methods across providers, in card, mobile money, bank order', () => {
    render(ReevitCheckout, {
      props: {
        isOpen: true,
        publicKey: 'pfk_test',
        paymentMethods: ALL_METHODS,
        initialPaymentIntent: mockIntent([
          { provider: 'monnify', name: 'Monnify', methods: ['bank_transfer'] },
          { provider: 'paystack', name: 'Paystack', methods: ['card'] },
          { provider: 'flutterwave', name: 'Flutterwave', methods: ['mobile_money', 'card'] },
        ]),
      },
    });

    expect(rowLabels()).toEqual(['Card', 'Mobile money', 'Bank transfer']);
    expect(screen.queryByRole('button', { name: /Paystack|Flutterwave|Monnify/ })).toBeNull();
  });

  it('only lists methods the merchant allowed and Hubtel can take', () => {
    render(ReevitCheckout, {
      props: {
        isOpen: true,
        publicKey: 'pfk_test',
        paymentMethods: ALL_METHODS,
        initialPaymentIntent: mockIntent(
          [{ provider: 'hubtel', name: 'Hubtel', methods: ['card', 'mobile_money', 'bank_transfer'] }],
          'hubtel',
        ),
      },
    });

    expect(rowLabels()).toEqual(['Card', 'Mobile money']);
  });

  it('falls back to the first provider that supports the method when the recommended one does not', async () => {
    const flutterwave = vi.fn();
    window.FlutterwaveCheckout = flutterwave;
    if (!document.getElementById('flutterwave-script')) {
      const script = document.createElement('script');
      script.id = 'flutterwave-script';
      document.head.appendChild(script);
    }
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));

    render(ReevitCheckout, {
      props: {
        isOpen: true,
        publicKey: 'pfk_test',
        paymentMethods: ALL_METHODS,
        email: 'shopper@example.com',
        initialPaymentIntent: mockIntent([
          { provider: 'paystack', name: 'Paystack', methods: ['card'] },
          { provider: 'flutterwave', name: 'Flutterwave', methods: ['mobile_money'] },
        ], 'paystack'),
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Mobile money' }));
    await waitFor(() => expect(flutterwave).toHaveBeenCalledTimes(1));
    expect(q('footer-logo')?.getAttribute('data-provider')).toBe('flutterwave');
  });

  it('shows the recommended provider in the footer before a method is picked', () => {
    render(ReevitCheckout, {
      props: {
        isOpen: true,
        publicKey: 'pfk_test',
        paymentMethods: ALL_METHODS,
        initialPaymentIntent: mockIntent([
          { provider: 'paystack', name: 'Paystack', methods: ['card'] },
          { provider: 'monnify', name: 'Monnify', methods: ['bank_transfer'] },
        ], 'monnify'),
      },
    });

    expect(q('footer-logo')?.getAttribute('data-provider')).toBe('monnify');
  });

  it('shows the Opening line and a back chevron while the provider window is open, and returns to the list when it is dismissed', async () => {
    const { resumeTransaction } = installPaystackBridge();
    render(ReevitCheckout, {
      props: { isOpen: true, publicKey: 'pfk_test', paymentMethods: ALL_METHODS, initialPaymentIntent: PAYSTACK_CARD() },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    await waitFor(() => expect(resumeTransaction).toHaveBeenCalled());
    expect(q('status')?.textContent).toBe('Opening Paystack…');
    expect(q('panel-title')?.textContent).toBe('Card');
    expect(q('back')).not.toBeNull();

    // The provider reports the shopper dismissed its window.
    resumeTransaction.mock.calls[0][1].onCancel();
    await waitFor(() => expect(q('list')).not.toBeNull());
  });
});

describe('ReevitCheckout receipt', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.PaystackPop;
  });

  async function payThroughPaystack(props: Record<string, unknown>) {
    const { resumeTransaction } = installPaystackBridge();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'pay_mock_1', status: 'succeeded' }), { status: 200 })));
    const view = render(ReevitCheckout, {
      props: {
        isOpen: true,
        publicKey: 'pfk_test',
        paymentMethods: ['card'],
        initialPaymentIntent: PAYSTACK_CARD(),
        ...props,
      },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    await waitFor(() => expect(resumeTransaction).toHaveBeenCalled());
    resumeTransaction.mock.calls[0][1].onSuccess({ reference: 'ref_123', trans: '1', status: 'success', message: 'ok', transaction: 't', trxref: 'ref_123' });
    await screen.findByText('Payment received');
    return view;
  }

  it('shows reference, method, provider and date, then Done fires onSuccess exactly once and closes', async () => {
    const { emitted } = await payThroughPaystack({});

    const receipt = q('receipt') as HTMLElement;
    expect(receipt.textContent).toContain('ref_123');
    expect(receipt.textContent).toContain('Card');
    expect(receipt.textContent).toContain('Paystack');
    expect(emitted().success).toBeUndefined(); // still inside the success delay

    await fireEvent.click(q('done') as HTMLElement);
    expect(emitted().success).toHaveLength(1);
    expect((emitted().success[0] as unknown[])[0]).toMatchObject({ reference: 'ref_123', paymentMethod: 'card' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // Nothing left to deliver it a second time.
    await new Promise((r) => setTimeout(r, 50));
    expect(emitted().success).toHaveLength(1);
  });

  it('auto-closes after successDelayMs and still fires onSuccess only once', async () => {
    const { emitted } = await payThroughPaystack({ successDelayMs: 60 });

    await waitFor(() => expect(emitted().success).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await new Promise((r) => setTimeout(r, 120));
    expect(emitted().success).toHaveLength(1);
  });

  it('delivers the result when the receipt is closed with the X before the delay ends', async () => {
    const { emitted } = await payThroughPaystack({});
    await fireEvent.click(q('close') as HTMLElement);
    expect(emitted().success).toHaveLength(1);
  });
});

describe('ReevitCheckout closing, focus and keyboard', () => {
  beforeEach(() => {
    // Closing cancels the pending intent; answer that call instead of hitting the network.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.PaystackPop;
  });

  const intent = () => mockIntent([{ provider: 'paystack', name: 'Paystack', methods: ['card', 'mobile_money'] }]);
  const base = () => ({ publicKey: 'pfk_test', paymentMethods: ['card', 'mobile_money'], initialPaymentIntent: intent() });

  it('closes straight away from the list, without a confirmation', async () => {
    const { emitted } = render(ReevitCheckout, { props: { isOpen: true, ...base() } });

    await fireEvent.click(q('close') as HTMLElement);
    expect(q('confirm')).toBeNull();
    await waitFor(() => expect(emitted().close).toHaveLength(1));
  });

  it('asks before leaving while a provider window is open, and Keep paying stays', async () => {
    const { resumeTransaction } = installPaystackBridge();
    const { emitted } = render(ReevitCheckout, { props: { isOpen: true, ...base() } });
    await fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    await waitFor(() => expect(resumeTransaction).toHaveBeenCalled());

    await fireEvent.click(q('close') as HTMLElement);
    const confirm = q('confirm');
    expect(confirm).not.toBeNull();
    expect(confirm?.getAttribute('role')).toBe('alertdialog');
    expect(emitted().close).toBeUndefined();

    await fireEvent.click(q('stay') as HTMLElement);
    expect(q('confirm')).toBeNull();
    expect(emitted().close).toBeUndefined();

    await fireEvent.click(q('close') as HTMLElement);
    await fireEvent.click(q('leave') as HTMLElement);
    await waitFor(() => expect(emitted().close).toHaveLength(1));
  });

  it('moves focus to the first method, traps Tab, closes on Escape and returns focus to the opener', async () => {
    const { emitted } = render(ReevitCheckout, { props: base() });
    const opener = screen.getByRole('button', { name: /Pay/ });
    opener.focus();
    await fireEvent.click(opener);

    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(q('title')?.id);
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-reevit="row"]'));
    await waitFor(() => expect(document.activeElement).toBe(rows[0]));

    // Tab from the last control wraps to the first; Shift+Tab from the first wraps to the last.
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button'));
    controls[controls.length - 1].focus();
    await fireEvent.keyDown(document.activeElement as Element, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(controls[0]);
    await fireEvent.keyDown(document.activeElement as Element, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(controls[controls.length - 1]);

    await fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(emitted().close).toHaveLength(1));
    expect(document.activeElement).toBe(opener);
  });

  it('announces the current view in a polite live region', async () => {
    render(ReevitCheckout, { props: { isOpen: true, ...base() } });
    const live = q('live') as HTMLElement;
    expect(live.getAttribute('aria-live')).toBe('polite');
    await waitFor(() => expect(live.textContent).toBe('Choose a payment method'));
  });
});

describe('ReevitCheckout M-Pesa', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mpesaProps = () => ({
    isOpen: true,
    publicKey: 'pfk_test',
    paymentMethods: ['mobile_money'],
    initialPaymentIntent: {
      ...mockIntent([{ provider: 'mpesa', name: 'M-Pesa', methods: ['mobile_money'] }], 'mpesa'),
      currency: 'KES',
    },
  });

  it('asks for the number when M-Pesa is the only method and sends the STK push after Pay', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      return new Response(JSON.stringify(body.phone_number ? { checkout_request_id: 'ws_CO_1' } : {}), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(ReevitCheckout, { props: mpesaProps() });

    // One method, so there is no list and no back button: straight to the number.
    expect(q('list')).toBeNull();
    expect(q('back')).toBeNull();

    const input = screen.getByLabelText('M-Pesa number') as HTMLInputElement;
    await fireEvent.update(input, '712345678');
    expect(input.value).toBe('712 345 678');
    await fireEvent.click(screen.getByRole('button', { name: 'Pay KES 755.00' }));

    await screen.findByText('Approve on your phone');
    const stk = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/mpesa'));
    expect(JSON.parse(String(stk?.[1]?.body))).toMatchObject({ phone_number: '254712345678', amount: 75500 });
  });

  it('rejects a number that is not a Kenyan mobile', async () => {
    render(ReevitCheckout, { props: mpesaProps() });

    await fireEvent.update(screen.getByLabelText('M-Pesa number'), '512345678');
    await fireEvent.click(screen.getByRole('button', { name: 'Pay KES 755.00' }));
    expect(screen.getByRole('alert').textContent).toBe('Enter a valid M-Pesa number');
  });

  it('shows the failed panel with Try again when the request cannot be sent', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'The request could not be sent.' }), { status: 500 })));
    const { emitted } = render(ReevitCheckout, { props: mpesaProps() });

    await fireEvent.update(screen.getByLabelText('M-Pesa number'), '712345678');
    await fireEvent.click(screen.getByRole('button', { name: 'Pay KES 755.00' }));

    await screen.findByText('Payment request failed');
    expect(screen.getByText('The request could not be sent.')).toBeTruthy();
    expect(emitted().error).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });
});

describe('ReevitCheckout Stripe', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.Stripe;
  });

  it('mounts the Payment Element with the Ledger appearance and confirms from the Pay button', async () => {
    if (!document.getElementById('stripe-script')) {
      const script = document.createElement('script');
      script.id = 'stripe-script';
      document.head.appendChild(script);
    }
    const elementsOptions: Array<{ appearance?: { variables?: Record<string, string> } }> = [];
    const confirmPayment = vi.fn(async () => ({ paymentIntent: { id: 'pi_1', status: 'succeeded' } }));
    window.Stripe = (() => ({
      elements: (options: (typeof elementsOptions)[number]) => {
        elementsOptions.push(options);
        return {
          create: () => ({
            mount: () => {},
            unmount: () => {},
            destroy: () => {},
            on: (event: string, handler: () => void) => { if (event === 'ready') setTimeout(handler, 0); },
          }),
          submit: async () => ({}),
          getElement: () => null,
        };
      },
      confirmPayment,
    })) as unknown as typeof window.Stripe;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'pay_mock_1', status: 'succeeded' }), { status: 200 })));

    render(ReevitCheckout, {
      props: {
        isOpen: true,
        publicKey: 'pfk_test',
        paymentMethods: ['card'],
        initialPaymentIntent: mockIntent([{ provider: 'stripe', name: 'Stripe', methods: ['card'] }], 'stripe'),
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    const pay = await screen.findByRole('button', { name: 'Pay GHS 755.00' });
    expect(elementsOptions[0].appearance?.variables?.borderRadius).toBe('12px');

    await fireEvent.click(pay);
    await waitFor(() => expect(confirmPayment).toHaveBeenCalledTimes(1));
    await screen.findByText('Payment received');
  });
});

describe('ReevitCheckout failure', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.PaystackPop;
  });

  it('shows the failure panel with Try again when confirming the payment fails', async () => {
    const { resumeTransaction } = installPaystackBridge();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Card declined' }), { status: 402 })));
    const { emitted } = render(ReevitCheckout, {
      props: { isOpen: true, publicKey: 'pfk_test', paymentMethods: ['card'], initialPaymentIntent: PAYSTACK_CARD() },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    await waitFor(() => expect(resumeTransaction).toHaveBeenCalled());
    resumeTransaction.mock.calls[0][1].onSuccess({ reference: 'ref_x', trans: '1', status: 'success', message: 'ok', transaction: 't', trxref: 'ref_x' });

    await waitFor(() => expect(q('failure')).not.toBeNull());
    expect((q('failure') as HTMLElement).textContent).toContain('Payment failed');
    expect(emitted().error).toHaveLength(1);

    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(q('list')).not.toBeNull());
  });
});

describe('MobileMoneyForm (Ghana)', () => {
  it('detects the network from the number, validates, and submits digits plus network', async () => {
    const { emitted } = render(MobileMoneyForm, { props: { submitLabel: 'Pay GHS 755.00', hideCancel: true } });

    // Nothing typed: the number is rejected.
    await fireEvent.click(screen.getByRole('button', { name: 'Pay GHS 755.00' }));
    expect(screen.getByRole('alert').textContent).toContain('10-digit');
    expect(emitted().submit).toBeUndefined();

    const input = screen.getByLabelText('Mobile money number') as HTMLInputElement;
    await fireEvent.update(input, '0244128890');
    expect(input.value).toBe('024 412 8890');
    expect(screen.getByRole('button', { name: 'MTN' }).getAttribute('aria-pressed')).toBe('true');

    // A manual pick of another network survives further typing within the same operator.
    await fireEvent.click(screen.getByRole('button', { name: 'Telecel' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Pay GHS 755.00' }));
    expect(screen.getByRole('alert').textContent).toContain('doesn’t match');

    await fireEvent.click(screen.getByRole('button', { name: 'MTN' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Pay GHS 755.00' }));
    expect(emitted().submit[0]).toEqual([{ phone: '0244128890', network: 'mtn' }]);
  });
});

describe('ReevitCheckout with Hubtel', () => {
  const CHECKOUT_URL = 'https://pay.hubtel.com/9aa1';
  const DIRECT_URL = 'https://pay.hubtel.com/9aa1/direct';

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    document.querySelectorAll('[data-reevit-hubtel-checkout]').forEach((el) => el.remove());
  });

  it('opens the hosted checkout and never asks for Hubtel credentials', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const confirmStatuses = ['requires_action', 'succeeded', 'succeeded'];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v1/checkout/sessions/')) {
        const session = sessionResponse(CHECKOUT_URL, 'mobile_money');
        session.payment_intent.provider = 'hubtel';
        session.payment_intent.connection_id = 'conn_hubtel';
        session.payment_intent.available_psps = [{ provider: 'hubtel', name: 'Hubtel', methods: ['mobile_money'] }];
        return new Response(JSON.stringify(session), { status: 200 });
      }
      if (url.includes('/v1/payments/hubtel/sessions/')) {
        return new Response(
          JSON.stringify({ paymentId: 'pay_selected_mobile_money', status: 'requires_action', checkoutUrl: CHECKOUT_URL, checkoutDirectUrl: DIRECT_URL, checkoutId: '9aa1' }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ id: 'pay_selected_mobile_money', status: confirmStatuses.shift() ?? 'succeeded' }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { emitted } = render(ReevitCheckout, {
      // A distinct secret: @reevit/core caches session responses per secret.
      props: { sessionSecret: 'cs_hubtel_session_secret', paymentMethods: ['mobile_money'], phone: '0241234567' },
    });

    await fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    // Reevit routes the tap to Hubtel and opens its hosted checkout straight away.
    await fireEvent.click(await screen.findByRole('button', { name: 'Mobile money' }));

    await vi.waitFor(() => {
      const iframe = document.querySelector('[data-reevit-hubtel-checkout] iframe') as HTMLIFrameElement | null;
      expect(iframe?.src).toBe(DIRECT_URL);
    });

    // Two status polls: pending, then succeeded, which closes the frame.
    await vi.advanceTimersByTimeAsync(8000);
    await vi.waitFor(() => expect(document.querySelector('[data-reevit-hubtel-checkout]')).toBeNull());

    // The checkout emits success after its success-screen delay.
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.waitFor(() => expect(emitted().success).toBeTruthy());

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('/v1/payments/hubtel/sessions/pay_selected_mobile_money'))).toBe(true);
    expect(urls.some((url) => url.includes('/confirm-intent'))).toBe(true);
    expect(document.body.innerHTML).not.toContain('basicAuth');
  });
});

describe('ReevitCheckout with Flutterwave', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.FlutterwaveCheckout;
  });

  it.each([
    ['GHS', 5012, 50.12],
    ['NGN', 5012, 50.12],
    ['XOF', 5000, 5000],
    ['XAF', 5000, 5000],
  ])('converts the %s intent amount only at the gateway boundary', async (currency, minor, major) => {
    const checkout = vi.fn();
    window.FlutterwaveCheckout = checkout;
    if (!document.getElementById('flutterwave-script')) {
      const script = document.createElement('script');
      script.id = 'flutterwave-script';
      document.head.appendChild(script);
    }
    const session = sessionResponse('flutterwave-secret');
    session.payment_intent.amount = minor;
    session.payment_intent.currency = currency;
    session.payment_intent.provider = 'flutterwave';
    session.payment_intent.available_psps = [{ provider: 'flutterwave', name: 'Flutterwave', methods: ['card'] }];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(session), { status: 200 })));

    render(ReevitCheckout, { props: {
      sessionSecret: `cs_flutterwave_${currency}`, paymentMethods: ['card'], email: 'shopper@example.com',
    } });
    await fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    await fireEvent.click(await screen.findByRole('button', { name: 'Card' }));

    await waitFor(() => expect(checkout).toHaveBeenCalledTimes(1));
    expect(checkout.mock.calls[0][0]).toMatchObject({ amount: major, currency });
  });
});
