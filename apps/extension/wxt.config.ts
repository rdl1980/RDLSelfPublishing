import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  outDir: '.output',
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'RDL Self Publishing',
    description: 'Metriche KDP (BSR, vendite stimate, royalty) sulle pagine di amazon.it',
    default_locale: 'it',
    permissions: ['storage', 'alarms', 'offscreen', 'downloads', 'scripting', 'activeTab'],
    host_permissions: [
      'https://www.amazon.it/*',
      'https://completion.amazon.it/*',
      'http://localhost:3000/*',
      'https://*.vercel.app/*',
    ],
  },
});
