<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@reevit/core';
import type { PaymentMethod } from '@reevit/core';

const props = defineProps<{
  methods: PaymentMethod[];
  selected: PaymentMethod | null;
  provider?: string;
  layout?: 'grid' | 'list';
  showLabel?: boolean;
}>();

const { showLabel = true } = props;

const emit = defineEmits<{
  (e: 'select', method: PaymentMethod): void;
}>();

const isGrid = computed(() => (props.layout || 'list') === 'grid');

const availableMethods = computed(() => {
  return [
    {
      id: 'card' as const,
      name: 'Card',
      icon: '💳',
      description: 'Pay with Visa, Mastercard, or other cards',
    },
    {
      id: 'mobile_money' as const,
      name: 'Mobile Money',
      icon: '📱',
      description: 'MTN, Vodafone Cash, AirtelTigo Money',
    },
    {
      id: 'bank_transfer' as const,
      name: 'Bank Transfer',
      icon: '🏦',
      description: 'Pay directly from your bank account',
    },
  ].filter(m => props.methods.includes(m.id));
});
</script>

<template>
  <div class="reevit-method-selector" :class="{ 'reevit-method-selector--grid': isGrid }">
    <div v-if="showLabel" class="reevit-method-selector__label">Select payment method</div>
    <div 
      class="reevit-method-selector__options" 
      :class="isGrid ? 'reevit-method-selector__options--grid' : 'reevit-method-selector__options--list'"
    >
      <button
        v-for="(method, index) in availableMethods"
        :key="method.id"
        type="button"
        class="reevit-method-option"
        :class="[
          isGrid ? 'reevit-method-option--grid' : 'reevit-method-option--list',
          { 'reevit-method-option--selected': selected === method.id }
        ]"
        :style="{ animationDelay: `${index * 0.05}s` }"
        @click="emit('select', method.id)"
      >
        <span class="reevit-method-option__icon-wrapper">
          <span class="reevit-method-option__icon">{{ method.icon }}</span>
        </span>
        <div class="reevit-method-option__content">
          <span class="reevit-method-option__label">{{ method.name }}</span>
          <span v-if="!isGrid" class="reevit-method-option__description">{{ method.description }}</span>
        </div>
        <template v-if="!isGrid">
          <span v-if="selected === method.id" class="reevit-method-option__check">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </span>
          <span v-else class="reevit-method-option__chevron">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </span>
        </template>
      </button>
    </div>
  </div>
</template>
