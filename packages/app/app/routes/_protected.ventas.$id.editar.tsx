import { Outlet } from "react-router";
import { NewSaleProvider } from "~/components/sales/new-sale-context";

export default function SaleEditorLayout() {
  return (
    <NewSaleProvider>
      <Outlet />
    </NewSaleProvider>
  );
}
