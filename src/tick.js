// Logica pura del cronometro, sin React, para poder testearla sin navegador.

// Cuanto dura el flash verde que marca el instante exacto de la salida.
export const GO_FLASH_MS = 1000;
// A partir de cuantos milisegundos restantes la pantalla avisa que se viene la salida.
export const WARN_MS = 5000;

export const IDLE = 'idle';
export const PREP = 'prep';
export const RUNNING = 'running';

export const IDLE_TICK = { phase: IDLE, rep: 0, secondsLeft: 0, cue: 'normal' };

/**
 * Todo se deriva de `prepEndsAt`, que es el timestamp absoluto en el que arranca
 * la repeticion 1. Nunca se acumula tiempo sumando de a un segundo: eso deriva
 * varios segundos a lo largo de un entrenamiento. Como cada valor se recalcula
 * desde cero contra el reloj del sistema, si el loop se frena (pantalla apagada,
 * app en segundo plano) al volver muestra el valor correcto en vez de arrastrar
 * el error acumulado.
 */
export function computeTick(now, { intervalMs, prepEndsAt }) {
  if (now < prepEndsAt) {
    const remaining = prepEndsAt - now;
    return {
      phase: PREP,
      rep: 0,
      secondsLeft: Math.ceil(remaining / 1000),
      cue: remaining <= WARN_MS ? 'warn' : 'normal',
    };
  }

  const elapsed = now - prepEndsAt;
  const sinceLastZero = elapsed % intervalMs;
  const remaining = intervalMs - sinceLastZero;

  let cue = 'normal';
  if (sinceLastZero < GO_FLASH_MS) cue = 'go';
  else if (remaining <= WARN_MS) cue = 'warn';

  return {
    phase: RUNNING,
    rep: Math.floor(elapsed / intervalMs) + 1,
    // Con ceil la cuenta va 1:50 ... 0:01 y en el rollover pega el flash verde.
    // El flash es el cero, asi que nunca hace falta mostrar 0:00.
    secondsLeft: Math.ceil(remaining / 1000),
    cue,
  };
}

export function sameTick(a, b) {
  return (
    a.phase === b.phase &&
    a.rep === b.rep &&
    a.secondsLeft === b.secondsLeft &&
    a.cue === b.cue
  );
}
