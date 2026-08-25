import { useEffect, useRef, useState } from 'react';
import { calcularTasa } from './bateria.js';

const CLAVE = 'pileta.auditoriaBateria';
const REFRESCO_MS = 10_000;

// Se prende con ?bateria=1 y se apaga con ?bateria=0. Queda guardado, asi que
// alcanza con abrir la URL con el parametro una vez en Chrome para que la
// auditoria tambien aparezca en la PWA instalada, que es donde conviene medir.
function leerFlag() {
  const param = new URLSearchParams(window.location.search).get('bateria');
  try {
    if (param !== null) {
      const prendido = param !== '0';
      window.localStorage.setItem(CLAVE, prendido ? '1' : '0');
      return prendido;
    }
    return window.localStorage.getItem(CLAVE) === '1';
  } catch {
    return param !== null && param !== '0';
  }
}

export const AUDITORIA_PRENDIDA = typeof window !== 'undefined' && leerFlag();

/** Mide el consumo real de bateria mientras la app corre. La matematica del
 *  ritmo vive en bateria.js, que esta testeado aparte. */
export function useBatteryAudit() {
  const [estado, setEstado] = useState(null);
  const anclaRef = useRef(null);
  const caidasRef = useRef([]);

  useEffect(() => {
    if (!AUDITORIA_PRENDIDA || typeof navigator.getBattery !== 'function') {
      return undefined;
    }

    let bateria = null;
    let cancelado = false;
    let temporizador = 0;

    const recalcular = () => {
      if (!bateria || cancelado) return;
      const ahora = Date.now();

      // Enchufado no se mide nada: se reancla para que al desenchufar la
      // medicion arranque limpia.
      if (bateria.charging || !anclaRef.current) {
        if (bateria.charging) caidasRef.current = [];
        anclaRef.current = { nivel: bateria.level, t: ahora };
      }

      const ancla = anclaRef.current;
      const { porHora, precisa } = calcularTasa({
        caidas: caidasRef.current,
        ancla,
        nivelActual: bateria.level,
        ahora,
      });

      setEstado({
        cargando: bateria.charging,
        nivelInicial: Math.round(ancla.nivel * 100),
        nivelActual: Math.round(bateria.level * 100),
        minutos: (ahora - ancla.t) / 60_000,
        gastado: Math.round((ancla.nivel - bateria.level) * 100),
        caidas: caidasRef.current.length,
        porHora,
        precisa,
      });
    };

    const alCambiarNivel = () => {
      if (!bateria || bateria.charging) return;
      const caidas = caidasRef.current;
      const ultima = caidas[caidas.length - 1];
      if (!ultima || bateria.level < ultima.nivel) {
        caidas.push({ nivel: bateria.level, t: Date.now() });
      }
      recalcular();
    };

    navigator.getBattery().then((b) => {
      if (cancelado) return;
      bateria = b;
      b.addEventListener('levelchange', alCambiarNivel);
      b.addEventListener('chargingchange', recalcular);
      recalcular();
      temporizador = setInterval(recalcular, REFRESCO_MS);
    });

    return () => {
      cancelado = true;
      clearInterval(temporizador);
      bateria?.removeEventListener('levelchange', alCambiarNivel);
      bateria?.removeEventListener('chargingchange', recalcular);
    };
  }, []);

  return estado;
}
