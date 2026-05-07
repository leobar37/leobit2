import { useState, useEffect, useCallback, useRef } from "react";

interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  install: () => Promise<void>;
  dismissIOS: () => void;
}

let globalDeferredPrompt: Event | null = null;

export function usePWAInstall(): PWAInstallState {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const deferredPromptRef = useRef<typeof globalDeferredPrompt>(null);

  const checkInstalled = useCallback(() => {
    if (typeof window === "undefined") return false;
    const standalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true ||
      window.matchMedia("(display-mode: standalone)").matches;
    return standalone;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsInstalled(checkInstalled());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      deferredPromptRef.current = e;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const mql = window.matchMedia("(display-mode: standalone)");
    mql.addEventListener("change", handleDisplayModeChange);

    // If we already missed the event (e.g. SW loaded late), check if prompt is available
    if (globalDeferredPrompt) {
      deferredPromptRef.current = globalDeferredPrompt;
      setCanInstall(true);
    }

    // iOS detection: no beforeinstallprompt, show manual instructions
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    if (isIOSDevice && !checkInstalled()) {
      setShowIOSPrompt(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      mql.removeEventListener("change", handleDisplayModeChange);
    };
  }, [checkInstalled]);

  const install = useCallback(async () => {
    const promptEvent =
      deferredPromptRef.current || globalDeferredPrompt;
    if (!promptEvent) return;

    // @ts-expect-error beforeinstallprompt event has prompt() method
    await promptEvent.prompt();

    // @ts-expect-error beforeinstallprompt event has userChoice
    const { outcome } = await promptEvent.userChoice;

    if (outcome === "accepted") {
      globalDeferredPrompt = null;
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    }
  }, []);

  const dismissIOS = useCallback(() => {
    setShowIOSPrompt(false);
  }, []);

  return {
    canInstall: canInstall || showIOSPrompt,
    isInstalled,
    isIOS: showIOSPrompt,
    install,
    dismissIOS,
  };
}
