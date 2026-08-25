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
- Corre indefinidamente hasta que se la para. No hace falta configurar cuántas
  repeticiones: se para cuando terminás la serie.
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
4. **STOP** cuando termina la serie.

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

Si se cambia `public/logo.svg`, regenerar los íconos con
`npm run generate-pwa-assets`.

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
| `src/tick.test.js` | Tests, con el runner nativo de Node (sin dependencias). |

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
