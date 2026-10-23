<script setup lang="ts">
/**
 * MobileMoneyForm
 * Collects the mobile money number. Two layouts:
 *  - `network` (Ghana): number + network picker. The network is auto-selected
 *    from the number's prefix as it is typed and can be overridden.
 *  - `mpesa` (Kenya): +254 prefix, M-Pesa mark, no network choice. The submitted
 *    phone is normalised to `254XXXXXXXXX`, which is what the M-Pesa bridge sends.
 */
import { computed, ref, useId } from 'vue';
import { cn } from '@reevit/core';
import type { MobileMoneyFormData, MobileMoneyNetwork } from '@reevit/core';
import { detectGhanaNetwork, getMethodMarks, validateGhanaPhone } from '../utils';
import Scope from './Scope.vue';

const props = withDefaults(
  defineProps<{
    initialPhone?: string;
    loading?: boolean;
    /** Hide the secondary Back button (the panel header already has one). */
    hideCancel?: boolean;
    mode?: 'network' | 'mpesa';
    /** Primary button label, e.g. "Pay GHS 755.00". */
    submitLabel?: string;
  }>(),
  { initialPhone: '', mode: 'network', submitLabel: 'Continue' }
);

const emit = defineEmits<{
  (e: 'submit', data: MobileMoneyFormData): void;
  (e: 'cancel'): void;
}>();

type FormNetwork = MobileMoneyNetwork | 'mpesa';

const NETWORKS: { id: MobileMoneyNetwork; name: string }[] = [
  { id: 'mtn', name: 'MTN' },
  { id: 'telecel', name: 'Telecel' },
  { id: 'airteltigo', name: 'AirtelTigo' },
];

const digitsOf = (value: string) => value.replace(/\D/g, '');

/** 0244128890 -> "024 412 8890". International input (+233…) is left as typed. */
function formatLocal(value: string): string {
  if (value.startsWith('+')) return '+' + digitsOf(value).slice(0, 12);
  const d = digitsOf(value).slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(' ');
}

/** National part of a Kenyan number: strips +254 / 254 / a leading 0, keeps 9 digits. */
function nationalKenya(value: string): string {
  let d = digitsOf(value);
  if (d.startsWith('254')) d = d.slice(3);
  return d.replace(/^0/, '').slice(0, 9);
}

const formatKenya = (value: string) => (nationalKenya(value).match(/.{1,3}/g) || []).join(' ');

const mpesa = computed(() => props.mode === 'mpesa');
const inputId = `reevit-phone-${useId()}`;
const errorId = `${inputId}-error`;
const networkErrorId = `${inputId}-network-error`;

const phone = ref(mpesa.value ? formatKenya(props.initialPhone) : formatLocal(props.initialPhone));
const network = ref<FormNetwork | null>(
  mpesa.value ? 'mpesa' : props.initialPhone ? detectGhanaNetwork(props.initialPhone) : null
);
// Detection only overrides the choice when the number's operator changes, so a
// manual pick survives further typing within the same operator.
let lastDetected: string | null = !mpesa.value && props.initialPhone ? detectGhanaNetwork(props.initialPhone) : null;
const error = ref<string | null>(null);
const networkError = ref<string | null>(null);

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  error.value = null;
  if (mpesa.value) {
    phone.value = formatKenya(target.value);
    target.value = phone.value;
    return;
  }
  const next = formatLocal(target.value.replace(/[^0-9+]/g, ''));
  phone.value = next;
  target.value = next;
  const detected = detectGhanaNetwork(next.replace(/\s/g, ''));
  if (detected && detected !== lastDetected) {
    network.value = detected;
    networkError.value = null;
  }
  lastDetected = detected;
};

const handleSubmit = () => {
  if (mpesa.value) {
    const national = nationalKenya(phone.value);
    if (national.length !== 9 || !/^[17]/.test(national)) {
      error.value = 'Enter a valid M-Pesa number';
      return;
    }
    emit('submit', { phone: `254${national}`, network: 'mpesa' as unknown as MobileMoneyNetwork });
    return;
  }

  const raw = phone.value.replace(/\s/g, '');
  if (!raw || !validateGhanaPhone(raw)) {
    error.value = 'Enter a 10-digit number, like 024 412 8890';
    return;
  }
  if (!network.value) {
    networkError.value = 'Choose your network';
    return;
  }
  if (!validateGhanaPhone(raw, network.value)) {
    error.value = 'This number doesn’t match the selected network';
    return;
  }
  emit('submit', { phone: raw, network: network.value as MobileMoneyNetwork });
};

const logos = computed(() => (mpesa.value ? [] : getMethodMarks('GH', 'mobile_money')));
const suffix = computed(() => (mpesa.value ? getMethodMarks('KE', 'mobile_money')[0] : undefined));
</script>

<template>
  <Scope>
    <form class="reevit-form" data-reevit="momo-form" novalidate @submit.prevent="handleSubmit">
      <div class="reevit-field">
        <label :for="inputId">{{ mpesa ? 'M-Pesa number' : 'Mobile money number' }}</label>
        <div :class="cn('reevit-input', mpesa && 'reevit-input--prefixed', !!error && 'reevit-input--invalid')">
          <span v-if="mpesa" class="reevit-prefix" aria-hidden="true">+254</span>
          <input
            :id="inputId"
            type="tel"
            inputmode="tel"
            class="reevit-mono"
            autocomplete="tel-national"
            :placeholder="mpesa ? '712 345 678' : '024 412 8890'"
            :value="phone"
            :disabled="loading"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? errorId : undefined"
            data-first=""
            @input="onInput"
          />
          <span v-if="suffix" class="reevit-suffix" aria-hidden="true">
            <img :src="suffix.src" :data-mark="suffix.key" alt="" />
          </span>
        </div>
        <p v-if="error" :id="errorId" class="reevit-error" role="alert">{{ error }}</p>
      </div>

      <fieldset v-if="!mpesa" class="reevit-group">
        <legend>Network</legend>
        <div class="reevit-networks">
          <button
            v-for="n in NETWORKS"
            :key="n.id"
            type="button"
            class="reevit-network"
            :aria-pressed="network === n.id"
            :disabled="loading"
            @click="network = n.id; networkError = null"
          >
            <img
              v-if="logos.find((mark) => mark.key === n.id)"
              :src="logos.find((mark) => mark.key === n.id)!.src"
              :data-mark="n.id"
              alt=""
            />{{ n.name }}
          </button>
        </div>
        <p v-if="networkError" :id="networkErrorId" class="reevit-error" role="alert">{{ networkError }}</p>
      </fieldset>

      <button type="submit" class="reevit-cta" data-reevit="cta" :disabled="loading">
        {{ loading ? 'Please wait' : submitLabel }}
      </button>
      <button v-if="!hideCancel" type="button" class="reevit-cta-secondary" :disabled="loading" @click="emit('cancel')">
        Back
      </button>
    </form>
  </Scope>
</template>
