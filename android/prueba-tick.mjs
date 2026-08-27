#!/usr/bin/env node
/**
 * Comprueba que la matematica del reloj sea identica a la de la web.
 *
 *     npm run test:reloj
 *
 * El costo de tener una app nativa es que src/tick.js existe dos veces: la
 * segunda copia es android/wear/java/ar/pileta/reloj/Tick.java. Este script
 * cierra ese agujero: genera decenas de miles de casos con la version de
 * verdad, la de JavaScript, y hace que la de Java los reproduzca uno por uno.
 * Si alguien toca una sola de las dos, esto falla.
 *
 * Necesita javac y java, que ya hacen falta para compilar el APK. Por eso no
 * esta colgado de `npm test`, que corre en CI sin JDK garantizado.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTick, PREP, RUNNING } from '../src/tick.js';
import { formatClock } from '../src/format.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SALIDA = join(AQUI, 'build', 'prueba');
const FUENTES = join(AQUI, 'wear', 'java', 'ar', 'pileta', 'reloj');
const PRUEBA = join(AQUI, 'wear', 'prueba', 'ar', 'pileta', 'reloj');

// Las mismas constantes que Tick.java, que en Java son enteros.
const FASE = { [PREP]: 0, [RUNNING]: 1 };
const SENAL = { normal: 0, warn: 1, go: 2 };

const T0 = 1_700_000_000_000; // epoch arbitrario pero fijo, igual que en los tests de la web

/** Series reales y un par de extremos del rango configurable. */
const COMBOS = [
  { intervalo: 20, prep: 0 },
  { intervalo: 20, prep: 5 },
  { intervalo: 35, prep: 5 },
  { intervalo: 110, prep: 5 },
  { intervalo: 110, prep: 30 },
  { intervalo: 300, prep: 0 },
  { intervalo: 600, prep: 15 },
];

const lineas = [];

function agregarTick(ahora, intervalMs, prepEndsAt) {
  const t = computeTick(ahora, { intervalMs, prepEndsAt });
  lineas.push(
    `T ${ahora} ${intervalMs} ${prepEndsAt} ${FASE[t.phase]} ${t.rep} ` +
      `${t.secondsLeft} ${t.elapsedSeconds} ${SENAL[t.cue]}`,
  );
}

for (const { intervalo, prep } of COMBOS) {
  const intervalMs = intervalo * 1000;
  const prepEndsAt = T0 + prep * 1000;

  // Toda la preparacion, con un paso que no es multiplo de 1000 para caer en
  // medio de los segundos y no solo en los bordes.
  for (let t = T0; t < prepEndsAt; t += 137) agregarTick(t, intervalMs, prepEndsAt);
  if (prep > 0) agregarTick(prepEndsAt - 1, intervalMs, prepEndsAt);

  // Las fronteras de las primeras 200 repeticiones, que es donde vive
  // cualquier bug de redondeo: el cambio de repeticion, el flash verde, el
  // ambar y el ultimo milisegundo antes del cero.
  for (let rep = 0; rep < 200; rep++) {
    const base = prepEndsAt + rep * intervalMs;
    for (const delta of [-1, 0, 1, 2, 999, 1000, 1001,
      intervalMs - 5001, intervalMs - 5000, intervalMs - 4999, intervalMs - 1]) {
      agregarTick(base + delta, intervalMs, prepEndsAt);
    }
  }

  // Y un barrido de una hora, que es mas de lo que dura un entrenamiento.
  for (let t = T0; t < T0 + 3_600_000; t += 997) agregarTick(t, intervalMs, prepEndsAt);
}

// El formateo tambien esta portado, asi que tambien se compara.
for (let s = 0; s <= 3600; s += 7) lineas.push(`F ${s} ${formatClock(s)}`);
for (const s of [0, 1, 59, 60, 61, 599, 600, 601, 3599, 3600]) {
  lineas.push(`F ${s} ${formatClock(s)}`);
}

rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(join(SALIDA, 'clases'), { recursive: true });
const vectores = join(SALIDA, 'vectores.txt');
writeFileSync(vectores, lineas.join('\n'));
console.log(`${lineas.length} casos generados con src/tick.js y src/format.js`);

function correr(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (r.error) throw r.error;
  process.stdout.write(r.stdout ?? '');
  if (r.status !== 0) {
    process.stderr.write(r.stderr ?? '');
    process.exit(r.status ?? 1);
  }
}

// Tick y Formato no importan nada de Android, asi que se compilan con el javac
// pelado, sin el SDK de por medio.
correr('javac', [
  '-nowarn', '-encoding', 'UTF-8', '-d', join(SALIDA, 'clases'),
  join(FUENTES, 'Tick.java'),
  join(FUENTES, 'Formato.java'),
  join(PRUEBA, 'PruebaTick.java'),
]);

correr('java', ['-cp', join(SALIDA, 'clases'), 'ar.pileta.reloj.PruebaTick', vectores]);
