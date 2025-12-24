<script setup lang="ts">
import { ref, watch } from 'vue';
import { validatePhone, detectNetwork, formatPhone, cn } from '@reevit/core';
import type { MobileMoneyNetwork, MobileMoneyFormData } from '@reevit/core';

const props = defineProps<{
  initialPhone?: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', data: MobileMoneyFormData): void;
}>();

const phone = ref(props.initialPhone || '');
const network = ref<MobileMoneyNetwork | null>(null);
const error = ref<string | null>(null);

// Auto-detect network
watch(phone, (val) => {
  const detected = detectNetwork(val);
  if (detected) {
    network.value = detected;
  }
  if (error.value) {
    error.value = null;
  }
});

const handleSubmit = () => {
  if (!validatePhone(phone.value)) {
    error.value = 'Please enter a valid phone number';
    return;
  }

  if (!network.value) {
    error.value = 'Please select your mobile network';
    return;
  }

  emit('submit', {
    phone: phone.value,
    network: network.value,
  });
};

const providers = [
  { id: 'mtn' as const, name: 'MTN', color: '#FFCC00' },
  { id: 'vodafone' as const, name: 'Vodafone', color: '#E60000' },
  { id: 'airteltigo' as const, name: 'AirtelTigo', color: '#005596' },
];
</script>

<template>
  <form class="reevit-momo-form" @submit.prevent="handleSubmit">
    <div class="reevit-form-group">
      <label class="reevit-label" for="reevit-phone">Phone Number</label>
      <input
        id="reevit-phone"
        v-model="phone"
        type="tel"
        class="reevit-input"
        :class="{ 'reevit-input--error': error && !validatePhone(phone) }"
        placeholder="e.g. 024 123 4567"
        :disabled="loading"
        autocomplete="tel"
      />
    </div>

    <div class="reevit-network-selector">
      <label class="reevit-label">Select Network</label>
      <div class="reevit-networks-grid">
        <button
          v-for="provider in providers"
          :key="provider.id"
          type="button"
          :class="cn('reevit-network-btn', network === provider.id && 'reevit-network-btn--selected')"
          @click="network = provider.id"
          :disabled="loading"
        >
          <div 
            class="reevit-network-dot" 
            :style="{ backgroundColor: provider.color }" 
          />
          {{ provider.name }}
        </button>
      </div>
    </div>

    <p v-if="error" class="reevit-error-message">{{ error }}</p>

    <button 
      type="submit" 
      class="reevit-submit-btn" 
      :disabled="loading || !phone"
    >
      <span v-if="loading" class="reevit-spinner" />
      <span v-else>Continue</span>
    </button>

    <p class="reevit-secure-text">
      🔒 Secure mobile money payment via Reevit
    </p>
  </form>
</template>
