<script lang="ts">
import type { InjectionKey } from 'vue';

/** Provided by CheckoutShell: true when a `.reevit-root` already wraps the tree. */
export const SCOPE_KEY: InjectionKey<boolean> = Symbol('reevit-scope');
</script>

<script setup lang="ts">
/**
 * Scope
 * Every Ledger style is scoped under `.reevit-root`. Inside ReevitCheckout that
 * root already exists; the bridges rendered on their own get a static one so
 * they look the same without a dialog around them.
 */
import { inject } from 'vue';

defineProps<{ dark?: boolean }>();

const inside = inject(SCOPE_KEY, false);
</script>

<template>
  <slot v-if="inside" />
  <div
    v-else
    class="reevit-root reevit-root--inline"
    :data-reevit-theme="dark ? 'dark' : undefined"
  >
    <slot />
  </div>
</template>
