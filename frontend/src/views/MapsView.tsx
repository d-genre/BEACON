import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Navigation, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const center = {
  lat: 10.757058524415353,
  lng: 78.65102763110302
};

const createSinglePinIcon = () => {
  return L.divIcon({
    className: 'single-campus-pin',
    html: `
      <div style="
        background: #4f46e5;
        color: #ffffff;
        padding: 6px 14px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        gap: 6px;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
        white-space: nowrap;
        cursor: pointer;
      ">
        <span style="font-size: 14px;">📍</span>
        <span>Saranathan College of Engineering, Trichy</span>
      </div>
    `,
    iconSize: [280, 34],
    iconAnchor: [140, 17],
    popupAnchor: [0, -18]
  });
};

const MapsView: React.FC = () => {
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setLoading(false);
        setError('You must be logged in to view campus locations.');
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [token]);

  if (error) {
    return (
      <div className="flex flex-col h-full bg-white relative items-center justify-center p-6 text-center text-slate-500">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-lg font-medium text-slate-800 mb-2">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200/80 max-w-sm pointer-events-auto">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-indigo-600" />
            Saranathan Campus Map
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Panjapur Campus, Tiruchirappalli
          </p>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="flex-1 w-full relative bg-slate-100 z-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <MapPin className="w-10 h-10 mx-auto animate-bounce mb-3 opacity-50 text-indigo-600" />
              <p className="text-xs font-semibold text-slate-600">Loading Campus Map...</p>
            </div>
          </div>
        ) : (
          <MapContainer 
            center={center} 
            zoom={17} 
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker 
              position={[center.lat, center.lng]} 
              icon={createSinglePinIcon()}
            >
              <Popup>
                <div className="p-1 max-w-[220px]">
                  <h3 className="font-bold text-slate-900 text-xs leading-tight mb-1">Saranathan College of Engineering</h3>
                  <p className="text-[11px] text-slate-600 leading-snug m-0">Venkateswara HSS Campus, Panjapur, Tiruchirappalli, Tamil Nadu 620012</p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default MapsView;





