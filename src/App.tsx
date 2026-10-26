import React from 'react';
import { PrintPerfectProvider } from './contexts/PrintPerfectContext';
import { PrintPerfectApp } from './components/layout/PrintPerfectApp';
import { ChromePdfPreviewView } from './components/preview/ChromePdfPreviewView';
import { Toaster } from './components/ui/sonner';

const App: React.FC = () => {
  // Check if current route is /preview or query param view=preview
  const isPreviewRoute =
    window.location.pathname.startsWith('/preview') ||
    window.location.search.includes('view=preview');

  if (isPreviewRoute) {
    return (
      <PrintPerfectProvider>
        <ChromePdfPreviewView />
        <Toaster position="top-center" />
      </PrintPerfectProvider>
    );
  }

  return (
    <PrintPerfectProvider>
      <PrintPerfectApp />
      <Toaster position="top-center" />
    </PrintPerfectProvider>
  );
};

export default App;
