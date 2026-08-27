import { useCallback, useEffect, useState } from 'react';
import BatteryAudit from './BatteryAudit.jsx';
import { aplicarActualizacion, vigilarActualizacion } from './actualizacion.js';
import ClockScreen from './ClockScreen.jsx';
import SetupScreen from './SetupScreen.jsx';
import { HAY_API_BATERIA, useBatteryAudit } from './useBatteryAudit.js';
import { entrarPantallaCompleta, salirPantallaCompleta } from './pantallaCompleta.js';
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

  const handleStart = useCallback(() => {
    // Se llama aca y no desde un efecto porque requestFullscreen exige un gesto
    // del usuario, y este es el click.
    entrarPantallaCompleta();
    start(intervalSeconds, prepSeconds);
  }, [start, intervalSeconds, prepSeconds]);

  const handleStop = useCallback(() => {
    salirPantallaCompleta();
    stop();
  }, [stop]);

  // Una version nueva se aplica sola, pero nunca en medio de una serie: si el
  // cronometro esta corriendo, la recarga espera al STOP.
  const [hayActualizacion, setHayActualizacion] = useState(false);
  useEffect(() => vigilarActualizacion(() => setHayActualizacion(true)), []);
  useEffect(() => {
    if (hayActualizacion && !running) aplicarActualizacion();
  }, [hayActualizacion, running]);

  const medidor = auditoria ? <BatteryAudit estado={bateria} /> : null;

  return (
    <>
      {running ? (
        <ClockScreen
          tick={tick}
          intervalSeconds={intervalSeconds}
          wakeLockStatus={wakeLockStatus}
          onStop={handleStop}
          medidor={medidor}
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
      {/* En el cronometro la pila va dentro de la grilla (ver ClockScreen).
          En configuracion no hay grilla que la contenga, asi que flota. */}
      {!running && medidor && <div className="cima">{medidor}</div>}
    </>
  );
}
