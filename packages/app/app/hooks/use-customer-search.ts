import { useDeferredValue, useMemo, useState, useCallback, type UIEvent } from "react";
import { useCustomers } from "~/hooks/use-customers-live";
import { useCreateCustomer } from "~/hooks/use-customers";
import { useToastError } from "~/hooks/use-toast-error";
import type { Customer } from "~/lib/db/schema";

export interface UseCustomerSearchOptions {
  onSelectCustomer: (customer: Customer | null) => void;
}

export interface UseCustomerSearchReturn {
  isOpen: boolean;
  isCreateDrawerOpen: boolean;
  search: string;
  visibleCount: number;
  showCreateForm: boolean;
  newCustomerName: string;
  newCustomerPhone: string;
  filteredCustomers: Customer[];
  displayedCustomers: Customer[];
  hasMore: boolean;
  isValidName: boolean;
  isLoading: boolean;
  isCreating: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  openCreateDrawer: () => void;
  closeCreateDrawer: () => void;
  handleSearchChange: (value: string) => void;
  handleListScroll: (event: UIEvent<HTMLDivElement>) => void;
  handleSelectCustomer: (customer: Customer) => void;
  handleCreateCustomer: () => Promise<void>;
  setShowCreateForm: (show: boolean) => void;
  setNewCustomerName: (name: string) => void;
  setNewCustomerPhone: (phone: string) => void;
  setIsOpen: (open: boolean) => void;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
}

export function useCustomerSearch({
  onSelectCustomer,
}: UseCustomerSearchOptions): UseCustomerSearchReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const { data: customers, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const { showError, showSuccess } = useToastError();
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filteredCustomers = useMemo(() => {
    const customerList = customers ?? [];

    if (!deferredSearch) {
      return customerList;
    }

    return customerList.filter(
      (customer) =>
        customer.name.toLowerCase().includes(deferredSearch) ||
        customer.dni?.toLowerCase().includes(deferredSearch) ||
        customer.phone?.toLowerCase().includes(deferredSearch)
    );
  }, [customers, deferredSearch]);

  const displayedCustomers = filteredCustomers.slice(0, visibleCount);
  const hasMore = filteredCustomers.length > displayedCustomers.length;
  const isValidName = newCustomerName.trim().length >= 2;

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    setVisibleCount(50);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setVisibleCount(50);
    setShowCreateForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setIsCreateDrawerOpen(false);
  }, []);

  const openCreateDrawer = useCallback(() => {
    setIsCreateDrawerOpen(true);
  }, []);

  const closeCreateDrawer = useCallback(() => {
    setIsCreateDrawerOpen(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setVisibleCount(50);
  }, []);

  const handleListScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const container = event.currentTarget;
      const reachedBottom =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 80;

      if (reachedBottom && hasMore) {
        setVisibleCount((current) => current + 50);
      }
    },
    [hasMore]
  );

  const handleSelectCustomer = useCallback(
    (customer: Customer) => {
      onSelectCustomer(customer);
      closeDrawer();
    },
    [onSelectCustomer, closeDrawer]
  );

  const handleCreateCustomer = useCallback(async () => {
    if (!newCustomerName.trim() || newCustomerName.trim().length < 2) return;

    try {
      const newCustomer = await createCustomer.mutateAsync({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });

      showSuccess("Cliente creado correctamente");
      onSelectCustomer(newCustomer as unknown as Customer);
      closeDrawer();
      closeCreateDrawer();
    } catch (error) {
      showError("Error al crear cliente", error);
    }
  }, [newCustomerName, newCustomerPhone, createCustomer, onSelectCustomer, closeDrawer, closeCreateDrawer, showError, showSuccess]);

  return {
    isOpen,
    isCreateDrawerOpen,
    search,
    visibleCount,
    showCreateForm,
    newCustomerName,
    newCustomerPhone,
    filteredCustomers,
    displayedCustomers,
    hasMore,
    isValidName,
    isLoading,
    isCreating: createCustomer.isPending,
    openDrawer,
    closeDrawer,
    openCreateDrawer,
    closeCreateDrawer,
    handleSearchChange,
    handleListScroll,
    handleSelectCustomer,
    handleCreateCustomer,
    setShowCreateForm,
    setNewCustomerName,
    setNewCustomerPhone,
    setIsOpen,
    setVisibleCount,
  };
}
