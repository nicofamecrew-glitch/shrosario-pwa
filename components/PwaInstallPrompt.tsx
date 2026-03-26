"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;

  const mediaStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return !!mediaStandalone || !!iosStandalone;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"android" | "ios" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isInStandaloneMode()) return;

    const dismissed = localStorage.getItem("sh_install_dismissed_v2");
    if (dismissed === "1") return;

    let timeoutId: number | null = null;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android");

      timeoutId = window.setTimeout(() => {
        setVisible(true);
      }, 1800);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      setMode(null);
      localStorage.removeItem("sh_install_dismissed_v2");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    // Fallback iPhone/iPad: mostrar ayuda manual
    if (isIos()) {
      timeoutId = window.setTimeout(() => {
        if (!isInStandaloneMode()) {
          setMode("ios");
          setVisible(true);
        }
      }, 1800);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;

    setVisible(false);
    await deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;
    console.log("[PWA INSTALL] userChoice", choice);

    setDeferredPrompt(null);

    if (choice.outcome !== "accepted") {
      localStorage.setItem("sh_install_dismissed_v2", "1");
    }
  }

  function handleClose() {
    setVisible(false);
    localStorage.setItem("sh_install_dismissed_v2", "1");
  }

  if (!visible || !mode) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-5 shadow-2xl animate-[fadeIn_0.35s_ease-out]">
        <div className="flex items-start gap-3">
          <img
            src="/icons/icon-192.png"
            alt="SH Rosario"
            className="h-14 w-14 rounded-2xl object-cover"
            draggable={false}
          />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-black">Instalá SH Rosario</div>

            {mode === "android" ? (
              <p className="mt-1 text-sm text-black/65">
                Acceso rápido, experiencia más fluida y uso como app.
              </p>
            ) : (
              <p className="mt-1 text-sm text-black/65">
                En iPhone abrí esta web en Safari, tocá el botón de compartir y elegí
                “Agregar a pantalla de inicio”.
              </p>
            )}
          </div>
        </div>

        {mode === "ios" ? (
          <div className="mt-4 rounded-2xl bg-black/5 p-3 text-sm text-black/75">
            <div>1. Abrí la web en <span className="font-bold">Safari</span></div>
            <div>2. Tocá <span className="font-bold">Compartir</span></div>
            <div>3. Elegí <span className="font-bold">Agregar a pantalla de inicio</span></div>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleClose}
            className="rounded-2xl border border-black/10 px-4 py-3 font-bold text-black transition active:scale-[0.98]"
          >
            Ahora no
          </button>

          {mode === "android" ? (
            <button
              onClick={handleInstall}
              className="rounded-2xl bg-[#ee078e] px-4 py-3 font-bold text-white transition active:scale-[0.98]"
            >
              Instalar
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="rounded-2xl bg-[#ee078e] px-4 py-3 font-bold text-white transition active:scale-[0.98]"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}