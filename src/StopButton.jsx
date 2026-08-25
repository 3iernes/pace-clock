import { useCallback, useEffect, useRef, useState } from 'react';

const MANTENER_MS = 2000;
// Por debajo de esto se asume que fue un toque, no un intento de mantener.
const TOQUE_MS = 300;
const PISTA_MS = 2500;

/**
 * Parar la serie por accidente obliga a reconfigurar todo, asi que el STOP pide
 * mantener apretado dos segundos.
 *
 * Se eligio mantener en vez de deslizar por robustez a traves de la bolsa
 * hermetica: no necesita rastrear movimiento, solo contacto sostenido.
 */
export default function StopButton({ onStop }) {
  const [manteniendo, setManteniendo] = useState(false);
  const [pista, setPista] = useState(false);
  const inicioRef = useRef(0);
  const cuentaRef = useRef(0);
  const pistaRef = useRef(0);
  const teclaRef = useRef(false);

  useEffect(
    () => () => {
      clearTimeout(cuentaRef.current);
      clearTimeout(pistaRef.current);
    },
    [],
  );

  const arrancar = useCallback(() => {
    if (cuentaRef.current) return;
    inicioRef.current = Date.now();
    setManteniendo(true);
    setPista(false);
    cuentaRef.current = setTimeout(() => {
      cuentaRef.current = 0;
      setManteniendo(false);
      onStop();
    }, MANTENER_MS);
  }, [onStop]);

  const cancelar = useCallback(() => {
    clearTimeout(cuentaRef.current);
    cuentaRef.current = 0;
    setManteniendo(false);
  }, []);

  const soltar = useCallback(() => {
    const enCurso = cuentaRef.current !== 0;
    const duracion = Date.now() - inicioRef.current;
    cancelar();
    // Un toque corto es o un roce accidental o alguien que no sabe como se usa.
    // En los dos casos conviene decirlo en vez de no hacer nada.
    if (enCurso && duracion < TOQUE_MS) {
      setPista(true);
      clearTimeout(pistaRef.current);
      pistaRef.current = setTimeout(() => setPista(false), PISTA_MS);
    }
  }, [cancelar]);

  const alApretar = (e) => {
    // Capturar el puntero: si el dedo se corre unos pixeles dentro de la bolsa,
    // el gesto sigue siendo de este boton en vez de perderse a mitad de camino.
    // Tira NotFoundError si el puntero ya no esta activo, y perder la captura no
    // es motivo para no arrancar la cuenta.
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Sin captura anda igual, solo es menos tolerante a que el dedo se corra.
    }
    arrancar();
  };

  const alBajarTecla = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); // si no, el navegador dispara un click al soltar
    if (teclaRef.current) return; // el auto-repeat no cuenta como apretar de nuevo
    teclaRef.current = true;
    arrancar();
  };

  const alSubirTecla = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    teclaRef.current = false;
    soltar();
  };

  return (
    <div className="stop">
      {pista && <span className="stop__pista">mantene apretado</span>}
      <button
        type="button"
        className={`btn btn--stop${manteniendo ? ' btn--stop-activo' : ''}`}
        onPointerDown={alApretar}
        onPointerUp={soltar}
        onPointerCancel={cancelar}
        onKeyDown={alBajarTecla}
        onKeyUp={alSubirTecla}
        onBlur={cancelar}
        aria-label="Parar: mantene apretado dos segundos"
      >
        <span className="btn__relleno" aria-hidden="true" />
        <span className="btn__texto">STOP</span>
      </button>
    </div>
  );
}
