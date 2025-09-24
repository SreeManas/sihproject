// src/components/LanguageSwitcher.jsx
import React, { useContext } from "react";
import { LanguageContext } from "../context/LanguageContext.jsx";

export default function LanguageSwitcher() {
  const { lang, setLang, SUPPORTED_LANGS, isTranslating } = useContext(LanguageContext);

  return (
    <div className="relative">
      <select
        className="appearance-none p-2 pr-8 border border-gray-300 rounded-md text-sm bg-white shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        disabled={isTranslating}
        title="Select language"
      >
        {Object.entries(SUPPORTED_LANGS).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      
      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {isTranslating && (
        <div className="absolute -top-1 -right-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
        </div>
      )}
    </div>
  );
}
