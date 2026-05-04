# T-002: FormPaymentCapture RHF Component

## Objective
Create the RHF-integrated field component and the core payment capture organism that manages server state via TanStack Query.

## Files to Create

### 1. `hooks/use-payments.ts` (Additions)

```typescript
export interface CreatePaymentDraftInput {
  customerId?: string;
  relatedSaleId?: string;
  status?: "draft";
}

export function useCreatePaymentDraft() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (input: CreatePaymentDraftInput = {}): Promise<Abono> => {
      const response = await api.payments.post({
        ...input,
        status: "draft",
        amount: "0",
        paymentMethod: "efectivo",
      });
      return extractData<Abono>(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.payments.detail(data.id), data);
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<Abono>;
    }): Promise<Abono> => {
      const response = await api.payments({ id }).patch(input);
      return extractData<Abono>(response);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.detail(variables.id),
      });
    },
  });
}
```

### 2. `components/payments/payment-capture.tsx`

```typescript
interface PaymentCaptureProps {
  paymentId?: string;
  onPaymentIdChange?: (id: string) => void;
  paymentConfig?: PaymentMethodsConfig;
  enabledMethods?: string[];
  requireProofForWallets?: boolean;
}

export function PaymentCapture({
  paymentId,
  onPaymentIdChange,
  ...config
}: PaymentCaptureProps) {
  const { data: payment } = usePayment(paymentId || "");
  const createDraft = useCreatePaymentDraft();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = async () => {
    if (!paymentId) {
      const draft = await createDraft.mutateAsync();
      onPaymentIdChange?.(draft.id);
    }
    setDrawerOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        className="w-full shell-card-flat rounded-2xl p-4 text-left"
      >
        {payment ? (
          <PaymentSummary payment={payment} />
        ) : (
          <span className="text-muted-foreground">Seleccionar método de pago</span>
        )}
      </button>

      <PaymentCaptureDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        payment={payment}
        {...config}
      />
    </>
  );
}
```

### 3. `components/payments/form-payment-capture.tsx`

```typescript
interface FormPaymentCaptureProps {
  name: string;
  label?: string;
  paymentConfig?: PaymentMethodsConfig;
  enabledMethods?: string[];
  requireProofForWallets?: boolean;
}

export function FormPaymentCapture(props: FormPaymentCaptureProps) {
  const wrapperForm = useWrapperFormContext();
  const control = wrapperForm?.control;
  const { field } = useController({
    name: props.name,
    control,
  });

  return (
    <PaymentCapture
      paymentId={field.value}
      onPaymentIdChange={(id) => field.onChange(id)}
      {...props}
    />
  );
}
```

## Acceptance Criteria
- [ ] `FormPaymentCapture` accepts only `name` prop (plus optional config)
- [ ] Creates draft payment automatically when opened without ID
- [ ] Stores paymentId in RHF field
- [ ] Uses TanStack Query for payment state
- [ ] No local state for payment details
