import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(__dirname, '..', 'src', 'app', '(dashboard)', 'dashboard', 'live', 'page.tsx');
let content = readFileSync(filePath, 'utf8');

const oldMapInit = `  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-light': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'carto-light',
            type: 'raster',
            source: 'carto-light',
          },
        ],
      },
      center: [124.8, 10.75],
      zoom: 11,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => map.current?.remove();
  }, []);`;

const newMapInit = `  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const container = mapContainer.current;

    const initMap = () => {
      if (map.current) return;
      map.current = new maplibregl.Map({
        container,
        style: {
          version: 8,
          sources: {
            'carto-light': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'carto-light', type: 'raster', source: 'carto-light' }],
        },
        center: [124.8, 10.75],
        zoom: 11,
      });
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    };

    const observer = new ResizeObserver(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        observer.disconnect();
        initMap();
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);`;

if (content.includes(oldMapInit)) {
  content = content.replace(oldMapInit, newMapInit);
  writeFileSync(filePath, content, 'utf8');
  console.log('Fixed map init');
} else {
  console.log('Pattern not found');
  console.log(content.substring(content.indexOf('useEffect'), content.indexOf('useEffect') + 200));
}
