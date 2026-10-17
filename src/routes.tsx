import type { ReactNode } from 'react';
import { ChromePdfPreviewView } from './components/preview/ChromePdfPreviewView';
import { PrintPerfectApp } from './components/layout/PrintPerfectApp';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'User Panel',
    path: '/',
    element: <PrintPerfectApp />,
    public: true,
  },
  {
    name: 'Print Preview',
    path: '/preview',
    element: <ChromePdfPreviewView />,
    public: true,
  }
];
