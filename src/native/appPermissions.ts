import { registerPlugin } from '@capacitor/core';

export type AndroidPermissionName = 'camera' | 'location' | 'notifications';
export type AndroidPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';

export type AndroidPermissionStatuses = Record<AndroidPermissionName, AndroidPermissionState>;

interface AppPermissionsPlugin {
  getPermissionStatuses(): Promise<AndroidPermissionStatuses>;
  requestPermission(options: { permission: AndroidPermissionName }): Promise<AndroidPermissionStatuses>;
  openAppSettings(): Promise<void>;
}

export const AppPermissions = registerPlugin<AppPermissionsPlugin>('AppPermissions');
