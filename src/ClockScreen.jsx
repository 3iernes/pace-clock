import { formatClock } from './format.js';
import { PREP } from './useIntervalTimer.js';

export default function ClockScreen({ tick, intervalSeconds, wakeLockStatus, onStop }) {
  const preparing = tick.phase === PREP;
  const screenReaderLabel = preparing
    ? `Preparacion, ${tick.secondsLeft} segundos`
    : `Repeticion ${tick.rep}, faltan ${tick.secondsLeft} segundos`;

  return (
    <main className={`screen screen--clock cue-${tick.cue}`}>
      <header className="clock__top">
        <span className="clock__rep">{preparing ? 'PREPARATE' : `REP ${tick.rep}`}</span>
        <span className="clock__interval">cada {formatClock(intervalSeconds)}</span>
      </header>

      <div className="clock__count" aria-hidden="true">
        {formatClock(tick.secondsLeft)}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {screenReaderLabel}
      </p>

      <footer className="clock__bottom">
        {(wakeLockStatus === 'unsupported' || wakeLockStatus === 'error') && (
          <span className="clock__warning">La pantalla se puede apagar sola</span>
        )}
        <button type="button" className="btn btn--stop" onClick={onStop}>
          STOP
        </button>
      </footer>
    </main>
  );
}
