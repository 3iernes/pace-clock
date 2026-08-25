import { useCallback } from 'react';
import { formatTimeOfDay } from './format.js';
import BatteryAudit from './BatteryAudit.jsx';
import ClockScreen from './ClockScreen.jsx';
import SetupScreen from './SetupScreen.jsx';
import { HAY_API_BATERIA, useBatteryAudit } from './useBatteryAudit.js';
import { usePersistentNumber } from './usePersistentNumber.js';
import { useIntervalTimer } from './useIntervalTimer.js';
import { useWakeLock } from './useWakeLock.js';

const INTERVAL_RANGE = { min: 20, max: 600, step: 5 };
const PREP_RANGE = { min: 0, max: 60, step: 1 };

const DEFAULT_INTERVAL = 110; // 1:50
const DEFAULT_PREP = 5;

export default function App() {
  const [intervalSeconds, setIntervalSeconds] = usePersistentNumber(
    'pileta.intervalSeconds',
    DEFAULT_INTERVAL,
    INTERVAL_RANGE,
  );
  const [prepSeconds, setPrepSeconds] = usePersistentNumber(
    'pileta.prepSeconds',
    DEFAULT_PREP,
    PREP_RANGE,
  );

  const { tick, running, start, stop } = useIntervalTimer();
  const wakeLockStatus = useWakeLock(running);
  const { estado: bateria, prendida: auditoria, alternar: alternarAuditoria } = useBatteryAudit();

  const handleStart = useCallback(
    () => start(intervalSeconds, prepSeconds),
    [start, intervalSeconds, prepSeconds],
  );

  return (
    <>
      {running ? (
        <ClockScreen
          tick={tick}
          intervalSeconds={intervalSeconds}
          wakeLockStatus={wakeLockStatus}
          onStop={stop}
        />
      ) : (
        <SetupScreen
          intervalSeconds={intervalSeconds}
          prepSeconds={prepSeconds}
          intervalRange={INTERVAL_RANGE}
          prepRange={PREP_RANGE}
          onIntervalChange={setIntervalSeconds}
          onPrepChange={setPrepSeconds}
          onStart={handleStart}
          auditoria={auditoria}
          onAlternarAuditoria={HAY_API_BATERIA ? alternarAuditoria : null}
        />
      )}
      {/* Pila centrada arriba. El reloj va debajo del medidor cuando esta
          prendido, y ocupa su lugar cuando no. Aislado al centro no compite con
          el pace ni con el transcurrido, que es lo que lo hacia ilegible.

          No necesita temporizador propio: App se redibuja cada vez que cambia
          el tick, o sea una vez por segundo. */}
      <div className="cima">
        {auditoria && <BatteryAudit estado={bateria} />}
        {running && (
          <span className="reloj">
            {formatTimeOfDay(new Date())}
            <small className="reloj__hs">hs</small>
          </span>
        )}
      </div>
    </>
  );
}
