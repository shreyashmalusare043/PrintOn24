import type { PrintEnterprise } from '../types/printperfect';

export type PrintType = 'Color' | 'Black & White';
export type PrintSides = 'Single Side' | 'Back to Back';

export function getPrintModeEligibility(
  pricing: PrintEnterprise['pricing'],
  paperSize: string
): Record<PrintType, Record<PrintSides, boolean>> {
  const global = pricing.eligibility;
  const normalize = (value: string) => value.toLowerCase().replace(/\s+paper$/, '').trim();
  const paper = pricing.dynamicPaperTypes?.find(
    item => normalize(item.name) === normalize(paperSize)
  );
  const paperEligibility = paper?.eligibility;

  const eligible = (
    globalValue: boolean | undefined,
    paperValue: boolean | undefined
  ) => globalValue === true && (!paper || paperValue === true);

  return {
    'Black & White': {
      'Single Side': eligible(global?.bwSingle, paperEligibility?.bwSingle),
      'Back to Back': eligible(global?.bwBackToBack, paperEligibility?.bwBackToBack)
    },
    Color: {
      'Single Side': eligible(global?.colorSingle, paperEligibility?.colorSingle),
      'Back to Back': eligible(global?.colorBackToBack, paperEligibility?.colorBackToBack)
    }
  };
}

export function isPrintModeEligible(
  pricing: PrintEnterprise['pricing'],
  paperSize: string,
  printType: string,
  sides: string
): boolean {
  const normalizedType =
    printType === 'Black & White' || printType === 'B&W'
      ? 'Black & White'
      : printType === 'Color' || printType === 'Colour'
      ? 'Color'
      : null;
  const normalizedSides =
    sides === 'Back to Back' || sides === 'Back-to-Back'
      ? 'Back to Back'
      : sides === 'Single Side' || sides === 'Single-sided'
      ? 'Single Side'
      : null;

  if (!normalizedType || !normalizedSides) return false;
  return getPrintModeEligibility(pricing, paperSize)[normalizedType][normalizedSides];
}
