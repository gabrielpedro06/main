import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../styles/km.css';

// =========================================================
// Calculadora de Km's
//  - Pesquisa com sugestões (Photon / OpenStreetMap)
//  - Pinos A/B no mapa (clicar para marcar, arrastar para ajustar)
//  - Rota real (OSRM) com distância e tempo, ida e volta
// =========================================================

const PT_CENTER = [39.5, -8.1];
const RECENTS_KEY = 'bz-km-recent-places';

const makePin = (letter, tone) => L.divIcon({
    className: 'km-pin-wrap',
    html: `<span class="km-pin is-${tone}"><b>${letter}</b></span>`,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
});
const PIN_A = makePin('A', 'a');
const PIN_B = makePin('B', 'b');

// Nome curto e legível a partir de um resultado do Photon
function photonLabel(p = {}) {
    const street = [p.street, p.housenumber].filter(Boolean).join(' ');
    const main = p.name || street || p.city || p.county || 'Local no mapa';
    const place = [p.city || p.town || p.village || p.district, p.county || p.state].filter(Boolean);
    const sub = [...new Set(place.filter((x) => x !== main))].join(', ') || p.country || '';
    const city = p.city || p.town || p.village || p.district || p.county || '';
    return { main, sub, full: city && city !== main ? `${main}, ${city}` : main };
}

async function searchPlaces(query, signal) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lat=${PT_CENTER[0]}&lon=${PT_CENTER[1]}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error('Pesquisa indisponível');
    const data = await res.json();
    return (data.features || []).map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const lbl = photonLabel(f.properties);
        return { id: `${f.properties.osm_type}${f.properties.osm_id}`, lat, lng, ...lbl, country: f.properties.countrycode };
    });
}

async function reversePlace(lat, lng) {
    try {
        const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`);
        const data = await res.json();
        const p = data.features?.[0]?.properties;
        if (p) return photonLabel(p).full;
    } catch { /* tenta o Nominatim */ }
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&accept-language=pt`);
        const data = await res.json();
        const a = data.address || {};
        const main = a.road || a.pedestrian || a.suburb || a.village || a.town || a.city || 'Ponto no mapa';
        const city = a.city || a.town || a.village || a.municipality || '';
        return city && city !== main ? `${main}, ${city}` : main;
    } catch {
        return 'Ponto no mapa';
    }
}

const readRecents = () => {
    try { return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]').slice(0, 5); } catch { return []; }
};
const saveRecent = (place) => {
    try {
        const list = readRecents().filter((r) => r.full !== place.full);
        localStorage.setItem(RECENTS_KEY, JSON.stringify([{ full: place.full, main: place.main, sub: place.sub, lat: place.lat, lng: place.lng }, ...list].slice(0, 5)));
    } catch { /* sem storage */ }
};

function formatDuration(sec) {
    if (!sec) return '';
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

// ---------- Componentes do mapa ----------
function MapClicks({ onClick }) {
    useMapEvents({ click: (e) => onClick(e.latlng) });
    return null;
}

function MapView({ a, b, route, fitKey }) {
    const map = useMap();
    useEffect(() => {
        // O mapa nasce dentro de um modal animado: recalcula o tamanho
        const t = setTimeout(() => map.invalidateSize(), 320);
        return () => clearTimeout(t);
    }, [map]);
    useEffect(() => {
        if (route?.length > 1) map.fitBounds(L.latLngBounds(route), { padding: [36, 36], maxZoom: 15 });
        else if (a && b) map.fitBounds(L.latLngBounds([a, b]), { padding: [48, 48], maxZoom: 15 });
        else if (a || b) map.flyTo(a || b, 13, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fitKey, route]);
    return null;
}

// ---------- Campo com sugestões ----------
function PlaceInput({ tone, letter, label, value, onText, onPick, active, onActivate, extraAction, placeholder }) {
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hi, setHi] = useState(0);
    const abortRef = useRef(null);
    const timerRef = useRef(null);
    const recents = open && !value.trim() ? readRecents() : [];
    const list = value.trim() ? results : recents;

    useEffect(() => () => { clearTimeout(timerRef.current); abortRef.current?.abort(); }, []);

    const runSearch = (q) => {
        clearTimeout(timerRef.current);
        abortRef.current?.abort();
        if (q.trim().length < 3) { setResults([]); setLoading(false); return; }
        setLoading(true);
        timerRef.current = setTimeout(async () => {
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            try {
                const r = await searchPlaces(q, ctrl.signal);
                setResults(r); setHi(0);
            } catch (err) {
                if (err.name !== 'AbortError') setResults([]);
            } finally {
                if (!ctrl.signal.aborted) setLoading(false);
            }
        }, 320);
    };

    const choose = (place) => {
        onPick(place);
        saveRecent(place);
        setOpen(false);
        setResults([]);
    };

    return (
        <div className={`km-stop is-${tone} ${active ? 'is-active' : ''}`}>
            <button type="button" className="km-stop-badge" onClick={onActivate} title={`Marcar ${label.toLowerCase()} no mapa`} aria-label={`Marcar ${label.toLowerCase()} no mapa`}>{letter}</button>
            <div className="km-stop-field">
                <span className="km-stop-label">{label}</span>
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    required
                    autoComplete="off"
                    onFocus={() => { setOpen(true); onActivate(); }}
                    onBlur={() => setTimeout(() => setOpen(false), 160)}
                    onChange={(e) => { onText(e.target.value); setOpen(true); runSearch(e.target.value); }}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(list.length - 1, i + 1)); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
                        else if (e.key === 'Enter') { e.preventDefault(); if (list[hi]) choose(list[hi]); }
                        else if (e.key === 'Escape') setOpen(false);
                    }}
                />
            </div>
            {loading ? <span className="km-spinner" /> : extraAction}

            {open && (list.length > 0 || (value.trim().length >= 3 && !loading)) && (
                <div className="km-suggest" onMouseDown={(e) => e.preventDefault()}>
                    {!value.trim() && <div className="km-suggest-head">Recentes</div>}
                    {list.length === 0 && <div className="km-suggest-empty">Sem resultados. Experimenta outro nome ou clica no mapa.</div>}
                    {list.map((r, i) => (
                        <button key={`${r.full}-${i}`} type="button" className={`km-suggest-item ${i === hi ? 'is-hi' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => choose(r)}>
                            <span className="km-suggest-icon">{value.trim() ? <IconPin /> : <IconClock />}</span>
                            <span className="km-suggest-text"><strong>{r.main}</strong>{r.sub && <em>{r.sub}</em>}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

const IconPin = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const IconClock = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const IconSwap = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></svg>;
const IconLocate = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>;
const IconFit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>;
const IconReset = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>;

export default function CalculadoraKm({ form, setForm }) {
    const [origem, setOrigem] = useState(null);   // { lat, lng }
    const [destino, setDestino] = useState(null);
    const [target, setTarget] = useState('origem'); // ponto que o próximo clique no mapa marca
    const [route, setRoute] = useState(null);      // [[lat,lng], ...]
    const [routeInfo, setRouteInfo] = useState(null); // { km, sec }
    const roundTrip = Boolean(form.km_ida_volta);
    const setRoundTrip = (v) => setForm((prev) => ({ ...prev, km_ida_volta: typeof v === 'function' ? v(Boolean(prev.km_ida_volta)) : v }));
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [fitKey, setFitKey] = useState(0);
    const silentRef = useRef(false); // ao editar um pedido antigo, não reescreve os km guardados

    // Ao editar um pedido existente: localiza as moradas guardadas, sem mexer no total
    useEffect(() => {
        let cancelled = false;
        const preload = async () => {
            if (!form.km_origem || !form.km_destino) return;
            silentRef.current = true;
            try {
                const [a, b] = await Promise.all([searchPlaces(form.km_origem), searchPlaces(form.km_destino)]);
                if (cancelled) return;
                if (a[0]) setOrigem({ lat: a[0].lat, lng: a[0].lng });
                if (b[0]) setDestino({ lat: b[0].lat, lng: b[0].lng });
                setFitKey((k) => k + 1);
                if (!a[0] || !b[0]) silentRef.current = false;
            } catch { silentRef.current = false; }
        };
        preload();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Rota real entre A e B
    useEffect(() => {
        if (!origem || !destino) { setRoute(null); setRouteInfo(null); return undefined; }
        const ctrl = new AbortController();
        const run = async () => {
            setBusy('A calcular a rota...');
            setError('');
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`;
                const res = await fetch(url, { signal: ctrl.signal });
                const data = await res.json();
                const r = data.routes?.[0];
                if (!r) throw new Error('no route');
                setRoute(r.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
                setRouteInfo({ km: r.distance / 1000, sec: r.duration });
            } catch (err) {
                if (err.name === 'AbortError') return;
                setRoute(null); setRouteInfo(null);
                setError('Não foi possível calcular a rota. Podes escrever os km à mão.');
            } finally {
                if (!ctrl.signal.aborted) setBusy('');
            }
        };
        run();
        return () => ctrl.abort();
    }, [origem, destino]);

    // Total = rota (x2 se ida e volta), exceto no carregamento de um pedido antigo
    useEffect(() => {
        if (!routeInfo) return;
        if (silentRef.current) { silentRef.current = false; return; }
        const total = (routeInfo.km * (roundTrip ? 2 : 1)).toFixed(1);
        setForm((prev) => ({ ...prev, km_total: total }));
    }, [routeInfo, roundTrip, setForm]);

    const setPoint = useCallback((which, coords, text) => {
        if (which === 'origem') {
            setOrigem(coords);
            if (text != null) setForm((prev) => ({ ...prev, km_origem: text }));
        } else {
            setDestino(coords);
            if (text != null) setForm((prev) => ({ ...prev, km_destino: text }));
        }
        setFitKey((k) => k + 1);
    }, [setForm]);

    // Clique no mapa: marca o ponto ativo e passa ao seguinte
    const handleMapClick = async ({ lat, lng }) => {
        const which = target || (!origem ? 'origem' : !destino ? 'destino' : null);
        if (!which) return;
        const coords = { lat, lng };
        if (which === 'origem') setOrigem(coords); else setDestino(coords);
        setTarget(which === 'origem' && !destino ? 'destino' : null);
        setFitKey((k) => k + 1);
        setBusy('A identificar o local...');
        const name = await reversePlace(lat, lng);
        setBusy('');
        setForm((prev) => ({ ...prev, [which === 'origem' ? 'km_origem' : 'km_destino']: name }));
    };

    const handleDrag = async (which, e) => {
        const { lat, lng } = e.target.getLatLng();
        const coords = { lat, lng };
        if (which === 'origem') setOrigem(coords); else setDestino(coords);
        const name = await reversePlace(lat, lng);
        setForm((prev) => ({ ...prev, [which === 'origem' ? 'km_origem' : 'km_destino']: name }));
    };

    const swap = () => {
        setOrigem(destino);
        setDestino(origem);
        setForm((prev) => ({ ...prev, km_origem: prev.km_destino, km_destino: prev.km_origem }));
    };

    const useMyLocation = () => {
        if (!navigator.geolocation) { setError('O browser não permite obter a localização.'); return; }
        setBusy('A obter a tua localização...');
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setPoint('origem', coords);
            const name = await reversePlace(coords.lat, coords.lng);
            setBusy('');
            setForm((prev) => ({ ...prev, km_origem: name }));
            if (!destino) setTarget('destino');
        }, () => { setBusy(''); setError('Não foi possível obter a localização. Verifica as permissões do browser.'); }, { enableHighAccuracy: true, timeout: 10000 });
    };

    const resetAll = () => {
        setOrigem(null); setDestino(null); setRoute(null); setRouteInfo(null); setTarget('origem'); setError('');
        setForm((prev) => ({ ...prev, km_origem: '', km_destino: '', km_total: '', km_ida_volta: false }));
    };

    const hint = useMemo(() => {
        if (target === 'origem') return { tone: 'a', text: 'Clica no mapa para marcar a partida' };
        if (target === 'destino') return { tone: 'b', text: 'Clica no mapa para marcar o destino' };
        if (origem && destino) return { tone: 'muted', text: 'Arrasta os pinos para ajustar' };
        return null;
    }, [target, origem, destino]);

    const calcKm = routeInfo ? Number((routeInfo.km * (roundTrip ? 2 : 1)).toFixed(1)) : null;
    const isManual = calcKm != null && form.km_total !== '' && Number(form.km_total) !== calcKm;

    return (
        <div className="km">
            {/* PARAGENS */}
            <div className="km-stops">
                <PlaceInput
                    tone="a" letter="A" label="Partida"
                    value={form.km_origem || ''}
                    placeholder="Procura uma morada, cidade ou empresa"
                    active={target === 'origem'}
                    onActivate={() => setTarget('origem')}
                    onText={(v) => setForm((prev) => ({ ...prev, km_origem: v }))}
                    onPick={(p) => { setPoint('origem', { lat: p.lat, lng: p.lng }, p.full); setTarget(destino ? null : 'destino'); }}
                    extraAction={<button type="button" className="km-mini-btn" onClick={useMyLocation} title="Usar a minha localização" aria-label="Usar a minha localização"><IconLocate /></button>}
                />
                <div className="km-stops-line" aria-hidden="true" />
                <button type="button" className="km-swap" onClick={swap} title="Trocar partida e destino" aria-label="Trocar partida e destino"><IconSwap /></button>
                <PlaceInput
                    tone="b" letter="B" label="Destino"
                    value={form.km_destino || ''}
                    placeholder="Para onde foste?"
                    active={target === 'destino'}
                    onActivate={() => setTarget('destino')}
                    onText={(v) => setForm((prev) => ({ ...prev, km_destino: v }))}
                    onPick={(p) => { setPoint('destino', { lat: p.lat, lng: p.lng }, p.full); setTarget(null); }}
                />
            </div>

            {/* MAPA */}
            <div className={`km-map ${target ? 'is-picking' : ''}`}>
                <MapContainer center={PT_CENTER} zoom={6} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <MapClicks onClick={handleMapClick} />
                    <MapView a={origem} b={destino} route={route} fitKey={fitKey} />
                    {route && <Polyline positions={route} pathOptions={{ className: 'km-route-casing', weight: 9 }} />}
                    {route && <Polyline positions={route} pathOptions={{ className: 'km-route', weight: 5 }} />}
                    {origem && <Marker position={origem} icon={PIN_A} draggable eventHandlers={{ dragend: (e) => handleDrag('origem', e) }} />}
                    {destino && <Marker position={destino} icon={PIN_B} draggable eventHandlers={{ dragend: (e) => handleDrag('destino', e) }} />}
                </MapContainer>

                {(busy || hint) && (
                    <div className={`km-hint is-${busy ? 'busy' : hint.tone}`} key={busy || hint.text}>
                        {busy ? <span className="km-spinner is-light" /> : <span className="km-hint-dot" />}
                        {busy || hint.text}
                    </div>
                )}

                <div className="km-map-tools">
                    {(origem || destino) && <button type="button" onClick={() => setFitKey((k) => k + 1)} title="Ver percurso completo" aria-label="Ver percurso completo"><IconFit /></button>}
                    {(origem || destino) && <button type="button" onClick={resetAll} title="Limpar" aria-label="Limpar percurso"><IconReset /></button>}
                </div>

                {routeInfo && (
                    <div className="km-route-card">
                        <strong>{routeInfo.km.toFixed(1)} km</strong>
                        <span>{formatDuration(routeInfo.sec)} de carro</span>
                    </div>
                )}
            </div>

            {error && <div className="km-error">{error}</div>}

            {/* TOTAL */}
            <div className="km-total">
                <div className="km-total-main">
                    <span className="km-total-label">Km a pedir</span>
                    <div className="km-total-input">
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            required
                            value={form.km_total}
                            onChange={(e) => setForm((prev) => ({ ...prev, km_total: e.target.value }))}
                            placeholder="0"
                            aria-label="Total de km"
                        />
                        <span>km</span>
                    </div>
                    <span className="km-total-note">
                        {isManual
                            ? <>Editado à mão · rota: {calcKm} km <button type="button" onClick={() => setForm((prev) => ({ ...prev, km_total: String(calcKm) }))}>repor</button></>
                            : routeInfo ? 'Calculado pela rota mais rápida' : 'Escolhe a partida e o destino, ou escreve o valor'}
                    </span>
                </div>
                <button type="button" className={`km-roundtrip ${roundTrip ? 'is-on' : ''}`} onClick={() => setRoundTrip((v) => !v)} aria-pressed={roundTrip}>
                    <span className="km-roundtrip-switch"><span /></span>
                    <span className="km-roundtrip-text"><strong>Ida e volta</strong><em>{roundTrip ? 'Distância a dobrar' : 'Só ida'}</em></span>
                </button>
            </div>
        </div>
    );
}
