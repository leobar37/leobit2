import { useMemo, type ReactNode } from "react";
import { Provider, createStore } from "jotai";

interface NewSaleProviderProps {
  children: ReactNode;
}

export function NewSaleProvider({ children }: NewSaleProviderProps) {
  const store = useMemo(() => createStore(), []);

  return (
    <Provider store={store}>
      {children}
    </Provider>
  );
}
