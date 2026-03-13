const STORAGE_KEY = "avileo.dev.simulated-offline";

type Listener = (isSimulatedOffline: boolean) => void;

const listeners = new Set<Listener>();

function isDevEnvironment() {
  return import.meta.env.DEV;
}

function readStoredValue() {
  if (!isDevEnvironment() || typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

let simulatedOffline = readStoredValue();

function notify() {
  for (const listener of listeners) {
    listener(simulatedOffline);
  }
}

export function getSimulatedOffline() {
  return simulatedOffline;
}

export function setSimulatedOffline(nextValue: boolean) {
  if (!isDevEnvironment()) {
    return;
  }

  simulatedOffline = nextValue;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(nextValue));
  }

  notify();
}

export function subscribeToSimulatedOffline(listener: Listener) {
  listeners.add(listener);
  listener(simulatedOffline);

  return () => {
    listeners.delete(listener);
  };
}

export function getEffectiveOnlineStatus(actualOnline: boolean) {
  if (!isDevEnvironment()) {
    return actualOnline;
  }

  return actualOnline && !simulatedOffline;
}

export function canProcessSync(actualOnline: boolean) {
  return getEffectiveOnlineStatus(actualOnline);
}
