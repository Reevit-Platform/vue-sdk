<script setup lang="ts">
/**
 * MobileMoneyForm Component
 * Collects the mobile money phone number and network. The network is
 * auto-selected from the number's prefix as the user types, and can also
 * be picked manually.
 */

import { ref, computed, watch } from 'vue';
import { validatePhone, detectNetwork, formatPhone, cn } from '@reevit/core';
import type { MobileMoneyNetwork, MobileMoneyFormData } from '@reevit/core';

const props = defineProps<{
  initialPhone?: string;
  loading?: boolean;
  hideCancel?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', data: MobileMoneyFormData): void;
  (e: 'cancel'): void;
}>();

const phone = ref(props.initialPhone || '');
const network = ref<MobileMoneyNetwork | null>(null);
const error = ref<string | null>(null);
const touched = ref(false);

const networks: { id: MobileMoneyNetwork; name: string }[] = [
  { id: 'mtn', name: 'MTN' },
  { id: 'telecel', name: 'Telecel' },
  { id: 'airteltigo', name: 'AirtelTigo' },
];

// Auto-select the network that matches the number's prefix as it's typed.
// The user can still override by tapping a network button.
watch(phone, (val) => {
  const detected = detectNetwork(val) as MobileMoneyNetwork | null;
  if (detected) {
    network.value = detected;
  }
});

watch([phone, network, touched], () => {
  if (touched.value && phone.value) {
    if (!validatePhone(phone.value)) {
      error.value = 'Enter a valid mobile money number';
    } else {
      error.value = null;
    }
  }
});

const handlePhoneInput = (e: Event) => {
  const value = (e.target as HTMLInputElement).value.replace(/[^0-9+]/g, '');
  phone.value = value;
};

const handleSubmit = () => {
  touched.value = true;

  if (!phone.value || !validatePhone(phone.value)) {
    error.value = 'Enter a valid mobile money number';
    return;
  }

  if (!network.value) {
    error.value = 'Select your mobile money network';
    return;
  }

  emit('submit', { phone: phone.value, network: network.value });
};

const isValid = computed(
  () => !!phone.value && !!network.value && validatePhone(phone.value)
);
</script>

<template>
  <form class="reevit-brut__momo" @submit.prevent="handleSubmit">
    <div class="reevit-brut__field">
      <label for="reevit-phone" class="reevit-brut__field-label">
        Phone number
      </label>
      <input
        id="reevit-phone"
        type="tel"
        :class="cn('reevit-brut__input', !!error && 'reevit-brut__input--error')"
        placeholder="024 XXX XXXX"
        :value="phone"
        @input="handlePhoneInput"
        @blur="touched = true"
        :disabled="loading"
        autocomplete="tel"
      />
      <div v-if="phone && !error" class="reevit-brut__input-note">
        {{ formatPhone(phone) }}
      </div>
      <div v-if="error" class="reevit-brut__input-error">{{ error }}</div>
    </div>

    <div class="reevit-brut__field">
      <span class="reevit-brut__field-label">Select network</span>
      <div class="reevit-brut__networks">
        <button
          v-for="n in networks"
          :key="n.id"
          type="button"
          class="reevit-brut__network"
          :data-selected="network === n.id"
          @click="network = n.id"
          :disabled="loading"
        >
          {{ n.name }}
        </button>
      </div>
    </div>

    <div class="reevit-brut__momo-actions">
      <button
        v-if="!hideCancel"
        type="button"
        class="reevit-brut__cta reevit-brut__cta--ghost"
        @click="emit('cancel')"
        :disabled="loading"
      >
        <span>BACK</span>
      </button>
      <button type="submit" class="reevit-brut__cta" :disabled="!isValid || loading">
        <span v-if="loading">PLEASE WAIT</span>
        <template v-else>
          <span>CONTINUE</span>
          <span>&rarr;</span>
        </template>
      </button>
    </div>

    <p class="reevit-brut__momo-hint">
      You will receive a USSD prompt on your phone to authorize the payment.
    </p>
  </form>
</template>
