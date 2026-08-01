'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './LanguageProvider';

declare global {
  interface Window { google?: any; __googleMapsPromise?: Promise<void>; }
}

type LayerKey = 'plants' | 'ministry' | 'control' | 'substations';

type SearchPoint = {
  query: string;
  type: LayerKey;
  ar: string;
  en: string;
};

const SEARCH_POINTS: SearchPoint[] = [
  { query: 'Subiya Power and Water Distillation Plant Kuwait', type: 'plants', ar: 'محطة الصبية', en: 'Subiya Power Station' },
  { query: 'Doha East Power Station Kuwait', type: 'plants', ar: 'محطة الدوحة الشرقية', en: 'Doha East Power Station' },
  { query: 'Doha West Power Station Kuwait', type: 'plants', ar: 'محطة الدوحة الغربية', en: 'Doha West Power Station' },
  { query: 'Az Zour South Power Station Kuwait', type: 'plants', ar: 'محطة الزور الجنوبية', en: 'Az Zour South Power Station' },
  { query: 'Shuwaikh Power Station Kuwait', type: 'plants', ar: 'محطة الشويخ', en: 'Shuwaikh Power Station' },
  { query: 'Shuaiba North Power Station Kuwait', type: 'plants', ar: 'محطة الشعيبة الشمالية', en: 'Shuaiba North Power Station' },
  { query: 'Shuaiba South Power Station Kuwait', type: 'plants', ar: 'محطة الشعيبة الجنوبية', en: 'Shuaiba South Power Station' },
  { query: 'Ministry of Electricity Water and Renewable Energy South Surra Kuwait', type: 'ministry', ar: 'وزارة الكهرباء والماء والطاقة المتجددة', en: 'Ministry of Electricity, Water and Renewable Energy' },
  { query: 'National Control Center Al Salam Kuwait electricity', type: 'control', ar: 'مركز التحكم الوطني - السلام', en: 'National Control Center - Al Salam' },
  { query: 'Jabriya electricity control center Kuwait', type: 'control', ar: 'مركز تحكم الجابرية', en: 'Jabriya Control Center' },
  { query: 'Shuaiba electricity control center Kuwait', type: 'control', ar: 'مركز تحكم الشعيبة', en: 'Shuaiba Control Center' },
  { query: 'Jahra electricity control center Kuwait', type: 'control', ar: 'مركز تحكم الجهراء', en: 'Jahra Control Center' },
  { query: 'electricity substation Surra Kuwait', type: 'substations', ar: 'محولات السرة', en: 'Surra Substations' },
  { query: 'electricity substation Jabriya Kuwait', type: 'substations', ar: 'محولات الجابرية', en: 'Jabriya Substations' },
  { query: 'electricity substation Salwa Kuwait', type: 'substations', ar: 'محولات سلوى', en: 'Salwa Substations' },
  { query: 'electricity substation Hawally Kuwait', type: 'substations', ar: 'محولات حولي', en: 'Hawally Substations' },
  { query: 'electricity substation Farwaniya Kuwait', type: 'substations', ar: 'محولات الفروانية', en: 'Farwaniya Substations' },
  { query: 'electricity substation Sabah Al Salem Kuwait', type: 'substations', ar: 'محولات صباح السالم', en: 'Sabah Al Salem Substations' },
  { query: 'electricity substation Fahaheel Kuwait', type: 'substations', ar: 'محولات الفحيحيل', en: 'Fahaheel Substations' },
  { query: 'electricity substation Jahra Kuwait', type: 'substations', ar: 'محولات الجهراء', en: 'Jahra Substations' },
  { query: 'electricity substation Saad Al Abdullah Kuwait', type: 'substations', ar: 'محولات سعد العبدالله', en: 'Saad Al Abdullah Substations' },
  { query: 'electricity substation Mubarak Al Kabeer Kuwait', type: 'substations', ar: 'محولات مبارك الكبير', en: 'Mubarak Al Kabeer Substations' },
];

const colorByType: Record<LayerKey, string> = {
  plants: '#174ea6',
  ministry: '#6f42c1',
  control: '#0b8043',
  substations: '#d97706',
};

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps?.places) return Promise.resolve();
  if (window.__googleMapsPromise) return window.__googleMapsPromise;
  window.__googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__initWorkScopeGoogleMap';
    (window as any)[callbackName] = () => { resolve(); delete (window as any)[callbackName]; };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&language=ar&region=KW&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
  return window.__googleMapsPromise;
}

export default function GoogleInfrastructureMap() {
  const { language } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading'|'ready'|'missing-key'|'error'>('loading');
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ plants: true, ministry: true, control: true, substations: true });
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const text = (ar: string, en: string) => language === 'ar' ? ar : en;

  useEffect(() => {
    if (!apiKey) { setStatus('missing-key'); return; }
    let cancelled = false;
    const markers: any[] = [];

    loadGoogleMaps(apiKey).then(() => {
      if (cancelled || !mapRef.current) return;
      const google = window.google!;
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 29.3117, lng: 47.4818 },
        zoom: 8,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }],
      });
      const service = new google.maps.places.PlacesService(map);
      const info = new google.maps.InfoWindow();
      const bounds = new google.maps.LatLngBounds();

      SEARCH_POINTS.forEach((point) => {
        service.textSearch({ query: point.query, region: 'kw' }, (results: any[], placeStatus: string) => {
          if (cancelled || placeStatus !== google.maps.places.PlacesServiceStatus.OK || !results?.length) return;
          const result = results[0];
          if (!result.geometry?.location) return;
          const marker = new google.maps.Marker({
            map,
            position: result.geometry.location,
            title: language === 'ar' ? point.ar : point.en,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: point.type === 'substations' ? 6 : 8,
              fillColor: colorByType[point.type],
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
          marker.__layerType = point.type;
          marker.addListener('click', () => {
            const label = language === 'ar' ? point.ar : point.en;
            const category = {
              plants: text('محطة توليد رئيسية', 'Main generation station'),
              ministry: text('المقر الرئيسي للوزارة', 'Ministry headquarters'),
              control: text('مركز تحكم كهربائي', 'Electricity control center'),
              substations: text('محطة تحويل / محول منطقة', 'Area substation'),
            }[point.type];
            info.setContent(`<div style="font-family:Cairo,Arial;min-width:190px"><strong>${label}</strong><div style="margin-top:5px;color:#64748b">${category}</div><div style="margin-top:5px;font-size:12px">${result.formatted_address || ''}</div></div>`);
            info.open({ map, anchor: marker });
          });
          marker.setVisible(layers[point.type]);
          markers.push(marker);
          bounds.extend(result.geometry.location);
          if (!bounds.isEmpty()) map.fitBounds(bounds, 36);
        });
      });
      (mapRef.current as any).__markers = markers;
      setStatus('ready');
    }).catch(() => setStatus('error'));

    return () => { cancelled = true; markers.forEach(marker => marker.setMap(null)); };
  }, [apiKey, language]);

  useEffect(() => {
    const markers = (mapRef.current as any)?.__markers || [];
    markers.forEach((marker: any) => marker.setVisible(Boolean(layers[marker.__layerType as LayerKey])));
  }, [layers]);

  const toggle = (key: LayerKey) => setLayers(current => ({ ...current, [key]: !current[key] }));

  if (status === 'missing-key') {
    return <div className="googleMapFallback">
      <iframe title={text('خريطة الكويت من جوجل', 'Google Map of Kuwait')} src="https://www.google.com/maps?q=Kuwait%20power%20stations&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <div className="googleMapConfigNotice">{text('الخريطة من Google Maps تعمل الآن. لإظهار نقاط المحطات والمحولات التفاعلية أضف مفتاح Google Maps المقيّد للدومين.', 'Google Maps is active. Add a domain-restricted Google Maps key to display interactive station and substation markers.')}</div>
    </div>;
  }

  return <div className="googleInfrastructureMap">
    <div className="googleMapFilters">
      {([
        ['plants', text('محطات التوليد', 'Power stations')],
        ['ministry', text('الوزارة', 'Ministry')],
        ['control', text('مراكز التحكم', 'Control centers')],
        ['substations', text('محولات المناطق', 'Area substations')],
      ] as [LayerKey,string][]).map(([key,label]) => <label key={key}><input type="checkbox" checked={layers[key]} onChange={() => toggle(key)} /><span style={{background:colorByType[key]}} />{label}</label>)}
    </div>
    <div ref={mapRef} className="googleMapCanvas" />
    {status === 'loading' && <div className="googleMapLoading">{text('جارٍ تحميل خريطة Google Maps والمواقع...', 'Loading Google Maps and locations...')}</div>}
    {status === 'error' && <div className="googleMapLoading">{text('تعذر تحميل Google Maps. تحقق من المفتاح وقيود الدومين.', 'Google Maps could not load. Check the key and domain restrictions.')}</div>}
  </div>;
}
