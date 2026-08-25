import { useCallback, useEffect, useRef, useState } from 'react';
import { computeTick, IDLE_TICK, sameTick } from './tick.js';

// El loop corre con requestAnimationFrame pero solo recalcula cada tanto: a 60fps
// serian 60 calculos por segundo al pedo en un telefono lento.
const SAMPLE_MS = 50;

export { IDLE, PREP, RUNNING } from './tick.js';

export function useIntervalTimer() {
  const [tick, setTick] = useState(IDLE_TICK);
  const [active, setActive] = useState(false);

  const scheduleRef = useRef(null);
  const lastTickRef = useRef(IDLE_TICK);
  const lastSampleRef = useRef(0);

  // El loop pisa este ref en cada muestra pero solo dispara un render cuando
  // cambia algo que efectivamente se ve: ~1 render por segundo en vez de 60.
  const publish = useCallback((next) => {
    if (sameTick(lastTickRef.current, next)) return;
    lastTickRef.current = next;
    setTick(next);
  }, []);

  const start = useCallback((intervalSeconds, prepSeconds) => {
    const schedule = {
      intervalMs: intervalSeconds * 1000,
      prepEndsAt: Date.now() + prepSeconds * 1000,
    };
    scheduleRef.current = schedule;
    lastSampleRef.current = 0;
    // Publicamos ya mismo para que la pantalla no arranque en blanco
    // esperando al primer frame.
    lastTickRef.current = computeTick(Date.now(), schedule);
    setTick(lastTickRef.current);
    setActive(true);
  }, []);

  const stop = useCallback(() => {
    scheduleRef.current = null;
    lastTickRef.current = IDLE_TICK;
    setTick(IDLE_TICK);
    setActive(false);
  }, []);

  useEffect(() => {
    if (!active) return undefined;

    let frame = requestAnimationFrame(function loop() {
      const now = Date.now();
      if (now - lastSampleRef.current >= SAMPLE_MS) {
        lastSampleRef.current = now;
        const schedule = scheduleRef.current;
        if (schedule) publish(computeTick(now, schedule));
      }
      frame = requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(frame);
  }, [active, publish]);

  return { tick, running: active, start, stop };
}
