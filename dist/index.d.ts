import { CheckoutState } from '@reevit/core';
import { cn } from '@reevit/core';
import { ComponentOptionsMixin } from 'vue';
import { ComponentProvideOptions } from 'vue';
import { createReevitClient } from '@reevit/core';
import { DefineComponent } from 'vue';
import { detectCountryFromCurrency } from '@reevit/core';
import { detectNetwork } from '@reevit/core';
import { formatAmount } from '@reevit/core';
import { formatPhone } from '@reevit/core';
import { MobileMoneyFormData } from '@reevit/core';
import { MobileMoneyNetwork } from '@reevit/core';
import { PaymentError } from '@reevit/core';
import { PaymentIntent } from '@reevit/core';
import { PaymentMethod } from '@reevit/core';
import { PaymentResult } from '@reevit/core';
import { PSPType } from '@reevit/core';
import { PublicProps } from 'vue';
import { ReevitAPIClient } from '@reevit/core';
import { ReevitCheckoutCallbacks } from '@reevit/core';
import { ReevitCheckoutConfig } from '@reevit/core';
import { ReevitTheme } from '@reevit/core';
import { Ref } from 'vue';
import { validatePhone } from '@reevit/core';

declare const __VLS_component: DefineComponent<__VLS_Props, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {} & {
success: (result: any) => any;
error: (error: any) => any;
close: () => any;
}, string, PublicProps, Readonly<__VLS_Props> & Readonly<{
onSuccess?: ((result: any) => any) | undefined;
onError?: ((error: any) => any) | undefined;
onClose?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, ComponentProvideOptions, false, {}, HTMLDivElement>;

declare type __VLS_Props = {
    publicKey: string;
    amount: number;
    currency: string;
    email?: string;
    phone?: string;
    reference?: string;
    metadata?: Record<string, unknown>;
    paymentMethods?: ('card' | 'mobile_money' | 'bank_transfer')[];
    theme?: ReevitTheme;
    isOpen?: boolean;
};

declare type __VLS_Props_2 = {
    methods: PaymentMethod[];
    selected: PaymentMethod | null;
    amount: number;
    currency: string;
};

declare type __VLS_Props_3 = {
    initialPhone?: string;
    loading?: boolean;
};

declare function __VLS_template(): {
    attrs: Partial<{}>;
    slots: {
        default?(_: {
            open: () => void;
            isLoading: boolean;
        }): any;
        'button-text'?(_: {}): any;
    };
    refs: {};
    rootEl: HTMLDivElement;
};

declare type __VLS_TemplateResult = ReturnType<typeof __VLS_template>;

declare type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};

export { CheckoutState }

export { cn }

/**
 * Confirms a Stripe PaymentIntent using Elements
 */
export declare function confirmStripePayment(config: StripeConfig & {
    elements: StripeElements;
}): Promise<void>;

export { createReevitClient }

/**
 * Creates a Stripe instance for payment processing
 * Returns the Stripe instance for use with Elements
 */
export declare function createStripeInstance(publishableKey: string): Promise<StripeInstance>;

export { detectCountryFromCurrency }

export { detectNetwork }

export declare interface FlutterwaveConfig {
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

export { formatAmount }

export { formatPhone }

export declare interface HubtelConfig {
    clientId: string;
    purchaseDescription: string;
    amount: number;
    callbackUrl?: string;
    customerPhone?: string;
    customerEmail?: string;
    onSuccess: (response: Record<string, unknown>) => void;
    onClose: () => void;
}

/**
 * Initiates M-Pesa STK Push via your backend
 * The actual push is server-side; this handles the UI flow.
 */
export declare function initiateMPesaSTKPush(config: MPesaConfig, apiEndpoint: string): Promise<MPesaSTKPushResult>;

/**
 * Loads the Flutterwave checkout script
 */
export declare function loadFlutterwaveScript(): Promise<void>;

/**
 * Loads the Hubtel checkout script
 */
export declare function loadHubtelScript(): Promise<void>;

/**
 * Loads the Monnify SDK script
 */
export declare function loadMonnifyScript(): Promise<void>;

/**
 * Loads the Paystack inline script
 */
export declare function loadPaystackScript(): Promise<void>;

/**
 * Loads the Stripe.js script
 */
export declare function loadStripeScript(): Promise<void>;

export declare const MobileMoneyForm: DefineComponent<__VLS_Props_3, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {} & {
submit: (data: MobileMoneyFormData) => any;
}, string, PublicProps, Readonly<__VLS_Props_3> & Readonly<{
onSubmit?: ((data: MobileMoneyFormData) => any) | undefined;
}>, {}, {}, {}, {}, string, ComponentProvideOptions, false, {}, HTMLFormElement>;

export { MobileMoneyFormData }

export { MobileMoneyNetwork }

export declare interface MonnifyConfig {
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

export declare interface MPesaConfig {
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
 * M-Pesa STK Push
 * Note: M-Pesa uses server-to-server STK Push, the customer receives a prompt on their phone.
 * This function handles the UI state while waiting for the push to be accepted.
 */
export declare interface MPesaSTKPushResult {
    status: 'initiated' | 'success' | 'failed' | 'cancelled';
    message?: string;
    transactionId?: string;
}

/**
 * Opens Flutterwave modal
 */
export declare function openFlutterwaveModal(config: FlutterwaveConfig): Promise<void>;

/**
 * Opens Hubtel popup
 */
export declare function openHubtelPopup(config: HubtelConfig): Promise<void>;

/**
 * Opens Monnify payment modal
 */
export declare function openMonnifyModal(config: MonnifyConfig): Promise<void>;

/**
 * Opens Paystack popup
 */
export declare function openPaystackPopup(config: PaystackConfig): Promise<void>;

export { PaymentError }

export { PaymentIntent }

export { PaymentMethod }

export declare const PaymentMethodSelector: DefineComponent<__VLS_Props_2, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {} & {
select: (method: PaymentMethod) => any;
}, string, PublicProps, Readonly<__VLS_Props_2> & Readonly<{
onSelect?: ((method: PaymentMethod) => any) | undefined;
}>, {}, {}, {}, {}, string, ComponentProvideOptions, false, {}, HTMLDivElement>;

export { PaymentResult }

export declare interface PaystackConfig {
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

export { PSPType }

export { ReevitAPIClient }

export declare const ReevitCheckout: __VLS_WithTemplateSlots<typeof __VLS_component, __VLS_TemplateResult["slots"]>;

export { ReevitCheckoutCallbacks }

export { ReevitCheckoutConfig }

export { ReevitTheme }

declare interface StripeCardElement {
    mount: (selector: string | HTMLElement) => void;
    unmount: () => void;
    on: (event: string, handler: (e: any) => void) => void;
    destroy: () => void;
}

export declare interface StripeConfig {
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

declare interface StripeElements {
    create: (type: string, options?: Record<string, unknown>) => StripeCardElement;
    getElement: (type: string) => StripeCardElement | null;
}

declare interface StripeInstance {
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

export declare function useReevit(options: UseReevitOptions): {
    status: Readonly<Ref<CheckoutState, CheckoutState>>;
    paymentIntent: Readonly<Ref<    {
    readonly id: string;
    readonly clientSecret: string;
    readonly amount: number;
    readonly currency: string;
    readonly status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
    readonly recommendedPsp: PSPType;
    readonly availableMethods: readonly PaymentMethod[];
    readonly connectionId?: string | undefined;
    readonly provider?: string | undefined;
    readonly feeAmount?: number | undefined;
    readonly feeCurrency?: string | undefined;
    readonly netAmount?: number | undefined;
    readonly metadata?: {
    readonly [x: string]: Readonly<unknown>;
    } | undefined;
    } | null, {
    readonly id: string;
    readonly clientSecret: string;
    readonly amount: number;
    readonly currency: string;
    readonly status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
    readonly recommendedPsp: PSPType;
    readonly availableMethods: readonly PaymentMethod[];
    readonly connectionId?: string | undefined;
    readonly provider?: string | undefined;
    readonly feeAmount?: number | undefined;
    readonly feeCurrency?: string | undefined;
    readonly netAmount?: number | undefined;
    readonly metadata?: {
    readonly [x: string]: Readonly<unknown>;
    } | undefined;
    } | null>>;
    selectedMethod: Readonly<Ref<PaymentMethod | null, PaymentMethod | null>>;
    error: Readonly<Ref<    {
    readonly code: string;
    readonly message: string;
    readonly recoverable?: boolean | undefined;
    readonly originalError?: Readonly<unknown> | undefined;
    readonly details?: {
    readonly [x: string]: Readonly<unknown>;
    } | undefined;
    } | null, {
    readonly code: string;
    readonly message: string;
    readonly recoverable?: boolean | undefined;
    readonly originalError?: Readonly<unknown> | undefined;
    readonly details?: {
    readonly [x: string]: Readonly<unknown>;
    } | undefined;
    } | null>>;
    result: Readonly<Ref<    {
    readonly paymentId: string;
    readonly reference: string;
    readonly amount: number;
    readonly currency: string;
    readonly paymentMethod: PaymentMethod;
    readonly psp: string;
    readonly pspReference: string;
    readonly status: "success" | "pending";
    readonly metadata?: {
    readonly [x: string]: Readonly<unknown>;
    } | undefined;
    } | null, {
    readonly paymentId: string;
    readonly reference: string;
    readonly amount: number;
    readonly currency: string;
    readonly paymentMethod: PaymentMethod;
    readonly psp: string;
    readonly pspReference: string;
    readonly status: "success" | "pending";
    readonly metadata?: {
    readonly [x: string]: Readonly<unknown>;
    } | undefined;
    } | null>>;
    initialize: (method?: PaymentMethod) => Promise<void>;
    selectMethod: (method: PaymentMethod) => void;
    processPayment: (paymentData: Record<string, unknown>) => Promise<void>;
    handlePspSuccess: (pspData: Record<string, unknown>) => Promise<void>;
    handlePspError: (error: PaymentError) => void;
    reset: () => void;
    close: () => Promise<void>;
    isLoading: Readonly<Ref<boolean, boolean>>;
    isReady: Readonly<Ref<boolean, boolean>>;
    isComplete: Readonly<Ref<boolean, boolean>>;
    canRetry: Readonly<Ref<boolean, boolean>>;
};

declare interface UseReevitOptions {
    config: ReevitCheckoutConfig;
    onSuccess?: (result: PaymentResult) => void;
    onError?: (error: PaymentError) => void;
    onClose?: () => void;
    onStateChange?: (state: CheckoutState) => void;
    apiBaseUrl?: string;
}

export { validatePhone }

export { }
