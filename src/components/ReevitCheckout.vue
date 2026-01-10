<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';
import { useReevit } from '../composables/useReevit';
import { createThemeVariables, createReevitClient } from '@reevit/core';
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
  paymentMethods?: ('card' | 'mobile_money' | 'bank_transfer')[];
  theme?: ReevitTheme;
  isOpen?: boolean;
  apiBaseUrl?: string;
  initialPaymentIntent?: any;
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
  error,
  isLoading,
  isReady,
  initialize,
  selectMethod,
  handlePspSuccess,
  handlePspError,
  close: closeSdk,
  reset,
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
  onSuccess: (result) => emit('success', result),
  onError: (err) => emit('error', err),
  onClose: () => emit('close'),
});

const isModalVisible = ref(props.isOpen ?? false);
const selectedProvider = ref<PSPType | null>(null);

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

// Auto-advance logic
watch([isModalVisible, paymentIntent, selectedMethod], ([visible, intent, method]) => {
  if (visible && intent && method) {
    const psp = (selectedProvider.value || intent.recommendedPsp || 'paystack').toLowerCase();
    const needsPhone = psp.includes('mpesa');

    if (method === 'card') {
      handleProcessPayment(null);
    } else if (method === 'mobile_money') {
      if (!needsPhone || props.phone) {
        handleProcessPayment(null);
      }
    }
  }
});

const handleClose = () => {
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

const handleProviderSelect = (provider: string) => {
  // Toggle behavior - clicking same PSP collapses it
  if (provider === selectedProvider.value) {
    selectedProvider.value = null;
    reset();
    return;
  }

  const providerEntry = providerOptions.value.find((option) => option.provider === provider);
  const methods = providerEntry?.methods.length ? providerEntry.methods : configuredMethods.value;
  const methodForInit =
    selectedMethod.value && methods.includes(selectedMethod.value)
      ? selectedMethod.value
      : methods[0];

  selectedProvider.value = provider as PSPType;
  reset();
  initialize(methodForInit, { preferredProvider: provider, allowedProviders: [provider] });
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
          :class="{ 'reevit-modal--dark': themeMode }"
          :style="themeVars"
        >
          <button class="reevit-modal-close" @click="handleClose" aria-label="Close">
            &times;
          </button>

          <div class="reevit-modal-header">
            <img 
              :src="resolvedTheme.logoUrl || 'https://i.imgur.com/bzUR5Lm.png'" 
              alt="Checkout" 
              class="reevit-modal__logo"
            />
          </div>

          <div class="reevit-modal-body">
            <div v-if="currentStatus === 'loading'" class="reevit-loading-state">
              <div class="reevit-spinner reevit-spinner--large"></div>
              <p>Initializing payment...</p>
            </div>

            <div v-else-if="currentStatus === 'failed' && currentError" class="reevit-error-state">
              <div class="reevit-error-icon">⚠️</div>
              <h3>Payment Failed</h3>
              <p>{{ currentError.message }}</p>
              <button class="reevit-retry-btn" @click="initialize()">Retry</button>
            </div>

            <div v-else-if="currentStatus === 'success'" class="reevit-success-state">
              <div class="reevit-success-icon">✅</div>
              <h3>Payment Successful</h3>
              <p>Thank you for your payment.</p>
              <button class="reevit-done-btn" @click="handleClose">Done</button>
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

          <div class="reevit-modal-footer">
            <div class="reevit-trust-badges">
              <span>PCI DSS Compliant</span>
              <span>•</span>
              <span>SSL Secure</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
