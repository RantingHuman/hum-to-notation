function detectBrowser(): 'chrome' | 'firefox' | 'safari' | 'other' {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
  if (ua.includes('Chrome') || ua.includes('Chromium')) return 'chrome';
  return 'other';
}

const INSTRUCTIONS: Record<string, string[]> = {
  chrome: [
    'Click the 🔒 lock icon in the address bar',
    'Find "Microphone" and set it to "Allow"',
    'Reload the page',
  ],
  firefox: [
    'Click the 🔒 lock icon in the address bar',
    'Click the microphone permission row and choose "Allow"',
    'Reload the page',
  ],
  safari: [
    'Open Safari → Settings → Websites → Microphone',
    'Find this site and set it to "Allow"',
    'Reload the page',
  ],
  other: [
    'Open your browser settings',
    'Navigate to Site Permissions → Microphone',
    'Allow this site to use your microphone',
    'Reload the page',
  ],
};

interface Props {
  onDismiss: () => void;
}

export function MicPermissionGuide({ onDismiss }: Props) {
  const browser = detectBrowser();
  const steps = INSTRUCTIONS[browser];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-gray-600 shadow-2xl">
        <div className="text-4xl mb-3 text-center">🎤</div>
        <h2 className="text-white font-bold text-lg text-center mb-2">
          Microphone Access Required
        </h2>
        <p className="text-gray-400 text-sm text-center mb-5">
          Hum to Notation needs your microphone to detect pitches. Please allow
          access and try again.
        </p>

        <ol className="space-y-2 mb-6">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-300">
              <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 text-xs font-bold">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <button
          onClick={onDismiss}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
