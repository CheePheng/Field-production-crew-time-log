// Minimal type declarations for pdfmake browser build (no @types/pdfmake available)
declare module 'pdfmake/build/pdfmake' {
  interface PdfMakeStatic {
    vfs: Record<string, string>
    fonts: Record<string, unknown>
    createPdf(docDefinition: unknown, tableLayouts?: unknown, fonts?: unknown, vfs?: unknown): {
      download(filename?: string, cb?: () => void): void
      open(options?: unknown, win?: Window | null): void
      getBuffer(cb: (buffer: Uint8Array) => void): void
      getBlob(cb: (blob: Blob) => void): void
      getBase64(cb: (base64: string) => void): void
    }
    addFonts(fonts: Record<string, unknown>): void
  }
  const pdfMake: PdfMakeStatic
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfsFonts: { vfs: Record<string, string> }
  export default vfsFonts
}
