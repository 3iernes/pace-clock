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
