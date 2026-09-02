export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = window.document.createElement('a')
  a.href = url
  a.download = filename
  window.document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
