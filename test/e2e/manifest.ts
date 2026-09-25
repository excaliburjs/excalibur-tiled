import type { Locator, Page } from '@playwright/test';

export interface TiledCase {
  dir: string;
  file?: string;
  hash?: string;
  name?: string;
  action?: (page: Page, canvas: Locator) => Promise<void>;
  skip?: string;
  tolerance?: number;
  settleSteps?: number;
}

const FORMAT_MAPS = [
  'example-city.tmx',
  'margin.tmx',
  'collider.tmx',
  'example-isometric.tmx',
  'example-city-external-tsx.tmx',
  'example-city-base64.tmx',
  'example-city-gzip.tmx',
  'example-city-zlib.tmx',
  'example-city-zstd.tmx',
  'example-city-infinite-base64.tmx',
  'example-city-infinite-base64-compressed.tmx',
  'example-city.json',
  'test-spacing.json',
  'test-v1.json',
  'test-v1-external.json',
  'test-gzip.json',
  'test-zlib.json'
];

const formatCases: TiledCase[] = FORMAT_MAPS.map((map) => ({
  dir: 'formats',
  hash: map,
  // 'example-city.tmx' -> 'formats-example-city-tmx'
  name: `formats-${map.replace(/\./g, '-')}`
}));

export const TILED_CASES: TiledCase[] = [
  ...formatCases,
  { dir: 'orthogonal' },
  { dir: 'orthogonal-infinite' },
  { dir: 'isometric' },
  { dir: 'isometric-infinite' }
];
