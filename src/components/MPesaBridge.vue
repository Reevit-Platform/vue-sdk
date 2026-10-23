<script setup lang="ts">
/**
 * MPesaBridge
 * M-Pesa STK Push (Kenya/Tanzania). Creating the payment is what sends the
 * push: the server pushes the prompt to the number the payment was created
 * with. This component only waits. It polls the public confirm-intent route
 * and ends on `succeeded` or a final failure, never on `pending`.
 *
 * Phase 0 stopgap: replaced by the Phase 1 status endpoint.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ReevitAPIClient } from '@reevit/core';
import { pollPaymentStatus } from '../utils/pollPaymentStatus';
import Scope from './Scope.vue';

/** Poll every 4 s, and give up after 2 min (the prompt expires on the handset around then). */
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 120_000;

const props = withDefaults(
  defineProps<{
    /** The payment the STK push was sent for. */
    paymentId: string;
    /** The payment's client secret, for the public confirm-intent route. */
    clientSecret?: string;
    /** Public key, used only when there is no client secret. */
    publicKey?: string;
    /** API base URL (defaults to production). */
    apiBaseUrl?: string;
    /** Customer phone number in format 254XXXXXXXXX. */
    phoneNumber: string;
    /** Merchant order reference, passed back with the result. */
    reference?: string;
    /** Shows a "Try again" action on the failure panel (a new prompt to the same number). */
    canRetry?: boolean;
    /** Shows a "Use another number" action while waiting or after a failure. */
    canChangeNumber?: boolean;
  }>(),
  { canRetry: false, canChangeNumber: false }
);

const emit = defineEmits<{
  (e: 'success', result: { transactionId: string; reference: string; pspReference: string }): void;
  (e: 'error', error: { code: string; message: string; recoverable: boolean }): void;
  (e: 'retry'): void;
  (e: 'changeNumber'): void;
}>();

type FailureKind = 'declined' | 'timeout';

const FAILURE_COPY: Record<FailureKind, { title: string; message: string; code: string }> = {
  declined: {
    title: 'Payment not approved',
    message: 'The M-Pesa request was declined or cancelled.',
    code: 'PAYMENT_DECLINED',
  },
  timeout: {
    title: 'No response in time',
    message: 'We didn’t get an approval from your phone.',
    code: 'PAYMENT_TIMEOUT',
  },
};

/** 254722334455 -> "+254 722 334 455". Anything else is shown as given. */
function formatKenyaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
}

const failure = ref<FailureKind | null>(null);
const controller = new AbortController();

onMounted(async () => {
  const client = new ReevitAPIClient({ publicKey: props.publicKey, baseUrl: props.apiBaseUrl });
  const { paymentId, clientSecret } = props;

  const outcome = await pollPaymentStatus({
    check: () => (clientSecret ? client.confirmPaymentIntent(paymentId, clientSecret) : client.confirmPayment(paymentId)),
    signal: controller.signal,
    intervalMs: POLL_INTERVAL_MS,
    timeoutMs: POLL_TIMEOUT_MS,
  });

  if (outcome.kind === 'aborted') return;
  if (outcome.kind === 'succeeded') {
    const pspReference = (outcome.data.provider_ref_id as string | undefined) || paymentId;
    emit('success', { transactionId: pspReference, reference: props.reference || '', pspReference });
    return;
  }

  const kind: FailureKind = outcome.kind === 'timeout' ? 'timeout' : 'declined';
  failure.value = kind;
  emit('error', { code: FAILURE_COPY[kind].code, message: FAILURE_COPY[kind].message, recoverable: true });
});
onBeforeUnmount(() => controller.abort());

const shownPhone = computed(() => formatKenyaPhone(props.phoneNumber));
const copy = computed(() => (failure.value ? FAILURE_COPY[failure.value] : null));
</script>

<template>
  <Scope v-if="copy">
    <div class="reevit-result" data-reevit="failure" :data-failure="failure ?? undefined">
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">
        <span class="reevit-fail-dot" aria-hidden="true" />{{ copy.title }}
      </h2>
      <p class="reevit-text">{{ copy.message }}</p>
      <button v-if="canRetry" type="button" class="reevit-cta" data-reevit="cta" data-first="" @click="emit('retry')">Try again</button>
      <button v-if="canChangeNumber" type="button" class="reevit-cta-secondary" @click="emit('changeNumber')">Use another number</button>
    </div>
  </Scope>

  <Scope v-else>
    <div class="reevit-wait" data-reevit="mpesa-waiting" :data-payment-id="paymentId">
      <span class="reevit-spin reevit-spin--lg" aria-hidden="true" />
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">Approve on your phone</h2>
      <p class="reevit-text">Check <span class="reevit-mono">{{ shownPhone }}</span> for an M-Pesa prompt.</p>
      <p class="reevit-status" data-reevit="status" role="status" aria-live="polite">Waiting for your approval…</p>
      <div v-if="canChangeNumber" class="reevit-links">
        <button type="button" class="reevit-link" data-reevit="change-number" @click="emit('changeNumber')">Use another number</button>
      </div>
    </div>
  </Scope>
</template>
