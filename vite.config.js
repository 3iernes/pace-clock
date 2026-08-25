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
      // Los iconos ya entran al precache por globPatterns, que barre todo dist.
      // Sin esto el plugin los agrega ademas por su cuenta y quedan duplicados:
      // hoy con la misma revision, asi que Workbox los deduplica en silencio,
      // pero si alguna vez difirieran abortaria la instalacion entera y la app
      // dejaria de funcionar offline.
      includeManifestIcons: false,
      manifest: {
        name: 'Pileta - Cronometro de intervalos',
        short_name: 'Pileta',
        description: 'Cronometro de salidas para entrenamientos de natacion.',
        lang: 'es',
        // Relativos a proposito: asi resuelven contra /pace-clock/ sin repetir
        // el nombre del repo en cada lugar.
        start_url: './',
        scope: './',
        // 'standalone' y sin display_override, que es el camino mas transitado
        // y mas viejo de los WebAPK. La app instalada crashea en el Moto E5 Plus
        // (Android 8) con "Pileta keeps stopping", y estos dos valores son los
        // candidatos mas probables a romper una cascara vieja: fullscreen es un
        // modo poco usado y display_override es una funcion de manifest bastante
        // posterior a ese Android.
        //
        // No se pierde nada: la app pide pantalla completa por API al arrancar
        // (ver pantallaCompleta.js), asi que termina igual a pantalla completa.
        display: 'standalone',
        // 'any' y no 'landscape': con el bloqueo puesto la version vertical
        // no se veria nunca en la PWA instalada. La orientacion se fija al
        // arrancar el cronometro (ver pantallaCompleta.js), que ademas funciona
        // abriendo la app desde el navegador.
        orientation: 'any',
        background_color: '#0B0F14',
        theme_color: '#0B0F14',
        // Listados a mano en vez de generados. Los PNG viven en public/ y solo
        // cambian si cambia public/logo.svg, que pasa casi nunca; a cambio se
        // evita arrastrar sharp como dependencia de desarrollo. Para
        // regenerarlos, ver el README.
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
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
