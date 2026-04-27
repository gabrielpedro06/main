import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corrigir o ícone padrão do Leaflet que costuma falhar no React
const customIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Componente invisível para capturar cliques no mapa
function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        }
    });
    return null;
}

// Componente para ajustar o zoom do mapa automaticamente
function MapUpdater({ coords }) {
    const map = useMap();
    useEffect(() => {
        if (coords) map.flyTo(coords, 13);
    }, [coords, map]);
    return null;
}

export default function CalculadoraKm({ form, setForm }) {
    const [origemCoords, setOrigemCoords] = useState(null);
    const [destinoCoords, setDestinoCoords] = useState(null);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [modoClique, setModoClique] = useState(null); // 'origem' ou 'destino'

    const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' };
    const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };

    // 1. Pesquisar Morada (Geocoding - OpenStreetMap)
    const pesquisarMorada = async (tipo, texto) => {
        if (!texto.trim()) return;
        setLoadingMsg(`A procurar ${tipo}...`);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texto)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                if (tipo === 'origem') setOrigemCoords(coords);
                else setDestinoCoords(coords);
            } else {
                alert(`Não foi possível encontrar o local: ${texto}`);
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao procurar o local.");
        } finally {
            setLoadingMsg('');
        }
    };

    // 2. Calcular Distância (Routing - OSRM)
    useEffect(() => {
        const calcularRota = async () => {
            if (!origemCoords || !destinoCoords) return;
            setLoadingMsg('A calcular distância...');
            try {
                // OSRM API: lon,lat;lon,lat
                const url = `https://router.project-osrm.org/route/v1/driving/${origemCoords.lng},${origemCoords.lat};${destinoCoords.lng},${destinoCoords.lat}?overview=false`;
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.routes && data.routes.length > 0) {
                    const distanciaMetros = data.routes[0].distance;
                    const distanciaKm = (distanciaMetros / 1000).toFixed(1);
                    setForm(prev => ({ ...prev, km_total: distanciaKm }));
                }
            } catch (err) {
                console.error("Erro no cálculo da rota", err);
            } finally {
                setLoadingMsg('');
            }
        };

        calcularRota();
    }, [origemCoords, destinoCoords, setForm]);

    // 3. Lidar com cliques no Mapa
    const handleMapClick = async (latlng) => {
        if (!modoClique) return;
        
        const coords = { lat: latlng.lat, lng: latlng.lng };
        setLoadingMsg('A ler local do mapa...');
        
        try {
            // Reverse Geocoding (Coordenadas para Texto)
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`);
            const data = await res.json();
            const nomeLocal = data.display_name ? data.display_name.split(',')[0] + ', ' + data.display_name.split(',')[1] : "Ponto no Mapa";

            if (modoClique === 'origem') {
                setOrigemCoords(coords);
                setForm(prev => ({ ...prev, km_origem: nomeLocal }));
            } else {
                setDestinoCoords(coords);
                setForm(prev => ({ ...prev, km_destino: nomeLocal }));
            }
        } catch (err) {
            console.error(err);
            if (modoClique === 'origem') setOrigemCoords(coords);
            else setDestinoCoords(coords);
        } finally {
            setModoClique(null);
            setLoadingMsg('');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={labelStyle}>De *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" value={form.km_origem} onChange={e => setForm({...form, km_origem: e.target.value})} onBlur={() => pesquisarMorada('origem', form.km_origem)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pesquisarMorada('origem', form.km_origem); }}} placeholder="Pressione Enter para procurar" style={inputStyle} required />
                        <button type="button" onClick={() => setModoClique(modoClique === 'origem' ? null : 'origem')} style={{ background: modoClique === 'origem' ? 'var(--color-btnPrimary)' : '#f1f5f9', color: modoClique === 'origem' ? 'white' : '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', fontWeight: 'bold' }} title="Picar no mapa">📍</button>
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={labelStyle}>Para *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" value={form.km_destino} onChange={e => setForm({...form, km_destino: e.target.value})} onBlur={() => pesquisarMorada('destino', form.km_destino)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pesquisarMorada('destino', form.km_destino); }}} placeholder="Pressione Enter para procurar" style={inputStyle} required />
                        <button type="button" onClick={() => setModoClique(modoClique === 'destino' ? null : 'destino')} style={{ background: modoClique === 'destino' ? 'var(--color-btnPrimary)' : '#f1f5f9', color: modoClique === 'destino' ? 'white' : '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', fontWeight: 'bold' }} title="Picar no mapa">📍</button>
                    </div>
                </div>
            </div>

            {loadingMsg && <div style={{ fontSize: '0.8rem', color: 'var(--color-btnPrimary)', fontWeight: 'bold' }}>⏳ {loadingMsg}</div>}
            {modoClique && <div style={{ fontSize: '0.8rem', color: '#d97706', background: '#fefce8', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>👉 Clica no mapa para definir o ponto de <b>{modoClique}</b>.</div>}

            <div style={{ height: '220px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', zIndex: 1 }}>
                <MapContainer center={[39.3999, -8.2245]} zoom={6} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <MapClickHandler onMapClick={handleMapClick} />
                    {origemCoords && <><Marker position={origemCoords} icon={customIcon} /><MapUpdater coords={origemCoords} /></>}
                    {destinoCoords && <><Marker position={destinoCoords} icon={customIcon} /><MapUpdater coords={destinoCoords} /></>}
                </MapContainer>
            </div>

            <div>
                <label style={labelStyle}>Km's Efetuados (Editável)*</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                        type="number" 
                        step="0.1" 
                        required
                        value={form.km_total} 
                        onChange={(e) => setForm(prev => ({...prev, km_total: e.target.value}))}
                        style={{ ...inputStyle, background: 'var(--color-bgSecondary)', color: 'var(--color-btnPrimaryHover)', fontWeight: 'bold', flex: 1 }} 
                    />
                    <span style={{ fontWeight: 'bold', color: '#64748b' }}>Km</span>
                </div>
            </div>
        </div>
    );
}
