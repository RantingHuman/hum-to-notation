const UNTITLED = 'Untitled melody';

/** The next free "Untitled melody N" name, so new melodies need no naming step. */
export function nextUntitledName(existingNames: string[]): string {
  const pattern = new RegExp(`^${UNTITLED}(?: (\\d+))?$`, 'i');
  const used = existingNames.flatMap((name) => {
    const match = pattern.exec(name.trim());
    if (!match) return [];
    return [match[1] ? Number(match[1]) : 1];
  });
  if (used.length === 0) return UNTITLED;
  return `${UNTITLED} ${Math.max(...used) + 1}`;
}
