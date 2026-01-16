import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'SS-BG',
  version: pkg.version,
  description: pkg.description,
  
  permissions: [
    'storage',
    'unlimitedStorage',
    'activeTab',
    'tabs',
    'scripting',
    'downloads',
    'contextMenus'
  ],
  
  host_permissions: ['<all_urls>'],
  
  background: {
    service_worker: 'src/background/main.ts',
    type: 'module'
  },
  
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/main.ts'],
      run_at: 'document_idle'
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
      suggested_key: {
        default: 'Ctrl+Shift+S'
      },
      description: 'スクリーンショットを撮影'
    },
    'take-screenshot-crop': {
      suggested_key: {
        default: 'Ctrl+Shift+C'
      },
      description: 'スクリーンショット撮影後トリミング'
    }
  }
});
