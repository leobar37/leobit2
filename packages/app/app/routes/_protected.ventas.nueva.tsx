import { Outlet } from "react-router";
import { NewSaleProvider } from "~/components/sales/new-sale";

export default function NewSaleLayout() {
  return (
    <NewSaleProvider>
      <Outlet />
    </NewSaleProvider>
  );
}
