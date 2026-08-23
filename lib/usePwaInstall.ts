'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PwaInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isIPad: boolean;
  install: () => Promise<boolean>;
  showIosPrompt: boolean;
  setShowIosPrompt: (show: boolean) => void;
}

export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIPad, setIsIPad] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone display mode
    const checkIsInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkIsInstalled();

    // Detect iOS / iPadOS (including iPad Pro with MacIntel UA and touch)
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua);
    const isMacWithTouch =
      window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
    const isIpadDevice = /iPad/.test(ua) || (isMacWithTouch && !/iPhone/.test(ua));

    setIsIOS(isIosDevice || isMacWithTouch);
    setIsIPad(isIpadDevice);

    // Listen for beforeinstallprompt event (Chromium browsers)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIosPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (isInstalled) return true;

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    }

    if (isIOS || isIPad) {
      setShowIosPrompt(true);
      return false;
    }

    // Generic fallback: open prompt
    setShowIosPrompt(true);
    return false;
  }, [deferredPrompt, isInstalled, isIOS, isIPad]);

  const canInstall = !isInstalled && (deferredPrompt !== null || isIOS || isIPad);

  return {
    canInstall,
    isInstalled,
    isIOS,
    isIPad,
    install,
    showIosPrompt,
    setShowIosPrompt,
  };
}
