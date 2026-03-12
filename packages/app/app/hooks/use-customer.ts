import { useMemo } from "react";
import { useCustomers } from "./use-customers";

export function useCustomer(id: string | undefined) {
  const result = useCustomers();

  const customer = useMemo(
    () => result.data?.find((item) => item.id === id) ?? null,
    [id, result.data]
  );

  return {
    ...result,
    data: customer,
  };
}
