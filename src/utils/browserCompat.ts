export interface BrowserSupport {
  supported: boolean;       // false = critical API missing, block the app
  warnings: string[];       // non-blocking issues
}

export function checkBrowserSupport(): BrowserSupport {
  const warnings: string[] = [];
  let supported = true;

  // Critical: microphone access
  if (!navigator.mediaDevices?.getUserMedia) {
    supported = false;
    warnings.push('Microphone access (getUserMedia) is not supported in this browser.');
  }

  // Critical: Web Audio API
  if (typeof AudioContext === 'undefined' && typeof (window as Window & { webkitAudioContext?: unknown }).webkitAudioContext === 'undefined') {
    supported = false;
    warnings.push('Web Audio API is not supported in this browser.');
  }

  // Critical: IndexedDB
  if (!window.indexedDB) {
    supported = false;
    warnings.push('IndexedDB is not available. Projects cannot be saved.');
  }

  // Non-critical: crypto.randomUUID (we can polyfill)
  if (typeof crypto?.randomUUID !== 'function') {
    warnings.push('crypto.randomUUID not available — using fallback ID generator.');
  }

  // Non-critical: browser-specific notes
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isFirefox = ua.includes('Firefox');

  if (isSafari) {
    warnings.push('Safari detected. Pitch detection works best in Chrome or Edge.');
  } else if (isFirefox) {
    warnings.push('Firefox detected. For best experience, use Chrome or Edge.');
  }

  return { supported, warnings };
}

/** Polyfill for crypto.randomUUID in older browsers. */
export function safeRandomUUID(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  // Fallback: v4-style UUID using Math.random
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
