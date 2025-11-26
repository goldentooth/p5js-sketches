export { KeyRepeatHandler } from './KeyRepeatHandler';
export type { KeyRepeatConfig, KeyInfo } from './KeyRepeatHandler';

export {
  createKeyMapper,
  defaultKeyMapper,
  isMovementKey,
  KeyMappingPresets,
} from './KeyboardMapping';
export type { KeyMappingConfig, KeyMapper } from './KeyboardMapping';

export { preventMovementKeyScroll } from './scroll-prevention';
