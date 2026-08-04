import * as migration_20260804_040101_initial_cms from './20260804_040101_initial_cms';
import * as migration_20260804_061212_product_editorial_model from './20260804_061212_product_editorial_model';

export const migrations = [
  {
    up: migration_20260804_040101_initial_cms.up,
    down: migration_20260804_040101_initial_cms.down,
    name: '20260804_040101_initial_cms',
  },
  {
    up: migration_20260804_061212_product_editorial_model.up,
    down: migration_20260804_061212_product_editorial_model.down,
    name: '20260804_061212_product_editorial_model'
  },
];
