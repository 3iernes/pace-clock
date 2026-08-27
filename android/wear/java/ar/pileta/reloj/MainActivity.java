package ar.pileta.reloj;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;

/**
 * Pace clock nativo para Wear OS.
 *
 * No es una envoltura como la del telefono: el Galaxy Watch4 no trae WebView
 * (android.software.webview no esta en la lista de features del sistema), asi
 * que cualquier cosa que renderice HTML se cae al arrancar. Toda la pantalla
 * esta dibujada con Canvas.
 *
 * Lo unico que se comparte con la web es la matematica, portada en Tick.java y
 * comparada contra src/tick.js en `npm run test:reloj`.
 */
public class MainActivity extends Activity implements VistaConfig.Escucha, VistaReloj.Escucha {

  private static final String PREFS = "pileta";
  private static final String CLAVE_INTERVALO = "intervalo";
  private static final String CLAVE_PREP = "preparacion";
  private static final String CLAVE_FIN_PREP = "finPreparacion";

  private static final int INTERVALO_POR_DEFECTO = 110; // 1:50
  private static final int PREP_POR_DEFECTO = 5;

  /** Cada cuanto se recalcula con la pantalla a la vista. Solo redibuja si cambio algo. */
  private static final long MUESTREO_MS = 100;
  /**
   * Y cada cuanto con la pantalla apagada, donde lo unico que se puede llegar a
   * disparar es la vibracion. Muestrear mas seguido no cambiaria nada.
   */
  private static final long MUESTREO_A_CIEGAS_MS = 250;

  /** Cuantos segundos antes del cero vibra. */
  private static final int AVISO_SEG = 3;
  /** Un pulso solo, largo: tiene que sentirse abajo del agua. */
  private static final long VIBRACION_MS = 350;

  /**
   * Una serie guardada mas vieja que esto no se retoma.
   *
   * La app se reengancha a la serie en curso si el sistema la mata (en el reloj
   * pasa seguido: se apaga la pantalla, se baja la muneca). Pero si quedo
   * abierta de ayer, retomarla mostraria la repeticion 900 en vez de la
   * pantalla de configuracion.
   */
  private static final long VENCIMIENTO_MS = 3 * 60 * 60 * 1000L;

  private final Handler reloj = new Handler(Looper.getMainLooper());

  private SharedPreferences prefs;
  private FrameLayout raiz;
  private VistaConfig vistaConfig;
  private VistaReloj vistaReloj;
  private Vibrator vibrador;

  private int intervaloSeg;
  private int prepSeg;
  /** Timestamp absoluto en el que arranca la repeticion 1. Cero es parado. */
  private long finPreparacion;
  private Tick ultimo;
  private boolean aLaVista;
  /** Que repeticion ya aviso, para no vibrar tres veces por el mismo cero. */
  private int repAvisada;

  private final Runnable latido = new Runnable() {
    @Override
    public void run() {
      if (finPreparacion == 0) return;
      Tick ahora = Tick.calcular(System.currentTimeMillis(), intervaloSeg * 1000L, finPreparacion);
      avisar(ahora);
      // Un render por segundo en vez de diez: recalcular es barato, redibujar no.
      if (aLaVista && !ahora.igualA(ultimo)) {
        ultimo = ahora;
        vistaReloj.setTick(ahora);
      }
      reloj.postDelayed(this, aLaVista ? MUESTREO_MS : MUESTREO_A_CIEGAS_MS);
    }
  };

  @Override
  protected void onCreate(Bundle estado) {
    super.onCreate(estado);

    vibrador = (Vibrator) getSystemService(VIBRATOR_SERVICE);

    prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
    intervaloSeg = prefs.getInt(CLAVE_INTERVALO, INTERVALO_POR_DEFECTO);
    prepSeg = prefs.getInt(CLAVE_PREP, PREP_POR_DEFECTO);
    finPreparacion = prefs.getLong(CLAVE_FIN_PREP, 0);
    if (finPreparacion != 0 && System.currentTimeMillis() - finPreparacion > VENCIMIENTO_MS) {
      finPreparacion = 0;
      guardarSerie();
    }

    vistaConfig = new VistaConfig(this);
    vistaConfig.setEscucha(this);
    vistaConfig.setValores(intervaloSeg, prepSeg);

    vistaReloj = new VistaReloj(this);
    vistaReloj.setEscucha(this);
    vistaReloj.setIntervalo(intervaloSeg);

    raiz = new FrameLayout(this);
    raiz.addView(vistaConfig);
    raiz.addView(vistaReloj);
    setContentView(raiz);

    mostrarPantalla();
  }

  @Override
  protected void onResume() {
    super.onResume();
    aLaVista = true;
    // Recalcula al volver en vez de arrastrar: si estuvo minutos con la
    // pantalla apagada, el numero correcto sale de la cuenta contra el reloj
    // del sistema, no de lo que quedo en pantalla.
    ultimo = null;
    if (finPreparacion != 0) {
      reloj.removeCallbacks(latido);
      reloj.post(latido);
    }
  }

  /**
   * Con la pantalla apagada el loop sigue corriendo, mas lento.
   *
   * Es la unica forma de que la vibracion sirva para algo: el aviso existe
   * justamente para no tener que estar mirando. Lo que se apaga es el dibujo,
   * que es lo caro; la cuenta es aritmetica contra el reloj del sistema.
   *
   * Igual no es una garantia. Si el sistema decide matar el proceso, el aviso
   * se corta hasta que se vuelva a abrir la app.
   */
  @Override
  protected void onPause() {
    super.onPause();
    aLaVista = false;
    if (finPreparacion == 0) reloj.removeCallbacks(latido);
  }

  @Override
  protected void onDestroy() {
    super.onDestroy();
    reloj.removeCallbacks(latido);
  }

  @Override
  public void onWindowFocusChanged(boolean tieneFoco) {
    super.onWindowFocusChanged(tieneFoco);
    if (tieneFoco) {
      getWindow().getDecorView().setSystemUiVisibility(
          View.SYSTEM_UI_FLAG_LAYOUT_STABLE
              | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
              | View.SYSTEM_UI_FLAG_FULLSCREEN
              | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }
  }

  @Override
  public void onBackPressed() {
    // Que el boton de atras no cierre la app en medio de una serie.
    moveTaskToBack(true);
  }

  // ---------- VistaConfig.Escucha ----------

  @Override
  public void alCambiarIntervalo(int segundos) {
    intervaloSeg = segundos;
    vistaReloj.setIntervalo(segundos);
    prefs.edit().putInt(CLAVE_INTERVALO, segundos).apply();
  }

  @Override
  public void alCambiarPreparacion(int segundos) {
    prepSeg = segundos;
    prefs.edit().putInt(CLAVE_PREP, segundos).apply();
  }

  @Override
  public void alArrancar() {
    finPreparacion = System.currentTimeMillis() + prepSeg * 1000L;
    guardarSerie();
    ultimo = null;
    repAvisada = Integer.MIN_VALUE;
    vistaReloj.olvidarGesto();
    mostrarPantalla();
    // Un solo latido en vuelo: dos loops encimados harian el doble de trabajo
    // para mostrar exactamente lo mismo.
    reloj.removeCallbacks(latido);
    reloj.post(latido);
  }

  // ---------- VistaReloj.Escucha ----------

  @Override
  public void alParar() {
    finPreparacion = 0;
    guardarSerie();
    reloj.removeCallbacks(latido);
    ultimo = null;
    repAvisada = Integer.MIN_VALUE;
    mostrarPantalla();
  }

  // ---------- Aviso ----------

  /**
   * Vibra una vez por repeticion, tres segundos antes del cero.
   *
   * En el reloj la vibracion es mejor senal que el color: se siente abajo del
   * agua y con la cara en el fondo, que es donde el flash verde no sirve para
   * nada.
   *
   * Va con `<=` y no con `==` a proposito. Con la pantalla apagada el sistema
   * puede demorar el loop, y un aviso un segundo tarde sigue siendo util; el
   * identificador de repeticion se encarga de que sea uno solo igual.
   */
  private void avisar(Tick t) {
    if (t.segundosRestantes > AVISO_SEG) return;
    // Con una preparacion de 2 o 3 segundos el aviso caeria arriba del START.
    if (t.fase == Tick.PREPARACION && prepSeg <= AVISO_SEG) return;

    int cual = t.fase == Tick.PREPARACION ? -1 : t.rep;
    if (cual == repAvisada) return;
    repAvisada = cual;

    if (vibrador != null && vibrador.hasVibrator()) {
      vibrador.vibrate(
          VibrationEffect.createOneShot(VIBRACION_MS, VibrationEffect.DEFAULT_AMPLITUDE));
    }
  }

  // ---------- Pantalla ----------

  private void mostrarPantalla() {
    boolean corriendo = finPreparacion != 0;
    vistaReloj.setVisibility(corriendo ? View.VISIBLE : View.GONE);
    vistaConfig.setVisibility(corriendo ? View.GONE : View.VISIBLE);
    if (corriendo) {
      vistaReloj.setTick(Tick.calcular(
          System.currentTimeMillis(), intervaloSeg * 1000L, finPreparacion));
    } else {
      vistaConfig.setValores(intervaloSeg, prepSeg);
    }

    // La pantalla se mantiene prendida solo mientras corre la serie. Es una
    // bandera nativa que sostiene el sistema, mas confiable que la Wake Lock
    // API que usa la version web.
    if (corriendo) {
      getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    } else {
      getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
  }

  private void guardarSerie() {
    prefs.edit().putLong(CLAVE_FIN_PREP, finPreparacion).apply();
  }
}
