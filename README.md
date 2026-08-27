# Pace Clock

Cronómetro de intervalos para entrenamientos de natación, pensado para correr en
un teléfono viejo apoyado al borde de la pileta.

## El problema

Los entrenamientos de natación se estructuran en series con **salida cada X
tiempo**. Por ejemplo, "8x100 cada 1:50" quiere decir: nadar ocho veces 100
metros, saliendo cada un minuto cincuenta exactos.

Lo importante es que **el reloj corre independiente del nadador**. No es un
cronómetro que se arranca y se para: es un ciclo fijo que se repite. El descanso
es simplemente lo que sobra entre que tocás la pared y el próximo cero.

| Nadás los 100m en | Descansás |
| --- | --- |
| 1:40 | 10 segundos |
| 1:30 | 20 segundos |
| 1:55 | nada, salís pasado |

La mayoría de los relojes inteligentes no tienen esta función. Esta app hace
sólo eso.

## Qué hace

- Cuenta regresiva desde el intervalo configurado hasta cero, y se reinicia sola.
- Lleva el número de repetición, así no hay que contar mentalmente mientras se nada.
- Debajo, el tiempo total de la sesión, que empieza a correr con la repetición 1
  (la cuenta de preparación no suma).
- Corre indefinidamente hasta que se la para. No hace falta configurar cuántas
  repeticiones: se para cuando terminás la serie.
- Muestra la hora, porque en pantalla completa la PWA tapa el reloj del sistema.
- Funciona **sin conexión**, una vez instalada.

### Aviso visual, no sonoro

El teléfono queda al borde de una pileta con otra gente nadando, así que no hay
sonido. En su lugar la pantalla entera cambia de color:

| Momento | Pantalla |
| --- | --- |
| Nadando o descansando | Fondo oscuro, números claros |
| Últimos 5 segundos | **Ámbar** — prepararse |
| El cero | **Flash verde** de 1 segundo — salir |

Ocupa la pantalla completa a propósito: con antiparras mojadas se ve un bloque de
color de reojo, un número chico no.

## Uso

1. Configurar el intervalo (botones `−` / `+`, de a 5 segundos) y los segundos de
   preparación.
2. **START**. Corre la cuenta de preparación para acomodarse en la pared.
3. Al llegar a cero empieza la repetición 1 y el ciclo del intervalo.
4. **STOP**: hay que mantenerlo apretado dos segundos. El botón se va llenando
   mientras tanto y si se suelta antes, no pasa nada.

El último intervalo usado queda guardado para la próxima vez.

## Desarrollo

```bash
npm install
npm run dev      # servidor local, tambien accesible desde la red
npm test         # tests de la logica del cronometro
npm run test:reloj  # compara la copia en Java de esa logica contra la de JS
npm run build    # build de produccion + service worker
```

Para probar desde el teléfono, `npm run dev` expone la app en la IP local. Tener
en cuenta que sobre `http://` **no funcionan ni el Wake Lock ni el modo offline**:
ambos exigen contexto seguro (HTTPS o localhost). Para probar eso hace falta la
app publicada.

Los íconos PNG están versionados en `public/` y listados a mano en el manifest
(`vite.config.js`). Se generaron una vez con `@vite-pwa/assets-generator`, que
**ya no es dependencia del proyecto**: arrastraba `sharp` y con él tres avisos de
seguridad de severidad alta, para una tarea que se corre casi nunca. Si algún día
cambia `public/logo.svg`, regenerarlos con:

```bash
npx @vite-pwa/assets-generator --preset minimal-2023 public/logo.svg
```

## Auditoría de batería

La app puede medir su propio consumo, para saber si el teléfono aguanta un
entrenamiento entero. Se prende con el botón **BATERÍA**, abajo a la derecha de la
pantalla de configuración, y queda guardado entre sesiones.

También se puede prender con `?bateria=1` en la URL y apagar con `?bateria=0`, que
es más cómodo para probar desde la computadora. Pero a un ícono de la pantalla de
inicio no se le pueden poner query params, así que el botón es el camino principal.
El botón sólo aparece si el navegador expone la API de batería.

Aparece una franja arriba con el nivel inicial, el actual, los minutos
transcurridos y el ritmo de consumo en puntos porcentuales por hora.

**Por qué el número tarda en volverse confiable.** El nivel de batería se reporta
de a 1%, así que restar "nivel inicial menos nivel actual" arrastra hasta un punto
entero de error: al arrancar podés estar recién pasado un escalón o a punto de
cruzar el siguiente. Por eso el ritmo se calcula **entre caídas de nivel**, donde
hay una cantidad exacta de puntos en un intervalo exacto. Hasta que haya dos
caídas registradas el número se muestra en gris y con "(estimando…)", porque es la
cuenta cruda. En un caso real medido en los tests, la cuenta cruda daba 9,2%/h
cuando el valor verdadero era 6%/h.

La medición sólo corre con el teléfono desenchufado. Si se enchufa, se reinicia.

## Las dos orientaciones

La pantalla del cronómetro no es un layout que se reacomoda: son **dos grillas
distintas sobre la misma marca**, elegidas con `@media (orientation: portrait)`.
El motivo es que cambia cuál es la restricción.

| | Horizontal (720×360) | Vertical (360×720) |
| --- | --- | --- |
| Escasea | el alto | el ancho |
| La cuenta se dimensiona por | alto (48vh) | ancho (36vw) |
| REP | 14px, en una esquina | 41px, arriba de la cuenta |
| STOP | pastilla chica, abajo a la derecha | ancho y alto, en la zona del pulgar |

Por eso los hijos de `ClockScreen` van sueltos y cada uno se coloca por
`grid-area`: agrupados no se podría, por ejemplo, poner el transcurrido debajo
del REP en horizontal y debajo de la cuenta en vertical.

El tamaño de la cuenta en vertical sale de que `10:00` —el intervalo más largo
configurable— entre en 360px de ancho.

## Si la app instalada falla

En el Moto E5 Plus (Android 8) la PWA instalada crashea al abrirla con
"Pileta keeps stopping". **No es un problema de esta app.**

La evidencia: el mismo código anda perfecto abriendo la URL en Chrome en ese
mismo teléfono; anda instalada en un Galaxy S22; `chrome://webapks` aparece vacío,
o sea que Chrome ni siquiera registra el paquete; y —lo definitivo— **instalar
cualquier otra PWA en ese teléfono crashea igual**, incluida una de Google como
Squoosh.

### La causa exacta

El informe de errores de Android lo dejó por escrito:

```
Process: org.chromium.webapk.a35bd75b37133fd76_v2
java.lang.ClassNotFoundException: Didn't find class
  "org.chromium.webapk.shell_apk.h2o.SplashContentProvider"
Suppressed: java.io.IOException: Failed to open dex files from base.apk
  because: Unrecognized version number in base.apk: 0 3 9
```

`0 3 9` es la versión del formato DEX, el bytecode compilado. Android 8.0 lee
hasta **038**; el paquete que genera Google viene en **039**, que requiere
Android 9. El runtime no puede interpretarlo, no encuentra ninguna clase, y el
proceso se cae antes de cargar nada.

En el mismo informe hay **diez** paquetes WebAPK distintos fallando igual, todos
con DEX 039. No es esta app: es toda PWA instalada en ese teléfono. Y no es falta
de espacio (había 6,1 GB libres).

### La solución: `android/`

Como la versión de DEX la define el `minSdkVersion` con el que se compila,
**compilando el paquete nosotros con `--min-api 26` sale en DEX 038** y el
teléfono lo ejecuta.

`android/` es una envoltura nativa mínima: una Activity con un WebView que carga
la misma URL. En ese teléfono el proveedor de WebView es Chrome 138 —el mismo
motor que el navegador— así que renderiza idéntico.

Se compila con un solo comando, sin Gradle ni dependencias — sólo las
herramientas del SDK de Android que ya están instaladas:

```bash
npm run apk
```

Deja el resultado en `public/pileta.apk`, listo para commitear y deployar. El
script encuentra el SDK solo (o se le indica con `ANDROID_HOME`) y **falla si el
DEX sale en una versión que el teléfono no pueda leer**, para que nunca se
publique un APK que no arranca.

Ventajas sobre el WebAPK, más allá de que este arranca:

- **La pantalla se mantiene prendida con `FLAG_KEEP_SCREEN_ON`**, una bandera
  nativa que sostiene el sistema mientras la ventana esté arriba. Es más
  confiable que la Wake Lock API, que se libera sola al ocultarse la app. La web
  lo detecta por el sufijo `PiletaApp` en el user agent y no muestra el aviso.
- Pantalla completa e inmersiva por configuración de la Activity.
- El botón atrás manda la app al fondo en vez de cerrarla en medio de una serie.

El APK queda publicado en `public/pileta.apk`, así que se descarga desde el mismo
sitio. La llave de firma (`android/llave.jks`) **no** se versiona: si se pierde,
hay que desinstalar antes de reinstalar, porque la firma no va a coincidir.

Por eso al arrancar el cronómetro la app **pide pantalla completa y fija la
orientación** por API (`src/pantallaCompleta.js`). Eso devuelve, desde el
navegador, las dos únicas cosas que daba la app instalada, y hace que el
empaquetado roto deje de importar. Las dos llamadas degradan sin romper: si el
navegador las rechaza, sólo queda la barra de URL a la vista.

La orientación se fija **a la que tenga el teléfono en ese momento**, no a una
fija, para no romper la versión vertical. Sirve además porque apoyado en el borde
de la pileta el acelerómetro lo puede hacer rotar solo a mitad de una serie.

## El reloj (Galaxy Watch4)

`npm run apk:reloj` compila una **segunda app, nativa**, para Wear OS. No
comparte código con la web: comparte el pipeline de compilación, los íconos y la
matemática del cronómetro.

### Por qué no alcanzaba con la envoltura

La idea obvia era reusar `android/`: cambiar el manifest, dejar el mismo WebView
apuntando a la misma URL. No se puede. **El Watch4 no tiene WebView.**

```
java.lang.UnsupportedOperationException
  at android.webkit.WebViewFactory.getProvider(WebViewFactory.java:345)
  at ar.pileta.MainActivity.onCreate(MainActivity.java:35)
```

Esa excepción la tira `getProvider()` cuando el sistema no declara la feature
`android.software.webview`. No es un WebView viejo ni roto: no existe.
`dumpsys webviewupdate` ni siquiera encuentra el servicio, o sea que la
plataforma se compiló sin soporte. Es el problema opuesto al del Moto: allá el
motor estaba y el paquete no arrancaba, acá el paquete arranca perfecto y falta
el motor.

Como consecuencia, cualquier navegador que se sideloadee en el reloj falla
igual: todos usan el mismo WebView del sistema. La única salida era dibujar.

### Qué cambia respecto de la web

| | Teléfono | Reloj |
| --- | --- | --- |
| Pantalla | 720×360 rectangular | 396×396 **redonda** |
| Render | HTML y CSS | `Canvas`, a mano |
| STOP | botón, mantener 2 s | **toda la pantalla**, mantener 2 s |
| Progreso del STOP | el botón se llena | un aro por el borde |
| Preparación | stepper de a 1 s | un botón que cicla sin / 2 / 3 / 5 s |
| Aviso de salida | color | color **y vibración** |
| Pantalla prendida | Wake Lock API | `FLAG_KEEP_SCREEN_ON` |
| Offline | service worker | no hay nada que bajar |

**En una pantalla redonda el ancho útil depende del alto.** Cada caja se
dimensiona contra la cuerda del círculo a su altura y cada círculo contra el
radio (`Estilo.medioAncho`). Sin eso los bordes quedan cortados por el bisel,
que es exactamente lo que pasaría reusando el layout vertical del teléfono.

**El STOP es la pantalla entera.** En 396 píxeles redondos no sobra lugar para
un botón que además haya que embocar con el dedo mojado, así que se mantiene
apretado en cualquier lado y el progreso va por el borde: es el único lugar de
una pantalla redonda donde entra una barra larga.

**Vibra tres segundos antes de cada cero**, un pulso solo y largo. Es la única
señal que le gana al color: se siente abajo del agua y con la cara en el fondo,
que es justo donde el flash verde no sirve para nada. Para que el aviso llegue
con la pantalla apagada, el loop sigue corriendo cuando la app deja de estar a
la vista, sólo que más lento y sin dibujar nada. No es una garantía: si el
sistema mata el proceso, el aviso se corta hasta volver a abrir la app.

Con una preparación de 2 o 3 segundos el aviso caería arriba del START, así que
ahí no vibra: sólo con preparación de 5.

**No pide permiso de INTERNET.** La app es todo el paquete. No hay service
worker que cebar antes de ir a la pileta, que era la parte frágil de la versión
web sin WiFi.

**El gesto de deslizar para cerrar está desactivado**
(`windowSwipeToDismiss` en `false`). En la pileta el reloj se roza contra el
agua y contra el brazo todo el tiempo, y cerrar la app a mitad de una serie
obliga a reconfigurar todo. Para salir queda el botón físico de atrás, que la
manda al fondo sin perder la serie.

**Se reengancha a la serie en curso.** El timestamp de arranque se guarda en
`SharedPreferences`, así que si el sistema mata la app —en el reloj pasa seguido,
se apaga la pantalla y se baja la muñeca— al volver muestra la repetición
correcta en vez de la pantalla de configuración. Una serie de más de tres horas
se considera olvidada y no se retoma.

### El costo: la matemática existe dos veces

`src/tick.js` está portado línea por línea a `Tick.java`. Es la única
duplicación del proyecto y es la peligrosa, porque es el único lugar donde puede
haber un bug de tiempo.

```bash
npm run test:reloj
```

Genera decenas de miles de casos con la versión de JavaScript —toda la
preparación, las fronteras de las primeras 200 repeticiones con cuatro
intervalos distintos, y un barrido de una hora— y hace que la de Java los
reproduzca uno por uno. Hoy son 41.647 casos idénticos. Si alguien toca una sola
de las dos copias, esto falla.

No cuelga de `npm test` porque necesita el JDK, y `npm test` corre en CI antes
de publicar el sitio.

### Instalarla

El Watch4 no acepta APKs por el Play Store, así que va por ADB sobre WiFi, con
el reloj y la computadora en la misma red. En el reloj: Ajustes → Acerca del
reloj → Información de software → tocar "Versión de software" hasta que se
active el modo desarrollador, y después Opciones de desarrollador → Depuración
ADB y Depuración por Wi-Fi.

```bash
adb pair IP:PUERTO_DE_EMPAREJADO
```

```bash
adb connect IP:PUERTO_DE_DEPURACION
```

Los dos puertos son distintos y los muestra la pantalla del reloj. El de
emparejar es efímero y muere apenas se usa; el emparejado no hay que repetirlo,
la conexión sí cada vez que el reloj se duerme o cambia de red.

```bash
adb -s IP:PUERTO install -r public/pileta-reloj.apk
```

Con `-s` porque casi siempre hay más de un dispositivo conectado y `adb` no
adivina cuál.

### Lo que el reloj no puede

- **El aviso de color no se ve mientras se nada.** Todo el diseño de la app
  —pantalla completa, ámbar, flash verde— existe para verse de reojo desde el
  andarivel, y una pantalla de 1,2" en la muñeca no da nada de eso: se lee en la
  pared y nada más. La vibración es lo único que sobrevive al agua, y por eso
  terminó siendo la señal principal del reloj en vez de un extra.
- **La pantalla se apaga al bajar la muñeca**, por más `FLAG_KEEP_SCREEN_ON` que
  haya: ese gesto lo maneja el sistema. No importa demasiado, porque la cuenta
  se recalcula contra el reloj del sistema y al levantar la muñeca ya muestra el
  valor correcto.
- **Con Water Lock activado la pantalla táctil no responde**, así que no se
  puede ni parar la serie hasta desactivarlo.

### Archivos

| Archivo | Qué hace |
| --- | --- |
| `android/wear/java/.../Tick.java` | El port de `src/tick.js`. La única duplicación del proyecto. |
| `android/wear/java/.../Formato.java` | El port de `src/format.js`. |
| `android/wear/java/.../Estilo.java` | Los colores de `styles.css` y las dos cuentas de la pantalla redonda. |
| `android/wear/java/.../VistaConfig.java` | Los steppers y el START, dibujados. |
| `android/wear/java/.../VistaReloj.java` | La cuenta gigante, el color y el aro del STOP. |
| `android/wear/java/.../MainActivity.java` | Alterna las dos pantallas y corre el loop. |
| `android/wear/prueba/.../PruebaTick.java` | Compara contra los vectores de la web. No viaja en el APK. |
| `android/prueba-tick.mjs` | Genera esos vectores y corre la comparación. |

## Actualizar

**El APK casi nunca hay que reinstalarlo.** Es una cáscara de 16 KB que carga la
URL; todo el código de la app viene de la web. Sólo hay que recompilarlo si
cambia algo de `android/`: el manifest, la Activity, el ícono o la URL.

Para el resto, un `git push` alcanza: el sitio se deploya solo y **la app aplica
la versión nueva sola**, sin tener que abrirla dos veces.

Cómo funciona: el service worker se registra con `autoUpdate`, así que baja la
versión nueva en segundo plano y se activa enseguida, pero la página que ya está
cargada sigue corriendo con los archivos viejos. `src/actualizacion.js` escucha
`controllerchange` —el momento exacto en que el service worker nuevo toma el
control— y recarga ahí.

Dos detalles que evitan que eso moleste:

- **Nunca recarga en medio de una serie.** Si el cronómetro está corriendo, la
  recarga espera al STOP.
- **No recarga en la primera instalación.** Ahí también hay un `controllerchange`,
  pero no es una actualización, así que se ignora comprobando si ya había un
  controlador al arrancar. Sin esa guarda, cada instalación limpia se comería un
  refresco al pedo.

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `src/tick.js` | La matemática del cronómetro, sin React. Es el único lugar donde puede haber un bug de tiempo. |
| `src/useIntervalTimer.js` | Envuelve lo anterior en React y corre el loop de actualización. |
| `src/useWakeLock.js` | Mantiene la pantalla prendida. |
| `src/App.jsx` | Alterna entre configuración y cronómetro. Define los rangos. |
| `src/SetupScreen.jsx` | Los steppers y el START. |
| `src/ClockScreen.jsx` | La cuenta gigante, el contador y el STOP. |
| `src/styles.css` | Todo el diseño, incluidos los tres estados de color. |
| `src/actualizacion.js` | Aplica una versión nueva sola, pero nunca en medio de una serie. |
| `src/pantallaCompleta.js` | Pide pantalla completa y fija la orientación al arrancar. |
| `src/format.js` | Segundos a `M:SS`. |
| `src/usePersistentNumber.js` | Recuerda la configuración entre sesiones. |
| `src/bateria.js` | El cálculo del ritmo de consumo de batería, sin React. |
| `src/useBatteryAudit.js` | Lee la API de batería y acumula las caídas de nivel. |
| `src/BatteryAudit.jsx` | La franja de lectura, sólo visible con `?bateria=1`. |
| `src/*.test.js` | Tests, con el runner nativo de Node (sin dependencias). |

## Decisiones técnicas

**El cronómetro no acumula.** Sumar de a un segundo con `setInterval` deriva
varios segundos a lo largo de un entrenamiento. Todo se calcula contra un
timestamp absoluto:

```js
const elapsed   = Date.now() - startAt;
const rep       = Math.floor(elapsed / intervalMs) + 1;
const remaining = intervalMs - (elapsed % intervalMs);
```

Como cada valor se recalcula desde cero, si el loop se frena (pantalla apagada,
app en segundo plano) al volver muestra el valor correcto en vez de arrastrar el
error. Los tests verifican esto con un barrido de una hora y las primeras 200
fronteras de repetición.

**El Wake Lock hay que volver a pedirlo.** El navegador lo libera solo cada vez
que la app deja de estar visible, y no lo devuelve al volver. Sin re-pedirlo en
`visibilitychange` funciona los primeros minutos y después falla en silencio.
Si no se puede obtener, la app avisa en pantalla en vez de romperse.

**Se redibuja una vez por segundo, no sesenta.** El loop corre con
`requestAnimationFrame` pero sólo dispara un render cuando cambia algo que se ve.

## Dispositivo objetivo

Moto E5 Plus con Android 8.0 y Chrome 138, sin SIM y sin WiFi en la pileta,
dentro de una bolsa impermeable. De ahí salen casi todas las restricciones de
diseño: sin fuentes web, layout para 720x360 en horizontal, y objetivos táctiles
de 48px o más porque se usa con las manos mojadas.

La orientación horizontal queda fijada en el manifest, así que instalada no
depende de la rotación automática del teléfono.
