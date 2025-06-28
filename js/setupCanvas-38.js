import { dibujarRejaBase } from "./grid.js";
import { GameLevel, CanvasDimensions, GAME_CONFIG, CanvasSetup } from "./config.js";

export async function resizeGame() {
    console.log("🔄 Iniciando resizeGame - Aplicando 3 procesos...");
    
    // Obtener dimensiones sugeridas
    const dimensions = await CanvasDimensions.getCanvasDimensions();
    
    if (!dimensions) {
        console.error("❌ No se pudieron obtener dimensiones del canvas");
        return;
    }
    
    // PROCESO 1: Actualizar GAME_CONFIG.LOGICAL_WIDTH/HEIGHT
    const suggestedW = dimensions.suggestedLogical.width;
    const suggestedH = dimensions.suggestedLogical.height;
    GAME_CONFIG.setLogicalDimensions(suggestedW, suggestedH);
    
    // PROCESO 2: Configurar canvas físico con DPR y límites
    const canvasResult = CanvasSetup.applyCanvasSettings(suggestedW, suggestedH);
    
    if (!canvasResult) {
        console.error("❌ Error configurando canvas físico");
        return;
    }
    
    // PROCESO 3: Ejecutar dibujarRejaBase con nuevas dimensiones
    const currentLevel = GameLevel.getCurrentLevel();
    
    console.log(`🎮 Redibujando reja para nivel ${currentLevel}`);
    console.log(`   LOGICAL_WIDTH: ${GAME_CONFIG.LOGICAL_WIDTH}, LOGICAL_HEIGHT: ${GAME_CONFIG.LOGICAL_HEIGHT}`);
    
    dibujarRejaBase(currentLevel);
    
    console.log("✅ resizeGame completado - 3 procesos aplicados");
}