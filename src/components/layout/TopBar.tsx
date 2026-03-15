export function TopBar() {
  return (
    <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-lg border-b border-gray-700">
      <h1 className="text-xl font-bold text-purple-400">🎵 Hum to Notation</h1>
      <div className="flex gap-2">
        <span className="text-gray-400 text-sm">No project open</span>
      </div>
    </header>
  );
}
