/**
 * useReevit composable
 * Core composable for managing Reevit checkout state in Vue 3
 */

import { ref, computed, readonly, watch } from 'vue';
import {
  ReevitAPIClient,
  createInitialState,
  reevitReducer,
  generateReference,
  detectCountryFromCurrency,
  type ReevitCheckoutConfig,
  type CheckoutState,
  type PaymentMethod,
  type PaymentResult,
  type PaymentError,
  type PaymentIntent,
  type ReevitState,
  type ReevitAction,
  type PaymentIntentResponse,
  type PSPType,
} from '@reevit/core';

interface UseReevitOptions {
  config: ReevitCheckoutConfig;
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: PaymentError) => void;
  onClose?: () => void;
  onStateChange?: (state: CheckoutState) => void;
  apiBaseUrl?: string;
}

/**
 * Maps PSP provider names from backend to PSP type
 */
function mapProviderToPsp(provider: string): PSPType {
  const providerLower = provider.toLowerCase();
  if (providerLower.includes('paystack')) return 'paystack';
  if (providerLower.includes('hubtel')) return 'hubtel';
  if (providerLower.includes('flutterwave')) return 'flutterwave';
  return 'paystack';
}

/**
 * Maps backend response to PaymentIntent
 */
function mapToPaymentIntent(
  response: PaymentIntentResponse,
  config: ReevitCheckoutConfig
): PaymentIntent {
  return {
    id: response.id,
    clientSecret: response.client_secret,
    amount: response.amount,
    currency: response.currency,
    status: response.status as PaymentIntent['status'],
    recommendedPsp: mapProviderToPsp(response.provider),
    availableMethods: config.paymentMethods || ['card', 'mobile_money'],
    connectionId: response.connection_id,
    provider: response.provider,
    feeAmount: response.fee_amount,
    feeCurrency: response.fee_currency,
    netAmount: response.net_amount,
    metadata: config.metadata,
  };
}

export function useReevit(options: UseReevitOptions) {
  const { config, onSuccess, onError, onClose, onStateChange, apiBaseUrl } = options;

  // Reactive state
  const state = ref<ReevitState>(createInitialState());

  // API client
  const apiClient = new ReevitAPIClient({
    publicKey: config.publicKey,
    baseUrl: apiBaseUrl,
  });

  // Dispatch action to update state
  const dispatch = (action: ReevitAction) => {
    state.value = reevitReducer(state.value, action);
  };

  // Watch for state changes
  watch(
    () => state.value.status,
    (newStatus) => {
      onStateChange?.(newStatus);
    }
  );

  // Initialize payment intent
  const initialize = async (method?: PaymentMethod) => {
    dispatch({ type: 'INIT_START' });

    try {
      const reference = config.reference || generateReference();
      const country = detectCountryFromCurrency(config.currency);
      const paymentMethod = method || config.paymentMethods?.[0] || 'card';

      const { data, error } = await apiClient.createPaymentIntent(
        { ...config, reference },
        paymentMethod,
        country
      );

      if (error) {
        dispatch({ type: 'INIT_ERROR', payload: error });
        onError?.(error);
        return;
      }

      if (!data) {
        const noDataError: PaymentError = {
          code: 'INIT_FAILED',
          message: 'No data received from API',
          recoverable: true,
        };
        dispatch({ type: 'INIT_ERROR', payload: noDataError });
        onError?.(noDataError);
        return;
      }

      const paymentIntent = mapToPaymentIntent(data, { ...config, reference });
      dispatch({ type: 'INIT_SUCCESS', payload: paymentIntent });
    } catch (err) {
      const error: PaymentError = {
        code: 'INIT_FAILED',
        message: err instanceof Error ? err.message : 'Failed to initialize checkout',
        recoverable: true,
        originalError: err,
      };
      dispatch({ type: 'INIT_ERROR', payload: error });
      onError?.(error);
    }
  };

  // Select payment method
  const selectMethod = (method: PaymentMethod) => {
    dispatch({ type: 'SELECT_METHOD', payload: method });
  };

  // Process payment after PSP success
  const processPayment = async (paymentData: Record<string, unknown>) => {
    if (!state.value.paymentIntent || !state.value.selectedMethod) {
      return;
    }

    dispatch({ type: 'PROCESS_START' });

    try {
      const { data, error } = await apiClient.confirmPayment(state.value.paymentIntent.id);

      if (error) {
        dispatch({ type: 'PROCESS_ERROR', payload: error });
        onError?.(error);
        return;
      }

      const result: PaymentResult = {
        paymentId: state.value.paymentIntent.id,
        reference: (paymentData.reference as string) ||
          (state.value.paymentIntent.metadata?.reference as string) || '',
        amount: state.value.paymentIntent.amount,
        currency: state.value.paymentIntent.currency,
        paymentMethod: state.value.selectedMethod,
        psp: state.value.paymentIntent.recommendedPsp,
        pspReference: (paymentData.pspReference as string) ||
          (data?.provider_ref_id as string) || '',
        status: 'success',
        metadata: paymentData,
      };

      dispatch({ type: 'PROCESS_SUCCESS', payload: result });
      onSuccess?.(result);
    } catch (err) {
      const error: PaymentError = {
        code: 'PAYMENT_FAILED',
        message: err instanceof Error ? err.message : 'Payment failed',
        recoverable: true,
        originalError: err,
      };
      dispatch({ type: 'PROCESS_ERROR', payload: error });
      onError?.(error);
    }
  };

  // Handle PSP success
  const handlePspSuccess = async (pspData: Record<string, unknown>) => {
    await processPayment(pspData);
  };

  // Handle PSP error
  const handlePspError = (error: PaymentError) => {
    dispatch({ type: 'PROCESS_ERROR', payload: error });
    onError?.(error);
  };

  // Reset checkout
  const reset = () => {
    dispatch({ type: 'RESET' });
  };

  // Close checkout
  const close = async () => {
    if (state.value.paymentIntent && state.value.status !== 'success') {
      try {
        await apiClient.cancelPaymentIntent(state.value.paymentIntent.id);
      } catch {
        // Silently ignore cancel errors
      }
    }

    dispatch({ type: 'CLOSE' });
    onClose?.();
  };

  // Computed properties
  const status = computed(() => state.value.status);
  const paymentIntent = computed(() => state.value.paymentIntent);
  const selectedMethod = computed(() => state.value.selectedMethod);
  const error = computed(() => state.value.error);
  const result = computed(() => state.value.result);
  const isLoading = computed(() =>
    state.value.status === 'loading' || state.value.status === 'processing'
  );
  const isReady = computed(() =>
    state.value.status === 'ready' ||
    state.value.status === 'method_selected' ||
    state.value.status === 'processing'
  );
  const isComplete = computed(() => state.value.status === 'success');
  const canRetry = computed(() => state.value.error?.recoverable ?? false);

  return {
    // State (readonly refs)
    status: readonly(status),
    paymentIntent: readonly(paymentIntent),
    selectedMethod: readonly(selectedMethod),
    error: readonly(error),
    result: readonly(result),

    // Actions
    initialize,
    selectMethod,
    processPayment,
    handlePspSuccess,
    handlePspError,
    reset,
    close,

    // Computed
    isLoading: readonly(isLoading),
    isReady: readonly(isReady),
    isComplete: readonly(isComplete),
    canRetry: readonly(canRetry),
  };
}
