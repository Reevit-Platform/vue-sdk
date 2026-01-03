/**
 * PSP Script Loaders
 * Dynamic script loading for PSP popups
 */

import CheckoutSdk from '@hubteljs/checkout';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: Record<string, unknown>) => {
        openIframe: () => void;
      };
    };
    HubtelCheckout?: {
      initPay: (config: Record<string, unknown>) => void;
    };
    FlutterwaveCheckout?: (config: Record<string, unknown>) => void;
    Stripe?: (publishableKey: string) => StripeInstance;
    MonnifySDK?: {
      initialize: (config: Record<string, unknown>) => void;
    };
  }
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
  return loadScript('https://js.paystack.co/v1/inline.js', 'paystack-script');
}

/**
 * Hubtel now uses npm package @hubteljs/checkout
 * No script loading needed
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
  amount: number;
  currency: string;
  ref: string;
  metadata?: Record<string, unknown>;
  onSuccess: (response: { reference: string;[key: string]: unknown }) => void;
  onClose: () => void;
}

export interface HubtelConfig {
  clientId: string;
  purchaseDescription: string;
  amount: number;
  callbackUrl?: string;
  customerPhone?: string;
  customerEmail?: string;
  onSuccess: (response: Record<string, unknown>) => void;
  onClose: () => void;
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

  const handler = window.PaystackPop.setup({
    key: config.key,
    email: config.email,
    amount: config.amount,
    currency: config.currency,
    ref: config.ref,
    metadata: config.metadata,
    callback: config.onSuccess,
    onClose: config.onClose,
  });

  handler.openIframe();
}

/**
 * Opens Hubtel popup using the @hubteljs/checkout npm package
 */
export async function openHubtelPopup(config: HubtelConfig): Promise<void> {
  const checkout = new CheckoutSdk();

  const purchaseInfo = {
    amount: config.amount,
    purchaseDescription: config.purchaseDescription,
    customerPhoneNumber: config.customerPhone || '',
    clientReference: `hubtel_${Date.now()}`,
  };

  const checkoutConfig = {
    branding: 'enabled' as const,
    callbackUrl: config.callbackUrl || (typeof window !== 'undefined' ? window.location.href : ''),
    merchantAccount: typeof config.clientId === 'string'
      ? parseInt(config.clientId, 10)
      : config.clientId,
    basicAuth: '',
  };

  checkout.openModal({
    purchaseInfo,
    config: checkoutConfig,
    callBacks: {
      onPaymentSuccess: (data: any) => {
        config.onSuccess(data);
        checkout.closePopUp();
      },
      onPaymentFailure: () => {
        config.onClose();
      },
      onClose: () => {
        config.onClose();
      },
    },
  });
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

