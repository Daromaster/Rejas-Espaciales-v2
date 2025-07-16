import { dibujarRejaBase, initGrid } from "./grid.js";
import { initFondo } from "./fondo.js";
import { initPelota } from "./pelota.js";
import { initDisparos } from "./disparos.js";
import { GameLevel, CanvasDimensions, GAME_CONFIG } from "./config.js";
import { resizeFondo } from "./fondo.js";
import { dibujarPelotaBase } from "./pelota.js";
import { resizeTimeline } from "./timeline.js";


export async function resizeGame() {
    
    console.log("🔄 1111111111111111111111111111111111111111111111111111111111111111111 Iniciando resizeGame - Aplicando 3 procesos...");
    
    // Obtener dimensiones sugeridas
    const dimensions = await CanvasDimensions.getCanvasDimensions();
    if (!dimensions) {
        console.error("❌ No se pudieron obtener dimensiones del canvas");
        return;
    }
    
    // Verificar que CanvasDimensions.uml esté disponible
    if (!CanvasDimensions.uml || CanvasDimensions.uml <= 0) {
        console.error(`❌ CanvasDimensions.uml no está disponible después de getCanvasDimensions(). Valor: ${CanvasDimensions.uml}`);
        return;
    }
    
    console.log(`✅ CanvasDimensions.uml verificado: ${CanvasDimensions.uml}`);

 /* 8 · Dimensión visual y búfer interno */
 const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
 if (!canvas) {
     console.warn('Canvas no encontrado para medir dimensiones');
     return;
 }

 // ⚠️ NO MODIFICAR canvas.style.width/height - El CSS ya maneja esto correctamente
 // Solo configurar el buffer interno del canvas
 console.log("2.5 2.5 2.5 2.5 2.5 2.5 2.5 2.5 2.5 2.5 2.5 2.5 2.5 2.5    css.width", dimensions.css.width , "css.height", dimensions.css.height);
 
 // SOLO configurar el buffer interno (NO el CSS)
 canvas.width  = Math.round(dimensions.LogicW * dimensions.dpr);
 canvas.height = Math.round(dimensions.LogicH * dimensions.dpr);
 console.log("3333333333333333333333333333333333333333333333333333333333333 canvas.PUM", "buffer interno:", dimensions.LogicW * dimensions.dpr, dimensions.LogicH * dimensions.dpr  );

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
        resizeFondo(currentLevel);
        dibujarRejaBase(currentLevel);
        
        // 🔷 En nivel 3 los polígonos se actualizan automáticamente al redibujar cada reja
        
        // Verificar CanvasDimensions.uml antes de dibujar pelota
        console.log(`🎾 Iniciando dibujarPelotaBase con CanvasDimensions.uml: ${CanvasDimensions.uml}`);
        dibujarPelotaBase(currentLevel);
        
        // Redimensionar timeline display
        resizeTimeline();
        
        // Solo inicializar pelota y disparos si el juego está activo
        if (window.gameInstance && window.gameInstance.gameStarted) {
            //initPelota(currentLevel);
           
        }
        
        console.log("✅ Sistemas reinicializados correctamente");
    } catch (error) {
        console.error("❌ Error reinicializando algunos sistemas:", error);
        console.error("   CanvasDimensions.uml en el momento del error:", CanvasDimensions.uml);
        console.error("   Nivel actual:", currentLevel);
        console.error("   Stack trace:", error.stack);
        
        // Al menos dibujar la reja base como fallback
        try {
            dibujarRejaBase(currentLevel);
        } catch (rejaError) {
            console.error("❌ Error incluso dibujando reja base:", rejaError);
        }
    }
    
    console.log("✅ resizeGame completado - Canvas y sistemas actualizados");
}

// Función con delay opcional para casos específicos como cambio de orientación
export async function resizeGameWithDelay(delayMs = 0) {
    if (delayMs > 0) {
        console.log(`⏳ Esperando ${delayMs}ms antes del resize...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    return await resizeGame();
}