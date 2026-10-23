<script setup lang="ts">
/**
 * MethodList
 * The Ledger method list: one row per payment method, brand marks on the right.
 */
import type { PaymentMethod } from '@reevit/core';
import { getMethodMarks, METHOD_LABEL } from '../utils';

defineProps<{
  methods: PaymentMethod[];
  country: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ (e: 'pick', method: PaymentMethod): void }>();
</script>

<template>
  <ul class="reevit-list" data-reevit="list" aria-label="Payment methods">
    <li v-for="(method, index) in methods" :key="method">
      <button
        type="button"
        class="reevit-row"
        data-reevit="row"
        :data-method="method"
        :data-first="index === 0 ? '' : undefined"
        :disabled="disabled"
        @click="emit('pick', method)"
      >
        <span class="reevit-row-label">{{ METHOD_LABEL[method] }}</span>
        <span class="reevit-marks" data-reevit="marks" aria-hidden="true">
          <img
            v-for="mark in getMethodMarks(country, method)"
            :key="mark.key"
            :src="mark.src"
            :data-mark="mark.key"
            alt=""
          />
        </span>
        <span class="reevit-chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5L10.5 8 6 12.5" /></svg>
        </span>
      </button>
    </li>
  </ul>
  <h2 class="reevit-sr" tabindex="-1" data-reevit="panel-title">Choose a payment method</h2>
</template>
