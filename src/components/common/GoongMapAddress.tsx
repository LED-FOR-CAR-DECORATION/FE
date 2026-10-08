"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, MapMouseEvent, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());

// TODO: Replace with your actual Goong keys in .env or update directly here if needed
const GOONG_MAP_KEY = process.env.NEXT_PUBLIC_GOONG_MAP_KEY || 'YOUR_MAP_KEY_HERE';
const GOONG_API_KEY = process.env.NEXT_PUBLIC_GOONG_API_KEY || 'YOUR_API_KEY_HERE';

interface GoongMapAddressProps {
  onLocationSelect?: (lng: number, lat: number, address: string) => void;
}

export const GoongMapAddress: React.FC<GoongMapAddressProps> = ({ onLocationSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [center] = useState<[number, number]>([105.85242472181584, 21.029579719995272]); // Default center
  const [zoom] = useState(14);
  const [radiusInMeters] = useState(500);

  // function to draw circle coordinates
  function drawCircle(center: [number, number], radiusInMeters: number) {
    const points = 64;
    const coords = {
      latitude: center[1],
      longitude: center[0]
    };
    const km = radiusInMeters / 1000;
    const ret = [];
    const distanceX = km / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
    const distanceY = km / 110.574;
    let theta, x, y;
    for (let i = 0; i < points; i++) {
      theta = (i / points) * (2 * Math.PI);
      x = distanceX * Math.cos(theta);
      y = distanceY * Math.sin(theta);
      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]);
    return ret;
  }

  useEffect(() => {
    if (map.current) return; // initialize map only once
    if (!mapContainer.current) return;

    map.current = new MapLibreMap({
      container: mapContainer.current,
      style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAP_KEY}`,
      zoom: zoom,
      center: center
    });

    map.current.on('load', () => {
      addMarkerAndCircleAround(center);
    });

    map.current.on('click', handleMapClick);

    return () => {
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleMapClick = async (event: MapMouseEvent) => {
    const lngLat: [number, number] = [event.lngLat.lng, event.lngLat.lat];
    addMarkerAndCircleAround(lngLat);
    setIsResolvingAddress(true);

    try {
      const apiLink = `https://rsapi.goong.io/Geocode?api_key=${GOONG_API_KEY}&latlng=${lngLat[1]},${lngLat[0]}`;
      const response = await fetch(apiLink);
      const data = await response.json();
      const address = data.results?.[0]?.formatted_address || `${lngLat[1].toFixed(6)}, ${lngLat[0].toFixed(6)}`;

      setQuery(address);
      onLocationSelect?.(lngLat[0], lngLat[1], address);
    } catch (error) {
      console.error('Error reverse geocoding map location:', error);
      const coordinates = `${lngLat[1].toFixed(6)}, ${lngLat[0].toFixed(6)}`;
      setQuery(coordinates);
      onLocationSelect?.(lngLat[0], lngLat[1], coordinates);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const addMarkerAndCircleAround = (lngLat: [number, number]) => {
    if (!map.current) return;

    // Add marker
    if (marker.current) {
        marker.current.remove();
    }
    marker.current = new Marker()
      .setLngLat(lngLat)
      .addTo(map.current);

    // Draw circle
    if (map.current.getLayer('circle')) {
      map.current.removeLayer('circle');
      map.current.removeSource('circle');
    }
    const circleData = {
      'type': 'FeatureCollection',
      'features': [{
        'type': 'Feature',
        'geometry': {
          'type': 'Polygon',
          'coordinates': [drawCircle(lngLat, radiusInMeters)]
        }
      }]
    };
    
    map.current.addSource('circle', {
      'type': 'geojson',
      'data': circleData as any
    });
    
    map.current.addLayer({
      'id': 'circle',
      'type': 'fill',
      'source': 'circle',
      'layout': {},
      'paint': {
        'fill-color': '#588888',
        'fill-opacity': 0.5
      }
    });

    // fly to this location
    map.current.flyTo({ center: lngLat, zoom: zoom });
  };

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val || val.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const apiLink = `https://rsapi.goong.io/place/autocomplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(val)}`;
      const response = await fetch(apiLink);
      const data = await response.json();
      if (data.predictions) {
        setSuggestions(data.predictions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setSuggestions([]);
    }
  };

  const handleSelectPlace = async (placeId: string, description: string) => {
    setQuery(description);
    setSuggestions([]);

    try {
      const apiLink = `https://rsapi.goong.io/place/detail?api_key=${GOONG_API_KEY}&place_id=${placeId}`;
      const response = await fetch(apiLink);
      const data = await response.json();
      if (data.result) {
        const { location } = data.result.geometry;
        const lngLat: [number, number] = [location.lng, location.lat];
        addMarkerAndCircleAround(lngLat);
        
        if (onLocationSelect) {
            onLocationSelect(lngLat[0], lngLat[1], description);
        }
      } else {
        console.error('No result found for place details');
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col gap-4">
      <div className="relative w-full z-10">
        <input 
          type="text" 
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={isResolvingAddress ? "Đang lấy địa chỉ..." : "Tìm kiếm địa chỉ hoặc bấm trên bản đồ..."}
          disabled={isResolvingAddress}
          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        />
        {suggestions.length > 0 && (
          <ul className="absolute top-full left-0 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-lg overflow-hidden z-20 max-h-60 overflow-y-auto text-black">
            {suggestions.map((s) => (
              <li 
                key={s.place_id} 
                onClick={() => handleSelectPlace(s.place_id, s.description)}
                className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 border-gray-100"
              >
                {s.description}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div ref={mapContainer} className="w-full flex-1 min-h-[400px] rounded-lg overflow-hidden shadow-sm border border-gray-200" />
    </div>
  );
};

export default GoongMapAddress;
