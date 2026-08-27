package ar.pileta.reloj;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.view.MotionEvent;
import android.view.View;

/**
 * La pantalla de configuracion, dibujada a mano sobre una pantalla redonda.
 *
 * No usa Buttons ni layouts porque en 396x396 redondos cada caja hay que
 * colocarla contra la cuerda del circulo a su altura (ver Estilo.medioAncho) y
 * cada circulo contra el radio. Con LinearLayouts las esquinas quedan afuera
 * del bisel.
 */
public class VistaConfig extends View {

  /** Mismo rango que la web (src/App.jsx). */
  public static final int INTERVALO_MIN = 20;
  public static final int INTERVALO_MAX = 600;
  public static final int INTERVALO_PASO = 5;

  /**
   * En la web la preparacion es un stepper de a 1 segundo entre 0 y 60. Aca no
   * entra un segundo stepper sin achicar todo lo demas, asi que es un solo
   * boton que cicla por los valores que se usan de verdad.
   */
  public static final int[] PREPARACIONES = { 0, 2, 3, 5 };

  public interface Escucha {
    void alCambiarIntervalo(int segundos);
    void alCambiarPreparacion(int segundos);
    void alArrancar();
  }

  private static final int NADA = -1;
  private static final int MENOS = 0;
  private static final int MAS = 1;
  private static final int PREP = 2;
  private static final int START = 3;

  // Cuanto espera antes de empezar a repetir, y cada cuanto repite despues.
  private static final long ESPERA_REPETICION_MS = 400;
  private static final long CADA_REPETICION_MS = 90;

  private final Paint pincel = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final RectF pastillaPrep = new RectF();
  private final RectF pastillaStart = new RectF();

  private Escucha escucha;
  private int intervaloSeg = 110;
  private int prepSeg = 5;

  private int presionado = NADA;
  private float radio;
  private float cyPaso;
  private float cxMenos;
  private float cxMas;
  private float rPaso;
  private float baseTitulo;

  private final Runnable repetidor = new Runnable() {
    @Override
    public void run() {
      if (presionado != MENOS && presionado != MAS) return;
      pasoIntervalo(presionado == MAS ? INTERVALO_PASO : -INTERVALO_PASO);
      postDelayed(this, CADA_REPETICION_MS);
    }
  };

  public VistaConfig(Context contexto) {
    super(contexto);
    setBackgroundColor(Estilo.FONDO);
  }

  public void setEscucha(Escucha e) {
    escucha = e;
  }

  public void setValores(int intervalo, int preparacion) {
    intervaloSeg = intervalo;
    prepSeg = preparacion;
    invalidate();
  }

  @Override
  protected void onSizeChanged(int w, int h, int wAnterior, int hAnterior) {
    float lado = Math.min(w, h);
    radio = lado / 2f;
    float margen = lado * 0.015f;

    baseTitulo = h * 0.20f;
    cyPaso = h * 0.36f;
    rPaso = lado * 0.115f;

    // Un circulo entra en la pantalla redonda si su centro esta a lo sumo a
    // (radio - su radio) del centro. Despejando la componente horizontal:
    float alcance = Estilo.medioAncho(radio - rPaso - margen, cyPaso - radio);
    cxMenos = radio - alcance;
    cxMas = radio + alcance;

    float altoPrep = lado * 0.16f;
    float cyPrep = h * 0.585f;
    float anchoPrep = Math.min(lado * 0.62f, 2 * cajaCabe(cyPrep, altoPrep, margen));
    pastillaPrep.set(radio - anchoPrep / 2, cyPrep - altoPrep / 2,
        radio + anchoPrep / 2, cyPrep + altoPrep / 2);

    float altoStart = lado * 0.21f;
    float cyStart = h * 0.79f;
    float anchoStart = Math.min(lado * 0.66f, 2 * cajaCabe(cyStart, altoStart, margen));
    pastillaStart.set(radio - anchoStart / 2, cyStart - altoStart / 2,
        radio + anchoStart / 2, cyStart + altoStart / 2);
  }

  /** Medio ancho maximo de una caja centrada, mirando su borde mas alejado. */
  private float cajaCabe(float cy, float alto, float margen) {
    float lejos = Math.abs(cy - radio) + alto / 2;
    return Estilo.medioAncho(radio, lejos) - margen;
  }

  @Override
  protected void onDraw(Canvas lienzo) {
    float lado = radio * 2;

    pincel.setTypeface(Estilo.FINA);
    pincel.setTextAlign(Paint.Align.CENTER);
    pincel.setStyle(Paint.Style.FILL);
    pincel.setColor(Estilo.APAGADO);
    pincel.setTextSize(lado * 0.062f);
    lienzo.drawText("INTERVALO", radio, baseTitulo, pincel);

    dibujarPaso(lienzo, cxMenos, false);
    dibujarPaso(lienzo, cxMas, true);

    // El numero va entre los dos circulos, con lo que sobre.
    float hueco = (cxMas - rPaso) - (cxMenos + rPaso) - lado * 0.04f;
    pincel.setTypeface(Estilo.GRUESA);
    pincel.setColor(Estilo.TEXTO);
    // Se dimensiona con "10:00", el intervalo mas largo configurable, para que
    // el numero no cambie de tamano al cruzar los diez minutos.
    pincel.setTextSize(Math.min(lado * 0.17f, Estilo.tamanoParaAncho(pincel, "10:00", hueco)));
    lienzo.drawText(Formato.reloj(intervaloSeg), radio, centrarTexto(cyPaso), pincel);

    dibujarPastilla(lienzo, pastillaPrep, presionado == PREP, Estilo.LINEA, false);
    pincel.setTypeface(Estilo.FINA);
    pincel.setColor(Estilo.TEXTO);
    pincel.setTextSize(lado * 0.075f);
    String prep = prepSeg == 0 ? "SIN PREP" : "PREP " + prepSeg + " s";
    lienzo.drawText(prep, pastillaPrep.centerX(), centrarTexto(pastillaPrep.centerY()), pincel);

    dibujarPastilla(lienzo, pastillaStart, presionado == START, Estilo.SALIDA, true);
    pincel.setTypeface(Estilo.GRUESA);
    pincel.setColor(Estilo.BLANCO);
    pincel.setTextSize(lado * 0.085f);
    lienzo.drawText("START", pastillaStart.centerX(), centrarTexto(pastillaStart.centerY()), pincel);
  }

  /** Baseline para que el texto quede centrado en `cy`. */
  private float centrarTexto(float cy) {
    return cy - (pincel.descent() + pincel.ascent()) / 2;
  }

  private void dibujarPaso(Canvas lienzo, float cx, boolean esMas) {
    boolean activo = presionado == (esMas ? MAS : MENOS);
    pincel.setStyle(activo ? Paint.Style.FILL : Paint.Style.STROKE);
    pincel.setStrokeWidth(radio * 0.02f);
    pincel.setColor(Estilo.LINEA);
    lienzo.drawCircle(cx, cyPaso, rPaso, pincel);

    // El mas y el menos van dibujados, no escritos: asi no dependen de que la
    // fuente del sistema traiga el signo ni del encoding del fuente.
    pincel.setStyle(Paint.Style.STROKE);
    pincel.setColor(Estilo.TEXTO);
    pincel.setStrokeWidth(rPaso * 0.16f);
    float brazo = rPaso * 0.48f;
    lienzo.drawLine(cx - brazo, cyPaso, cx + brazo, cyPaso, pincel);
    if (esMas) lienzo.drawLine(cx, cyPaso - brazo, cx, cyPaso + brazo, pincel);
    pincel.setStyle(Paint.Style.FILL);
  }

  private void dibujarPastilla(Canvas lienzo, RectF caja, boolean activa, int color, boolean llena) {
    float r = caja.height() / 2;
    if (llena) {
      pincel.setStyle(Paint.Style.FILL);
      pincel.setColor(activa ? oscurecer(color) : color);
    } else {
      pincel.setStyle(activa ? Paint.Style.FILL : Paint.Style.STROKE);
      pincel.setStrokeWidth(radio * 0.02f);
      pincel.setColor(color);
    }
    lienzo.drawRoundRect(caja, r, r, pincel);
    pincel.setStyle(Paint.Style.FILL);
  }

  private static int oscurecer(int color) {
    return Color.rgb(
        (int) (Color.red(color) * 0.75f),
        (int) (Color.green(color) * 0.75f),
        (int) (Color.blue(color) * 0.75f));
  }

  @Override
  public boolean onTouchEvent(MotionEvent evento) {
    float x = evento.getX();
    float y = evento.getY();

    switch (evento.getActionMasked()) {
      case MotionEvent.ACTION_DOWN:
        presionado = queHay(x, y);
        if (presionado == MENOS || presionado == MAS) {
          pasoIntervalo(presionado == MAS ? INTERVALO_PASO : -INTERVALO_PASO);
          postDelayed(repetidor, ESPERA_REPETICION_MS);
        }
        invalidate();
        return presionado != NADA;

      case MotionEvent.ACTION_MOVE:
        // Si el dedo se va del boton se cancela: es la unica forma de
        // arrepentirse con las manos mojadas.
        if (presionado != NADA && queHay(x, y) != presionado) soltar(false);
        return true;

      case MotionEvent.ACTION_UP:
        soltar(true);
        return true;

      case MotionEvent.ACTION_CANCEL:
        soltar(false);
        return true;

      default:
        return false;
    }
  }

  private void soltar(boolean cuenta) {
    removeCallbacks(repetidor);
    int era = presionado;
    presionado = NADA;
    invalidate();
    if (!cuenta || escucha == null) return;
    if (era == PREP) {
      escucha.alCambiarPreparacion(siguientePreparacion());
    } else if (era == START) {
      escucha.alArrancar();
    }
  }

  private void pasoIntervalo(int delta) {
    int siguiente = Math.max(INTERVALO_MIN, Math.min(INTERVALO_MAX, intervaloSeg + delta));
    if (siguiente == intervaloSeg) return;
    intervaloSeg = siguiente;
    invalidate();
    if (escucha != null) escucha.alCambiarIntervalo(intervaloSeg);
  }

  private int siguientePreparacion() {
    for (int i = 0; i < PREPARACIONES.length; i++) {
      if (PREPARACIONES[i] == prepSeg) {
        prepSeg = PREPARACIONES[(i + 1) % PREPARACIONES.length];
        invalidate();
        return prepSeg;
      }
    }
    prepSeg = PREPARACIONES[0];
    invalidate();
    return prepSeg;
  }

  private int queHay(float x, float y) {
    // Los circulos aceptan un poco mas que su radio: con el dedo mojado se
    // apunta peor, y errarle a un paso de 5 segundos no cuesta nada.
    if (distancia(x, y, cxMenos, cyPaso) <= rPaso * 1.35f) return MENOS;
    if (distancia(x, y, cxMas, cyPaso) <= rPaso * 1.35f) return MAS;
    if (pastillaPrep.contains(x, y)) return PREP;
    if (pastillaStart.contains(x, y)) return START;
    return NADA;
  }

  private static float distancia(float x, float y, float cx, float cy) {
    float dx = x - cx;
    float dy = y - cy;
    return (float) Math.sqrt(dx * dx + dy * dy);
  }
}
