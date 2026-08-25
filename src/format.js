/** Segundos a "M:SS", que es como se leen los intervalos en la pileta. */
export function formatClock(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Hora del dia en 24 horas, "19:42".
 *
 * La PWA corre en pantalla completa y tapa el reloj del sistema, asi que sin
 * esto no hay forma de saber la hora sin salir de la app en medio de una serie.
 */
export function formatTimeOfDay(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
