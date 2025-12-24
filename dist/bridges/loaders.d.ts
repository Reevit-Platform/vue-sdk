/**
 * PSP Script Loaders
 * Dynamic script loading for PSP popups
 */
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
    confirmCardPayment: (clientSecret: string, data?: {
        payment_method?: string | {
            card: StripeCardElement;
        };
    }) => Promise<{
        error?: {
            message: string;
        };
        paymentIntent?: {
            id: string;
            status: string;
        };
    }>;
    confirmPayment: (options: {
        elements: StripeElements;
        clientSecret: string;
        confirmParams?: {
            return_url?: string;
        };
        redirect?: 'if_required';
    }) => Promise<{
        error?: {
            message: string;
        };
        paymentIntent?: {
            id: string;
            status: string;
        };
    }>;
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
/**
 * Loads the Paystack inline script
 */
export declare function loadPaystackScript(): Promise<void>;
/**
 * Loads the Hubtel checkout script
 */
export declare function loadHubtelScript(): Promise<void>;
/**
 * Loads the Flutterwave checkout script
 */
export declare function loadFlutterwaveScript(): Promise<void>;
/**
 * Loads the Stripe.js script
 */
export declare function loadStripeScript(): Promise<void>;
/**
 * Loads the Monnify SDK script
 */
export declare function loadMonnifyScript(): Promise<void>;
export interface PaystackConfig {
    key: string;
    email: string;
    amount: number;
    currency: string;
    ref: string;
    metadata?: Record<string, unknown>;
    onSuccess: (response: {
        reference: string;
        [key: string]: unknown;
    }) => void;
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
    callback: (response: {
        transaction_id: number;
        tx_ref: string;
        [key: string]: unknown;
    }) => void;
    onclose: () => void;
}
export interface StripeConfig {
    publishableKey: string;
    clientSecret: string;
    appearance?: {
        theme?: 'stripe' | 'night' | 'flat';
        variables?: Record<string, string>;
    };
    onSuccess: (response: {
        paymentIntentId: string;
        status: string;
    }) => void;
    onError: (error: {
        message: string;
    }) => void;
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
        [key: string]: unknown;
    }) => void;
    onClose: () => void;
    onError?: (error: {
        message: string;
    }) => void;
}
export interface MPesaConfig {
    phoneNumber: string;
    amount: number;
    reference: string;
    description?: string;
    onInitiated: () => void;
    onSuccess: (response: {
        transactionId: string;
        [key: string]: unknown;
    }) => void;
    onError: (error: {
        message: string;
    }) => void;
}
/**
 * Opens Paystack popup
 */
export declare function openPaystackPopup(config: PaystackConfig): Promise<void>;
/**
 * Opens Hubtel popup
 */
export declare function openHubtelPopup(config: HubtelConfig): Promise<void>;
/**
 * Opens Flutterwave modal
 */
export declare function openFlutterwaveModal(config: FlutterwaveConfig): Promise<void>;
/**
 * Creates a Stripe instance for payment processing
 * Returns the Stripe instance for use with Elements
 */
export declare function createStripeInstance(publishableKey: string): Promise<StripeInstance>;
/**
 * Confirms a Stripe PaymentIntent using Elements
 */
export declare function confirmStripePayment(config: StripeConfig & {
    elements: StripeElements;
}): Promise<void>;
/**
 * Opens Monnify payment modal
 */
export declare function openMonnifyModal(config: MonnifyConfig): Promise<void>;
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
export declare function initiateMPesaSTKPush(config: MPesaConfig, apiEndpoint: string): Promise<MPesaSTKPushResult>;
export {};
//# sourceMappingURL=loaders.d.ts.map