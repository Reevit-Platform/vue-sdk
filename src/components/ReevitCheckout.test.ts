import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ReevitCheckout from './ReevitCheckout.vue';

const SESSION_SECRET = 'cs_checkout_session_secret';

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

describe('ReevitCheckout server-created sessions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
