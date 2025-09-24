// src/hooks/useRealTimeProcessing.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { classifyHazard, extractEntities, analyzeSentiment, extractEngagementMetrics, calculatePriorityScore } from '../utils/enhancedHybridNLP';

const WS_URL = import.meta.env.VITE_WS_URL || import.meta.env.REACT_APP_WS_URL || '';

export const useRealTimeProcessing = (onNewPost, onConnectionChange) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [messageCount, setMessageCount] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const processIncomingPost = useCallback(async (rawPost) => {
    try {
      const classificationResult = await classifyHazard(rawPost.text || '');
      const entities = extractEntities(rawPost.text || '');
      const sentiment = analyzeSentiment(rawPost.text || '');
      const engagement = extractEngagementMetrics(rawPost);
      const priorityScore = calculatePriorityScore(classificationResult, entities, engagement);

      const processedPost = {
        ...rawPost,
        id: rawPost.id || `realtime_${Date.now()}`,
        hazardLabel: classificationResult.label,
        confidence: classificationResult.confidence,
        entities,
        sentiment,
        engagement,
        priorityScore,
        processedAt: new Date().toISOString(),
        isRealTime: true,
      };

      onNewPost?.(processedPost);
      setLastMessage(processedPost);
      setMessageCount((c) => c + 1);
    } catch (err) {
      console.error('NLP processing error:', err);
    }
  }, [onNewPost]);

  const connectWS = useCallback(() => {
    if (!WS_URL) {
      setConnectionStatus('no_ws_config');
      setIsConnected(false);
    } else {
      try {
        setConnectionStatus('connecting');
        wsRef.current = new WebSocket(WS_URL);

        wsRef.current.onopen = () => {
          // WebSocket connected
          setIsConnected(true);
          setConnectionStatus('connected');
          reconnectAttemptsRef.current = 0;
          onConnectionChange?.(true);

          // Send authentication or subscription message if needed
          wsRef.current.send(JSON.stringify({
            type: 'subscribe',
            topics: ['hazard_alerts', 'social_posts'],
            timestamp: new Date().toISOString()
          }));
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
            setMessageCount(prev => prev + 1);
            if (data?.type === 'post' && data.data) {
              processIncomingPost(data.data);
            }
          } catch (error) {
            // Error parsing WebSocket message
          }
        };

        wsRef.current.onclose = (event) => {
          // WebSocket disconnected
          setIsConnected(false);
          setConnectionStatus('disconnected');
          onConnectionChange?.(false);

          // Attempt to reconnect if not a manual close
          if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            
            setConnectionStatus(`reconnecting (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWS();
            }, delay);
          }
        };

        wsRef.current.onerror = (error) => {
          // WebSocket error
          setConnectionStatus('error');
        };

      } catch (error) {
        // Failed to create WebSocket connection
        setConnectionStatus('error');
      }
    }
  }, [processIncomingPost, onConnectionChange]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Fallback polling if no WS configured
  const startPollingFallback = useCallback(() => {
    setConnectionStatus('polling');
    const timer = setInterval(() => {
      const txts = ['flood reports rising','cyclone alert update','high waves spotted','tsunami siren test'];
      const txt = txts[Math.floor(Math.random()*txts.length)];
      processIncomingPost({
        platform: 'twitter',
        text: txt,
        engagement: { likes: Math.floor(Math.random()*30), shares: Math.floor(Math.random()*10) },
        timestamp: new Date().toISOString(),
        lat: 8 + Math.random()*10,
        lon: 75 + Math.random()*10,
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [processIncomingPost]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    let stopPoll = null;
    if (WS_URL) {
      connectWS();
    } else {
      stopPoll = startPollingFallback();
    }
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
      if (stopPoll) stopPoll();
    };
  }, [connectWS, startPollingFallback]);

  return {
    isConnected,
    connectionStatus,
    messageCount,
    lastMessage,
    connect: connectWS,
    disconnect,
    sendMessage
  };
};