import * as migration_20260804_040101_initial_cms from './20260804_040101_initial_cms';
import * as migration_20260804_061212_product_editorial_model from './20260804_061212_product_editorial_model';
import * as migration_20260808_154913 from './20260808_154913';
import * as migration_20260809_022600_task5_publication_metadata from './20260809_022600_task5_publication_metadata';
import * as migration_20260809_053900_task7_rms_source_snapshot from './20260809_053900_task7_rms_source_snapshot';
import * as migration_20260809_060000_task9_site_settings from './20260809_060000_task9_site_settings';

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
    up: migration_20260808_154913.up,
    down: migration_20260808_154913.down,
    name: '20260808_154913',
  },
  {
    up: migration_20260809_022600_task5_publication_metadata.up,
    down: migration_20260809_022600_task5_publication_metadata.down,
    name: '20260809_022600_task5_publication_metadata',
  },
  {
    up: migration_20260809_053900_task7_rms_source_snapshot.up,
    down: migration_20260809_053900_task7_rms_source_snapshot.down,
    name: '20260809_053900_task7_rms_source_snapshot'
  },
  {
    up: migration_20260809_060000_task9_site_settings.up,
    down: migration_20260809_060000_task9_site_settings.down,
    name: '20260809_060000_task9_site_settings'
  },
];
