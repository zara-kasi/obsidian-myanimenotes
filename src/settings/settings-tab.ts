// Settings UI for Cassette plugin

import { App, PluginSettingTab, Setting } from 'obsidian';
import CassettePlugin from '../main';
import { startAuthFlow, logout, isAuthenticated } from '../auth/mal';

export class CassetteSettingTab extends PluginSettingTab {
  plugin: CassettePlugin;

  constructor(app: App, plugin: CassettePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

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

    const MAL = section('MAL');
    const Simkl = section('Simkl');
    const Setup = section('Setup');
    const Display = section('Sync');
    const Template = section('Template');
    const About = section('About');

    // ========================================================================
    // MAL Section
    // ========================================================================

    this.renderMALSection(MAL);

  // ========================================================================
    // About Section
    // ========================================================================
    
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

  private renderMALSection(container: HTMLElement): void {
    const isAuth = isAuthenticated(this.plugin);

    // Show user info if authenticated
    if (isAuth && this.plugin.settings.malUserInfo) {
      const userInfo = this.plugin.settings.malUserInfo;
      
      const userSetting = new Setting(container)
        .setName('Logged in as')
        .setDesc(userInfo.name);

      // Add avatar if available
      if (userInfo.picture) {
        userSetting.controlEl.createEl('img', {
          attr: {
            src: userInfo.picture,
            alt: userInfo.name,
            style: 'width: 32px; height: 32px; border-radius: 50%; margin-left: 8px;'
          }
        });
      }
    }

    // Client ID
    new Setting(container)
      .setName('Client ID')
      .setDesc('Your MyAnimeList Client ID')
      .addText(text => text
        .setPlaceholder('Enter Client ID')
        .setValue(this.plugin.settings.malClientId)
        .onChange(async (value) => {
          this.plugin.settings.malClientId = value.trim();
          await this.plugin.saveSettings();
        }));

    // Client Secret (optional)
    new Setting(container)
      .setName('Client Secret')
      .setDesc('Your MyAnimeList Client Secret (optional for some apps)')
      .addText(text => {
        text
          .setPlaceholder('Enter Client Secret (optional)')
          .setValue(this.plugin.settings.malClientSecret || '')
          .onChange(async (value) => {
            this.plugin.settings.malClientSecret = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        return text;
      });

    // Authentication button
    new Setting(container)
      .setName(isAuth ? 'Sign Out' : 'Authenticate')
      .setDesc(isAuth 
        ? 'Sign out from MyAnimeList' 
        : 'Sign in to MyAnimeList to sync your anime list'
      )
      .addButton(button => {
        button
          .setButtonText(isAuth ? 'Sign Out' : 'Authenticate')
          .setCta()
          .onClick(async () => {
            if (isAuth) {
              await logout(this.plugin);
              this.display(); // Refresh settings UI
            } else {
              await startAuthFlow(this.plugin);
            }
          });
        
        // Style the button based on auth state
        if (isAuth) {
          button.buttonEl.style.backgroundColor = 'var(--interactive-accent)';
        }
      });

    // Add info about getting credentials
    if (!isAuth) {
      new Setting(container)
        .setName('How to get credentials')
        .setDesc('Create an app at https://myanimelist.net/apiconfig to get your Client ID and Secret. Set the redirect URI to: obsidian://cassette-auth/mal')
        .then(setting => {
          setting.settingEl.style.borderTop = '1px solid var(--background-modifier-border)';
          setting.settingEl.style.paddingTop = '1em';
          setting.settingEl.style.marginTop = '1em';
        });
    }
  }
}