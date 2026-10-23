<script setup lang="ts">
/**
 * ReevitCheckout
 * Main checkout component that orchestrates the payment flow.
 *
 * The shopper sees one list of payment methods. Reevit picks the processor:
 * the recommended one when it supports the chosen method, otherwise the first
 * connected one that does.
 */
import { ref, watch, onUnmounted, computed } from 'vue';
import { useReevit } from '../composables/useReevit';
import { toFlutterwaveAmount } from '../bridges/flutterwaveAmount';
import { createThemeVariables, formatAmount } from '@reevit/core';
import type {
  CheckoutProviderOption,
  MobileMoneyFormData,
  PaymentError,
  PaymentIntent,
  PaymentMethod,
  PaymentResult,
  PSPType,
  ReevitTheme,
} from '@reevit/core';

import CheckoutShell from './CheckoutShell.vue';
import FailurePanel from './FailurePanel.vue';
import LoadingState from './LoadingState.vue';
import MethodList from './MethodList.vue';
import MobileMoneyForm from './MobileMoneyForm.vue';
import MPesaBridge from './MPesaBridge.vue';
import PanelHead from './PanelHead.vue';
import ReceiptPanel from './ReceiptPanel.vue';
import StripeBridge from './StripeBridge.vue';
import {
  openPaystackPopup,
  openHubtelPopup,
  openFlutterwaveModal,
  openMonnifyModal,
} from '../bridges';
import {
  METHOD_LABEL,
  METHOD_ORDER,
  formatMoney,
  getCountryFromCurrency,
  type FooterProvider,
} from '../utils';

import flutterwaveLogo from '../assets/providers/flutterwave.png';
import hubtelLogo from '../assets/providers/hubtel.png';
import monnifyLogo from '../assets/providers/monnify.png';
import mpesaWordmark from '../assets/providers/mpesa-wordmark.png';
import paystackLogo from '../assets/providers/paystack.png';
import stripeLogo from '../assets/providers/stripe.png';

/** Footer mark per provider. Wordmarks sit a touch shorter than icons so they read at the same weight. */
const PROVIDER_FOOTER: Record<string, { src: string; kind: 'icon' | 'word' }> = {
  paystack: { src: paystackLogo, kind: 'icon' },
  hubtel: { src: hubtelLogo, kind: 'icon' },
  flutterwave: { src: flutterwaveLogo, kind: 'icon' },
  monnify: { src: monnifyLogo, kind: 'word' },
  mpesa: { src: mpesaWordmark, kind: 'word' },
  stripe: { src: stripeLogo, kind: 'word' },
};

type Stage = 'list' | 'phone' | 'preparing' | 'bridge';
type ViewId = 'loading' | 'list' | 'phone' | 'preparing' | 'bridge' | 'processing' | 'receipt' | 'failure';

const titleCase = (value: string) => value.replace(/^\w/, (c) => c.toUpperCase());

const props = defineProps<{
  publicKey?: string;
  /** Server-created checkout session secret. Prefer this over browser-created intents. */
  sessionSecret?: string;
  /** Amount in the smallest currency unit. Required unless `sessionSecret` or `initialPaymentIntent` is given. */
  amount?: number;
  /** Currency code. Required unless `sessionSecret` or `initialPaymentIntent` is given. */
  currency?: string;
  /** Order-scoped key that makes intent creation safe to retry. */
  idempotencyKey?: string;
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

/**
 * Mirrors the core client's guard, but locally so a misconfigured checkout reports
 * itself before the shopper has clicked anything.
 */
const hasChargeableConfig = () =>
  Boolean(props.sessionSecret) ||
  Boolean(props.initialPaymentIntent) ||
  Boolean(props.paymentLinkCode) ||
  (typeof props.amount === 'number' && Boolean(props.currency));

if (!hasChargeableConfig()) {
  emit('error', {
    code: 'invalid_checkout_config',
    message:
      'amount and currency are required when creating a payment intent in the browser.',
    recoverable: false,
  });
}


const {
  status,
  paymentIntent,
  selectedMethod,
  result,
  error,
  initialize,
  selectMethod,
  processPayment,
  handlePspSuccess,
  handlePspError,
  reset,
  close: closeSdk,
} = useReevit({
  config: {
    publicKey: props.publicKey,
    sessionSecret: props.sessionSecret,
    amount: props.amount,
    currency: props.currency,
    idempotencyKey: props.idempotencyKey,
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
  onSuccess: (paymentResult) => {
    successDelivered = false;
    clearSuccessTimeout();
    const delay = successDelayMs.value;
    if (delay <= 0) {
      deliverSuccess(paymentResult);
      return;
    }

    successTimeout.value = setTimeout(() => {
      successTimeout.value = null;
      deliverSuccess(paymentResult);
    }, delay);
  },
  onError: (err) => emit('error', err),
  onClose: () => emit('close'),
});

const isModalVisible = ref(props.isOpen ?? false);
const stage = ref<Stage>('list');
const momoData = ref<MobileMoneyFormData | null>(null);
const selectedProvider = ref<PSPType | null>(null);
const pspError = ref<PaymentError | null>(null);
const confirmLeave = ref(false);
const hubtelOpen = ref(false);
const successTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const successDelayMs = computed(() => props.successDelayMs ?? 5000);

/** onSuccess is delivered exactly once per payment, by the timer, Done, or closing the receipt. */
let successDelivered = false;
/** Guards double taps while an intent is being created. */
let picking = false;
/** Bumped when the shopper backs out, so a stale intent response cannot reopen a provider window. */
let pickToken = 0;
let hubtelCheckout: { cancel: () => void } | null = null;

/**
 * The amount actually charged. A server-created session carries its own amount, so the
 * intent wins over the props whenever one exists.
 */
const displayAmount = computed(() => paymentIntent.value?.amount ?? props.amount ?? 0);
const displayCurrency = computed(() => paymentIntent.value?.currency ?? props.currency ?? 'GHS');

const clearSuccessTimeout = () => {
  if (successTimeout.value) {
    clearTimeout(successTimeout.value);
    successTimeout.value = null;
  }
};

const resetFlow = () => {
  stage.value = 'list';
  momoData.value = null;
  selectedProvider.value = null;
  pspError.value = null;
  confirmLeave.value = false;
  hubtelOpen.value = false;
};

const cancelHubtel = () => {
  hubtelCheckout?.cancel();
  hubtelCheckout = null;
};

const handleClose = () => {
  cancelHubtel();
  clearSuccessTimeout();
  pickToken += 1;
  isModalVisible.value = false;
  closeSdk();
  resetFlow();
};

const deliverSuccess = (paymentResult: PaymentResult) => {
  clearSuccessTimeout();
  if (!successDelivered) {
    successDelivered = true;
    emit('success', paymentResult);
  }
  handleClose();
};

watch(() => props.isOpen, (val: any) => {
  if (val !== undefined) isModalVisible.value = val;
});

const handleOpen = () => {
  isModalVisible.value = true;
  resetFlow();
};

// Initialize when opened (also when the parent opens it through `isOpen`).
watch(
  isModalVisible,
  (open) => {
    if (open && status.value === 'idle' && !paymentIntent.value) {
      void initialize();
    }
  },
  { immediate: true }
);

const configuredMethods = computed(() =>
  props.paymentMethods?.length ? props.paymentMethods : (['card', 'mobile_money'] as PaymentMethod[])
);

const pspNames: Record<string, string> = {
  hubtel: 'Hubtel',
  paystack: 'Paystack',
  flutterwave: 'Flutterwave',
  monnify: 'Monnify',
  mpesa: 'M-Pesa',
  stripe: 'Stripe',
};

const providerOptions = computed<CheckoutProviderOption[]>(() => {
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

/** The union of methods across every connected provider, in display order. */
const methodList = computed(() =>
  METHOD_ORDER.filter((method) => providerOptions.value.some((provider) => provider.methods.includes(method)))
);

/** Reevit's routing choice for a method: the recommended provider if it supports it, else the first that does. */
const providerFor = (method: PaymentMethod): CheckoutProviderOption | undefined => {
  const recommended = paymentIntent.value?.recommendedPsp?.toLowerCase();
  return (
    providerOptions.value.find((p) => p.provider.toLowerCase() === recommended && p.methods.includes(method)) ||
    providerOptions.value.find((p) => p.methods.includes(method))
  );
};

// The only method is M-Pesa mobile money: skip the list and ask for the number.
const soleMethod = computed(() => (methodList.value.length === 1 ? methodList.value[0] : null));
const directPhone = computed(() => {
  const method = soleMethod.value;
  if (method !== 'mobile_money') return false;
  return !!providerFor(method)?.provider.toLowerCase().includes('mpesa');
});
const activeStage = computed<Stage>(() => (stage.value === 'list' && directPhone.value ? 'phone' : stage.value));

/** Open the provider's own window for the routed provider (M-Pesa and Stripe render in the dialog). */
const openProvider = async (psp: string, method: PaymentMethod) => {
  const intent = paymentIntent.value as PaymentIntent | null;
  if (!intent) return;
  const phone = momoData.value?.phone || props.phone;

  try {
    if (psp === 'paystack') {
      await openPaystackPopup({
        key: intent.pspPublicKey || props.publicKey || '',
        email: props.email || '',
        phone,
        amount: displayAmount.value,
        currency: displayCurrency.value,
        ref: intent.id,
        accessCode: intent.clientSecret,
        channels: method === 'mobile_money' ? ['mobile_money'] : ['card'],
        metadata: {
          ...props.metadata,
          org_id: intent.orgId ?? (props.metadata?.org_id as string),
          payment_id: intent.id,
          connection_id: intent.connectionId ?? (props.metadata?.connection_id as string),
          customer_phone: phone,
        },
        onSuccess: (res) => onProviderSuccess(res),
        onClose: () => handleProviderClose(),
      });
    } else if (psp === 'hubtel') {
      // Opens the hosted checkout the Reevit API created; no Hubtel credentials
      // are used in the browser.
      cancelHubtel();
      hubtelCheckout = await openHubtelPopup({
        paymentId: intent.id,
        clientSecret: intent.clientSecret,
        publicKey: props.publicKey,
        apiBaseUrl: props.apiBaseUrl,
        clientReference: intent.providerRefId || intent.reference || intent.id,
        onOpen: () => { hubtelOpen.value = true; },
        onSuccess: (res) => onProviderSuccess(res),
        onError: (err) => handleProviderError(err),
        onClose: () => handleProviderClose(),
      });
    } else if (psp === 'flutterwave') {
      await openFlutterwaveModal({
        public_key: intent.pspPublicKey || props.publicKey || '',
        tx_ref: intent.id,
        amount: toFlutterwaveAmount(displayAmount.value, displayCurrency.value),
        currency: displayCurrency.value,
        customer: {
          email: props.email || '',
          phone_number: phone,
        },
        meta: {
          ...props.metadata,
          org_id: intent.orgId ?? (props.metadata?.org_id as string),
          payment_id: intent.id,
          connection_id: intent.connectionId ?? (props.metadata?.connection_id as string),
          customer_phone: phone,
        },
        callback: (res) => onProviderSuccess(res),
        onclose: () => handleProviderClose(),
      });
    } else if (psp === 'monnify') {
      const apiKey = intent.pspPublicKey || props.publicKey || '';
      const contractCode = (props.metadata?.contract_code as string) || props.publicKey || '';

      if (!apiKey || !contractCode) {
        handleProviderError({
          code: 'MONNIFY_CONFIG_MISSING',
          message: 'Monnify configuration is missing. Please check your API key and contract code.',
        });
        return;
      }

      await openMonnifyModal({
        apiKey,
        contractCode,
        amount: displayAmount.value,
        currency: displayCurrency.value,
        reference: intent.reference || intent.id,
        customerName: (props.metadata?.customer_name as string) || props.email || '',
        customerEmail: props.email || '',
        customerPhone: phone,
        metadata: props.metadata,
        onSuccess: (res) => onProviderSuccess(res),
        onClose: () => handleProviderClose(),
      });
    }
    // M-Pesa and Stripe render their own panels inside the dialog.
  } catch (err) {
    handleProviderError({
      code: 'BRIDGE_ERROR',
      message: err instanceof Error ? err.message : 'Failed to open payment gateway',
    });
  }
};

/**
 * Create (or reuse) a method-specific intent, then hand off to the provider.
 * A second tap while that runs is ignored.
 */
const proceed = async (method: PaymentMethod, provider: CheckoutProviderOption) => {
  if (picking) return;
  picking = true;
  const token = ++pickToken;

  selectedProvider.value = provider.provider as PSPType;
  selectMethod(method);
  stage.value = 'preparing';

  try {
    if (!props.initialPaymentIntent) {
      const intent = await initialize(method, { allowedProviders: [provider.provider] });
      if (token !== pickToken) return;
      if (!intent) {
        stage.value = 'list';
        return;
      }
      // A fresh intent resets the selection; restore it for the provider hand-off.
      selectMethod(method);
    }
    stage.value = 'bridge';
  } finally {
    picking = false;
  }

  await openProvider(provider.provider.toLowerCase(), method);
};

// A row was tapped: route to a provider and carry on.
const handlePick = (method: PaymentMethod) => {
  if (picking) return;
  const provider = providerFor(method);
  if (!provider) {
    emit('error', {
      code: 'UNSUPPORTED_CHECKOUT_SELECTION',
      message: 'No connected provider supports this payment method.',
      recoverable: true,
    });
    return;
  }

  if (method === 'mobile_money' && provider.provider.toLowerCase().includes('mpesa')) {
    // M-Pesa is the one in-widget mobile money flow: ask for the number first.
    selectedProvider.value = provider.provider as PSPType;
    selectMethod(method);
    stage.value = 'phone';
    return;
  }

  void proceed(method, provider);
};

// Mobile money number submitted (M-Pesa)
const handleMomoSubmit = (data: MobileMoneyFormData) => {
  const provider = providerFor('mobile_money');
  if (!provider) return;
  momoData.value = data;
  void proceed('mobile_money', provider);
};

// Handle provider callbacks
const onProviderSuccess = (pspResult: Record<string, unknown>) => {
  void processPayment({ ...pspResult, momoData: momoData.value });
};

// A provider window failed outright: report it and show the failure panel.
const handleProviderError = (err: { code?: string; message?: string }) => {
  pickToken += 1;
  cancelHubtel();
  stage.value = 'list';
  pspError.value = err as PaymentError;
  emit('error', err);
};

// The provider window was dismissed: back to the list.
const handleProviderClose = () => {
  pickToken += 1;
  hubtelCheckout = null;
  stage.value = 'list';
};

// Back chevron on a detail panel
const handlePanelBack = () => {
  pickToken += 1;
  cancelHubtel();
  stage.value = 'list';
  selectedProvider.value = null;
};

// Stripe: card typos are shown inline by the bridge; only a failed load replaces the form.
const handleStripeError = (err: { code: string; message: string }) => {
  if (err.code === 'STRIPE_INIT_ERROR' || err.code === 'NOT_INITIALIZED') handleProviderError(err);
  else emit('error', err);
};

// "Try again" on the failure panel
const handleBack = async () => {
  pickToken += 1;
  cancelHubtel();
  pspError.value = null;
  momoData.value = null;
  stage.value = 'list';
  selectedProvider.value = null;
  if (status.value === 'failed') {
    await reset();
    // A checkout that never loaded has nothing to go back to; load it again.
    if (!paymentIntent.value && !props.initialPaymentIntent) {
      await initialize();
    }
  }
};

// ---------------------------------------------------------------- presentation

const resolvedTheme = computed<ReevitTheme>(() => ({
  ...(paymentIntent.value?.branding || {}),
  ...(props.theme || {}),
}));
// Merchant colours still style the legacy trigger button.
const themeVars = computed(() => createThemeVariables(resolvedTheme.value));
// The Ledger palette is fixed, but a merchant-supplied button colour still drives the primary action.
const ctaVars = computed(() => {
  const vars: Record<string, string> = {};
  if (resolvedTheme.value.buttonBackgroundColor) vars['--rv-cta-bg'] = resolvedTheme.value.buttonBackgroundColor;
  if (resolvedTheme.value.buttonTextColor) vars['--rv-cta-fg'] = resolvedTheme.value.buttonTextColor;
  return Object.keys(vars).length > 0 ? vars : undefined;
});
const brandName = computed(() => resolvedTheme.value.companyName);
const dataTheme = computed<'dark' | 'light' | undefined>(() => {
  const mode = resolvedTheme.value.darkMode;
  if (typeof mode === 'boolean') {
    return mode ? 'dark' : 'light';
  }
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('dark')) return 'dark';
    if (document.documentElement.classList.contains('light')) return 'light';
  }
  return undefined;
});

const loading = computed(() => status.value === 'loading' || status.value === 'processing');

const psp = computed(() => selectedProvider.value || paymentIntent.value?.recommendedPsp || 'paystack');
const pspLower = computed(() => psp.value.toLowerCase());
const pspName = computed(
  () => providerOptions.value.find((p) => p.provider.toLowerCase() === pspLower.value)?.name || titleCase(psp.value)
);
const country = computed(() => getCountryFromCurrency(displayCurrency.value));
// The merchant's own order reference. A backend reference that is only the payment/provider id is noise.
const orderRef = computed(() => {
  const intent = paymentIntent.value;
  const intentRef = intent?.reference;
  return (
    props.reference ||
    (intentRef && intentRef !== intent?.id && intentRef !== intent?.providerRefId ? intentRef : undefined)
  );
});

// Which view is on screen
const showFailure = computed(() => (status.value === 'failed' && !!error.value) || !!pspError.value);
const view = computed<ViewId>(() => {
  if (status.value === 'success' && result.value) return 'receipt';
  if (showFailure.value) return 'failure';
  if (status.value === 'processing') return 'processing';
  if (!paymentIntent.value) return 'loading';
  if (activeStage.value === 'preparing') return 'preparing';
  if (activeStage.value === 'bridge') return 'bridge';
  if (activeStage.value === 'phone') return 'phone';
  return 'list';
});

// Waiting for the intent and showing the provider's own opening line are one panel to the eye.
const panelView = computed<ViewId>(() => (view.value === 'preparing' ? 'bridge' : view.value));

// Slide direction: forward into a detail panel, back to the list, fade otherwise.
// Decided once per view so a later re-render never restarts the animation.
const direction = ref<'forward' | 'back' | 'fade'>('fade');
const isDetail = (v: ViewId) => v === 'phone' || v === 'preparing' || v === 'bridge';
watch(
  panelView,
  (to, from) => {
    direction.value =
      to === 'list' && isDetail(from) ? 'back' : isDetail(to) && from === 'list' ? 'forward' : 'fade';
  },
  { flush: 'sync' }
);

// A payment is in flight while a provider window is open or the result is being confirmed.
const inFlight = computed(() => view.value === 'bridge' || view.value === 'processing');

const finishReceipt = () => {
  if (result.value) deliverSuccess(result.value as PaymentResult);
};

const requestClose = () => {
  if (view.value === 'receipt') {
    finishReceipt();
    return;
  }
  if (inFlight.value) {
    confirmLeave.value = true;
    return;
  }
  handleClose();
};

// The confirmation only makes sense while a payment is still in flight.
watch(inFlight, (flying) => {
  if (!flying && confirmLeave.value) confirmLeave.value = false;
});

const footerProvider = computed<FooterProvider | null>(() => {
  const recommended = paymentIntent.value?.recommendedPsp?.toLowerCase();
  const id = (
    selectedProvider.value ||
    providerOptions.value.find((p) => p.provider.toLowerCase() === recommended)?.provider ||
    providerOptions.value[0]?.provider ||
    ''
  ).toLowerCase();
  const mark = PROVIDER_FOOTER[id];
  if (!mark?.src) return null;
  return { id, name: titleCase(id), src: mark.src, kind: mark.kind };
});

const methodLabel = computed(() => (selectedMethod.value ? METHOD_LABEL[selectedMethod.value] : 'Payment'));
const amountText = computed(() => formatMoney(displayAmount.value, displayCurrency.value));
const formattedAmount = computed(() => formatAmount(displayAmount.value, displayCurrency.value));

const announce = computed(
  () =>
    ({
      loading: 'Preparing checkout',
      list: 'Choose a payment method',
      phone: 'Mobile money',
      preparing: `Opening ${pspName.value}`,
      bridge: `Opening ${pspName.value}`,
      processing: 'Processing payment',
      receipt: 'Payment received',
      failure: 'Payment failed',
    })[view.value]
);

const receiptProvider = computed(() => {
  const res = result.value;
  if (!res) return '';
  return (
    providerOptions.value.find((p) => p.provider.toLowerCase() === res.psp?.toLowerCase())?.name ||
    titleCase(res.psp || pspName.value)
  );
});

const failureMessage = computed(
  () => pspError.value?.message || error.value?.message || 'Something went wrong. Please try again.'
);

// Bridge props
const mpesaEndpoint = computed(
  () => `${props.apiBaseUrl || 'https://api.reevit.io'}/v1/payments/${paymentIntent.value?.id}/mpesa`
);
const mpesaReference = computed(
  () => paymentIntent.value?.reference || props.reference || `mpesa_${paymentIntent.value?.id ?? ''}`
);
const bridgeTitle = computed(() =>
  pspLower.value === 'hubtel' && hubtelOpen.value
    ? 'Complete your payment with Hubtel'
    : `Opening ${pspName.value}…`
);

// Lock scroll when open
watch(isModalVisible, (val: any) => {
  if (val) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  cancelHubtel();
  document.body.style.overflow = '';
  clearSuccessTimeout();
});
</script>

<template>
  <div class="reevit-sdk-container" :style="themeVars">
    <slot :open="handleOpen" :is-loading="loading">
      <button
        type="button"
        class="reevit-pay-button"
        :disabled="loading"
        @click="handleOpen"
      >
        <span v-if="loading" class="reevit-spinner"></span>
        <slot name="button-text" v-else>Pay Now</slot>
      </button>
    </slot>

    <Teleport to="body">
      <CheckoutShell
        v-if="isModalVisible"
        :theme="dataTheme"
        :style-vars="ctaVars"
        :brand-name="brandName || 'Checkout'"
        :has-brand-name="!!brandName"
        :logo-url="resolvedTheme.logoUrl"
        :amount-text="amountText"
        :order-ref="orderRef"
        :footer-provider="footerProvider"
        :view-key="panelView"
        :announce="announce"
        :confirm-open="confirmLeave"
        @request-close="requestClose"
        @stay="confirmLeave = false"
        @leave="handleClose"
      >
        <div
          :key="panelView"
          :class="`reevit-panel reevit-panel--${direction}`"
          data-reevit="panel"
          :data-step="panelView"
        >
          <LoadingState v-if="view === 'loading'" title="Preparing checkout" />

          <LoadingState
            v-else-if="view === 'processing'"
            title="Processing payment"
            message="Please don’t close this window."
          />

          <ReceiptPanel
            v-else-if="view === 'receipt' && result"
            :reference="result.reference || result.paymentId"
            :method="METHOD_LABEL[result.paymentMethod] || methodLabel"
            :provider="receiptProvider"
            :merchant-name="brandName || 'Checkout'"
            :order-ref="orderRef"
            :amount-text="amountText"
            @done="finishReceipt"
          />

          <FailurePanel
            v-else-if="view === 'failure'"
            :title="paymentIntent ? 'Payment failed' : 'Couldn’t start checkout'"
            :message="failureMessage"
            @retry="handleBack"
          />

          <template v-else-if="view === 'phone'">
            <PanelHead title="Mobile money" :back="!directPhone" @back="handlePanelBack" />
            <MobileMoneyForm
              mode="mpesa"
              :initial-phone="momoData?.phone || props.phone"
              :submit-label="`Pay ${amountText}`"
              hide-cancel
              @submit="handleMomoSubmit"
            />
          </template>

          <template v-else-if="view === 'preparing'">
            <PanelHead v-if="pspLower !== 'mpesa'" :title="methodLabel" back @back="handlePanelBack" />
            <LoadingState variant="line" :title="`Opening ${pspName}…`" />
          </template>

          <!-- M-Pesa's own waiting/failed panels carry the heading and the way back. -->
          <template v-else-if="view === 'bridge'">
            <PanelHead v-if="pspLower !== 'mpesa'" :title="methodLabel" back @back="handleProviderClose" />
            <MPesaBridge
              v-if="pspLower === 'mpesa'"
              :api-endpoint="mpesaEndpoint"
              :phone-number="momoData?.phone || props.phone || ''"
              :amount="displayAmount"
              :reference="mpesaReference"
              :description="`Payment ${paymentIntent?.reference || props.reference || ''}`"
              auto-start
              can-change-number
              @change-number="stage = 'phone'"
              @error="(err) => emit('error', err)"
            />
            <StripeBridge
              v-else-if="pspLower === 'stripe'"
              :publishable-key="paymentIntent?.pspPublicKey || props.publicKey || ''"
              :client-secret="paymentIntent?.clientSecret || ''"
              :amount="displayAmount"
              :currency="displayCurrency"
              :dark="dataTheme === 'dark'"
              @success="onProviderSuccess"
              @error="handleStripeError"
            />
            <LoadingState v-else-if="pspLower in PROVIDER_FOOTER" variant="line" :title="bridgeTitle" />
            <div v-else class="reevit-result" data-reevit="failure">
              <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">
                <span class="reevit-fail-dot" aria-hidden="true" />Provider not supported
              </h2>
              <p class="reevit-text">{{ psp }} is not supported.</p>
              <button type="button" class="reevit-cta" data-reevit="cta" data-first="" @click="handlePanelBack">Go back</button>
            </div>
          </template>

          <MethodList v-else :methods="methodList" :country="country" @pick="handlePick" />
        </div>
      </CheckoutShell>
    </Teleport>
  </div>
</template>
