<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';
import { useReevit } from '../composables/useReevit';
import { createThemeVariables, createReevitClient, detectCountryFromCurrency, formatAmount } from '@reevit/core';
import type { ReevitTheme, PaymentIntent, PaymentMethod, PSPType } from '@reevit/core';

import ProviderSelector from './ProviderSelector.vue';
import PaymentMethodSelector from './PaymentMethodSelector.vue';
import MobileMoneyForm from './MobileMoneyForm.vue';
import {
  openPaystackPopup,
  openHubtelPopup,
  openFlutterwaveModal,
  openMonnifyModal,
  initiateMPesaSTKPush,
} from '../bridges';

const props = defineProps<{
  publicKey?: string;
  amount: number;
  currency: string;
  email?: string;
  phone?: string;
  customerName?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
  customFields?: Record<string, unknown>;
  paymentLinkCode?: string;
  paymentMethods?: PaymentMethod[];
  theme?: ReevitTheme;
  isOpen?: boolean;
  apiBaseUrl?: string;
  initialPaymentIntent?: any;
  successDelayMs?: number;
}>();

const emit = defineEmits<{
  (e: 'success', result: any): void;
  (e: 'error', error: any): void;
  (e: 'close'): void;
}>();

const {
  status,
  paymentIntent,
  selectedMethod,
  result,
  error,
  isLoading,
  isReady,
  initialize,
  selectMethod,
  handlePspSuccess,
  handlePspError,
  close: closeSdk,
} = useReevit({
  config: {
    publicKey: props.publicKey,
    amount: props.amount,
    currency: props.currency,
    email: props.email,
    phone: props.phone,
    customerName: props.customerName,
    reference: props.reference,
    metadata: props.metadata,
    customFields: props.customFields,
    paymentLinkCode: props.paymentLinkCode,
    paymentMethods: props.paymentMethods,
    initialPaymentIntent: props.initialPaymentIntent,
  },
  apiBaseUrl: props.apiBaseUrl,
  onSuccess: (result) => {
    clearSuccessTimeout();
    const delay = successDelayMs.value;
    if (delay <= 0) {
      emit('success', result);
      handleClose();
      return;
    }

    successTimeout.value = setTimeout(() => {
      emit('success', result);
      handleClose();
      successTimeout.value = null;
    }, delay);
  },
  onError: (err) => emit('error', err),
  onClose: () => emit('close'),
});

const isModalVisible = ref(props.isOpen ?? false);
const selectedProvider = ref<PSPType | null>(null);
const successTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const successDelayMs = computed(() => props.successDelayMs ?? 5000);

const clearSuccessTimeout = () => {
  if (successTimeout.value) {
    clearTimeout(successTimeout.value);
    successTimeout.value = null;
  }
};

const pspNames: Record<string, string> = {
  hubtel: 'Hubtel',
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  monnify: 'Monnify',
  mpesa: 'M-Pesa',
  stripe: 'Stripe',
};

watch(() => props.isOpen, (val: any) => {
  if (val !== undefined) isModalVisible.value = val;
});

const handleOpen = () => {
  isModalVisible.value = true;
  selectedProvider.value = null;
  if (!paymentIntent.value && status.value === 'idle') {
    initialize();
  }
};

// NOTE: Auto-advance logic removed to allow users to see and select payment methods
// Users must explicitly click a "Pay" button to proceed to the PSP bridge

const handleClose = () => {
  clearSuccessTimeout();
  isModalVisible.value = false;
  closeSdk();
  selectedProvider.value = null;
};

const configuredMethods = computed(() =>
  props.paymentMethods?.length ? props.paymentMethods : (['card', 'mobile_money'] as PaymentMethod[])
);

const providerOptions = computed(() => {
  const intent = paymentIntent.value as PaymentIntent | null;
  if (!intent) return [];

  const allowed = new Set(configuredMethods.value);
  const options = (intent.availableProviders || [])
    .map((provider) => {
      const sanitizedMethods = provider.provider.toLowerCase().includes('hubtel')
        ? provider.methods.filter((method) => method === 'card' || method === 'mobile_money')
        : provider.methods;

      return {
        ...provider,
        methods: sanitizedMethods.filter((method) => allowed.has(method)),
      };
    })
    .filter((provider) => provider.methods.length > 0);

  if (options.length > 0) {
    return options;
  }

  const fallbackMethods = intent.recommendedPsp.toLowerCase().includes('hubtel')
    ? configuredMethods.value.filter((method) => method === 'card' || method === 'mobile_money')
    : configuredMethods.value;

  return [
    {
      provider: intent.recommendedPsp,
      name: pspNames[intent.recommendedPsp] || intent.recommendedPsp,
      methods: fallbackMethods,
    },
  ];
});

const activeProvider = computed<PSPType>(() => {
  const intent = paymentIntent.value as PaymentIntent | null;
  return selectedProvider.value || intent?.recommendedPsp || 'paystack';
});

const availableMethods = computed(() => {
  const provider = providerOptions.value.find(
    (option) => option.provider === activeProvider.value
  );
  return provider?.methods.length ? provider.methods : configuredMethods.value;
});

watch(
  () => providerOptions.value,
  (options) => {
    if (!options.length) return;

    // If we have a selected provider that's still valid, keep it
    if (selectedProvider.value && options.some((p) => p.provider === selectedProvider.value)) {
      return;
    }

    // Only auto-select if there's exactly one provider
    if (options.length === 1) {
      selectedProvider.value = options[0].provider as PSPType;
    } else {
      selectedProvider.value = null;
    }
  },
  { immediate: true }
);

watch([availableMethods, selectedMethod], ([methods, current]) => {
  if (!current || methods.length === 0) return;
  if (!methods.includes(current)) {
    selectMethod(methods[0]);
  }
});

const handleProviderSelect = async (provider: string) => {
  // Toggle behavior - clicking same PSP collapses it
  if (provider === selectedProvider.value) {
    selectedProvider.value = null;
    return;
  }

  const providerEntry = providerOptions.value.find((option) => option.provider === provider);
  const methods = providerEntry?.methods.length ? providerEntry.methods : configuredMethods.value;
  const methodForInit =
    selectedMethod.value && methods.includes(selectedMethod.value)
      ? selectedMethod.value
      : methods[0];

  selectedProvider.value = provider as PSPType;

  // Select the appropriate method for this provider
  // No need to re-initialize - we already have the payment intent with available_psps
  // Re-initializing would create a duplicate payment
  if (methodForInit) {
    selectMethod(methodForInit);
  }
};

const handleSelectMethod = (method: any) => {
  selectMethod(method);
};

const handleProcessPayment = async (data: any) => {
  const intent = paymentIntent.value as PaymentIntent | null;
  if (!intent) return;

  const psp = activeProvider.value;

  try {
    if (psp === 'paystack') {
      await openPaystackPopup({
        key: intent.pspPublicKey || props.publicKey || '',
        email: props.email || '',
        amount: props.amount,
        currency: props.currency,
        ref: intent.id,
        metadata: {
          ...props.metadata,
          org_id: intent.orgId ?? (props.metadata?.org_id as string),
          payment_id: intent.id,
          connection_id: intent.connectionId ?? (props.metadata?.connection_id as string),
          customer_phone: data?.phone || props.phone,
        },
        onSuccess: (res) => handlePspSuccess(res),
        onClose: () => {},
      });
    } else if (psp === 'hubtel') {
      const client = createReevitClient({ publicKey: props.publicKey, baseUrl: props.apiBaseUrl });
      const { data: session, error: sessionError } = await client.createHubtelSession(
        intent.id,
        intent.clientSecret
      );
      if (sessionError || !session?.basicAuth) {
        handlePspError({
          code: sessionError?.code || 'hubtel_session_error',
          message: sessionError?.message || 'Failed to create Hubtel session',
        });
        return;
      }

      const hubtelPreferredMethod =
        currentSelectedMethod.value === 'card' || currentSelectedMethod.value === 'mobile_money'
          ? currentSelectedMethod.value
          : undefined;

      await openHubtelPopup({
        clientId: (session.merchantAccount as string) || (intent.pspCredentials?.merchantAccount as string) || props.publicKey || '',
        purchaseDescription: `Payment for ${props.amount} ${props.currency}`,
        amount: props.amount,
        customerPhone: data?.phone || props.phone,
        customerEmail: props.email,
        basicAuth: session.basicAuth,
        preferredMethod: hubtelPreferredMethod,
        onSuccess: (res) => handlePspSuccess(res),
        onClose: () => {},
      });
    } else if (psp === 'flutterwave') {
      await openFlutterwaveModal({
        public_key: intent.pspPublicKey || props.publicKey || '',
        tx_ref: intent.id,
        amount: props.amount,
        currency: props.currency,
        customer: {
          email: props.email || '',
          phone_number: data?.phone || props.phone,
        },
        meta: {
          ...props.metadata,
          org_id: intent.orgId ?? (props.metadata?.org_id as string),
          payment_id: intent.id,
          connection_id: intent.connectionId ?? (props.metadata?.connection_id as string),
          customer_phone: data?.phone || props.phone,
        },
        callback: (res) => handlePspSuccess(res),
        onclose: () => {},
      });
    } else if (psp === 'monnify') {
      const apiKey = intent.pspPublicKey || props.publicKey || '';
      const contractCode = (props.metadata?.contract_code as string) || props.publicKey || '';

      if (!apiKey || !contractCode) {
        handlePspError({
          code: 'MONNIFY_CONFIG_MISSING',
          message: 'Monnify configuration is missing. Please check your API key and contract code.',
        });
        return;
      }

      await openMonnifyModal({
        apiKey,
        contractCode,
        amount: props.amount,
        currency: props.currency,
        reference: intent.reference || intent.id,
        customerName: (props.metadata?.customer_name as string) || props.email || '',
        customerEmail: props.email || '',
        customerPhone: data?.phone || props.phone,
        metadata: props.metadata,
        onSuccess: (res) => handlePspSuccess(res),
        onClose: () => {},
      });
    } else if (psp === 'mpesa') {
      const apiEndpoint = `${props.apiBaseUrl || 'https://api.reevit.io'}/v1/payments/${intent.id}/mpesa`;
      await initiateMPesaSTKPush({
        phoneNumber: data?.phone || props.phone || '',
        amount: props.amount,
        reference: intent.reference || intent.id,
        description: `Payment ${intent.reference || ''}`,
        onInitiated: () => {},
        onSuccess: (res) => handlePspSuccess(res),
        onError: (err) => handlePspError({ code: 'MPESA_ERROR', message: err.message }),
      }, apiEndpoint);
    } else if (psp === 'stripe') {
      // Stripe requires Elements - for now, show a message that it needs custom integration
      handlePspError({
        code: 'STRIPE_NOT_IMPLEMENTED',
        message: 'Stripe integration requires custom Elements setup. Please use the React SDK or implement custom Stripe Elements.',
      });
    } else {
      handlePspError({
        code: 'UNSUPPORTED_PSP',
        message: `Payment provider "${psp}" is not supported in this checkout.`,
      });
    }
  } catch (err) {
    handlePspError({
      code: 'BRIDGE_ERROR',
      message: err instanceof Error ? err.message : 'Failed to open payment gateway',
    });
  }
};

const resolvedTheme = computed(() => ({
  ...(paymentIntent.value?.branding || {}),
  ...(props.theme || {}),
}));
const themeVars = computed(() => createThemeVariables(resolvedTheme.value));
const themeMode = computed(() => resolvedTheme.value?.darkMode);
const fallbackCountry = computed(() => detectCountryFromCurrency(props.currency));
const formattedAmount = computed(() => formatAmount(props.amount, props.currency));
const successReference = computed(() => result.value?.reference || paymentIntent.value?.reference || '');
const selectedTheme = computed(() => ({
  backgroundColor: resolvedTheme.value?.selectedBackgroundColor,
  textColor: resolvedTheme.value?.selectedTextColor,
  descriptionColor: resolvedTheme.value?.selectedDescriptionColor,
  borderColor: resolvedTheme.value?.selectedBorderColor,
}));


// Lock scroll when open
watch(isModalVisible, (val: any) => {
  if (val) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
  clearSuccessTimeout();
});

// Computed helpers for template to avoid .value clutter
const currentStatus = computed(() => status.value);
const currentError = computed(() => error.value);
const currentSelectedMethod = computed(() => selectedMethod.value);
const loading = computed(() => isLoading.value);
const ready = computed(() => isReady.value);
</script>

<template>
  <div class="reevit-sdk-container" :style="themeVars">
    <slot :open="handleOpen" :is-loading="loading">
      <button 
        type="button" 
        class="reevit-pay-button" 
        @click="handleOpen"
        :disabled="loading"
      >
        <span v-if="loading" class="reevit-spinner"></span>
        <slot name="button-text" v-else>Pay Now</slot>
      </button>
    </slot>

    <Teleport to="body">
      <div v-if="isModalVisible" class="reevit-modal-overlay" @click.self="handleClose">
        <div
          class="reevit-modal-content"
          :class="{ 'reevit-modal--dark': themeMode, 'reevit-modal--success': currentStatus === 'success' }"
          :style="themeVars"
        >
          <div class="reevit-modal__header">
            <div class="reevit-modal__branding">
              <img
                v-if="resolvedTheme.logoUrl"
                :src="resolvedTheme.logoUrl"
                :alt="resolvedTheme.companyName || ''"
                class="reevit-modal__logo"
              />
              <span
                v-else-if="resolvedTheme.companyName"
                class="reevit-modal__logo-fallback"
              >
                {{ resolvedTheme.companyName.charAt(0) }}
              </span>
              <span v-if="resolvedTheme.companyName" class="reevit-modal__brand-name">
                {{ resolvedTheme.companyName }}
              </span>
            </div>
            <button class="reevit-modal__close" @click="handleClose" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="reevit-modal__amount">
            <span class="reevit-modal__amount-label">Pay</span>
            <span class="reevit-modal__amount-value">{{ formattedAmount }}</span>
          </div>

          <div class="reevit-modal__content">
            <div v-if="currentStatus === 'loading'" class="reevit-loading">
              <div class="reevit-spinner reevit-spinner--large"></div>
              <p>Initializing payment...</p>
            </div>

            <div v-else-if="currentStatus === 'failed' && currentError" class="reevit-error">
              <div class="reevit-error__icon">✕</div>
              <h3>Payment Failed</h3>
              <p>{{ currentError.message }}</p>
              <button class="reevit-retry-btn" @click="initialize()">Retry</button>
            </div>

            <div v-else-if="currentStatus === 'success'" class="reevit-success">
              <div class="reevit-success__icon">✓</div>
              <h3>Payment Successful!</h3>
              <p class="reevit-success__amount">{{ formattedAmount }}</p>
              <p v-if="successReference" class="reevit-success__reference">Reference: {{ successReference }}</p>
              <p class="reevit-success__redirect">Redirecting in a moment...</p>
            </div>

            <template v-else-if="ready">
              <div class="reevit-method-step reevit-animate-slide-up">
                <template v-if="providerOptions.length > 1">
                  <ProviderSelector
                    :providers="providerOptions"
                    :selected-provider="selectedProvider"
                    :disabled="loading"
                    :theme="resolvedTheme"
                    :selected-method="currentSelectedMethod"
                    :country="fallbackCountry"
                    @select="handleProviderSelect"
                    @method-select="handleSelectMethod"
                  >
                    <template #method-content>
                      <div v-if="currentSelectedMethod === 'card'" class="reevit-inline-action reevit-animate-fade-in">
                        <p class="reevit-inline-action__hint">
                          You'll be redirected to complete your card payment securely.
                        </p>
                        <button
                          class="reevit-btn reevit-btn--primary"
                          @click="handleProcessPayment(null)"
                          :disabled="currentStatus === 'processing'"
                        >
                          Pay with Card
                        </button>
                      </div>
                      <div v-else-if="currentSelectedMethod === 'mobile_money'" class="reevit-inline-action reevit-animate-fade-in">
                        <template v-if="activeProvider.includes('mpesa') && !props.phone">
                          <MobileMoneyForm
                            :initial-phone="props.phone"
                            :loading="currentStatus === 'processing'"
                            hide-cancel
                            @submit="handleProcessPayment"
                          />
                        </template>
                        <template v-else>
                          <p class="reevit-inline-action__hint">
                            {{ activeProvider.includes('hubtel')
                              ? 'Opens the Hubtel checkout with Mobile Money selected.'
                              : `Continue to pay securely with Mobile Money via ${pspNames[activeProvider] || activeProvider}.` }}
                          </p>
                          <button
                            class="reevit-btn reevit-btn--primary"
                            @click="handleProcessPayment(null)"
                            :disabled="currentStatus === 'processing'"
                          >
                            {{ activeProvider.includes('hubtel') ? 'Continue with Hubtel' : 'Pay with Mobile Money' }}
                          </button>
                        </template>
                      </div>
                    </template>
                  </ProviderSelector>
                </template>
                
                <template v-else>
                  <PaymentMethodSelector
                    :methods="availableMethods"
                    :selected="currentSelectedMethod"
                    :provider="activeProvider"
                    :show-label="false"
                    layout="grid"
                    :disabled="loading"
                    :country="fallbackCountry"
                    :selected-theme="selectedTheme"
                    @select="handleSelectMethod"
                  />

                  <div v-if="currentSelectedMethod" class="reevit-method-step__actions reevit-animate-slide-up">
                    <div v-if="currentSelectedMethod === 'mobile_money' && activeProvider.includes('mpesa') && !props.phone">
                      <MobileMoneyForm 
                        :initial-phone="props.phone"
                        :loading="currentStatus === 'processing'"
                        @submit="handleProcessPayment"
                        @cancel="selectMethod(null as any)"
                      />
                    </div>
                    <div v-else class="reevit-card-info reevit-animate-fade-in">
                      <p class="reevit-info-text">
                        {{ currentSelectedMethod === 'card' 
                          ? 'You will be redirected to complete your card payment securely.' 
                          : activeProvider.includes('hubtel')
                            ? 'Opens the Hubtel checkout with Mobile Money selected.'
                            : `Continue to pay securely via ${pspNames[activeProvider] || activeProvider}.` }}
                      </p>
                      <button 
                        class="reevit-submit-btn" 
                        @click="handleProcessPayment(null)"
                        :disabled="currentStatus === 'processing'"
                      >
                        <span v-if="currentStatus === 'processing'" class="reevit-spinner"></span>
                        <span v-else>
                          {{ currentSelectedMethod === 'card'
                            ? 'Pay with Card'
                            : activeProvider.includes('hubtel')
                              ? 'Continue with Hubtel'
                              : 'Pay with Mobile Money' }}
                        </span>
                      </button>
                    </div>
                  </div>
                </template>
              </div>
            </template>
          </div>

          <div class="reevit-modal__footer">
            <span class="reevit-modal__secured">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Secured by <span class="reevit-modal__secured-brand">Reevit</span>
            </span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
