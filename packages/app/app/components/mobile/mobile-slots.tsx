import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const MOBILE_SLOT_NAMES = [
  "header:left",
  "header:center",
  "header:right",
  "footer",
  "floating",
  "bottom-nav",
] as const;

const SINGLE_WRITER_SLOT_NAMES = new Set<MobileSlotName>([
  "header:left",
  "header:center",
  "header:right",
  "footer",
  "bottom-nav",
]);

const IS_DEV = import.meta.env.DEV;

export type MobileSlotName = (typeof MOBILE_SLOT_NAMES)[number];

export interface MobileSlotEntry {
  id: string;
  name: MobileSlotName;
  content: ReactNode;
  priority: number;
  order: number;
  isSingleWriter: boolean;
}

interface MobileSlotRegistry {
  slots: Record<MobileSlotName, MobileSlotEntry[]>;
  targets: Record<MobileSlotName, Record<string, HTMLDivElement | null>>;
}

interface MobileSlotContextValue {
  registerSlot: (entry: Omit<MobileSlotEntry, "order">) => void;
  unregisterSlot: (name: MobileSlotName, id: string) => void;
  registerTarget: (
    name: MobileSlotName,
    id: string,
    target: HTMLDivElement | null,
  ) => void;
  unregisterTarget: (name: MobileSlotName, id: string) => void;
  getEntries: (name: MobileSlotName) => MobileSlotEntry[];
  getActiveEntries: (name: MobileSlotName) => MobileSlotEntry[];
  getTarget: (name: MobileSlotName, id: string) => HTMLDivElement | null;
}

interface MobileSlotProviderProps {
  children: ReactNode;
}

interface MobileSlotHostProps extends HTMLAttributes<HTMLDivElement> {
  name: MobileSlotName;
}

interface MobileSlotProps {
  name: MobileSlotName;
  children: ReactNode;
  priority?: number;
}

const MobileSlotContext = createContext<MobileSlotContextValue | null>(null);

function createEmptyRegistry(): MobileSlotRegistry {
  return {
    slots: {
      "header:left": [],
      "header:center": [],
      "header:right": [],
      footer: [],
      floating: [],
      "bottom-nav": [],
    },
    targets: {
      "header:left": {},
      "header:center": {},
      "header:right": {},
      footer: {},
      floating: {},
      "bottom-nav": {},
    },
  };
}

function isSingleWriterSlot(name: MobileSlotName) {
  return SINGLE_WRITER_SLOT_NAMES.has(name);
}

function sortEntries(entries: MobileSlotEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.order - right.order;
  });
}

function getActiveEntriesForSlot(entries: MobileSlotEntry[]) {
  const sortedEntries = sortEntries(entries);
  const lastEntry = sortedEntries.at(-1);

  if (!lastEntry) {
    return [];
  }

  if (lastEntry.isSingleWriter) {
    return [lastEntry];
  }

  return sortedEntries;
}

export function MobileSlotProvider({ children }: MobileSlotProviderProps) {
  const [registry, setRegistry] = useState<MobileSlotRegistry>(createEmptyRegistry);
  const nextOrderRef = useRef(0);

  const registerSlot = useCallback(
    (entry: Omit<MobileSlotEntry, "order">) => {
      setRegistry((currentRegistry) => {
        const currentEntries = currentRegistry.slots[entry.name];
        const existingEntry = currentEntries.find(
          (currentEntry) => currentEntry.id === entry.id,
        );

        const nextEntry: MobileSlotEntry = {
          ...entry,
          order: existingEntry?.order ?? nextOrderRef.current++,
        };

        const nextEntries = existingEntry
          ? currentEntries.map((currentEntry) =>
              currentEntry.id === entry.id ? nextEntry : currentEntry,
            )
          : [...currentEntries, nextEntry];

        if (IS_DEV && entry.isSingleWriter && nextEntries.length > 1) {
          console.warn(
            `[MobileSlot] Multiple writers registered for single-writer slot "${entry.name}". Last writer wins.`,
          );
        }

        return {
          ...currentRegistry,
          slots: {
            ...currentRegistry.slots,
            [entry.name]: nextEntries,
          },
        };
      });
    },
    [],
  );

  const unregisterSlot = useCallback(
    (name: MobileSlotName, id: string) => {
      setRegistry((currentRegistry) => {
        const currentEntries = currentRegistry.slots[name];
        const nextEntries = currentEntries.filter((entry) => entry.id !== id);

        if (nextEntries.length === currentEntries.length) {
          return currentRegistry;
        }

        return {
          ...currentRegistry,
          slots: {
            ...currentRegistry.slots,
            [name]: nextEntries,
          },
        };
      });
    },
    [],
  );

  const registerTarget = useCallback(
    (name: MobileSlotName, id: string, target: HTMLDivElement | null) => {
      setRegistry((currentRegistry) => {
        const currentTarget = currentRegistry.targets[name][id] ?? null;

        if (currentTarget === target) {
          return currentRegistry;
        }

        return {
          ...currentRegistry,
          targets: {
            ...currentRegistry.targets,
            [name]: {
              ...currentRegistry.targets[name],
              [id]: target,
            },
          },
        };
      });
    },
    [],
  );

  const unregisterTarget = useCallback((name: MobileSlotName, id: string) => {
    setRegistry((currentRegistry) => {
      if (!(id in currentRegistry.targets[name])) {
        return currentRegistry;
      }

      const nextTargets = { ...currentRegistry.targets[name] };
      delete nextTargets[id];

      return {
        ...currentRegistry,
        targets: {
          ...currentRegistry.targets,
          [name]: nextTargets,
        },
      };
    });
  }, []);

  const value = useMemo<MobileSlotContextValue>(
    () => ({
      registerSlot,
      unregisterSlot,
      registerTarget,
      unregisterTarget,
      getEntries: (name) => registry.slots[name],
      getActiveEntries: (name) => getActiveEntriesForSlot(registry.slots[name]),
      getTarget: (name, id) => registry.targets[name][id] ?? null,
    }),
    [registerSlot, registerTarget, registry, unregisterSlot, unregisterTarget],
  );

  return (
    <MobileSlotContext.Provider value={value}>
      {children}
    </MobileSlotContext.Provider>
  );
}

function MobileSlotTarget({ entryId, name }: { entryId: string; name: MobileSlotName }) {
  const targetRef = useRef<HTMLDivElement>(null);
  const { registerTarget, unregisterTarget } = useMobileSlot();

  useLayoutEffect(() => {
    registerTarget(name, entryId, targetRef.current);

    return () => {
      unregisterTarget(name, entryId);
    };
  }, [entryId, name, registerTarget, unregisterTarget]);

  return <div data-mobile-slot-target={entryId} ref={targetRef} />;
}

export function MobileSlotHost({ name, ...props }: MobileSlotHostProps) {
  const { getActiveEntries } = useMobileSlot();
  const activeEntries = getActiveEntries(name);

  return (
    <div data-testid={`mobile-slot-host-${name}`} {...props}>
      {activeEntries.map((entry) => (
        <MobileSlotTarget key={entry.id} entryId={entry.id} name={name} />
      ))}
    </div>
  );
}

export function MobileSlot({
  name,
  children,
  priority = 0,
}: MobileSlotProps) {
  const slotId = useId();
  const {
    getActiveEntries,
    getTarget,
    registerSlot,
    unregisterSlot,
  } = useMobileSlot();
  const slotIsSingleWriter = isSingleWriterSlot(name);

  useEffect(() => {
    registerSlot({
      id: slotId,
      name,
      content: children,
      priority,
      isSingleWriter: slotIsSingleWriter,
    });

    return () => {
      unregisterSlot(name, slotId);
    };
  }, [
    children,
    name,
    priority,
    registerSlot,
    slotId,
    slotIsSingleWriter,
    unregisterSlot,
  ]);

  const activeEntries = getActiveEntries(name);
  const isActive = activeEntries.some((entry) => entry.id === slotId);
  const target = getTarget(name, slotId);

  if (!isActive || !target) {
    return null;
  }

  return createPortal(children, target);
}

export function useMobileSlot() {
  const context = useContext(MobileSlotContext);

  if (!context) {
    throw new Error("useMobileSlot must be used within a MobileSlotProvider");
  }

  return context;
}

export { MOBILE_SLOT_NAMES };
