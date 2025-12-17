'use client';

import { useEffect, useState } from 'react';
import './styles.css';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    console.log('InstallPWA component mounted');
    
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    console.log('Is standalone:', isStandalone);
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired!');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      console.log('App installed successfully!');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    // Force show button in development for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - showing test button');
      setTimeout(() => {
        if (!isStandalone) {
          setShowDebug(true);
        }
      }, 1000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('No deferred prompt available');
      alert('Install prompt not available. Make sure you:\n1. Built the app (npm run build)\n2. Running production server (npm start)\n3. Using HTTPS or localhost\n4. Haven\'t installed the app yet');
      return;
    }

    console.log('Showing install prompt');
    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('User choice:', outcome);
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // Show debug button in development or show actual button when installable
  if (isInstalled) {
    console.log('App already installed');
    return null;
  }

  if (!isInstallable && !showDebug) {
    console.log('Not installable yet and not in debug mode');
    return null;
  }

  return (
    <div className="install-pwa-container">
      <button 
        className={`install-pwa-button ${showDebug && !isInstallable ? 'debug-mode' : ''}`}
        onClick={handleInstallClick}
        aria-label="Install app"
      >
        <svg 
          className="install-icon" 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="install-text">
          {showDebug && !isInstallable ? 'Install (Debug)' : 'Install App'}
        </span>
      </button>
      {showDebug && !isInstallable && (
        <div className="debug-info">
          <p>Check console for PWA status</p>
        </div>
      )}
    </div>
  );
}
