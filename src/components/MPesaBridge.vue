<script setup lang="ts">
/**
 * MPesaBridge
 * M-Pesa STK Push (Kenya/Tanzania). The push itself is server-to-server; this
 * component sends the request and shows the waiting and failed panels while the
 * customer approves on their phone. The final result arrives by webhook.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { initiateMPesaSTKPush } from '../bridges/loaders';
import LoadingState from './LoadingState.vue';
import Scope from './Scope.vue';

const props = withDefaults(
  defineProps<{
    /** API endpoint to initiate STK Push. */
    apiEndpoint: string;
    /** Customer phone number in format 254XXXXXXXXX. */
    phoneNumber: string;
    amount: number;
    reference: string;
    description?: string;
    /** Send the STK Push on mount instead of waiting for the "Send payment request" button. */
    autoStart?: boolean;
    /** Shows a "Use another number" action while waiting or after a failure. */
    canChangeNumber?: boolean;
  }>(),
  { autoStart: false, canChangeNumber: false }
);

const emit = defineEmits<{
  (e: 'initiated', checkoutRequestId: string | undefined): void;
  (e: 'error', error: { code: string; message: string }): void;
  (e: 'changeNumber'): void;
}>();

type MPesaState = 'idle' | 'initiating' | 'waiting' | 'failed';

/** 254722334455 -> "+254 722 334 455". Anything else is shown as given. */
function formatKenyaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
}

const state = ref<MPesaState>('idle');
const error = ref<string | null>(null);
const checkoutRequestId = ref<string | null>(null);
let alive = true;

const initiateSTKPush = async () => {
  state.value = 'initiating';
  error.value = null;

  let failure: string | undefined;
  const result = await initiateMPesaSTKPush(
    {
      phoneNumber: props.phoneNumber,
      amount: props.amount,
      reference: props.reference,
      description: props.description || `Payment ${props.reference}`,
      onInitiated: () => {},
      onSuccess: () => {},
      onError: (err) => { failure = err.message; },
    },
    props.apiEndpoint
  );
  if (!alive) return;

  if (result.status === 'failed') {
    const message = failure || result.message || 'Failed to initiate M-Pesa payment';
    error.value = message;
    state.value = 'failed';
    emit('error', { code: 'MPESA_INIT_ERROR', message });
    return;
  }

  checkoutRequestId.value = result.transactionId ?? null;
  state.value = 'waiting';
  emit('initiated', result.transactionId);
};

// The checkout has already collected the number on its own screen, so it
// starts the push straight away instead of asking for a second tap.
onMounted(() => {
  if (props.autoStart) void initiateSTKPush();
});
onBeforeUnmount(() => { alive = false; });

const shownPhone = computed(() => formatKenyaPhone(props.phoneNumber));
</script>

<template>
  <Scope v-if="state === 'idle'">
    <div class="reevit-wait" data-reevit="bridge-idle">
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">Pay with M-Pesa</h2>
      <p class="reevit-text">We’ll send a prompt to <span class="reevit-mono">{{ shownPhone }}</span>.</p>
      <button type="button" class="reevit-cta" data-reevit="cta" data-first="" @click="initiateSTKPush">
        Send payment request
      </button>
    </div>
  </Scope>

  <LoadingState v-else-if="state === 'initiating'" variant="line" title="Sending a prompt to your phone…" />

  <Scope v-else-if="state === 'waiting'">
    <div class="reevit-wait" data-reevit="mpesa-waiting" :data-request-id="checkoutRequestId ?? undefined">
      <span class="reevit-spin reevit-spin--lg" aria-hidden="true" />
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">Approve on your phone</h2>
      <p class="reevit-text">Check <span class="reevit-mono">{{ shownPhone }}</span> for an M-Pesa prompt.</p>
      <p class="reevit-status" data-reevit="status" role="status" aria-live="polite">Waiting for your approval…</p>
      <div v-if="canChangeNumber" class="reevit-links">
        <button type="button" class="reevit-link" data-reevit="change-number" @click="emit('changeNumber')">Use another number</button>
      </div>
    </div>
  </Scope>

  <Scope v-else-if="state === 'failed'">
    <div class="reevit-result" data-reevit="failure">
      <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">
        <span class="reevit-fail-dot" aria-hidden="true" />Payment request failed
      </h2>
      <p class="reevit-text">{{ error || 'Something went wrong. Please try again.' }}</p>
      <button type="button" class="reevit-cta" data-reevit="cta" data-first="" @click="initiateSTKPush">Try again</button>
      <button v-if="canChangeNumber" type="button" class="reevit-cta-secondary" @click="emit('changeNumber')">Use another number</button>
    </div>
  </Scope>
</template>
