// Configuración principal del juego - Rejas Espaciales V2

// === DIMENSIONES LÓGICAS DEL CANVAS ===
export const GAME_CONFIG = {
    // Dimensiones lógicas dinámicas según orientación
    get LOGICAL_WIDTH() {
        return 900; // Siempre 900 de ancho
    },
    get LOGICAL_HEIGHT() {
        // Horizontal: 600, Vertical: 1200
        return window.matchMedia('(orientation: portrait)').matches ? 1200 : 600;
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