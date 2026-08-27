package ar.pileta.reloj;

import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;

/**
 * Los colores de src/styles.css y las dos cuentas que necesita una pantalla
 * redonda.
 */
public final class Estilo {

  public static final int FONDO = Color.parseColor("#0b0f14");
  public static final int TEXTO = Color.parseColor("#f2f5f7");
  public static final int APAGADO = Color.parseColor("#7c8a99");
  public static final int LINEA = Color.parseColor("#44586b");
  public static final int AVISO = Color.parseColor("#f59e0b");
  public static final int SALIDA = Color.parseColor("#16a34a");
  public static final int TINTA = Color.parseColor("#0b0f14");
  public static final int BLANCO = Color.WHITE;

  public static final Typeface FINA = Typeface.create("sans-serif", Typeface.NORMAL);
  public static final Typeface GRUESA = Typeface.create("sans-serif", Typeface.BOLD);

  private Estilo() {}

  /**
   * Medio ancho util a una altura dada, en una pantalla redonda.
   *
   * Es la mitad de la cuerda del circulo: a la altura del centro se puede usar
   * todo el ancho, y cuanto mas arriba o mas abajo, menos. Sin esto los bordes
   * de cualquier caja quedan cortados por el bisel, que es exactamente lo que
   * pasaria si se reusara el layout del telefono.
   *
   * @param radio     mitad del lado de la pantalla
   * @param distancia cuanto se aparta del centro vertical, en pixeles
   */
  public static float medioAncho(float radio, float distancia) {
    float d = Math.min(Math.abs(distancia), radio);
    return (float) Math.sqrt(radio * radio - d * d);
  }

  /**
   * El tamano de letra con el que `texto` ocupa exactamente `ancho`.
   *
   * Una sola medicion y una regla de tres: measureText es lineal con el tamano.
   */
  public static float tamanoParaAncho(Paint pincel, String texto, float ancho) {
    float referencia = 100f;
    float anterior = pincel.getTextSize();
    pincel.setTextSize(referencia);
    float medido = pincel.measureText(texto);
    pincel.setTextSize(anterior);
    if (medido <= 0) return referencia;
    return referencia * ancho / medido;
  }
}
