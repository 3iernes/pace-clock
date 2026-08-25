import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// En GitHub Pages el sitio cuelga de /pace-clock/ (el nombre del repo), pero en
// desarrollo conviene servir desde la raiz: asi la URL que se abre en el telefono
// para probar es http://<ip-local>:5173/ y no hay que acordarse del subdirectorio.
const BASE_EN_PRODUCCION = '/pace-clock/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE_EN_PRODUCCION : '/',

  // El telefono de la pileta es un Moto E5 Plus con Chrome 138: un target
  // conservador no cuesta nada y saca de la ecuacion cualquier sorpresa.
  build: { target: 'es2020' },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      pwaAssets: { config: true },
      manifest: {
        name: 'Pileta - Cronometro de intervalos',
        short_name: 'Pileta',
        description: 'Cronometro de salidas para entrenamientos de natacion.',
        lang: 'es',
        // Relativos a proposito: asi resuelven contra /pace-clock/ sin repetir
        // el nombre del repo en cada lugar.
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        // 'any' y no 'landscape': con el bloqueo puesto la version vertical
        // no se veria nunca en la PWA instalada. El costo es que ahora la app
        // sigue la rotacion automatica de Android en vez de garantizar
        // horizontal por su cuenta.
        orientation: 'any',
        background_color: '#0B0F14',
        theme_color: '#0B0F14',
      },
      workbox: {
        // Sin "webmanifest": vite-plugin-pwa ya agrega el manifest al precache por
        // su cuenta. Duplicarlo hace que Workbox aborte la instalacion entera
        // (add-to-cache-list-conflicting-entries) y no se cachee absolutamente
        // nada, o sea que la app deja de funcionar offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
}));
