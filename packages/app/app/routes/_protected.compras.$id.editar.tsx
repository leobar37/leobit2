import { Outlet } from "react-router";
import { PurchaseEditProvider } from "~/components/purchases/purchase-edit-context";

export default function CompraEditorLayout() {
  return (
    <PurchaseEditProvider>
      <Outlet />
    </PurchaseEditProvider>
  );
}
