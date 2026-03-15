export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\-]/gi, '_').replace(/_+/g, '_').slice(0, 60);
}
