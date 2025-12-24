<script setup lang="ts">
import { computed } from 'vue';
import { formatAmount, cn } from '@reevit/core';
import type { PaymentMethod } from '@reevit/core';

const props = defineProps<{
  methods: PaymentMethod[];
  selected: PaymentMethod | null;
  amount: number;
  currency: string;
}>();

const emit = defineEmits<{
  (e: 'select', method: PaymentMethod): void;
}>();

const availableMethods = computed(() => {
  return [
    {
      id: 'card' as const,
      name: 'Card',
      description: 'Visa, Mastercard, Maestro',
      icon: '💳',
    },
    {
      id: 'mobile_money' as const,
      name: 'Mobile Money',
      description: 'MTN, Vodafone, AirtelTigo',
      icon: '📱',
    },
    {
      id: 'bank_transfer' as const,
      name: 'Bank Transfer',
      description: 'Transfer directly from your bank',
      icon: '🏦',
    },
  ].filter(m => props.methods.includes(m.id));
});
</script>

<template>
  <div class="reevit-method-selector">
    <h3 class="reevit-section-title">Select Payment Method</h3>
    <p class="reevit-amount-display">
      Pay {{ formatAmount(amount, currency) }}
    </p>

    <div class="reevit-methods-grid">
      <button
        v-for="method in availableMethods"
        :key="method.id"
        type="button"
        :class="cn('reevit-method-card', selected === method.id && 'reevit-method-card--selected')"
        @click="emit('select', method.id)"
      >
        <span class="reevit-method-icon">{{ method.icon }}</span>
        <div class="reevit-method-info">
          <span class="reevit-method-name">{{ method.name }}</span>
          <span class="reevit-method-description">{{ method.description }}</span>
        </div>
        <div class="reevit-method-radio">
          <div class="reevit-radio-inner" v-if="selected === method.id" />
        </div>
      </button>
    </div>
  </div>
</template>
