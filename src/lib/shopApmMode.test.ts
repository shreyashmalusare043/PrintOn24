import { describe, expect, it } from 'vitest';
import {
  getApmPagePrice,
  getApmPrintModeEligibility,
  getShopServiceModeAccess,
  isBackToBackRestrictedByPageCount,
  isServiceModePrintSettingEligible
} from './shopApmMode';

describe('shop APM mode', () => {
  it('shows the mode selector only when both services and an APM machine mode are enabled', () => {
    expect(getShopServiceModeAccess({
      apmEnabled: true,
      softwareServiceEnabled: true,
      apmMachineTypes: ['bw_duplex']
    })).toEqual({
      hasApmAccess: true,
      hasSoftwareAccess: true,
      showModeSelector: true,
      defaultMode: 'Self-Service'
    });

    expect(getShopServiceModeAccess({
      apmEnabled: false,
      softwareServiceEnabled: true,
      apmMachineTypes: []
    })).toMatchObject({
      showModeSelector: false,
      defaultMode: 'Counter'
    });
    expect(getShopServiceModeAccess({
      apmEnabled: false,
      softwareServiceEnabled: true,
      apmMachineTypes: ['bw_duplex']
    }).defaultMode).toBe('Counter');
  });

  it('routes single-service shops to their only enabled mode without a selector', () => {
    expect(getShopServiceModeAccess({
      apmEnabled: true,
      softwareServiceEnabled: false,
      apmMachineTypes: ['bw_duplex']
    })).toMatchObject({
      showModeSelector: false,
      defaultMode: 'Self-Service'
    });
    expect(getShopServiceModeAccess({
      apmEnabled: false,
      softwareServiceEnabled: true,
      apmMachineTypes: []
    }).showModeSelector).toBe(false);
  });

  it('enables only the machine types granted by Super Admin', () => {
    expect(getApmPrintModeEligibility(['bw_duplex'])).toEqual({
      'Black & White': {
        'Single Side': false,
        'Back to Back': true
      },
      Color: {
        'Single Side': false,
        'Back to Back': false
      }
    });

    expect(getApmPrintModeEligibility(['bw_single_side'])).toEqual({
      'Black & White': {
        'Single Side': true,
        'Back to Back': false
      },
      Color: {
        'Single Side': false,
        'Back to Back': false
      }
    });

    expect(getApmPrintModeEligibility(['bw_color_single_side'])).toEqual({
      'Black & White': {
        'Single Side': true,
        'Back to Back': false
      },
      Color: {
        'Single Side': true,
        'Back to Back': false
      }
    });
    expect(getApmPrintModeEligibility(['bw_color_duplex'])).toEqual({
      'Black & White': {
        'Single Side': false,
        'Back to Back': true
      },
      Color: {
        'Single Side': false,
        'Back to Back': true
      }
    });

    expect(getApmPrintModeEligibility(['unknown_mode', 'bw_custom_duplex'])).toEqual({
      'Black & White': {
        'Single Side': false,
        'Back to Back': false
      },
      Color: {
        'Single Side': false,
        'Back to Back': false
      }
    });
  });

  it('uses the granted APM machine price for the selected print mode', () => {
    const machineTypes = ['bw_duplex'];
    const pagePrices = {
      bw_duplex: 1,
      bw_single_side: 5
    };

    expect(getApmPagePrice(machineTypes, pagePrices, 'Black & White', 'Back to Back')).toBe(1);
    expect(getApmPagePrice(machineTypes, pagePrices, 'Black & White', 'Single Side')).toBeNull();
    expect(getApmPagePrice(machineTypes, undefined, 'Black & White', 'Back to Back')).toBeNull();
    expect(getApmPagePrice(
      ['bw_single_side'],
      { bw_single_side: 2 },
      'Black & White',
      'Single Side'
    )).toBe(2);
    expect(getApmPagePrice(
      ['bw_single_side'],
      { bw_single_side: 2 },
      'Black & White',
      'Back to Back'
    )).toBeNull();
  });

  it('uses APM eligibility for Self-Service and software pricing eligibility for Counter', () => {
    expect(isServiceModePrintSettingEligible('Self-Service', true, false, true)).toBe(true);
    expect(isServiceModePrintSettingEligible('Self-Service', true, true, false)).toBe(false);
    expect(isServiceModePrintSettingEligible('Counter', true, false, true)).toBe(false);
  });

  it('only applies the one-page duplex restriction in Counter mode', () => {
    expect(isBackToBackRestrictedByPageCount('Self-Service', true)).toBe(false);
    expect(isBackToBackRestrictedByPageCount('Counter', true)).toBe(true);
  });
});
