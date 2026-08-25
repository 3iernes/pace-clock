export const HORA_MS = 3_600_000;

/**
 * Calcula el ritmo de consumo en puntos porcentuales por hora.
 *
 * El nivel de bateria se reporta de a 1%, asi que restar "nivel inicial menos
 * nivel actual" arrastra hasta un punto entero de error: al arrancar podes estar
 * recien pasado un escalon o a punto de cruzar el siguiente. Sobre media hora de
 * medicion eso es muchisimo.
 *
 * Por eso, apenas hay dos caidas registradas, la tasa se calcula entre la primera
 * y la ultima: ahi hay una cantidad exacta de puntos en un intervalo exacto, sin
 * fracciones desconocidas en las puntas. Hasta entonces devolvemos la estimacion
 * cruda marcada como imprecisa.
 *
 * @param caidas Momentos en que el nivel bajo, en orden: [{ nivel, t }]
 * @param ancla  Nivel y momento en que arranco la medicion
 */
export function calcularTasa({ caidas, ancla, nivelActual, ahora }) {
  const primera = caidas[0];
  const ultima = caidas[caidas.length - 1];

  if (caidas.length >= 2 && ultima.t > primera.t) {
    const puntos = (primera.nivel - ultima.nivel) * 100;
    const horas = (ultima.t - primera.t) / HORA_MS;
    return { porHora: puntos / horas, precisa: true };
  }

  const horas = (ahora - ancla.t) / HORA_MS;
  if (horas <= 0) return { porHora: null, precisa: false };
  return { porHora: ((ancla.nivel - nivelActual) * 100) / horas, precisa: false };
}

/** A este ritmo, cuantas horas quedan de cero a cien. */
export function autonomiaHoras(porHora) {
  return porHora > 0 ? 100 / porHora : null;
}
