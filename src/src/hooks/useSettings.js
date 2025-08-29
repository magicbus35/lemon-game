// src/hooks/useSettings.js
import { useEffect, useState } from "react";

const KEY = "settings";

const defaultSettings = {
  autoRedirectToRanking: false, // 등록 성공 시 랭킹 자동 이동
};

export function useSettings() {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch {
      // 무시
    }
  }, []);

  const save = (next) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      // 무시
    }
  };

  return { settings, save };
}
