// src/context/LanguageContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { translateText, translateTexts } from "../utils/translateService";

export const LanguageContext = createContext();

const SUPPORTED_LANGS = {
  en: "English",
  hi: "हिन्दी", // Hindi
  te: "తెలుగు", // Telugu
  ta: "தமிழ்", // Tamil
  ml: "മലയാളം", // Malayalam
  bn: "বাংলা", // Bengali
  gu: "ગુજરાતી", // Gujarati
  kn: "ಕನ್ನಡ", // Kannada
  or: "ଓଡ଼ିଆ", // Odia
  pa: "ਪੰਜਾਬੀ" // Punjabi
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    // Try to get from localStorage first, fallback to browser language, then English
    const savedLang = localStorage.getItem("lang");
    if (savedLang && SUPPORTED_LANGS[savedLang]) {
      return savedLang;
    }
    
    // Try to detect browser language
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LANGS[browserLang]) {
      return browserLang;
    }
    
    return "en";
  });

  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  const translateUI = async (text) => {
    if (lang === "en") return text;
    return await translateText(text, lang);
  };

  const translateUIBatch = async (texts) => {
    if (lang === "en") return texts;
    setIsTranslating(true);
    try {
      const results = await translateTexts(texts, lang);
      return results;
    } finally {
      setIsTranslating(false);
    }
  };

  const changeLanguage = (newLang) => {
    if (SUPPORTED_LANGS[newLang]) {
      setLang(newLang);
    }
  };

  const value = {
    lang,
    setLang: changeLanguage,
    translateUI,
    translateUIBatch,
    isTranslating,
    SUPPORTED_LANGS
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
