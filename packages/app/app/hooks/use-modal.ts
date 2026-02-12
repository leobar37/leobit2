import { atom, useAtom } from "jotai";
import { useCallback } from "react";

interface ModalState<T = unknown> {
  isOpen: boolean;
  data: T | null;
}

export function createModal<T = unknown>() {
  const modalAtom = atom<ModalState<T>>({
    isOpen: false,
    data: null,
  });

  const useModal = () => {
    const [state, setState] = useAtom(modalAtom);

    const open = useCallback(
      (data?: T) => {
        setState({ isOpen: true, data: data ?? null });
      },
      [setState]
    );

    const close = useCallback(() => {
      setState({ isOpen: false, data: null });
    }, [setState]);

    const toggle = useCallback(() => {
      setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
    }, [setState]);

    return {
      isOpen: state.isOpen,
      data: state.data,
      open,
      close,
      toggle,
    };
  };

  return useModal;
}

export type ModalHook<T> = ReturnType<typeof createModal<T>>;
