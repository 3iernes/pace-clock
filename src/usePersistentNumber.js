import { useCallback, useState } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// localStorage puede tirar excepcion (modo privado, cuota llena). Que no se
// pueda guardar la preferencia no es motivo para que la app no arranque.
function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** Igual que useState pero recuerda el valor entre sesiones. */
export function usePersistentNumber(key, fallback, { min, max }) {
  const [value, setValue] = useState(() => clamp(read(key, fallback), min, max));

  const update = useCallback(
    (next) => {
      const clamped = clamp(next, min, max);
      setValue(clamped);
      try {
        window.localStorage.setItem(key, String(clamped));
      } catch {
        // Se pierde la preferencia para la proxima vez, nada mas.
      }
    },
    [key, min, max],
  );

  return [value, update];
}
