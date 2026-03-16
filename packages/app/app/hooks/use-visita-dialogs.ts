import { useState, useCallback } from "react";
import { createModal } from "~/hooks/use-modal";
import type { Visita } from "~/hooks/use-visitas";

const useSelectionModal = createModal<void>();
const usePurchaseModal = createModal<Visita>();
const useNoPurchaseModal = createModal<Visita>();

export type SelectionMode = "individual" | "group";

export interface VisitaDialogsState {
  selectionModal: ReturnType<typeof useSelectionModal>;
  selectionMode: SelectionMode;
  setSelectionMode: (mode: SelectionMode) => void;
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  isCreating: boolean;
  setIsCreating: (creating: boolean) => void;
  resetSelectionState: () => void;

  purchaseModal: ReturnType<typeof usePurchaseModal>;
  isUpdatingPurchase: boolean;
  setIsUpdatingPurchase: (updating: boolean) => void;

  noPurchaseModal: ReturnType<typeof useNoPurchaseModal>;
  selectedReason: string;
  setSelectedReason: (reason: string) => void;
  customReason: string;
  setCustomReason: (reason: string) => void;
  isUpdatingNoPurchase: boolean;
  setIsUpdatingNoPurchase: (updating: boolean) => void;
  resetNoPurchaseState: () => void;
}

export function useVisitaDialogs(): VisitaDialogsState {
  const selectionModal = useSelectionModal();
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("individual");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const purchaseModal = usePurchaseModal();
  const [isUpdatingPurchase, setIsUpdatingPurchase] = useState(false);

  const noPurchaseModal = useNoPurchaseModal();
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [isUpdatingNoPurchase, setIsUpdatingNoPurchase] = useState(false);

  const resetSelectionState = useCallback(() => {
    setSelectionMode("individual");
    setSelectedCustomerId("");
    setSelectedGroupId("");
    setIsCreating(false);
  }, []);

  const resetNoPurchaseState = useCallback(() => {
    setSelectedReason("");
    setCustomReason("");
    setIsUpdatingNoPurchase(false);
  }, []);

  return {
    selectionModal,
    selectionMode,
    setSelectionMode,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedGroupId,
    setSelectedGroupId,
    isCreating,
    setIsCreating,
    resetSelectionState,

    purchaseModal,
    isUpdatingPurchase,
    setIsUpdatingPurchase,

    noPurchaseModal,
    selectedReason,
    setSelectedReason,
    customReason,
    setCustomReason,
    isUpdatingNoPurchase,
    setIsUpdatingNoPurchase,
    resetNoPurchaseState,
  };
}
