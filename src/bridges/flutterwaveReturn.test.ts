import { afterEach, describe, expect, it, vi } from 'vitest';

import { openFlutterwaveModal, type FlutterwaveConfig } from './loaders';

const base: FlutterwaveConfig = {
  public_key: 'FLWPUBK_TEST',
  tx_ref: 'pay_1',
  amount: 50,
  currency: 'GHS',
  customer: { email: 'a@example.com' },
  callback: () => {},
  onclose: () => {},
};

afterEach(() => {
  delete (window as { FlutterwaveCheckout?: unknown }).FlutterwaveCheckout;
});

describe('openFlutterwaveModal return address', () => {
  const open = async (config: FlutterwaveConfig) => {
    const checkout = vi.fn();
    (window as { FlutterwaveCheckout?: unknown }).FlutterwaveCheckout = checkout;
    // The loader treats an existing script tag as "already loaded": no network in a test.
    if (!document.getElementById('flutterwave-script')) {
      const tag = document.createElement('script');
      tag.id = 'flutterwave-script';
      document.head.appendChild(tag);
    }
    await openFlutterwaveModal(config);
    return checkout.mock.calls[0][0];
  };

  // Flutterwave uses a redirect in place of the callback, so it must be asked for.
  it('sends no redirect_url unless one is given', async () => {
    const sent = await open(base);
    expect('redirect_url' in sent).toBe(false);
    expect(typeof sent.callback).toBe('function');
  });

  it('sends the return address it was given', async () => {
    const sent = await open({ ...base, redirect_url: 'https://shop.example/checkout/return' });
    expect(sent.redirect_url).toBe('https://shop.example/checkout/return');
  });
});
