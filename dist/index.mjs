import { ref as R, watch as D, computed as h, readonly as k, defineComponent as B, createElementBlock as m, openBlock as l, createElementVNode as n, toDisplayString as P, unref as T, Fragment as U, renderList as W, normalizeClass as A, createCommentVNode as C, withModifiers as X, withDirectives as oe, vModelText as ae, createTextVNode as Z, normalizeStyle as ee, onUnmounted as re, renderSlot as Y, createBlock as G, Teleport as se, createVNode as ie } from "vue";
import { createInitialState as le, ReevitAPIClient as ce, generateReference as ue, detectCountryFromCurrency as de, reevitReducer as me, formatAmount as pe, cn as te, detectNetwork as ye, validatePhone as J, createThemeVariables as ve } from "@reevit/core";
import { ReevitAPIClient as yt, cn as vt, createReevitClient as ht, detectCountryFromCurrency as bt, detectNetwork as ft, formatAmount as kt, formatPhone as wt, validatePhone as St } from "@reevit/core";
function he(e) {
  const r = e.toLowerCase();
  return r.includes("paystack") ? "paystack" : r.includes("hubtel") ? "hubtel" : r.includes("flutterwave") ? "flutterwave" : "paystack";
}
function be(e, r) {
  return {
    id: e.id,
    clientSecret: e.client_secret,
    amount: e.amount,
    currency: e.currency,
    status: e.status,
    recommendedPsp: he(e.provider),
    availableMethods: r.paymentMethods || ["card", "mobile_money"],
    connectionId: e.connection_id,
    provider: e.provider,
    feeAmount: e.fee_amount,
    feeCurrency: e.fee_currency,
    netAmount: e.net_amount,
    metadata: r.metadata
  };
}
function fe(e) {
  const { config: r, onSuccess: t, onError: i, onClose: y, onStateChange: c, apiBaseUrl: u } = e, o = R(le()), w = new ce({
    publicKey: r.publicKey,
    baseUrl: u
  }), p = (s) => {
    o.value = me(o.value, s);
  };
  D(
    () => o.value.status,
    (s) => {
      c?.(s);
    }
  );
  const v = async (s) => {
    p({ type: "INIT_START" });
    try {
      const a = r.reference || ue(), d = de(r.currency), g = s || r.paymentMethods?.[0] || "card", { data: H, error: z } = await w.createPaymentIntent(
        { ...r, reference: a },
        g,
        d
      );
      if (z) {
        p({ type: "INIT_ERROR", payload: z }), i?.(z);
        return;
      }
      if (!H) {
        const q = {
          code: "INIT_FAILED",
          message: "No data received from API",
          recoverable: !0
        };
        p({ type: "INIT_ERROR", payload: q }), i?.(q);
        return;
      }
      const ne = be(H, { ...r, reference: a });
      p({ type: "INIT_SUCCESS", payload: ne });
    } catch (a) {
      const d = {
        code: "INIT_FAILED",
        message: a instanceof Error ? a.message : "Failed to initialize checkout",
        recoverable: !0,
        originalError: a
      };
      p({ type: "INIT_ERROR", payload: d }), i?.(d);
    }
  }, f = (s) => {
    p({ type: "SELECT_METHOD", payload: s });
  }, S = async (s) => {
    if (!(!o.value.paymentIntent || !o.value.selectedMethod)) {
      p({ type: "PROCESS_START" });
      try {
        const { data: a, error: d } = await w.confirmPayment(o.value.paymentIntent.id);
        if (d) {
          p({ type: "PROCESS_ERROR", payload: d }), i?.(d);
          return;
        }
        const g = {
          paymentId: o.value.paymentIntent.id,
          reference: s.reference || o.value.paymentIntent.metadata?.reference || "",
          amount: o.value.paymentIntent.amount,
          currency: o.value.paymentIntent.currency,
          paymentMethod: o.value.selectedMethod,
          psp: o.value.paymentIntent.recommendedPsp,
          pspReference: s.pspReference || a?.provider_ref_id || "",
          status: "success",
          metadata: s
        };
        p({ type: "PROCESS_SUCCESS", payload: g }), t?.(g);
      } catch (a) {
        const d = {
          code: "PAYMENT_FAILED",
          message: a instanceof Error ? a.message : "Payment failed",
          recoverable: !0,
          originalError: a
        };
        p({ type: "PROCESS_ERROR", payload: d }), i?.(d);
      }
    }
  }, K = async (s) => {
    await S(s);
  }, L = (s) => {
    p({ type: "PROCESS_ERROR", payload: s }), i?.(s);
  }, _ = () => {
    p({ type: "RESET" });
  }, N = async () => {
    if (o.value.paymentIntent && o.value.status !== "success")
      try {
        await w.cancelPaymentIntent(o.value.paymentIntent.id);
      } catch {
      }
    p({ type: "CLOSE" }), y?.();
  }, E = h(() => o.value.status), j = h(() => o.value.paymentIntent), F = h(() => o.value.selectedMethod), x = h(() => o.value.error), b = h(() => o.value.result), O = h(
    () => o.value.status === "loading" || o.value.status === "processing"
  ), I = h(
    () => o.value.status === "ready" || o.value.status === "method_selected" || o.value.status === "processing"
  ), M = h(() => o.value.status === "success"), V = h(() => o.value.error?.recoverable ?? !1);
  return {
    // State (readonly refs)
    status: k(E),
    paymentIntent: k(j),
    selectedMethod: k(F),
    error: k(x),
    result: k(b),
    // Actions
    initialize: v,
    selectMethod: f,
    processPayment: S,
    handlePspSuccess: K,
    handlePspError: L,
    reset: _,
    close: N,
    // Computed
    isLoading: k(O),
    isReady: k(I),
    isComplete: k(M),
    canRetry: k(V)
  };
}
const ke = { class: "reevit-method-selector" }, we = { class: "reevit-amount-display" }, Se = { class: "reevit-methods-grid" }, _e = ["onClick"], Ce = { class: "reevit-method-icon" }, Pe = { class: "reevit-method-info" }, Ee = { class: "reevit-method-name" }, Ie = { class: "reevit-method-description" }, Me = { class: "reevit-method-radio" }, Re = {
  key: 0,
  class: "reevit-radio-inner"
}, Te = /* @__PURE__ */ B({
  __name: "PaymentMethodSelector",
  props: {
    methods: {},
    selected: {},
    amount: {},
    currency: {}
  },
  emits: ["select"],
  setup(e, { emit: r }) {
    const t = e, i = r, y = h(() => [
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
    ].filter((c) => t.methods.includes(c.id)));
    return (c, u) => (l(), m("div", ke, [
      u[0] || (u[0] = n("h3", { class: "reevit-section-title" }, "Select Payment Method", -1)),
      n("p", we, " Pay " + P(T(pe)(e.amount, e.currency)), 1),
      n("div", Se, [
        (l(!0), m(U, null, W(y.value, (o) => (l(), m("button", {
          key: o.id,
          type: "button",
          class: A(T(te)("reevit-method-card", e.selected === o.id && "reevit-method-card--selected")),
          onClick: (w) => i("select", o.id)
        }, [
          n("span", Ce, P(o.icon), 1),
          n("div", Pe, [
            n("span", Ee, P(o.name), 1),
            n("span", Ie, P(o.description), 1)
          ]),
          n("div", Me, [
            e.selected === o.id ? (l(), m("div", Re)) : C("", !0)
          ])
        ], 10, _e))), 128))
      ])
    ]));
  }
}), $e = { class: "reevit-form-group" }, Ne = ["disabled"], Fe = { class: "reevit-network-selector" }, Oe = { class: "reevit-networks-grid" }, ge = ["onClick", "disabled"], De = {
  key: 0,
  class: "reevit-error-message"
}, Ae = ["disabled"], Ke = {
  key: 0,
  class: "reevit-spinner"
}, Le = { key: 1 }, je = /* @__PURE__ */ B({
  __name: "MobileMoneyForm",
  props: {
    initialPhone: {},
    loading: { type: Boolean }
  },
  emits: ["submit"],
  setup(e, { emit: r }) {
    const t = e, i = r, y = R(t.initialPhone || ""), c = R(null), u = R(null);
    D(y, (p) => {
      const v = ye(p);
      v && (c.value = v), u.value && (u.value = null);
    });
    const o = () => {
      if (!J(y.value)) {
        u.value = "Please enter a valid phone number";
        return;
      }
      if (!c.value) {
        u.value = "Please select your mobile network";
        return;
      }
      i("submit", {
        phone: y.value,
        network: c.value
      });
    }, w = [
      { id: "mtn", name: "MTN", color: "#FFCC00" },
      { id: "vodafone", name: "Vodafone", color: "#E60000" },
      { id: "airteltigo", name: "AirtelTigo", color: "#005596" }
    ];
    return (p, v) => (l(), m("form", {
      class: "reevit-momo-form",
      onSubmit: X(o, ["prevent"])
    }, [
      n("div", $e, [
        v[1] || (v[1] = n("label", {
          class: "reevit-label",
          for: "reevit-phone"
        }, "Phone Number", -1)),
        oe(n("input", {
          id: "reevit-phone",
          "onUpdate:modelValue": v[0] || (v[0] = (f) => y.value = f),
          type: "tel",
          class: A(["reevit-input", { "reevit-input--error": u.value && !T(J)(y.value) }]),
          placeholder: "e.g. 024 123 4567",
          disabled: e.loading,
          autocomplete: "tel"
        }, null, 10, Ne), [
          [ae, y.value]
        ])
      ]),
      n("div", Fe, [
        v[2] || (v[2] = n("label", { class: "reevit-label" }, "Select Network", -1)),
        n("div", Oe, [
          (l(), m(U, null, W(w, (f) => n("button", {
            key: f.id,
            type: "button",
            class: A(T(te)("reevit-network-btn", c.value === f.id && "reevit-network-btn--selected")),
            onClick: (S) => c.value = f.id,
            disabled: e.loading
          }, [
            n("div", {
              class: "reevit-network-dot",
              style: ee({ backgroundColor: f.color })
            }, null, 4),
            Z(" " + P(f.name), 1)
          ], 10, ge)), 64))
        ])
      ]),
      u.value ? (l(), m("p", De, P(u.value), 1)) : C("", !0),
      n("button", {
        type: "submit",
        class: "reevit-submit-btn",
        disabled: e.loading || !y.value
      }, [
        e.loading ? (l(), m("span", Ke)) : (l(), m("span", Le, "Continue"))
      ], 8, Ae),
      v[3] || (v[3] = n("p", { class: "reevit-secure-text" }, " 🔒 Secure mobile money payment via Reevit ", -1))
    ], 32));
  }
}), Q = /* @__PURE__ */ new Map();
function $(e, r) {
  const t = Q.get(r);
  if (t) return t;
  const i = new Promise((y, c) => {
    if (document.getElementById(r)) {
      y();
      return;
    }
    const u = document.createElement("script");
    u.id = r, u.src = e, u.async = !0, u.onload = () => y(), u.onerror = () => c(new Error(`Failed to load ${r} script`)), document.head.appendChild(u);
  });
  return Q.set(r, i), i;
}
function xe() {
  return $("https://js.paystack.co/v1/inline.js", "paystack-script");
}
function Ve() {
  return $("https://checkout.hubtel.com/js/hubtel-checkout.js", "hubtel-script");
}
function ze() {
  return $("https://checkout.flutterwave.com/v3.js", "flutterwave-script");
}
function Be() {
  return $("https://js.stripe.com/v3/", "stripe-script");
}
function Ue() {
  return $("https://sdk.monnify.com/plugin/monnify.js", "monnify-script");
}
async function He(e) {
  if (await xe(), !window.PaystackPop)
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
  if (await Ve(), !window.HubtelCheckout)
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
  if (await ze(), !window.FlutterwaveCheckout)
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
  if (await Be(), !window.Stripe)
    throw new Error("Stripe.js not loaded");
  return window.Stripe(e);
}
async function lt(e) {
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
async function ct(e) {
  if (await Ue(), !window.MonnifySDK)
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
    onComplete: (r) => {
      r.status === "SUCCESS" ? e.onSuccess({
        transactionReference: r.transactionReference,
        paymentReference: r.paymentReference,
        ...r
      }) : e.onError?.({ message: r.message || "Payment failed" });
    },
    onClose: e.onClose
  });
}
async function ut(e, r) {
  e.onInitiated();
  try {
    const t = await fetch(r, {
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
      const c = (await t.json().catch(() => ({}))).message || "Failed to initiate M-Pesa payment";
      return e.onError({ message: c }), { status: "failed", message: c };
    }
    const i = await t.json();
    return {
      status: "initiated",
      message: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
      transactionId: i.checkout_request_id || i.transaction_id
    };
  } catch (t) {
    const i = t instanceof Error ? t.message : "Network error";
    return e.onError({ message: i }), { status: "failed", message: i };
  }
}
const Je = ["disabled"], Qe = {
  key: 0,
  class: "reevit-spinner"
}, We = { class: "reevit-modal-body" }, Xe = {
  key: 0,
  class: "reevit-loading-state"
}, Ze = {
  key: 1,
  class: "reevit-error-state"
}, et = {
  key: 2,
  class: "reevit-success-state"
}, tt = {
  key: 1,
  class: "reevit-method-form-container"
}, nt = {
  key: 2,
  class: "reevit-card-info"
}, ot = ["disabled"], at = {
  key: 0,
  class: "reevit-spinner"
}, rt = { key: 1 }, dt = /* @__PURE__ */ B({
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
    isOpen: { type: Boolean }
  },
  emits: ["success", "error", "close"],
  setup(e, { emit: r }) {
    const t = e, i = r, {
      status: y,
      paymentIntent: c,
      selectedMethod: u,
      error: o,
      isLoading: w,
      isReady: p,
      initialize: v,
      selectMethod: f,
      handlePspSuccess: S,
      handlePspError: K,
      close: L
    } = fe({
      config: {
        publicKey: t.publicKey,
        amount: t.amount,
        currency: t.currency,
        email: t.email,
        phone: t.phone,
        reference: t.reference,
        metadata: t.metadata,
        paymentMethods: t.paymentMethods
      },
      onSuccess: (s) => i("success", s),
      onError: (s) => i("error", s),
      onClose: () => i("close")
    }), _ = R(t.isOpen ?? !1);
    D(() => t.isOpen, (s) => {
      s !== void 0 && (_.value = s);
    });
    const N = () => {
      _.value = !0, c.value || v();
    }, E = () => {
      _.value = !1, L();
    }, j = (s) => {
      f(s);
    }, F = async (s) => {
      if (!c.value) return;
      const a = c.value.recommendedPsp;
      try {
        a === "paystack" ? await He({
          key: t.publicKey,
          email: t.email || "",
          amount: t.amount,
          currency: t.currency,
          ref: c.value.id,
          onSuccess: (d) => S(d),
          onClose: () => {
          }
        }) : a === "hubtel" ? await qe({
          clientId: t.publicKey,
          purchaseDescription: `Payment for ${t.amount} ${t.currency}`,
          amount: t.amount,
          customerPhone: s?.phone || t.phone,
          customerEmail: t.email,
          onSuccess: (d) => S(d),
          onClose: () => {
          }
        }) : a === "flutterwave" && await Ye({
          public_key: t.publicKey,
          tx_ref: c.value.id,
          amount: t.amount,
          currency: t.currency,
          customer: {
            email: t.email || "",
            phone_number: s?.phone || t.phone
          },
          callback: (d) => S(d),
          onclose: () => {
          }
        });
      } catch (d) {
        K({
          code: "BRIDGE_ERROR",
          message: d instanceof Error ? d.message : "Failed to open payment gateway"
        });
      }
    }, x = h(() => ve(t.theme || {}));
    D(_, (s) => {
      s ? document.body.style.overflow = "hidden" : document.body.style.overflow = "";
    }), re(() => {
      document.body.style.overflow = "";
    });
    const b = h(() => y.value), O = h(() => o.value), I = h(() => u.value), M = h(() => w.value), V = h(() => p.value);
    return (s, a) => (l(), m("div", {
      class: "reevit-sdk-container",
      style: ee(x.value)
    }, [
      Y(s.$slots, "default", {
        open: N,
        isLoading: M.value
      }, () => [
        n("button", {
          type: "button",
          class: "reevit-pay-button",
          onClick: N,
          disabled: M.value
        }, [
          M.value ? (l(), m("span", Qe)) : Y(s.$slots, "button-text", { key: 1 }, () => [
            a[1] || (a[1] = Z("Pay Now", -1))
          ])
        ], 8, Je)
      ]),
      (l(), G(se, { to: "body" }, [
        _.value ? (l(), m("div", {
          key: 0,
          class: "reevit-modal-overlay",
          onClick: X(E, ["self"])
        }, [
          n("div", {
            class: A(["reevit-modal-content", { "reevit-modal--dark": t.theme?.darkMode }])
          }, [
            n("button", {
              class: "reevit-modal-close",
              onClick: E,
              "aria-label": "Close"
            }, " × "),
            a[9] || (a[9] = n("div", { class: "reevit-modal-header" }, [
              n("h2", { class: "reevit-modal-title" }, "Reevit Checkout"),
              n("p", { class: "reevit-modal-subtitle" }, "Secure payment powered by Reevit")
            ], -1)),
            n("div", We, [
              b.value === "loading" ? (l(), m("div", Xe, [...a[2] || (a[2] = [
                n("div", { class: "reevit-spinner reevit-spinner--large" }, null, -1),
                n("p", null, "Initializing payment...", -1)
              ])])) : b.value === "failed" && O.value ? (l(), m("div", Ze, [
                a[3] || (a[3] = n("div", { class: "reevit-error-icon" }, "⚠️", -1)),
                a[4] || (a[4] = n("h3", null, "Payment Failed", -1)),
                n("p", null, P(O.value.message), 1),
                n("button", {
                  class: "reevit-retry-btn",
                  onClick: a[0] || (a[0] = (d) => T(v)())
                }, "Retry")
              ])) : b.value === "success" ? (l(), m("div", et, [
                a[5] || (a[5] = n("div", { class: "reevit-success-icon" }, "✅", -1)),
                a[6] || (a[6] = n("h3", null, "Payment Successful", -1)),
                a[7] || (a[7] = n("p", null, "Thank you for your payment.", -1)),
                n("button", {
                  class: "reevit-done-btn",
                  onClick: E
                }, "Done")
              ])) : V.value ? (l(), m(U, { key: 3 }, [
                b.value === "ready" || b.value === "method_selected" || b.value === "processing" ? (l(), G(Te, {
                  key: 0,
                  methods: t.paymentMethods || ["card", "mobile_money"],
                  selected: I.value,
                  amount: t.amount,
                  currency: t.currency,
                  onSelect: j
                }, null, 8, ["methods", "selected", "amount", "currency"])) : C("", !0),
                (b.value === "method_selected" || b.value === "processing") && I.value === "mobile_money" ? (l(), m("div", tt, [
                  ie(je, {
                    "initial-phone": t.phone,
                    loading: b.value === "processing",
                    onSubmit: F
                  }, null, 8, ["initial-phone", "loading"])
                ])) : C("", !0),
                (b.value === "method_selected" || b.value === "processing") && I.value === "card" ? (l(), m("div", nt, [
                  a[8] || (a[8] = n("p", { class: "reevit-info-text" }, "You will be redirected to our secure payment partner to complete your card payment.", -1)),
                  n("button", {
                    class: "reevit-submit-btn",
                    onClick: F,
                    disabled: b.value === "processing"
                  }, [
                    b.value === "processing" ? (l(), m("span", at)) : (l(), m("span", rt, "Proceed to Card Payment"))
                  ], 8, ot)
                ])) : C("", !0)
              ], 64)) : C("", !0)
            ]),
            a[10] || (a[10] = n("div", { class: "reevit-modal-footer" }, [
              n("div", { class: "reevit-trust-badges" }, [
                n("span", null, "PCI DSS Compliant"),
                n("span", null, "•"),
                n("span", null, "SSL Secure")
              ])
            ], -1))
          ], 2)
        ])) : C("", !0)
      ]))
    ], 4));
  }
});
export {
  je as MobileMoneyForm,
  Te as PaymentMethodSelector,
  yt as ReevitAPIClient,
  dt as ReevitCheckout,
  vt as cn,
  lt as confirmStripePayment,
  ht as createReevitClient,
  Ge as createStripeInstance,
  bt as detectCountryFromCurrency,
  ft as detectNetwork,
  kt as formatAmount,
  wt as formatPhone,
  ut as initiateMPesaSTKPush,
  ze as loadFlutterwaveScript,
  Ve as loadHubtelScript,
  Ue as loadMonnifyScript,
  xe as loadPaystackScript,
  Be as loadStripeScript,
  Ye as openFlutterwaveModal,
  qe as openHubtelPopup,
  ct as openMonnifyModal,
  He as openPaystackPopup,
  fe as useReevit,
  St as validatePhone
};
