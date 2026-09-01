import { DEFAULT_URL, validEventUrl } from './qr';

export type BouquetId = 'peony' | 'rose' | 'lily' | 'tulip' | 'mixed';
export type PaletteId = 'original' | 'blush' | 'ruby' | 'marigold' | 'sunbeam' | 'lavender' | 'azure' | 'dusk';

export interface BloomPalette {
  id: PaletteId;
  name: string;
  flowerPrimary: string;
  flowerSecondary: string;
  flowerAccent: string;
  foliagePrimary: string;
  foliageSecondary: string;
  qrPrimary: string;
  qrAccent: string;
}

export interface BouquetPreset {
  id: BouquetId;
  name: string;
  description: string;
  flowerCount: number;
  leafCount: number;
  layout: 'sphere' | 'structured' | 'loose' | 'vertical' | 'mixed';
}

export interface BloomConfig {
  destinationUrl: string;
  to: string;
  from: string;
  message: string;
  bouquet: BouquetId;
  palette: PaletteId;
}

export const BOUQUETS: BouquetPreset[] = [
  { id: 'peony', name: 'Peony', description: 'Layered and romantic', flowerCount: 19, leafCount: 28, layout: 'sphere' },
  { id: 'rose', name: 'Rose', description: 'Structured spiral blooms', flowerCount: 20, leafCount: 25, layout: 'structured' },
  { id: 'lily', name: 'Lily', description: 'Open and airy', flowerCount: 11, leafCount: 22, layout: 'loose' },
  { id: 'tulip', name: 'Tulip', description: 'Tall cup-shaped stems', flowerCount: 18, leafCount: 26, layout: 'vertical' },
  { id: 'mixed', name: 'Mixed', description: 'Organic garden bouquet', flowerCount: 18, leafCount: 30, layout: 'mixed' },
];

export const PALETTES: BloomPalette[] = [
  { id: 'original', name: 'Original', flowerPrimary: '#d92f79', flowerSecondary: '#f35c9b', flowerAccent: '#8f174f', foliagePrimary: '#294f48', foliageSecondary: '#668c72', qrPrimary: '#5e183d', qrAccent: '#253d78' },
  { id: 'blush', name: 'Blush', flowerPrimary: '#ed8fac', flowerSecondary: '#ffd0d9', flowerAccent: '#bd527c', foliagePrimary: '#375f50', foliageSecondary: '#83a087', qrPrimary: '#6d2948', qrAccent: '#3e4d77' },
  { id: 'ruby', name: 'Ruby', flowerPrimary: '#ae173b', flowerSecondary: '#df3656', flowerAccent: '#650d2a', foliagePrimary: '#234a3d', foliageSecondary: '#5e7c64', qrPrimary: '#571027', qrAccent: '#233767' },
  { id: 'marigold', name: 'Marigold', flowerPrimary: '#e76c1f', flowerSecondary: '#ffad3c', flowerAccent: '#9b331d', foliagePrimary: '#385528', foliageSecondary: '#718547', qrPrimary: '#64291f', qrAccent: '#3d3c69' },
  { id: 'sunbeam', name: 'Sunbeam', flowerPrimary: '#f4bd2f', flowerSecondary: '#ffe37a', flowerAccent: '#c16624', foliagePrimary: '#3b602e', foliageSecondary: '#7f984f', qrPrimary: '#57411d', qrAccent: '#30446f' },
  { id: 'lavender', name: 'Lavender', flowerPrimary: '#9d75d5', flowerSecondary: '#cfb5f0', flowerAccent: '#654493', foliagePrimary: '#355446', foliageSecondary: '#718b76', qrPrimary: '#4a3268', qrAccent: '#243d70' },
  { id: 'azure', name: 'Azure', flowerPrimary: '#3e86c8', flowerSecondary: '#8fc4e9', flowerAccent: '#24528d', foliagePrimary: '#26564e', foliageSecondary: '#6d9185', qrPrimary: '#214366', qrAccent: '#522d68' },
  { id: 'dusk', name: 'Dusk', flowerPrimary: '#7d496d', flowerSecondary: '#b77d9e', flowerAccent: '#482744', foliagePrimary: '#263f3b', foliageSecondary: '#5f746b', qrPrimary: '#3f243b', qrAccent: '#25385e' },
];

export const DEFAULT_CONFIG: BloomConfig = {
  destinationUrl: DEFAULT_URL,
  to: 'Monu',
  from: 'Sasi',
  message: '',
  bouquet: 'peony',
  palette: 'original',
};

export function getBouquet(id: string | null | undefined) {
  return BOUQUETS.find((bouquet) => bouquet.id === id) ?? BOUQUETS[0];
}

export function getPalette(id: string | null | undefined) {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0];
}

export function readBloomConfig(params: URLSearchParams): BloomConfig {
  const destination = params.get('url');
  return {
    destinationUrl: (destination && validEventUrl(destination)) || DEFAULT_CONFIG.destinationUrl,
    to: params.get('to')?.slice(0, 60) || DEFAULT_CONFIG.to,
    from: params.get('from')?.slice(0, 60) || DEFAULT_CONFIG.from,
    message: params.get('message')?.slice(0, 140) || '',
    bouquet: getBouquet(params.get('bouquet')).id,
    palette: getPalette(params.get('palette')).id,
  };
}

export function createRecipientUrl(config: BloomConfig, location: Location) {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('view', 'recipient');
  url.searchParams.set('url', config.destinationUrl);
  url.searchParams.set('to', config.to);
  url.searchParams.set('from', config.from);
  if (config.message) url.searchParams.set('message', config.message);
  url.searchParams.set('bouquet', config.bouquet);
  url.searchParams.set('palette', config.palette);
  return url.href;
}
