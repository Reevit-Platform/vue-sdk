import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DirectCharge, DirectChargeState, DirectFailure } from '../composables/useDirectCharge';
import { formatPayerPhone } from '../utils/momo';
import MomoCodePanel from './MomoCodePanel.vue';
import MomoFailurePanel from './MomoFailurePanel.vue';

afterEach(cleanup);

function charge(over: Partial<DirectChargeState> = {}): DirectCharge {
  return {
    state: {
      phase: 'failed',
      attempt: null,
      input: { phone: '0244128890', network: 'mtn' },
      expiresAt: null,
      startedAt: null,
      canResendAt: null,
      failure: null,
      notice: null,
      formNotice: null,
      checking: false,
      resending: false,
      resendClosed: false,
      codeError: null,
      codeKind: null,
      ...over,
    },
    start: vi.fn(),
    check: vi.fn(),
    resend: vi.fn(),
    submitCode: vi.fn(),
    useAnotherNumber: vi.fn(),
    retry: vi.fn(),
    reset: vi.fn(),
    dispose: vi.fn(),
  } as DirectCharge;
}

const failure = (over: Partial<DirectFailure>): DirectFailure => ({
  kind: 'declined',
  title: 'Payment declined',
  message: 'The request wasn’t approved on your phone.',
  retryable: true,
  code: 'declined',
  ...over,
});

const panel = (c: DirectCharge, f: DirectFailure, canChooseAnother = false) => ({ props: { charge: c, failure: f, canChooseAnother } });

describe('formatPayerPhone', () => {
  it('formats Ghana and Kenya numbers the way the form shows them', () => {
    expect(formatPayerPhone('0244128890')).toBe('024 412 8890');
    expect(formatPayerPhone('233244128890')).toBe('024 412 8890');
    expect(formatPayerPhone('254712345678')).toBe('+254 712 345 678');
  });
});

describe('MomoFailurePanel', () => {
  it('declined: Try again retries, Use another number goes back to the form', async () => {
    const c = charge();
    render(MomoFailurePanel, panel(c, failure({}), true));
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(c.retry).toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('button', { name: 'Use another number' }));
    expect(c.useAnotherNumber).toHaveBeenCalled();
  });

  it('timeout: the primary action sends a new prompt', async () => {
    const c = charge();
    render(MomoFailurePanel, panel(c, failure({ kind: 'timeout', title: 'No response in time', message: 'The approval prompt expired.' })));
    await fireEvent.click(screen.getByRole('button', { name: 'Send a new prompt' }));
    expect(c.resend).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Choose another method' })).toBeNull();
  });

  it('timeout with the resend budget spent falls back to Try again', () => {
    render(MomoFailurePanel, panel(charge({ resendClosed: true }), failure({ kind: 'timeout' })));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('out of attempts: no retry, only a way out', async () => {
    const exhausted = failure({ kind: 'exhausted', retryable: false, title: 'No more attempts' });
    const first = render(MomoFailurePanel, panel(charge(), exhausted, true));
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Use another number' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Choose another method' }));
    expect(first.emitted().chooseAnother).toHaveLength(1);
    first.unmount();

    const second = render(MomoFailurePanel, panel(charge(), exhausted, false));
    await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(second.emitted().close).toHaveLength(1);
  });

  it('shows the server line from a refused retry', () => {
    render(MomoFailurePanel, panel(charge({ notice: 'Your earlier payment prompt is still active.' }), failure({})));
    expect(screen.getByRole('status').textContent).toBe('Your earlier payment prompt is still active.');
  });
});

describe('MomoCodePanel', () => {
  const otp = (over: Partial<DirectChargeState> = {}) =>
    charge({
      phase: 'code',
      codeKind: 'otp',
      attempt: { id: 'pay_1', status: 'requires_action', amount: 1, currency: 'GHS', rerouted: false, poll_after_ms: 2000, next_action: { type: 'otp', phone_masked: '024 ••• 8890' } },
      ...over,
    });

  it('has no visible label: the input is named by aria-label, and Continue waits for four digits', async () => {
    const c = otp();
    render(MomoCodePanel, { props: { charge: c } });
    expect(document.querySelector('label')).toBeNull();
    const input = screen.getByLabelText('Code') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    const cta = screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement;
    expect(cta.disabled).toBe(true);
    await fireEvent.update(input, '12a3');
    expect(input.value).toBe('123');
    expect(cta.disabled).toBe(true);
    await fireEvent.update(input, '123456');
    expect(cta.disabled).toBe(false);
    await fireEvent.click(cta);
    expect(c.submitCode).toHaveBeenCalledWith('123456');
  });

  it('voucher: names the field "Voucher code" and shows the dial code only when the server sent one', () => {
    const attempt = (voucher?: { ussd?: string }) => ({
      id: 'pay_1', status: 'requires_action', amount: 1, currency: 'GHS', rerouted: false, poll_after_ms: 2000,
      next_action: { type: 'voucher', voucher },
    });
    const withDial = render(MomoCodePanel, { props: { charge: charge({ phase: 'code', codeKind: 'voucher', attempt: attempt({ ussd: '*110#' }) }) } });
    expect(screen.getByLabelText('Voucher code')).toBeTruthy();
    expect(screen.getByText('*110#')).toBeTruthy();
    withDial.unmount();

    render(MomoCodePanel, { props: { charge: charge({ phase: 'code', codeKind: 'voucher', attempt: attempt() }) } });
    expect(screen.queryByText('*110#')).toBeNull();
    expect(document.body.textContent).not.toContain('Dial');
  });

  it('shows the wrong-code line as an alert', () => {
    render(MomoCodePanel, { props: { charge: otp({ codeError: 'That code wasn’t accepted. 2 tries left.' }) } });
    expect(screen.getByRole('alert').textContent).toBe('That code wasn’t accepted. 2 tries left.');
  });
});
