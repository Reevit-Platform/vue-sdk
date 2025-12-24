import { PaymentMethod } from '../../../core/dist/index.d.ts';
type __VLS_Props = {
    methods: PaymentMethod[];
    selected: PaymentMethod | null;
    amount: number;
    currency: string;
};
declare const _default: import('vue').DefineComponent<__VLS_Props, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {} & {
    select: (method: PaymentMethod) => any;
}, string, import('vue').PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSelect?: ((method: PaymentMethod) => any) | undefined;
}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {}, HTMLDivElement>;
export default _default;
//# sourceMappingURL=PaymentMethodSelector.vue.d.ts.map