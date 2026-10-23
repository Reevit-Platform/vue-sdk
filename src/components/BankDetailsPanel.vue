<script setup lang="ts">
/**
 * The account to pay into with Copy buttons and an expiry countdown, then "I've sent it";
 * once the clock runs out, "Get new details". Renders `useDirectBank`; decides nothing.
 */
import { computed, ref } from 'vue';
import type { BankDetails } from '../api/direct';
import type { DirectBank } from '../composables/useDirectBank';
import { useCountdown } from '../composables/useCountdown';
import { formatAccountNumber, plainAmount } from '../utils/bank';
import { mmss } from '../utils/momo';
import BankCopyButton from './BankCopyButton.vue';
import PanelHead from './PanelHead.vue';
import Scope from './Scope.vue';

const props = defineProps<{
  bank: DirectBank;
  details: BankDetails;
  currency: string;
  amountText: string;
  /** Show the back chevron (false when bank transfer is the only method). */
  back?: boolean;
  now?: () => number;
}>();
const emit = defineEmits<{ (e: 'back'): void }>();

const s = computed(() => props.bank.state);
const countdown = useCountdown(
  () => s.value.expiresAt,
  () => s.value.startedAt,
  () => (props.now ?? Date.now)(),
);
const announcement = ref('');
const expired = computed(() => s.value.phase === 'expired');
const rows = computed(() => {
  const d = props.details;
  const list: Array<{ label: string; text: string; raw?: string; mono?: boolean }> = [
    { label: 'Bank', text: d.bank },
    { label: 'Account number', text: formatAccountNumber(d.account_number), raw: d.account_number.replace(/\s/g, ''), mono: true },
  ];
  // Some providers (Flutterwave in Ghana) return no account name: the row is simply absent.
  if (d.account_name) list.push({ label: 'Account name', text: d.account_name });
  list.push({ label: 'Amount', text: props.amountText, raw: plainAmount(d.amount, props.currency), mono: true });
  return list;
});
</script>

<template>
  <Scope>
    <PanelHead title="Bank transfer" :back="back" @back="emit('back')" />
    <div data-reevit="bank" :data-state="expired ? 'expired' : 'live'" :data-payment-id="s.attempt?.id">
      <ul class="reevit-bank" data-reevit="bank-details">
        <li v-for="row in rows" :key="row.label">
          <div class="reevit-bank-cell">
            <small>{{ row.label }}</small>
            <span :class="row.mono ? 'reevit-bank-value reevit-mono' : 'reevit-bank-value'">{{ row.text }}</span>
          </div>
          <BankCopyButton v-if="row.raw !== undefined" :label="row.label" :value="row.raw" @copied="announcement = $event" />
        </li>
      </ul>
      <template v-if="expired">
        <p class="reevit-expiry">
          <span data-reevit="status" role="status" aria-live="polite">{{ s.notice ?? 'These details have expired.' }}</span>
        </p>
        <button type="button" class="reevit-cta" data-reevit="cta" data-first="" :disabled="s.busy" @click="bank.newDetails()">Get new details</button>
      </template>
      <template v-else>
        <p class="reevit-expiry">
          <span>Expires in</span>
          <span class="reevit-mono" data-reevit="countdown" role="timer" aria-label="Time left">{{ mmss(countdown.seconds) }}</span>
        </p>
        <p v-if="s.notice" class="reevit-status" data-reevit="status" role="status" aria-live="polite">{{ s.notice }}</p>
        <button type="button" class="reevit-cta" data-reevit="cta" data-first="" @click="bank.sent()">I’ve sent it</button>
      </template>
      <span class="reevit-sr" role="status" aria-live="polite">{{ announcement }}</span>
    </div>
  </Scope>
</template>
