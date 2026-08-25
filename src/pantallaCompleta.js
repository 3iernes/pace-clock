/**
 * Reemplaza desde el navegador lo que daba la PWA instalada.
 *
 * En el Moto E5 Plus la app instalada crashea ("Pileta keeps stopping"), pero
 * en Chrome anda perfecto. Lo unico que se perdia al usarla desde el navegador
 * era la pantalla completa y la orientacion fija, y las dos se pueden pedir por
 * API. Asi el empaquetado roto deja de importar.
 *
 * Las dos llamadas pueden fallar por politica del navegador y ninguna es
 * critica: si no salen, la app funciona igual, solo con la barra de URL a la
 * vista.
 */

export async function entrarPantallaCompleta() {
  const raiz = document.documentElement;
  try {
    if (!document.fullscreenElement && raiz.requestFullscreen) {
      // Tiene que salir de un gesto del usuario, por eso se llama desde el
      // click de START y no desde un efecto.
      await raiz.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch {
    // Sin pantalla completa se pierden ~60px de alto, nada mas.
  }

  try {
    // Apoyado en el borde de la pileta el acelerometro puede hacerlo rotar solo
    // a mitad de una serie. Se fija la orientacion que tenga en ese momento, no
    // una fija, para no romper la version vertical.
    // En Android esto solo funciona estando en pantalla completa: de ahi el orden.
    await screen.orientation?.lock?.(screen.orientation.type);
  } catch {
    // Queda a merced de la rotacion automatica del sistema.
  }
}

export function salirPantallaCompleta() {
  try {
    screen.orientation?.unlock?.();
  } catch {
    // Sin consecuencias.
  }
  try {
    if (document.fullscreenElement) document.exitFullscreen();
  } catch {
    // Sin consecuencias.
  }
}
