import { formatClock } from './format.js';

// Sin teclado numerico a proposito: con las manos mojadas y el telefono adentro
// de una bolsa, dos botones grandes son mucho mas confiables que tipear. Los
// intervalos de natacion siempre caen en multiplos de 5 segundos.
function Stepper({ label, display, onDecrement, onIncrement, canDecrement, canIncrement }) {
  return (
    <div className="stepper">
      <span className="stepper__label">{label}</span>
      <div className="stepper__row">
        <button
          type="button"
          className="stepper__btn"
          onClick={onDecrement}
          disabled={!canDecrement}
          aria-label={`Bajar ${label}`}
        >
          &minus;
        </button>
        <span className="stepper__value">{display}</span>
        <button
          type="button"
          className="stepper__btn"
          onClick={onIncrement}
          disabled={!canIncrement}
          aria-label={`Subir ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SetupScreen({
  intervalSeconds,
  prepSeconds,
  intervalRange,
  prepRange,
  onIntervalChange,
  onPrepChange,
  onStart,
}) {
  return (
    <main className="screen screen--setup">
      <div className="setup__controls">
        <Stepper
          label="Salida cada"
          display={formatClock(intervalSeconds)}
          onDecrement={() => onIntervalChange(intervalSeconds - intervalRange.step)}
          onIncrement={() => onIntervalChange(intervalSeconds + intervalRange.step)}
          canDecrement={intervalSeconds > intervalRange.min}
          canIncrement={intervalSeconds < intervalRange.max}
        />
        <Stepper
          label="Preparacion"
          display={`${prepSeconds}s`}
          onDecrement={() => onPrepChange(prepSeconds - prepRange.step)}
          onIncrement={() => onPrepChange(prepSeconds + prepRange.step)}
          canDecrement={prepSeconds > prepRange.min}
          canIncrement={prepSeconds < prepRange.max}
        />
      </div>

      <button type="button" className="btn btn--start" onClick={onStart}>
        START
      </button>
    </main>
  );
}
