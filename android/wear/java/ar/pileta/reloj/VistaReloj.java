package ar.pileta.reloj;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.View;

/**
 * La pantalla del cronometro: la cuenta gigante y el cambio de color.
 *
 * El aviso es visual y no sonoro por la misma razon que en el telefono, mas una
 * propia del reloj: abajo del agua no se escucha nada igual.
 */
public class VistaReloj extends View {

  /** Igual que en la web (src/StopButton.jsx): hay que mantener dos segundos. */
  private static final long MANTENER_MS = 2000;
  /** Por debajo de esto se asume que fue un roce, no un intento de parar. */
  private static final long TOQUE_MS = 300;
  /** Cuanto queda la ayuda en pantalla despues de un toque corto. */
  private static final long AYUDA_MS = 2500;
  /** Cuantos segundos de la serie se muestra la ayuda sin que la pidan. */
  private static final int AYUDA_SEG = 8;

  public interface Escucha {
    void alParar();
  }

  private final Paint pincel = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final RectF aro = new RectF();
  private final java.util.Calendar calendario = java.util.Calendar.getInstance();

  private Escucha escucha;
  private Tick tick;
  private int intervaloSeg = 110;

  private long manteniendoDesde;
  private long ayudaHasta;
  private float radio;
  private float grosorAro;

  private final Runnable cumplir = new Runnable() {
    @Override
    public void run() {
      manteniendoDesde = 0;
      invalidate();
      if (escucha != null) escucha.alParar();
    }
  };

  public VistaReloj(Context contexto) {
    super(contexto);
  }

  public void setEscucha(Escucha e) {
    escucha = e;
  }

  public void setIntervalo(int segundos) {
    intervaloSeg = segundos;
    invalidate();
  }

  public void setTick(Tick nuevo) {
    tick = nuevo;
    invalidate();
  }

  /** Que la vista quede limpia si se sale de la serie mientras se apretaba. */
  public void olvidarGesto() {
    removeCallbacks(cumplir);
    manteniendoDesde = 0;
    ayudaHasta = 0;
  }

  @Override
  protected void onSizeChanged(int w, int h, int wAnterior, int hAnterior) {
    float lado = Math.min(w, h);
    radio = lado / 2f;
    grosorAro = lado * 0.035f;
    float borde = grosorAro / 2 + lado * 0.008f;
    aro.set(borde, borde, lado - borde, lado - borde);
  }

  @Override
  protected void onDraw(Canvas lienzo) {
    if (tick == null) return;
    float lado = radio * 2;
    boolean preparando = tick.fase == Tick.PREPARACION;

    int fondo = Estilo.FONDO;
    int frente = Estilo.TEXTO;
    int flojo = Estilo.APAGADO;
    if (tick.senal == Tick.AVISO) {
      fondo = Estilo.AVISO;
      frente = Estilo.TINTA;
      flojo = conAlfa(Estilo.TINTA, 150);
    } else if (tick.senal == Tick.SALIDA) {
      fondo = Estilo.SALIDA;
      frente = Estilo.BLANCO;
      flojo = conAlfa(Estilo.BLANCO, 190);
    }
    lienzo.drawColor(fondo);

    pincel.setStyle(Paint.Style.FILL);
    pincel.setTextAlign(Paint.Align.CENTER);

    // La hora, porque la app tapa la esfera del reloj.
    calendario.setTimeInMillis(System.currentTimeMillis());
    pincel.setTypeface(Estilo.FINA);
    pincel.setColor(flojo);
    pincel.setTextSize(lado * 0.058f);
    lienzo.drawText(Formato.hora(calendario), radio, lado * 0.17f, pincel);

    pincel.setTypeface(Estilo.GRUESA);
    pincel.setColor(frente);
    pincel.setTextSize(lado * 0.075f);
    lienzo.drawText(preparando ? "PREPARATE" : "REP " + tick.rep, radio, lado * 0.315f, pincel);

    // La cuenta se dimensiona con el intervalo configurado, que es el texto mas
    // largo que va a mostrar la serie, para que no cambie de tamano sola al
    // pasar de 1:00 a 0:59.
    pincel.setColor(frente);
    pincel.setTextSize(Estilo.tamanoParaAncho(pincel, Formato.reloj(intervaloSeg), lado * 0.80f));
    lienzo.drawText(Formato.reloj(tick.segundosRestantes), radio,
        radio * 1.02f - (pincel.descent() + pincel.ascent()) / 2, pincel);

    pincel.setTypeface(Estilo.FINA);
    if (!preparando) {
      pincel.setColor(flojo);
      pincel.setTextSize(lado * 0.068f);
      lienzo.drawText(Formato.reloj(tick.transcurrido), radio, lado * 0.755f, pincel);
    }

    if (mostrarAyuda()) {
      pincel.setColor(flojo);
      pincel.setTextSize(lado * 0.052f);
      lienzo.drawText("MANTENER 2 s", radio, lado * 0.865f, pincel);
    }

    dibujarAro(lienzo, frente);
  }

  private boolean mostrarAyuda() {
    if (manteniendoDesde > 0) return false;
    if (SystemClock.elapsedRealtime() < ayudaHasta) return true;
    // Los primeros segundos de la serie se muestra sola, para no tener que
    // acordarse de como se para.
    return tick.fase == Tick.CORRIENDO && tick.transcurrido < AYUDA_SEG;
  }

  /**
   * El progreso de STOP va por el borde de la pantalla y no adentro de un boton.
   *
   * En una pantalla redonda el borde es el unico lugar donde entra una barra
   * larga, y de paso el boton pasa a ser la pantalla entera: no hay que
   * embocarle a nada con el dedo mojado.
   */
  private void dibujarAro(Canvas lienzo, int color) {
    if (manteniendoDesde == 0) return;
    long llevado = SystemClock.elapsedRealtime() - manteniendoDesde;
    float avance = Math.min(1f, llevado / (float) MANTENER_MS);
    pincel.setStyle(Paint.Style.STROKE);
    pincel.setStrokeWidth(grosorAro);
    pincel.setStrokeCap(Paint.Cap.ROUND);
    pincel.setColor(color);
    lienzo.drawArc(aro, -90, 360 * avance, false, pincel);
    pincel.setStyle(Paint.Style.FILL);
    // Mientras se mantiene, la vista se anima sola: no depende del loop del
    // cronometro, que corre mucho mas lento.
    postInvalidateOnAnimation();
  }

  @Override
  public boolean onTouchEvent(MotionEvent evento) {
    switch (evento.getActionMasked()) {
      case MotionEvent.ACTION_DOWN:
        manteniendoDesde = SystemClock.elapsedRealtime();
        ayudaHasta = 0;
        // Para al cumplirse los dos segundos, sin esperar a que suelte, igual
        // que el boton de la web.
        postDelayed(cumplir, MANTENER_MS);
        invalidate();
        return true;

      case MotionEvent.ACTION_UP:
      case MotionEvent.ACTION_CANCEL:
        long llevado = manteniendoDesde == 0
            ? 0
            : SystemClock.elapsedRealtime() - manteniendoDesde;
        removeCallbacks(cumplir);
        manteniendoDesde = 0;
        // Un toque corto es o un roce o alguien que no sabe como se usa. En los
        // dos casos conviene decirlo en vez de no hacer nada.
        if (evento.getActionMasked() == MotionEvent.ACTION_UP && llevado > 0 && llevado < TOQUE_MS) {
          ayudaHasta = SystemClock.elapsedRealtime() + AYUDA_MS;
        }
        invalidate();
        return true;

      default:
        return true;
    }
  }

  private static int conAlfa(int color, int alfa) {
    return Color.argb(alfa, Color.red(color), Color.green(color), Color.blue(color));
  }
}
