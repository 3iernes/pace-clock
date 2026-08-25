import { formatClock, formatTimeOfDay } from './format.js';
import { PREP } from './useIntervalTimer.js';

export default function ClockScreen({ tick, intervalSeconds, wakeLockStatus, onStop }) {
  const preparing = tick.phase === PREP;
  const screenReaderLabel = preparing
    ? `Preparacion, ${tick.secondsLeft} segundos`
    : `Repeticion ${tick.rep}, faltan ${tick.secondsLeft} segundos`;

  return (
    <main className={`screen screen--clock cue-${tick.cue}`}>
      <header className="clock__top">
        <div className="clock__sesion">
          <span className="clock__rep">{preparing ? 'PREPARATE' : `REP ${tick.rep}`}</span>
          {!preparing && (
            <span className="clock__transcurrido">{formatClock(tick.elapsedSeconds)}</span>
          )}
        </div>
        <div className="clock__meta">
          {/* Sin hook ni intervalo propio: esta pantalla ya se redibuja una vez
              por segundo porque cambia la cuenta regresiva, asi que la hora se
              refresca sola. */}
          <span className="clock__hora">{formatTimeOfDay(new Date())}</span>
          <span className="clock__interval">cada {formatClock(intervalSeconds)}</span>
        </div>
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
