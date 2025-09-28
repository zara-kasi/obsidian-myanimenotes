import { App, PluginSettingTab, Setting } from 'obsidian';

import CassettePlugin from './main'
import { AuthModal } from './auth/AuthenticationModal'

export class CassetteSettingTab extends PluginSettingTab {
	plugin: CassettePlugin;

	constructor(app: App, plugin: CassettePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		const section = (title: string, startOpen = false) => {
      const head = containerEl.createEl('h2', { text: title });
      head.style.cursor = 'pointer';
      head.style.userSelect = 'none';
      head.style.margin = '1.2em 0 0.4em 0';
      const body = containerEl.createDiv();
      body.style.marginLeft = '1em';
      body.style.display = startOpen ? 'block' : 'none';
      head.addEventListener('click', () => {
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
      });
      return body;
    };

    const AniList = section('AniList');
    const MAL = section('MAL');
    const Simkl = section('Simkl');
    const Setup = section('Setup');
    const Display = section('Sync');
    const Template = section('Template');
    const About = section('About');
    
    new Setting(AniList)
      .addText(text => text
        .setPlaceholder('Enter Client ID')
          await this.plugin.saveSettings();
        }));
    
    new Setting(About)
      .setName('Author')
      .setDesc(this.plugin.manifest.author);
    new Setting(About)
      .setName('Version')
      .setDesc(this.plugin.manifest.version);
    new Setting(About)
      .setName('Privacy')
      .setDesc('Cassette only talks to the APIs to fetch & update your media data. Nothing else is sent or shared—your data stays local.');

    new Setting(About)
      .setName('GitHub')
      .setDesc('Get more info or report an issue.')
      .addButton(button =>
        button
          .setClass('mod-cta')
          .setButtonText('Open GitHub')
          .onClick(() => {
            window.open('https://github.com/zara-kasi/cassette', '_blank');
          })
      );
	}
}
