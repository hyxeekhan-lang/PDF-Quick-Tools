import React, { useEffect, useRef } from 'react';
import { hasAdConsent } from './AdSlot';

export const Banner160x600Ad: React.FC = () => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAd = () => {
      if (!hasAdConsent() || !adRef.current || adRef.current.hasChildNodes()) return;

      const confScript = document.createElement('script');
      confScript.type = 'text/javascript';
      confScript.innerHTML = `
        atOptions = {
          'key' : 'd26c590c771ac96a4cbfa9b845037b34',
          'format' : 'iframe',
          'height' : 600,
          'width' : 160,
          'params' : {}
        };
      `;

      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = 'https://mammothsubway.com/d26c590c771ac96a4cbfa9b845037b34/invoke.js';

      adRef.current.appendChild(confScript);
      adRef.current.appendChild(invokeScript);
    };

    loadAd();
    window.addEventListener('ad-consent', loadAd);
    return () => window.removeEventListener('ad-consent', loadAd);
  }, []);

  return (
    <div
      style={{ width: '160px', height: '600px', margin: '0 auto' }}
      ref={adRef}
    />
  );
};
