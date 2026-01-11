import { ref as z, watch as K, computed as k, readonly as L, defineComponent as ee, createElementBlock as v, openBlock as m, normalizeClass as j, createCommentVNode as $, createElementVNode as c, unref as H, Fragment as V, renderList as ie, normalizeStyle as Z, toDisplayString as I, renderSlot as re, createVNode as ae, withModifiers as ue, withDirectives as ye, vModelText as be, createTextVNode as pe, onUnmounted as fe, createBlock as se, Teleport as _e, withCtx as ke } from "vue";
import { createInitialState as we, ReevitAPIClient as ge, generateReference as Ce, detectCountryFromCurrency as Pe, reevitReducer as Se, cn as me, detectNetwork as Me, validatePhone as le, createReevitClient as Ie, createThemeVariables as Ee } from "@reevit/core";
import { ReevitAPIClient as oo, cn as no, createReevitClient as so, detectCountryFromCurrency as ro, detectNetwork as ao, formatAmount as io, formatPhone as lo, validatePhone as co } from "@reevit/core";
const Re = "https://api.reevit.io";
function $e(t, e) {
  return {
    code: e?.code || "payment_link_error",
    message: e?.message || "Payment link request failed",
    recoverable: !0,
    details: {
      httpStatus: t.status,
      ...e?.details || {}
    }
  };
}
function xe(t) {
  const e = t.toLowerCase();
  return e.includes("paystack") ? "paystack" : e.includes("hubtel") ? "hubtel" : e.includes("flutterwave") ? "flutterwave" : e.includes("stripe") ? "stripe" : e.includes("monnify") ? "monnify" : e.includes("mpesa") || e.includes("m-pesa") ? "mpesa" : "paystack";
}
function Te(t) {
  const e = t.toLowerCase().trim();
  return e === "card" ? "card" : e === "mobile_money" || e === "momo" || e === "mobilemoney" ? "mobile_money" : e === "bank" || e === "bank_transfer" || e === "transfer" ? "bank_transfer" : null;
}
function Le(t) {
  if (!(!t || t.length === 0))
    return t.map((e) => {
      const o = e.methods.map((r) => Te(r)).filter(Boolean);
      return {
        provider: e.provider,
        name: e.name,
        methods: o,
        countries: e.countries
      };
    }).filter((e) => e.methods.length > 0);
}
function Ne(t) {
  if (!t)
    return {};
  const e = t, o = { ...e }, r = (d) => typeof d == "string" ? d : void 0, l = (d) => typeof d == "boolean" ? d : void 0, a = (d, i) => {
    i !== void 0 && (o[d] = i);
  };
  return a("logoUrl", r(e.logoUrl ?? e.logo_url)), a("companyName", r(e.companyName ?? e.company_name)), a("primaryColor", r(e.primaryColor ?? e.primary_color)), a("primaryForegroundColor", r(e.primaryForegroundColor ?? e.primary_foreground_color)), a("backgroundColor", r(e.backgroundColor ?? e.background_color)), a("surfaceColor", r(e.surfaceColor ?? e.surface_color)), a("textColor", r(e.textColor ?? e.text_color)), a("mutedTextColor", r(e.mutedTextColor ?? e.muted_text_color)), a("borderRadius", r(e.borderRadius ?? e.border_radius)), a("fontFamily", r(e.fontFamily ?? e.font_family)), a("darkMode", l(e.darkMode ?? e.dark_mode)), a("pspSelectorBgColor", r(e.pspSelectorBgColor ?? e.psp_selector_bg_color)), a("pspSelectorTextColor", r(e.pspSelectorTextColor ?? e.psp_selector_text_color)), a("pspSelectorBorderColor", r(e.pspSelectorBorderColor ?? e.psp_selector_border_color)), a("pspSelectorUseBorder", l(e.pspSelectorUseBorder ?? e.psp_selector_use_border)), o;
}
function Ue(t, e) {
  return {
    id: t.id,
    clientSecret: t.client_secret,
    pspPublicKey: t.psp_public_key,
    pspCredentials: t.psp_credentials,
    amount: t.amount,
    currency: t.currency,
    status: t.status,
    recommendedPsp: xe(t.provider),
    availableMethods: e.paymentMethods || ["card", "mobile_money"],
    reference: t.reference || e.reference,
    connectionId: t.connection_id,
    provider: t.provider,
    feeAmount: t.fee_amount,
    feeCurrency: t.fee_currency,
    netAmount: t.net_amount,
    metadata: e.metadata,
    availableProviders: Le(t.available_psps),
    branding: Ne(t.branding)
  };
}
function Fe(t) {
  const { config: e, onSuccess: o, onError: r, onClose: l, onStateChange: a, apiBaseUrl: d } = t, i = z(we()), h = z(0);
  if (e.initialPaymentIntent) {
    const y = e.initialPaymentIntent;
    i.value = {
      ...i.value,
      status: "ready",
      paymentIntent: y,
      selectedMethod: y.availableMethods?.length === 1 ? y.availableMethods[0] : null
    };
  }
  const u = new ge({
    publicKey: e.publicKey,
    baseUrl: d
  }), s = (y) => {
    i.value = Se(i.value, y);
  };
  K(
    () => i.value.status,
    (y) => {
      a?.(y);
    }
  );
  const w = async (y, g) => {
    const R = ++h.value;
    s({ type: "INIT_START" });
    try {
      const E = e.reference || Ce(), _ = Pe(e.currency), X = e.paymentMethods && e.paymentMethods.length === 1 ? e.paymentMethods[0] : void 0, M = y ?? X;
      let T, A;
      if (e.paymentLinkCode) {
        const n = await fetch(
          `${d || Re}/v1/pay/${e.paymentLinkCode}/pay`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
            },
            body: JSON.stringify({
              amount: e.amount,
              email: e.email || "",
              name: e.customerName || "",
              phone: e.phone || "",
              method: M,
              country: _,
              provider: g?.preferredProvider || g?.allowedProviders?.[0],
              custom_fields: e.customFields
            })
          }
        ), b = await n.json().catch(() => ({}));
        n.ok ? T = b : A = $e(n, b);
      } else {
        const n = await u.createPaymentIntent(
          { ...e, reference: E },
          M,
          _,
          {
            preferredProviders: g?.preferredProvider ? [g.preferredProvider] : void 0,
            allowedProviders: g?.allowedProviders
          }
        );
        T = n.data, A = n.error;
      }
      if (R !== h.value)
        return;
      if (A) {
        s({ type: "INIT_ERROR", payload: A }), r?.(A);
        return;
      }
      if (!T) {
        const n = {
          code: "INIT_FAILED",
          message: "No data received from API",
          recoverable: !0
        };
        s({ type: "INIT_ERROR", payload: n }), r?.(n);
        return;
      }
      const p = Ue(T, { ...e, reference: E });
      s({ type: "INIT_SUCCESS", payload: p });
    } catch (E) {
      if (R !== h.value)
        return;
      const _ = {
        code: "INIT_FAILED",
        message: E instanceof Error ? E.message : "Failed to initialize checkout",
        recoverable: !0,
        originalError: E
      };
      s({ type: "INIT_ERROR", payload: _ }), r?.(_);
    }
  }, N = (y) => {
    s({ type: "SELECT_METHOD", payload: y });
  }, x = async (y) => {
    if (!(!i.value.paymentIntent || !i.value.selectedMethod)) {
      s({ type: "PROCESS_START" });
      try {
        let g;
        if (i.value.paymentIntent.clientSecret) {
          const { data: E, error: _ } = await u.confirmPaymentIntent(
            i.value.paymentIntent.id,
            i.value.paymentIntent.clientSecret
          );
          if (_) {
            s({ type: "PROCESS_ERROR", payload: _ }), r?.(_);
            return;
          }
          g = E;
        } else {
          const { data: E, error: _ } = await u.confirmPayment(i.value.paymentIntent.id);
          if (_) {
            s({ type: "PROCESS_ERROR", payload: _ }), r?.(_);
            return;
          }
          g = E;
        }
        const R = {
          paymentId: i.value.paymentIntent.id,
          reference: y.reference || i.value.paymentIntent.reference || i.value.paymentIntent.metadata?.reference || "",
          amount: i.value.paymentIntent.amount,
          currency: i.value.paymentIntent.currency,
          paymentMethod: i.value.selectedMethod,
          psp: i.value.paymentIntent.recommendedPsp,
          pspReference: y.pspReference || g?.provider_ref_id || "",
          status: "success",
          metadata: y
        };
        s({ type: "PROCESS_SUCCESS", payload: R }), o?.(R);
      } catch (g) {
        const R = {
          code: "PAYMENT_FAILED",
          message: g instanceof Error ? g.message : "Payment failed",
          recoverable: !0,
          originalError: g
        };
        s({ type: "PROCESS_ERROR", payload: R }), r?.(R);
      }
    }
  }, oe = async (y) => {
    await x(y);
  }, G = (y) => {
    s({ type: "PROCESS_ERROR", payload: y }), r?.(y);
  }, U = () => {
    h.value += 1, s({ type: "RESET" });
  }, S = async () => {
    if (i.value.paymentIntent && i.value.status !== "success")
      try {
        await u.cancelPaymentIntent(i.value.paymentIntent.id);
      } catch {
      }
    s({ type: "CLOSE" }), l?.();
  }, q = k(() => i.value.status), J = k(() => i.value.paymentIntent), Y = k(() => i.value.selectedMethod), F = k(() => i.value.error), O = k(() => i.value.result), P = k(
    () => i.value.status === "loading" || i.value.status === "processing"
  ), W = k(
    () => i.value.status === "ready" || i.value.status === "method_selected" || i.value.status === "processing"
  ), ne = k(() => i.value.status === "success"), Q = k(() => i.value.error?.recoverable ?? !1);
  return {
    // State (readonly refs)
    status: L(q),
    paymentIntent: L(J),
    selectedMethod: L(Y),
    error: L(F),
    result: L(O),
    // Actions
    initialize: w,
    selectMethod: N,
    processPayment: x,
    handlePspSuccess: oe,
    handlePspError: G,
    reset: U,
    close: S,
    // Computed
    isLoading: L(P),
    isReady: L(W),
    isComplete: L(ne),
    canRetry: L(Q)
  };
}
const Oe = {
  key: 0,
  class: "reevit-method-selector__label"
}, Ae = ["onClick"], De = { class: "reevit-method-option__icon-wrapper" }, Ke = { class: "reevit-method-option__icon" }, ze = { class: "reevit-method-option__content" }, je = { class: "reevit-method-option__label" }, Be = {
  key: 0,
  class: "reevit-method-option__description"
}, He = {
  key: 0,
  class: "reevit-method-option__check"
}, Ve = {
  key: 1,
  class: "reevit-method-option__chevron"
}, ve = /* @__PURE__ */ ee({
  __name: "PaymentMethodSelector",
  props: {
    methods: {},
    selected: {},
    provider: {},
    layout: {},
    showLabel: { type: Boolean }
  },
  emits: ["select"],
  setup(t, { emit: e }) {
    const o = t, { showLabel: r = !0 } = o, l = e, a = k(() => (o.layout || "list") === "grid"), d = k(() => [
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
    ].filter((i) => o.methods.includes(i.id)));
    return (i, h) => (m(), v("div", {
      class: j(["reevit-method-selector", { "reevit-method-selector--grid": a.value }])
    }, [
      H(r) ? (m(), v("div", Oe, "Select payment method")) : $("", !0),
      c("div", {
        class: j(["reevit-method-selector__options", a.value ? "reevit-method-selector__options--grid" : "reevit-method-selector__options--list"])
      }, [
        (m(!0), v(V, null, ie(d.value, (u, s) => (m(), v("button", {
          key: u.id,
          type: "button",
          class: j(["reevit-method-option", [
            a.value ? "reevit-method-option--grid" : "reevit-method-option--list",
            { "reevit-method-option--selected": t.selected === u.id }
          ]]),
          style: Z({ animationDelay: `${s * 0.05}s` }),
          onClick: (w) => l("select", u.id)
        }, [
          c("span", De, [
            c("span", Ke, I(u.icon), 1)
          ]),
          c("div", ze, [
            c("span", je, I(u.name), 1),
            a.value ? $("", !0) : (m(), v("span", Be, I(u.description), 1))
          ]),
          a.value ? $("", !0) : (m(), v(V, { key: 0 }, [
            t.selected === u.id ? (m(), v("span", He, [...h[0] || (h[0] = [
              c("svg", {
                width: "20",
                height: "20",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "3",
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
              }, [
                c("polyline", { points: "20 6 9 17 4 12" })
              ], -1)
            ])])) : (m(), v("span", Ve, [...h[1] || (h[1] = [
              c("svg", {
                width: "16",
                height: "16",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2.5",
                "stroke-linecap": "round",
                "stroke-linejoin": "round"
              }, [
                c("polyline", { points: "9 18 15 12 9 6" })
              ], -1)
            ])]))
          ], 64))
        ], 14, Ae))), 128))
      ], 2)
    ], 2));
  }
}), qe = { class: "reevit-psp-selector" }, Ye = { class: "reevit-psp-selector__options" }, Ge = ["disabled", "aria-expanded", "onClick"], Je = {
  class: "reevit-psp-option__logo",
  "aria-hidden": "true"
}, We = ["src"], Qe = {
  key: 1,
  class: "reevit-psp-option__logo-fallback"
}, Xe = { class: "reevit-psp-option__content" }, Ze = { class: "reevit-psp-option__name" }, et = { class: "reevit-psp-option__methods" }, tt = {
  key: 0,
  class: "reevit-psp-accordion__content reevit-animate-fade-in"
}, ot = { class: "reevit-psp-methods" }, nt = /* @__PURE__ */ ee({
  __name: "ProviderSelector",
  props: {
    providers: {},
    selectedProvider: {},
    disabled: { type: Boolean },
    theme: {},
    selectedMethod: {}
  },
  emits: ["select", "methodSelect"],
  setup(t, { emit: e }) {
    const o = e, r = {
      paystack: "https://reevit.io/images/providers/paystack.png",
      stripe: "https://reevit.io/images/providers/stripe.png",
      flutterwave: "https://reevit.io/images/providers/flutterwave.png",
      hubtel: "https://reevit.io/images/providers/hubtel.png",
      monnify: "https://reevit.io/images/providers/monnify.png",
      mpesa: "https://reevit.io/images/providers/mpesa.png"
    }, l = {
      card: "Card",
      mobile_money: "Mobile Money",
      bank_transfer: "Bank Transfer"
    }, a = (i) => i.length ? i.map((h) => l[h]).join(", ") : "Payment methods", d = (i, h) => i.toLowerCase().includes("hubtel") ? h.filter((u) => u === "card" || u === "mobile_money") : h;
    return (i, h) => (m(), v("div", qe, [
      h[1] || (h[1] = c("div", { class: "reevit-psp-selector__label" }, "Select payment provider", -1)),
      c("div", Ye, [
        (m(!0), v(V, null, ie(t.providers, (u) => (m(), v("div", {
          key: u.provider,
          class: "reevit-psp-accordion"
        }, [
          c("button", {
            type: "button",
            class: j(
              H(me)(
                "reevit-psp-option",
                t.selectedProvider === u.provider && "reevit-psp-option--selected",
                t.disabled && "reevit-psp-option--disabled"
              )
            ),
            disabled: t.disabled,
            "aria-expanded": t.selectedProvider === u.provider,
            onClick: (s) => o("select", u.provider)
          }, [
            c("span", Je, [
              r[u.provider] ? (m(), v("img", {
                key: 0,
                src: r[u.provider],
                alt: "",
                class: "reevit-psp-option__logo-img",
                loading: "lazy"
              }, null, 8, We)) : (m(), v("span", Qe, I(u.name.slice(0, 1).toUpperCase()), 1))
            ]),
            c("div", Xe, [
              c("span", Ze, I(u.name), 1),
              c("span", et, I(a(d(u.provider, u.methods))), 1)
            ])
          ], 10, Ge),
          t.selectedProvider === u.provider ? (m(), v("div", tt, [
            c("div", ot, [
              ae(ve, {
                methods: d(u.provider, u.methods),
                selected: t.selectedMethod || null,
                provider: u.provider,
                "show-label": !1,
                layout: "list",
                onSelect: h[0] || (h[0] = (s) => o("methodSelect", s))
              }, null, 8, ["methods", "selected", "provider"])
            ]),
            re(i.$slots, "method-content")
          ])) : $("", !0)
        ]))), 128))
      ])
    ]));
  }
}), st = { class: "reevit-form-group" }, rt = ["disabled"], at = { class: "reevit-network-selector" }, it = { class: "reevit-networks-grid" }, lt = ["onClick", "disabled"], ct = {
  key: 0,
  class: "reevit-error-message"
}, dt = { class: "reevit-momo-form__actions" }, ut = ["disabled"], pt = ["disabled"], mt = {
  key: 0,
  class: "reevit-spinner"
}, vt = { key: 1 }, ce = /* @__PURE__ */ ee({
  __name: "MobileMoneyForm",
  props: {
    initialPhone: {},
    loading: { type: Boolean },
    hideCancel: { type: Boolean }
  },
  emits: ["submit", "cancel"],
  setup(t, { emit: e }) {
    const o = t, r = e, l = z(o.initialPhone || ""), a = z(null), d = z(null);
    K(l, (u) => {
      const s = Me(u);
      s && (a.value = s), d.value && (d.value = null);
    });
    const i = () => {
      if (!le(l.value)) {
        d.value = "Please enter a valid phone number";
        return;
      }
      if (!a.value) {
        d.value = "Please select your mobile network";
        return;
      }
      r("submit", {
        phone: l.value,
        network: a.value
      });
    }, h = [
      { id: "mtn", name: "MTN", color: "#FFCC00" },
      { id: "vodafone", name: "Vodafone", color: "#E60000" },
      { id: "airteltigo", name: "AirtelTigo", color: "#005596" }
    ];
    return (u, s) => (m(), v("form", {
      class: "reevit-momo-form",
      onSubmit: ue(i, ["prevent"])
    }, [
      c("div", st, [
        s[2] || (s[2] = c("label", {
          class: "reevit-label",
          for: "reevit-phone"
        }, "Phone Number", -1)),
        ye(c("input", {
          id: "reevit-phone",
          "onUpdate:modelValue": s[0] || (s[0] = (w) => l.value = w),
          type: "tel",
          class: j(["reevit-input", { "reevit-input--error": d.value && !H(le)(l.value) }]),
          placeholder: "e.g. 024 123 4567",
          disabled: t.loading,
          autocomplete: "tel"
        }, null, 10, rt), [
          [be, l.value]
        ])
      ]),
      c("div", at, [
        s[3] || (s[3] = c("label", { class: "reevit-label" }, "Select Network", -1)),
        c("div", it, [
          (m(), v(V, null, ie(h, (w) => c("button", {
            key: w.id,
            type: "button",
            class: j(H(me)("reevit-network-btn", a.value === w.id && "reevit-network-btn--selected")),
            onClick: (N) => a.value = w.id,
            disabled: t.loading
          }, [
            c("div", {
              class: "reevit-network-dot",
              style: Z({ backgroundColor: w.color })
            }, null, 4),
            pe(" " + I(w.name), 1)
          ], 10, lt)), 64))
        ])
      ]),
      d.value ? (m(), v("p", ct, I(d.value), 1)) : $("", !0),
      c("div", dt, [
        t.hideCancel ? $("", !0) : (m(), v("button", {
          key: 0,
          type: "button",
          class: "reevit-btn reevit-btn--secondary",
          onClick: s[1] || (s[1] = (w) => r("cancel")),
          disabled: t.loading
        }, " Back ", 8, ut)),
        c("button", {
          type: "submit",
          class: "reevit-btn reevit-btn--primary",
          disabled: t.loading || !l.value
        }, [
          t.loading ? (m(), v("span", mt)) : (m(), v("span", vt, "Continue"))
        ], 8, pt)
      ]),
      s[4] || (s[4] = c("p", { class: "reevit-secure-text" }, " 🔒 Secure mobile money payment via Reevit ", -1))
    ], 32));
  }
});
class ht {
  constructor(e) {
    this.baseUrl = "https://unified-pay.hubtel.com", this.messageHandler = null, this.stylesInjected = !1, e && (this.baseUrl = e);
  }
  /**
  * Redirects the user to the checkout page with the provided purchase information and configuration.
  * @param purchaseInfo - The purchase information.
  * @param config - The configuration.
  * @throws {Error} If the popup is blocked by the browser.
  */
  redirect({ purchaseInfo: e, config: o }) {
    const r = this.createCheckoutUrl(e, o), l = window.open(r);
    if (!l || l.closed || typeof l.closed > "u")
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
  initIframe({ purchaseInfo: e, callBacks: o, config: r, iframeStyle: l }) {
    var a, d, i;
    this.registerEvents(o);
    const h = document.getElementById("hubtel-checkout-iframe");
    if (!h)
      throw new Error('Container element with id "hubtel-checkout-iframe" not found in the DOM.');
    h.innerHTML = "";
    const u = document.createElement("div");
    u.textContent = "Loading...", h.appendChild(u);
    const s = document.createElement("iframe");
    s.setAttribute("id", "hubtel-iframe-element"), s.src = this.createCheckoutUrl(e, r), s.style.display = "none", s.style.width = (a = l?.width) !== null && a !== void 0 ? a : "100%", s.style.height = (d = l?.height) !== null && d !== void 0 ? d : "100%", s.style.minHeight = l?.minHeight || "400px", s.style.border = (i = l?.border) !== null && i !== void 0 ? i : "none", s.onload = () => {
      var w;
      h.removeChild(u), s.style.display = "block", (w = o.onLoad) === null || w === void 0 || w.call(o);
    }, h.appendChild(s);
  }
  openModal({ purchaseInfo: e, callBacks: o, config: r }) {
    this.injectStyles(), this.createIframe(), this.handleBackButton(), this.registerEvents(o), this.renderWebpageInPopup(this.createCheckoutUrl(e, r), o.onClose, o.onLoad);
  }
  createCheckoutUrl(e, o) {
    const r = Object.assign(Object.assign({}, e), o), l = Object.keys(r).reduce((u, s) => (r[s] !== null && r[s] !== void 0 && (u[s] = r[s]), u), {}), a = Object.keys(l).map((u) => `${u}=${encodeURIComponent(l[u])}`).join("&"), d = this.encodeBase64(a), i = encodeURIComponent(d);
    return `${l?.branding === "disabled" ? `${this.baseUrl}/pay/direct` : `${this.baseUrl}/pay`}?p=${i}`;
  }
  encodeBase64(e) {
    return btoa(unescape(encodeURIComponent(e)));
  }
  handleBackButton() {
    window.addEventListener("popstate", () => {
      this.closePopUp();
    });
  }
  createIframe() {
    const e = document.createElement("div");
    e.setAttribute("id", "backdrop"), e.classList.add("backdrop");
    const o = document.createElement("span");
    o.classList.add("checkout-loader"), e.appendChild(o), document.body.appendChild(e);
  }
  registerEvents(e) {
    this.messageHandler && window.removeEventListener("message", this.messageHandler, !1);
    const o = (r) => {
      var l, a, d, i, h, u;
      if (r.origin !== this.baseUrl)
        return;
      const { data: s } = r;
      if (s.success === !0)
        (l = e.onPaymentSuccess) === null || l === void 0 || l.call(e, s);
      else if (s.success === !1)
        (a = e.onPaymentFailure) === null || a === void 0 || a.call(e, s);
      else if (s.initialized)
        (d = e.init) === null || d === void 0 || d.call(e, s), (i = e.onInit) === null || i === void 0 || i.call(e, s);
      else if (s.feesChanged)
        (h = e.onFeesChanged) === null || h === void 0 || h.call(e, s.fees);
      else if (s.resize) {
        const w = document.getElementById("hubtel-iframe-element");
        w && (w.style.height = s.height + "px"), (u = e?.onResize) === null || u === void 0 || u.call(e, s);
      }
    };
    this.messageHandler = o, window.addEventListener("message", o, !1);
  }
  /**
   * Removes the message event listener to prevent memory leaks.
   * Call this method when you're done with the checkout to clean up resources.
   */
  destroy() {
    this.messageHandler && (window.removeEventListener("message", this.messageHandler, !1), this.messageHandler = null);
  }
  renderWebpageInPopup(e, o, r) {
    const l = document.createElement("div");
    l.classList.add("checkout-modal");
    const a = document.createElement("div");
    a.setAttribute("id", "checkout-close-icon"), a.innerHTML = "&times;", a.classList.add("close-icon"), a.addEventListener("click", () => {
      this.closePopUp(), o?.();
    }), l.appendChild(a);
    const d = document.createElement("iframe");
    d.src = e, history.pushState({ modalOpen: !0 }, ""), d.classList.add("iframe"), l.appendChild(d), document.body.appendChild(l), l.style.opacity = "0", d.addEventListener("load", () => {
      l.style.opacity = "1", r?.();
    });
  }
  closePopUp() {
    const e = document.querySelector(".backdrop"), o = document.querySelector(".checkout-modal");
    e && document.body.removeChild(e), o && document.body.removeChild(o), history.replaceState(null, ""), window.removeEventListener("popstate", this.closePopUp);
  }
  injectStyles() {
    if (this.stylesInjected)
      return;
    const e = document.createElement("style");
    e.type = "text/css", e.setAttribute("data-hubtel-checkout", "true"), e.innerHTML = `
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
    `, document.head.appendChild(e), this.stylesInjected = !0;
  }
}
const de = /* @__PURE__ */ new Map();
function te(t, e) {
  const o = de.get(e);
  if (o) return o;
  const r = new Promise((l, a) => {
    if (document.getElementById(e)) {
      l();
      return;
    }
    const d = document.createElement("script");
    d.id = e, d.src = t, d.async = !0, d.onload = () => l(), d.onerror = () => a(new Error(`Failed to load ${e} script`)), document.head.appendChild(d);
  });
  return de.set(e, r), r;
}
function yt() {
  return te("https://js.paystack.co/v1/inline.js", "paystack-script");
}
function Qt() {
  return Promise.resolve();
}
function bt() {
  return te("https://checkout.flutterwave.com/v3.js", "flutterwave-script");
}
function ft() {
  return te("https://js.stripe.com/v3/", "stripe-script");
}
function _t() {
  return te("https://sdk.monnify.com/plugin/monnify.js", "monnify-script");
}
async function kt(t) {
  if (await yt(), !window.PaystackPop)
    throw new Error("Paystack script not loaded");
  window.PaystackPop.setup({
    key: t.key,
    email: t.email,
    amount: t.amount,
    currency: t.currency,
    ref: t.ref,
    metadata: t.metadata,
    callback: t.onSuccess,
    onClose: t.onClose
  }).openIframe();
}
async function wt(t) {
  const e = new ht(), o = t.preferredMethod === "mobile_money" ? "momo" : t.preferredMethod === "card" ? "card" : void 0, r = {
    amount: t.amount,
    purchaseDescription: t.purchaseDescription,
    customerPhoneNumber: t.customerPhone || "",
    clientReference: `hubtel_${Date.now()}`,
    ...o ? { paymentMethod: o } : {}
  }, l = t.hubtelSessionToken || t.basicAuth || "", a = {
    branding: "enabled",
    callbackUrl: t.callbackUrl || (typeof window < "u" ? window.location.href : ""),
    merchantAccount: typeof t.clientId == "string" ? parseInt(t.clientId, 10) : t.clientId,
    basicAuth: l,
    ...o ? { paymentMethod: o } : {}
  };
  e.openModal({
    purchaseInfo: r,
    config: a,
    callBacks: {
      onPaymentSuccess: (d) => {
        t.onSuccess(d), e.closePopUp();
      },
      onPaymentFailure: () => {
        t.onClose();
      },
      onClose: () => {
        t.onClose();
      }
    }
  });
}
async function gt(t) {
  if (await bt(), !window.FlutterwaveCheckout)
    throw new Error("Flutterwave script not loaded");
  window.FlutterwaveCheckout({
    public_key: t.public_key,
    tx_ref: t.tx_ref,
    amount: t.amount,
    currency: t.currency,
    customer: t.customer,
    payment_options: t.payment_options,
    customizations: t.customizations,
    callback: t.callback,
    onclose: t.onclose
  });
}
async function Ct(t) {
  if (await ft(), !window.Stripe)
    throw new Error("Stripe.js not loaded");
  return window.Stripe(t);
}
async function Xt(t) {
  const o = await (await Ct(t.publishableKey)).confirmPayment({
    elements: t.elements,
    clientSecret: t.clientSecret,
    redirect: "if_required"
  });
  o.error ? t.onError({ message: o.error.message || "Payment failed" }) : o.paymentIntent && t.onSuccess({
    paymentIntentId: o.paymentIntent.id,
    status: o.paymentIntent.status
  });
}
async function Pt(t) {
  if (await _t(), !window.MonnifySDK)
    throw new Error("Monnify SDK not loaded");
  window.MonnifySDK.initialize({
    amount: t.amount,
    currency: t.currency,
    reference: t.reference,
    customerName: t.customerName,
    customerEmail: t.customerEmail,
    customerMobileNumber: t.customerPhone,
    apiKey: t.apiKey,
    contractCode: t.contractCode,
    paymentDescription: t.paymentDescription || "Payment",
    isTestMode: t.isTestMode ?? !1,
    metadata: t.metadata,
    onComplete: (e) => {
      e.status === "SUCCESS" ? t.onSuccess({
        transactionReference: e.transactionReference,
        paymentReference: e.paymentReference,
        ...e
      }) : t.onError?.({ message: e.message || "Payment failed" });
    },
    onClose: t.onClose
  });
}
async function St(t, e) {
  t.onInitiated();
  try {
    const o = await fetch(e, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: t.phoneNumber,
        amount: t.amount,
        reference: t.reference,
        description: t.description
      })
    });
    if (!o.ok) {
      const a = (await o.json().catch(() => ({}))).message || "Failed to initiate M-Pesa payment";
      return t.onError({ message: a }), { status: "failed", message: a };
    }
    const r = await o.json();
    return {
      status: "initiated",
      message: "Please check your phone and enter your M-Pesa PIN to complete the payment.",
      transactionId: r.checkout_request_id || r.transaction_id
    };
  } catch (o) {
    const r = o instanceof Error ? o.message : "Network error";
    return t.onError({ message: r }), { status: "failed", message: r };
  }
}
const Mt = ["disabled"], It = {
  key: 0,
  class: "reevit-spinner"
}, Et = { class: "reevit-modal-header" }, Rt = { class: "reevit-modal__branding" }, $t = ["src", "alt"], xt = {
  key: 0,
  class: "reevit-modal__brand-name"
}, Tt = { class: "reevit-modal-body" }, Lt = {
  key: 0,
  class: "reevit-loading-state"
}, Nt = {
  key: 1,
  class: "reevit-error-state"
}, Ut = {
  key: 2,
  class: "reevit-success-state"
}, Ft = {
  key: 3,
  class: "reevit-method-step reevit-animate-slide-up"
}, Ot = {
  key: 0,
  class: "reevit-inline-action reevit-animate-fade-in"
}, At = ["disabled"], Dt = {
  key: 1,
  class: "reevit-inline-action reevit-animate-fade-in"
}, Kt = { class: "reevit-inline-action__hint" }, zt = ["disabled"], jt = {
  key: 0,
  class: "reevit-method-step__actions reevit-animate-slide-up"
}, Bt = { key: 0 }, Ht = {
  key: 1,
  class: "reevit-card-info reevit-animate-fade-in"
}, Vt = { class: "reevit-info-text" }, qt = ["disabled"], Yt = {
  key: 0,
  class: "reevit-spinner"
}, Gt = { key: 1 }, Zt = /* @__PURE__ */ ee({
  __name: "ReevitCheckout",
  props: {
    publicKey: {},
    amount: {},
    currency: {},
    email: {},
    phone: {},
    customerName: {},
    reference: {},
    metadata: {},
    customFields: {},
    paymentLinkCode: {},
    paymentMethods: {},
    theme: {},
    isOpen: { type: Boolean },
    apiBaseUrl: {},
    initialPaymentIntent: {}
  },
  emits: ["success", "error", "close"],
  setup(t, { emit: e }) {
    const o = t, r = e, {
      status: l,
      paymentIntent: a,
      selectedMethod: d,
      error: i,
      isLoading: h,
      isReady: u,
      initialize: s,
      selectMethod: w,
      handlePspSuccess: N,
      handlePspError: x,
      close: oe,
      reset: G
    } = Fe({
      config: {
        publicKey: o.publicKey,
        amount: o.amount,
        currency: o.currency,
        email: o.email,
        phone: o.phone,
        customerName: o.customerName,
        reference: o.reference,
        metadata: o.metadata,
        customFields: o.customFields,
        paymentLinkCode: o.paymentLinkCode,
        paymentMethods: o.paymentMethods,
        initialPaymentIntent: o.initialPaymentIntent
      },
      apiBaseUrl: o.apiBaseUrl,
      onSuccess: (p) => r("success", p),
      onError: (p) => r("error", p),
      onClose: () => r("close")
    }), U = z(o.isOpen ?? !1), S = z(null), q = {
      hubtel: "Hubtel",
      paystack: "Paystack",
      flutterwave: "Flutterwave",
      monnify: "Monnify",
      mpesa: "M-Pesa",
      stripe: "Stripe"
    };
    K(() => o.isOpen, (p) => {
      p !== void 0 && (U.value = p);
    });
    const J = () => {
      U.value = !0, S.value = null, !a.value && l.value === "idle" && s();
    };
    K([U, a, d], ([p, n, b]) => {
      if (p && n && b) {
        const f = (S.value || n.recommendedPsp || "paystack").toLowerCase().includes("mpesa");
        (b === "card" || b === "mobile_money" && (!f || o.phone)) && y(null);
      }
    });
    const Y = () => {
      U.value = !1, oe(), S.value = null;
    }, F = k(
      () => o.paymentMethods?.length ? o.paymentMethods : ["card", "mobile_money"]
    ), O = k(() => {
      const p = a.value;
      if (!p) return [];
      const n = new Set(F.value), b = (p.availableProviders || []).map((f) => {
        const D = f.provider.toLowerCase().includes("hubtel") ? f.methods.filter((B) => B === "card" || B === "mobile_money") : f.methods;
        return {
          ...f,
          methods: D.filter((B) => n.has(B))
        };
      }).filter((f) => f.methods.length > 0);
      if (b.length > 0)
        return b;
      const C = p.recommendedPsp.toLowerCase().includes("hubtel") ? F.value.filter((f) => f === "card" || f === "mobile_money") : F.value;
      return [
        {
          provider: p.recommendedPsp,
          name: q[p.recommendedPsp] || p.recommendedPsp,
          methods: C
        }
      ];
    }), P = k(() => {
      const p = a.value;
      return S.value || p?.recommendedPsp || "paystack";
    }), W = k(() => {
      const p = O.value.find(
        (n) => n.provider === P.value
      );
      return p?.methods.length ? p.methods : F.value;
    });
    K(
      () => O.value,
      (p) => {
        p.length && (S.value && p.some((n) => n.provider === S.value) || (p.length === 1 ? S.value = p[0].provider : S.value = null));
      },
      { immediate: !0 }
    ), K([W, d], ([p, n]) => {
      !n || p.length === 0 || p.includes(n) || w(p[0]);
    });
    const ne = (p) => {
      if (p === S.value) {
        S.value = null, G();
        return;
      }
      const n = O.value.find((f) => f.provider === p), b = n?.methods.length ? n.methods : F.value, C = d.value && b.includes(d.value) ? d.value : b[0];
      S.value = p, G(), s(C, { preferredProvider: p, allowedProviders: [p] });
    }, Q = (p) => {
      w(p);
    }, y = async (p) => {
      const n = a.value;
      if (!n) return;
      const b = P.value;
      try {
        if (b === "paystack")
          await kt({
            key: n.pspPublicKey || o.publicKey || "",
            email: o.email || "",
            amount: o.amount,
            currency: o.currency,
            ref: n.id,
            onSuccess: (C) => N(C),
            onClose: () => {
            }
          });
        else if (b === "hubtel") {
          const C = Ie({ publicKey: o.publicKey, baseUrl: o.apiBaseUrl }), { data: f, error: D } = await C.createHubtelSession(
            n.id,
            n.clientSecret
          );
          if (D || !f?.basicAuth) {
            x({
              code: D?.code || "hubtel_session_error",
              message: D?.message || "Failed to create Hubtel session"
            });
            return;
          }
          const B = M.value === "card" || M.value === "mobile_money" ? M.value : void 0;
          await wt({
            clientId: f.merchantAccount || n.pspCredentials?.merchantAccount || o.publicKey || "",
            purchaseDescription: `Payment for ${o.amount} ${o.currency}`,
            amount: o.amount,
            customerPhone: p?.phone || o.phone,
            customerEmail: o.email,
            basicAuth: f.basicAuth,
            preferredMethod: B,
            onSuccess: (he) => N(he),
            onClose: () => {
            }
          });
        } else if (b === "flutterwave")
          await gt({
            public_key: n.pspPublicKey || o.publicKey || "",
            tx_ref: n.id,
            amount: o.amount,
            currency: o.currency,
            customer: {
              email: o.email || "",
              phone_number: p?.phone || o.phone
            },
            callback: (C) => N(C),
            onclose: () => {
            }
          });
        else if (b === "monnify") {
          const C = n.pspPublicKey || o.publicKey || "", f = o.metadata?.contract_code || o.publicKey || "";
          if (!C || !f) {
            x({
              code: "MONNIFY_CONFIG_MISSING",
              message: "Monnify configuration is missing. Please check your API key and contract code."
            });
            return;
          }
          await Pt({
            apiKey: C,
            contractCode: f,
            amount: o.amount,
            currency: o.currency,
            reference: n.reference || n.id,
            customerName: o.metadata?.customer_name || o.email || "",
            customerEmail: o.email || "",
            customerPhone: p?.phone || o.phone,
            metadata: o.metadata,
            onSuccess: (D) => N(D),
            onClose: () => {
            }
          });
        } else if (b === "mpesa") {
          const C = `${o.apiBaseUrl || "https://api.reevit.io"}/v1/payments/${n.id}/mpesa`;
          await St({
            phoneNumber: p?.phone || o.phone || "",
            amount: o.amount,
            reference: n.reference || n.id,
            description: `Payment ${n.reference || ""}`,
            onInitiated: () => {
            },
            onSuccess: (f) => N(f),
            onError: (f) => x({ code: "MPESA_ERROR", message: f.message })
          }, C);
        } else x(b === "stripe" ? {
          code: "STRIPE_NOT_IMPLEMENTED",
          message: "Stripe integration requires custom Elements setup. Please use the React SDK or implement custom Stripe Elements."
        } : {
          code: "UNSUPPORTED_PSP",
          message: `Payment provider "${b}" is not supported in this checkout.`
        });
      } catch (C) {
        x({
          code: "BRIDGE_ERROR",
          message: C instanceof Error ? C.message : "Failed to open payment gateway"
        });
      }
    }, g = k(() => ({
      ...a.value?.branding || {},
      ...o.theme || {}
    })), R = k(() => Ee(g.value)), E = k(() => g.value?.darkMode);
    K(U, (p) => {
      p ? document.body.style.overflow = "hidden" : document.body.style.overflow = "";
    }), fe(() => {
      document.body.style.overflow = "";
    });
    const _ = k(() => l.value), X = k(() => i.value), M = k(() => d.value), T = k(() => h.value), A = k(() => u.value);
    return (p, n) => (m(), v("div", {
      class: "reevit-sdk-container",
      style: Z(R.value)
    }, [
      re(p.$slots, "default", {
        open: J,
        isLoading: T.value
      }, () => [
        c("button", {
          type: "button",
          class: "reevit-pay-button",
          onClick: J,
          disabled: T.value
        }, [
          T.value ? (m(), v("span", It)) : re(p.$slots, "button-text", { key: 1 }, () => [
            n[5] || (n[5] = pe("Pay Now", -1))
          ])
        ], 8, Mt)
      ]),
      (m(), se(_e, { to: "body" }, [
        U.value ? (m(), v("div", {
          key: 0,
          class: "reevit-modal-overlay",
          onClick: ue(Y, ["self"])
        }, [
          c("div", {
            class: j(["reevit-modal-content", { "reevit-modal--dark": E.value }]),
            style: Z(R.value)
          }, [
            c("button", {
              class: "reevit-modal-close",
              onClick: Y,
              "aria-label": "Close"
            }, " × "),
            c("div", Et, [
              c("div", Rt, [
                c("img", {
                  src: g.value.logoUrl || "https://i.imgur.com/bzUR5Lm.png",
                  alt: g.value.companyName || "Reevit",
                  class: "reevit-modal__logo"
                }, null, 8, $t),
                g.value.companyName ? (m(), v("span", xt, I(g.value.companyName), 1)) : $("", !0)
              ])
            ]),
            c("div", Tt, [
              _.value === "loading" ? (m(), v("div", Lt, [...n[6] || (n[6] = [
                c("div", { class: "reevit-spinner reevit-spinner--large" }, null, -1),
                c("p", null, "Initializing payment...", -1)
              ])])) : _.value === "failed" && X.value ? (m(), v("div", Nt, [
                n[7] || (n[7] = c("div", { class: "reevit-error-icon" }, "⚠️", -1)),
                n[8] || (n[8] = c("h3", null, "Payment Failed", -1)),
                c("p", null, I(X.value.message), 1),
                c("button", {
                  class: "reevit-retry-btn",
                  onClick: n[0] || (n[0] = (b) => H(s)())
                }, "Retry")
              ])) : _.value === "success" ? (m(), v("div", Ut, [
                n[9] || (n[9] = c("div", { class: "reevit-success-icon" }, "✅", -1)),
                n[10] || (n[10] = c("h3", null, "Payment Successful", -1)),
                n[11] || (n[11] = c("p", null, "Thank you for your payment.", -1)),
                c("button", {
                  class: "reevit-done-btn",
                  onClick: Y
                }, "Done")
              ])) : A.value ? (m(), v("div", Ft, [
                O.value.length > 1 ? (m(), se(nt, {
                  key: 0,
                  providers: O.value,
                  "selected-provider": S.value,
                  disabled: T.value,
                  theme: g.value,
                  "selected-method": M.value,
                  onSelect: ne,
                  onMethodSelect: Q
                }, {
                  "method-content": ke(() => [
                    M.value === "card" ? (m(), v("div", Ot, [
                      n[12] || (n[12] = c("p", { class: "reevit-inline-action__hint" }, " You'll be redirected to complete your card payment securely. ", -1)),
                      c("button", {
                        class: "reevit-btn reevit-btn--primary",
                        onClick: n[1] || (n[1] = (b) => y(null)),
                        disabled: _.value === "processing"
                      }, " Pay with Card ", 8, At)
                    ])) : M.value === "mobile_money" ? (m(), v("div", Dt, [
                      P.value.includes("mpesa") && !o.phone ? (m(), se(ce, {
                        key: 0,
                        "initial-phone": o.phone,
                        loading: _.value === "processing",
                        "hide-cancel": "",
                        onSubmit: y
                      }, null, 8, ["initial-phone", "loading"])) : (m(), v(V, { key: 1 }, [
                        c("p", Kt, I(P.value.includes("hubtel") ? "Opens the Hubtel checkout with Mobile Money selected." : `Continue to pay securely with Mobile Money via ${q[P.value] || P.value}.`), 1),
                        c("button", {
                          class: "reevit-btn reevit-btn--primary",
                          onClick: n[2] || (n[2] = (b) => y(null)),
                          disabled: _.value === "processing"
                        }, I(P.value.includes("hubtel") ? "Continue with Hubtel" : "Pay with Mobile Money"), 9, zt)
                      ], 64))
                    ])) : $("", !0)
                  ]),
                  _: 1
                }, 8, ["providers", "selected-provider", "disabled", "theme", "selected-method"])) : (m(), v(V, { key: 1 }, [
                  ae(ve, {
                    methods: W.value,
                    selected: M.value,
                    provider: P.value,
                    "show-label": !1,
                    layout: "grid",
                    onSelect: Q
                  }, null, 8, ["methods", "selected", "provider"]),
                  M.value ? (m(), v("div", jt, [
                    M.value === "mobile_money" && P.value.includes("mpesa") && !o.phone ? (m(), v("div", Bt, [
                      ae(ce, {
                        "initial-phone": o.phone,
                        loading: _.value === "processing",
                        onSubmit: y,
                        onCancel: n[3] || (n[3] = (b) => H(w)(null))
                      }, null, 8, ["initial-phone", "loading"])
                    ])) : (m(), v("div", Ht, [
                      c("p", Vt, I(M.value === "card" ? "You will be redirected to complete your card payment securely." : P.value.includes("hubtel") ? "Opens the Hubtel checkout with Mobile Money selected." : `Continue to pay securely via ${q[P.value] || P.value}.`), 1),
                      c("button", {
                        class: "reevit-submit-btn",
                        onClick: n[4] || (n[4] = (b) => y(null)),
                        disabled: _.value === "processing"
                      }, [
                        _.value === "processing" ? (m(), v("span", Yt)) : (m(), v("span", Gt, I(M.value === "card" ? "Pay with Card" : P.value.includes("hubtel") ? "Continue with Hubtel" : "Pay with Mobile Money"), 1))
                      ], 8, qt)
                    ]))
                  ])) : $("", !0)
                ], 64))
              ])) : $("", !0)
            ]),
            n[13] || (n[13] = c("div", { class: "reevit-modal-footer" }, [
              c("div", { class: "reevit-trust-badges" }, [
                c("span", null, "PCI DSS Compliant"),
                c("span", null, "•"),
                c("span", null, "SSL Secure")
              ])
            ], -1))
          ], 6)
        ])) : $("", !0)
      ]))
    ], 4));
  }
});
export {
  ce as MobileMoneyForm,
  ve as PaymentMethodSelector,
  nt as ProviderSelector,
  oo as ReevitAPIClient,
  Zt as ReevitCheckout,
  no as cn,
  Xt as confirmStripePayment,
  so as createReevitClient,
  Ct as createStripeInstance,
  ro as detectCountryFromCurrency,
  ao as detectNetwork,
  io as formatAmount,
  lo as formatPhone,
  St as initiateMPesaSTKPush,
  bt as loadFlutterwaveScript,
  Qt as loadHubtelScript,
  _t as loadMonnifyScript,
  yt as loadPaystackScript,
  ft as loadStripeScript,
  gt as openFlutterwaveModal,
  wt as openHubtelPopup,
  Pt as openMonnifyModal,
  kt as openPaystackPopup,
  Fe as useReevit,
  co as validatePhone
};
