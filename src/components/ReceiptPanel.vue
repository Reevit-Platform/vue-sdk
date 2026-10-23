<script setup lang="ts">
/** Receipt panel (Ledger result). */
import { ref } from 'vue';

const props = defineProps<{
  reference: string;
  method: string;
  provider: string;
  merchantName: string;
  orderRef?: string;
  amountText: string;
}>();

const emit = defineEmits<{ (e: 'done'): void }>();

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const formatDate = (date: Date) =>
  date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Frozen at first render so the receipt time never changes while it is open.
const paidAt = ref(formatDate(new Date()));

const download = () => {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const row = (k: string, v: string) =>
    `<tr><td style="color:#6b6a64;padding:6px 24px 6px 0">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`;
  const html =
    `<!doctype html><meta charset="utf-8"><title>Receipt ${escapeHtml(props.orderRef || props.reference)}</title>` +
    `<body style="font:15px/1.5 system-ui;color:#151513;background:#f4f3ee;padding:40px">` +
    `<h1 style="font-size:20px;margin:0 0 4px">${escapeHtml(props.merchantName)}</h1>` +
    `<p style="margin:0 0 24px;color:#6b6a64">Payment receipt</p><table>` +
    (props.orderRef ? row('Order', props.orderRef) : '') +
    `${row('Amount', props.amountText)}${row('Reference', props.reference)}${row('Method', props.method)}${row('Provider', props.provider)}${row('Date', paidAt.value)}</table>` +
    `<p style="margin-top:24px;color:#6b6a64">Secured by Reevit</p>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = `receipt-${props.orderRef || props.reference}.html`;
  document.body.append(a);
  a.click();
  a.remove();
  const href = a.href;
  setTimeout(() => URL.revokeObjectURL(href), 1000);
};
</script>

<template>
  <div class="reevit-result reevit-result--ok">
    <svg class="reevit-result-icon" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="19" />
      <path class="reevit-tick" d="M14 22.5l6 6 10-12" />
    </svg>
    <h2 class="reevit-panel-title" tabindex="-1" data-reevit="panel-title">Payment received</h2>
    <dl class="reevit-receipt" data-reevit="receipt">
      <div><dt>Reference</dt><dd class="reevit-mono">{{ reference }}</dd></div>
      <div><dt>Method</dt><dd>{{ method }}</dd></div>
      <div><dt>Provider</dt><dd>{{ provider }}</dd></div>
      <div><dt>Date</dt><dd class="reevit-mono">{{ paidAt }}</dd></div>
    </dl>
    <button type="button" class="reevit-cta" data-reevit="done" data-first="" @click="emit('done')">Done</button>
    <button type="button" class="reevit-cta-secondary" data-reevit="download" @click="download">Download receipt</button>
  </div>
</template>
