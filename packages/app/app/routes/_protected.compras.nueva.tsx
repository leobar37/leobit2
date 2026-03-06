import { Outlet } from "react-router";
import { PurchaseFormProvider } from "~/components/purchases/purchase-form-context";

export default function NuevaCompraLayout() {
  return (
    <PurchaseFormProvider>
      <Outlet />
    </PurchaseFormProvider>
  );
}
