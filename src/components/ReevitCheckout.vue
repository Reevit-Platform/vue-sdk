<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';
import { useReevit } from '../composables/useReevit';
import { createThemeVariables, createReevitClient, formatAmount, cn } from '@reevit/core';
import type { ReevitTheme, PaymentIntent, PaymentMethod, PSPType } from '@reevit/core';

import MobileMoneyForm from './MobileMoneyForm.vue';
import LoadingState from './LoadingState.vue';
import {
  openPaystackPopup,
  openHubtelPopup,
  openFlutterwaveModal,
  openMonnifyModal,
  initiateMPesaSTKPush,
} from '../bridges';

import flutterwaveLogo from '../assets/providers/flutterwave.png';
import hubtelLogo from '../assets/providers/hubtel.png';
import monnifyLogo from '../assets/providers/monnify.png';
import mpesaLogo from '../assets/providers/mpesa.png';
import paystackLogo from '../assets/providers/paystack.png';
import stripeLogo from '../assets/providers/stripe.png';

/** PSP brand logos, keyed by provider id. */
const PROVIDER_LOGOS: Record<string, string | undefined> = {
  paystack: paystackLogo,
  hubtel: hubtelLogo,
  flutterwave: flutterwaveLogo,
  monnify: monnifyLogo,
  mpesa: mpesaLogo,
  stripe: stripeLogo,
};

/** Short terminal-style code per payment method, used in the `NN / CODE` id line. */
const METHOD_CODE: Record<string, string> = {
  card: 'CARD',
  mobile_money: 'MOMO',
  bank_transfer: 'BANK',
  apple_pay: 'APAY',
  google_pay: 'GPAY',
};

const METHOD_NAME: Record<string, string> = {
  card: 'CARD',
  mobile_money: 'MOBILE MONEY',
  bank_transfer: 'BANK TRANSFER',
  apple_pay: 'APPLE PAY',
  google_pay: 'GOOGLE PAY',
};

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
        apiBaseUrl: props.apiBaseUrl,
        callbackUrl: `${props.apiBaseUrl || 'https://api.reevit.io'}/v1/webhooks/incoming/hubtel`,
        clientReference: intent.providerRefId || intent.reference || intent.id,
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
const formattedAmount = computed(() => formatAmount(props.amount, props.currency));
const successReference = computed(() => result.value?.reference || paymentIntent.value?.reference || '');


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

// Brutalist presentation helpers
const brandName = computed(() => resolvedTheme.value?.companyName);
const merchantLabel = computed(
  () => (brandName.value || 'CHECKOUT').toUpperCase()
);
const dataTheme = computed<'dark' | 'light' | undefined>(() => {
  const mode = themeMode.value;
  if (typeof mode === 'boolean') {
    return mode ? 'dark' : 'light';
  }
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('dark')) return 'dark';
    if (document.documentElement.classList.contains('light')) return 'light';
  }
  return undefined;
});
const activeProviderId = computed(
  () => providerOptions.value.find((p) => p.provider === activeProvider.value)?.provider
);
const needsMomoForm = computed(
  () =>
    currentSelectedMethod.value === 'mobile_money' &&
    activeProvider.value.includes('mpesa') &&
    !props.phone
);
const canPay = computed(
  () => providerOptions.value.length > 0 && !!currentSelectedMethod.value
);
const countdownStyle = computed(() => ({
  animationDuration: `${successDelayMs.value}ms`,
}));
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
      <div v-if="isModalVisible" class="reevit-brut-overlay" @click.self="handleClose">
        <div
          class="reevit-brut__modal"
          :class="{ 'reevit-brut__modal--success': currentStatus === 'success' }"
          :style="themeVars"
          :data-reevit-theme="dataTheme"
          role="dialog"
          aria-modal="true"
        >
          <div class="reevit-brut__topbar">
            <div class="reevit-brut__topbar-left">
              <span class="reevit-brut__dot" />
              <span>Reevit Checkout</span>
            </div>
            <button class="reevit-brut__close" @click="handleClose" aria-label="Close">
              [ESC]
            </button>
          </div>

          <div class="reevit-brut__header">
            <div class="reevit-brut__brand-line">
              <img
                v-if="resolvedTheme.logoUrl"
                :src="resolvedTheme.logoUrl"
                alt=""
                class="reevit-brut__brand-logo"
              />
              <span
                v-else-if="brandName"
                class="reevit-brut__brand-fallback"
              >
                {{ brandName.charAt(0) }}
              </span>
              <span>MERCHANT: {{ merchantLabel }}</span>
            </div>
            <div class="reevit-brut__amount-row">
              <div class="reevit-brut__amount">
                <span class="reevit-brut__amount-bracket">[</span>
                {{ formattedAmount }}
                <span class="reevit-brut__amount-bracket">]</span>
              </div>
              <span class="reevit-brut__amount-tag">DUE NOW</span>
            </div>
          </div>

          <!-- Loading -->
          <LoadingState
            v-if="currentStatus === 'loading'"
            marker="PREPARING"
            title="Setting up checkout"
            message="This will only take a moment"
          />

          <!-- Processing -->
          <LoadingState
            v-else-if="currentStatus === 'processing'"
            marker="PROCESSING"
            title="Confirming your payment"
          />

          <!-- Success -->
          <div v-else-if="currentStatus === 'success'" class="reevit-brut__state">
            <span class="reevit-brut__state-marker">SUCCESS</span>
            <div class="reevit-brut__check-block">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <h3 class="reevit-brut__state-title">PAYMENT CAPTURED</h3>
            <p class="reevit-brut__state-sub">
              {{ formattedAmount }}<br />
              <template v-if="successReference">REF: {{ successReference }}</template>
            </p>
            <div class="reevit-brut__countdown" :style="countdownStyle" />
          </div>

          <!-- Error -->
          <div v-else-if="currentStatus === 'failed' && currentError" class="reevit-brut__state">
            <span class="reevit-brut__state-marker">DECLINED</span>
            <div class="reevit-brut__error-block">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
            <h3 class="reevit-brut__state-title">PAYMENT FAILED</h3>
            <p class="reevit-brut__state-sub">{{ currentError.message }}</p>
            <button class="reevit-brut__cta" style="max-width: 260px" @click="initialize()">
              <span>RETRY</span><span>&#8635;</span>
            </button>
          </div>

          <!-- Select — processor grid + method grid + action -->
          <template v-else-if="ready">
            <div class="reevit-brut__body">
              <div>
                <div class="reevit-brut__section-label">PROCESSOR</div>
                <div v-if="providerOptions.length === 0" class="reevit-brut__methods-empty">
                  &gt; NO PROCESSORS AVAILABLE
                </div>
                <div v-else class="reevit-brut__providers">
                  <button
                    v-for="provider in providerOptions"
                    :key="provider.provider"
                    type="button"
                    class="reevit-brut__provider"
                    :data-selected="activeProviderId === provider.provider"
                    :disabled="loading"
                    @click="provider.provider !== selectedProvider && handleProviderSelect(provider.provider)"
                  >
                    <img
                      v-if="PROVIDER_LOGOS[provider.provider.toLowerCase()]"
                      class="reevit-brut__provider-logo"
                      :src="PROVIDER_LOGOS[provider.provider.toLowerCase()]"
                      alt=""
                    />
                    <span v-else class="reevit-brut__provider-fallback">
                      {{ provider.name.charAt(0).toUpperCase() }}
                    </span>
                    <span class="reevit-brut__provider-name">{{ provider.name }}</span>
                  </button>
                </div>
              </div>

              <div>
                <div class="reevit-brut__section-label">SELECT_METHOD</div>
                <div
                  v-if="providerOptions.length === 0 || availableMethods.length === 0"
                  class="reevit-brut__methods-empty"
                >
                  &gt; SELECT A PROCESSOR ABOVE
                </div>
                <div v-else class="reevit-brut__methods">
                  <button
                    v-for="(method, index) in availableMethods"
                    :key="method"
                    type="button"
                    :class="cn(
                      'reevit-brut__method',
                      availableMethods.length === 1 && 'reevit-brut__method--full'
                    )"
                    :data-selected="currentSelectedMethod === method"
                    :disabled="loading"
                    @click="handleSelectMethod(method)"
                  >
                    <span class="reevit-brut__method-id">
                      {{ String(index + 1).padStart(2, '0') }} / {{ METHOD_CODE[method] }}
                    </span>
                    <span class="reevit-brut__method-name">{{ METHOD_NAME[method] }}</span>
                  </button>
                </div>
              </div>

              <MobileMoneyForm
                v-if="currentSelectedMethod && needsMomoForm"
                :initial-phone="props.phone"
                :loading="loading"
                hide-cancel
                @submit="handleProcessPayment"
              />
              <button
                v-else
                type="button"
                class="reevit-brut__cta"
                :disabled="!canPay || loading"
                @click="handleProcessPayment(null)"
              >
                <span>MAKE PAYMENT</span>
                <span>&rarr;</span>
              </button>
            </div>

            <div class="reevit-brut__footer">
              <span>Secured by Reevit</span>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>
