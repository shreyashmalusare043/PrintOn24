import type { PrintEnterprise } from '../types/printperfect';
import type { PrintSides, PrintType } from './printEligibility';

export type ShopServiceMode = 'Self-Service' | 'Counter';

export interface ShopServiceModeAccess {
  hasApmAccess: boolean;
  hasSoftwareAccess: boolean;
  showModeSelector: boolean;
  defaultMode: ShopServiceMode;
}

const MACHINE_MODE_GRANTS: Record<string, Array<[PrintType, PrintSides]>> = {
  bw_single_side: [['Black & White', 'Single Side']],
  bw_duplex: [['Black & White', 'Back to Back']],
  color_single_side: [['Color', 'Single Side']],
  color_duplex: [['Color', 'Back to Back']],
  bw_color_single_side: [
    ['Black & White', 'Single Side'],
    ['Color', 'Single Side']
  ],
  bw_color_duplex: [
    ['Black & White', 'Back to Back'],
    ['Color', 'Back to Back']
  ]
};

const normalizeMachineType = (machineType: string) =>
  machineType.trim().toLowerCase().replace(/[\s-]+/g, '_');

function normalizePrintMode(printType: string, sides: string): [PrintType, PrintSides] | null {
  const normalizedType: PrintType | null =
    printType === 'Black & White' || printType === 'B&W'
      ? 'Black & White'
      : printType === 'Color' || printType === 'Colour'
      ? 'Color'
      : null;
  const normalizedSides: PrintSides | null =
    sides === 'Back to Back' || sides === 'Back-to-Back'
      ? 'Back to Back'
      : sides === 'Single Side' || sides === 'Single-sided'
      ? 'Single Side'
      : null;

  return normalizedType && normalizedSides ? [normalizedType, normalizedSides] : null;
}

export function getShopServiceModeAccess(
  shop: Pick<
    PrintEnterprise,
    'apmEnabled' | 'softwareServiceEnabled' | 'apmMachineTypes'
  >
): ShopServiceModeAccess {
  const hasApmAccess = shop.apmEnabled === true;
  const hasSoftwareAccess = shop.softwareServiceEnabled !== false;
  const eligibility = getApmPrintModeEligibility(
    shop.apmMachineTypes
  );
  const hasConfiguredApmModes = Object.values(eligibility).some(sides =>
    Object.values(sides).some(Boolean)
  );

  return {
    hasApmAccess,
    hasSoftwareAccess,
    showModeSelector: hasApmAccess && hasSoftwareAccess && hasConfiguredApmModes,
    defaultMode: hasApmAccess && (hasConfiguredApmModes || !hasSoftwareAccess)
      ? 'Self-Service'
      : 'Counter'
  };
}

export function isServiceModePrintSettingEligible(
  mode: ShopServiceMode,
  pricingSettingsLoaded: boolean,
  pricingEligible: boolean,
  apmEligible: boolean
): boolean {
  return mode === 'Self-Service'
    ? apmEligible
    : !pricingSettingsLoaded || pricingEligible;
}

export function isBackToBackRestrictedByPageCount(
  mode: ShopServiceMode,
  isSinglePageSingleCopy: boolean
): boolean {
  return mode !== 'Self-Service' && isSinglePageSingleCopy;
}

export function getApmPrintModeEligibility(
  machineTypes: string[] | undefined
): Record<PrintType, Record<PrintSides, boolean>> {
  const eligibility: Record<PrintType, Record<PrintSides, boolean>> = {
    'Black & White': {
      'Single Side': false,
      'Back to Back': false
    },
    Color: {
      'Single Side': false,
      'Back to Back': false
    }
  };

  (machineTypes || []).forEach(machineType => {
    const type = normalizeMachineType(machineType);
    MACHINE_MODE_GRANTS[type]?.forEach(([printType, sides]) => {
      eligibility[printType][sides] = true;
    });
  });

  return eligibility;
}

export function isApmPrintModeEligible(
  machineTypes: string[] | undefined,
  printType: string,
  sides: string
): boolean {
  const mode = normalizePrintMode(printType, sides);
  return mode
    ? getApmPrintModeEligibility(machineTypes)[mode[0]][mode[1]]
    : false;
}

export function getApmPagePrice(
  machineTypes: string[] | undefined,
  pagePrices: Record<string, number> | undefined,
  printType: string,
  sides: string
): number | null {
  const mode = normalizePrintMode(printType, sides);
  if (!pagePrices || !mode || !isApmPrintModeEligible(machineTypes, printType, sides)) return null;

  for (const machineType of machineTypes || []) {
    const type = normalizeMachineType(machineType);
    const grants = MACHINE_MODE_GRANTS[type] || [];
    if (!grants.some(([grantedType, grantedSides]) =>
      grantedType === mode[0] && grantedSides === mode[1]
    )) {
      continue;
    }

    const price = pagePrices[type];
    if (typeof price === 'number' && Number.isFinite(price) && price >= 0) return price;
  }

  return null;
}
