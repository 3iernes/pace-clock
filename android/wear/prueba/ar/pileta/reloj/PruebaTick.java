package ar.pileta.reloj;

import java.io.BufferedReader;
import java.io.FileReader;

/**
 * Comparador: corre Tick y Formato contra los vectores que genero la version
 * web y avisa en la primera diferencia.
 *
 * No se arranca a mano. Lo llama android/prueba-tick.mjs, que es el que produce
 * los vectores importando src/tick.js. Vive afuera de android/wear/java a
 * proposito: es un test, no tiene por que viajar adentro del APK.
 */
public final class PruebaTick {

  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.err.println("uso: PruebaTick <archivo-de-vectores>");
      System.exit(2);
    }

    int casos = 0;
    int fallos = 0;
    BufferedReader lector = new BufferedReader(new FileReader(args[0]));
    String linea;

    while ((linea = lector.readLine()) != null) {
      if (linea.isEmpty()) continue;
      String[] c = linea.split(" ");
      casos++;

      if (c[0].equals("F")) {
        // F <segundos> <esperado>
        String obtenido = Formato.reloj(Integer.parseInt(c[1]));
        if (!obtenido.equals(c[2])) {
          fallos++;
          if (fallos <= 10) {
            System.out.println("formato(" + c[1] + "): web=" + c[2] + " java=" + obtenido);
          }
        }
        continue;
      }

      // T <ahora> <intervaloMs> <finPreparacion> <fase> <rep> <restantes> <transcurrido> <senal>
      long ahora = Long.parseLong(c[1]);
      long intervalo = Long.parseLong(c[2]);
      long finPrep = Long.parseLong(c[3]);
      Tick t = Tick.calcular(ahora, intervalo, finPrep);

      String web = c[4] + " " + c[5] + " " + c[6] + " " + c[7] + " " + c[8];
      String java = t.fase + " " + t.rep + " " + t.segundosRestantes + " "
          + t.transcurrido + " " + t.senal;

      if (!web.equals(java)) {
        fallos++;
        if (fallos <= 10) {
          System.out.println("tick(ahora=" + ahora + " intervalo=" + intervalo
              + " finPrep=" + finPrep + ")");
          System.out.println("   web  [fase rep restantes transcurrido senal] = " + web);
          System.out.println("   java [fase rep restantes transcurrido senal] = " + java);
        }
      }
    }
    lector.close();

    if (fallos > 0) {
      System.out.println("\n" + fallos + " de " + casos + " casos difieren de src/tick.js");
      System.exit(1);
    }
    System.out.println(casos + " casos identicos a src/tick.js");
  }
}
