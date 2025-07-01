import { dibujarRejaBase, initGrid } from "./grid.js";
import { initFondo, resizeFondo } from "./fondo.js";
import { initPelota, dibujarPelotaBase } from "./pelota.js";
import { initDisparos } from "./disparos.js";
import { GameLevel, CanvasDimensions, GAME_CONFIG } from "./config.js";

// === FUNCIÓN PARA CÁLCULO Y CONFIGURACIÓN DE CANVAS SOLAMENTE ===
export async function calculateAndSetupCanvas() {
    console.log("📐 Calculando dimensiones y configurando canvas...");
    
    // Obtener dimensiones sugeridas
    const dimensions = await CanvasDimensions.getCanvasDimensions();
    if (!dimensions) {
        console.error("❌ No se pudieron obtener dimensiones del canvas");
        return null;
    }

    // Configurar canvas físico
    const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
    if (!canvas) {
        console.warn('Canvas no encontrado para configurar');
        return null;
    }

    // SOLO configurar el buffer interno (NO el CSS - eso lo maneja main.css)
    canvas.width  = Math.round(dimensions.LogicW * dimensions.dpr);
    canvas.height = Math.round(dimensions.LogicH * dimensions.dpr);
    console.log("📦 Buffer interno del canvas:", dimensions.LogicW * dimensions.dpr, "x", dimensions.LogicH * dimensions.dpr);

    // Configurar escala lógica → píxeles físicos
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0);

    // Actualizar GAME_CONFIG con las nuevas dimensiones
    GAME_CONFIG.setLogicalDimensions(dimensions.LogicW, dimensions.LogicH);
    
    console.log("✅ Canvas configurado:", dimensions.LogicW, "x", dimensions.LogicH, "(lógico)");
    return dimensions;
}

export async function resizeGame() {
    console.log("🔄 Iniciando resizeGame - Solo redimensionamiento de sistemas...");
    
    // PASO 1: Recalcular y configurar canvas
    const dimensions = await calculateAndSetupCanvas();
    if (!dimensions) {
        console.error("❌ Error en configuración del canvas");
        return;
    }
    // PASO 2: Redimensionar sistemas existentes
    
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