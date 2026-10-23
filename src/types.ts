import type { CheckoutProviderOption, PaymentMethod } from '@reevit/core';

/**
 * How a provider takes one payment method. `direct` means Reevit's own screens
 * collect the number and drive the prompt; `hosted` means the provider's window.
 */
export interface MethodOption {
  method: PaymentMethod;
  flow: 'direct' | 'hosted';
  /** Mobile money networks the provider accepts (`mtn`, `telecel`, `airteltigo`, `mpesa`). */
  networks: string[];
  /** What the shopper must supply: `phone`, `network`, `voucher`. */
  needs: string[];
  /** Networks that need a voucher or OTP before the prompt completes. */
  voucherNetworks: string[];
}

/** A connected provider, with the per-method flow the session reports. Absent `methodOptions` (older backends): every method is hosted. */
export type CheckoutProvider = CheckoutProviderOption & { methodOptions?: MethodOption[] };
