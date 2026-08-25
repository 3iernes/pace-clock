import { autonomiaHoras } from './bateria.js';

const unaCifra = (n) => (Math.abs(n) >= 10 ? n.toFixed(0) : n.toFixed(1));

export default function BatteryAudit({ estado }) {
  if (!estado) return null;

  if (estado.cargando) {
    return <div className="audit">enchufado &middot; la medicion arranca al desenchufar</div>;
  }

  const { nivelInicial, nivelActual, minutos, gastado, porHora, precisa, caidas } = estado;
  const autonomia = autonomiaHoras(porHora);

  return (
    <div className="audit">
      <span>
        {nivelInicial}% &rarr; {nivelActual}% ({gastado > 0 ? `-${gastado}` : '0'}%)
      </span>
      <span>{minutos.toFixed(0)} min</span>
      {porHora !== null && (
        <span className={precisa ? 'audit__dato' : 'audit__dato audit__dato--crudo'}>
          {unaCifra(porHora)}%/h
          {autonomia && ` \u00b7 ~${unaCifra(autonomia)}h`}
          {!precisa && ' (estimando\u2026)'}
        </span>
      )}
      {precisa && <span>{caidas} caidas</span>}
    </div>
  );
}
