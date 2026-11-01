import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { getPowerPointSlideCount } from './powerPointSlideCount';

describe('getPowerPointSlideCount', () => {
  it('counts slide XML files without counting relationship or layout files', async () => {
    const zip = new JSZip();
    zip.file(
      'ppt/presentation.xml',
      '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1" /><p:sldId id="257" r:id="rId2" /></p:sldIdLst></p:presentation>'
    );
    zip.file('ppt/slides/slide1.xml', '<slide />');
    zip.file('ppt/slides/slide2.xml', '<slide />');
    zip.file('ppt/slides/slide3.xml', '<slide />');
    zip.file('ppt/slides/_rels/slide2.xml.rels', '<Relationships />');
    zip.file('ppt/slideLayouts/slideLayout1.xml', '<layout />');
    const blob = new Blob([await zip.generateAsync({ type: 'arraybuffer' })]);

    await expect(getPowerPointSlideCount(blob)).resolves.toBe(2);
  });

  it('rejects a package with no presentation slides', async () => {
    const zip = new JSZip();
    zip.file('ppt/slideLayouts/slideLayout1.xml', '<layout />');
    const blob = new Blob([await zip.generateAsync({ type: 'arraybuffer' })]);

    await expect(getPowerPointSlideCount(blob)).rejects.toThrow(
      'No slides were found in this PowerPoint file.'
    );
  });
});
