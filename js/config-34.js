// Configuración principal del juego - Rejas Espaciales V2

// === DIMENSIONES LÓGICAS DEL CANVAS ===
export const GAME_CONFIG = {
    // Dimensiones lógicas dinámicas
    _logicalWidth: 900,   // valor inicial
    _logicalHeight: 600,  // valor inicial
    
    get LOGICAL_WIDTH() {
        return this._logicalWidth;
    },
    get LOGICAL_HEIGHT() {
        return this._logicalHeight;
    },
    
    // Función para actualizar dimensiones
    setLogicalDimensions: function(width, height) {
        this._logicalWidth = width;
        this._logicalHeight = height;
        console.log(`🎯 LOGICAL_WIDTH/HEIGHT actualizados: ${width}x${height}`);
    },
    
    // Sistema de actualizaciones
    LOGIC_FPS: 30, // 30 steps por segundo para la lógica
    TARGET_FPS: 60, // 60 FPS para animaciones
    
    // Configuración del canvas
    CANVAS_ID: 'canvas-principal',
    
    // Estados del juego
    GAME_STATES: {
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAME_OVER: 'game_over'
    },
    
    // Estado actual del nivel
    CURRENT_LEVEL: 1
};

// === CONFIGURACIÓN DEL CANVAS ===
export class CanvasManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.dpr = window.devicePixelRatio || 1;
        this.logicalWidth = GAME_CONFIG.LOGICAL_WIDTH;
        this.logicalHeight = GAME_CONFIG.LOGICAL_HEIGHT;
    }
    
    // Inicializar el canvas con dimensiones lógicas
    initialize() {
        this.canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
        if (!this.canvas) {
            throw new Error('Canvas no encontrado');
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.updateCanvasSize();
        
        // Configurar eventos de resize
        window.addEventListener('resize', () => this.updateCanvasSize());
        
        return this.ctx;
    }
    
    // Actualizar el tamaño del canvas manteniendo las proporciones lógicas
    updateCanvasSize() {
        // ✅ CORRECCIÓN: Configurar canvas para trabajar con dimensiones lógicas
        // El CSS maneja el responsive, nosotros trabajamos siempre en 900x600
        this.canvas.width = this.logicalWidth;
        this.canvas.height = this.logicalHeight;
        
        // ✅ No aplicar DPR scaling en este proyecto
        // El canvas siempre trabaja en coordenadas lógicas 900x600
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        console.log(`Canvas configurado: ${this.logicalWidth}x${this.logicalHeight} (lógico)`);
    }
    
    // Obtener contexto del canvas
    getContext() {
        return this.ctx;
    }
    
    // Obtener dimensiones lógicas
    getLogicalDimensions() {
        return {
            width: this.logicalWidth,
            height: this.logicalHeight
        };
    }
}

// === CONFIGURACIÓN DE NIVELES ===
export const LEVELS_CONFIG = {
    1: {
        timeLimit: 60000, // 60 segundos
        targetPattern: 'alternating', // alternado cubierto/descubierto
        targetTime: 2000, // 2 segundos en cada destino
        gridRotation: 0, // sin rotación en nivel 1
        gridMovement: 'floating' // solo flotación
    },
    2: {
        timeLimit: 60000,
        targetPattern: 'random',
        targetTime: 'random', // tiempo variable
        gridRotation: 'slow', // rotación lenta
        gridMovement: 'floating'
    }
    // Más niveles se agregarán en futuros pasos
};

// === CONFIGURACIÓN DE AUDIO ===
export const AUDIO_CONFIG = {
    enabled: true,
    volume: 0.7,
    sounds: {
        shoot: 'assets/sounds/shoot.mp3',
        hit: 'assets/sounds/hit.mp3',
        miss: 'assets/sounds/miss.mp3',
        levelComplete: 'assets/sounds/level_complete.mp3'
    }
};

// === CONFIGURACIÓN DEL CANVAS ===
export const CanvasSetup = {
    // Configuración de límites
    DPR_CAP: 2,                // dpr máximo aceptado en móviles modestos
    MAX_REAL_PX: 1_200_000,    // techo de píxeles reales a dibujar
    
    // Configurar canvas físico con nuevas dimensiones lógicas
    applyCanvasSettings: (logicW, logicH) => {
        const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
        if (!canvas) {
            console.error('❌ Canvas no encontrado para configurar');
            return false;
        }
        
        // Densidad de píxel físico, limitada para evitar sobrecargar
        const dpr = Math.min(window.devicePixelRatio || 1, CanvasSetup.DPR_CAP);
        
        // Cumplir con el techo de píxeles reales (lógica × dpr² ≤ MAX_REAL_PX)
        let finalLogicW = logicW;
        let finalLogicH = logicH;
        const realPx = logicW * logicH * dpr * dpr;
        
        if (realPx > CanvasSetup.MAX_REAL_PX) {
            const factor = Math.sqrt(CanvasSetup.MAX_REAL_PX / realPx);
            finalLogicW = Math.floor(logicW * factor);
            finalLogicH = Math.floor(logicH * factor);
            console.log(`⚠️ Aplicando límite de píxeles: ${logicW}x${logicH} → ${finalLogicW}x${finalLogicH}`);
        }
        
        // Aplicar dimensiones físicas al canvas
        canvas.width = Math.round(finalLogicW * dpr);
        canvas.height = Math.round(finalLogicH * dpr);
        
        // Configurar escala del contexto
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        console.log(`🖥️ Canvas físico configurado: ${canvas.width}x${canvas.height}px (DPR: ${dpr})`);
        console.log(`📐 Coordenadas lógicas: ${finalLogicW}x${finalLogicH}px`);
        
        return { logicW: finalLogicW, logicH: finalLogicH, dpr, ctx };
    }
};

// === GESTIÓN DE DIMENSIONES ===
export const CanvasDimensions = {
    // SOLO OBTENER dimensiones reales del canvas (NO aplicar cambios todavía)
    getCanvasDimensions: () => {
        return new Promise((resolve) => {
            // Esperar un frame para garantizar que CSS se ha aplicado
            requestAnimationFrame(() => {
                const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
                if (!canvas) {
                    console.warn('Canvas no encontrado para medir dimensiones');
                    resolve(false);
                    return;
                }
                
                // Obtener dimensiones reales después de CSS
                const rect = canvas.getBoundingClientRect();
                const cssW = rect.width;
                const cssH = rect.height;
                
                // Obtener dimensiones lógicas actuales (sin cambiarlas)
                const currentLogicalW = GAME_CONFIG.LOGICAL_WIDTH;
                const currentLogicalH = GAME_CONFIG.LOGICAL_HEIGHT;
                
                // Calcular qué dimensiones lógicas PODRÍAMOS usar
                const suggestedDims = CanvasDimensions.calculateLogicalDimensions(cssW, cssH);
                
                console.log(`📏 REPORTE DE DIMENSIONES:`);
                console.log(`   CSS canvas: ${cssW}x${cssH}px`);
                console.log(`   Lógico actual: ${currentLogicalW}x${currentLogicalH}px`);
                console.log(`   Lógico sugerido: ${suggestedDims.width}x${suggestedDims.height}px`);
                console.log(`   ¿Coinciden?: ${currentLogicalW === suggestedDims.width && currentLogicalH === suggestedDims.height ? '✅ SÍ' : '❌ NO'}`);
                
                resolve({
                    css: { width: cssW, height: cssH },
                    currentLogical: { width: currentLogicalW, height: currentLogicalH },
                    suggestedLogical: suggestedDims
                });
            });
        });
    },
    
    // Calcular dimensiones lógicas basadas en el tamaño CSS real
    calculateLogicalDimensions: (cssW, cssH) => {
        // Determinar si es vertical u horizontal por las dimensiones reales
        const isVertical = cssH > cssW;
        
        // Tabla de resoluciones lógicas basada en ancho del canvas
        let logicW;
        if (cssW <= 360)         logicW = 480;
        else if (cssW <= 500)    logicW = 720;
        else if (cssW <= 900)    logicW = 900;
        else if (cssW <= 1280)   logicW = 1200;
        else                     logicW = 1440;
        
        // Calcular alto lógico basado en orientación y proporción
        const aspect = isVertical ? (3/4) : (3/2);  // 3:4 vertical, 3:2 horizontal
        const logicH = Math.round(logicW / aspect);
        
        console.log(`📐 Calculado: ${isVertical ? 'Vertical' : 'Horizontal'} - ${logicW}x${logicH} (ratio ${aspect.toFixed(2)})`);
        
        return { width: logicW, height: logicH };
    }
};

// === GESTIÓN DE NIVEL ===
export const GameLevel = {
    // Obtener nivel actual
    getCurrentLevel: () => GAME_CONFIG.CURRENT_LEVEL,
    
    // Cambiar nivel
    setLevel: (level) => {
        GAME_CONFIG.CURRENT_LEVEL = level;
        console.log(`Nivel cambiado a: ${level}`);
    },
    
    // Avanzar al siguiente nivel
    nextLevel: () => {
        GAME_CONFIG.CURRENT_LEVEL++;
        console.log(`Avanzando al nivel: ${GAME_CONFIG.CURRENT_LEVEL}`);
        return GAME_CONFIG.CURRENT_LEVEL;
    }
};

// === UTILIDADES GLOBALES ===
export const Utils = {
    // Interpolación lineal para animaciones
    lerp: (start, end, factor) => {
        return start + (end - start) * factor;
    },
    
    // Calcular distancia entre dos puntos
    distance: (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    // Normalizar ángulo a rango 0-2π
    normalizeAngle: (angle) => {
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        return angle;
    }
};

// === VERSIÓN DEL JUEGO ===
export const GAME_VERSION = "2.0.0";

console.log(`Rejas Espaciales V${GAME_VERSION} - Config cargado`);

// === CONFIGURACIÓN DE CAPAS DE RENDERIZADO ===
export const RENDER_LAYERS = {
    // Orden de composición: fondo, pelota, reja, objetos, efectos, borrador
    FONDO: 0,
    PELOTA: 1,
    REJA: 2,
    OBJETOS: 3,  // Para futuros niveles
    EFECTOS: 4,
    BORRADOR: 5  // Debug/desarrollo
}; 