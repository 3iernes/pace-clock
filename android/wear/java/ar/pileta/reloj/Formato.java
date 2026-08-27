package ar.pileta.reloj;

/** Port de src/format.js. Se compara contra el original en `npm run test:reloj`. */
public final class Formato {

  private Formato() {}

  /** Segundos a "M:SS", que es como se leen los intervalos en la pileta. */
  public static String reloj(int totalSegundos) {
    int seguro = Math.max(0, totalSegundos);
    return (seguro / 60) + ":" + dosDigitos(seguro % 60);
  }

  /** Hora del dia en 24 horas, "19:42". */
  public static String hora(java.util.Calendar c) {
    return dosDigitos(c.get(java.util.Calendar.HOUR_OF_DAY))
        + ":"
        + dosDigitos(c.get(java.util.Calendar.MINUTE));
  }

  private static String dosDigitos(int n) {
    return n < 10 ? "0" + n : String.valueOf(n);
  }
}
