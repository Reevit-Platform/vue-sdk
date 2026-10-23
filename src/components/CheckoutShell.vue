<script setup lang="ts">
/**
 * CheckoutShell
 * The Ledger dialog frame: scrim, header, amount line, scrolling body, footer,
 * leave-confirmation, and the accessibility plumbing (focus in, Tab trap, Esc,
 * focus return to the opener, polite live region).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, useId, watch, type CSSProperties } from 'vue';
import { SCOPE_KEY } from './Scope.vue';
import type { FooterProvider } from '../utils';

const props = defineProps<{
  theme?: 'light' | 'dark';
  styleVars?: CSSProperties;
  brandName: string;
  logoUrl?: string;
  /** True when brandName is a real company name (drives the initial fallback). */
  hasBrandName: boolean;
  amountText: string;
  orderRef?: string;
  footerProvider?: FooterProvider | null;
  /** Changes whenever a new view mounts; moves focus into it. */
  viewKey: string;
  /** Text announced to screen readers when the view changes. */
  announce: string;
  confirmOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'requestClose'): void;
  (e: 'stay'): void;
  (e: 'leave'): void;
}>();

provide(SCOPE_KEY, true);

const titleId = `reevit-title-${useId()}`;
const confirmTitleId = `reevit-confirm-title-${useId()}`;
const rootRef = ref<HTMLElement | null>(null);
const dialogRef = ref<HTMLElement | null>(null);
const bodyRef = ref<HTMLElement | null>(null);
const confirmRef = ref<HTMLElement | null>(null);
const stayRef = ref<HTMLButtonElement | null>(null);
const live = ref('');
// `inert` takes the header, amount, body and footer out of the tab order while the leave confirm is open.
const inertAttrs = computed<Record<string, unknown>>(() => (props.confirmOpen ? { inert: '' } : {}));

const FOCUSABLE = 'button,input,a[href],[tabindex]:not([tabindex="-1"])';

let lastFocus: Element | null = null;
let opener: Element | null = null;
let frame = 0;

const focusFirstInView = () => {
  const body = bodyRef.value;
  if (!body) return;
  const target = body.querySelector<HTMLElement>('[data-first]') ?? body.querySelector<HTMLElement>('[data-reevit="panel-title"]');
  target?.focus({ preventScroll: true });
};

const announceView = () => {
  live.value = '';
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => { live.value = props.announce; });
};

const onKeyDown = (e: KeyboardEvent) => {
  const root = rootRef.value;
  if (!root) return;
  const active = document.activeElement;
  // Leave keys alone while focus is in a provider window or elsewhere on the page.
  if (active && active !== document.body && !root.contains(active)) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    if (props.confirmOpen) emit('stay');
    else emit('requestClose');
    return;
  }
  if (e.key !== 'Tab') return;

  const scope = props.confirmOpen ? confirmRef.value : dialogRef.value;
  if (!scope) return;
  const items = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (n) => !(n as HTMLButtonElement).disabled && !n.closest('[inert],[hidden]'),
  );
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (!active || !scope.contains(active)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && (active === first || !items.includes(active as HTMLElement))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
};

onMounted(() => {
  document.addEventListener('keydown', onKeyDown, true);
  // Focus is already inside the first view by the time this runs; capture the opener before it moved.
  focusFirstInView();
  announceView();
});

// Return focus to whatever opened the checkout. `opener` is read at setup time, before the dialog steals focus.
if (typeof document !== 'undefined') opener = document.activeElement;

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown, true);
  cancelAnimationFrame(frame);
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
});

// Move focus into each new view and announce it.
watch(
  () => props.viewKey,
  async () => {
    await nextTick();
    focusFirstInView();
    announceView();
  },
);

// Leave confirmation takes focus, and gives it back when dismissed.
watch(
  () => props.confirmOpen,
  async (open) => {
    if (open) {
      lastFocus = document.activeElement;
      await nextTick();
      stayRef.value?.focus({ preventScroll: true });
      live.value = 'Leave checkout? Your payment hasn’t finished.';
      return;
    }
    const prev = lastFocus;
    lastFocus = null;
    if (prev instanceof HTMLElement && prev.isConnected) prev.focus({ preventScroll: true });
  },
);

const onScrimClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) emit('requestClose');
};
</script>

<template>
  <div ref="rootRef" class="reevit-root" :style="styleVars" data-reevit="root" :data-reevit-theme="theme">
    <div class="reevit-scrim" data-reevit="scrim" @click="onScrimClick">
      <div
        ref="dialogRef"
        class="reevit-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <i class="reevit-grabber" aria-hidden="true" />
        <header class="reevit-header" data-reevit="header" v-bind="inertAttrs">
          <div class="reevit-brand">
            <img v-if="logoUrl" class="reevit-brand-logo" :src="logoUrl" alt="" />
            <span v-else-if="hasBrandName" class="reevit-brand-initial" aria-hidden="true">{{ brandName.charAt(0).toUpperCase() }}</span>
            <h1 :id="titleId" class="reevit-title" data-reevit="title">{{ brandName }}</h1>
          </div>
          <button type="button" class="reevit-close" data-reevit="close" aria-label="Close checkout" @click="emit('requestClose')">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
          </button>
        </header>
        <div class="reevit-summary" v-bind="inertAttrs">
          <span class="reevit-amount reevit-mono" data-reevit="amount">{{ amountText }}</span>
          <span v-if="orderRef" class="reevit-ref" data-reevit="ref">{{ orderRef }}</span>
        </div>
        <div ref="bodyRef" class="reevit-body" data-reevit="body" v-bind="inertAttrs"><slot /></div>
        <footer class="reevit-footer" data-reevit="footer" v-bind="inertAttrs">
          <span>Secured by Reevit</span>
          <template v-if="footerProvider">
            <span class="reevit-footer-sep" aria-hidden="true" />
            <img
              class="reevit-footer-logo"
              data-reevit="footer-logo"
              :data-kind="footerProvider.kind"
              :data-provider="footerProvider.id"
              :src="footerProvider.src"
              :alt="footerProvider.name"
            />
          </template>
        </footer>
        <div
          v-if="confirmOpen"
          ref="confirmRef"
          class="reevit-confirm"
          data-reevit="confirm"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="confirmTitleId"
        >
          <div class="reevit-confirm-box">
            <h2 :id="confirmTitleId" tabindex="-1">Leave checkout?</h2>
            <p>Your payment hasn’t finished.</p>
            <button ref="stayRef" type="button" class="reevit-cta" data-reevit="stay" @click="emit('stay')">Keep paying</button>
            <button type="button" class="reevit-cta-secondary" data-reevit="leave" @click="emit('leave')">Leave</button>
          </div>
        </div>
      </div>
    </div>
    <div class="reevit-sr" role="status" aria-live="polite" data-reevit="live">{{ live }}</div>
  </div>
</template>
