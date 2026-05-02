import { Outlet } from "react-router";
import { NewSaleProvider } from "~/components/sales/new-sale-context";
import { SaleCalculatorProvider } from "~/components/sales/calculator/sale-calculator-context";

export default function SaleEditorLayout() {
  return (
    <NewSaleProvider>
      <SaleCalculatorProvider>
        <Outlet />
      </SaleCalculatorProvider>
    </NewSaleProvider>
  );
}
