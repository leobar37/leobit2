import { Outlet } from "react-router";
import { PurchaseFormProvider } from "~/components/purchases/purchase-form-context";

export default function CompraEditorLayout() {
  return (
    <PurchaseFormProvider>
      <Outlet />
    </PurchaseFormProvider>
  );
}
