import { ref as K, watch as D, computed as b, readonly as L, defineComponent as X, createElementBlock as v, openBlock as m, normalizeClass as z, createCommentVNode as x, createElementVNode as a, unref as H, Fragment as B, renderList as re, normalizeStyle as Q, toDisplayString as M, renderSlot as oe, createVNode as se, withModifiers as de, withDirectives as he, vModelText as ye, createTextVNode as ce, onUnmounted as be, createBlock as ne, Teleport as fe, withCtx as _e } from "vue";
import { createInitialState as ke, ReevitAPIClient as we, generateReference as Pe, detectCountryFromCurrency as ge, reevitReducer as Ce, cn as ue, detectNetwork as Se, validatePhone as ie, createThemeVariables as Me } from "@reevit/core";
import { ReevitAPIClient as Wt, cn as Jt, createReevitClient as Qt, detectCountryFromCurrency as Xt, detectNetwork as Zt, formatAmount as en, formatPhone as tn, validatePhone as nn } from "@reevit/core";
function Ee(e) {
  const n = e.toLowerCase();
  return n.includes("paystack") ? "paystack" : n.includes("hubtel") ? "hubtel" : n.includes("flutterwave") ? "flutterwave" : n.includes("stripe") ? "stripe" : n.includes("monnify") ? "monnify" : n.includes("mpesa") || n.includes("m-pesa") ? "mpesa" : "paystack";
}
function Ie(e) {
  const n = e.toLowerCase().trim();
  return n === "card" ? "card" : n === "mobile_money" || n === "momo" || n === "mobilemoney" ? "mobile_money" : n === "bank" || n === "bank_transfer" || n === "transfer" ? "bank_transfer" : null;
}
function Re(e) {
  if (!(!e || e.length === 0))
    return e.map((n) => {
      const t = n.methods.map((d) => Ie(d)).filter(Boolean);
      return {
        provider: n.provider,
        name: n.name,
        methods: t,
        countries: n.countries
      };
    }).filter((n) => n.methods.length > 0);
}
function $e(e, n) {
  return {
    id: e.id,
    clientSecret: e.client_secret,
    pspPublicKey: e.psp_public_key,
    pspCredentials: e.psp_credentials,
    amount: e.amount,
    currency: e.currency,
    status: e.status,
    recommendedPsp: Ee(e.provider),
    availableMethods: n.paymentMethods || ["card", "mobile_money"],
    reference: e.reference || n.reference,
    connectionId: e.connection_id,
    provider: e.provider,
    feeAmount: e.fee_amount,
    feeCurrency: e.fee_currency,
    netAmount: e.net_amount,
    metadata: n.metadata,
    availableProviders: Re(e.available_psps),
    branding: e.branding
  };
}
function xe(e) {
  const { config: n, onSuccess: t, onError: d, onClose: r, onStateChange: u, apiBaseUrl: p } = e, s = K(ke());
  if (n.initialPaymentIntent) {
    const y = n.initialPaymentIntent;
    s.value = {
      ...s.value,
      status: "ready",
      paymentIntent: y,
      selectedMethod: y.availableMethods?.length === 1 ? y.availableMethods[0] : null
    };
  }
  const h = new we({
    publicKey: n.publicKey,
    baseUrl: p
  }), o = (y) => {
    s.value = Ce(s.value, y);
  };
  D(
    () => s.value.status,
    (y) => {
      u?.(y);
    }
  );
  const l = async (y, k) => {
    o({ type: "INIT_START" });
    try {
      const w = n.reference || Pe(), I = ge(n.currency), R = y || n.paymentMethods?.[0] || "card", { data: E, error: j } = await h.createPaymentIntent(
        { ...n, reference: w },
        R,
        I,
        {
          preferredProviders: k?.preferredProvider ? [k.preferredProvider] : void 0,
          allowedProviders: k?.allowedProviders
        }
      );
      if (j) {
        o({ type: "INIT_ERROR", payload: j }), d?.(j);
        return;
      }
      if (!E) {
        const F = {
          code: "INIT_FAILED",
          message: "No data received from API",
          recoverable: !0
        };
        o({ type: "INIT_ERROR", payload: F }), d?.(F);
        return;
      }
      const $ = $e(E, { ...n, reference: w });
      o({ type: "INIT_SUCCESS", payload: $ });
    } catch (w) {
      const I = {
        code: "INIT_FAILED",
        message: w instanceof Error ? w.message : "Failed to initialize checkout",
        recoverable: !0,
        originalError: w
      };
      o({ type: "INIT_ERROR", payload: I }), d?.(I);
    }
  }, f = (y) => {
    o({ type: "SELECT_METHOD", payload: y });
  }, T = async (y) => {
    if (!(!s.value.paymentIntent || !s.value.selectedMethod)) {
      o({ type: "PROCESS_START" });
      try {
        let k;
        if (s.value.paymentIntent.clientSecret) {
          const { data: I, error: R } = await h.confirmPaymentIntent(
            s.value.paymentIntent.id,
            s.value.paymentIntent.clientSecret
          );
          if (R) {
            o({ type: "PROCESS_ERROR", payload: R }), d?.(R);
            return;
          }
          k = I;
        } else {
          const { data: I, error: R } = await h.confirmPayment(s.value.paymentIntent.id);
          if (R) {
            o({ type: "PROCESS_ERROR", payload: R }), d?.(R);
            return;
          }
          k = I;
        }
        const w = {
          paymentId: s.value.paymentIntent.id,
          reference: y.reference || s.value.paymentIntent.reference || s.value.paymentIntent.metadata?.reference || "",
          amount: s.value.paymentIntent.amount,
          currency: s.value.paymentIntent.currency,
          paymentMethod: s.value.selectedMethod,
          psp: s.value.paymentIntent.recommendedPsp,
          pspReference: y.pspReference || k?.provider_ref_id || "",
          status: "success",
          metadata: y
        };
        o({ type: "PROCESS_SUCCESS", payload: w }), t?.(w);
      } catch (k) {
        const w = {
          code: "PAYMENT_FAILED",
          message: k instanceof Error ? k.message : "Payment failed",
          recoverable: !0,
          originalError: k
        };
        o({ type: "PROCESS_ERROR", payload: w }), d?.(w);
      }
    }
  }, A = async (y) => {
    await T(y);
  }, ee = (y) => {
    o({ type: "PROCESS_ERROR", payload: y }), d?.(y);
  }, Y = () => {
    o({ type: "RESET" });
  }, U = async () => {
    if (s.value.paymentIntent && s.value.status !== "success")
      try {
        await h.cancelPaymentIntent(s.value.paymentIntent.id);
      } catch {
      }
    o({ type: "CLOSE" }), r?.();
  }, S = b(() => s.value.status), V = b(() => s.value.paymentIntent), G = b(() => s.value.selectedMethod), q = b(() => s.value.error), N = b(() => s.value.result), O = b(
    () => s.value.status === "loading" || s.value.status === "processing"
  ), C = b(
    () => s.value.status === "ready" || s.value.status === "method_selected" || s.value.status === "processing"
  ), W = b(() => s.value.status === "success"), te = b(() => s.value.error?.recoverable ?? !1);
  return {
    // State (readonly refs)
    status: L(S),
    paymentIntent: L(V),
    selectedMethod: L(G),
    error: L(q),
    result: L(N),
    // Actions
    initialize: l,
    selectMethod: f,
    processPayment: T,
    handlePspSuccess: A,
    handlePspError: ee,
    reset: Y,
    close: U,
    // Computed
    isLoading: L(O),
    isReady: L(C),
    isComplete: L(W),
    canRetry: L(te)
  };
}
const Te = {
  key: 0,
  class: "reevit-method-selector__label"
}, Le = ["onClick"], Ue = { class: "reevit-method-option__icon-wrapper" }, Ne = { class: "reevit-method-option__icon" }, Oe = { class: "reevit-method-option__content" }, Fe = { class: "reevit-method-option__label" }, De = {
  key: 0,
  class: "reevit-method-option__description"
}, ze = {
  key: 0,
  class: "reevit-method-option__check"
}, Ae = {
  key: 1,
  class: "reevit-method-option__chevron"
}, pe = /* @__PURE__ */ X({
  __name: "PaymentMethodSelector",
  props: {
    methods: {},
    selected: {},
    provider: {},
    layout: {},
    showLabel: { type: Boolean }
  },
  emits: ["select"],
  setup(e, { emit: n }) {
    const t = e, { showLabel: d = !0 } = t, r = n, u = b(() => (t.layout || "list") === "grid"), p = b(() => [
      {
        id: "card",
        name: "Card",
        icon: "💳",
        description: "Pay with Visa, Mastercard, or other cards"
      },
      {
        id: "mobile_money",
        name: "Mobile Money",
        icon: "📱",
        description: "MTN, Vodafone Cash, AirtelTigo Money"
      },
      {
        id: "bank_transfer",
        name: "Bank Transfer",
        icon: "🏦",
        description: "Pay directly from your bank account"
      }
    ].filter((s) => t.methods.includes(s.id)));
    return (s, h) => (m(), v("div", {
      class: z(["reevit-method-selector", { "reevit-method-selector--grid": u.value }])
    }, [
      H(d) ? (m(), v("div", Te, "Select payment method")) : x("", !0),
      a("div", {
        class: z(["reevit-method-selector__options", u.value ? "reevit-method-selector__options--grid" : "reevit-method-selector__options--list"])
      }, [
        (m(!0), v(B, null, re(p.value, (o, l) => (m(), v("button", {
          key: o.id,
          type: "button",
          class: z(["reevit-method-option", [
            u.value ? "reevit-method-option--grid" : "reevit-method-option--list",
            { "reevit-method-option--selected": e.selected === o.id }
          ]]),
          style: Q({ animationDelay: `${l * 0.05}s` }),
          onClick: (f) => r("select", o.id)
        }, [
          a("span", Ue, [
            a("span", Ne, M(o.icon), 1)
          ]),
          a("div", Oe, [
            a("span", Fe, M(o.name), 1),
            u.value ? x("", !0) : (m(), v("span", De, M(o.description), 1))
          ]),
          u.value ? x("", !0) : (m(), v(B, { key: 0 }, [
            e.selected === o.id ? (m(), v("span", ze, [...h[0] || (h[0] = [
              a("svg", {
                width: "20",
                height: "20",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "3",
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
              }, [
                a("polyline", { points: "20 6 9 17 4 12" })
              ], -1)
            ])])) : (m(), v("span", Ae, [...h[1] || (h[1] = [
              a("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2.5",
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
              }, [
                a("polyline", { points: "9 18 15 12 9 6" })
              ], -1)
            ])]))
          ], 64))
        ], 14, Le))), 128))
      ], 2)
    ], 2));
  }
}), je = { class: "reevit-psp-selector" }, Ke = { class: "reevit-psp-selector__options" }, He = ["disabled", "aria-expanded", "onClick"], Be = {
  class: "reevit-psp-option__logo",
  "aria-hidden": "true"
}, Ve = ["src"], qe = {
  key: 1,
  class: "reevit-psp-option__logo-fallback"
}, Ye = { class: "reevit-psp-option__content" }, Ge = { class: "reevit-psp-option__name" }, We = { class: "reevit-psp-option__methods" }, Je = {
  key: 0,
  class: "reevit-psp-accordion__content reevit-animate-fade-in"
}, Qe = { class: "reevit-psp-methods" }, Xe = /* @__PURE__ */ X({
  __name: "ProviderSelector",
  props: {
    providers: {},
    selectedProvider: {},
    disabled: { type: Boolean },
    theme: {},
    selectedMethod: {}
  },
  emits: ["select", "methodSelect"],
  setup(e, { emit: n }) {
    const t = n, d = {
      paystack: "https://reevit.io/images/providers/paystack.png",
      stripe: "https://reevit.io/images/providers/stripe.png",
      flutterwave: "https://reevit.io/images/providers/flutterwave.png",
      hubtel: "https://reevit.io/images/providers/hubtel.png",
      monnify: "https://reevit.io/images/providers/monnify.png",
      mpesa: "https://reevit.io/images/providers/mpesa.png"
    }, r = {
      card: "Card",
      mobile_money: "Mobile Money",
      bank_transfer: "Bank Transfer"
    }, u = (s) => s.length ? s.map((h) => r[h]).join(", ") : "Payment methods", p = (s, h) => s.toLowerCase().includes("hubtel") ? h.filter((o) => o === "card" || o === "mobile_money") : h;
    return (s, h) => (m(), v("div", je, [
      h[1] || (h[1] = a("div", { class: "reevit-psp-selector__label" }, "Select payment provider", -1)),
      a("div", Ke, [
        (m(!0), v(B, null, re(e.providers, (o) => (m(), v("div", {
          key: o.provider,
          class: "reevit-psp-accordion"
        }, [
          a("button", {
            type: "button",
            class: z(
              H(ue)(
                "reevit-psp-option",
                e.selectedProvider === o.provider && "reevit-psp-option--selected",
                e.disabled && "reevit-psp-option--disabled"
              )
            ),
            disabled: e.disabled,
            "aria-expanded": e.selectedProvider === o.provider,
            onClick: (l) => t("select", o.provider)
          }, [
            a("span", Be, [
              d[o.provider] ? (m(), v("img", {
                key: 0,
                src: d[o.provider],
                alt: "",
                class: "reevit-psp-option__logo-img",
                loading: "lazy"
              }, null, 8, Ve)) : (m(), v("span", qe, M(o.name.slice(0, 1).toUpperCase()), 1))
            ]),
            a("div", Ye, [
              a("span", Ge, M(o.name), 1),
              a("span", We, M(u(p(o.provider, o.methods))), 1)
            ])
          ], 10, He),
          e.selectedProvider === o.provider ? (m(), v("div", Je, [
            a("div", Qe, [
              se(pe, {
                methods: p(o.provider, o.methods),
                selected: e.selectedMethod || null,
                provider: o.provider,
                "show-label": !1,
                layout: "list",
                onSelect: h[0] || (h[0] = (l) => t("methodSelect", l))
              }, null, 8, ["methods", "selected", "provider"])
            ]),
            oe(s.$slots, "method-content")
          ])) : x("", !0)
        ]))), 128))
      ])
    ]));
  }
}), Ze = { class: "reevit-form-group" }, et = ["disabled"], tt = { class: "reevit-network-selector" }, nt = { class: "reevit-networks-grid" }, ot = ["onClick", "disabled"], st = {
  key: 0,
  class: "reevit-error-message"
}, rt = { class: "reevit-momo-form__actions" }, it = ["disabled"], at = ["disabled"], lt = {
  key: 0,
  class: "reevit-spinner"
}, dt = { key: 1 }, ae = /* @__PURE__ */ X({
  __name: "MobileMoneyForm",
  props: {
    initialPhone: {},
    loading: { type: Boolean },
    hideCancel: { type: Boolean }
  },
  emits: ["submit", "cancel"],
  setup(e, { emit: n }) {
    const t = e, d = n, r = K(t.initialPhone || ""), u = K(null), p = K(null);
    D(r, (o) => {
      const l = Se(o);
      l && (u.value = l), p.value && (p.value = null);
    });
    const s = () => {
      if (!ie(r.value)) {
        p.value = "Please enter a valid phone number";
        return;
      }
      if (!u.value) {
        p.value = "Please select your mobile network";
        return;
      }
      d("submit", {
        phone: r.value,
        network: u.value
      });
    }, h = [
      { id: "mtn", name: "MTN", color: "#FFCC00" },
      { id: "vodafone", name: "Vodafone", color: "#E60000" },
      { id: "airteltigo", name: "AirtelTigo", color: "#005596" }
    ];
    return (o, l) => (m(), v("form", {
      class: "reevit-momo-form",
      onSubmit: de(s, ["prevent"])
    }, [
      a("div", Ze, [
        l[2] || (l[2] = a("label", {
          class: "reevit-label",
          for: "reevit-phone"
        }, "Phone Number", -1)),
        he(a("input", {
          id: "reevit-phone",
          "onUpdate:modelValue": l[0] || (l[0] = (f) => r.value = f),
          type: "tel",
          class: z(["reevit-input", { "reevit-input--error": p.value && !H(ie)(r.value) }]),
          placeholder: "e.g. 024 123 4567",
          disabled: e.loading,
          autocomplete: "tel"
        }, null, 10, et), [
          [ye, r.value]
        ])
      ]),
      a("div", tt, [
        l[3] || (l[3] = a("label", { class: "reevit-label" }, "Select Network", -1)),
        a("div", nt, [
          (m(), v(B, null, re(h, (f) => a("button", {
            key: f.id,
            type: "button",
            class: z(H(ue)("reevit-network-btn", u.value === f.id && "reevit-network-btn--selected")),
            onClick: (T) => u.value = f.id,
            disabled: e.loading
          }, [
            a("div", {
              class: "reevit-network-dot",
              style: Q({ backgroundColor: f.color })
            }, null, 4),
            ce(" " + M(f.name), 1)
          ], 10, ot)), 64))
        ])
      ]),
      p.value ? (m(), v("p", st, M(p.value), 1)) : x("", !0),
      a("div", rt, [
        e.hideCancel ? x("", !0) : (m(), v("button", {
          key: 0,
          type: "button",
          class: "reevit-btn reevit-btn--secondary",
          onClick: l[1] || (l[1] = (f) => d("cancel")),
          disabled: e.loading
        }, " Back ", 8, it)),
        a("button", {
          type: "submit",
          class: "reevit-btn reevit-btn--primary",
          disabled: e.loading || !r.value
        }, [
          e.loading ? (m(), v("span", lt)) : (m(), v("span", dt, "Continue"))
        ], 8, at)
      ]),
      l[4] || (l[4] = a("p", { class: "reevit-secure-text" }, " 🔒 Secure mobile money payment via Reevit ", -1))
    ], 32));
  }
});
class ct {
  constructor(n) {
    this.baseUrl = "https://unified-pay.hubtel.com", this.messageHandler = null, this.stylesInjected = !1, n && (this.baseUrl = n);
  }
  /**
  * Redirects the user to the checkout page with the provided purchase information and configuration.
  * @param purchaseInfo - The purchase information.
  * @param config - The configuration.
  * @throws {Error} If the popup is blocked by the browser.
  */
  redirect({ purchaseInfo: n, config: t }) {
    const d = this.createCheckoutUrl(n, t), r = window.open(d);
    if (!r || r.closed || typeof r.closed > "u")
      throw new Error("Popup was blocked by the browser. Please allow popups for this site.");
  }
  /**
  * Initializes the iframe for the checkout process.
  *
  * @param purchaseInfo - The purchase information.
  * @param callBacks - The callback functions.
  * @param config - The configuration settings.
  * @param iframeStyle - The style options for the iframe (optional).
  * @throws {Error} If the container element with id "hubtel-checkout-iframe" is not found.
  */
  initIframe({ purchaseInfo: n, callBacks: t, config: d, iframeStyle: r }) {
    var u, p, s;
    this.registerEvents(t);
    const h = document.getElementById("hubtel-checkout-iframe");
    if (!h)
      throw new Error('Container element with id "hubtel-checkout-iframe" not found in the DOM.');
    h.innerHTML = "";
    const o = document.createElement("div");
    o.textContent = "Loading...", h.appendChild(o);
    const l = document.createElement("iframe");
    l.setAttribute("id", "hubtel-iframe-element"), l.src = this.createCheckoutUrl(n, d), l.style.display = "none", l.style.width = (u = r?.width) !== null && u !== void 0 ? u : "100%", l.style.height = (p = r?.height) !== null && p !== void 0 ? p : "100%", l.style.minHeight = r?.minHeight || "400px", l.style.border = (s = r?.border) !== null && s !== void 0 ? s : "none", l.onload = () => {
      var f;
      h.removeChild(o), l.style.display = "block", (f = t.onLoad) === null || f === void 0 || f.call(t);
    }, h.appendChild(l);
  }
  openModal({ purchaseInfo: n, callBacks: t, config: d }) {
    this.injectStyles(), this.createIframe(), this.handleBackButton(), this.registerEvents(t), this.renderWebpageInPopup(this.createCheckoutUrl(n, d), t.onClose, t.onLoad);
  }
  createCheckoutUrl(n, t) {
    const d = Object.assign(Object.assign({}, n), t), r = Object.keys(d).reduce((o, l) => (d[l] !== null && d[l] !== void 0 && (o[l] = d[l]), o), {}), u = Object.keys(r).map((o) => `${o}=${encodeURIComponent(r[o])}`).join("&"), p = this.encodeBase64(u), s = encodeURIComponent(p);
    return `${r?.branding === "disabled" ? `${this.baseUrl}/pay/direct` : `${this.baseUrl}/pay`}?p=${s}`;
  }
  encodeBase64(n) {
    return btoa(unescape(encodeURIComponent(n)));
  }
  handleBackButton() {
    window.addEventListener("popstate", () => {
      this.closePopUp();
    });
  }
  createIframe() {
    const n = document.createElement("div");
    n.setAttribute("id", "backdrop"), n.classList.add("backdrop");
    const t = document.createElement("span");
    t.classList.add("checkout-loader"), n.appendChild(t), document.body.appendChild(n);
  }
  registerEvents(n) {
    this.messageHandler && window.removeEventListener("message", this.messageHandler, !1);
    const t = (d) => {
      var r, u, p, s, h, o;
      if (d.origin !== this.baseUrl)
        return;
      const { data: l } = d;
      if (l.success === !0)
        (r = n.onPaymentSuccess) === null || r === void 0 || r.call(n, l);
      else if (l.success === !1)
        (u = n.onPaymentFailure) === null || u === void 0 || u.call(n, l);
      else if (l.initialized)
        (p = n.init) === null || p === void 0 || p.call(n, l), (s = n.onInit) === null || s === void 0 || s.call(n, l);
      else if (l.feesChanged)
        (h = n.onFeesChanged) === null || h === void 0 || h.call(n, l.fees);
      else if (l.resize) {
        const f = document.getElementById("hubtel-iframe-element");
        f && (f.style.height = l.height + "px"), (o = n?.onResize) === null || o === void 0 || o.call(n, l);
      }
    };
    this.messageHandler = t, window.addEventListener("message", t, !1);
  }
  /**
   * Removes the message event listener to prevent memory leaks.
   * Call this method when you're done with the checkout to clean up resources.
   */
  destroy() {
    this.messageHandler && (window.removeEventListener("message", this.messageHandler, !1), this.messageHandler = null);
  }
  renderWebpageInPopup(n, t, d) {
    const r = document.createElement("div");
    r.classList.add("checkout-modal");
    const u = document.createElement("div");
    u.setAttribute("id", "checkout-close-icon"), u.innerHTML = "&times;", u.classList.add("close-icon"), u.addEventListener("click", () => {
      this.closePopUp(), t?.();
    }), r.appendChild(u);
    const p = document.createElement("iframe");
    p.src = n, history.pushState({ modalOpen: !0 }, ""), p.classList.add("iframe"), r.appendChild(p), document.body.appendChild(r), r.style.opacity = "0", p.addEventListener("load", () => {
      r.style.opacity = "1", d?.();
    });
  }
  closePopUp() {
    const n = document.querySelector(".backdrop"), t = document.querySelector(".checkout-modal");
    n && document.body.removeChild(n), t && document.body.removeChild(t), history.replaceState(null, ""), window.removeEventListener("popstate", this.closePopUp);
  }
  injectStyles() {
    if (this.stylesInjected)
      return;
    const n = document.createElement("style");
    n.type = "text/css", n.setAttribute("data-hubtel-checkout", "true"), n.innerHTML = `
        .backdrop {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 999998;
        }

        .loader {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 999999;
            /* Your loader styles */
        }

        .checkout-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            height: 90%;
            padding-top: 20px;
            max-width: 480px;
            background-color: #fff;
            border-radius: 10px;
            z-index: 1000000;
            transition: opacity 0.5s ease, transform 0.5s ease;
            opacity: 0;
        }

        .close-icon {
            position: absolute;
            top: 10px;
            width: 25px;
            height: 25px;
            font-size: 20px;
            right: 10px;
            cursor: pointer;
            color: #fff;
            background-color: #000;
            text-align: center;
            border-radius: 50%;
        }

        .iframe {
            width: 100%;
            height: calc(100% - 20px);
            border: none;
        }

        .checkout-loader {
          width: 30px;
          height: 30px;
          border: 3px solid #FFF;
          border-bottom-color: #42b883;
          border-radius: 50%;
          display: inline-block;
          box-sizing: border-box;
          position : fixed;
          top : 50%;
          left : 50%;
          transform : translate(-50%, -50%);
          z-index : 999999;
          animation: rotation 1s linear infinite;
      }

      @keyframes rotation {
          0% {
              transform: rotate(0deg);
          }
          100% {
              transform: rotate(360deg);
          }
      }

      @media screen and (max-width: 600px) {
          .checkout-modal {
              width: 100%;
              height: 100%;
              border-radius: 0;
              padding-bottom: 0px;
              padding-top: 0px;
          }
          .close-icon{
            top: 10px;
            right: 15px;
          }

          .iframe {

            height: 100%;

        }
      }
    `, document.head.appendChild(n), this.stylesInjected = !0;
  }
}
const le = /* @__PURE__ */ new Map();
function Z(e, n) {
  const t = le.get(n);
  if (t) return t;
  const d = new Promise((r, u) => {
    if (document.getElementById(n)) {
      r();
      return;
    }
    const p = document.createElement("script");
    p.id = n, p.src = e, p.async = !0, p.onload = () => r(), p.onerror = () => u(new Error(`Failed to load ${n} script`)), document.head.appendChild(p);
  });
  return le.set(n, d), d;
}
function ut() {
  return Z("https://js.paystack.co/v1/inline.js", "paystack-script");
}
function Bt() {
  return Promise.resolve();
}
function pt() {
  return Z("https://checkout.flutterwave.com/v3.js", "flutterwave-script");
}
function mt() {
  return Z("https://js.stripe.com/v3/", "stripe-script");
}
function vt() {
  return Z("https://sdk.monnify.com/plugin/monnify.js", "monnify-script");
}
async function ht(e) {
  if (await ut(), !window.PaystackPop)
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
async function yt(e) {
  const n = new ct(), t = e.preferredMethod === "mobile_money" ? "momo" : e.preferredMethod === "card" ? "card" : void 0, d = {
    amount: e.amount,
    purchaseDescription: e.purchaseDescription,
    customerPhoneNumber: e.customerPhone || "",
    clientReference: `hubtel_${Date.now()}`,
    ...t ? { paymentMethod: t } : {}
  }, r = e.hubtelSessionToken || e.basicAuth || "", u = {
    branding: "enabled",
    callbackUrl: e.callbackUrl || (typeof window < "u" ? window.location.href : ""),
    merchantAccount: typeof e.clientId == "string" ? parseInt(e.clientId, 10) : e.clientId,
    basicAuth: r,
    ...t ? { paymentMethod: t } : {}
  };
  n.openModal({
    purchaseInfo: d,
    config: u,
    callBacks: {
      onPaymentSuccess: (p) => {
        e.onSuccess(p), n.closePopUp();
      },
      onPaymentFailure: () => {
        e.onClose();
      },
      onClose: () => {
        e.onClose();
      }
    }
  });
}
async function bt(e) {
  if (await pt(), !window.FlutterwaveCheckout)
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
async function ft(e) {
  if (await mt(), !window.Stripe)
    throw new Error("Stripe.js not loaded");
  return window.Stripe(e);
}
async function Vt(e) {
  const t = await (await ft(e.publishableKey)).confirmPayment({
    elements: e.elements,
    clientSecret: e.clientSecret,
    redirect: "if_required"
  });
  t.error ? e.onError({ message: t.error.message || "Payment failed" }) : t.paymentIntent && e.onSuccess({
    paymentIntentId: t.paymentIntent.id,
    status: t.paymentIntent.status
  });
}
async function _t(e) {
  if (await vt(), !window.MonnifySDK)
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
    onComplete: (n) => {
      n.status === "SUCCESS" ? e.onSuccess({
        transactionReference: n.transactionReference,
        paymentReference: n.paymentReference,
        ...n
      }) : e.onError?.({ message: n.message || "Payment failed" });
    },
    onClose: e.onClose
  });
}
async function kt(e, n) {
  e.onInitiated();
  try {
    const t = await fetch(n, {
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
      const u = (await t.json().catch(() => ({}))).message || "Failed to initiate M-Pesa payment";
      return e.onError({ message: u }), { status: "failed", message: u };
    }
    const d = await t.json();
    return {
      status: "initiated",
      message: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
      transactionId: d.checkout_request_id || d.transaction_id
    };
  } catch (t) {
    const d = t instanceof Error ? t.message : "Network error";
    return e.onError({ message: d }), { status: "failed", message: d };
  }
}
const wt = ["disabled"], Pt = {
  key: 0,
  class: "reevit-spinner"
}, gt = { class: "reevit-modal-header" }, Ct = ["src"], St = { class: "reevit-modal-body" }, Mt = {
  key: 0,
  class: "reevit-loading-state"
}, Et = {
  key: 1,
  class: "reevit-error-state"
}, It = {
  key: 2,
  class: "reevit-success-state"
}, Rt = {
  key: 3,
  class: "reevit-method-step reevit-animate-slide-up"
}, $t = {
  key: 0,
  class: "reevit-inline-action reevit-animate-fade-in"
}, xt = ["disabled"], Tt = {
  key: 1,
  class: "reevit-inline-action reevit-animate-fade-in"
}, Lt = { class: "reevit-inline-action__hint" }, Ut = ["disabled"], Nt = {
  key: 0,
  class: "reevit-method-step__actions reevit-animate-slide-up"
}, Ot = { key: 0 }, Ft = {
  key: 1,
  class: "reevit-card-info reevit-animate-fade-in"
}, Dt = { class: "reevit-info-text" }, zt = ["disabled"], At = {
  key: 0,
  class: "reevit-spinner"
}, jt = { key: 1 }, qt = /* @__PURE__ */ X({
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
  setup(e, { emit: n }) {
    const t = e, d = n, {
      status: r,
      paymentIntent: u,
      selectedMethod: p,
      error: s,
      isLoading: h,
      isReady: o,
      initialize: l,
      selectMethod: f,
      handlePspSuccess: T,
      handlePspError: A,
      close: ee,
      reset: Y
    } = xe({
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
      onSuccess: (c) => d("success", c),
      onError: (c) => d("error", c),
      onClose: () => d("close")
    }), U = K(t.isOpen ?? !1), S = K(null), V = {
      hubtel: "Hubtel",
      paystack: "Paystack",
      flutterwave: "Flutterwave",
      monnify: "Monnify",
      mpesa: "M-Pesa",
      stripe: "Stripe"
    };
    D(() => t.isOpen, (c) => {
      c !== void 0 && (U.value = c);
    });
    const G = () => {
      U.value = !0, S.value = null, !u.value && r.value === "idle" && l();
    };
    D([U, u, p], ([c, i, _]) => {
      if (c && i && _) {
        const g = (S.value || i.recommendedPsp || "paystack").toLowerCase().includes("mpesa");
        (_ === "card" || _ === "mobile_money" && (!g || t.phone)) && k(null);
      }
    });
    const q = () => {
      U.value = !1, ee(), S.value = null;
    }, N = b(
      () => t.paymentMethods?.length ? t.paymentMethods : ["card", "mobile_money"]
    ), O = b(() => {
      const c = u.value;
      if (!c) return [];
      const i = new Set(N.value), _ = (c.availableProviders || []).map((g) => {
        const ve = g.provider.toLowerCase().includes("hubtel") ? g.methods.filter((J) => J === "card" || J === "mobile_money") : g.methods;
        return {
          ...g,
          methods: ve.filter((J) => i.has(J))
        };
      }).filter((g) => g.methods.length > 0);
      if (_.length > 0)
        return _;
      const P = c.recommendedPsp.toLowerCase().includes("hubtel") ? N.value.filter((g) => g === "card" || g === "mobile_money") : N.value;
      return [
        {
          provider: c.recommendedPsp,
          name: V[c.recommendedPsp] || c.recommendedPsp,
          methods: P
        }
      ];
    }), C = b(() => {
      const c = u.value;
      return S.value || c?.recommendedPsp || "paystack";
    }), W = b(() => {
      const c = O.value.find(
        (i) => i.provider === C.value
      );
      return c?.methods.length ? c.methods : N.value;
    });
    D(
      () => O.value,
      (c) => {
        c.length && (S.value && c.some((i) => i.provider === S.value) || (c.length === 1 ? S.value = c[0].provider : S.value = null));
      },
      { immediate: !0 }
    ), D([W, p], ([c, i]) => {
      !i || c.length === 0 || c.includes(i) || f(c[0]);
    });
    const te = (c) => {
      if (c === S.value) {
        S.value = null, Y();
        return;
      }
      const i = O.value.find((g) => g.provider === c), _ = i?.methods.length ? i.methods : N.value, P = p.value && _.includes(p.value) ? p.value : _[0];
      S.value = c, Y(), l(P, { preferredProvider: c, allowedProviders: [c] });
    }, y = (c) => {
      f(c);
    }, k = async (c) => {
      const i = u.value;
      if (!i) return;
      const _ = C.value;
      try {
        if (_ === "paystack")
          await ht({
            key: t.publicKey,
            email: t.email || "",
            amount: t.amount,
            currency: t.currency,
            ref: i.id,
            onSuccess: (P) => T(P),
            onClose: () => {
            }
          });
        else if (_ === "hubtel")
          await yt({
            clientId: i.pspCredentials?.merchantAccount || t.publicKey,
            purchaseDescription: `Payment for ${t.amount} ${t.currency}`,
            amount: t.amount,
            customerPhone: c?.phone || t.phone,
            customerEmail: t.email,
            hubtelSessionToken: i.id,
            // Pass payment ID to fetch session token
            preferredMethod: $.value || void 0,
            onSuccess: (P) => T(P),
            onClose: () => {
            }
          });
        else if (_ === "flutterwave")
          await bt({
            public_key: t.publicKey,
            tx_ref: i.id,
            amount: t.amount,
            currency: t.currency,
            customer: {
              email: t.email || "",
              phone_number: c?.phone || t.phone
            },
            callback: (P) => T(P),
            onclose: () => {
            }
          });
        else if (_ === "monnify")
          await _t({
            apiKey: i.pspPublicKey || t.publicKey,
            contractCode: t.metadata?.contract_code || t.publicKey,
            amount: t.amount,
            currency: t.currency,
            reference: i.reference || i.id,
            customerName: t.metadata?.customer_name || t.email || "",
            customerEmail: t.email || "",
            customerPhone: c?.phone || t.phone,
            metadata: t.metadata,
            onSuccess: (P) => T(P),
            onClose: () => {
            }
          });
        else if (_ === "mpesa") {
          const P = `${t.apiBaseUrl || "https://api.reevit.io"}/v1/payments/${i.id}/mpesa`;
          await kt({
            phoneNumber: c?.phone || t.phone || "",
            amount: t.amount,
            reference: i.reference || i.id,
            description: `Payment ${i.reference || ""}`,
            onInitiated: () => {
            },
            onSuccess: (g) => T(g),
            onError: (g) => A({ code: "MPESA_ERROR", message: g.message })
          }, P);
        } else A(_ === "stripe" ? {
          code: "STRIPE_NOT_IMPLEMENTED",
          message: "Stripe integration requires custom Elements setup. Please use the React SDK or implement custom Stripe Elements."
        } : {
          code: "UNSUPPORTED_PSP",
          message: `Payment provider "${_}" is not supported in this checkout.`
        });
      } catch (P) {
        A({
          code: "BRIDGE_ERROR",
          message: P instanceof Error ? P.message : "Failed to open payment gateway"
        });
      }
    }, w = b(() => ({
      ...u.value?.branding || {},
      ...t.theme || {}
    })), I = b(() => Me(w.value)), R = b(() => w.value?.darkMode);
    D(U, (c) => {
      c ? document.body.style.overflow = "hidden" : document.body.style.overflow = "";
    }), be(() => {
      document.body.style.overflow = "";
    });
    const E = b(() => r.value), j = b(() => s.value), $ = b(() => p.value), F = b(() => h.value), me = b(() => o.value);
    return (c, i) => (m(), v("div", {
      class: "reevit-sdk-container",
      style: Q(I.value)
    }, [
      oe(c.$slots, "default", {
        open: G,
        isLoading: F.value
      }, () => [
        a("button", {
          type: "button",
          class: "reevit-pay-button",
          onClick: G,
          disabled: F.value
        }, [
          F.value ? (m(), v("span", Pt)) : oe(c.$slots, "button-text", { key: 1 }, () => [
            i[5] || (i[5] = ce("Pay Now", -1))
          ])
        ], 8, wt)
      ]),
      (m(), ne(fe, { to: "body" }, [
        U.value ? (m(), v("div", {
          key: 0,
          class: "reevit-modal-overlay",
          onClick: de(q, ["self"])
        }, [
          a("div", {
            class: z(["reevit-modal-content", { "reevit-modal--dark": R.value }]),
            style: Q(I.value)
          }, [
            a("button", {
              class: "reevit-modal-close",
              onClick: q,
              "aria-label": "Close"
            }, " × "),
            a("div", gt, [
              a("img", {
                src: w.value.logoUrl || "https://i.imgur.com/bzUR5Lm.png",
                alt: "Checkout",
                class: "reevit-modal__logo"
              }, null, 8, Ct)
            ]),
            a("div", St, [
              E.value === "loading" ? (m(), v("div", Mt, [...i[6] || (i[6] = [
                a("div", { class: "reevit-spinner reevit-spinner--large" }, null, -1),
                a("p", null, "Initializing payment...", -1)
              ])])) : E.value === "failed" && j.value ? (m(), v("div", Et, [
                i[7] || (i[7] = a("div", { class: "reevit-error-icon" }, "⚠️", -1)),
                i[8] || (i[8] = a("h3", null, "Payment Failed", -1)),
                a("p", null, M(j.value.message), 1),
                a("button", {
                  class: "reevit-retry-btn",
                  onClick: i[0] || (i[0] = (_) => H(l)())
                }, "Retry")
              ])) : E.value === "success" ? (m(), v("div", It, [
                i[9] || (i[9] = a("div", { class: "reevit-success-icon" }, "✅", -1)),
                i[10] || (i[10] = a("h3", null, "Payment Successful", -1)),
                i[11] || (i[11] = a("p", null, "Thank you for your payment.", -1)),
                a("button", {
                  class: "reevit-done-btn",
                  onClick: q
                }, "Done")
              ])) : me.value ? (m(), v("div", Rt, [
                O.value.length > 1 ? (m(), ne(Xe, {
                  key: 0,
                  providers: O.value,
                  "selected-provider": S.value,
                  disabled: F.value,
                  theme: w.value,
                  "selected-method": $.value,
                  onSelect: te,
                  onMethodSelect: y
                }, {
                  "method-content": _e(() => [
                    $.value === "card" ? (m(), v("div", $t, [
                      i[12] || (i[12] = a("p", { class: "reevit-inline-action__hint" }, " You'll be redirected to complete your card payment securely. ", -1)),
                      a("button", {
                        class: "reevit-btn reevit-btn--primary",
                        onClick: i[1] || (i[1] = (_) => k(null)),
                        disabled: E.value === "processing"
                      }, " Pay with Card ", 8, xt)
                    ])) : $.value === "mobile_money" ? (m(), v("div", Tt, [
                      C.value.includes("mpesa") && !t.phone ? (m(), ne(ae, {
                        key: 0,
                        "initial-phone": t.phone,
                        loading: E.value === "processing",
                        "hide-cancel": "",
                        onSubmit: k
                      }, null, 8, ["initial-phone", "loading"])) : (m(), v(B, { key: 1 }, [
                        a("p", Lt, M(C.value.includes("hubtel") ? "Opens the Hubtel checkout with Mobile Money selected." : `Continue to pay securely with Mobile Money via ${V[C.value] || C.value}.`), 1),
                        a("button", {
                          class: "reevit-btn reevit-btn--primary",
                          onClick: i[2] || (i[2] = (_) => k(null)),
                          disabled: E.value === "processing"
                        }, M(C.value.includes("hubtel") ? "Continue with Hubtel" : "Pay with Mobile Money"), 9, Ut)
                      ], 64))
                    ])) : x("", !0)
                  ]),
                  _: 1
                }, 8, ["providers", "selected-provider", "disabled", "theme", "selected-method"])) : (m(), v(B, { key: 1 }, [
                  se(pe, {
                    methods: W.value,
                    selected: $.value,
                    provider: C.value,
                    "show-label": !1,
                    layout: "grid",
                    onSelect: y
                  }, null, 8, ["methods", "selected", "provider"]),
                  $.value ? (m(), v("div", Nt, [
                    $.value === "mobile_money" && C.value.includes("mpesa") && !t.phone ? (m(), v("div", Ot, [
                      se(ae, {
                        "initial-phone": t.phone,
                        loading: E.value === "processing",
                        onSubmit: k,
                        onCancel: i[3] || (i[3] = (_) => H(f)(null))
                      }, null, 8, ["initial-phone", "loading"])
                    ])) : (m(), v("div", Ft, [
                      a("p", Dt, M($.value === "card" ? "You will be redirected to complete your card payment securely." : C.value.includes("hubtel") ? "Opens the Hubtel checkout with Mobile Money selected." : `Continue to pay securely via ${V[C.value] || C.value}.`), 1),
                      a("button", {
                        class: "reevit-submit-btn",
                        onClick: i[4] || (i[4] = (_) => k(null)),
                        disabled: E.value === "processing"
                      }, [
                        E.value === "processing" ? (m(), v("span", At)) : (m(), v("span", jt, M($.value === "card" ? "Pay with Card" : C.value.includes("hubtel") ? "Continue with Hubtel" : "Pay with Mobile Money"), 1))
                      ], 8, zt)
                    ]))
                  ])) : x("", !0)
                ], 64))
              ])) : x("", !0)
            ]),
            i[13] || (i[13] = a("div", { class: "reevit-modal-footer" }, [
              a("div", { class: "reevit-trust-badges" }, [
                a("span", null, "PCI DSS Compliant"),
                a("span", null, "•"),
                a("span", null, "SSL Secure")
              ])
            ], -1))
          ], 6)
        ])) : x("", !0)
      ]))
    ], 4));
  }
});
export {
  ae as MobileMoneyForm,
  pe as PaymentMethodSelector,
  Xe as ProviderSelector,
  Wt as ReevitAPIClient,
  qt as ReevitCheckout,
  Jt as cn,
  Vt as confirmStripePayment,
  Qt as createReevitClient,
  ft as createStripeInstance,
  Xt as detectCountryFromCurrency,
  Zt as detectNetwork,
  en as formatAmount,
  tn as formatPhone,
  kt as initiateMPesaSTKPush,
  pt as loadFlutterwaveScript,
  Bt as loadHubtelScript,
  vt as loadMonnifyScript,
  ut as loadPaystackScript,
  mt as loadStripeScript,
  bt as openFlutterwaveModal,
  yt as openHubtelPopup,
  _t as openMonnifyModal,
  ht as openPaystackPopup,
  xe as useReevit,
  nn as validatePhone
};
