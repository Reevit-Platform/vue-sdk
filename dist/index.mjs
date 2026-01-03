import { ref as g, watch as O, computed as h, readonly as _, defineComponent as z, createElementBlock as m, openBlock as d, createElementVNode as r, toDisplayString as I, unref as D, Fragment as H, renderList as W, normalizeClass as U, createCommentVNode as E, withModifiers as X, withDirectives as ae, vModelText as oe, createTextVNode as Z, normalizeStyle as ee, onUnmounted as re, renderSlot as Y, createBlock as G, Teleport as se, createVNode as ie } from "vue";
import { createInitialState as le, ReevitAPIClient as ce, generateReference as ue, detectCountryFromCurrency as de, reevitReducer as me, formatAmount as pe, cn as te, detectNetwork as ye, validatePhone as J, createThemeVariables as ve } from "@reevit/core";
import { ReevitAPIClient as yt, cn as vt, createReevitClient as ht, detectCountryFromCurrency as ft, detectNetwork as bt, formatAmount as St, formatPhone as Pt, validatePhone as kt } from "@reevit/core";
function he(e) {
  const s = e.toLowerCase();
  return s.includes("paystack") ? "paystack" : s.includes("hubtel") ? "hubtel" : s.includes("flutterwave") ? "flutterwave" : "paystack";
}
function fe(e, s) {
  return {
    id: e.id,
    clientSecret: e.client_secret,
    pspPublicKey: e.psp_public_key,
    amount: e.amount,
    currency: e.currency,
    status: e.status,
    recommendedPsp: he(e.provider),
    availableMethods: s.paymentMethods || ["card", "mobile_money"],
    reference: e.reference || s.reference,
    connectionId: e.connection_id,
    provider: e.provider,
    feeAmount: e.fee_amount,
    feeCurrency: e.fee_currency,
    netAmount: e.net_amount,
    metadata: s.metadata
  };
}
function be(e) {
  const { config: s, onSuccess: t, onError: c, onClose: y, onStateChange: i, apiBaseUrl: u } = e, a = g(le());
  if (s.initialPaymentIntent) {
    const o = s.initialPaymentIntent;
    a.value = {
      ...a.value,
      status: "ready",
      paymentIntent: o,
      selectedMethod: o.availableMethods?.length === 1 ? o.availableMethods[0] : null
    };
  }
  const P = new ce({
    publicKey: s.publicKey,
    baseUrl: u
  }), p = (o) => {
    a.value = me(a.value, o);
  };
  O(
    () => a.value.status,
    (o) => {
      i?.(o);
    }
  );
  const v = async (o) => {
    p({ type: "INIT_START" });
    try {
      const n = s.reference || ue(), l = de(s.currency), w = o || s.paymentMethods?.[0] || "card", { data: S, error: V } = await P.createPaymentIntent(
        { ...s, reference: n },
        w,
        l
      );
      if (V) {
        p({ type: "INIT_ERROR", payload: V }), c?.(V);
        return;
      }
      if (!S) {
        const q = {
          code: "INIT_FAILED",
          message: "No data received from API",
          recoverable: !0
        };
        p({ type: "INIT_ERROR", payload: q }), c?.(q);
        return;
      }
      const ne = fe(S, { ...s, reference: n });
      p({ type: "INIT_SUCCESS", payload: ne });
    } catch (n) {
      const l = {
        code: "INIT_FAILED",
        message: n instanceof Error ? n.message : "Failed to initialize checkout",
        recoverable: !0,
        originalError: n
      };
      p({ type: "INIT_ERROR", payload: l }), c?.(l);
    }
  }, b = (o) => {
    p({ type: "SELECT_METHOD", payload: o });
  }, k = async (o) => {
    if (!(!a.value.paymentIntent || !a.value.selectedMethod)) {
      p({ type: "PROCESS_START" });
      try {
        let n;
        if (a.value.paymentIntent.clientSecret) {
          const { data: w, error: S } = await P.confirmPaymentIntent(
            a.value.paymentIntent.id,
            a.value.paymentIntent.clientSecret
          );
          if (S) {
            p({ type: "PROCESS_ERROR", payload: S }), c?.(S);
            return;
          }
          n = w;
        } else {
          const { data: w, error: S } = await P.confirmPayment(a.value.paymentIntent.id);
          if (S) {
            p({ type: "PROCESS_ERROR", payload: S }), c?.(S);
            return;
          }
          n = w;
        }
        const l = {
          paymentId: a.value.paymentIntent.id,
          reference: o.reference || a.value.paymentIntent.reference || a.value.paymentIntent.metadata?.reference || "",
          amount: a.value.paymentIntent.amount,
          currency: a.value.paymentIntent.currency,
          paymentMethod: a.value.selectedMethod,
          psp: a.value.paymentIntent.recommendedPsp,
          pspReference: o.pspReference || n?.provider_ref_id || "",
          status: "success",
          metadata: o
        };
        p({ type: "PROCESS_SUCCESS", payload: l }), t?.(l);
      } catch (n) {
        const l = {
          code: "PAYMENT_FAILED",
          message: n instanceof Error ? n.message : "Payment failed",
          recoverable: !0,
          originalError: n
        };
        p({ type: "PROCESS_ERROR", payload: l }), c?.(l);
      }
    }
  }, R = async (o) => {
    await k(o);
  }, L = (o) => {
    p({ type: "PROCESS_ERROR", payload: o }), c?.(o);
  }, C = () => {
    p({ type: "RESET" });
  }, F = async () => {
    if (a.value.paymentIntent && a.value.status !== "success")
      try {
        await P.cancelPaymentIntent(a.value.paymentIntent.id);
      } catch {
      }
    p({ type: "CLOSE" }), y?.();
  }, M = h(() => a.value.status), B = h(() => a.value.paymentIntent), T = h(() => a.value.selectedMethod), j = h(() => a.value.error), f = h(() => a.value.result), A = h(
    () => a.value.status === "loading" || a.value.status === "processing"
  ), $ = h(
    () => a.value.status === "ready" || a.value.status === "method_selected" || a.value.status === "processing"
  ), N = h(() => a.value.status === "success"), x = h(() => a.value.error?.recoverable ?? !1);
  return {
    // State (readonly refs)
    status: _(M),
    paymentIntent: _(B),
    selectedMethod: _(T),
    error: _(j),
    result: _(f),
    // Actions
    initialize: v,
    selectMethod: b,
    processPayment: k,
    handlePspSuccess: R,
    handlePspError: L,
    reset: C,
    close: F,
    // Computed
    isLoading: _(A),
    isReady: _($),
    isComplete: _(N),
    canRetry: _(x)
  };
}
const Se = { class: "reevit-method-selector" }, Pe = { class: "reevit-amount-display" }, ke = { class: "reevit-methods-grid" }, we = ["onClick"], _e = { class: "reevit-method-icon" }, Ce = { class: "reevit-method-info" }, Ee = { class: "reevit-method-name" }, Ie = { class: "reevit-method-description" }, Re = { class: "reevit-method-radio" }, Me = {
  key: 0,
  class: "reevit-radio-inner"
}, Te = /* @__PURE__ */ z({
  __name: "PaymentMethodSelector",
  props: {
    methods: {},
    selected: {},
    amount: {},
    currency: {}
  },
  emits: ["select"],
  setup(e, { emit: s }) {
    const t = e, c = s, y = h(() => [
      {
        id: "card",
        name: "Card",
        description: "Visa, Mastercard, Maestro",
        icon: "💳"
      },
      {
        id: "mobile_money",
        name: "Mobile Money",
        description: "MTN, Vodafone, AirtelTigo",
        icon: "📱"
      },
      {
        id: "bank_transfer",
        name: "Bank Transfer",
        description: "Transfer directly from your bank",
        icon: "🏦"
      }
    ].filter((i) => t.methods.includes(i.id)));
    return (i, u) => (d(), m("div", Se, [
      u[0] || (u[0] = r("h3", { class: "reevit-section-title" }, "Select Payment Method", -1)),
      r("p", Pe, " Pay " + I(D(pe)(e.amount, e.currency)), 1),
      r("div", ke, [
        (d(!0), m(H, null, W(y.value, (a) => (d(), m("button", {
          key: a.id,
          type: "button",
          class: U(D(te)("reevit-method-card", e.selected === a.id && "reevit-method-card--selected")),
          onClick: (P) => c("select", a.id)
        }, [
          r("span", _e, I(a.icon), 1),
          r("div", Ce, [
            r("span", Ee, I(a.name), 1),
            r("span", Ie, I(a.description), 1)
          ]),
          r("div", Re, [
            e.selected === a.id ? (d(), m("div", Me)) : E("", !0)
          ])
        ], 10, we))), 128))
      ])
    ]));
  }
}), $e = { class: "reevit-form-group" }, Ne = ["disabled"], ge = { class: "reevit-network-selector" }, Oe = { class: "reevit-networks-grid" }, De = ["onClick", "disabled"], Ke = {
  key: 0,
  class: "reevit-error-message"
}, Fe = ["disabled"], Ae = {
  key: 0,
  class: "reevit-spinner"
}, Ue = { key: 1 }, Le = /* @__PURE__ */ z({
  __name: "MobileMoneyForm",
  props: {
    initialPhone: {},
    loading: { type: Boolean }
  },
  emits: ["submit"],
  setup(e, { emit: s }) {
    const t = e, c = s, y = g(t.initialPhone || ""), i = g(null), u = g(null);
    O(y, (p) => {
      const v = ye(p);
      v && (i.value = v), u.value && (u.value = null);
    });
    const a = () => {
      if (!J(y.value)) {
        u.value = "Please enter a valid phone number";
        return;
      }
      if (!i.value) {
        u.value = "Please select your mobile network";
        return;
      }
      c("submit", {
        phone: y.value,
        network: i.value
      });
    }, P = [
      { id: "mtn", name: "MTN", color: "#FFCC00" },
      { id: "vodafone", name: "Vodafone", color: "#E60000" },
      { id: "airteltigo", name: "AirtelTigo", color: "#005596" }
    ];
    return (p, v) => (d(), m("form", {
      class: "reevit-momo-form",
      onSubmit: X(a, ["prevent"])
    }, [
      r("div", $e, [
        v[1] || (v[1] = r("label", {
          class: "reevit-label",
          for: "reevit-phone"
        }, "Phone Number", -1)),
        ae(r("input", {
          id: "reevit-phone",
          "onUpdate:modelValue": v[0] || (v[0] = (b) => y.value = b),
          type: "tel",
          class: U(["reevit-input", { "reevit-input--error": u.value && !D(J)(y.value) }]),
          placeholder: "e.g. 024 123 4567",
          disabled: e.loading,
          autocomplete: "tel"
        }, null, 10, Ne), [
          [oe, y.value]
        ])
      ]),
      r("div", ge, [
        v[2] || (v[2] = r("label", { class: "reevit-label" }, "Select Network", -1)),
        r("div", Oe, [
          (d(), m(H, null, W(P, (b) => r("button", {
            key: b.id,
            type: "button",
            class: U(D(te)("reevit-network-btn", i.value === b.id && "reevit-network-btn--selected")),
            onClick: (k) => i.value = b.id,
            disabled: e.loading
          }, [
            r("div", {
              class: "reevit-network-dot",
              style: ee({ backgroundColor: b.color })
            }, null, 4),
            Z(" " + I(b.name), 1)
          ], 10, De)), 64))
        ])
      ]),
      u.value ? (d(), m("p", Ke, I(u.value), 1)) : E("", !0),
      r("button", {
        type: "submit",
        class: "reevit-submit-btn",
        disabled: e.loading || !y.value
      }, [
        e.loading ? (d(), m("span", Ae)) : (d(), m("span", Ue, "Continue"))
      ], 8, Fe),
      v[3] || (v[3] = r("p", { class: "reevit-secure-text" }, " 🔒 Secure mobile money payment via Reevit ", -1))
    ], 32));
  }
}), Q = /* @__PURE__ */ new Map();
function K(e, s) {
  const t = Q.get(s);
  if (t) return t;
  const c = new Promise((y, i) => {
    if (document.getElementById(s)) {
      y();
      return;
    }
    const u = document.createElement("script");
    u.id = s, u.src = e, u.async = !0, u.onload = () => y(), u.onerror = () => i(new Error(`Failed to load ${s} script`)), document.head.appendChild(u);
  });
  return Q.set(s, c), c;
}
function Be() {
  return K("https://js.paystack.co/v1/inline.js", "paystack-script");
}
function je() {
  return K("https://checkout.hubtel.com/js/hubtel-checkout.js", "hubtel-script");
}
function xe() {
  return K("https://checkout.flutterwave.com/v3.js", "flutterwave-script");
}
function Ve() {
  return K("https://js.stripe.com/v3/", "stripe-script");
}
function ze() {
  return K("https://sdk.monnify.com/plugin/monnify.js", "monnify-script");
}
async function He(e) {
  if (await Be(), !window.PaystackPop)
    throw new Error("Paystack script not loaded");
  window.PaystackPop.setup({
    key: e.key,
    email: e.email,
    amount: e.amount,
    currency: e.currency,
    ref: e.ref,
    metadata: e.metadata,
    callback: e.onSuccess,
    onClose: e.onClose
  }).openIframe();
}
async function qe(e) {
  if (await je(), !window.HubtelCheckout)
    throw new Error("Hubtel script not loaded");
  window.HubtelCheckout.initPay({
    clientId: e.clientId,
    purchaseDescription: e.purchaseDescription,
    amount: e.amount,
    callbackUrl: e.callbackUrl,
    customerPhone: e.customerPhone,
    customerEmail: e.customerEmail,
    onSuccess: e.onSuccess,
    onClose: e.onClose
  });
}
async function Ye(e) {
  if (await xe(), !window.FlutterwaveCheckout)
    throw new Error("Flutterwave script not loaded");
  window.FlutterwaveCheckout({
    public_key: e.public_key,
    tx_ref: e.tx_ref,
    amount: e.amount,
    currency: e.currency,
    customer: e.customer,
    payment_options: e.payment_options,
    customizations: e.customizations,
    callback: e.callback,
    onclose: e.onclose
  });
}
async function Ge(e) {
  if (await Ve(), !window.Stripe)
    throw new Error("Stripe.js not loaded");
  return window.Stripe(e);
}
async function ut(e) {
  const t = await (await Ge(e.publishableKey)).confirmPayment({
    elements: e.elements,
    clientSecret: e.clientSecret,
    redirect: "if_required"
  });
  t.error ? e.onError({ message: t.error.message || "Payment failed" }) : t.paymentIntent && e.onSuccess({
    paymentIntentId: t.paymentIntent.id,
    status: t.paymentIntent.status
  });
}
async function Je(e) {
  if (await ze(), !window.MonnifySDK)
    throw new Error("Monnify SDK not loaded");
  window.MonnifySDK.initialize({
    amount: e.amount,
    currency: e.currency,
    reference: e.reference,
    customerName: e.customerName,
    customerEmail: e.customerEmail,
    customerMobileNumber: e.customerPhone,
    apiKey: e.apiKey,
    contractCode: e.contractCode,
    paymentDescription: e.paymentDescription || "Payment",
    isTestMode: e.isTestMode ?? !1,
    metadata: e.metadata,
    onComplete: (s) => {
      s.status === "SUCCESS" ? e.onSuccess({
        transactionReference: s.transactionReference,
        paymentReference: s.paymentReference,
        ...s
      }) : e.onError?.({ message: s.message || "Payment failed" });
    },
    onClose: e.onClose
  });
}
async function Qe(e, s) {
  e.onInitiated();
  try {
    const t = await fetch(s, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: e.phoneNumber,
        amount: e.amount,
        reference: e.reference,
        description: e.description
      })
    });
    if (!t.ok) {
      const i = (await t.json().catch(() => ({}))).message || "Failed to initiate M-Pesa payment";
      return e.onError({ message: i }), { status: "failed", message: i };
    }
    const c = await t.json();
    return {
      status: "initiated",
      message: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
      transactionId: c.checkout_request_id || c.transaction_id
    };
  } catch (t) {
    const c = t instanceof Error ? t.message : "Network error";
    return e.onError({ message: c }), { status: "failed", message: c };
  }
}
const We = ["disabled"], Xe = {
  key: 0,
  class: "reevit-spinner"
}, Ze = { class: "reevit-modal-body" }, et = {
  key: 0,
  class: "reevit-loading-state"
}, tt = {
  key: 1,
  class: "reevit-error-state"
}, nt = {
  key: 2,
  class: "reevit-success-state"
}, at = {
  key: 1,
  class: "reevit-method-form-container"
}, ot = {
  key: 2,
  class: "reevit-card-info"
}, rt = ["disabled"], st = {
  key: 0,
  class: "reevit-spinner"
}, it = { key: 1 }, dt = /* @__PURE__ */ z({
  __name: "ReevitCheckout",
  props: {
    publicKey: {},
    amount: {},
    currency: {},
    email: {},
    phone: {},
    reference: {},
    metadata: {},
    paymentMethods: {},
    theme: {},
    isOpen: { type: Boolean },
    apiBaseUrl: {},
    initialPaymentIntent: {}
  },
  emits: ["success", "error", "close"],
  setup(e, { emit: s }) {
    const t = e, c = s, {
      status: y,
      paymentIntent: i,
      selectedMethod: u,
      error: a,
      isLoading: P,
      isReady: p,
      initialize: v,
      selectMethod: b,
      handlePspSuccess: k,
      handlePspError: R,
      close: L
    } = be({
      config: {
        publicKey: t.publicKey,
        amount: t.amount,
        currency: t.currency,
        email: t.email,
        phone: t.phone,
        reference: t.reference,
        metadata: t.metadata,
        paymentMethods: t.paymentMethods,
        initialPaymentIntent: t.initialPaymentIntent
      },
      apiBaseUrl: t.apiBaseUrl,
      onSuccess: (o) => c("success", o),
      onError: (o) => c("error", o),
      onClose: () => c("close")
    }), C = g(t.isOpen ?? !1);
    O(() => t.isOpen, (o) => {
      o !== void 0 && (C.value = o);
    });
    const F = () => {
      C.value = !0, !i.value && y.value === "idle" && v();
    };
    O([C, i, u], ([o, n, l]) => {
      o && n && l && l === "card" && T(null);
    });
    const M = () => {
      C.value = !1, L();
    }, B = (o) => {
      b(o);
    }, T = async (o) => {
      if (!i.value) return;
      const n = i.value.recommendedPsp;
      try {
        if (n === "paystack")
          await He({
            key: t.publicKey,
            email: t.email || "",
            amount: t.amount,
            currency: t.currency,
            ref: i.value.id,
            onSuccess: (l) => k(l),
            onClose: () => {
            }
          });
        else if (n === "hubtel")
          await qe({
            clientId: t.publicKey,
            purchaseDescription: `Payment for ${t.amount} ${t.currency}`,
            amount: t.amount,
            customerPhone: o?.phone || t.phone,
            customerEmail: t.email,
            onSuccess: (l) => k(l),
            onClose: () => {
            }
          });
        else if (n === "flutterwave")
          await Ye({
            public_key: t.publicKey,
            tx_ref: i.value.id,
            amount: t.amount,
            currency: t.currency,
            customer: {
              email: t.email || "",
              phone_number: o?.phone || t.phone
            },
            callback: (l) => k(l),
            onclose: () => {
            }
          });
        else if (n === "monnify")
          await Je({
            apiKey: i.value.pspPublicKey || t.publicKey,
            contractCode: t.metadata?.contract_code || t.publicKey,
            amount: t.amount,
            currency: t.currency,
            reference: i.value.reference || i.value.id,
            customerName: t.metadata?.customer_name || t.email || "",
            customerEmail: t.email || "",
            customerPhone: o?.phone || t.phone,
            metadata: t.metadata,
            onSuccess: (l) => k(l),
            onClose: () => {
            }
          });
        else if (n === "mpesa") {
          const l = `${t.apiBaseUrl || "https://api.reevit.io"}/v1/payments/${i.value.id}/mpesa`;
          await Qe({
            phoneNumber: o?.phone || t.phone || "",
            amount: t.amount,
            reference: i.value.reference || i.value.id,
            description: `Payment ${i.value.reference || ""}`,
            onInitiated: () => {
            },
            onSuccess: (w) => k(w),
            onError: (w) => R({ code: "MPESA_ERROR", message: w.message })
          }, l);
        } else R(n === "stripe" ? {
          code: "STRIPE_NOT_IMPLEMENTED",
          message: "Stripe integration requires custom Elements setup. Please use the React SDK or implement custom Stripe Elements."
        } : {
          code: "UNSUPPORTED_PSP",
          message: `Payment provider "${n}" is not supported in this checkout.`
        });
      } catch (l) {
        R({
          code: "BRIDGE_ERROR",
          message: l instanceof Error ? l.message : "Failed to open payment gateway"
        });
      }
    }, j = h(() => ve(t.theme || {}));
    O(C, (o) => {
      o ? document.body.style.overflow = "hidden" : document.body.style.overflow = "";
    }), re(() => {
      document.body.style.overflow = "";
    });
    const f = h(() => y.value), A = h(() => a.value), $ = h(() => u.value), N = h(() => P.value), x = h(() => p.value);
    return (o, n) => (d(), m("div", {
      class: "reevit-sdk-container",
      style: ee(j.value)
    }, [
      Y(o.$slots, "default", {
        open: F,
        isLoading: N.value
      }, () => [
        r("button", {
          type: "button",
          class: "reevit-pay-button",
          onClick: F,
          disabled: N.value
        }, [
          N.value ? (d(), m("span", Xe)) : Y(o.$slots, "button-text", { key: 1 }, () => [
            n[1] || (n[1] = Z("Pay Now", -1))
          ])
        ], 8, We)
      ]),
      (d(), G(se, { to: "body" }, [
        C.value ? (d(), m("div", {
          key: 0,
          class: "reevit-modal-overlay",
          onClick: X(M, ["self"])
        }, [
          r("div", {
            class: U(["reevit-modal-content", { "reevit-modal--dark": t.theme?.darkMode }])
          }, [
            r("button", {
              class: "reevit-modal-close",
              onClick: M,
              "aria-label": "Close"
            }, " × "),
            n[9] || (n[9] = r("div", { class: "reevit-modal-header" }, [
              r("img", {
                src: "https://i.imgur.com/bzUR5Lm.png",
                alt: "Reevit",
                class: "reevit-modal__logo"
              })
            ], -1)),
            r("div", Ze, [
              f.value === "loading" ? (d(), m("div", et, [...n[2] || (n[2] = [
                r("div", { class: "reevit-spinner reevit-spinner--large" }, null, -1),
                r("p", null, "Initializing payment...", -1)
              ])])) : f.value === "failed" && A.value ? (d(), m("div", tt, [
                n[3] || (n[3] = r("div", { class: "reevit-error-icon" }, "⚠️", -1)),
                n[4] || (n[4] = r("h3", null, "Payment Failed", -1)),
                r("p", null, I(A.value.message), 1),
                r("button", {
                  class: "reevit-retry-btn",
                  onClick: n[0] || (n[0] = (l) => D(v)())
                }, "Retry")
              ])) : f.value === "success" ? (d(), m("div", nt, [
                n[5] || (n[5] = r("div", { class: "reevit-success-icon" }, "✅", -1)),
                n[6] || (n[6] = r("h3", null, "Payment Successful", -1)),
                n[7] || (n[7] = r("p", null, "Thank you for your payment.", -1)),
                r("button", {
                  class: "reevit-done-btn",
                  onClick: M
                }, "Done")
              ])) : x.value ? (d(), m(H, { key: 3 }, [
                f.value === "ready" || f.value === "method_selected" || f.value === "processing" ? (d(), G(Te, {
                  key: 0,
                  methods: t.paymentMethods || ["card", "mobile_money"],
                  selected: $.value,
                  amount: t.amount,
                  currency: t.currency,
                  onSelect: B
                }, null, 8, ["methods", "selected", "amount", "currency"])) : E("", !0),
                (f.value === "method_selected" || f.value === "processing") && $.value === "mobile_money" ? (d(), m("div", at, [
                  ie(Le, {
                    "initial-phone": t.phone,
                    loading: f.value === "processing",
                    onSubmit: T
                  }, null, 8, ["initial-phone", "loading"])
                ])) : E("", !0),
                (f.value === "method_selected" || f.value === "processing") && $.value === "card" ? (d(), m("div", ot, [
                  n[8] || (n[8] = r("p", { class: "reevit-info-text" }, "You will be redirected to our secure payment partner to complete your card payment.", -1)),
                  r("button", {
                    class: "reevit-submit-btn",
                    onClick: T,
                    disabled: f.value === "processing"
                  }, [
                    f.value === "processing" ? (d(), m("span", st)) : (d(), m("span", it, "Proceed to Card Payment"))
                  ], 8, rt)
                ])) : E("", !0)
              ], 64)) : E("", !0)
            ]),
            n[10] || (n[10] = r("div", { class: "reevit-modal-footer" }, [
              r("div", { class: "reevit-trust-badges" }, [
                r("span", null, "PCI DSS Compliant"),
                r("span", null, "•"),
                r("span", null, "SSL Secure")
              ])
            ], -1))
          ], 2)
        ])) : E("", !0)
      ]))
    ], 4));
  }
});
export {
  Le as MobileMoneyForm,
  Te as PaymentMethodSelector,
  yt as ReevitAPIClient,
  dt as ReevitCheckout,
  vt as cn,
  ut as confirmStripePayment,
  ht as createReevitClient,
  Ge as createStripeInstance,
  ft as detectCountryFromCurrency,
  bt as detectNetwork,
  St as formatAmount,
  Pt as formatPhone,
  Qe as initiateMPesaSTKPush,
  xe as loadFlutterwaveScript,
  je as loadHubtelScript,
  ze as loadMonnifyScript,
  Be as loadPaystackScript,
  Ve as loadStripeScript,
  Ye as openFlutterwaveModal,
  qe as openHubtelPopup,
  Je as openMonnifyModal,
  He as openPaystackPopup,
  be as useReevit,
  kt as validatePhone
};
