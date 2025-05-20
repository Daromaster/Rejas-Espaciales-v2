// Configuraciones del juego
const CONFIG = {
    // Configuración de la reja
    grid: {
        color: 'rgba(0, 255, 255, 1)',
        lineWidth: 2,
        cellSize: 40, // Tamaño base de celda
        padding: 20,  // Padding alrededor de la reja
    },
    
    // Configuración de la pelota
    ball: {
        radius: 15,
        color: 'rgba(255, 0, 255, 1)',
        speed: 5,
    },
    
    // Configuración del juego
    game: {
        fps: 60,
        debug: true,
    }
};

// Exportar configuración
window.CONFIG = CONFIG;

// --- Fin del archivo config.js — 2025-05-01 10:42:00 GMT-3 — rev. 021 ---
