/**
 * Hace que una version nueva se aplique sola, sin tener que abrir la app dos
 * veces.
 *
 * El service worker se registra con `autoUpdate`: cuando hay una version nueva
 * la baja en segundo plano y se activa enseguida, pero la pagina que ya esta
 * cargada sigue corriendo con los archivos viejos. De ahi el "abrila de nuevo".
 * Escuchando `controllerchange` sabemos el momento exacto en que el service
 * worker nuevo toma el control, y ahi alcanza con recargar.
 */

let avisado = false;

export function vigilarActualizacion(alActualizar) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return undefined;
  }

  // Si al arrancar no habia controlador, el `controllerchange` que viene es el
  // del primer registro, no el de una actualizacion. Recargar ahi seria un
  // refresco al pedo en cada instalacion limpia.
  const habiaControlador = Boolean(navigator.serviceWorker.controller);

  const alCambiarControlador = () => {
    if (!habiaControlador || avisado) return;
    avisado = true;
    alActualizar();
  };

  navigator.serviceWorker.addEventListener('controllerchange', alCambiarControlador);
  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', alCambiarControlador);
  };
}

export function aplicarActualizacion() {
  window.location.reload();
}
