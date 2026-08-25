import StopButton from './StopButton.jsx';
import { formatClock, formatTimeOfDay } from './format.js';
import { PREP } from './useIntervalTimer.js';

/**
 * Los hijos van sueltos, sin agrupar, y cada uno se coloca por `grid-area`.
 * Agruparlos impediria lo que necesita la version vertical: que el transcurrido
 * quede debajo del REP en horizontal pero debajo de la cuenta en vertical. Una
 * sola marca, dos grillas distintas en styles.css.
 */
export default function ClockScreen({ tick, intervalSeconds, wakeLockStatus, onStop, medidor }) {
  const preparing = tick.phase === PREP;
  const screenReaderLabel = preparing
    ? `Preparacion, ${tick.secondsLeft} segundos`
    : `Repeticion ${tick.rep}, faltan ${tick.secondsLeft} segundos`;
  const avisarPantalla = wakeLockStatus === 'unsupported' || wakeLockStatus === 'error';

  return (
    <main className={`screen screen--clock cue-${tick.cue}`}>
      {/* Dentro de la grilla y no flotando: como item ocupa su propia columna,
          asi que no puede superponerse con el REP ni con el pace por mas que
          cambien los tamanos de texto del sistema. Flotando si podia. */}
      <div className="clock__cima">
        {medidor}
        <span className="reloj">
          {formatTimeOfDay(new Date())}
          <small className="reloj__hs">hs</small>
        </span>
      </div>

      <span className="clock__rep">{preparing ? 'PREPARATE' : `REP ${tick.rep}`}</span>

      {!preparing && (
        <span className="clock__transcurrido">{formatClock(tick.elapsedSeconds)}</span>
      )}

      <span className="clock__interval">cada {formatClock(intervalSeconds)}</span>

      <div className="clock__count" aria-hidden="true">
        {formatClock(tick.secondsLeft)}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {screenReaderLabel}
      </p>

      {avisarPantalla && <span className="clock__warning">La pantalla se puede apagar sola</span>}

      <StopButton onStop={onStop} />
    </main>
  );
}
