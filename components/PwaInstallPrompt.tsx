"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("sh_install_dismissed_v1");
    if (dismissed === "1") return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // pequeño delay para no tirarlo en la cara apenas entra
      window.setTimeout(() => {
        setVisible(true);
      }, 1800);
    };

    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      localStorage.removeItem("sh_install_dismissed_v1");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
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
      localStorage.setItem("sh_install_dismissed_v1", "1");
    }
  }

  function handleClose() {
    setVisible(false);
    localStorage.setItem("sh_install_dismissed_v1", "1");
  }

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-[9998] px-4">
      <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <img
            src="/icons/icon-192.png"
            alt="SH Rosario"
            className="h-14 w-14 rounded-2xl object-cover"
            draggable={false}
          />

          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-black">Instalá SH Rosario</div>
            <p className="mt-1 text-sm text-black/65">
              Acceso rápido, experiencia más fluida y uso como app.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleClose}
            className="rounded-2xl border border-black/10 px-4 py-3 font-bold text-black transition active:scale-[0.98]"
          >
            Ahora no
          </button>

          <button
            onClick={handleInstall}
            className="rounded-2xl bg-[#ee078e] px-4 py-3 font-bold text-white transition active:scale-[0.98]"
          >
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}