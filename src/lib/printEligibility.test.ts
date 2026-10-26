import { describe, expect, it } from 'vitest';
import type { PrintEnterprise } from '../types/printperfect';
import { getPrintModeEligibility } from './printEligibility';

const basePricing: PrintEnterprise['pricing'] = {
  blackAndWhite: 1,
  colour: 2,
  costone: 0,
  bondPaperExtra: 0,
  glossyPaperExtra: 0,
  a3Multiplier: 1,
  a2Multiplier: 1,
  eligibility: {
    bwSingle: true,
    bwBackToBack: true,
    colorSingle: true,
    colorBackToBack: true
  }
};

describe('getPrintModeEligibility', () => {
  it('uses global eligibility when a paper type has no per-paper setting', () => {
    const result = getPrintModeEligibility({
      ...basePricing,
      dynamicPaperTypes: [{ name: 'A4' }]
    }, 'A4');

    expect(result['Black & White']['Single Side']).toBe(true);
    expect(result.Color['Back to Back']).toBe(true);
  });

  it('respects an explicit per-paper restriction', () => {
    const result = getPrintModeEligibility({
      ...basePricing,
      dynamicPaperTypes: [{
        name: 'A4',
        eligibility: {
          bwSingle: false
        }
      }]
    }, 'A4');

    expect(result['Black & White']['Single Side']).toBe(false);
    expect(result['Black & White']['Back to Back']).toBe(true);
  });
});
