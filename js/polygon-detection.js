// polygon-detection.js - Sistema de detección de disparos por polígonos para Rejas Espaciales V2
// Implementa detección basada en píxeles activos, marching-squares, simplificación y SAT

import { GAME_CONFIG } from './config.js';

// Importar las librerías implementadas
import { simplify } from './lib/simplify.js';
import { isoContours } from './lib/marching-squares.js';
import { Vector, Polygon, Circle, testPolygonCircle } from './lib/sat.js';

// === CONFIGURACIÓN DEL SISTEMA ===
const POLYGON_DETECTION_CONFIG = {
    // Umbral de visibilidad alpha (0-255)
    ALPHA_THRESHOLD: 10,
    
    // Tolerancia para simplificación de contornos (píxeles)
    SIMPLIFICATION_TOLERANCE: 2,
    
    // Máximo número de polígonos a procesar por reja
    MAX_POLYGONS_PER_GRID: 10,
    
    // Debug mode
    DEBUG: false
};

// === VARIABLES GLOBALES ===
let polygonDataCache = new Map(); // Cache de polígonos por reja: rejaId -> polygonData
let lastProcessTime = 0; // Tiempo de último procesamiento para debug

// === SISTEMA PRINCIPAL DE DETECCIÓN POR POLÍGONOS ===

/**
 * Clase principal para manejo de detección por polígonos en nivel 3
 */
class PolygonDetectionSystem {
    constructor() {
        this.initialized = false;
        this.processingEnabled = true;
        this.debugMode = POLYGON_DETECTION_CONFIG.DEBUG;
        
        console.log("🔧 Sistema de detección por polígonos inicializado");
    }
    
    // === PUNTO 1: EVALUACIÓN DE CANVAS VIRTUAL ===
    /**
     * Determina qué canvas usar para análisis de píxeles
     * @param {GridObj} gridObj - Objeto GridObj del nivel 3
     * @returns {CanvasRenderingContext2D|null} Contexto del canvas a usar
     */
    getCanvasForPixelAnalysis(gridObj) {
        if (!gridObj || !gridObj.canvases) {
            console.warn("⚠️ GridObj no válido para análisis de píxeles");
            return null;
        }
        
        // ANÁLISIS: Usar canvas[0] (canvas base sin transformaciones)
        // Este canvas contiene la reja dibujada sin rotaciones/traslaciones
        // y solo se actualiza en resize, perfecto para nuestro propósito
        const baseCanvas = gridObj.canvases[0];
        
        if (!baseCanvas || !baseCanvas.canvas) {
            console.warn(`⚠️ Canvas base no encontrado para GridObj ${gridObj.id}`);
            return null;
        }
        
        if (this.debugMode) {
            console.log(`🎯 Usando canvas[0] para análisis de ${gridObj.id}: ${baseCanvas.canvas.width}x${baseCanvas.canvas.height}`);
        }
        
        return baseCanvas;
    }
    
    // === PUNTO 2: DETECCIÓN DE PÍXELES ACTIVOS ===
    /**
     * Detecta píxeles activos en el canvas base de una reja
     * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
     * @returns {Array<Array<number>>} Matriz binaria: 1 si hay píxel, 0 si no
     */
    detectActivePixels(ctx) {
        const startTime = performance.now();
        
        if (!ctx || !ctx.canvas) {
            console.error("❌ Contexto de canvas no válido");
            return [];
        }
        
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Obtener datos de imagen completa
        let imgData;
        try {
            imgData = ctx.getImageData(0, 0, width, height);
        } catch (error) {
            console.error("❌ Error al obtener ImageData:", error);
            return [];
        }
        
        const data = imgData.data;
        const binaryGrid = [];
        
        // Procesar píxel por píxel
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4; // RGBA: 4 bytes por píxel
                const alpha = data[i + 3]; // Canal alpha
                
                // Aplicar umbral de visibilidad
                row.push(alpha > POLYGON_DETECTION_CONFIG.ALPHA_THRESHOLD ? 1 : 0);
            }
            binaryGrid.push(row);
        }
        
        const processingTime = performance.now() - startTime;
        
        if (this.debugMode) {
            const activePixels = binaryGrid.flat().filter(p => p === 1).length;
            console.log(`📊 Píxeles activos detectados: ${activePixels}/${width * height} en ${processingTime.toFixed(1)}ms`);
        }
        
        return binaryGrid;
    }
    
    // === PUNTO 3: TRAZADO DE CONTORNOS CON MARCHING-SQUARES ===
    /**
     * Traza contornos usando marching-squares
     * @param {Array<Array<number>>} binaryGrid - Matriz binaria de píxeles
     * @returns {Array<Array<{x: number, y: number}>>} Array de contornos
     */
    traceContours(binaryGrid) {
        if (!binaryGrid || binaryGrid.length === 0) {
            return [];
        }
        
        const startTime = performance.now();
        
        try {
            // Usar marching-squares para encontrar contornos con umbral 0.5
            const contours = isoContours(binaryGrid, 0.5);
            
            const processingTime = performance.now() - startTime;
            
            if (this.debugMode) {
                console.log(`🎯 Contornos trazados: ${contours.length} en ${processingTime.toFixed(1)}ms`);
            }
            
            return contours || [];
        } catch (error) {
            console.error("❌ Error al trazar contornos:", error);
            return [];
        }
    }
    
    // === PUNTO 4: SIMPLIFICACIÓN DE CONTORNOS CON SIMPLIFY-JS ===
    /**
     * Simplifica contornos usando Douglas-Peucker
     * @param {Array<{x: number, y: number}>} contour - Contorno original
     * @param {number} tolerance - Tolerancia de simplificación
     * @returns {Array<{x: number, y: number}>} Contorno simplificado
     */
    simplifyContour(contour, tolerance = POLYGON_DETECTION_CONFIG.SIMPLIFICATION_TOLERANCE) {
        if (!contour || contour.length < 3) {
            return contour;
        }
        
        try {
            // Usar simplify.js para reducir vértices
            const simplified = simplify(contour, tolerance);
            
            if (this.debugMode) {
                console.log(`🔧 Contorno simplificado: ${contour.length} → ${simplified.length} vértices`);
            }
            
            return simplified;
        } catch (error) {
            console.error("❌ Error al simplificar contorno:", error);
            return contour; // Retornar original si falla
        }
    }
    
    // === PUNTO 5: CONVERSIÓN A POLÍGONOS SAT ===
    /**
     * Convierte contornos simplificados en polígonos SAT
     * @param {Array<{x: number, y: number}>} contour - Contorno simplificado
     * @returns {Polygon|null} Polígono SAT o null si error
     */
    createSATPolygon(contour) {
        if (!contour || contour.length < 3) {
            return null;
        }
        
        try {
            // Convertir puntos del contorno a vectores SAT
            const satPoints = contour.map(p => new Vector(p.x, p.y));
            
            // Crear polígono SAT (posición inicial en origen)
            const satPolygon = new Polygon(new Vector(0, 0), satPoints);
            
            if (this.debugMode) {
                console.log(`🔷 Polígono SAT creado con ${satPoints.length} vértices`);
            }
            
            return satPolygon;
        } catch (error) {
            console.error("❌ Error al crear polígono SAT:", error);
            return null;
        }
    }
    
    // === PUNTO 6: DETECCIÓN DE COLISIÓN CON SAT.JS ===
    /**
     * Detecta colisión entre polígono SAT y pelota circular
     * @param {Polygon} satPolygon - Polígono SAT
     * @param {Object} ballData - Datos de la pelota {x, y, radius}
     * @returns {boolean} true si hay colisión
     */
    testPolygonBallCollision(satPolygon, ballData) {
        if (!satPolygon || !ballData) {
            return false;
        }
        
        try {
            // Crear círculo SAT para la pelota
            const ballCircle = new Circle(new Vector(ballData.x, ballData.y), ballData.radius);
            
            // Realizar test de colisión SAT entre polígono y círculo
            const collision = testPolygonCircle(satPolygon, ballCircle);
            
            if (this.debugMode && collision) {
                console.log(`💥 Colisión detectada: pelota(${ballData.x}, ${ballData.y}, r=${ballData.radius})`);
            }
            
            return collision;
        } catch (error) {
            console.error("❌ Error en detección de colisión SAT:", error);
            return false;
        }
    }
    
    // === PROCESAMIENTO COMPLETO PARA UNA REJA GRIDOBJ ===
    /**
     * Procesa completamente una reja GridObj y genera sus polígonos de colisión
     * @param {GridObj} gridObj - Objeto GridObj a procesar
     * @returns {Object|null} Datos de polígonos procesados
     */
    processGridObjPolygons(gridObj) {
        if (!gridObj || !this.processingEnabled) {
            return null;
        }
        
        const startTime = performance.now();
        console.log(`🔄 Procesando polígonos para GridObj: ${gridObj.id}`);
        
        // Paso 1: Obtener canvas para análisis
        const ctx = this.getCanvasForPixelAnalysis(gridObj);
        if (!ctx) {
            return null;
        }
        
        // Paso 2: Detectar píxeles activos
        const binaryGrid = this.detectActivePixels(ctx);
        if (binaryGrid.length === 0) {
            return null;
        }
        
        // Paso 3: Trazar contornos
        const contours = this.traceContours(binaryGrid);
        if (contours.length === 0) {
            return null;
        }
        
        // Paso 4 y 5: Simplificar y convertir a SAT
        const satPolygons = [];
        for (const contour of contours) {
            const simplified = this.simplifyContour(contour);
            const satPolygon = this.createSATPolygon(simplified);
            if (satPolygon) {
                satPolygons.push(satPolygon);
            }
        }
        
        const processingTime = performance.now() - startTime;
        lastProcessTime = processingTime;
        
        const polygonData = {
            rejaId: gridObj.id,
            timestamp: Date.now(),
            processingTime: processingTime,
            originalContours: contours.length,
            finalPolygons: satPolygons.length,
            satPolygons: satPolygons,
            canvasSize: {
                width: ctx.canvas.width,
                height: ctx.canvas.height
            }
        };
        
        // Cache del resultado
        polygonDataCache.set(gridObj.id, polygonData);
        
        console.log(`✅ GridObj ${gridObj.id} procesado: ${satPolygons.length} polígonos en ${processingTime.toFixed(1)}ms`);
        
        return polygonData;
    }
    
    // === ACTUALIZACIÓN EN RESIZE ===
    /**
     * Actualiza todos los polígonos cuando cambia el tamaño del canvas
     */
    updateOnResize() {
        console.log("🔄 Actualizando polígonos por resize del canvas");
        
        // Limpiar cache
        polygonDataCache.clear();
        
        // TODO: Reprocesar todas las rejas GridObj activas
        // Se implementará cuando tengamos acceso a getGridObj
    }
    
    // === FUNCIONES DE DEBUG ===
    /**
     * Función de debug para mostrar estado del sistema
     */
    debugStatus() {
        console.log("🧪 [DEBUG] Estado del sistema de detección por polígonos:");
        console.log(`   Inicializado: ${this.initialized}`);
        console.log(`   Procesamiento habilitado: ${this.processingEnabled}`);
        console.log(`   Polígonos en cache: ${polygonDataCache.size}`);
        console.log(`   Último tiempo de procesamiento: ${lastProcessTime.toFixed(1)}ms`);
        console.log(`   Configuración:`, POLYGON_DETECTION_CONFIG);
        
        return {
            initialized: this.initialized,
            processingEnabled: this.processingEnabled,
            cacheSize: polygonDataCache.size,
            lastProcessTime: lastProcessTime,
            config: POLYGON_DETECTION_CONFIG
        };
    }
    
    /**
     * Función de debug para obtener datos de polígonos de una reja
     */
    debugGetPolygonData(rejaId) {
        const data = polygonDataCache.get(rejaId);
        if (data) {
            console.log(`🧪 [DEBUG] Datos de polígonos para ${rejaId}:`, data);
        } else {
            console.log(`🧪 [DEBUG] No hay datos de polígonos para ${rejaId}`);
        }
        return data;
    }
}

// === INSTANCIA GLOBAL ===
const polygonDetectionSystem = new PolygonDetectionSystem();

// === INTEGRACIÓN CON SISTEMA DE DISPAROS NIVEL 3 ===

/**
 * Detecta impacto de pelota usando polígonos para nivel 3
 * @param {Object} ballPosition - Posición de la pelota {x, y}
 * @param {number} ballRadius - Radio de la pelota
 * @returns {string} 'descubierta' | 'cubierta'
 */
export function detectarImpactoPorPoligonos(ballPosition, ballRadius = 8) {
    if (!ballPosition) {
        console.warn("⚠️ Posición de pelota no válida para detección por polígonos");
        return 'cubierta';
    }
    
    try {
        // Obtener rejas del nivel 3
        const reja1 = getGridObj('reja1');
        const reja2 = getGridObj('reja2');
        
        if (!reja1 && !reja2) {
            console.warn("⚠️ No se encontraron rejas para detección por polígonos");
            return 'cubierta';
        }
        
        // Datos de la pelota para SAT
        const ballData = {
            x: ballPosition.x,
            y: ballPosition.y,
            radius: ballRadius
        };
        
        // Verificar colisión contra reja1
        if (reja1) {
            // Procesar polígonos de reja1 si no están en cache
            let polygonData1 = polygonDataCache.get('reja1');
            if (!polygonData1) {
                polygonData1 = polygonDetectionSystem.processGridObjPolygons(reja1);
            }
            
            // Verificar colisión contra polígonos de reja1
            if (polygonData1 && detectPolygonCollision('reja1', ballData)) {
                console.log("🎯 [POLÍGONOS] Pelota CUBIERTA - colisión con reja1");
                return 'cubierta';
            }
        }
        
        // Verificar colisión contra reja2
        if (reja2) {
            // Procesar polígonos de reja2 si no están en cache
            let polygonData2 = polygonDataCache.get('reja2');
            if (!polygonData2) {
                polygonData2 = polygonDetectionSystem.processGridObjPolygons(reja2);
            }
            
            // Verificar colisión contra polígonos de reja2
            if (polygonData2 && detectPolygonCollision('reja2', ballData)) {
                console.log("🎯 [POLÍGONOS] Pelota CUBIERTA - colisión con reja2");
                return 'cubierta';
            }
        }
        
        // Si no hay colisión con ninguna reja, la pelota está descubierta
        console.log("🎯 [POLÍGONOS] Pelota DESCUBIERTA - sin colisiones");
        return 'descubierta';
        
    } catch (error) {
        console.error("❌ Error en detección por polígonos:", error);
        return 'cubierta'; // Fallback seguro
    }
}

/**
 * Preprocesa polígonos de todas las rejas del nivel 3
 * Debe llamarse al inicio del nivel y en cada resize
 */
export function preprocesarPoligonosNivel3() {
    console.log("🔄 Preprocesando polígonos para nivel 3...");
    
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    if (reja1) {
        const result1 = polygonDetectionSystem.processGridObjPolygons(reja1);
        console.log(`✅ Reja1 procesada: ${result1 ? result1.finalPolygons : 0} polígonos`);
    }
    
    if (reja2) {
        const result2 = polygonDetectionSystem.processGridObjPolygons(reja2);
        console.log(`✅ Reja2 procesada: ${result2 ? result2.finalPolygons : 0} polígonos`);
    }
}

// === FUNCIONES DE EXPORTACIÓN ===

/**
 * Procesa polígonos para una reja GridObj específica
 * @param {GridObj} gridObj - Objeto GridObj a procesar
 * @returns {Object|null} Datos de polígonos procesados
 */
export function processGridPolygons(gridObj) {
    return polygonDetectionSystem.processGridObjPolygons(gridObj);
}

/**
 * Detecta colisión entre polígonos de una reja y la pelota
 * @param {string} rejaId - ID de la reja
 * @param {Object} ballData - Datos de la pelota {x, y, radius}
 * @returns {boolean} true si hay colisión
 */
export function detectPolygonCollision(rejaId, ballData) {
    const polygonData = polygonDataCache.get(rejaId);
    if (!polygonData || !polygonData.satPolygons) {
        return false;
    }
    
    // Probar colisión contra todos los polígonos de la reja
    for (const satPolygon of polygonData.satPolygons) {
        if (polygonDetectionSystem.testPolygonBallCollision(satPolygon, ballData)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Actualiza polígonos cuando cambia el tamaño del canvas
 */
export function updatePolygonsOnResize() {
    polygonDetectionSystem.updateOnResize();
}

/**
 * Funciones de debug globales
 */
export function debugPolygonDetection() {
    return polygonDetectionSystem.debugStatus();
}

export function debugGetPolygonData(rejaId) {
    return polygonDetectionSystem.debugGetPolygonData(rejaId);
}

// === FUNCIONES GLOBALES PARA DEBUG ===
window.debugPolygonDetection = debugPolygonDetection;
window.debugGetPolygonData = debugGetPolygonData;

// === FUNCIONES ADICIONALES DE DEBUG Y TESTING ===

/**
 * Función de testing completa del sistema de polígonos
 */
window.testPolygonSystem = function() {
    console.log("🧪 [TEST] Iniciando test completo del sistema de polígonos...");
    
    const testResults = {
        level3Active: false,
        reja1Found: false,
        reja2Found: false,
        reja1Polygons: 0,
        reja2Polygons: 0,
        testCollisions: []
    };
    
    // Verificar nivel 3
    const currentLevel = window.gameInstance ? window.gameInstance.currentLevel : 0;
    testResults.level3Active = (currentLevel === 3);
    
    if (!testResults.level3Active) {
        console.log("⚠️ [TEST] El test requiere estar en nivel 3");
        return testResults;
    }
    
    // Verificar rejas
    try {
        const reja1 = getGridObj('reja1');
        const reja2 = getGridObj('reja2');
        
        testResults.reja1Found = !!reja1;
        testResults.reja2Found = !!reja2;
        
        if (reja1) {
            const data1 = debugGetPolygonData('reja1');
            testResults.reja1Polygons = data1 ? data1.finalPolygons : 0;
        }
        
        if (reja2) {
            const data2 = debugGetPolygonData('reja2');
            testResults.reja2Polygons = data2 ? data2.finalPolygons : 0;
        }
        
        // Test de colisiones en puntos específicos
        const testPoints = [
            { x: 200, y: 200, radius: 8, expected: "cubierta" },
            { x: 450, y: 300, radius: 8, expected: "descubierta" },
            { x: 700, y: 400, radius: 8, expected: "cubierta" }
        ];
        
        for (const point of testPoints) {
            const result = detectarImpactoPorPoligonos(point, point.radius);
            testResults.testCollisions.push({
                point: point,
                result: result,
                expected: point.expected,
                match: result === point.expected
            });
        }
        
    } catch (error) {
        console.error("❌ [TEST] Error durante testing:", error);
    }
    
    console.log("🧪 [TEST] Resultados del test:", testResults);
    return testResults;
};

/**
 * Función para visualizar polígonos detectados (debug visual)
 */
window.visualizePolygons = function() {
    console.log("🎨 [DEBUG] Visualizando polígonos detectados...");
    
    const canvas = document.getElementById('canvas-principal');
    if (!canvas) {
        console.error("❌ Canvas principal no encontrado");
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Dibujar polígonos de reja1
    const data1 = polygonDataCache.get('reja1');
    if (data1 && data1.satPolygons) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        
        for (const polygon of data1.satPolygons) {
            if (polygon.points && polygon.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
                
                for (let i = 1; i < polygon.points.length; i++) {
                    ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
                }
                
                ctx.closePath();
                ctx.stroke();
            }
        }
        
        console.log(`🎨 Reja1: ${data1.satPolygons.length} polígonos dibujados en rojo`);
    }
    
    // Dibujar polígonos de reja2
    const data2 = polygonDataCache.get('reja2');
    if (data2 && data2.satPolygons) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        
        for (const polygon of data2.satPolygons) {
            if (polygon.points && polygon.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
                
                for (let i = 1; i < polygon.points.length; i++) {
                    ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
                }
                
                ctx.closePath();
                ctx.stroke();
            }
        }
        
        console.log(`🎨 Reja2: ${data2.satPolygons.length} polígonos dibujados en verde`);
    }
    
    console.log("🎨 [DEBUG] Visualización completada");
};

console.log("📦 Sistema de detección por polígonos cargado - Nivel 3"); 