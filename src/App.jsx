import { useCallback } from 'react';
import ClockScreen from './ClockScreen.jsx';
import SetupScreen from './SetupScreen.jsx';
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

  const handleStart = useCallback(
    () => start(intervalSeconds, prepSeconds),
    [start, intervalSeconds, prepSeconds],
  );

  if (!running) {
    return (
      <SetupScreen
        intervalSeconds={intervalSeconds}
        prepSeconds={prepSeconds}
        intervalRange={INTERVAL_RANGE}
        prepRange={PREP_RANGE}
        onIntervalChange={setIntervalSeconds}
        onPrepChange={setPrepSeconds}
        onStart={handleStart}
      />
    );
  }

  return (
    <ClockScreen
      tick={tick}
      intervalSeconds={intervalSeconds}
      wakeLockStatus={wakeLockStatus}
      onStop={stop}
    />
  );
}
