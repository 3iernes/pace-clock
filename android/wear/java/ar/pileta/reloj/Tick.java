package ar.pileta.reloj;

/**
 * La matematica del cronometro, sin nada de Android adentro.
 *
 * Es un port linea por linea de src/tick.js. No es una reimplementacion: cada
 * decision de redondeo esta copiada a proposito, porque las dos versiones se
 * comparan contra los mismos vectores en `npm run test:reloj`. Si alguien toca
 * una de las dos sin tocar la otra, ese test falla.
 *
 * Igual que en la web, nunca se acumula tiempo sumando de a un segundo: todo se
 * recalcula contra un timestamp absoluto. En el reloj esto importa mas todavia,
 * porque la pantalla se apaga cada vez que bajas la muneca y el loop se frena.
 */
public final class Tick {

  /** Cuanto dura el flash verde que marca el instante exacto de la salida. */
  public static final long FLASH_MS = 1000;
  /** A partir de cuantos milisegundos restantes la pantalla avisa la salida. */
  public static final long AVISO_MS = 5000;

  public static final int PREPARACION = 0;
  public static final int CORRIENDO = 1;

  public static final int NORMAL = 0;
  public static final int AVISO = 1;
  public static final int SALIDA = 2;

  public final int fase;
  public final int rep;
  public final int segundosRestantes;
  public final int transcurrido;
  public final int senal;

  private Tick(int fase, int rep, int segundosRestantes, int transcurrido, int senal) {
    this.fase = fase;
    this.rep = rep;
    this.segundosRestantes = segundosRestantes;
    this.transcurrido = transcurrido;
    this.senal = senal;
  }

  /**
   * Todo se deriva de `finPreparacion`, el timestamp absoluto en el que arranca
   * la repeticion 1.
   */
  public static Tick calcular(long ahora, long intervaloMs, long finPreparacion) {
    if (ahora < finPreparacion) {
      long restante = finPreparacion - ahora;
      return new Tick(
          PREPARACION,
          0,
          techoSegundos(restante),
          // La sesion todavia no arranco: el transcurrido se cuenta desde la
          // repeticion 1, no desde que se apreto START.
          0,
          restante <= AVISO_MS ? AVISO : NORMAL);
    }

    long elapsed = ahora - finPreparacion;
    long desdeElCero = elapsed % intervaloMs;
    long restante = intervaloMs - desdeElCero;

    int senal = NORMAL;
    if (desdeElCero < FLASH_MS) senal = SALIDA;
    else if (restante <= AVISO_MS) senal = AVISO;

    return new Tick(
        CORRIENDO,
        (int) (elapsed / intervaloMs) + 1,
        // Con techo la cuenta va 1:50 ... 0:01 y en el rollover pega el flash
        // verde. El flash es el cero, asi que nunca hace falta mostrar 0:00.
        techoSegundos(restante),
        (int) (elapsed / 1000),
        senal);
  }

  /** Math.ceil(ms / 1000) en enteros. Solo vale para ms positivos, que es el caso. */
  private static int techoSegundos(long ms) {
    return (int) ((ms + 999) / 1000);
  }

  public boolean igualA(Tick otro) {
    return otro != null
        && fase == otro.fase
        && rep == otro.rep
        && segundosRestantes == otro.segundosRestantes
        && transcurrido == otro.transcurrido
        && senal == otro.senal;
  }
}
