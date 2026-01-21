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
  generateIdempotencyKey,
  type ReevitCheckoutConfig,
  type CheckoutState,
  type PaymentMethod,
  type PaymentResult,
  type PaymentError,
  type PaymentIntent,
  type ReevitState,
  type ReevitAction,
  type PaymentIntentResponse,
  type CheckoutProviderOption,
  type PSPType,
  type ReevitTheme,
} from '@reevit/core';

const DEFAULT_PUBLIC_API_BASE_URL = 'https://api.reevit.io';

function buildPaymentLinkError(response: Response, data: any): PaymentError {
  return {
    code: data?.code || 'payment_link_error',
    message: data?.message || 'Payment link request failed',
    recoverable: true,
    details: {
      httpStatus: response.status,
      ...(data?.details || {}),
    },
  };
}

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
  if (providerLower.includes('stripe')) return 'stripe';
  if (providerLower.includes('monnify')) return 'monnify';
  if (providerLower.includes('mpesa') || providerLower.includes('m-pesa')) return 'mpesa';
  return 'paystack';
}

function normalizeProviderMethod(method: string): PaymentMethod | null {
  const normalized = method.toLowerCase().trim();
  if (normalized === 'card') return 'card';
  if (normalized === 'mobile_money' || normalized === 'momo' || normalized === 'mobilemoney') {
    return 'mobile_money';
  }
  if (normalized === 'bank' || normalized === 'bank_transfer' || normalized === 'transfer') {
    return 'bank_transfer';
  }
  return null;
}

function mapAvailableProviders(
  providers?: Array<{ provider: string; name: string; methods: string[]; countries?: string[] }>
): CheckoutProviderOption[] | undefined {
  if (!providers || providers.length === 0) return undefined;

  return providers
    .map((provider) => {
      const methods = provider.methods
        .map((method) => normalizeProviderMethod(method))
        .filter(Boolean) as PaymentMethod[];

      return {
        provider: provider.provider,
        name: provider.name,
        methods,
        countries: provider.countries,
      };
    })
    .filter((provider) => provider.methods.length > 0);
}

function normalizeBranding(branding?: Record<string, unknown>): ReevitTheme {
  if (!branding) {
    return {};
  }

  const raw = branding as Record<string, unknown>;
  const theme: Record<string, unknown> = { ...raw };
  const getString = (value: unknown) => (typeof value === 'string' ? value : undefined);
  const getBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

  const setIf = (key: string, value: unknown) => {
    if (value !== undefined) {
      theme[key] = value;
    }
  };

  setIf('logoUrl', getString(raw.logoUrl ?? raw.logo_url));
  setIf('companyName', getString(raw.companyName ?? raw.company_name));
  setIf('primaryColor', getString(raw.primaryColor ?? raw.primary_color));
  setIf('primaryForegroundColor', getString(raw.primaryForegroundColor ?? raw.primary_foreground_color));
  setIf('backgroundColor', getString(raw.backgroundColor ?? raw.background_color));
  setIf('surfaceColor', getString(raw.surfaceColor ?? raw.surface_color));
  setIf('textColor', getString(raw.textColor ?? raw.text_color));
  setIf('mutedTextColor', getString(raw.mutedTextColor ?? raw.muted_text_color));
  setIf('borderRadius', getString(raw.borderRadius ?? raw.border_radius));
  setIf('fontFamily', getString(raw.fontFamily ?? raw.font_family));
  setIf('darkMode', getBoolean(raw.darkMode ?? raw.dark_mode));
  setIf('pspSelectorBgColor', getString(raw.pspSelectorBgColor ?? raw.psp_selector_bg_color));
  setIf('pspSelectorTextColor', getString(raw.pspSelectorTextColor ?? raw.psp_selector_text_color));
  setIf('pspSelectorBorderColor', getString(raw.pspSelectorBorderColor ?? raw.psp_selector_border_color));
  setIf('pspSelectorUseBorder', getBoolean(raw.pspSelectorUseBorder ?? raw.psp_selector_use_border));
  setIf('selectedBackgroundColor', getString(raw.selectedBackgroundColor ?? raw.selected_background_color));
  setIf('selectedTextColor', getString(raw.selectedTextColor ?? raw.selected_text_color));
  setIf('selectedDescriptionColor', getString(raw.selectedDescriptionColor ?? raw.selected_description_color));
  setIf('selectedBorderColor', getString(raw.selectedBorderColor ?? raw.selected_border_color));

  return theme as ReevitTheme;
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
    pspPublicKey: response.psp_public_key,
    pspCredentials: response.psp_credentials,
    amount: response.amount,
    currency: response.currency,
    status: response.status as PaymentIntent['status'],
    recommendedPsp: mapProviderToPsp(response.provider),
    availableMethods: config.paymentMethods || ['card', 'mobile_money'],
    reference: response.reference || config.reference,
    orgId: response.org_id,
    connectionId: response.connection_id,
    provider: response.provider,
    feeAmount: response.fee_amount,
    feeCurrency: response.fee_currency,
    netAmount: response.net_amount,
    metadata: config.metadata,
    availableProviders: mapAvailableProviders(response.available_psps),
    branding: normalizeBranding(response.branding as Record<string, unknown> | undefined),
  };
}

export function useReevit(options: UseReevitOptions) {
  const { config, onSuccess, onError, onClose, onStateChange, apiBaseUrl } = options;

  // Reactive state
  const state = ref<ReevitState>(createInitialState());
  const initRequestId = ref(0);

  // Guard against duplicate initialize() calls
  const initializing = ref(!!config.initialPaymentIntent);

  // Handle initial intent if provided
  if (config.initialPaymentIntent) {
    const initialIntent = config.initialPaymentIntent as PaymentIntent;
    state.value = {
      ...state.value,
      status: 'ready',
      paymentIntent: initialIntent,
      selectedMethod:
        initialIntent.availableMethods?.length === 1
          ? initialIntent.availableMethods[0]
          : null,
    };
  }

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
  const initialize = async (
    method?: PaymentMethod,
    options?: { preferredProvider?: string; allowedProviders?: string[] }
  ) => {
    // Guard against duplicate calls
    if (initializing.value) {
      return;
    }
    initializing.value = true;

    const requestId = ++initRequestId.value;
    dispatch({ type: 'INIT_START' });

    try {
      const reference = config.reference || generateReference();
      const country = detectCountryFromCurrency(config.currency);
      const defaultMethod =
        config.paymentMethods && config.paymentMethods.length === 1
          ? config.paymentMethods[0]
          : undefined;
      const paymentMethod = method ?? defaultMethod;

      let data: PaymentIntentResponse | undefined;
      let error: PaymentError | undefined;

      if (config.paymentLinkCode) {
        // Generate a deterministic idempotency key for payment link requests
        const idempotencyKey = generateIdempotencyKey({
          paymentLinkCode: config.paymentLinkCode,
          amount: config.amount,
          email: config.email || '',
          phone: config.phone || '',
          method: paymentMethod || '',
          provider: options?.preferredProvider || options?.allowedProviders?.[0] || '',
        });

        const response = await fetch(
          `${apiBaseUrl || DEFAULT_PUBLIC_API_BASE_URL}/v1/pay/${config.paymentLinkCode}/pay`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({
              amount: config.amount,
              email: config.email || '',
              name: config.customerName || '',
              phone: config.phone || '',
              method: paymentMethod,
              country,
              provider: options?.preferredProvider || options?.allowedProviders?.[0],
              custom_fields: config.customFields,
            }),
          }
        );

        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
          error = buildPaymentLinkError(response, responseData);
        } else {
          data = responseData as PaymentIntentResponse;
        }
      } else {
        const result = await apiClient.createPaymentIntent(
          { ...config, reference },
          paymentMethod,
          country,
          {
            preferredProviders: options?.preferredProvider ? [options.preferredProvider] : undefined,
            allowedProviders: options?.allowedProviders,
          }
        );
        data = result.data;
        error = result.error;
      }

      if (requestId !== initRequestId.value) {
        return;
      }

      if (error) {
        dispatch({ type: 'INIT_ERROR', payload: error });
        onError?.(error);
        initializing.value = false;
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
        initializing.value = false;
        return;
      }

      const paymentIntent = mapToPaymentIntent(data, { ...config, reference });
      dispatch({ type: 'INIT_SUCCESS', payload: paymentIntent });
      // Don't reset initializing here - once initialized, stay initialized until reset()
    } catch (err) {
      if (requestId !== initRequestId.value) {
        return;
      }
      const error: PaymentError = {
        code: 'INIT_FAILED',
        message: err instanceof Error ? err.message : 'Failed to initialize checkout',
        recoverable: true,
        originalError: err,
      };
      dispatch({ type: 'INIT_ERROR', payload: error });
      onError?.(error);
      initializing.value = false;
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
      let resultData;

      // Use public confirm endpoint if client secret is available
      if (state.value.paymentIntent.clientSecret) {
        const { data, error } = await apiClient.confirmPaymentIntent(
          state.value.paymentIntent.id,
          state.value.paymentIntent.clientSecret
        );
        if (error) {
          dispatch({ type: 'PROCESS_ERROR', payload: error });
          onError?.(error);
          return;
        }
        resultData = data;
      } else {
        const { data, error } = await apiClient.confirmPayment(state.value.paymentIntent.id);
        if (error) {
          dispatch({ type: 'PROCESS_ERROR', payload: error });
          onError?.(error);
          return;
        }
        resultData = data;
      }

      const result: PaymentResult = {
        paymentId: state.value.paymentIntent.id,
        reference: (paymentData.reference as string) ||
          (state.value.paymentIntent as PaymentIntent).reference ||
          (state.value.paymentIntent.metadata?.reference as string) || '',
        amount: state.value.paymentIntent.amount,
        currency: state.value.paymentIntent.currency,
        paymentMethod: state.value.selectedMethod,
        psp: state.value.paymentIntent.recommendedPsp,
        pspReference: (paymentData.pspReference as string) ||
          (resultData?.provider_ref_id as string) || '',
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
  const reset = async () => {
    // Cancel the existing payment intent if it exists and is still pending
    if (state.value.paymentIntent && state.value.status !== 'success') {
      try {
        await apiClient.cancelPaymentIntent(state.value.paymentIntent.id);
      } catch {
        // Silently ignore cancel errors
      }
    }

    initializing.value = false;
    initRequestId.value += 1;
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
  const paymentIntent = computed<PaymentIntent | null>(() => state.value.paymentIntent);
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
