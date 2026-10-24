import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function getPdfPageCount(source: string | Uint8Array): Promise<number> {
  const loadingTask = pdfjsLib.getDocument({
    ...(typeof source === 'string' ? { url: source } : { data: source }),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    enableXfa: true
  });
  try {
    const pdf = await loadingTask.promise;
    if (!Number.isSafeInteger(pdf.numPages) || pdf.numPages < 1) {
      throw new Error('Converted PDF contains no readable pages.');
    }
    return pdf.numPages;
  } finally {
    await loadingTask.destroy();
  }
}
