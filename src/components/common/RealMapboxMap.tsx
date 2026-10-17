import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { ZoomIn, ZoomOut, Navigation, Store, CheckCircle2, MapPin, Save, Crosshair, Loader2 } from 'lucide-react';
import type { NearbyShop } from '../../types/printperfect';
import { toast } from 'sonner';

interface RealMapboxMapProps {
  nearbyShops: NearbyShop[];
  selectedShop?: NearbyShop | null;
  onSelectShop: (shop: NearbyShop) => void;
  className?: string;
  userCoordinates?: [number, number];
  userAddress?: string;
  radiusKm?: 1 | 5;
  onStageLocation?: (coords: [number, number], address: string) => void;
  onUpdateUserLocation?: (coords: [number, number], address?: string) => void;
  onSaveLocationAndAddress?: (coords: [number, number], address: string) => void;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";

// Protect mapbox telemetry session calls
if (typeof window !== 'undefined' && mapboxgl) {
  try {
    mapboxgl.accessToken = MAPBOX_TOKEN;
    if ((mapboxgl as any).config) {
      (mapboxgl as any).config.SESSION_PATH = null;
    }
  } catch {
    // Ignore
  }
}

export const RealMapboxMap: React.FC<RealMapboxMapProps> = ({
  nearbyShops,
  selectedShop,
  onSelectShop,
  className = 'h-72',
  userCoordinates = [73.8567, 18.5204],
  userAddress,
  radiusKm = 1,
  onStageLocation,
  onUpdateUserLocation,
  onSaveLocationAndAddress
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const isMountedRef = useRef(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentAddressLabel, setCurrentAddressLabel] = useState<string>(userAddress || 'FC Road, Shivajinagar, Pune 411005');

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper to reverse geocode coordinates using Mapbox API
  const reverseGeocode = async (lng: number, lat: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi,neighborhood,locality`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          return data.features[0].place_name;
        }
      }
    } catch (e) {
      console.warn('Geocoding fallback:', e);
    }
    return `FC Road, Shivajinagar, Pune 411005 (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  };

  // Helper to create GeoJSON circle for radius
  const createGeoJSONCircle = (center: [number, number], radiusInKm: number, points = 64) => {
    const coords = {
      latitude: center[1],
      longitude: center[0]
    };
    const km = radiusInKm;
    const ret: [number, number][] = [];
    const distanceX = km / (111.320 * Math.cos((coords.latitude * Math.PI) / 180));
    const distanceY = km / 110.574;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [ret]
      },
      properties: {}
    };
  };

  // Initialize Mapbox map once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!MAPBOX_TOKEN) {
      setHasError(true);
      console.error('Mapbox is unavailable because VITE_MAPBOX_ACCESS_TOKEN is not configured.');
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [selectedShop?.longitude || userCoordinates[0], selectedShop?.latitude || userCoordinates[1]],
        zoom: 14.5,
        attributionControl: false
      });

      map.on('load', () => {
        if (!isMountedRef.current) return;
        setMapLoaded(true);

        // Add User Location Pulse Marker
        const userEl = document.createElement('div');
        userEl.className = 'user-pin-marker';
        userEl.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
            <div style="width:20px; height:20px; border-radius:50%; background:#0066FF; border:3px solid #FFFFFF; box-shadow:0 0 14px rgba(0,102,255,0.8); animation:pulse 2s infinite;"></div>
            <span style="margin-top:4px; font-size:10px; font-weight:800; background:#0f172a; color:#ffffff; padding:2px 6px; border-radius:6px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3);">You are here (${radiusKm} KM)</span>
          </div>
        `;

        const userMarker = new mapboxgl.Marker({ element: userEl, draggable: true })
          .setLngLat(userCoordinates)
          .addTo(map);

        userMarker.on('dragend', async () => {
          const lngLat = userMarker.getLngLat();
          const newCoords: [number, number] = [Number(lngLat.lng.toFixed(6)), Number(lngLat.lat.toFixed(6))];
          const resolvedAddress = await reverseGeocode(newCoords[0], newCoords[1]);
          if (isMountedRef.current) {
            setCurrentAddressLabel(resolvedAddress);
          }
          // Only stage location - do NOT automatically persist to database or user profile
          onStageLocation?.(newCoords, resolvedAddress);
          onUpdateUserLocation?.(newCoords, resolvedAddress);
        });

        userMarkerRef.current = userMarker;

        // Add 1 KM / 5 KM radius circle layer
        const circleGeoJSON = createGeoJSONCircle(userCoordinates, radiusKm);
        if (!map.getSource('radius-circle')) {
          map.addSource('radius-circle', {
            type: 'geojson',
            data: circleGeoJSON as any
          });

          map.addLayer({
            id: 'radius-circle-fill',
            type: 'fill',
            source: 'radius-circle',
            paint: {
              'fill-color': '#0066FF',
              'fill-opacity': 0.1
            }
          });

          map.addLayer({
            id: 'radius-circle-line',
            type: 'line',
            source: 'radius-circle',
            paint: {
              'line-color': '#0066FF',
              'line-width': 2,
              'line-dasharray': [2, 2]
            }
          });
        }

        // Map click to position staged marker temporarily without auto-saving
        map.on('click', async (e) => {
          const newCoords: [number, number] = [Number(e.lngLat.lng.toFixed(6)), Number(e.lngLat.lat.toFixed(6))];
          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat(newCoords);
          }
          const circleSource = map.getSource('radius-circle') as mapboxgl.GeoJSONSource;
          if (circleSource) {
            circleSource.setData(createGeoJSONCircle(newCoords, radiusKm) as any);
          }
          const resolvedAddress = await reverseGeocode(newCoords[0], newCoords[1]);
          if (isMountedRef.current) {
            setCurrentAddressLabel(resolvedAddress);
          }
          // Only stage location - do NOT automatically persist to database or user profile
          onStageLocation?.(newCoords, resolvedAddress);
          onUpdateUserLocation?.(newCoords, resolvedAddress);
        });
      });

      map.on('error', (e) => {
        console.warn('Mapbox error:', e);
      });

      mapRef.current = map;
    } catch (err) {
      console.error('Failed to init Mapbox:', err);
      setHasError(true);
    }

    return () => {
      try {
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (err) {
        console.warn('Map cleanup error:', err);
      }
    };
  }, []);

  // Dynamically update shop markers when nearbyShops or selectedShop changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add updated markers
    nearbyShops.forEach((shop, index) => {
      // Disambiguate overlapping coordinates slightly so all shop pins are distinctly visible
      const angle = (index * 2 * Math.PI) / Math.max(nearbyShops.length, 1);
      const jitterDist = index > 0 ? 0.0006 : 0;
      const baseLng = Number(shop.longitude) || userCoordinates[0];
      const baseLat = Number(shop.latitude) || userCoordinates[1];
      const shopLng = baseLng + (jitterDist * Math.cos(angle));
      const shopLat = baseLat + (jitterDist * Math.sin(angle));

      const isSelected = selectedShop ? selectedShop.id === shop.id : false;
      const markerEl = document.createElement('div');
      markerEl.className = 'shop-pin-marker';
      markerEl.style.cursor = 'pointer';
      markerEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; transition:transform 0.2s; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.2)); cursor:pointer;">
          <div style="width:38px; height:38px; border-radius:12px; background:${isSelected ? '#FF1300' : '#ffffff'}; border:2px solid ${isSelected ? '#ffffff' : '#cbd5e1'}; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.15); overflow:hidden; padding:5px;">
            <img src="/shop_icon.svg" alt="Shop Marker" style="width:100%; height:100%; object-fit:contain; ${isSelected ? 'filter:brightness(0) invert(1);' : ''}" />
          </div>
          <div style="margin-top:3px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:2px 8px; font-size:10px; font-weight:800; color:#0f172a; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.1); display:flex; align-items:center; gap:4px;">
            <span>${shop.name}</span>
            <span style="color:#FF1300; font-size:9px;">• ${shop.distanceFormatted}</span>
          </div>
        </div>
      `;

      markerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectShop(shop);
        map.flyTo({ center: [shopLng, shopLat], zoom: 15.5, duration: 1200 });
      });

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([shopLng, shopLat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [nearbyShops, selectedShop?.id, mapLoaded, onSelectShop]);

  // Handle fly to selected shop when prop updates
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedShop) return;
    const shopIndex = nearbyShops.findIndex(s => s.id === selectedShop.id);
    if (shopIndex !== -1) {
      const offsetLng = (shopIndex === 0 ? -0.0028 : shopIndex === 1 ? 0.0035 : shopIndex === 2 ? -0.0015 : 0.0042);
      const offsetLat = (shopIndex === 0 ? 0.0022 : shopIndex === 1 ? 0.0018 : shopIndex === 2 ? -0.0031 : -0.0025);
      const targetLng = selectedShop.longitude || (userCoordinates[0] + offsetLng);
      const targetLat = selectedShop.latitude || (userCoordinates[1] + offsetLat);
      mapRef.current.flyTo({ center: [targetLng, targetLat], zoom: 15.5, duration: 1000 });
    }
  }, [selectedShop?.id, mapLoaded]);

  // Sync external userCoordinates & radius changes to marker & circle
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(userCoordinates);
    }
    const circleSource = mapRef.current.getSource('radius-circle') as mapboxgl.GeoJSONSource;
    if (circleSource) {
      circleSource.setData(createGeoJSONCircle(userCoordinates, radiusKm) as any);
    }
  }, [userCoordinates[0], userCoordinates[1], radiusKm, mapLoaded]);

  // Sync external userAddress prop
  useEffect(() => {
    if (userAddress) {
      setCurrentAddressLabel(userAddress);
    }
  }, [userAddress]);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  const handleCenterUser = () => {
    mapRef.current?.flyTo({ center: userCoordinates, zoom: 15, duration: 1000 });
  };

  // Live GPS geolocation
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsLocating(false);
        const newCoords: [number, number] = [
          Number(position.coords.longitude.toFixed(6)),
          Number(position.coords.latitude.toFixed(6))
        ];

        if (mapRef.current) {
          mapRef.current.flyTo({ center: newCoords, zoom: 15.5, duration: 1200 });
        }
        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat(newCoords);
        }
        const circleSource = mapRef.current?.getSource('radius-circle') as mapboxgl.GeoJSONSource;
        if (circleSource) {
          circleSource.setData(createGeoJSONCircle(newCoords, radiusKm) as any);
        }

        const resolved = await reverseGeocode(newCoords[0], newCoords[1]);
        setCurrentAddressLabel(resolved);
        onStageLocation?.(newCoords, resolved);
        onUpdateUserLocation?.(newCoords, resolved);
        toast.info(`GPS location staged: ${resolved}. Click "Update Location" to confirm.`);
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Could not get GPS location: ${err.message}. Using default campus location.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Explicit Save Current Location & Address
  const handleSaveCurrentLocation = () => {
    if (onSaveLocationAndAddress) {
      onSaveLocationAndAddress(userCoordinates, currentAddressLabel);
    } else {
      toast.success(`Current location & address saved: ${currentAddressLabel}`);
    }
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner w-full ${className} bg-slate-100 flex flex-col justify-between`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
      {hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/95 p-4 text-center text-sm text-slate-600">
          Map unavailable. Please try again later.
        </div>
      )}

      {/* Top Floating Controls */}
      <div className="relative z-10 p-3 flex items-start justify-between pointer-events-none">
        {/* Currently Selected Shop Mini Banner */}
        {selectedShop ? (
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md flex items-center gap-2 pointer-events-auto">
            <div className="w-6 h-6 rounded-lg bg-[#FF1300] text-white flex items-center justify-center font-black text-[10px]">
              {selectedShop.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-extrabold text-slate-900 leading-none flex items-center gap-1">
                <span>{selectedShop.name}</span>
                <CheckCircle2 className="w-3 h-3 fill-emerald-500 text-white" />
              </p>
              <span className="text-[10px] text-slate-500 font-semibold">{selectedShop.distanceFormatted} away</span>
            </div>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-md flex items-center gap-2 pointer-events-auto">
            <span className="text-xs font-bold text-slate-700">Tap pin to view shop</span>
          </div>
        )}

        {/* Floating Zoom & GPS Controls */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-white/95 text-slate-800 shadow-md flex items-center justify-center hover:bg-white active:scale-95 transition-all text-xs font-bold border border-slate-200"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-slate-700" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-white/95 text-slate-800 shadow-md flex items-center justify-center hover:bg-white active:scale-95 transition-all text-xs font-bold border border-slate-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-slate-700" />
          </button>
          <button
            type="button"
            onClick={handleCenterUser}
            className="w-8 h-8 rounded-xl bg-white/95 text-[#FF1300] shadow-md flex items-center justify-center hover:bg-white active:scale-95 transition-all text-xs font-bold border border-slate-200"
            title="Recenter On Me"
          >
            <Navigation className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleUseCurrentGPS}
            disabled={isLocating}
            className="w-8 h-8 rounded-xl bg-[#FF1300] text-white shadow-md flex items-center justify-center hover:bg-[#E01100] active:scale-95 transition-all text-xs font-bold border border-red-400"
            title="Use Live GPS"
          >
            {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
