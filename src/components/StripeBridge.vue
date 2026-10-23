<script setup lang="ts">
/**
 * StripeBridge
 * Stripe's Payment Element inside the Ledger detail panel. Card details stay in
 * Stripe's own iframe; the Pay button and the Elements appearance match the checkout.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createStripeInstance } from '../bridges/loaders';
import { formatMoney } from '../utils';
import LoadingState from './LoadingState.vue';
import Scope from './Scope.vue';

interface StripeAppearance {
  theme?: 'stripe' | 'night' | 'flat';
  variables?: Record<string, string>;
  rules?: Record<string, Record<string, string>>;
}

interface StripeError {
  type?: string;
  message: string;
  code?: string;
}

interface StripeElement {
  mount: (selector: string | HTMLElement) => void;
  unmount: () => void;
  on: (event: string, handler: (e: any) => void) => void;
  destroy: () => void;
}

interface StripeElements {
  create: (type: 'payment' | 'card', options?: Record<string, unknown>) => StripeElement;
  submit: () => Promise<{ error?: StripeError }>;
}

interface StripeLike {
  elements: (options: { clientSecret: string; appearance?: StripeAppearance }) => StripeElements;
  confirmPayment: (options: {
    elements: StripeElements;
    redirect?: 'if_required';
  }) => Promise<{ error?: StripeError; paymentIntent?: { id: string; status: string } }>;
}

const props = withDefaults(
  defineProps<{
    publishableKey: string;
    clientSecret: string;
    amount: number;
    currency: string;
    appearance?: StripeAppearance;
    /** Use the dark Ledger palette for Stripe Elements (ignored when `appearance` is set). */
    dark?: boolean;
  }>(),
  { dark: false }
);

const emit = defineEmits<{
  (e: 'success', result: { paymentIntentId: string; status: string }): void;
  (e: 'error', error: { code: string; message: string }): void;
  (e: 'ready'): void;
}>();

// Ledger-themed appearance for Stripe Elements: Inter-style type, ink on paper,
// 12px radius, 48px inputs and the checkout's own input border and focus ring.
// (Stripe renders in its own iframe, so it cannot load the bundled fonts; the
// system UI face is the closest match it can use.)
const getReevitStripeAppearance = (dark: boolean): StripeAppearance => {
  const ink = dark ? '#f4f3ee' : '#151513';
  const paper = dark ? '#1a1a18' : '#f4f3ee';
  const line = dark ? 'rgba(244, 243, 238, 0.14)' : '#d3d0c6';
  const lineStrong = dark ? 'rgba(244, 243, 238, 0.32)' : '#a8a69b';
  const field = dark ? 'rgba(244, 243, 238, 0.04)' : 'rgba(255, 255, 255, 0.6)';
  const muted = dark ? '#a3a29c' : '#6b6a64';

  return {
    theme: dark ? 'night' : 'flat',
    variables: {
      colorPrimary: ink,
      colorBackground: paper,
      colorText: ink,
      colorTextSecondary: muted,
      colorTextPlaceholder: dark ? '#6f6e69' : '#9a988f',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      fontSizeBase: '16px',
      fontSizeSm: '13px',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '600',
      borderRadius: '12px',
      spacingUnit: '4px',
      spacingGridRow: '16px',
      spacingGridColumn: '12px',
    },
    rules: {
      '.Input': {
        border: `1px solid ${line}`,
        boxShadow: 'none',
        padding: '14px',
        height: '48px',
        fontSize: '16px',
        backgroundColor: field,
      },
      '.Input:hover': { border: `1px solid ${lineStrong}` },
      '.Input:focus': {
        border: `1px solid ${ink}`,
        boxShadow: `0 0 0 1px ${ink}`,
        backgroundColor: field,
      },
      '.Input--invalid': {
        border: '1px solid #ef4444',
        boxShadow: '0 0 0 1px #ef4444',
      },
      '.Label': {
        fontSize: '13px',
        fontWeight: '500',
        marginBottom: '7px',
        color: dark ? '#d9d7cf' : '#3a3935',
      },
      '.Tab': {
        border: `1px solid ${line}`,
        backgroundColor: field,
        boxShadow: 'none',
      },
      '.Tab:hover': { border: `1px solid ${lineStrong}` },
      '.Tab--selected': {
        border: `1px solid ${ink}`,
        boxShadow: `0 0 0 1px ${ink}`,
        backgroundColor: field,
      },
      '.Block': {
        border: `1px solid ${line}`,
        backgroundColor: field,
        boxShadow: 'none',
      },
      '.CheckboxInput': { border: `1px solid ${line}` },
      '.CheckboxInput--checked': { backgroundColor: ink, borderColor: ink },
    },
  };
};

const isLoading = ref(true);
const isSubmitting = ref(false);
const error = ref<string | null>(null);
const container = ref<HTMLElement | null>(null);

let stripe: StripeLike | null = null;
let elements: StripeElements | null = null;
let paymentElement: StripeElement | null = null;
let mounted = true;

onMounted(async () => {
  try {
    stripe = (await createStripeInstance(props.publishableKey)) as unknown as StripeLike;
    if (!mounted) return;

    elements = stripe.elements({
      clientSecret: props.clientSecret,
      appearance: props.appearance || getReevitStripeAppearance(props.dark),
    });
    paymentElement = elements.create('payment');
    if (container.value) paymentElement.mount(container.value);

    paymentElement.on('ready', () => {
      if (!mounted) return;
      isLoading.value = false;
      emit('ready');
    });
    paymentElement.on('change', (event: { error?: { message: string } }) => {
      error.value = event.error ? event.error.message : null;
    });
  } catch (err) {
    if (!mounted) return;
    const message = err instanceof Error ? err.message : 'Failed to initialize Stripe';
    error.value = message;
    isLoading.value = false;
    emit('error', { code: 'STRIPE_INIT_ERROR', message });
  }
});

onBeforeUnmount(() => {
  mounted = false;
  paymentElement?.destroy();
});

const handleSubmit = async () => {
  if (!stripe || !elements) {
    emit('error', { code: 'NOT_INITIALIZED', message: 'Stripe not initialized' });
    return;
  }

  isSubmitting.value = true;
  error.value = null;

  try {
    // Validate the form first
    const { error: submitError } = await elements.submit();
    if (submitError) {
      error.value = submitError.message;
      emit('error', { code: submitError.code || 'VALIDATION_ERROR', message: submitError.message });
      return;
    }

    // Confirm the payment
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      error.value = confirmError.message;
      emit('error', { code: confirmError.code || 'PAYMENT_ERROR', message: confirmError.message });
    } else if (paymentIntent) {
      emit('success', { paymentIntentId: paymentIntent.id, status: paymentIntent.status });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment failed';
    error.value = message;
    emit('error', { code: 'UNKNOWN_ERROR', message });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Scope :dark="dark">
    <div class="reevit-stripe-bridge" data-reevit="stripe">
      <LoadingState v-if="isLoading" variant="line" title="Opening Stripe…" />

      <div ref="container" class="reevit-stripe-element" :style="{ display: isLoading ? 'none' : 'block' }" />

      <p v-if="error && !isLoading" class="reevit-error" role="alert">{{ error }}</p>

      <button
        v-if="!isLoading"
        type="button"
        class="reevit-cta"
        data-reevit="cta"
        :disabled="isLoading || isSubmitting"
        @click="handleSubmit"
      >
        <template v-if="isSubmitting">
          <span class="reevit-spin" aria-hidden="true" />
          <span>Processing…</span>
        </template>
        <template v-else>Pay {{ formatMoney(amount, currency) }}</template>
      </button>
    </div>
  </Scope>
</template>
