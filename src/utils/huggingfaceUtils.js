import rateLimitManager from "./rateLimitManager.js";

// Sentiment Analysis (English only)
export const analyzeSentimentHF = async (text) => {
  const result = await rateLimitManager.enqueue("huggingface", {
    model: "distilbert-base-uncased-finetuned-sst-2-english",
    payload: { inputs: text }
  });
  return result[0]?.label || "NEUTRAL";
};

// Zero-shot classification (hazard type detection)
export const classifyHazardHF = async (text) => {
  const result = await rateLimitManager.enqueue("huggingface", {
    model: "facebook/bart-large-mnli",
    payload: {
      inputs: text,
      parameters: {
        candidate_labels: ["tsunami", "storm surge", "flood", "high waves", "other"]
      }
    }
  });
  return result?.labels?.[0] || "other";
};

// Multilingual sentiment (XLM-R model)
export const analyzeMultilingualSentimentHF = async (text) => {
  const result = await rateLimitManager.enqueue("huggingface", {
    model: "cardiffnlp/twitter-xlm-roberta-base-sentiment",
    payload: { inputs: text }
  });
  return result[0]?.label || "NEUTRAL";
};

// Multilingual zero-shot classification (XNLI/XLM-R)
export async function classifyMultilingualTextXLMR(text, { model = 'joeddav/xlm-roberta-large-xnli' } = {}) {
  const labels = ["Tsunami","Cyclone","Flood","Earthquake","High Waves","Other"];
  const res = await rateLimitManager.enqueue('huggingface', {
    model,
    payload: { inputs: text, parameters: { candidate_labels: labels, multi_label: false } }
  });
  if (Array.isArray(res) && res[0]?.labels) {
    return { label: res[0].labels[0] || 'Other', confidence: res[0].scores?.[0] || 0.5 };
  } else if (res?.labels) {
    return { label: res.labels[0] || 'Other', confidence: res.scores?.[0] || 0.5 };
  }
  return { label: 'Other', confidence: 0.5 };
}

// Indic model stub (demo-safe)
export async function classifyIndicBARTStub(text) {
  return { label: 'Other', confidence: 0.6 };
}
