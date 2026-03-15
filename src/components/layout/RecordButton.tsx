export function RecordButton() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 md:hidden">
      <button
        className="w-16 h-16 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-full flex items-center justify-center shadow-2xl border-4 border-red-400 transition-colors"
        aria-label="Record"
      >
        <span className="w-6 h-6 bg-white rounded-full" />
      </button>
    </div>
  );
}
