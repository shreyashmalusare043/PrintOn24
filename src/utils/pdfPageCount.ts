import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function getPdfPageInfo(source: string | Uint8Array): Promise<{
  pages: number;
  orientation: 'Portrait' | 'Landscape';
}> {
  const loadingTask = pdfjsLib.getDocument({
    ...(typeof source === 'string' ? { url: source } : { data: source }),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/',
    cMapPacked: true,
    enableXfa: true
  });
  try {
    const pdf = await loadingTask.promise;
    if (!Number.isSafeInteger(pdf.numPages) || pdf.numPages < 1) {
      throw new Error('PDF contains no readable pages.');
    }
    const firstPage = await pdf.getPage(1);
    const { width, height } = firstPage.getViewport({ scale: 1 });
    return {
      pages: pdf.numPages,
      orientation: width > height ? 'Landscape' : 'Portrait'
    };
  } finally {
    await loadingTask.destroy();
  }
}

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
