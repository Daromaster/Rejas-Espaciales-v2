/* --------------------------------------------------------------
   layout.js  ·  PROCESO 0
   Detecta orientación y calcula un preset lógico coherente con el
   ancho CSS real que tendrá el canvas.
   -------------------------------------------------------------- */
   export const layoutPreset = { logicWidth: null };

   const CANVAS_RATIO_LAND = 0.66;      // mismo valor que tu CSS: width: 66vw;
   
   export function detectLayout() {
     const vw = window.innerWidth;
     const vh = window.innerHeight;
     const portrait = vh > vw;
   
     /* 1 · Clases CSS para que el layout coloque el canvas */
     document.body.classList.toggle('portrait',  portrait);
     document.body.classList.toggle('landscape', !portrait);
   
     /* 2 · ¿Cuál será el ancho CSS real del canvas? */
     const canvasTargetW = portrait ? vw                // 100 % en vertical
                                    : vw * CANVAS_RATIO_LAND; // 66 % en horizontal
   
     /* 3 · Preset lógico en función de ese ancho target */
     let logicW;
     if (canvasTargetW <= 360)         logicW = 480;
     else if (canvasTargetW <= 500)    logicW = 720;
     else if (canvasTargetW <= 900)    logicW = 900;
     else if (canvasTargetW <= 1280)   logicW = 1200;
     else                              logicW = 1440;
   
     layoutPreset.logicWidth = logicW;
   }
   