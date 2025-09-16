// src/hooks/useWebWorker.js
// Lightweight, main-thread fallback for NLP processing used by LazyLoadedFeed.
// This avoids needing a real Web Worker file and fixes missing import errors.

import { useCallback, useRef } from 'react';
import { classifyHazard, extractEntities, analyzeSentiment, extractEngagementMetrics, calculatePriorityScore } from '../utils/enhancedHybridNLP.js';

export const useNLPWorker = () => {
  const busyRef = useRef(false);

  const processSinglePost = useCallback(async (post) => {
    try {
      busyRef.current = true;
      const classification = await classifyHazard(post.text || '');
      const entities = extractEntities(post.text || '');
      const sentiment = analyzeSentiment(post.text || '');
      const engagement = extractEngagementMetrics(post);
      const priorityScore = calculatePriorityScore(classification, entities, engagement);
      return {
        ...post,
        hazardLabel: classification.label,
        confidence: classification.confidence,
        entities,
        sentiment,
        engagement,
        priorityScore,
        processedAt: new Date().toISOString(),
      };
    } finally {
      busyRef.current = false;
    }
  }, []);

  const processBatch = useCallback(async (posts) => {
    const out = [];
    for (const p of posts) {
      // sequential for simplicity; can parallelize later
      out.push(await processSinglePost(p));
    }
    return out;
  }, [processSinglePost]);

  const classifyText = useCallback(async (text) => {
    const c = await classifyHazard(text || '');
    return c;
  }, []);

  return {
    processSinglePost,
    processBatch,
    classifyText,
    isAvailable: !busyRef.current,
  };
};
