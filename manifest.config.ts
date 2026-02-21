import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'bg-ss',
  version: pkg.version,
  description: pkg.description,

  permissions: [
    'storage',
    'activeTab',
    'downloads',
    'contextMenus',
    'offscreen',
    'scripting'
  ],

  background: {
    service_worker: 'src/background/main.ts',
    type: 'module'
  },

  web_accessible_resources: [
    {
      resources: ['assets/content-bundle.js'],
      matches: ['<all_urls>']
    }
  ],

  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png'
    }
  },

  options_page: 'src/options/index.html',

  icons: {
    '16': 'icons/icon16.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png'
  },

  commands: {
    'take-screenshot': {
      description: 'スクリーンショットを撮影'
    },
    'autofill-forms': {
      description: 'フォームに情報を入力'
    }
  }
});
