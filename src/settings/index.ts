export { CassetteSettingTab } from './settings-tab';
export type { CassetteSettings } from './settings-interface';
export { DEFAULT_SETTINGS } from './settings-interface';
export type { MALUserInfo } from '../api/mal';

// Template configuration exports
export type { TemplateConfig, PropertyItem, PropertyMetadata } from './template-config';
export { 
  DEFAULT_ANIME_TEMPLATE, 
  DEFAULT_MANGA_TEMPLATE,
  getPropertyMetadata,
  getAvailableProperties,
  generatePropertyId
} from './template-config';

// Template settings exports
export { 
  renderTemplateSection,
  createTemplateSettingsState
} from './template-settings';
export type { TemplateSettingsState } from './template-settings';
