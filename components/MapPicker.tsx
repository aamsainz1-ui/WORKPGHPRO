import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
    initialLat: number;
    initialLng: number;
    onLocationSelect: (lat: number, lng: number) => void;
    onClose: () => void;
    lang: 'TH' | 'EN';
}

function LocationMarker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    const [position, setPosition] = useState<L.LatLng | null>(null);

    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });

    useEffect(() => {
        map.locate();
    }, [map]);

    return position === null ? null : <Marker position={position} />;
}

const MapPicker: React.FC<MapPickerProps> = ({ initialLat, initialLng, onLocationSelect, onClose, lang }) => {
    const [currentLat, setCurrentLat] = useState(initialLat);
    const [currentLng, setCurrentLng] = useState(initialLng);

    const handleLocationSelect = (lat: number, lng: number) => {
        setCurrentLat(lat);
        setCurrentLng(lng);
        onLocationSelect(lat, lng);
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[300] flex flex-col">
            <div className="p-6 bg-white flex items-center justify-between border-b border-slate-100">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {lang === 'TH' ? 'ปักหมุดที่ตั้งอาคาร' : 'Pin Building Site'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-normal italic">
                        {lang === 'TH' ? 'คลิกที่จุดในแผนที่เพื่อเลือกพิกัด' : 'Click on the map to set coordinates'}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-normal shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                >
                    {lang === 'TH' ? 'เสร็จสิ้น' : 'Confirm Pin'}
                </button>
            </div>

            <div className="flex-1 relative">
                <MapContainer
                    center={[currentLat, currentLng]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker onLocationSelect={handleLocationSelect} />
                </MapContainer>

                {/* Coordinates Display */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-10 py-6 rounded-[2.5rem] shadow-2xl border border-slate-200 text-center max-w-sm z-[1000]">
                    <p className="text-[11px] font-black text-slate-900 leading-relaxed mb-4">
                        {lang === 'TH'
                            ? 'คลิกบนแผนที่เพื่อเลือกตำแหน่งที่ต้องการ'
                            : 'Click on the map to select your desired location'}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Lat</p>
                            <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 italic">
                                {currentLat.toFixed(6)}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Lng</p>
                            <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 italic">
                                {currentLng.toFixed(6)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapPicker;

