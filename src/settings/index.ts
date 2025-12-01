export { CassetteSettingTab } from './settings-tab';
export type { CassetteSettings } from './settings-interface';
export { DEFAULT_SETTINGS } from './settings-interface';
export type { MALUserInfo } from '../api/mal';
export { renderPropertyMappingSection } from './property-settings';

// Template configuration exports (no modal needed)
export type { TemplateConfig, PropertyItem, PropertyMetadata } from './template-config';
export { 
  DEFAULT_ANIME_TEMPLATE, 
  DEFAULT_MANGA_TEMPLATE,
  getPropertyMetadata,
  getAvailableProperties,
  generatePropertyId
} from './template-config';