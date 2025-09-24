// src/components/BotpressChatbot.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthProvider.jsx';

export default function BotpressChatbot() {
  const { currentUser, loading } = useAuth();
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    // Only load Botpress scripts if user is logged in and scripts haven't been loaded yet
    if (!loading && currentUser && !scriptsLoaded) {
      let script1, script2;
      
      const loadScripts = async () => {
        try {
          // Load first script
          script1 = document.createElement('script');
          script1.src = 'https://cdn.botpress.cloud/webchat/v3.3/inject.js';
          script1.async = true;
          
          // Wait for first script to load
          await new Promise((resolve, reject) => {
            script1.onload = resolve;
            script1.onerror = reject;
            document.head.appendChild(script1);
          });
          
          // Load second script
          script2 = document.createElement('script');
          script2.src = 'https://files.bpcontent.cloud/2024/12/03/12/20241203123000-VO1O9BBC.js';
          script2.defer = true;
          
          // Wait for second script to load
          await new Promise((resolve, reject) => {
            script2.onload = resolve;
            script2.onerror = reject;
            document.head.appendChild(script2);
          });
          
          setScriptsLoaded(true);
          console.log('Botpress chatbot scripts loaded successfully');
        } catch (error) {
          console.error('Error loading Botpress scripts:', error);
        }
      };
      
      loadScripts();
      
      // Cleanup function
      return () => {
        if (script1 && document.head.contains(script1)) {
          document.head.removeChild(script1);
        }
        if (script2 && document.head.contains(script2)) {
          document.head.removeChild(script2);
        }
        
        // Remove any Botpress widgets from DOM
        const botpressWidgets = document.querySelectorAll('[class*="bp-widget"], [id*="bp-webchat"]');
        botpressWidgets.forEach(widget => widget.remove());
        
        setScriptsLoaded(false);
      };
    }
  }, [currentUser, loading, scriptsLoaded]);

  // Don't render anything if user is not logged in or still loading
  if (loading || !currentUser) {
    return null;
  }

  // The chatbot will be injected by the scripts, so we don't need to render anything
  return null;
}
