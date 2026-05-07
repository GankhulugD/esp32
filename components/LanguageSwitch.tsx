"use client";

import { useLang, type Lang } from "@/lib/i18n";

export function LanguageSwitch() {
  const { lang, setLang } = useLang();

  return (
    <div
      className="relative flex items-center bg-gray-100 rounded-full p-0.5 select-none"
      role="group"
      aria-label="Language"
    >
      <span
        aria-hidden
        className={`absolute top-0.5 bottom-0.5 w-9 rounded-full bg-white shadow-sm border border-gray-200 transition-transform duration-200 ease-out ${
          lang === "mn" ? "translate-x-9" : "translate-x-0"
        }`}
        style={{ left: 2 }}
      />
      {(["en", "mn"] as Lang[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setLang(v)}
          aria-pressed={lang === v}
          className={`relative z-10 w-9 h-7 text-[10px] font-bold tracking-wider transition-colors ${
            lang === v ? "text-brand-ink" : "text-gray-400"
          }`}
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
