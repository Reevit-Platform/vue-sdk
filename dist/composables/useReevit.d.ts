import { ReevitCheckoutConfig, CheckoutState, PaymentMethod, PaymentResult, PaymentError, PSPType } from '../../../core/dist/index.d.ts';
interface UseReevitOptions {
    config: ReevitCheckoutConfig;
    onSuccess?: (result: PaymentResult) => void;
    onError?: (error: PaymentError) => void;
    onClose?: () => void;
    onStateChange?: (state: CheckoutState) => void;
    apiBaseUrl?: string;
}
export declare function useReevit(options: UseReevitOptions): {
    status: Readonly<import('vue').Ref<CheckoutState, CheckoutState>>;
    paymentIntent: Readonly<import('vue').Ref<{
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
    selectedMethod: Readonly<import('vue').Ref<PaymentMethod | null, PaymentMethod | null>>;
    error: Readonly<import('vue').Ref<{
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
    result: Readonly<import('vue').Ref<{
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
    isLoading: Readonly<import('vue').Ref<boolean, boolean>>;
    isReady: Readonly<import('vue').Ref<boolean, boolean>>;
    isComplete: Readonly<import('vue').Ref<boolean, boolean>>;
    canRetry: Readonly<import('vue').Ref<boolean, boolean>>;
};
export {};
//# sourceMappingURL=useReevit.d.ts.map