import { ReevitTheme } from '../../../core/dist/index.d.ts';
type __VLS_Props = {
    publicKey: string;
    amount: number;
    currency: string;
    email?: string;
    phone?: string;
    reference?: string;
    metadata?: Record<string, unknown>;
    paymentMethods?: ('card' | 'mobile_money' | 'bank_transfer')[];
    theme?: ReevitTheme;
    isOpen?: boolean;
};
declare function __VLS_template(): {
    attrs: Partial<{}>;
    slots: {
        default?(_: {
            open: () => void;
            isLoading: boolean;
        }): any;
        'button-text'?(_: {}): any;
    };
    refs: {};
    rootEl: HTMLDivElement;
};
type __VLS_TemplateResult = ReturnType<typeof __VLS_template>;
declare const __VLS_component: import('vue').DefineComponent<__VLS_Props, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {} & {
    success: (result: any) => any;
    error: (error: any) => any;
    close: () => any;
}, string, import('vue').PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSuccess?: ((result: any) => any) | undefined;
    onError?: ((error: any) => any) | undefined;
    onClose?: (() => any) | undefined;
}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {}, HTMLDivElement>;
declare const _default: __VLS_WithTemplateSlots<typeof __VLS_component, __VLS_TemplateResult["slots"]>;
export default _default;
type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
//# sourceMappingURL=ReevitCheckout.vue.d.ts.map