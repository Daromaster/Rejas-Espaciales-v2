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
// CanvasManager DESACTIVADO - Ahora se usa CanvasDimensions + resizeGame()
/*
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
        debugger;
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
        debugger;
        // ✅ No aplicar DPR scaling en este proyecto
        // El canvas siempre trabaja en coordenadas lógicas 900x600
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        console.log(`Canvas configurado: ${this.logicalWidth}x${this.logicalHeight} (lógico)`);
    }
    
    // Obtener contexto del canvas
    getContext() {
        debugger;
        return this.ctx;
        
    }
    
    // Obtener dimensiones lógicas
    getLogicalDimensions() {
        debugger;
        return {
            width: this.logicalWidth,
            height: this.logicalHeight,
            
        };
    }
}
*/

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



// === GESTIÓN DE DIMENSIONES ===
export const CanvasDimensions = {
    // SOLO OBTENER dimensiones reales del canvas (NO aplicar cambios todavía)
    getCanvasDimensions: () => {
        return new Promise((resolve) => {
            // TRIPLE requestAnimationFrame para garantizar que CSS + layout estén completamente aplicados
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
                        if (!canvas) {
                            console.warn('Canvas no encontrado para medir dimensiones');
                            resolve(false);
                            return;
                        }
                        
                        // Forzar recálculo de layout antes de medir
                        canvas.offsetHeight; // Trigger reflow
                        
                        // Obtener dimensiones reales después de CSS completo
                        const rect = canvas.getBoundingClientRect();
                        const cssW = rect.width;
                        const cssH = rect.height;
                        console.log("22222222222222222222222222222222222222222222222222 canvasPum DESPUÉS del triple rAF","cssW", cssW, "cssH", cssH, "ratio:", (cssH/cssW).toFixed(3)  );
                        
                        // Verificar que las dimensiones CSS sean válidas
                        if (cssW <= 0 || cssH <= 0) {
                            console.warn('⚠️ Dimensiones CSS inválidas, usando valores por defecto');
                            resolve(false);
                            return;
                        }
                        
                        // Calcular y almacenar dimensiones lógicas
                        const logicalDims = CanvasDimensions.calculateLogicalDimensions(cssW, cssH);
                        CanvasDimensions.LogicW = logicalDims.width;
                        CanvasDimensions.LogicH = logicalDims.height;
                        
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
                        
                        const DPR_CAP     = 2;                // dpr máximo aceptado en móviles modestos
                        const MAX_REAL_PX = 1_200_000;        // techo de píxeles reales a dibujar
                        const ASPECT_H    = 3 / 2;            // proporción en horizontal  (3:2)
                        const ASPECT_V    = 3 / 4;            // proporción en vertical    (3:4)
                        
                        /* 2 · Densidad de píxel físico, limitada para evitar sobrecargar */
                        const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

                        /* 3 · Orientación y proporción lógica correspondiente */
                        const portrait = cssH > cssW;
                        const aspect   = portrait ? ASPECT_V : ASPECT_H;

                        /* 4 · Ancho lógico inicial                                               */
                        let logicW = suggestedDims.width ?? cssW;     // si hay preset, úsalo; si no, ancho CSS
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

                        // *** CRÍTICO: Establecer CanvasDimensions.uml antes de resolve ***
                        CanvasDimensions.uml = logicW / 1000;
                        console.log(`✅ CanvasDimensions.uml establecido: ${CanvasDimensions.uml}`);

                        resolve({
                            LogicW: logicW,
                            LogicH: logicH,
                            css: { width: cssW, height: cssH },
                            currentLogical: { width: currentLogicalW, height: currentLogicalH },
                            suggestedLogical: suggestedDims,
                            dpr: dpr,
                            uml: logicW / 1000   // unidad de medida lógica base
                        });
                    }); // Cierre del tercer requestAnimationFrame
                }); // Cierre del segundo requestAnimationFrame
            }); // Cierre del primer requestAnimationFrame
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

// === VARIABLE GLOBAL DE DEBUG PARA DETECCIÓN POR POLÍGONOS ===
/**
 * Variable global para debug visual de polígonos de detección
 * 0 = Desactivado (producción)
 * 1 = Activado (desarrollo/testing)
 * Solo funciona en live server para evitar mostrar en producción
 */
window.debugDeteccionDibujoPoligonos = 1; // Cambiar a 0 para desactivar

// === ESTADO DEL DEBUG VISUAL ===
window.debugVisualizacionState = {
    activo: false,
    framesRestantes: 0,
    maxFrames: 30, // Duración en frames (0.5 segundos a 60fps)
    ultimoDisparo: 0
};

console.log(`🧪 [DEBUG] Sistema de visualización de polígonos: ${window.debugDeteccionDibujoPoligonos ? 'ACTIVADO' : 'DESACTIVADO'}`);

// === FUNCIONES GLOBALES DE CONTROL DEL DEBUG ===

/**
 * Activa el debug visual de polígonos
 */
window.activarDebugPoligonos = function() {
    window.debugDeteccionDibujoPoligonos = 1;
    console.log("🎨 [DEBUG] Debug visual de polígonos ACTIVADO");
    console.log("💡 Ahora los disparos en nivel 3 mostrarán polígonos por 30 frames");
    console.log("💡 También puedes usar debugShowPolygons() para activar manualmente");
};

/**
 * Desactiva el debug visual de polígonos
 */
window.desactivarDebugPoligonos = function() {
    window.debugDeteccionDibujoPoligonos = 0;
    window.debugVisualizacionState.activo = false;
    console.log("🎨 [DEBUG] Debug visual de polígonos DESACTIVADO");
};

/**
 * Muestra el estado actual del debug
 */
window.estadoDebugPoligonos = function() {
    const isLiveServer = window.location.hostname === '127.0.0.1' || 
                        window.location.hostname === 'localhost' ||
                        window.location.hostname.includes('local');
    
    console.log("🧪 [DEBUG] Estado del sistema de visualización:");
    console.log(`   Variable global: ${window.debugDeteccionDibujoPoligonos ? 'ACTIVADO' : 'DESACTIVADO'}`);
    console.log(`   Live server: ${isLiveServer ? 'SÍ' : 'NO'}`);
    console.log(`   Visualización activa: ${window.debugVisualizacionState.activo ? 'SÍ' : 'NO'}`);
    console.log(`   Frames restantes: ${window.debugVisualizacionState.framesRestantes}`);
    console.log("💡 Funciones disponibles:");
    console.log("   activarDebugPoligonos() - Activar debug");
    console.log("   desactivarDebugPoligonos() - Desactivar debug");
    console.log("   debugShowPolygons() - Mostrar polígonos manualmente");
    console.log("   estadoDebugPoligonos() - Ver este estado");
    
    return {
        debugActivo: !!window.debugDeteccionDibujoPoligonos,
        liveServer: isLiveServer,
        visualizacionActiva: window.debugVisualizacionState.activo,
        framesRestantes: window.debugVisualizacionState.framesRestantes
    };
}; 