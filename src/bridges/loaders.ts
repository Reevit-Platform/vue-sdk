/**
 * PSP Script Loaders
 * Dynamic script loading for PSP popups
 */

import { createReevitClient } from '@reevit/core';
import {
  openHubtelCheckoutUrl,
  startHubtelHostedCheckout,
  warnHubtelBasicAuthIgnored,
  type HubtelCheckoutError,
  type HubtelCheckoutHandle,
} from './hubtelHostedCheckout';

declare global {
  interface Window {
    PaystackPop?: PaystackPopConstructor;
    FlutterwaveCheckout?: (config: Record<string, unknown>) => void;
    Stripe?: (publishableKey: string) => StripeInstance;
    MonnifySDK?: {
      initialize: (config: Record<string, unknown>) => void;
    };
  }
}

// Paystack Inline v2 (js.paystack.co/v2/inline.js). The v1-style
// `PaystackPop.setup()` compat shim SILENTLY DROPS unknown keys — including
// snake_case `access_code` (v2 only recognises camelCase `accessCode`) — so a
// setup() call with an access code creates a brand-new transaction instead of
// resuming the backend-initialized one. Always use the v2 instance API.
interface PaystackPopConstructor {
  new (): PaystackPopInstance;
}

interface PaystackPopInstance {
  newTransaction: (config: PaystackTransactionConfig) => void;
  resumeTransaction: (accessCode: string, callbacks?: PaystackPopupCallbacks) => void;
}

interface PaystackPopupCallbacks {
  onSuccess?: (response: { reference: string; [key: string]: unknown }) => void;
  onCancel?: () => void;
  onError?: (error: { message?: string }) => void;
}

interface PaystackTransactionConfig extends PaystackPopupCallbacks {
  key: string;
  email: string;
  phone?: string;
  amount?: number;
  currency?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
}

interface StripeInstance {
  elements: () => StripeElements;
  confirmCardPayment: (
    clientSecret: string,
    data?: { payment_method?: string | { card: StripeCardElement } }
  ) => Promise<{ error?: { message: string }; paymentIntent?: { id: string; status: string } }>;
  confirmPayment: (options: {
    elements: StripeElements;
    clientSecret: string;
    confirmParams?: { return_url?: string };
    redirect?: 'if_required';
  }) => Promise<{ error?: { message: string }; paymentIntent?: { id: string; status: string } }>;
}

interface StripeElements {
  create: (type: string, options?: Record<string, unknown>) => StripeCardElement;
  getElement: (type: string) => StripeCardElement | null;
}

interface StripeCardElement {
  mount: (selector: string | HTMLElement) => void;
  unmount: () => void;
  on: (event: string, handler: (e: any) => void) => void;
  destroy: () => void;
}

const scriptCache = new Map<string, Promise<void>>();

/**
 * Loads an external script dynamically
 */
function loadScript(url: string, id: string): Promise<void> {
  // Guard against SSR (Nuxt/SSR rendering): there is no DOM on the server, so
  // bail with a clear error instead of a cryptic `document is not defined`
  // ReferenceError. Do this before the cache so the server never populates it.
  if (typeof document === 'undefined') {
    return Promise.reject(
      new Error('Reevit: payment provider scripts can only be loaded in a browser environment'),
    );
  }

  const cached = scriptCache.get(id);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    // Check if already loaded
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${id} script`));
    document.head.appendChild(script);
  });

  scriptCache.set(id, promise);
  return promise;
}

/**
 * Loads the Paystack inline script
 */
export function loadPaystackScript(): Promise<void> {
  return loadScript('https://js.paystack.co/v2/inline.js', 'paystack-script');
}

/**
 * Hubtel opens its hosted checkout page, so there is no script to load.
 * Kept so existing imports keep working.
 */
export function loadHubtelScript(): Promise<void> {
  return Promise.resolve();
}

/**
 * Loads the Flutterwave checkout script
 */
export function loadFlutterwaveScript(): Promise<void> {
  return loadScript('https://checkout.flutterwave.com/v3.js', 'flutterwave-script');
}

/**
 * Loads the Stripe.js script
 */
export function loadStripeScript(): Promise<void> {
  return loadScript('https://js.stripe.com/v3/', 'stripe-script');
}

/**
 * Loads the Monnify SDK script
 */
export function loadMonnifyScript(): Promise<void> {
  return loadScript('https://sdk.monnify.com/plugin/monnify.js', 'monnify-script');
}

export interface PaystackConfig {
  key: string;
  email: string;
  phone?: string;
  amount: number;
  currency: string;
  ref: string;
  accessCode?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
  onSuccess: (response: { reference: string;[key: string]: unknown }) => void;
  onClose: () => void;
  onError?: (error: { message?: string }) => void;
}

export interface HubtelConfig {
  /** Reevit payment id. With `clientSecret`, the SDK fetches the checkout and tracks the outcome. */
  paymentId?: string;
  /** The payment's client secret. */
  clientSecret?: string;
  publicKey?: string;
  apiBaseUrl?: string;
  /** A Hubtel hosted checkout URL you already hold (display only without `paymentId`). */
  checkoutUrl?: string;
  /** Echoed back as `reference` on success. */
  clientReference?: string;
  onSuccess: (response: Record<string, unknown>) => void;
  onClose: () => void;
  onError?: (error: HubtelCheckoutError) => void;
  /** @deprecated Ignored. Hubtel's hosted checkout already knows the merchant. */
  clientId?: string;
  /** @deprecated Ignored. Set when the payment is created. */
  purchaseDescription?: string;
  /** @deprecated Ignored. Set when the payment is created. */
  amount?: number;
  /** @deprecated Ignored. The Reevit API registers Hubtel's callback. */
  callbackUrl?: string;
  /** @deprecated Ignored. Collected on Hubtel's hosted checkout. */
  customerPhone?: string;
  /** @deprecated Ignored. Collected on Hubtel's hosted checkout. */
  customerEmail?: string;
  /** @deprecated Ignored. */
  hubtelSessionToken?: string;
  /**
   * @deprecated Ignored, and never send it: it is the merchant's Hubtel API
   * login (base64 client_id:client_secret). Hubtel checkout no longer needs it.
   */
  basicAuth?: string;
  /** @deprecated Ignored. The shopper picks the method on Hubtel's checkout. */
  preferredMethod?: 'card' | 'mobile_money';
}

export interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    phone_number?: string;
    name?: string;
  };
  payment_options?: string;
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
  meta?: Record<string, unknown>;
  callback: (response: { transaction_id: number; tx_ref: string;[key: string]: unknown }) => void;
  onclose: () => void;
}

export interface StripeConfig {
  publishableKey: string;
  clientSecret: string;
  appearance?: {
    theme?: 'stripe' | 'night' | 'flat';
    variables?: Record<string, string>;
  };
  onSuccess: (response: { paymentIntentId: string; status: string }) => void;
  onError: (error: { message: string }) => void;
}

export interface MonnifyConfig {
  apiKey: string;
  contractCode: string;
  amount: number;
  currency: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  paymentDescription?: string;
  isTestMode?: boolean;
  metadata?: Record<string, unknown>;
  onSuccess: (response: {
    transactionReference: string;
    paymentReference: string;
    [key: string]: unknown
  }) => void;
  onClose: () => void;
  onError?: (error: { message: string }) => void;
}

export interface MPesaConfig {
  phoneNumber: string;
  amount: number;
  reference: string;
  description?: string;
  onInitiated: () => void;
  onSuccess: (response: { transactionId: string;[key: string]: unknown }) => void;
  onError: (error: { message: string }) => void;
}

/**
 * Opens Paystack popup
 */
export async function openPaystackPopup(config: PaystackConfig): Promise<void> {
  await loadPaystackScript();

  if (!window.PaystackPop) {
    throw new Error('Paystack script not loaded');
  }

  const callbacks: PaystackPopupCallbacks = {
    onSuccess: config.onSuccess,
    onCancel: config.onClose,
    onError: (error) => {
      if (config.onError) {
        config.onError(error);
      } else {
        config.onClose();
      }
    },
  };

  const popup = new window.PaystackPop();

  if (config.accessCode) {
    // Resume the transaction the Reevit backend initialized — this is what
    // ties the popup charge to the payment the backend polls/verifies.
    popup.resumeTransaction(config.accessCode, callbacks);
    return;
  }

  popup.newTransaction({
    key: config.key,
    email: config.email,
    phone: config.phone,
    amount: config.amount,
    currency: config.currency,
    reference: config.ref,
    metadata: config.metadata,
    channels: config.channels,
    ...callbacks,
  });
}

/**
 * Opens Hubtel's hosted checkout.
 *
 * With `paymentId` (and `clientSecret`), fetches the checkout the Reevit API
 * created and reports the outcome from Reevit's confirm endpoint. With only
 * `checkoutUrl`, shows that page and calls `onClose` when it is dismissed.
 * Hubtel credentials are never used in the browser.
 */
export async function openHubtelPopup(config: HubtelConfig): Promise<HubtelCheckoutHandle> {
  if (config.basicAuth) {
    warnHubtelBasicAuthIgnored();
  }

  if (config.paymentId) {
    const paymentId = config.paymentId;
    const client = createReevitClient({ publicKey: config.publicKey || '', baseUrl: config.apiBaseUrl });

    return startHubtelHostedCheckout({
      clientSecret: config.clientSecret,
      createSession: async () => {
        if (config.checkoutUrl) {
          return { data: { checkoutUrl: config.checkoutUrl } };
        }
        return client.createHubtelSession(paymentId, config.clientSecret);
      },
      checkStatus: async () => {
        const { data, error } = config.clientSecret
          ? await client.confirmPaymentIntent(paymentId, config.clientSecret)
          : await client.confirmPayment(paymentId);
        return { status: data?.status, error };
      },
      onSuccess: ({ status, checkoutId }) =>
        config.onSuccess({
          paymentId,
          reference: config.clientReference || paymentId,
          pspReference: checkoutId || paymentId,
          status,
          psp: 'hubtel',
        }),
      onError: (error) => (config.onError ? config.onError(error) : config.onClose()),
      onClose: () => config.onClose(),
    });
  }

  if (config.checkoutUrl) {
    return openHubtelCheckoutUrl(config.checkoutUrl, config.onClose);
  }

  const error: HubtelCheckoutError = {
    code: 'HUBTEL_CHECKOUT_URL_REQUIRED',
    message: 'openHubtelPopup needs a paymentId (and clientSecret) or a Hubtel checkoutUrl.',
    recoverable: false,
  };
  if (config.onError) {
    config.onError(error);
  } else {
    config.onClose();
  }
  return { cancel: () => {} };
}

/**
 * Opens Flutterwave modal
 */
export async function openFlutterwaveModal(config: FlutterwaveConfig): Promise<void> {
  await loadFlutterwaveScript();

  if (!window.FlutterwaveCheckout) {
    throw new Error('Flutterwave script not loaded');
  }

  window.FlutterwaveCheckout({
    public_key: config.public_key,
    tx_ref: config.tx_ref,
    amount: config.amount,
    currency: config.currency,
    customer: config.customer,
    payment_options: config.payment_options,
    customizations: config.customizations,
    meta: config.meta,
    callback: config.callback,
    onclose: config.onclose,
  });
}

/**
 * Creates a Stripe instance for payment processing
 * Returns the Stripe instance for use with Elements
 */
export async function createStripeInstance(publishableKey: string): Promise<StripeInstance> {
  await loadStripeScript();

  if (!window.Stripe) {
    throw new Error('Stripe.js not loaded');
  }

  return window.Stripe(publishableKey);
}

/**
 * Confirms a Stripe PaymentIntent using Elements
 */
export async function confirmStripePayment(
  config: StripeConfig & { elements: StripeElements }
): Promise<void> {
  const stripe = await createStripeInstance(config.publishableKey);

  const result = await stripe.confirmPayment({
    elements: config.elements,
    clientSecret: config.clientSecret,
    redirect: 'if_required',
  });

  if (result.error) {
    config.onError({ message: result.error.message || 'Payment failed' });
  } else if (result.paymentIntent) {
    config.onSuccess({
      paymentIntentId: result.paymentIntent.id,
      status: result.paymentIntent.status,
    });
  }
}

/**
 * Opens Monnify payment modal
 */
export async function openMonnifyModal(config: MonnifyConfig): Promise<void> {
  await loadMonnifyScript();

  if (!window.MonnifySDK) {
    throw new Error('Monnify SDK not loaded');
  }

  window.MonnifySDK.initialize({
    amount: config.amount,
    currency: config.currency,
    reference: config.reference,
    customerName: config.customerName,
    customerEmail: config.customerEmail,
    customerMobileNumber: config.customerPhone,
    apiKey: config.apiKey,
    contractCode: config.contractCode,
    paymentDescription: config.paymentDescription || 'Payment',
    isTestMode: config.isTestMode ?? false,
    metadata: config.metadata,
    onComplete: (response: any) => {
      if (response.status === 'SUCCESS') {
        config.onSuccess({
          transactionReference: response.transactionReference,
          paymentReference: response.paymentReference,
          ...response,
        });
      } else {
        config.onError?.({ message: response.message || 'Payment failed' });
      }
    },
    onClose: config.onClose,
  });
}

/**
 * M-Pesa STK Push
 * Note: M-Pesa uses server-to-server STK Push, the customer receives a prompt on their phone.
 * This function handles the UI state while waiting for the push to be accepted.
 */
export interface MPesaSTKPushResult {
  status: 'initiated' | 'success' | 'failed' | 'cancelled';
  message?: string;
  transactionId?: string;
}

/**
 * Initiates M-Pesa STK Push via your backend
 * The actual push is server-side; this handles the UI flow.
 */
export async function initiateMPesaSTKPush(
  config: MPesaConfig,
  apiEndpoint: string
): Promise<MPesaSTKPushResult> {
  // Notify UI that STK push is being initiated
  config.onInitiated();

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: config.phoneNumber,
        amount: config.amount,
        reference: config.reference,
        description: config.description,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || 'Failed to initiate M-Pesa payment';
      config.onError({ message });
      return { status: 'failed', message };
    }

    const data = await response.json();

    // STK Push initiated successfully - customer will receive prompt
    // The actual success will come via webhook
    return {
      status: 'initiated',
      message: 'Please check your phone and enter your M-Pesa PIN to complete the payment.',
      transactionId: data.checkout_request_id || data.transaction_id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    config.onError({ message });
    return { status: 'failed', message };
  }
}
