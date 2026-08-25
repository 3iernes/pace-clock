import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatClock } from './format.js';

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
