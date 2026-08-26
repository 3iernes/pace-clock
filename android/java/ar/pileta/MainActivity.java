package ar.pileta;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Envoltura minima: un WebView a pantalla completa con la app.
 *
 * En este telefono el proveedor de WebView es Chrome 138, el mismo motor que el
 * navegador, asi que renderiza identico a lo que ya probamos.
 */
public class MainActivity extends Activity {

  private static final String URL = "https://3iernes.github.io/pace-clock/";

  /** Le permite a la web saber que corre adentro de la envoltura. */
  private static final String MARCA_AGENTE = " PiletaApp/1";

  private WebView web;

  @Override
  protected void onCreate(Bundle estado) {
    super.onCreate(estado);

    // Nativo en vez de por API web. El Wake Lock del navegador se libera solo
    // cuando la app deja de estar visible y hay que volver a pedirlo; esta
    // bandera la mantiene el sistema mientras la ventana este arriba.
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

    web = new WebView(this);
    WebSettings ajustes = web.getSettings();
    ajustes.setJavaScriptEnabled(true);
    // localStorage: es donde se guardan el intervalo y la preparacion.
    ajustes.setDomStorageEnabled(true);
    ajustes.setDatabaseEnabled(true);
    // Que el service worker pueda responder cuando no hay red.
    ajustes.setCacheMode(WebSettings.LOAD_DEFAULT);
    ajustes.setUserAgentString(ajustes.getUserAgentString() + MARCA_AGENTE);

    // Sin esto cualquier navegacion se abriria en Chrome en vez de quedarse aca.
    web.setWebViewClient(new WebViewClient());

    setContentView(web);

    if (estado == null) {
      web.loadUrl(URL);
    } else {
      web.restoreState(estado);
    }
  }

  @Override
  protected void onSaveInstanceState(Bundle salida) {
    super.onSaveInstanceState(salida);
    web.saveState(salida);
  }

  @Override
  public void onWindowFocusChanged(boolean tieneFoco) {
    super.onWindowFocusChanged(tieneFoco);
    if (tieneFoco) {
      ocultarBarrasDelSistema();
    }
  }

  /** Pantalla completa de verdad: sin barra de estado ni de navegacion. */
  private void ocultarBarrasDelSistema() {
    getWindow().getDecorView().setSystemUiVisibility(
        View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
      | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
      | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
      | View.SYSTEM_UI_FLAG_FULLSCREEN
      | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
  }

  @Override
  public void onBackPressed() {
    // Que el boton atras no cierre la app en medio de una serie.
    if (web.canGoBack()) {
      web.goBack();
    } else {
      moveTaskToBack(true);
    }
  }
}
