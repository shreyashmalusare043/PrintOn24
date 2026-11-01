import JSZip from 'jszip';

export async function getPowerPointSlideCount(file: Blob): Promise<number> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  const presentationSlideIds = presentationXml?.match(/<p:sldId\b[^>]*\/?>/gi);
  if (presentationSlideIds?.length) {
    return presentationSlideIds.length;
  }

  const slideFiles = Object.values(zip.files).filter(
    entry => !entry.dir && /^ppt\/slides\/slide\d+\.xml$/i.test(entry.name)
  );
  if (!slideFiles.length) {
    throw new Error('No slides were found in this PowerPoint file.');
  }

  return slideFiles.length;
}
