import * as migration_20260804_040101_initial_cms from './20260804_040101_initial_cms';
import * as migration_20260804_061212_product_editorial_model from './20260804_061212_product_editorial_model';
import * as migration_20260808_145911_secure_r2_media_lifecycle from './20260808_145911_secure_r2_media_lifecycle';

export const migrations = [
  {
    up: migration_20260804_040101_initial_cms.up,
    down: migration_20260804_040101_initial_cms.down,
    name: '20260804_040101_initial_cms',
  },
  {
    up: migration_20260804_061212_product_editorial_model.up,
    down: migration_20260804_061212_product_editorial_model.down,
    name: '20260804_061212_product_editorial_model',
  },
  {
    up: migration_20260808_145911_secure_r2_media_lifecycle.up,
    down: migration_20260808_145911_secure_r2_media_lifecycle.down,
    name: '20260808_145911_secure_r2_media_lifecycle'
  },
];
