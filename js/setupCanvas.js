import { dibujarRejaBase, initGrid } from "./grid.js";
import { initFondo } from "./fondo.js";
import { initPelota } from "./pelota.js";
import { initDisparos } from "./disparos.js";
import { GameLevel, CanvasDimensions, GAME_CONFIG } from "./config.js";

export async function resizeGame() {
    console.log("🔄 SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSIniciando resizeGame - Aplicando 3 procesos...");
    
    // Obtener dimensiones sugeridas
    const dimensions = await CanvasDimensions.getCanvasDimensions();
    if (!dimensions) {
        console.error("❌ No se pudieron obtener dimensiones del canvas");
        return;
    }

 /* 8 · Dimensión visual y búfer interno */
 const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
 if (!canvas) {
     console.warn('Canvas no encontrado para medir dimensiones');
     resolve(false);
     return;
 }

 canvas.style.width  = dimensions.css.width + 'px';
 canvas.style.height = dimensions.css.height + 'px';
 canvas.width  = Math.round(dimensions.LogicW * dimensions.dpr);
 canvas.height = Math.round(dimensions.LogicH * dimensions.dpr);
 console.log("canvas.PUM", dimensions.css.width + 'px', dimensions.css.height + 'px', dimensions.LogicW * dimensions.dpr, dimensions.LogicH * dimensions.dpr  );

 /* 9 · Escala lógica → píxeles físicos (sin cizalla ni traslación) */
 const ctx = canvas.getContext('2d');
 ctx.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0);

    // PROCESO 1: Actualizar GAME_CONFIG.LOGICAL_WIDTH/HEIGHT
    GAME_CONFIG.setLogicalDimensions(dimensions.LogicW, dimensions.LogicH);
    
    // PROCESO 2: Reinicializar sistemas si el juego ya está corriendo
    const currentLevel = GameLevel.getCurrentLevel();
    
    console.log(`🎮 Reinicializando sistemas para nivel ${currentLevel}`);
    console.log(`   LOGICAL_WIDTH: ${GAME_CONFIG.LOGICAL_WIDTH}, LOGICAL_HEIGHT: ${GAME_CONFIG.LOGICAL_HEIGHT}`);
    
    try {
        // Reinicializar todos los canvas virtuales con las nuevas dimensiones
        initFondo(currentLevel);
        initGrid(currentLevel);
        
        // Solo inicializar pelota y disparos si el juego está activo
        if (window.gameInstance && window.gameInstance.gameStarted) {
            initPelota(currentLevel);
            initDisparos(currentLevel);
        }
        
        console.log("✅ Sistemas reinicializados correctamente");
    } catch (error) {
        console.warn("⚠️ Error reinicializando algunos sistemas:", error);
        // Al menos dibujar la reja base como fallback
        dibujarRejaBase(currentLevel);
    }
    
    console.log("✅ resizeGame completado - Canvas y sistemas actualizados");
}