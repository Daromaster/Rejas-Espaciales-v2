import { dibujarRejaBase } from "./grid.js";
import { GameLevel } from "./config.js";

export function resizeGame() {
    /* 5 · Re-sincronizar módulos que usan caches de escala ------- */
    
    // Obtener nivel actual del sistema de gestión
    const currentLevel = GameLevel.getCurrentLevel();
    
    dibujarRejaBase(currentLevel);
    console.log("Se disparó el resize - Nivel:", currentLevel);
}