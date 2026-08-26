import { useEffect, useState } from 'react';

const SUPPORTED = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

// La envoltura nativa de Android (ver android/) mantiene la pantalla prendida
// con FLAG_KEEP_SCREEN_ON, que la sostiene el sistema mientras la ventana este
// arriba: mas confiable que esta API, que se libera sola al ocultarse la app.
// Corriendo ahi adentro no hay nada que pedir ni de que avisar.
const EN_ENVOLTURA =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('PiletaApp');

/**
 * Mantiene la pantalla prendida mientras corre el cronometro.
 *
 * El detalle que rompe en silencio: el navegador libera el lock solo cada vez que
 * la app deja de estar visible, y no lo devuelve al volver. Sin re-pedirlo en
 * `visibilitychange` funciona los primeros minutos y despues falla sin aviso,
 * que es justo lo que no queremos a mitad de un entrenamiento.
 *
 * Devuelve el estado para poder avisar en pantalla si no se pudo conseguir.
 */
export function useWakeLock(active) {
  const [status, setStatus] = useState(() => {
    if (EN_ENVOLTURA) return 'nativo';
    return SUPPORTED ? 'idle' : 'unsupported';
  });

  useEffect(() => {
    if (EN_ENVOLTURA || !SUPPORTED) return undefined;
    if (!active) {
      setStatus('idle');
      return undefined;
    }

    let sentinel = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || sentinel || document.visibilityState !== 'visible') return;
      setStatus('acquiring');
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) {
          next.release().catch(() => {});
          return;
        }
        sentinel = next;
        setStatus('active');
        next.addEventListener('release', () => {
          if (sentinel === next) sentinel = null;
        });
      } catch {
        // Puede fallar por bateria baja o por politica del navegador. No es
        // fatal: el cronometro sigue andando, solo se puede apagar la pantalla.
        setStatus('error');
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      const current = sentinel;
      sentinel = null;
      current?.release().catch(() => {});
    };
  }, [active]);

  return status;
}
