import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autonomiaHoras, calcularTasa } from './bateria.js';

const MIN = 60_000;
const T0 = 1_700_000_000_000;

test('con dos caidas la tasa se mide entre caidas, no desde el ancla', () => {
  // Enganchamos la medicion en un momento cualquiera, con el nivel ya en 80%.
  const ancla = { nivel: 0.8, t: T0 };
  const caidas = [
    { nivel: 0.79, t: T0 + 3 * MIN }, // primera caida a los 3 minutos
    { nivel: 0.78, t: T0 + 13 * MIN }, // segunda, 10 minutos despues
  ];
  const { porHora, precisa } = calcularTasa({
    caidas,
    ancla,
    nivelActual: 0.78,
    ahora: T0 + 13 * MIN,
  });
  // 1 punto en 10 minutos = 6 puntos por hora. El tramo previo a la primera
  // caida se descarta a proposito: no sabemos cuanto le faltaba al escalon.
  assert.ok(Math.abs(porHora - 6) < 1e-9, `esperaba 6, dio ${porHora}`);
  assert.equal(precisa, true);
});

test('la estimacion cruda daria un numero distinto, y peor', () => {
  const ancla = { nivel: 0.8, t: T0 };
  // Sin caidas suficientes cae al calculo crudo: 2 puntos en 13 minutos.
  const { porHora, precisa } = calcularTasa({
    caidas: [{ nivel: 0.79, t: T0 + 3 * MIN }],
    ancla,
    nivelActual: 0.78,
    ahora: T0 + 13 * MIN,
  });
  assert.equal(precisa, false);
  assert.ok(Math.abs(porHora - 9.23) < 0.01, `esperaba ~9.23, dio ${porHora}`);
  // O sea: 9.2%/h contra los 6%/h reales. Un 54% de sobreestimacion.
});

test('mas caidas siguen dando la misma tasa si el consumo es parejo', () => {
  const ancla = { nivel: 0.8, t: T0 };
  const caidas = [];
  // Una caida cada 10 minutos durante una hora.
  for (let i = 0; i < 7; i += 1) {
    caidas.push({ nivel: 0.79 - i * 0.01, t: T0 + (3 + i * 10) * MIN });
  }
  const { porHora, precisa } = calcularTasa({
    caidas,
    ancla,
    nivelActual: 0.73,
    ahora: T0 + 63 * MIN,
  });
  assert.ok(Math.abs(porHora - 6) < 1e-9, `esperaba 6, dio ${porHora}`);
  assert.equal(precisa, true);
});

test('sin tiempo transcurrido no inventa un numero', () => {
  const { porHora } = calcularTasa({
    caidas: [],
    ancla: { nivel: 0.8, t: T0 },
    nivelActual: 0.8,
    ahora: T0,
  });
  assert.equal(porHora, null);
});

test('dos caidas en el mismo instante no dividen por cero', () => {
  const { porHora, precisa } = calcularTasa({
    caidas: [
      { nivel: 0.79, t: T0 },
      { nivel: 0.78, t: T0 },
    ],
    ancla: { nivel: 0.8, t: T0 - 5 * MIN },
    nivelActual: 0.78,
    ahora: T0,
  });
  assert.equal(precisa, false);
  assert.ok(Number.isFinite(porHora), `esperaba un numero finito, dio ${porHora}`);
});

test('la autonomia es el inverso de la tasa', () => {
  assert.equal(autonomiaHoras(10), 10); // 10%/h => 10 horas
  assert.equal(autonomiaHoras(12.5), 8);
  assert.equal(autonomiaHoras(0), null);
});
