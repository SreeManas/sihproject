// src/components/BotpressChatbot.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from './auth/AuthProvider.jsx';

export default function BotpressChatbot() {
  const { currentUser, loading } = useAuth();
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    // Only load Botpress scripts if user is logged in
    if (!loading && currentUser) {
      loadBotpressChatbot();
    }

    return () => {
      cleanupBotpress();
    };
  }, [currentUser, loading]);

  // Continuous check to hide error if chatbot appears
  useEffect(() => {
    if (error) {
      const checkInterval = setInterval(() => {
        if (isChatbotInDOM()) {
          console.log('Chatbot detected, clearing error');
          setError(null);
          setShowLoading(false);
        }
      }, 500);

      return () => clearInterval(checkInterval);
    }
  }, [error]);

  const loadBotpressChatbot = async () => {
    try {
      setError(null);
      setShowLoading(true);
      
      // Check if scripts are already loaded
      if (window.botpressWebChat) {
        console.log('Botpress already loaded');
        // Give it a moment to render
        setTimeout(() => {
          if (isChatbotInDOM()) {
            setShowLoading(false);
          }
        }, 1000);
        return;
      }

      // Load Botpress inject script (v3.4)
      await loadScript('https://cdn.botpress.cloud/webchat/v3.4/inject.js', 'botpress-inject');
      
      // Load Botpress configuration script (this will auto-initialize the chatbot)
      await loadScript('https://files.bpcontent.cloud/2024/12/19/15/20241219150617-0RTMXJOK.js', 'botpress-config');
      
      setScriptsLoaded(true);
      console.log('Both Botpress scripts loaded successfully');
      
      // Start checking for the widget - but be patient
      startCheckingForWidget();
      
    } catch (error) {
      console.error('Error loading Botpress scripts:', error);
      setError('Failed to load chatbot. Please try again later.');
      setShowLoading(false);
      
      // Retry logic
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          console.log(`Retrying Botpress load (attempt ${retryCount + 1})`);
          loadBotpressChatbot();
        }, 2000 * (retryCount + 1));
      }
    }
  };

  const startCheckingForWidget = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    let checkCount = 0;
    const maxChecks = 20; // Check for 20 seconds (increased from 15)

    // Check immediately
    if (isChatbotInDOM()) {
      setShowLoading(false);
      return;
    }

    // Check every second
    checkIntervalRef.current = setInterval(() => {
      checkCount++;
      console.log(`Checking for Botpress widget... (${checkCount}/${maxChecks})`);
      
      if (isChatbotInDOM()) {
        console.log('Botpress chatbot widget found!');
        clearInterval(checkIntervalRef.current);
        setShowLoading(false);
        setError(null);
        return;
      }

      if (checkCount >= maxChecks) {
        clearInterval(checkIntervalRef.current);
        console.warn('Botpress chatbot not found after checking period');
        // Only set error if we really can't find it
        if (!isChatbotInDOM()) {
          setError('Chatbot failed to load properly. Please refresh the page.');
          setShowLoading(false);
        }
      }
    }, 1000);
  };

  const loadScript = (src, id) => {
    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById(id);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        console.log(`Script loaded: ${src}`);
        resolve();
      };
      
      script.onerror = () => {
        console.error(`Failed to load script: ${src}`);
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.head.appendChild(script);
    });
  };

  const isChatbotInDOM = () => {
    // Check for Botpress widget/iframe - try ALL possible selectors
    const selectors = [
      'iframe[src*="botpress"]',
      'iframe[src*="webchat"]',
      'iframe[title*="bot"]',
      'iframe[title*="Bot"]',
      'iframe[title*="chat"]',
      'iframe[title*="Chat"]',
      '#bp-web-widget',
      '[id^="bp-web-widget"]',
      '[id*="botpress"]',
      '[class*="bp-widget"]',
      '[class*="botpress"]',
      '.bpw-widget',
      'div[class*="webchat"]',
      // Generic iframe check as last resort
      'iframe'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      // Filter iframes to only Botpress ones
      for (const element of elements) {
        if (element.tagName === 'IFRAME') {
          const src = element.src || '';
          const title = element.title || '';
          if (src.includes('botpress') || src.includes('webchat') || 
              title.toLowerCase().includes('bot') || 
              title.toLowerCase().includes('chat')) {
            return true;
          }
        } else {
          // Non-iframe elements
          return true;
        }
      }
    }
    
    // Also check window object
    if (window.botpressWebChat && typeof window.botpressWebChat === 'object') {
      return true;
    }
    
    return false;
  };

  const cleanupBotpress = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    // Remove scripts
    const scripts = ['botpress-inject', 'botpress-config'];
    scripts.forEach(id => {
      const script = document.getElementById(id);
      if (script && document.head.contains(script)) {
        document.head.removeChild(script);
      }
    });

    // Remove widgets
    const widgetSelectors = [
      'iframe[src*="botpress"]',
      'iframe[src*="webchat"]',
      '#bp-web-widget',
      '[id^="bp-web-widget"]',
      '[class*="bp-widget"]'
    ];
    
    widgetSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => element.remove());
    });

    // Reset state
    setScriptsLoaded(false);
    setShowLoading(false);
    setError(null);
    setRetryCount(0);

    // Clean up window object
    if (window.botpressWebChat) {
      try {
        if (typeof window.botpressWebChat.destroy === 'function') {
          window.botpressWebChat.destroy();
        }
      } catch (e) {
        console.log('Error destroying Botpress:', e);
      }
    }
  };

  const handleRetry = () => {
    cleanupBotpress();
    setTimeout(() => {
      loadBotpressChatbot();
    }, 1000);
  };

  // Don't render anything if user is not logged in or still loading
  if (loading || !currentUser) {
    return null;
  }

  // CRITICAL: Only show error if we have an error AND chatbot is NOT in DOM
  // This does a live check every render to prevent false positives
  const shouldShowError = error && !isChatbotInDOM();

  if (shouldShowError) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm shadow-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Chatbot Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              {retryCount < maxRetries && (
                <button
                  onClick={handleRetry}
                  className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading only if explicitly set and no chatbot in DOM
  if (showLoading && !isChatbotInDOM()) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm text-blue-700">Loading chatbot...</span>
          </div>
        </div>
      </div>
    );
  }

  // Chatbot will be injected by scripts
  return null;
}