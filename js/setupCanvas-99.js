import { dibujarRejaBase, initGrid } from "./grid.js";
import { initFondo, resizeFondo } from "./fondo.js";
import { initPelota, dibujarPelotaBase } from "./pelota.js";
import { initDisparos } from "./disparos.js";
import { GameLevel, CanvasDimensions, GAME_CONFIG } from "./config.js";

export async function resizeGame() {
    console.log("🔄 1111111111111111111111111111111111111111111111111111111111111111111 Iniciando resizeGame - Aplicando 3 procesos...");
    
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
    
    // PROCESO 2: Reinicializar sistemas con el nivel apropiado
    
    // Asegurar que siempre tengamos un nivel válido
    let currentLevel = GameLevel.getCurrentLevel();
    if (!currentLevel || currentLevel < 1) {
        console.log("🎯 Nivel no válido, estableciendo nivel 1 por defecto");
        GameLevel.setLevel(1);
        currentLevel = 1;
    }

    console.log(`🎮 Reinicializando sistemas para nivel ${currentLevel}`);
    console.log(`   LOGICAL_WIDTH: ${GAME_CONFIG.LOGICAL_WIDTH}, LOGICAL_HEIGHT: ${GAME_CONFIG.LOGICAL_HEIGHT}`);
    
    try {
        // Sistemas que SIEMPRE se reinicializan (primera carga y resize)
        console.log("🔄 Reinicializando sistemas básicos...");
        resizeFondo(currentLevel);
        dibujarRejaBase(currentLevel);
        
        // Sistemas que solo se reinicializan si el juego está activo
        if (window.gameInstance && window.gameInstance.gameStarted) {
            console.log("🔄 Reinicializando sistemas del juego activo...");
            dibujarPelotaBase(currentLevel);
            initPelota(currentLevel);
            initDisparos(currentLevel);
        } else {
            console.log("🎮 Juego no iniciado, solo reinicializando sistemas básicos");
            // Para la pantalla de instrucciones, dibujar pelota base sin inicializar sistema completo
            try {
                dibujarPelotaBase(currentLevel);
            } catch (pelotaError) {
                console.log("ℹ️ No se pudo dibujar pelota base (normal en primera carga)");
            }
        }
        
        console.log("✅ Sistemas reinicializados correctamente");
    } catch (error) {
        console.warn("⚠️ Error reinicializando algunos sistemas:", error);
        console.error(error); // Log completo para debug
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