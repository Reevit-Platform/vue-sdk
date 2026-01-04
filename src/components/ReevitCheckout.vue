<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';
import { useReevit } from '../composables/useReevit';
import { createThemeVariables } from '@reevit/core';
import type { ReevitTheme, PaymentIntent } from '@reevit/core';

import PaymentMethodSelector from './PaymentMethodSelector.vue';
import MobileMoneyForm from './MobileMoneyForm.vue';
import { 
  openPaystackPopup, 
  openHubtelPopup, 
  openFlutterwaveModal,
  openMonnifyModal,
  initiateMPesaSTKPush,
  createStripeInstance,
  confirmStripePayment,
} from '../bridges';

const props = defineProps<{
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
} = useReevit({
  config: {
    publicKey: props.publicKey,
    amount: props.amount,
    currency: props.currency,
    email: props.email,
    phone: props.phone,
    reference: props.reference,
    metadata: props.metadata,
    paymentMethods: props.paymentMethods,
    initialPaymentIntent: props.initialPaymentIntent,
  },
  apiBaseUrl: props.apiBaseUrl,
  onSuccess: (result) => emit('success', result),
  onError: (err) => emit('error', err),
  onClose: () => emit('close'),
});

const isModalVisible = ref(props.isOpen ?? false);

watch(() => props.isOpen, (val: any) => {
  if (val !== undefined) isModalVisible.value = val;
});

const handleOpen = () => {
  isModalVisible.value = true;
  if (!paymentIntent.value && status.value === 'idle') {
    initialize();
  }
};

// Auto-advance logic
watch([isModalVisible, paymentIntent, selectedMethod], ([visible, intent, method]) => {
  if (visible && intent && method) {
    if (method === 'card') {
      handleProcessPayment(null);
    }
  }
});

const handleClose = () => {
  isModalVisible.value = false;
  closeSdk();
};

const handleSelectMethod = (method: any) => {
  selectMethod(method);
};

const handleProcessPayment = async (data: any) => {
  const intent = paymentIntent.value as PaymentIntent | null;
  if (!intent) return;

  const psp = intent.recommendedPsp;

  try {
    if (psp === 'paystack') {
      await openPaystackPopup({
        key: props.publicKey,
        email: props.email || '',
        amount: props.amount,
        currency: props.currency,
        ref: intent.id,
        onSuccess: (res) => handlePspSuccess(res),
        onClose: () => {},
      });
    } else if (psp === 'hubtel') {
      await openHubtelPopup({
        clientId: (intent.pspCredentials?.merchantAccount as string) || props.publicKey,
        purchaseDescription: `Payment for ${props.amount} ${props.currency}`,
        amount: props.amount,
        customerPhone: data?.phone || props.phone,
        customerEmail: props.email,
        hubtelSessionToken: intent.id, // Pass payment ID to fetch session token
        onSuccess: (res) => handlePspSuccess(res),
        onClose: () => {},
      });
    } else if (psp === 'flutterwave') {
      await openFlutterwaveModal({
        public_key: props.publicKey,
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
      await openMonnifyModal({
        apiKey: intent.pspPublicKey || props.publicKey,
        contractCode: (props.metadata?.contract_code as string) || props.publicKey,
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

const themeVars = computed(() => createThemeVariables(props.theme || {}));


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
        <div class="reevit-modal-content" :class="{ 'reevit-modal--dark': props.theme?.darkMode }">
          <button class="reevit-modal-close" @click="handleClose" aria-label="Close">
            &times;
          </button>

          <div class="reevit-modal-header">
            <img 
              src="https://i.imgur.com/bzUR5Lm.png" 
              alt="Reevit" 
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
              <PaymentMethodSelector
                v-if="currentStatus === 'ready' || currentStatus === 'method_selected' || currentStatus === 'processing'"
                :methods="props.paymentMethods || ['card', 'mobile_money']"
                :selected="currentSelectedMethod"
                :amount="props.amount"
                :currency="props.currency"
                :provider="psp"
                @select="handleSelectMethod"
              />

              <div v-if="(currentStatus === 'method_selected' || currentStatus === 'processing') && currentSelectedMethod === 'mobile_money'" class="reevit-method-form-container">
                <MobileMoneyForm 
                  :initial-phone="props.phone"
                  :loading="currentStatus === 'processing'"
                  @submit="handleProcessPayment"
                />
              </div>

              <div v-if="(currentStatus === 'method_selected' || currentStatus === 'processing') && currentSelectedMethod === 'card'" class="reevit-card-info">
                <p class="reevit-info-text">You will be redirected to our secure payment partner to complete your card payment.</p>
                <button 
                  class="reevit-submit-btn" 
                  @click="handleProcessPayment"
                  :disabled="currentStatus === 'processing'"
                >
                  <span v-if="currentStatus === 'processing'" class="reevit-spinner"></span>
                  <span v-else>Proceed to Card Payment</span>
                </button>
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
