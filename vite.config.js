import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Para publicar en GitHub Pages esto tiene que pasar a '/pileta/' (o al nombre
  // que tenga el repo). En local se queda en '/'.
  base: '/',

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
        start_url: './',
        scope: './',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        // Al instalarla queda bloqueada en horizontal, sin depender de la
        // rotacion automatica del telefono.
        orientation: 'landscape',
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
});
