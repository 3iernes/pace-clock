import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeTick, PREP, RUNNING } from './tick.js';

// Un entrenamiento real: salida cada 1:50, 5 segundos de preparacion.
const T0 = 1_700_000_000_000; // epoch arbitrario pero fijo
const PREP_MS = 5_000;
const INTERVAL_MS = 110_000;
const SCHEDULE = { intervalMs: INTERVAL_MS, prepEndsAt: T0 + PREP_MS };

const at = (offsetFromRep1) => computeTick(SCHEDULE.prepEndsAt + offsetFromRep1, SCHEDULE);

test('la preparacion cuenta hacia abajo y recien despues arranca la repeticion 1', () => {
  assert.equal(computeTick(T0, SCHEDULE).phase, PREP);
  assert.equal(computeTick(T0, SCHEDULE).secondsLeft, 5);
  assert.equal(computeTick(T0 + 4_000, SCHEDULE).secondsLeft, 1);

  // El instante exacto en que termina la preparacion ya es la repeticion 1.
  const first = at(0);
  assert.equal(first.phase, RUNNING);
  assert.equal(first.rep, 1);
  assert.equal(first.secondsLeft, 110);
});

test('una preparacion larga solo avisa en los ultimos 5 segundos', () => {
  const longPrep = { intervalMs: INTERVAL_MS, prepEndsAt: T0 + 30_000 };
  assert.equal(computeTick(T0, longPrep).cue, 'normal');
  assert.equal(computeTick(T0 + 24_000, longPrep).cue, 'normal');
  assert.equal(computeTick(T0 + 25_001, longPrep).cue, 'warn');
});

test('el flash verde marca el cero y el ambar los ultimos 5 segundos', () => {
  assert.equal(at(0).cue, 'go');
  assert.equal(at(999).cue, 'go');
  assert.equal(at(1_000).cue, 'normal');
  assert.equal(at(INTERVAL_MS - 5_001).cue, 'normal');
  assert.equal(at(INTERVAL_MS - 5_000).cue, 'warn');
  assert.equal(at(INTERVAL_MS - 1).cue, 'warn');
  // Cruzar el cero reinicia el ciclo y sube el contador.
  assert.equal(at(INTERVAL_MS).cue, 'go');
  assert.equal(at(INTERVAL_MS).rep, 2);
  assert.equal(at(INTERVAL_MS).secondsLeft, 110);
});

test('la cuenta nunca muestra 0:00 ni se pasa del intervalo', () => {
  // Barrido de 40 minutos a 250ms: el rango visible tiene que ser siempre 1..110.
  for (let ms = 0; ms <= 40 * 60_000; ms += 250) {
    const { secondsLeft } = at(ms);
    assert.ok(
      secondsLeft >= 1 && secondsLeft <= 110,
      `secondsLeft fuera de rango (${secondsLeft}) en ${ms}ms`,
    );
  }
});

test('sin deriva: despues de 45 minutos el ciclo sigue clavado', () => {
  // 45 min = 2.700.000ms. 24 intervalos completos (2.640.000ms) + 60.000ms.
  const t = at(2_700_000);
  assert.equal(t.rep, 25);
  assert.equal(t.secondsLeft, 50); // 110 - 60

  // Y cada frontera cae exacta, sin corrimiento acumulado.
  for (let n = 1; n <= 200; n += 1) {
    const boundary = at(n * INTERVAL_MS);
    assert.equal(boundary.rep, n + 1, `rep incorrecto en la frontera ${n}`);
    assert.equal(boundary.secondsLeft, 110, `la cuenta no reinicio en la frontera ${n}`);
    assert.equal(boundary.cue, 'go', `falto el flash en la frontera ${n}`);

    // Un milisegundo antes todavia es la repeticion anterior, por 0:01.
    const justBefore = at(n * INTERVAL_MS - 1);
    assert.equal(justBefore.rep, n, `rep incorrecto justo antes de la frontera ${n}`);
    assert.equal(justBefore.secondsLeft, 1, `la cuenta no llego a 0:01 antes de la frontera ${n}`);
  }
});

test('el contador es monotono: nunca retrocede ni saltea repeticiones', () => {
  let previous = 0;
  for (let ms = 0; ms <= 60 * 60_000; ms += 500) {
    const { rep } = at(ms);
    assert.ok(rep === previous || rep === previous + 1, `salto de ${previous} a ${rep} en ${ms}ms`);
    previous = rep;
  }
  // Una hora a 1:50 son 32 repeticiones completas y arrancando la 33.
  assert.equal(previous, 33);
});

test('volver despues de un hueco recalcula en vez de arrastrar el error', () => {
  // Simula la pantalla apagada 12 minutos: el valor al volver depende solo del
  // reloj del sistema, no de cuantas veces corrio el loop mientras tanto.
  const gap = at(12 * 60_000);
  assert.equal(gap.rep, Math.floor((12 * 60_000) / INTERVAL_MS) + 1);
  assert.equal(gap.rep, 7);
});
