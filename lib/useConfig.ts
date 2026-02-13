"use client";

import { useEffect, useState } from "react";

type Config = {
  whatsapp_number: string;
  wholesale_code: string;
};

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem("app_config");
    if (cached) {
      setConfig(JSON.parse(cached));
      setLoading(false);
    }

    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setConfig(data.config);
          localStorage.setItem("app_config", JSON.stringify(data.config));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}
