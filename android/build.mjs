#!/usr/bin/env node
/**
 * Compila un APK y lo deja listo para publicar.
 *
 *     npm run apk         # envoltura WebView para el Moto E5 Plus
 *     npm run apk:reloj   # app nativa para el Galaxy Watch4
 *
 * Sin Gradle: aapt2 para los recursos, javac para el codigo, d8 para el dex y
 * apksigner para la firma. Todo sale del SDK de Android que ya esta instalado.
 *
 * Lo unico que no se puede tocar sin romperlo es MIN_API. Define la version del
 * formato DEX que emite d8, y con 26 sale DEX 038, que es hasta donde lee
 * Android 8.0. Subirlo a 28 o mas emite DEX 039 y el telefono deja de poder
 * arrancar la app: es exactamente lo que le pasa al paquete que genera Google.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');

const MIN_API = 26;
const TARGET_API = 28;
const CLAVE = 'pileta';

/**
 * Las dos variantes comparten el pipeline y los iconos, y no comparten nada mas:
 * son dos aplicaciones distintas para dos dispositivos distintos.
 */
const VARIANTES = {
  telefono: {
    descripcion: 'envoltura WebView (Moto E5 Plus, Android 8)',
    manifest: join(AQUI, 'AndroidManifest.xml'),
    java: join(AQUI, 'java'),
    paquete: 'ar.pileta',
    res: [join(AQUI, 'res')],
    salida: 'pileta.apk',
  },
  reloj: {
    descripcion: 'app nativa Wear OS (Galaxy Watch4)',
    manifest: join(AQUI, 'wear', 'AndroidManifest.xml'),
    java: join(AQUI, 'wear', 'java'),
    paquete: 'ar.pileta.reloj',
    // Los iconos salen de la variante del telefono; el tema es propio.
    res: [join(AQUI, 'res'), join(AQUI, 'wear', 'res')],
    salida: 'pileta-reloj.apk',
  },
};

const nombre = process.argv[2] ?? 'telefono';
const variante = VARIANTES[nombre];
if (!variante) {
  throw new Error(`Variante desconocida: ${nombre}. Hay ${Object.keys(VARIANTES).join(' y ')}.`);
}
const SALIDA = join(AQUI, 'build', nombre);

function ubicarSdk() {
  const candidatos = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
    process.env.HOME && join(process.env.HOME, 'Android', 'Sdk'),
    process.env.HOME && join(process.env.HOME, 'Library', 'Android', 'sdk'),
  ].filter(Boolean);
  const sdk = candidatos.find((c) => existsSync(join(c, 'build-tools')));
  if (!sdk) {
    throw new Error(
      'No encuentro el SDK de Android. Defini ANDROID_HOME apuntando a el.',
    );
  }
  return sdk;
}

/** La build-tools mas nueva y la plataforma mas nueva que haya instaladas. */
function elegirVersiones(sdk) {
  const ordenar = (a, b) => b.localeCompare(a, undefined, { numeric: true });
  const bt = readdirSync(join(sdk, 'build-tools')).sort(ordenar)[0];
  const plataforma = readdirSync(join(sdk, 'platforms'))
    .filter((p) => existsSync(join(sdk, 'platforms', p, 'android.jar')))
    .sort(ordenar)[0];
  if (!bt || !plataforma) throw new Error('Falta build-tools o una plataforma en el SDK.');
  return { bt, plataforma };
}

/** Todos los archivos con esa extension abajo de `raiz`, recursivo. */
function buscar(raiz, extension) {
  const encontrados = [];
  const recorrer = (dir) => {
    for (const entrada of readdirSync(dir)) {
      const camino = join(dir, entrada);
      if (statSync(camino).isDirectory()) recorrer(camino);
      else if (entrada.endsWith(extension)) encontrados.push(camino);
    }
  };
  recorrer(raiz);
  return encontrados;
}

function correr(paso, cmd, args) {
  if (paso) process.stdout.write(`${paso}\n`);
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    process.stderr.write((r.stdout || '') + (r.stderr || ''));
    throw new Error(`Fallo: ${cmd}`);
  }
  return r.stdout ?? '';
}

const sdk = ubicarSdk();
const { bt, plataforma } = elegirVersiones(sdk);
const BT = join(sdk, 'build-tools', bt);
const ANDROID_JAR = join(sdk, 'platforms', plataforma, 'android.jar');
const exe = (n) => join(BT, process.platform === 'win32' ? `${n}.exe` : n);

console.log(`variante   ${nombre}   ${variante.descripcion}`);
console.log(`SDK        ${sdk}`);
console.log(`build-tools ${bt}   plataforma ${plataforma}   min-api ${MIN_API}\n`);

rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(join(SALIDA, 'clases'), { recursive: true });
mkdirSync(join(SALIDA, 'dex'), { recursive: true });

// Un zip por directorio de recursos. El orden importa: los ultimos pisan a los
// primeros, asi que lo propio de la variante va al final.
const zipsRes = variante.res.map((dir, i) => {
  const zip = join(SALIDA, `res${i}.zip`);
  correr(`1/6  recursos (${dir.slice(AQUI.length + 1) || 'res'})`, exe('aapt2'), [
    'compile', '--dir', dir, '-o', zip,
  ]);
  return zip;
});

correr('2/6  enlazado', exe('aapt2'), [
  'link',
  '-o', join(SALIDA, 'base.apk'),
  '-I', ANDROID_JAR,
  '--manifest', variante.manifest,
  ...zipsRes.flatMap((zip) => ['-R', zip]),
  '--java', join(SALIDA, 'gen'),
  '--auto-add-overlay',
  '--min-sdk-version', String(MIN_API),
  '--target-sdk-version', String(TARGET_API),
]);

const fuentes = [
  ...buscar(variante.java, '.java'),
  join(SALIDA, 'gen', ...variante.paquete.split('.'), 'R.java'),
];

correr(`3/6  javac (${fuentes.length} archivos)`, 'javac', [
  '-nowarn', '-source', '8', '-target', '8', '-encoding', 'UTF-8',
  '-bootclasspath', ANDROID_JAR,
  '-d', join(SALIDA, 'clases'),
  ...fuentes,
]);

const clases = buscar(join(SALIDA, 'clases'), '.class');

correr(`4/6  dex (min-api ${MIN_API})`, 'java', [
  '-cp', join(BT, 'lib', 'd8.jar'), 'com.android.tools.r8.D8',
  '--min-api', String(MIN_API), '--lib', ANDROID_JAR,
  '--output', join(SALIDA, 'dex'), ...clases,
]);

correr('5/6  empaquetado', 'jar', [
  'uf', join(SALIDA, 'base.apk'), '-C', join(SALIDA, 'dex'), 'classes.dex',
]);
copyFileSync(join(SALIDA, 'base.apk'), join(SALIDA, 'sin-firmar.apk'));

const llave = join(AQUI, 'llave.jks');
if (!existsSync(llave)) {
  correr('     (generando llave de firma)', 'keytool', [
    '-genkeypair', '-keystore', llave, '-storepass', CLAVE, '-keypass', CLAVE,
    '-alias', CLAVE, '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-dname', 'CN=Pileta, OU=Personal, O=Personal, C=AR',
  ]);
}

correr('6/6  firma', exe('zipalign'), [
  '-f', '-p', '4', join(SALIDA, 'sin-firmar.apk'), join(SALIDA, 'alineado.apk'),
]);
correr('', 'java', [
  '-jar', join(BT, 'lib', 'apksigner.jar'), 'sign',
  '--ks', llave, '--ks-pass', `pass:${CLAVE}`, '--key-pass', `pass:${CLAVE}`,
  '--min-sdk-version', String(MIN_API),
  '--out', join(SALIDA, variante.salida), join(SALIDA, 'alineado.apk'),
]);

// Verificar que el DEX haya salido en una version que el telefono pueda leer.
const dex = readFileSync(join(SALIDA, 'dex', 'classes.dex')).subarray(4, 7).toString();
if (dex > '038') {
  throw new Error(
    `El DEX salio en ${dex} y Android 8.0 lee hasta 038. Revisa MIN_API.`,
  );
}

const destino = join(RAIZ, 'public', variante.salida);
copyFileSync(join(SALIDA, variante.salida), destino);

console.log(`\nDEX ${dex}  (Android 8.0 lee hasta 038)`);
console.log(`APK -> public/${variante.salida}`);
console.log('Deployalo con: git add public && git commit && git push');
