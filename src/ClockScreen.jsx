import { formatClock } from './format.js';
import { PREP } from './useIntervalTimer.js';

/**
 * Los hijos van sueltos, sin agrupar, y cada uno se coloca por `grid-area`.
 * Agruparlos impediria lo que necesita la version vertical: que el transcurrido
 * quede debajo del REP en horizontal pero debajo de la cuenta en vertical. Una
 * sola marca, dos grillas distintas en styles.css.
 */
export default function ClockScreen({ tick, intervalSeconds, wakeLockStatus, onStop }) {
  const preparing = tick.phase === PREP;
  const screenReaderLabel = preparing
    ? `Preparacion, ${tick.secondsLeft} segundos`
    : `Repeticion ${tick.rep}, faltan ${tick.secondsLeft} segundos`;
  const avisarPantalla = wakeLockStatus === 'unsupported' || wakeLockStatus === 'error';

  return (
    <main className={`screen screen--clock cue-${tick.cue}`}>
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

      <button type="button" className="btn btn--stop" onClick={onStop}>
        STOP
      </button>
    </main>
  );
}
