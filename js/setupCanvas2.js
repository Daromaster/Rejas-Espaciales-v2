/* ------------------------------------------------------------------
   setupCanvas.js  ·  PROCESO 1
   Ajusta el canvas según su tamaño CSS real, capa el DPR y aplica escala
   ------------------------------------------------------------------ */
   export const G = {};         // globals accesibles por todo el juego

   export function setupCanvas(canvas, presetLogicWidth = null) {
     /* ----  Configuración editable ---------------------------------- */
     const DPR_CAP     = 2;                // dpr máximo aceptado en móviles modestos
     const MAX_REAL_PX = 1_200_000;        // techo de píxeles reales a dibujar
     const ASPECT_H    = 3 / 2;            // proporción en horizontal  (3:2)
     const ASPECT_V    = 3 / 4;            // proporción en vertical    (3:4)
     /* ---------------------------------------------------------------- */
   
     /* 1 · Medición real del canvas colocado por el CSS/layout (¡no del viewport!) */
     const rect = canvas.getBoundingClientRect();
     const cssW = rect.width;
     const cssH = rect.height;
   
     /* 2 · Densidad de píxel físico, limitada para evitar sobrecargar */
     const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
   
     /* 3 · Orientación y proporción lógica correspondiente */
     const portrait = cssH > cssW;
     const aspect   = portrait ? ASPECT_V : ASPECT_H;
   
     /* 4 · Ancho lógico inicial                                               */
     let logicW = presetLogicWidth ?? cssW;     // si hay preset, úsalo; si no, ancho CSS
     logicW = Math.min(logicW, cssW);           // nunca mayor que el ancho real disponible
     let logicH = logicW / aspect;
   
     /* 5 · Asegurar que la lógica cabe dentro del alto CSS */
     if (logicH > cssH) { logicH = cssH; logicW = logicH * aspect; }
   
     /* 6 · Cumplir con el techo de píxeles reales (lógica × dpr² ≤ MAX_REAL_PX) */
     const realPx = logicW * logicH * dpr * dpr;
     if (realPx > MAX_REAL_PX) {
       const factor = Math.sqrt(MAX_REAL_PX / realPx);
       logicW *= factor;
       logicH *= factor;
     }
   
     /* 7 · Redondear a múltiplos de 4 px lógicos para evitar sub-pixeles en sprites */
     logicW = Math.floor(logicW / 4) * 4;
     logicH = Math.floor(logicH / 4) * 4;
   
     /* 8 · Dimensión visual y búfer interno */
     canvas.style.width  = cssW + 'px';
     canvas.style.height = cssH + 'px';
     canvas.width  = Math.round(logicW * dpr);
     canvas.height = Math.round(logicH * dpr);
   
     /* 9 · Escala lógica → píxeles físicos (sin cizalla ni traslación) */
     const ctx = canvas.getContext('2d');
     ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
   
     /* 10 · Globals que usarán los demás módulos */
     Object.assign(G, {
       ctx,
       dpr,
       logicW,
       logicH,
       uml: logicW / 1000,        // unidad de medida lógica base
     });
   
     return G;                   // por comodidad si quieres encadenar
   }
   

   export function resizeGame(G) {
    const { logicW, logicH, uml, ctx } = G;
  
   
    /* 5 · Re-sincronizar módulos que usan caches de escala ------- */
    // gridInit();                    // grid.js copia G.uml y recalcula celdas
    // TODO: Implementar llamadas a funciones de reinicialización
   
  }