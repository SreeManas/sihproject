// src/hooks/useT.js
import { useContext, useState, useEffect } from "react";
import { LanguageContext } from "../context/LanguageContext";

export function useT(text) {
  const { translateUI, lang } = useContext(LanguageContext);
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let active = true;
    
    // Skip translation for empty text or English
    if (!text || lang === "en") {
      setTranslated(text);
      return;
    }
    
    translateUI(text).then((res) => {
      if (active) {
        setTranslated(res);
      }
    }).catch((error) => {
      // Translation hook error
      if (active) {
        setTranslated(text); // Fallback to original text
      }
    });

    return () => { 
      active = false; 
    };
  }, [text, translateUI, lang]);

  return translated;
}

// Hook for translating multiple texts at once (more efficient)
export function useTBatch(texts) {
  const { translateUIBatch, lang } = useContext(LanguageContext);
  const [translated, setTranslated] = useState(texts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    
    // Skip translation for empty array or English
    if (!texts || !Array.isArray(texts) || lang === "en") {
      setTranslated(texts);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    translateUIBatch(texts).then((res) => {
      if (active) {
        setTranslated(res);
        setLoading(false);
      }
    }).catch((error) => {
      // Batch translation hook error
      if (active) {
        setTranslated(texts); // Fallback to original texts
        setLoading(false);
      }
    });

    return () => { 
      active = false; 
    };
  }, [texts, translateUIBatch, lang]);

  return { translated, loading };
}

// Simplified hook that returns just the translated text
export function useTSimple(text) {
  const { translated } = useT(text);
  return translated;
}
