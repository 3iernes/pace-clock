import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatClock, formatTimeOfDay } from './format.js';

test('formatea los intervalos como se leen en la pileta', () => {
  assert.equal(formatClock(110), '1:50');
  assert.equal(formatClock(90), '1:30');
  assert.equal(formatClock(20), '0:20');
  assert.equal(formatClock(5), '0:05');
  assert.equal(formatClock(0), '0:00');
});

test('las sesiones largas siguen siendo legibles pasada la hora', () => {
  assert.equal(formatClock(45 * 60), '45:00');
  assert.equal(formatClock(60 * 60), '60:00');
  assert.equal(formatClock(90 * 60 + 15), '90:15');
});

test('no devuelve tiempos negativos', () => {
  assert.equal(formatClock(-5), '0:00');
});

test('la hora del dia va en 24 horas y con cero a la izquierda', () => {
  const alas = (h, m) => formatTimeOfDay(new Date(2026, 7, 25, h, m));
  assert.equal(alas(19, 42), '19:42');
  assert.equal(alas(9, 5), '09:05');
  assert.equal(alas(0, 0), '00:00'); // medianoche, no 24:00 ni 12:00
  assert.equal(alas(12, 0), '12:00'); // mediodia, no 00:00
  assert.equal(alas(23, 59), '23:59');
});
