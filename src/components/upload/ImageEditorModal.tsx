import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  Crop,
  RotateCw,
  Sun,
  ImagePlus,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlignCenter,
  Trash2,
  X,
  Upload,
  Check,
  Smartphone,
  Monitor
} from 'lucide-react';
import type { ImageEditingState } from '../../types/printperfect';
import { toast } from 'sonner';
import { supabase } from '../../db/supabase';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName: string;
  initialEditing?: ImageEditingState;
  pageSize?: string;
  availablePageSizes?: string[];
  orientation?: 'Portrait' | 'Landscape';
  onOrientationChange?: (newOrientation: 'Portrait' | 'Landscape') => void;
  onPageSizeChange?: (newSize: string) => void;
  onApply: (
    editing: ImageEditingState,
    finalOutputUrl?: string,
    appliedPageSize?: string,
    appliedOrientation?: 'Portrait' | 'Landscape'
  ) => void;
}

export interface CanvasLayer {
  id: string;
  url: string;
  name: string;
  // Normalized position & dimensions inside printable area [0..100]
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage width
  height: number; // percentage height
  scale: number; // multiplier e.g. 1
  rotation: number; // 0, 90, 180, 270
  brightness: number; // 50 to 150, default 100
  contrast: number; // 50 to 150, default 100
  cropRect?: { x: number; y: number; width: number; height: number }; // normalized [0..1]
}

const PAGE_SPECS: Record<string, { w: number; h: number; label: string; printW: number; printH: number }> = {
  A4: { w: 210, h: 297, label: 'A4 (210 × 297 mm)', printW: 2480, printH: 3508 },
  A3: { w: 297, h: 420, label: 'A3 (297 × 420 mm)', printW: 3508, printH: 4960 },
  Letter: { w: 216, h: 279, label: 'Letter (8.5 × 11 in)', printW: 2550, printH: 3300 },
  Legal: { w: 216, h: 356, label: 'Legal (8.5 × 14 in)', printW: 2550, printH: 4200 },
  Bond: { w: 216, h: 279, label: 'Bond Paper (8.5 × 11 in)', printW: 2550, printH: 3300 },
  Executive: { w: 184, h: 267, label: 'Executive (7.25 × 10.5 in)', printW: 2175, printH: 3150 }
};

/**
 * Calculates optimal auto-fit layer dimensions and positioning for any uploaded image
 * to occupy the available paper canvas area while strictly preserving its original aspect ratio.
 * Eliminates unwanted distortion, excessive whitespace, and edge clipping.
 */
export const computeFittedLayerBounds = (
  imgNaturalWidth: number,
  imgNaturalHeight: number,
  canvasW: number,
  canvasH: number,
  marginPct = 2
): { x: number; y: number; width: number; height: number } => {
  const natW = imgNaturalWidth || 800;
  const natH = imgNaturalHeight || 600;
  const imgAspect = natW / natH;
  const paperAspect = canvasW / canvasH;

  const maxW = 100 - marginPct * 2; // e.g. 96%
  const maxH = 100 - marginPct * 2; // e.g. 96%

  let width: number;
  let height: number;

  if (imgAspect >= paperAspect) {
    // Image is wider than paper (relative to height) -> fit to available width
    width = maxW;
    height = (width * canvasW) / (canvasH * imgAspect);
  } else {
    // Image is taller than paper -> fit to available height
    height = maxH;
    width = (height * canvasH * imgAspect) / canvasW;
  }

  width = Math.max(10, Math.min(100, Math.round(width * 10) / 10));
  height = Math.max(10, Math.min(100, Math.round(height * 10) / 10));

  const x = Math.max(0, Math.round(((100 - width) / 2) * 10) / 10);
  const y = Math.max(0, Math.round(((100 - height) / 2) * 10) / 10);

  return { x, y, width, height };
};

/**
 * Calculates simultaneous non-overlapping layout slots for 1 to 4 images
 * on any selected paper canvas (A3, A4, Letter, etc.).
 */
export const getMultiImageSlots = (count: number): Array<{ x: number; y: number; width: number; height: number }> => {
  switch (count) {
    case 1:
      return [{ x: 5, y: 5, width: 90, height: 90 }];
    case 2:
      // Stacked top & bottom with comfortable height and full visibility
      return [
        { x: 5, y: 4, width: 90, height: 44 },
        { x: 5, y: 52, width: 90, height: 44 }
      ];
    case 3:
      // 2 on top, 1 centered on bottom
      return [
        { x: 4, y: 4, width: 44, height: 44 },
        { x: 52, y: 4, width: 44, height: 44 },
        { x: 28, y: 52, width: 44, height: 44 }
      ];
    case 4:
      // 2x2 grid
      return [
        { x: 4, y: 4, width: 44, height: 44 },
        { x: 52, y: 4, width: 44, height: 44 },
        { x: 4, y: 52, width: 44, height: 44 },
        { x: 52, y: 52, width: 44, height: 44 }
      ];
    default:
      return [{ x: 5, y: 5, width: 90, height: 90 }];
  }
};

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  fileName,
  initialEditing,
  pageSize = 'A4',
  availablePageSizes = ['A4', 'A3', 'Letter', 'Legal', 'Bond', 'Executive'],
  orientation: initialOrientation = 'Portrait',
  onOrientationChange,
  onPageSizeChange,
  onApply
}) => {
  // Navigation Tabs: Canvas, Crop, Rotate, Adjust, Images on Canvas
  const [activeTab, setActiveTab] = useState<'canvas' | 'crop' | 'rotate' | 'adjust' | 'images'>('canvas');
  const [currentPageSize, setCurrentPageSize] = useState<string>(pageSize || 'A4');
  const [orientation, setOrientation] = useState<'Portrait' | 'Landscape'>(
    initialOrientation || 'Portrait'
  );
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Sync orientation prop if changed outside
  useEffect(() => {
    if (initialOrientation && initialOrientation !== orientation) {
      setOrientation(initialOrientation);
    }
  }, [initialOrientation]);

  // Canvas Paper Reference for coordinate calculation
  const paperRef = useRef<HTMLDivElement>(null);
  const layerDomRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Multi-image layers (up to 4 images supported on single canvas)
  const [layers, setLayers] = useState<CanvasLayer[]>([
    {
      id: 'layer_1',
      url: imageUrl,
      name: fileName || 'Image 1',
      x: 5,
      y: 5,
      width: 90,
      height: 90,
      scale: 1,
      rotation: initialEditing?.rotation || 0,
      brightness: initialEditing?.brightness ? Math.round(100 + initialEditing.brightness * 50) : 100,
      contrast: initialEditing?.contrast ? Math.round(100 + initialEditing.contrast * 50) : 100,
      cropRect: initialEditing?.cropBox
        ? {
            x: initialEditing.cropBox.left / 100,
            y: initialEditing.cropBox.top / 100,
            width: initialEditing.cropBox.width / 100,
            height: initialEditing.cropBox.height / 100
          }
        : undefined
    }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('layer_1');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active layer shortcut
  const activeLayer = layers.find(l => l.id === activeLayerId) || layers[0];

  // Helper to update active layer properties in React state
  const updateActiveLayer = useCallback((updates: Partial<CanvasLayer>) => {
    setLayers(prev =>
      prev.map(l => (l.id === (activeLayerId || prev[0]?.id) ? { ...l, ...updates } : l))
    );
  }, [activeLayerId]);

  // Sync prop changes
  useEffect(() => {
    if (pageSize && pageSize !== currentPageSize) {
      setCurrentPageSize(pageSize);
    }
  }, [pageSize]);

  // Sync imageUrl and active document into editor layers with auto-fit preserving proportions
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        const isLand = orientation === 'Landscape';
        const spec = PAGE_SPECS[currentPageSize] || PAGE_SPECS.A4;
        const curCanvasW = isLand ? spec.printH : spec.printW;
        const curCanvasH = isLand ? spec.printW : spec.printH;

        const savedPos = initialEditing?.position;
        const bounds = savedPos || computeFittedLayerBounds(
          img.naturalWidth,
          img.naturalHeight,
          curCanvasW,
          curCanvasH
        );

        setLayers(prev => {
          if (initialEditing?.layers && initialEditing.layers.length > 0 && prev.length === 0) {
            return initialEditing.layers;
          }
          if (prev.length === 0 || prev[0].url !== imageUrl) {
            return [{
              id: 'layer_1',
              url: imageUrl,
              name: fileName || 'Image 1',
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              scale: savedPos?.scale ?? 1,
              rotation: initialEditing?.rotation || 0,
              brightness: initialEditing?.brightness ? Math.round(100 + initialEditing.brightness * 50) : 100,
              contrast: initialEditing?.contrast ? Math.round(100 + initialEditing.contrast * 50) : 100,
              cropRect: initialEditing?.cropBox
                ? {
                    x: initialEditing.cropBox.left / 100,
                    y: initialEditing.cropBox.top / 100,
                    width: initialEditing.cropBox.width / 100,
                    height: initialEditing.cropBox.height / 100
                  }
                : undefined
            }];
          }
          return prev.map((l, idx) =>
            idx === 0
              ? {
                  ...l,
                  url: imageUrl,
                  name: fileName || l.name,
                  x: savedPos ? l.x : bounds.x,
                  y: savedPos ? l.y : bounds.y,
                  width: savedPos ? l.width : bounds.width,
                  height: savedPos ? l.height : bounds.height
                }
              : l
          );
        });
      };
      img.src = imageUrl;
    }
  }, [imageUrl, fileName, isOpen, orientation, currentPageSize]);

  // ==========================================
  // LAG-FREE DRAGGING & CORNER RESIZING
  // ==========================================
  const dragRef = useRef<{
    isDragging: boolean;
    canDrag: boolean;
    hasMoved: boolean;
    layerId: string;
    startX: number;
    startY: number;
    origX: number; // percentage
    origY: number; // percentage
    deltaX: number;
    deltaY: number;
    paperWidth: number;
    paperHeight: number;
  }>({
    isDragging: false,
    canDrag: false,
    hasMoved: false,
    layerId: '',
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    deltaX: 0,
    deltaY: 0,
    paperWidth: 1,
    paperHeight: 1
  });

  const resizeRef = useRef<{
    isResizing: boolean;
    layerId: string;
    handle: 'se' | 'sw' | 'ne' | 'nw';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    paperWidth: number;
    paperHeight: number;
  }>({
    isResizing: false,
    layerId: '',
    handle: 'se',
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: 0,
    origH: 0,
    paperWidth: 1,
    paperHeight: 1
  });

  const handleLayerMouseDown = (layerId: string, e: React.MouseEvent | React.TouchEvent) => {
    // Interaction rule: One click selects the image. If not already selected, select it without dragging.
    const isAlreadySelected = activeLayerId === layerId;
    setActiveLayerId(layerId);
    const target = layers.find(l => l.id === layerId);
    if (!target) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const paperRect = paperRef.current?.getBoundingClientRect();
    const paperW = paperRect?.width || 280;
    const paperH = paperRect?.height || 380;

    dragRef.current = {
      isDragging: false,
      canDrag: true,
      hasMoved: false,
      layerId,
      startX: clientX,
      startY: clientY,
      origX: target.x,
      origY: target.y,
      deltaX: 0,
      deltaY: 0,
      paperWidth: paperW,
      paperHeight: paperH
    };

    e.stopPropagation();
  };

  const handleResizeMouseDown = (
    layerId: string,
    handle: 'se' | 'sw' | 'ne' | 'nw',
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    setActiveLayerId(layerId);
    const target = layers.find(l => l.id === layerId);
    if (!target) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const paperRect = paperRef.current?.getBoundingClientRect();
    const paperW = paperRect?.width || 280;
    const paperH = paperRect?.height || 380;

    resizeRef.current = {
      isResizing: true,
      layerId,
      handle,
      startX: clientX,
      startY: clientY,
      origX: target.x,
      origY: target.y,
      origW: target.width,
      origH: target.height,
      paperWidth: paperW,
      paperHeight: paperH
    };
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Safety check: Disable any automatic movement if cursor merely hovers with no mouse button pressed
    if ('buttons' in e && e.buttons === 0 && !('touches' in e)) {
      if (dragRef.current.isDragging || resizeRef.current.isResizing) {
        handleCanvasMouseUp();
      }
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (resizeRef.current.isResizing) {
      const { layerId, handle, startX, startY, origX, origY, origW, origH, paperWidth, paperHeight } =
        resizeRef.current;
      const dx = clientX - startX;
      const dy = clientY - startY;
      const pctDx = (dx / paperWidth) * 100;
      const pctDy = (dy / paperHeight) * 100;

      setLayers(prev =>
        prev.map(l => {
          if (l.id !== layerId) return l;

          let newX = origX;
          let newY = origY;
          let newW = origW;
          let newH = origH;

          // Proportional corner resizing preserving original image aspect ratio
          const origAspect = (origW * paperWidth) / (origH * paperHeight) || 1;

          if (handle === 'se') {
            newW = Math.max(10, Math.min(100 - origX, origW + pctDx));
            const neededPhysicalH = ((newW / 100) * paperWidth) / origAspect;
            newH = Math.max(10, Math.min(100 - origY, (neededPhysicalH / paperHeight) * 100));
          } else if (handle === 'sw') {
            const potentialW = Math.max(10, Math.min(origX + origW, origW - pctDx));
            newX = origX + (origW - potentialW);
            newW = potentialW;
            const neededPhysicalH = ((newW / 100) * paperWidth) / origAspect;
            newH = Math.max(10, Math.min(100 - origY, (neededPhysicalH / paperHeight) * 100));
          } else if (handle === 'ne') {
            newW = Math.max(10, Math.min(100 - origX, origW + pctDx));
            const neededPhysicalH = ((newW / 100) * paperWidth) / origAspect;
            const potentialH = Math.max(10, Math.min(origY + origH, (neededPhysicalH / paperHeight) * 100));
            newY = origY + (origH - potentialH);
            newH = potentialH;
          } else if (handle === 'nw') {
            const potentialW = Math.max(10, Math.min(origX + origW, origW - pctDx));
            newX = origX + (origW - potentialW);
            newW = potentialW;
            const neededPhysicalH = ((newW / 100) * paperWidth) / origAspect;
            const potentialH = Math.max(10, Math.min(origY + origH, (neededPhysicalH / paperHeight) * 100));
            newY = origY + (origH - potentialH);
            newH = potentialH;
          }

          return {
            ...l,
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10,
            width: Math.round(newW * 10) / 10,
            height: Math.round(newH * 10) / 10
          };
        })
      );
      return;
    }

    if (!dragRef.current.canDrag || !dragRef.current.layerId) return;

    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    const dist = Math.hypot(dx, dy);

    // Require intentional movement threshold of at least 4 pixels before dragging to avoid click jitter
    if (!dragRef.current.isDragging) {
      if (dist < 4) return;
      dragRef.current.isDragging = true;
    }

    dragRef.current.hasMoved = true;
    dragRef.current.deltaX = dx;
    dragRef.current.deltaY = dy;

    // Direct DOM manipulation during drag for 120fps buttery smoothness
    const el = layerDomRefs.current[dragRef.current.layerId];
    if (el) {
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
  }, []);

  const handleCanvasMouseUp = useCallback(() => {
    if (resizeRef.current.isResizing) {
      resizeRef.current.isResizing = false;
    }

    const { layerId, origX, origY, deltaX, deltaY, paperWidth, paperHeight, hasMoved } = dragRef.current;
    dragRef.current.isDragging = false;
    dragRef.current.canDrag = false;
    dragRef.current.hasMoved = false;

    if (!layerId) return;

    // Reset inline DOM transform
    const el = layerDomRefs.current[layerId];
    if (el) {
      el.style.transform = '';
    }

    if (!hasMoved) return;

    // Convert pixel delta to percentage of paper
    const pctX = (deltaX / paperWidth) * 100;
    const pctY = (deltaY / paperHeight) * 100;

    setLayers(prev =>
      prev.map(l => {
        if (l.id === layerId) {
          const newX = Math.max(0, Math.min(100 - l.width, origX + pctX));
          const newY = Math.max(0, Math.min(100 - l.height, origY + pctY));
          return {
            ...l,
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10
          };
        }
        return l;
      })
    );
  }, []);

  // Window-level mouseup/touchend listener for robust drag release
  useEffect(() => {
    const onWindowUp = () => {
      if (dragRef.current.isDragging) {
        handleCanvasMouseUp();
      }
    };
    window.addEventListener('mouseup', onWindowUp);
    window.addEventListener('touchend', onWindowUp);
    return () => {
      window.removeEventListener('mouseup', onWindowUp);
      window.removeEventListener('touchend', onWindowUp);
    };
  }, [handleCanvasMouseUp]);

  // When switching to Crop tab, initialize cropBox to active layer's exact bounds
  useEffect(() => {
    if (activeTab === 'crop' && activeLayer) {
      setCropBox({
        x: Math.round(activeLayer.x),
        y: Math.round(activeLayer.y),
        width: Math.round(activeLayer.width),
        height: Math.round(activeLayer.height)
      });
    }
  }, [activeTab, activeLayer?.id]);

  // ==========================================
  // CROP TAB 8-HANDLE BOX & REAL CROP LOGIC
  // ==========================================
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 5,
    y: 5,
    width: 90,
    height: 90
  });
  const [cropDragging, setCropDragging] = useState<string | null>(null);
  const cropDragStartRef = useRef<{ clientX: number; clientY: number; box: typeof cropBox }>({
    clientX: 0,
    clientY: 0,
    box: { x: 5, y: 5, width: 90, height: 90 }
  });

  const handleCropMouseDown = (handle: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setCropDragging(handle);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    cropDragStartRef.current = {
      clientX,
      clientY,
      box: { ...cropBox }
    };
  };

  const handleCropMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!cropDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const paperRect = paperRef.current?.getBoundingClientRect();
    const paperW = paperRect?.width || 280;
    const paperH = paperRect?.height || 380;

    const dx = ((clientX - cropDragStartRef.current.clientX) / paperW) * 100;
    const dy = ((clientY - cropDragStartRef.current.clientY) / paperH) * 100;
    const { box } = cropDragStartRef.current;

    let newX = box.x;
    let newY = box.y;
    let newW = box.width;
    let newH = box.height;
    const minSize = 10;

    if (cropDragging === 'move') {
      newX = Math.max(0, Math.min(100 - box.width, box.x + dx));
      newY = Math.max(0, Math.min(100 - box.height, box.y + dy));
    } else {
      if (cropDragging.includes('w')) {
        const delta = Math.min(dx, box.width - minSize);
        newX = Math.max(0, box.x + delta);
        newW = box.width - (newX - box.x);
      }
      if (cropDragging.includes('e')) {
        newW = Math.max(minSize, Math.min(100 - box.x, box.width + dx));
      }
      if (cropDragging.includes('n')) {
        const delta = Math.min(dy, box.height - minSize);
        newY = Math.max(0, box.y + delta);
        newH = box.height - (newY - box.y);
      }
      if (cropDragging.includes('s')) {
        newH = Math.max(minSize, Math.min(100 - box.y, box.height + dy));
      }
    }

    setCropBox({
      x: Math.round(newX),
      y: Math.round(newY),
      width: Math.round(newW),
      height: Math.round(newH)
    });
  };

  const handleCropMouseUp = () => {
    setCropDragging(null);
  };

  // Real crop application: crops only the selected boundary and places it at exact position without auto-zoom or enlargement
  const handleApplyCrop = async () => {
    if (!activeLayer) return;
    try {
      const img = new Image();
      if (activeLayer.url.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for cropping'));
        img.src = activeLayer.url;
      });

      const natW = img.naturalWidth || 800;
      const natH = img.naturalHeight || 800;

      // Calculate relative crop coordinates within the active layer
      const layerLeft = activeLayer.x;
      const layerTop = activeLayer.y;
      const layerWidth = activeLayer.width || 1;
      const layerHeight = activeLayer.height || 1;

      // Clamp cropBox coordinates to within activeLayer
      const cropLeft = Math.max(layerLeft, cropBox.x);
      const cropTop = Math.max(layerTop, cropBox.y);
      const cropRight = Math.min(layerLeft + layerWidth, cropBox.x + cropBox.width);
      const cropBottom = Math.min(layerTop + layerHeight, cropBox.y + cropBox.height);

      const actualCropW = Math.max(5, cropRight - cropLeft);
      const actualCropH = Math.max(5, cropBottom - cropTop);

      // Relative fraction of the natural image to crop out
      const relX = Math.max(0, (cropLeft - layerLeft) / layerWidth);
      const relY = Math.max(0, (cropTop - layerTop) / layerHeight);
      const relW = Math.min(1 - relX, actualCropW / layerWidth);
      const relH = Math.min(1 - relY, actualCropH / layerHeight);

      const srcX = Math.max(0, Math.round(relX * natW));
      const srcY = Math.max(0, Math.round(relY * natH));
      const srcW = Math.max(10, Math.min(natW - srcX, Math.round(relW * natW)));
      const srcH = Math.max(10, Math.min(natH - srcY, Math.round(relH * natH)));

      const offCanvas = document.createElement('canvas');
      offCanvas.width = srcW;
      offCanvas.height = srcH;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) {
        toast.error('Crop processing failed');
        return;
      }

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      const croppedDataUrl = offCanvas.toDataURL('image/jpeg', 0.95);

      // CRITICAL: Set layer position and dimension to EXACTLY the cropped bounding box on the paper!
      // Content outside the crop boundary is removed, with NO auto-zooming, enlargement, or distortion!
      updateActiveLayer({
        url: croppedDataUrl,
        x: Math.round(cropLeft * 10) / 10,
        y: Math.round(cropTop * 10) / 10,
        width: Math.round(actualCropW * 10) / 10,
        height: Math.round(actualCropH * 10) / 10,
        cropRect: undefined,
        scale: 1
      });

      setActiveTab('canvas');
      toast.success('Crop applied! Preserved exact cropped dimensions with zero distortion.');
    } catch (e) {
      console.error('Error applying crop:', e);
      toast.error('Failed to crop image.');
    }
  };

  // ==========================================
  // SCALE, ROTATION, CENTERING
  // ==========================================
  const handleScaleChange = (newScale: number) => {
    const clamped = Math.max(0.2, Math.min(2.5, Math.round(newScale * 100) / 100));
    updateActiveLayer({ scale: clamped });
  };

  const handleCenter = () => {
    if (!activeLayer) return;
    const newX = Math.max(0, (100 - activeLayer.width) / 2);
    const newY = Math.max(0, (100 - activeLayer.height) / 2);
    updateActiveLayer({ x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
  };

  const handleFitToPage = () => {
    if (!activeLayer) return;
    const img = new Image();
    img.onload = () => {
      const isLand = orientation === 'Landscape';
      const spec = PAGE_SPECS[currentPageSize] || PAGE_SPECS.A4;
      const curCanvasW = isLand ? spec.printH : spec.printW;
      const curCanvasH = isLand ? spec.printW : spec.printH;

      const bounds = computeFittedLayerBounds(
        img.naturalWidth,
        img.naturalHeight,
        curCanvasW,
        curCanvasH
      );

      updateActiveLayer({
        ...bounds,
        scale: 1,
        rotation: 0
      });
      toast.success('Fitted image to paper canvas preserving original proportions');
    };
    img.src = activeLayer.url;
  };

  const handleOrientationSwitch = (newOrient: 'Portrait' | 'Landscape') => {
    if (newOrient === orientation) return;
    setOrientation(newOrient);
    onOrientationChange?.(newOrient);

    const isLand = newOrient === 'Landscape';
    const spec = PAGE_SPECS[currentPageSize] || PAGE_SPECS.A4;
    const newCanvasW = isLand ? spec.printH : spec.printW;
    const newCanvasH = isLand ? spec.printW : spec.printH;

    if (activeLayer) {
      const img = new Image();
      img.onload = () => {
        const bounds = computeFittedLayerBounds(
          img.naturalWidth,
          img.naturalHeight,
          newCanvasW,
          newCanvasH
        );
        updateActiveLayer({
          ...bounds,
          scale: 1
        });
      };
      img.src = activeLayer.url;
    }
  };

  const handlePageSizeSwitch = (newSize: string) => {
    setCurrentPageSize(newSize);
    onPageSizeChange?.(newSize);

    const isLand = orientation === 'Landscape';
    const spec = PAGE_SPECS[newSize] || PAGE_SPECS.A4;
    const newCanvasW = isLand ? spec.printH : spec.printW;
    const newCanvasH = isLand ? spec.printW : spec.printH;

    if (activeLayer) {
      const img = new Image();
      img.onload = () => {
        const bounds = computeFittedLayerBounds(
          img.naturalWidth,
          img.naturalHeight,
          newCanvasW,
          newCanvasH
        );
        updateActiveLayer({
          ...bounds,
          scale: 1
        });
      };
      img.src = activeLayer.url;
    }
  };

  const handleRotate = (angleDelta: number) => {
    if (!activeLayer) return;
    const nextAngle = (activeLayer.rotation + angleDelta + 360) % 360;
    updateActiveLayer({ rotation: nextAngle });
  };

  // ==========================================
  // MULTI-IMAGE MANAGEMENT (UP TO 4 IMAGES)
  // ==========================================
  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (layers.length >= 4) {
      toast.error('Maximum 4 images allowed per canvas.');
      return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt.target?.result as string;
      if (!dataUrl) return;

      const newId = `layer_${Date.now()}`;
      const newCount = layers.length + 1;
      const slots = getMultiImageSlots(newCount);

      const newLayer: CanvasLayer = {
        id: newId,
        url: dataUrl,
        name: file.name.replace(/\.[^/.]+$/, ''),
        x: slots[slots.length - 1].x,
        y: slots[slots.length - 1].y,
        width: slots[slots.length - 1].width,
        height: slots[slots.length - 1].height,
        scale: 1,
        rotation: 0,
        brightness: 100,
        contrast: 100
      };

      // Simultaneously layout all images into non-overlapping clean slots
      setLayers(prev => {
        const updated = prev.map((l, idx) => ({
          ...l,
          x: slots[idx]?.x ?? l.x,
          y: slots[idx]?.y ?? l.y,
          width: slots[idx]?.width ?? l.width,
          height: slots[idx]?.height ?? l.height
        }));
        return [...updated, newLayer];
      });

      setActiveLayerId(newId);
      toast.success(`Image added! All ${newCount} images now active on canvas.`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLayer = (idToRemove: string) => {
    if (layers.length <= 1) {
      toast.error('At least one image must remain on the canvas.');
      return;
    }
    setLayers(prev => {
      const filtered = prev.filter(l => l.id !== idToRemove);
      const slots = getMultiImageSlots(filtered.length);
      const rearranged = filtered.map((l, idx) => ({
        ...l,
        x: slots[idx]?.x ?? l.x,
        y: slots[idx]?.y ?? l.y,
        width: slots[idx]?.width ?? l.width,
        height: slots[idx]?.height ?? l.height
      }));
      if (activeLayerId === idToRemove && rearranged.length > 0) {
        setActiveLayerId(rearranged[0].id);
      }
      return rearranged;
    });
  };

  // Auto-arrange all 1 to 4 images into clean non-overlapping grid on the canvas
  const handleAutoArrangeGrid = () => {
    if (layers.length === 0) return;
    const slots = getMultiImageSlots(layers.length);
    setLayers(prev =>
      prev.map((l, idx) => ({
        ...l,
        x: slots[idx]?.x ?? l.x,
        y: slots[idx]?.y ?? l.y,
        width: slots[idx]?.width ?? l.width,
        height: slots[idx]?.height ?? l.height,
        scale: 1,
        rotation: 0
      }))
    );
  };

  // Reset current active layer
  const handleReset = () => {
    updateActiveLayer({
      x: 5,
      y: 5,
      width: 90,
      height: 90,
      scale: 1,
      rotation: 0,
      brightness: 100,
      contrast: 100,
      cropRect: undefined
    });
    setCropBox({ x: 5, y: 5, width: 90, height: 90 });
  };

  // ==========================================
  // APPLY HIGH-RES PRINT COMPOSITE
  // ==========================================
  const handleApplyAllEdits = async () => {
    if (!activeLayer) return;
    try {
      setIsApplying(true);
      const specs = PAGE_SPECS[currentPageSize] || PAGE_SPECS.A4;
      const isLand = orientation === 'Landscape';
      const printTotalW = isLand ? specs.printH : specs.printW;
      const printTotalH = isLand ? specs.printW : specs.printH;

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = printTotalW;
      offscreenCanvas.height = printTotalH;
      const ctx = offscreenCanvas.getContext('2d');

      if (!ctx) {
        toast.error('Could not initialize canvas context.');
        setIsApplying(false);
        return;
      }

      // Fill pure white page background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, printTotalW, printTotalH);

      // Draw all layers in order directly mapped from 0..100% canvas coordinates
      for (const layer of layers) {
        await new Promise<void>(resolve => {
          const img = new Image();
          if (layer.url.startsWith('http')) {
            img.crossOrigin = 'anonymous';
          }
          img.onload = () => {
            ctx.save();

            const destX = (layer.x / 100) * printTotalW;
            const destY = (layer.y / 100) * printTotalH;
            const destW = (layer.width / 100) * printTotalW;
            const destH = (layer.height / 100) * printTotalH;

            let srcX = 0;
            let srcY = 0;
            let srcW = img.naturalWidth;
            let srcH = img.naturalHeight;

            if (layer.cropRect) {
              srcX = layer.cropRect.x * img.naturalWidth;
              srcY = layer.cropRect.y * img.naturalHeight;
              srcW = layer.cropRect.width * img.naturalWidth;
              srcH = layer.cropRect.height * img.naturalHeight;
            }

            // Adjust brightness & contrast filter
            ctx.filter = `brightness(${layer.brightness}%) contrast(${layer.contrast}%)`;

            // Transform origin for rotation & scale
            const centerX = destX + destW / 2;
            const centerY = destY + destH / 2;

            ctx.translate(centerX, centerY);
            if (layer.rotation !== 0) {
              ctx.rotate((layer.rotation * Math.PI) / 180);
            }
            if (layer.scale !== 1) {
              ctx.scale(layer.scale, layer.scale);
            }

            // Draw image centered at origin
            ctx.drawImage(img, srcX, srcY, srcW, srcH, -destW / 2, -destH / 2, destW, destH);
            ctx.restore();
            resolve();
          };
          img.onerror = () => {
            console.warn('Failed to load layer image for composite:', layer.name);
            resolve();
          };
          img.src = layer.url;
        });
      }

      const finalDataUrl = offscreenCanvas.toDataURL('image/jpeg', 0.95);
      let finalOutputUrl = finalDataUrl;

      // Upload composite to Supabase Storage if possible
      try {
        const blob = await new Promise<Blob | null>(res => offscreenCanvas.toBlob(res, 'image/jpeg', 0.95));
        if (blob) {
          const storagePath = `edited_composites/${Date.now()}_composite.jpg`;
          const { error: upErr } = await supabase.storage.from('print_documents').upload(storagePath, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('print_documents').getPublicUrl(storagePath);
            if (urlData?.publicUrl) {
              finalOutputUrl = urlData.publicUrl;
            }
          }
        }
      } catch (uploadErr) {
        console.warn('Composite storage upload fallback to dataUrl:', uploadErr);
      }

      const editingStateResult: ImageEditingState = {
        brightness: (activeLayer.brightness - 100) / 50,
        contrast: (activeLayer.contrast - 100) / 50,
        saturation: 0,
        hue: 0,
        rotation: activeLayer.rotation,
        straighten: 0,
        perspectiveX: 0,
        perspectiveY: 0,
        grayscale: false,
        cropRatio: 'Original',
        cropBox: activeLayer.cropRect
          ? {
              top: activeLayer.cropRect.y * 100,
              left: activeLayer.cropRect.x * 100,
              width: activeLayer.cropRect.width * 100,
              height: activeLayer.cropRect.height * 100
            }
          : { top: 0, left: 0, width: 100, height: 100 },
        position: {
          x: activeLayer.x,
          y: activeLayer.y,
          width: activeLayer.width,
          height: activeLayer.height,
          scale: activeLayer.scale
        },
        canvasDimensions: {
          width: printTotalW,
          height: printTotalH,
          paperSize: currentPageSize,
          orientation: orientation
        },
        layers: layers,
        fitToPage: true
      };

      onApply(editingStateResult, finalOutputUrl, currentPageSize, orientation);
      toast.success('Edits applied successfully to print document!');
      onClose();
    } catch (err) {
      console.error('Error applying image edits:', err);
      toast.error('Failed to generate high-resolution print composite.');
    } finally {
      setIsApplying(false);
    }
  };

  const pageSpec = PAGE_SPECS[currentPageSize] || PAGE_SPECS.A4;
  const isLandscape = orientation === 'Landscape';
  const canvasW = isLandscape ? pageSpec.printH : pageSpec.printW;
  const canvasH = isLandscape ? pageSpec.printW : pageSpec.printH;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in-50">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        {/* Header Bar - Light Theme */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-50 text-[#FF1300] border border-red-200 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 font-heading truncate">
                Print Canvas Editor
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {(activeLayer?.name) || fileName || 'Image 1'} ({currentPageSize} • {orientation}) • {layers.length}/4 Images
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Orientation Switch: Portrait & Landscape Options (Requirement 1 & 3) */}
            <div className="flex items-center bg-slate-200/90 p-0.5 rounded-xl border border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => handleOrientationSwitch('Portrait')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  orientation === 'Portrait'
                    ? 'bg-white text-[#FF1300] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Portrait Canvas"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => handleOrientationSwitch('Landscape')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  orientation === 'Landscape'
                    ? 'bg-white text-[#FF1300] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Landscape Canvas"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Landscape</span>
              </button>
            </div>

            {/* Paper Size Selector */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs shadow-xs">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Size:</span>
              <select
                value={currentPageSize}
                onChange={e => handlePageSizeSwitch(e.target.value)}
                className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                {availablePageSizes.map(size => (
                  <option key={size} value={size} className="bg-white text-slate-800">
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close Editor"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row items-stretch">
          {/* Left Canvas Preview Area: Scaled to fit available space without hidden parts */}
          <div
            className="flex-1 bg-slate-100/90 p-3 sm:p-6 flex items-center justify-center relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-200 min-h-[300px] mt-[0px] mb-[0px]"
            onMouseMove={handleCanvasMouseMove}
            onTouchMove={handleCanvasMouseMove}
          >
            {/* Paper Container: Perfectly fit inside viewport with proportional aspect-ratio */}
            <div
              ref={paperRef}
              style={{
                aspectRatio: `${canvasW} / ${canvasH}`,
                width: isLandscape ? 'min(100%, 640px)' : 'auto',
                height: isLandscape ? 'auto' : 'min(52vh, 460px)',
                maxWidth: 'calc(100% - 1.5rem)',
                maxHeight: 'min(52vh, 460px)'
              }}
              className="relative bg-white text-slate-900 rounded-xs shadow-2xl border border-slate-300 transition-all select-none overflow-hidden mx-auto my-auto shrink-0"
            >
              {/* Printable boundary guide (subtle dashed line) */}
              <div className="absolute inset-2 border border-dashed border-red-300 pointer-events-none z-20 opacity-70">
                <span className="absolute bottom-1 right-1 text-[8px] font-mono text-red-500 font-bold bg-white/80 px-1 rounded">
                  Print Area
                </span>
              </div>

              {/* Render All Layers on Canvas */}
              {layers.map((layer, index) => {
                const isSelected = layer.id === activeLayerId;
                return (
                  <div
                    key={layer.id}
                    ref={el => { layerDomRefs.current[layer.id] = el; }}
                    onMouseDown={e => handleLayerMouseDown(layer.id, e)}
                    onTouchStart={e => handleLayerMouseDown(layer.id, e)}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      width: `${layer.width}%`,
                      height: `${layer.height}%`,
                      cursor: isSelected ? 'move' : 'pointer',
                      zIndex: isSelected ? 20 : 10 + index,
                      willChange: 'transform'
                    }}
                    className={`absolute transition-shadow group ${
                      isSelected
                        ? 'ring-2 ring-[#FF1300] ring-offset-2 ring-offset-white shadow-xl'
                        : 'opacity-95 hover:opacity-100 ring-1 ring-slate-300/80 hover:ring-slate-400'
                    }`}
                  >
                    <div
                      style={{
                        transform: `rotate(${layer.rotation}deg) scale(${layer.scale})`,
                        filter: `brightness(${layer.brightness}%) contrast(${layer.contrast}%)`,
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden'
                      }}
                      className="w-full h-full flex items-center justify-center bg-transparent relative"
                    >
                      <img
                        src={layer.url}
                        alt={layer.name}
                        className="w-full h-full object-contain pointer-events-none select-none"
                        style={
                          layer.cropRect
                            ? {
                                clipPath: `polygon(${layer.cropRect.x * 100}% ${layer.cropRect.y * 100}%, ${(layer.cropRect.x + layer.cropRect.width) * 100}% ${layer.cropRect.y * 100}%, ${(layer.cropRect.x + layer.cropRect.width) * 100}% ${(layer.cropRect.y + layer.cropRect.height) * 100}%, ${layer.cropRect.x * 100}% ${(layer.cropRect.y + layer.cropRect.height) * 100}%)`
                              }
                            : undefined
                        }
                      />
                    </div>

                    {/* Image indicator badge */}
                    <div className="absolute top-1 left-1 pointer-events-none z-30">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs ${
                        isSelected ? 'bg-[#FF1300] text-white' : 'bg-black/60 text-white/90'
                      }`}>
                        #{index + 1}
                      </span>
                    </div>

                    {/* Corner Resize Handles when Selected: Touch-friendly 24px target */}
                    {isSelected && (
                      <>
                        <div
                          onMouseDown={e => handleResizeMouseDown(layer.id, 'nw', e)}
                          onTouchStart={e => handleResizeMouseDown(layer.id, 'nw', e)}
                          className="absolute -top-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-40 touch-none select-none"
                          title="Resize (Top-Left)"
                        >
                          <div className="w-3.5 h-3.5 bg-[#FF1300] border-2 border-white rounded-full shadow-md" />
                        </div>
                        <div
                          onMouseDown={e => handleResizeMouseDown(layer.id, 'ne', e)}
                          onTouchStart={e => handleResizeMouseDown(layer.id, 'ne', e)}
                          className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-40 touch-none select-none"
                          title="Resize (Top-Right)"
                        >
                          <div className="w-3.5 h-3.5 bg-[#FF1300] border-2 border-white rounded-full shadow-md" />
                        </div>
                        <div
                          onMouseDown={e => handleResizeMouseDown(layer.id, 'sw', e)}
                          onTouchStart={e => handleResizeMouseDown(layer.id, 'sw', e)}
                          className="absolute -bottom-3 -left-3 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-40 touch-none select-none"
                          title="Resize (Bottom-Left)"
                        >
                          <div className="w-3.5 h-3.5 bg-[#FF1300] border-2 border-white rounded-full shadow-md" />
                        </div>
                        <div
                          onMouseDown={e => handleResizeMouseDown(layer.id, 'se', e)}
                          onTouchStart={e => handleResizeMouseDown(layer.id, 'se', e)}
                          className="absolute -bottom-3 -right-3 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-40 touch-none select-none"
                          title="Resize (Bottom-Right)"
                        >
                          <div className="w-3.5 h-3.5 bg-[#FF1300] border-2 border-white rounded-full shadow-md" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Crop Mode Overlay: 8-handle crop box */}
              {activeTab === 'crop' && (
                <div
                  className="absolute inset-0 z-30 bg-black/40"
                  onMouseMove={handleCropMouseMove}
                  onTouchMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  onTouchEnd={handleCropMouseUp}
                >
                  <div
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.width}%`,
                      height: `${cropBox.height}%`
                    }}
                    onMouseDown={e => handleCropMouseDown('move', e)}
                    onTouchStart={e => handleCropMouseDown('move', e)}
                    className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move"
                  >
                    {/* Grid Guidelines (Rule of Thirds) */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-r border-b border-white" />
                      <div className="border-b border-white" />
                      <div className="border-r border-white" />
                      <div className="border-r border-white" />
                      <div />
                    </div>

                    {/* 4 Corner Handles */}
                    <div
                      onMouseDown={e => handleCropMouseDown('nw', e)}
                      onTouchStart={e => handleCropMouseDown('nw', e)}
                      className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-[#FF1300] border-2 border-white rounded-full cursor-nwse-resize z-40 shadow-xs"
                    />
                    <div
                      onMouseDown={e => handleCropMouseDown('ne', e)}
                      onTouchStart={e => handleCropMouseDown('ne', e)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#FF1300] border-2 border-white rounded-full cursor-nesw-resize z-40 shadow-xs"
                    />
                    <div
                      onMouseDown={e => handleCropMouseDown('sw', e)}
                      onTouchStart={e => handleCropMouseDown('sw', e)}
                      className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-[#FF1300] border-2 border-white rounded-full cursor-nesw-resize z-40 shadow-xs"
                    />
                    <div
                      onMouseDown={e => handleCropMouseDown('se', e)}
                      onTouchStart={e => handleCropMouseDown('se', e)}
                      className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-[#FF1300] border-2 border-white rounded-full cursor-nwse-resize z-40 shadow-xs"
                    />

                    {/* 4 Edge Handles */}
                    <div
                      onMouseDown={e => handleCropMouseDown('n', e)}
                      onTouchStart={e => handleCropMouseDown('n', e)}
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-[#FF1300] border border-white rounded-full cursor-ns-resize z-40 shadow-xs"
                    />
                    <div
                      onMouseDown={e => handleCropMouseDown('s', e)}
                      onTouchStart={e => handleCropMouseDown('s', e)}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-[#FF1300] border border-white rounded-full cursor-ns-resize z-40 shadow-xs"
                    />
                    <div
                      onMouseDown={e => handleCropMouseDown('w', e)}
                      onTouchStart={e => handleCropMouseDown('w', e)}
                      className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-[#FF1300] border border-white rounded-full cursor-ew-resize z-40 shadow-xs"
                    />
                    <div
                      onMouseDown={e => handleCropMouseDown('e', e)}
                      onTouchStart={e => handleCropMouseDown('e', e)}
                      className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-[#FF1300] border border-white rounded-full cursor-ew-resize z-40 shadow-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Control Panel - Light Theme */}
          <div className="w-full md:w-80 bg-white p-4 flex flex-col justify-between space-y-4 mt-[0px]">
            <div>
              {/* 5 Sub-Navigation Tabs */}
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {/* Canvas Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('canvas')}
                  aria-label="Canvas"
                  title="Canvas"
                  className={`p-2.5 rounded-xl transition-all flex items-center justify-center flex-1 ${
                    activeTab === 'canvas'
                      ? 'bg-[#FF1300] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </button>

                {/* Crop Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('crop')}
                  aria-label="Crop"
                  title="Crop"
                  className={`p-2.5 rounded-xl transition-all flex items-center justify-center flex-1 ${
                    activeTab === 'crop'
                      ? 'bg-[#FF1300] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Crop className="w-4 h-4" />
                </button>

                {/* Rotation Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('rotate')}
                  aria-label="Rotation"
                  title="Rotation"
                  className={`p-2.5 rounded-xl transition-all flex items-center justify-center flex-1 ${
                    activeTab === 'rotate'
                      ? 'bg-[#FF1300] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Adjust Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('adjust')}
                  aria-label="Adjust"
                  title="Adjust"
                  className={`p-2.5 rounded-xl transition-all flex items-center justify-center flex-1 ${
                    activeTab === 'adjust'
                      ? 'bg-[#FF1300] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </button>

                {/* Images on Canvas */}
                <button
                  type="button"
                  onClick={() => setActiveTab('images')}
                  aria-label="Images on Canvas"
                  title="Images on Canvas"
                  className={`p-2.5 rounded-xl transition-all flex items-center justify-center flex-1 relative ${
                    activeTab === 'images'
                      ? 'bg-[#FF1300] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <ImagePlus className="w-4 h-4" />
                  {layers.length > 1 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              </div>

              {/* Tab Contents */}
              <div className="mt-4 space-y-4">
                {/* 1. CANVAS TAB: "Selected image placement" div completely removed */}
                {activeTab === 'canvas' && (
                  <div className="space-y-4 animate-in fade-in-50">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1.5">
                        <span>Zoom & Scale</span>
                        <span className="font-mono text-[#FF1300]">
                          {Math.round((activeLayer?.scale || 1) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleScaleChange((activeLayer?.scale || 1) - 0.1)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                          title="Zoom out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="range"
                          min="0.2"
                          max="2.5"
                          step="0.05"
                          value={activeLayer?.scale || 1}
                          onChange={e => handleScaleChange(parseFloat(e.target.value))}
                          className="w-full accent-[#FF1300]"
                        />
                        <button
                          type="button"
                          onClick={() => handleScaleChange((activeLayer?.scale || 1) + 0.1)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                          title="Zoom in"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCenter}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                      >
                        <AlignCenter className="w-3.5 h-3.5 text-[#FF1300]" />
                        <span>Center</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleFitToPage}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Fit to Page</span>
                      </button>
                    </div>

                    {/* Canvas Orientation Options (Portrait / Landscape) */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                        Canvas Orientation
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOrientationSwitch('Portrait')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            orientation === 'Portrait'
                              ? 'border-[#FF1300] bg-red-50 text-[#FF1300] ring-1 ring-[#FF1300]'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Portrait</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOrientationSwitch('Landscape')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            orientation === 'Landscape'
                              ? 'border-[#FF1300] bg-red-50 text-[#FF1300] ring-1 ring-[#FF1300]'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          <span>Landscape</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                      Tip: Click and drag any image directly on the canvas to place it anywhere inside the printable area.
                    </p>
                  </div>
                )}

                {/* 2. CROP TAB: "Gallery crop editor" div completely removed */}
                {activeTab === 'crop' && (
                  <div className="space-y-4 animate-in fade-in-50">
                    <div className="flex items-center justify-between text-xs text-slate-700 font-semibold px-1">
                      <span>Crop Area:</span>
                      <span className="font-mono text-slate-500">
                        {cropBox.width}% × {cropBox.height}%
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Drag from the 4 corners or 4 side edges to resize the crop box. Drag inside the box to reposition.
                    </p>

                    <button
                      type="button"
                      onClick={handleApplyCrop}
                      className="w-full py-2.5 rounded-xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold font-heading shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Crop</span>
                    </button>
                  </div>
                )}

                {/* 3. ROTATION TAB */}
                {activeTab === 'rotate' && (
                  <div className="space-y-4 animate-in fade-in-50">
                    <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                      <span>Current Orientation</span>
                      <span className="font-mono text-[#FF1300]">{activeLayer?.rotation ?? 0}°</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleRotate(-90)}
                        className="py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex flex-col items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-600" />
                        <span>-90° CCW</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRotate(90)}
                        className="py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex flex-col items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                      >
                        <RotateCw className="w-4 h-4 text-[#FF1300]" />
                        <span>+90° CW</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRotate(180)}
                        className="py-3 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 flex flex-col items-center justify-center gap-1.5 border border-slate-200 transition-colors"
                      >
                        <RotateCw className="w-4 h-4 text-amber-500" />
                        <span>180° Flip</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      The rotated orientation is saved and carried directly into the final print and preview.
                    </p>
                  </div>
                )}

                {/* 4. ADJUST TAB: "Reset adjustment to default" link removed */}
                {activeTab === 'adjust' && (
                  <div className="space-y-4 animate-in fade-in-50">
                    {/* Brightness */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span>Brightness</span>
                        </span>
                        <span className="font-mono text-slate-600">{activeLayer?.brightness ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={activeLayer?.brightness ?? 100}
                        onChange={e => updateActiveLayer({ brightness: parseInt(e.target.value) })}
                        className="w-full accent-[#FF1300]"
                      />
                    </div>

                    {/* Contrast */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-slate-500" />
                          <span>Contrast</span>
                        </span>
                        <span className="font-mono text-slate-600">{activeLayer?.contrast ?? 100}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={activeLayer?.contrast ?? 100}
                        onChange={e => updateActiveLayer({ contrast: parseInt(e.target.value) })}
                        className="w-full accent-[#FF1300]"
                      />
                    </div>
                  </div>
                )}

                {/* 5. IMAGES ON CANVAS TAB: Up to 4 images */}
                {activeTab === 'images' && (
                  <div className="space-y-3 animate-in fade-in-50">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-slate-700">
                        Images on Canvas ({layers.length}/4)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleAutoArrangeGrid}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold transition-colors"
                          title="Auto-arrange all images into clean grid"
                        >
                          Auto Grid
                        </button>
                        {layers.length < 4 && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-[#FF1300] border border-red-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAddImage}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Image Layers List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {layers.map((layer, index) => {
                        const isSelected = layer.id === activeLayerId;
                        return (
                          <div
                            key={layer.id}
                            onClick={() => setActiveLayerId(layer.id)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-red-50/80 border-[#FF1300] text-slate-900 shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                                <img
                                  src={layer.url}
                                  alt={layer.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">
                                  #{index + 1}: {layer.name}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  [{layer.x.toFixed(0)}%, {layer.y.toFixed(0)}%] • {layer.rotation}°
                                </p>
                              </div>
                            </div>

                            {index > 0 && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleRemoveLayer(layer.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Remove Image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                      Click any image to select it. You can move, rotate, scale, and place each image independently on the page.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions: Cancel, Reset, Apply */}
            <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition-colors text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition-colors text-center"
              >
                Reset
              </button>

              <button
                type="button"
                disabled={isApplying}
                onClick={handleApplyAllEdits}
                className="flex-1 py-2.5 rounded-xl bg-[#FF1300] hover:bg-[#E01100] active:scale-95 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all font-heading text-center flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isApplying ? (
                  <span>Applying...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
