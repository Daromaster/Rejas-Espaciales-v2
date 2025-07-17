// Grid.js - Sistema de rejas espaciales V2 - P2b

import { GAME_CONFIG, LEVELS_CONFIG, Utils, CanvasDimensions } from './config.js';
import { relojJuego } from './relojJuego.js';
import { getPelotaState, getPelotaPosition } from './pelota.js';

import { simplify } from './lib/simplify.js';
import { isoContours } from './lib/marching-squares.js';
import { Vector, Polygon, Circle, testPolygonCircle } from './lib/sat.js';

// === VARIABLES PRINCIPALES ===
let configGrid = null; // Configuración única para todos los niveles
let gridCanvases = []; // Array de canvas virtuales para composición
let transformMatrix = null; // Matriz de transformación para cálculos (compatibilidad niveles 1-2)
let transformMatrices = {}; // Matrices específicas por reja para nivel 3+
let distanciaMaxima = 200; // Variable global para viaje de pelota

// === BANDERAS DE INICIALIZACIÓN POR NIVEL ===
// Sistema unificado de banderas para todos los niveles
let initFlagsGrid = {
    level1: false,
    level2: false,
    level3: false,
    level4: false,
    // Agregar más niveles según sea necesario
};

// === ESTADO DE INTERPOLACIÓN ===
let gridState = {
    // Estado anterior (para interpolación)
    previous: {
        offsetX: 0,
        offsetY: 0,
        rotationAngle: 0,
        timestamp: 0
    },
    // Estado actual (30 FPS lógica)
    current: {
        offsetX: 0,
        offsetY: 0,
        rotationAngle: 0,
        timestamp: 0
    }
};

// === ESTADO DE INTERPOLACIÓN PARA OBJETOS NIVEL 3 ===
let objectsLevel3State = {
    // Estado anterior (para interpolación)
    previous: {
        cuadradoGiratorio: {
            x: 0,
            y: 0,
            rotacion: 0
        }
    },
    // Estado actual (30 FPS lógica)
    current: {
        cuadradoGiratorio: {
            x: 0,
            y: 0,
            rotacion: 0
        }
    }
};

// === ESTADO DE OBJETOS INTEGRADOS (NIVEL 3+) ===
// Los objetos por nivel se definen en sus respectivas banderas de inicialización

// === FUNCIONES AUXILIARES MATEMÁTICAS ESTÁNDAR (NO POR NIVEL) ===
const MathUtils = {
    // Función sinusoidal estándar
    sineWave: (time, frequency, amplitude, phase = 0) => {
        return Math.sin(time * frequency + phase) * amplitude;
    },
    
    // Función coseno estándar
    cosineWave: (time, frequency, amplitude, phase = 0) => {
        return Math.cos(time * frequency + phase) * amplitude;
    },
    
    // Movimiento elíptico (para futuros niveles)
    ellipticalMotion: (time, frequencyX, frequencyY, amplitudeX, amplitudeY, phaseX = 0, phaseY = 0) => {
        return {
            x: Math.sin(time * frequencyX + phaseX) * amplitudeX,
            y: Math.cos(time * frequencyY + phaseY) * amplitudeY
        };
    }
};

// === GESTIÓN DE CANVAS VIRTUALES ===
function ensureGridCanvas(index) {
    if (!gridCanvases[index]) {
        const canvas = document.createElement('canvas');
        gridCanvases[index] = canvas.getContext('2d');
        console.log(`📊 Canvas virtual ${index} creado`);
    }
    
    gridCanvases[index].canvas.width = GAME_CONFIG.LOGICAL_WIDTH;
    gridCanvases[index].canvas.height = GAME_CONFIG.LOGICAL_HEIGHT;
    
    return gridCanvases[index];
}

function resetGridCanvases() {
    // Limpiar contextos existentes
    gridCanvases.forEach((context, index) => {
        if (context && context.canvas) {
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        }
    });
    
    // Resetear array manteniendo estructura
    gridCanvases.length = 0;
    
    // Resetear configuración
    configGrid = null;
    transformMatrix = null;
    
    console.log("🔄 Canvas virtuales y configuración reseteados");
}

// === CONFIGURACIÓN POR NIVEL ===
function calcularConfiguracionGrid(width, height, level) {
    switch (level) {
        case 1: {
            // NIVEL 1: Configuración responsive básica
            const dimensionMenor = Math.min(width, height);
            const altoZonaReja = dimensionMenor * 0.6;
            //const tamCuadrado = altoZonaReja / 4;
            const tamCuadrado = width / 7.5;
            
            // Asignar distancia máxima global
            distanciaMaxima = tamCuadrado * 3;
            
            // Celdas siempre CUADRADAS
            const anchoEsMenor = width < height;
            let cantidadHoriz, cantidadVert;
            
            if (1==0) {
                if (anchoEsMenor) {
                    cantidadHoriz = 3; // 4 barrotes
                    cantidadVert = 5;  // 6 barrotes
                } else {
                    cantidadHoriz = 5; // 6 barrotes
                    cantidadVert = 3;  // 4 barrotes
                }
            }

            cantidadHoriz = 5; // 6 barrotes
            cantidadVert = 3;  // 4 barrotes
            
            // Dimensiones basadas en tamCuadrado CUADRADO
            const anchoRejaReal = (cantidadHoriz + 1) * tamCuadrado;
            const altoRejaReal = (cantidadVert + 1) * tamCuadrado;
            
            const baseX = (width - anchoRejaReal) / 2;
            const baseY = (height - altoRejaReal) / 2;
            //const grosorLinea = Math.max(8, Math.floor(width * 0.03));
            const grosorLinea = tamCuadrado / 6;
            
            // Calcular coordenadas base (SIN transformaciones)
            const coordenadasCubiertasBase = [];
            const coordenadasDescubiertasBase = [];
            
            // Intersecciones (cubiertas)
            for (let i = 0.5; i <= cantidadVert + 0.5; i++) {
                for (let j = 0.5; j <= cantidadHoriz + 0.5; j++) {
                    coordenadasCubiertasBase.push({
                        x: baseX + j * tamCuadrado,
                        y: baseY + i * tamCuadrado,
                        tipo: "interseccion",
                        indiceInterseccion: { i_linea: i, j_linea: j }
                    });
                }
            }
            
            // Centros de celdas (descubiertas)
            for (let i = 0; i < cantidadVert; i++) {
                for (let j = 0; j < cantidadHoriz; j++) {
                    coordenadasDescubiertasBase.push({
                        x: baseX + (j + 1.0) * tamCuadrado,
                        y: baseY + (i + 1.0) * tamCuadrado,
                        tipo: "celda",
                        indiceCelda: { fila: i, columna: j }
                    });
                }
            }
            
            return {
                baseX,
                baseY,
                tamCuadrado,
                cantidadHoriz,
                cantidadVert,
                grosorLinea,
                numCeldasX: cantidadHoriz,
                numCeldasY: cantidadVert,
                cellSize: tamCuadrado,
                gridWidth: anchoRejaReal,
                gridHeight: altoRejaReal,
                coordenadasCubiertasBase,
                coordenadasDescubiertasBase,
                currentLevel: level
            };
        }
        
        case 2: {
            // NIVEL 2: Misma configuración base (la rotación va en composición)
            return calcularConfiguracionGrid(width, height, 1);
        }

        case 3: {
            // NIVEL 2: Misma configuración base (la rotación va en composición)
            return calcularConfiguracionGrid(width, height, 1);
        }
        
        default:
            console.warn(`⚠️ Nivel ${level} no implementado, usando nivel 1`);
            return calcularConfiguracionGrid(width, height, 1);
    }
}

// === DIBUJO DE REJA BASE (SOLO UNA VEZ AL INICIO) ===
export function dibujarRejaBase(level) {
     // Esta función se ejecuta SOLO al inicio y en resize

    const width = GAME_CONFIG.LOGICAL_WIDTH;
    const height = GAME_CONFIG.LOGICAL_HEIGHT;
    
   
    switch (level) {
        case 1: {
            // Configuración del nivel 1
            configGrid = calcularConfiguracionGrid(width, height, level);
            
            // CANVAS BASE (1): Reja sin transformaciones
            ensureGridCanvas(1);
            gridCanvases[1].clearRect(0, 0, width, height);
            gridCanvases[1].lineWidth = configGrid.grosorLinea;
            
            // Colores cyan
            const gradientColors = {
                dark: "rgb(0, 19, 24)",
                bright: "rgba(0, 255, 255, 1)"
            };
            
            // Dibujar líneas horizontales
            for (let i = 0.5; i <= configGrid.cantidadVert + 0.5; i++) {
                const y = configGrid.baseY + i * configGrid.tamCuadrado;
                const grad = gridCanvases[1].createLinearGradient(0, y - configGrid.grosorLinea/2, 0, y + configGrid.grosorLinea/2);
                grad.addColorStop(0, gradientColors.dark);
                grad.addColorStop(0.5, gradientColors.bright);
                grad.addColorStop(1, gradientColors.dark);
                gridCanvases[1].strokeStyle = grad;
                gridCanvases[1].beginPath();
                gridCanvases[1].moveTo(configGrid.baseX, y);
                gridCanvases[1].lineTo(configGrid.baseX + (configGrid.cantidadHoriz + 1) * configGrid.tamCuadrado, y);
                gridCanvases[1].stroke();
            }
            
            if (1==0) {

                    // Dibujar líneas verticales - anulado reemplazado
                    for (let j = 0.5; j <= configGrid.cantidadHoriz + 0.5; j++) {
                        const x = configGrid.baseX + j * configGrid.tamCuadrado;
                        const grad = gridCanvases[1].createLinearGradient(x - configGrid.grosorLinea/2, 0, x + configGrid.grosorLinea/2, 0);
                        grad.addColorStop(0, gradientColors.dark);
                        grad.addColorStop(0.5, gradientColors.bright);
                        grad.addColorStop(1, gradientColors.dark);
                        gridCanvases[1].strokeStyle = grad;
                        gridCanvases[1].beginPath();
                        gridCanvases[1].moveTo(x, configGrid.baseY);
                        gridCanvases[1].lineTo(x, configGrid.baseY + (configGrid.cantidadVert + 1) * configGrid.tamCuadrado);
                        gridCanvases[1].stroke();
                    }
            
            } else {

                    // Dibujar líneas verticales entrelazadas
                    let y1 = 1
                    let par = false
                    for (let j = 0.5; j <= configGrid.cantidadHoriz + 0.5; j++) {
                        const x = configGrid.baseX + j * configGrid.tamCuadrado;
                        if (par == false) {
                            y1 = configGrid.baseY +  (configGrid.tamCuadrado*1.5)-(configGrid.grosorLinea/2)
                        } else {
                            y1 = configGrid.baseY +  (configGrid.tamCuadrado*0.5)-(configGrid.grosorLinea/2)
                        }
                        const grad = gridCanvases[1].createLinearGradient(x - configGrid.grosorLinea/2, 0, x + configGrid.grosorLinea/2, 0);
                        grad.addColorStop(0, gradientColors.dark);
                        grad.addColorStop(0.5, gradientColors.bright);
                        grad.addColorStop(1, gradientColors.dark);
                        gridCanvases[1].strokeStyle = grad;
                        gridCanvases[1].beginPath();
                        gridCanvases[1].moveTo(x, configGrid.baseY);
                        gridCanvases[1].lineTo(x, y1 );
                        y1= y1 + configGrid.grosorLinea;
                        gridCanvases[1].moveTo(x, y1);
                        gridCanvases[1].lineTo(x, y1+(configGrid.tamCuadrado*2) - configGrid.grosorLinea);
                        if (par == false) {
                            y1 = y1+(configGrid.tamCuadrado*2) - configGrid.grosorLinea + configGrid.grosorLinea;
                        } else {
                            y1 = y1+(configGrid.tamCuadrado*2) - configGrid.grosorLinea+(configGrid.grosorLinea);
                        }
                        gridCanvases[1].moveTo(x, y1);
                        gridCanvases[1].lineTo(x, configGrid.baseY + (configGrid.cantidadVert + 1) * configGrid.tamCuadrado);
                        gridCanvases[1].stroke();
                        if (par == false) {
                            par = true
                        } else {
                            par = false
                        }
                    }
            }

            console.log("✨ Reja base nivel 1 dibujada CORRECTAMENTE en gridCanvases[1]");
            break;
        }
        
        case 2: {
            // Configuración del nivel 1
            configGrid = calcularConfiguracionGrid(width, height, level);
            
            // CANVAS BASE (1): Reja sin transformaciones
            ensureGridCanvas(1);
            gridCanvases[1].clearRect(0, 0, width, height);
            gridCanvases[1].lineWidth = configGrid.grosorLinea;
            
             // Colores para nivel 2 (verde para diferenciarlo)
             const gradientColors = {
                dark: "rgb(0, 31, 20)",
                bright: "rgb(19, 231, 16)"
            };
            
            // Dibujar líneas horizontales
            for (let i = 0.5; i <= configGrid.cantidadVert + 0.5; i++) {
                const y = configGrid.baseY + i * configGrid.tamCuadrado;
                const grad = gridCanvases[1].createLinearGradient(0, y - configGrid.grosorLinea/2, 0, y + configGrid.grosorLinea/2);
                grad.addColorStop(0, gradientColors.dark);
                grad.addColorStop(0.5, gradientColors.bright);
                grad.addColorStop(1, gradientColors.dark);
                gridCanvases[1].strokeStyle = grad;
                gridCanvases[1].beginPath();
                gridCanvases[1].moveTo(configGrid.baseX, y);
                gridCanvases[1].lineTo(configGrid.baseX + (configGrid.cantidadHoriz + 1) * configGrid.tamCuadrado, y);
                gridCanvases[1].stroke();
            }
            
            // Dibujar líneas verticales entrelazadas
           let y1 = 1
           let par = false
            for (let j = 0.5; j <= configGrid.cantidadHoriz + 0.5; j++) {
                const x = configGrid.baseX + j * configGrid.tamCuadrado;
                if (par == false) {
                    y1 = configGrid.baseY +  (configGrid.tamCuadrado*1.5)-(configGrid.grosorLinea/2)
                } else {
                    y1 = configGrid.baseY +  (configGrid.tamCuadrado*0.5)-(configGrid.grosorLinea/2)
                }
                const grad = gridCanvases[1].createLinearGradient(x - configGrid.grosorLinea/2, 0, x + configGrid.grosorLinea/2, 0);
                grad.addColorStop(0, gradientColors.dark);
                grad.addColorStop(0.5, gradientColors.bright);
                grad.addColorStop(1, gradientColors.dark);
                gridCanvases[1].strokeStyle = grad;
                gridCanvases[1].beginPath();
                gridCanvases[1].moveTo(x, configGrid.baseY);
                gridCanvases[1].lineTo(x, y1);
                y1= y1 + configGrid.grosorLinea;
                gridCanvases[1].moveTo(x, y1);
                gridCanvases[1].lineTo(x, y1+(configGrid.tamCuadrado*2) - configGrid.grosorLinea);
                if (par == false) {
                    y1 = y1+(configGrid.tamCuadrado*2) - configGrid.grosorLinea + configGrid.grosorLinea;
                } else {
                    y1 = y1+(configGrid.tamCuadrado*2) - configGrid.grosorLinea+(configGrid.grosorLinea);
                }
                gridCanvases[1].moveTo(x, y1);
                gridCanvases[1].lineTo(x, configGrid.baseY + (configGrid.cantidadVert + 1) * configGrid.tamCuadrado);
                gridCanvases[1].stroke();
                if (par == false) {
                    par = true
                } else {
                    par = false
                }
            }
            
            console.log("✨ Reja base nivel 1 dibujada CORRECTAMENTE en gridCanvases[1]");
            break;
        }
        
        case 3: {
            // === NIVEL 3 CON GRIDOBJ ===
            // Solo mantener configuración para compatibilidad con sistemas legacy
            configGrid = calcularConfiguracionGrid(width, height, level);
            
            // CANVAS BASE (1): Solo limpiar para compatibilidad
            ensureGridCanvas(1);
            gridCanvases[1].clearRect(0, 0, width, height);
            
            // ⚠️ IMPORTANTE: Las instancias GridObj se crean en initGrid(), no aquí
            // dibujarRejaBase no debe crear objetos GridObj, solo manejar sistemas legacy
            
            console.log("✨ Nivel 3 - dibujarRejaBase (legacy) completado. GridObj se maneja en initGrid()");
            break;
        }

        default:
            console.warn(`⚠️ Nivel ${level} no implementado`);
            break;
    }

    
}








// === COMPOSICIÓN CON TRANSFORMACIONES (CADA FRAME) ===
function composeGrid(level, alpha = 1.0) {
    // ⚠️ INTERPOLACIÓN MEJORADA CON MANEJO DE ÁNGULOS
    // Función auxiliar para interpolación circular de ángulos
    const lerpAngle = (from, to, t) => {
        const TWO_PI = Math.PI * 2;
        
        // Normalizar ángulos al rango [0, 2π]
        from = ((from % TWO_PI) + TWO_PI) % TWO_PI;
        to = ((to % TWO_PI) + TWO_PI) % TWO_PI;
        
        // Calcular la diferencia más corta
        let diff = to - from;
        if (diff > Math.PI) {
            diff -= TWO_PI;
        } else if (diff < -Math.PI) {
            diff += TWO_PI;
        }
        
        // Interpolación suave
        return from + diff * t;
    };
    
    const interpolatedState = {
        offsetX: Utils.lerp(gridState.previous.offsetX, gridState.current.offsetX, alpha),
        offsetY: Utils.lerp(gridState.previous.offsetY, gridState.current.offsetY, alpha),
        rotationAngle: lerpAngle(gridState.previous.rotationAngle, gridState.current.rotationAngle, alpha)
    };
    
    // ⚠️ INTERPOLACIÓN PARA OBJETOS NIVEL 3
    const interpolatedObjectsLevel3 = {
        cuadradoGiratorio: {
            x: Utils.lerp(objectsLevel3State.previous.cuadradoGiratorio.x, objectsLevel3State.current.cuadradoGiratorio.x, alpha),
            y: Utils.lerp(objectsLevel3State.previous.cuadradoGiratorio.y, objectsLevel3State.current.cuadradoGiratorio.y, alpha),
            rotacion: lerpAngle(objectsLevel3State.previous.cuadradoGiratorio.rotacion, objectsLevel3State.current.cuadradoGiratorio.rotacion, alpha)
        }
    };
    


        switch (level) {

            
                case 1: 
                    {
                    // CANVAS COMPUESTO (2): Canvas base + transformaciones
                    ensureGridCanvas(2);
                    gridCanvases[2].clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
                    
                    // APLICAR TRANSFORMACIONES CORRECTAMENTE
                    gridCanvases[2].save();
                    gridCanvases[2].translate(interpolatedState.offsetX, interpolatedState.offsetY);
                    
                    // CAPTURAR MATRIZ DE TRANSFORMACIÓN EN EL LUGAR CORRECTO
                    transformMatrix = gridCanvases[2].getTransform();
                    
                    // Componer imagen final
                    gridCanvases[2].drawImage(gridCanvases[1].canvas, 0, 0);
                    
                    gridCanvases[2].restore();
                    
                    return 2; // Retornar índice del canvas final para este nivel
                    }
            

           

            case 2: {
                // NIVEL 2: Con rotación futura
                ensureGridCanvas(2);
                gridCanvases[2].clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
                
                gridCanvases[2].save();
                
                // Centro para rotación
                const centerX = GAME_CONFIG.LOGICAL_WIDTH / 2;
                const centerY = GAME_CONFIG.LOGICAL_HEIGHT / 2;
                
                gridCanvases[2].translate(centerX, centerY);
                gridCanvases[2].rotate(interpolatedState.rotationAngle);
                gridCanvases[2].translate(-centerX, -centerY);
                gridCanvases[2].translate(interpolatedState.offsetX, interpolatedState.offsetY);
                
                // CAPTURAR MATRIZ DE TRANSFORMACIÓN 
                transformMatrix = gridCanvases[2].getTransform();
                
                gridCanvases[2].drawImage(gridCanvases[1].canvas, 0, 0);
                
                gridCanvases[2].restore();
                
                return 2;
            }
            

            case 3: {
                // === NIVEL 3 CON GRIDOBJ - RENDERIZADO DE DOS REJAS INDEPENDIENTES ===
                
                // CANVAS FINAL (2): Limpiar canvas de composición final
                ensureGridCanvas(2);
                gridCanvases[2].clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
                
                // === RENDERIZAR REJA1 (2x3 CELDAS, SOLO FLOTACIÓN) ===
                const reja1 = getGridObj('reja1');
                if (reja1 && reja1.activo) {
                    reja1.render(gridCanvases[2], alpha);
                }
                
                // === RENDERIZAR REJA2 (3x4 CELDAS, FLOTACIÓN + ROTACIÓN) ===
                const reja2 = getGridObj('reja2');
                if (reja2 && reja2.activo) {
                    reja2.render(gridCanvases[2], alpha);
                }
                
                // === CAPTURAR MATRICES DE TRANSFORMACIÓN ESPECÍFICAS POR REJA ===
                // Sistema mejorado: mantener matrices específicas para cada reja
                transformMatrices = {
                    reja1: (reja1 && reja1.transformMatrix) ? reja1.transformMatrix : new DOMMatrix(),
                    reja2: (reja2 && reja2.transformMatrix) ? reja2.transformMatrix : new DOMMatrix()
                };
                
                // Mantener compatibilidad: transformMatrix apunta a reja2 por defecto para niveles anteriores
                if (reja2 && reja2.transformMatrix) {
                    transformMatrix = reja2.transformMatrix;
                } else if (reja1 && reja1.transformMatrix) {
                    transformMatrix = reja1.transformMatrix;
                } else {
                    transformMatrix = new DOMMatrix();
                }
                
                // Debug ocasional para verificar renderizado
                //if (Math.random() < 0.005) { // 0.5% de probabilidad
                   // console.log(`🎯 [DEBUG] Nivel 3 GridObj renderizado:`);
                    //console.log(`   Reja1 activa: ${reja1 ? reja1.activo : 'NO EXISTE'}`);
                    //console.log(`   Reja2 activa: ${reja2 ? reja2.activo : 'NO EXISTE'}`);
                   // console.log(`   Alpha: ${alpha.toFixed(3)}`);
                //}
                
                return 2; // Retornar índice del canvas final para este nivel
            }

            default:
                return 1; // Fallback al canvas base
        }
}

// === ✅ P2b: ACTUALIZACIÓN LÓGICA CON MOTORES POR NIVEL (30 FPS) ===
export function updateGridLogic(deltaTime, level) {
    const currentTime = performance.now();
    
    // Guardar estado anterior
    gridState.previous = { ...gridState.current };
    
    // ✅ MOTORES DE MOVIMIENTO CON PERSONALIDAD PROPIA POR NIVEL
    switch (level) {
        case 1: {
            // === MOTOR DE MOVIMIENTO NIVEL 1: FLOTACIÓN SINUSOIDAL ===
            // Parámetros específicos del nivel 1
            const amplitudeY = 22;      // Amplitud vertical personalizada
            const amplitudeX = 18;      // Amplitud horizontal personalizada
            const frequencyY = 0.001;   // Frecuencia vertical
            const frequencyX = 0.0007;  // Frecuencia horizontal
            const speed = 1.2;          // Velocidad general
            const phaseY = Math.PI / 3; // Fase inicial Y (personalizada)
            const phaseX = Math.PI / 6; // Fase inicial X (personalizada)
            
            // Motor de flotación Y
            gridState.current.offsetY = MathUtils.sineWave(
                currentTime * speed, 
                frequencyY, 
                amplitudeY, 
                phaseY
            );
            
            // Motor de flotación X  
            gridState.current.offsetX = MathUtils.sineWave(
                currentTime * speed, 
                frequencyX, 
                amplitudeX, 
                phaseX
            );
            
            // Sin rotación en nivel 1
            gridState.current.rotationAngle = 0;
            
            break;
        }
        
        case 2: {
            // === MOTOR DE MOVIMIENTO NIVEL 2: FLOTACIÓN + ROTACIÓN COMPLEJA ===
            
            // ============================================================================
            // 🎯 VARIABLES DE CONFIGURACIÓN NIVEL 2 (TODAS VISIBLES Y AJUSTABLES)
            // ============================================================================
            
            // --- PARÁMETROS DE FLOTACIÓN ---
            const amplitudeY = 22;      // Amplitud vertical personalizada
            const amplitudeX = 18;      // Amplitud horizontal personalizada
            const frequencyY = 0.001;   // Frecuencia vertical
            const frequencyX = 0.0007;  // Frecuencia horizontal
            const speed = 1.2;          // Velocidad general
            const phaseY = Math.PI / 3; // Fase inicial Y (personalizada)
            const phaseX = Math.PI / 6; // Fase inicial X (personalizada)
            
            // --- PARÁMETROS DE ROTACIÓN ---
            const DEG_TO_RAD = Math.PI / 180;
            const TARGET_ANGLE_INITIAL = -30 * DEG_TO_RAD;   // -30 grados inicial
            const PENDULUM_ANGLE = 30 * DEG_TO_RAD;          // ±30 grados péndulo
            const INITIAL_ROTATION_SPEED = 20 * DEG_TO_RAD;  // Velocidad inicial (20°/seg)
            const PENDULUM_SPEED = 20 * DEG_TO_RAD;          // Velocidad del péndulo (45°/seg)
            const ACCELERATION_START_TIME = 35000;           // 35 segundos (quedan 25)
            const HORARIO_ACCEL_RATE = 5 * DEG_TO_RAD;      // Aceleración horaria (60°/seg²)
            const MAX_ROTATION_SPEED = 80 * DEG_TO_RAD;     // Velocidad máxima (180°/seg)
            
            // ============================================================================
            // 🏗️ INICIALIZACIÓN DE VARIABLES PERSISTENTES (SOLO UNA VEZ)
            // ============================================================================
            
            // Variables estáticas que persisten entre frames (SOLO se inicializan UNA vez)
            if (!initFlagsGrid.level2) {
                // Variables de estado de rotación
                window.gridLevel2State = {
                    // Estado de rotación
                    currentAngle: 0,                    // Ángulo actual en radianes
                    rotationSpeed: 0,                   // Velocidad actual de rotación (rad/seg)
                    
                    // Fases: 0=inicial a -30°, 1=péndulo ±30°, 2=aceleración horaria
                    phase: 0,                           
                    
                    // Control de tiempo
                    levelStartTime: currentTime,        // Momento de inicio del nivel
                    gameStartTime: null,                // Momento del primer disparo (se establece cuando empiece el cronómetro)
                    
                    // Control de péndulo
                    pendulumDirection: 1,               // 1=hacia positivo, -1=hacia negativo
                    pendulumLastTime: currentTime,      // Para control de tiempo del péndulo
                    
                    // Control de dirección para péndulo
                    targetAngle: TARGET_ANGLE_INITIAL,  // Ángulo objetivo actual
                    isReachingTarget: true,             // ¿Está yendo hacia el objetivo?
                    
                    // Debug/info
                    debugInfo: {
                        elapsedSinceLevel: 0,
                        elapsedSinceGame: 0,
                        currentPhase: "inicial",
                        timeToAcceleration: ACCELERATION_START_TIME
                    }
                };
                
                initFlagsGrid.level2 = true; // Marcar como inicializado
                console.log("🎯 Nivel 2: Variables de rotación inicializadas");
            }
            
            // ============================================================================
            // ⏰ CÁLCULO DE TIEMPOS Y CONTROL DE FASES
            // ============================================================================
            
            const state = window.gridLevel2State;
            
            // Actualizar tiempo transcurrido desde inicio del nivel
            state.debugInfo.elapsedSinceLevel = currentTime - state.levelStartTime;
            
            // Detectar si el cronómetro del juego ha empezado (primer disparo)
            if (relojJuego.getEstado() === 'jugando' && state.gameStartTime === null) {
                state.gameStartTime = currentTime;
                console.log("🎯 Nivel 2: Cronómetro iniciado, comenzando seguimiento");
            }
            
            // Calcular tiempo transcurrido desde el primer disparo
            if (state.gameStartTime !== null) {
                state.debugInfo.elapsedSinceGame = currentTime - state.gameStartTime;
                state.debugInfo.timeToAcceleration = ACCELERATION_START_TIME - state.debugInfo.elapsedSinceGame;
            }
            
            // ============================================================================
            // 🔄 MOTORES DE ROTACIÓN POR FASE
            // ============================================================================
            
            // ⚠️ VALIDACIÓN Y CALIBRACIÓN TEMPORAL
            // Asegurar que deltaTime esté en milisegundos y sea razonable
            let validDeltaTime = deltaTime;
            if (validDeltaTime > 100) { // Limitar a 100ms máximo para evitar saltos
                validDeltaTime = 100;
                console.warn("🚨 DeltaTime muy alto, limitado a 100ms");
            }
            if (validDeltaTime < 0) { // No permitir tiempo negativo
                validDeltaTime = 16.67; // Fallback a ~60 FPS
            }
            
            const dt = validDeltaTime / 1000; // Delta time en segundos (calibrado)
            
            // ⚠️ DEBUG TEMPORAL: Verificar calibración cada 3 segundos
            if (Math.floor(currentTime / 3000) !== Math.floor((currentTime - validDeltaTime) / 3000)) {
                const expectedDt = 1000 / GAME_CONFIG.LOGIC_FPS; // ~33.33ms para 30 FPS
                const actualDt = validDeltaTime;
                const deviation = Math.abs(actualDt - expectedDt);
                
                if (deviation > 10) { // Si se desvía más de 10ms
                    console.warn(`⏱️ Desviación temporal: esperado ${expectedDt.toFixed(1)}ms, actual ${actualDt.toFixed(1)}ms`);
                }
            }
            
            switch (state.phase) {
                // --- FASE 0: ROTACIÓN INICIAL HACIA -30° ---
                case 0: {
                    state.debugInfo.currentPhase = "inicial → -30°";
                    
                    // Rotar suavemente hacia -30 grados
                    const angleDiff = state.targetAngle - state.currentAngle;
                    
                    if (Math.abs(angleDiff) > 0.01) { // Tolerancia de 0.01 radianes
                        // Continuar rotando hacia el objetivo
                        const rotationDirection = Math.sign(angleDiff);
                        state.currentAngle += rotationDirection * INITIAL_ROTATION_SPEED * dt;
                        
                        // Evitar sobrepasar el objetivo
                        if (Math.abs(state.currentAngle - state.targetAngle) < Math.abs(angleDiff)) {
                            // Ok, seguir
                        } else {
                            state.currentAngle = state.targetAngle; // Ajustar exacto
                        }
                    } else {
                        // Llegó a -30°, cambiar a fase péndulo
                        state.phase = 1;
                        state.targetAngle = PENDULUM_ANGLE; // Próximo objetivo: +30°
                        state.pendulumDirection = 1; // Empezar hacia positivo
                        console.log("🎯 Nivel 2: Fase péndulo iniciada");
                    }
                    break;
                }
                
                // --- FASE 1: PÉNDULO ENTRE +30° Y -30° ---
                case 1: {
                    state.debugInfo.currentPhase = "péndulo ±30°";
                    
                    // Verificar si debe cambiar a fase de aceleración
                    if (state.debugInfo.elapsedSinceGame >= ACCELERATION_START_TIME) {
                        state.phase = 2;
                        state.rotationSpeed = PENDULUM_SPEED; // Velocidad base para acelerar
                        console.log("🎯 Nivel 2: Fase aceleración iniciada");
                        break;
                    }
                    
                    // Motor de péndulo
                    const angleDiff = state.targetAngle - state.currentAngle;
                    
                    if (Math.abs(angleDiff) > 0.05) { // Tolerancia para cambio de dirección
                        // Moverse hacia el objetivo actual
                        const rotationDirection = Math.sign(angleDiff);
                        state.currentAngle += rotationDirection * PENDULUM_SPEED * dt;
                    } else {
                        // Llegó al extremo, cambiar dirección
                        if (state.targetAngle === PENDULUM_ANGLE) {
                            // Estaba yendo a +30°, ahora ir a -30°
                            state.targetAngle = -PENDULUM_ANGLE;
                            state.pendulumDirection = -1;
                        } else {
                            // Estaba yendo a -30°, ahora ir a +30°
                            state.targetAngle = PENDULUM_ANGLE;
                            state.pendulumDirection = 1;
                        }
                    }
                    break;
                }
                
                // --- FASE 2: ACELERACIÓN HORARIA CONTINUA ---
                case 2: {
                    state.debugInfo.currentPhase = "aceleración horaria";
                    
                    // Acelerar velocidad (solo en sentido horario = positivo)
                    state.rotationSpeed += HORARIO_ACCEL_RATE * dt;
                    
                    // Limitar velocidad máxima
                    if (state.rotationSpeed > MAX_ROTATION_SPEED) {
                        state.rotationSpeed = MAX_ROTATION_SPEED;
                        state.debugInfo.currentPhase = "velocidad máxima";
                    }
                    
                    // Aplicar rotación horaria continua
                    state.currentAngle += state.rotationSpeed * dt;
                    
                    // ⚠️ NORMALIZACIÓN SUAVE PARA EVITAR SALTOS
                    // En lugar de while que puede causar saltos, usar módulo matemático
                    const TWO_PI = Math.PI * 2;
                    if (state.currentAngle > TWO_PI) {
                        state.currentAngle = state.currentAngle % TWO_PI;
                    }
                    if (state.currentAngle < 0) {
                        state.currentAngle = (state.currentAngle % TWO_PI) + TWO_PI;
                    }
                    
                    break;
                }
            }
            
            // ============================================================================
            // 📊 APLICAR RESULTADOS A GRIDSTATE
            // ============================================================================
            
            // Motor de flotación Y (diferente al nivel 1)
            gridState.current.offsetY = MathUtils.cosineWave(
                currentTime * speed, 
                frequencyY, 
                amplitudeY, 
                phaseY
            );
            
            // Motor de flotación X (diferente al nivel 1)
            gridState.current.offsetX = MathUtils.sineWave(
                currentTime * speed, 
                frequencyX, 
                amplitudeX, 
                phaseX
            );
            
            // Aplicar ángulo de rotación calculado
            gridState.current.rotationAngle = state.currentAngle;
            
            // ============================================================================
            // 🐛 DEBUG INFO (mostrar cada 60 frames ≈ 1 segundo)
            // ============================================================================
            
            if (Math.floor(currentTime / 1000) % 2 === 0 && (currentTime % 1000) < 50) {
                const angleInDegrees = (state.currentAngle * 180 / Math.PI).toFixed(1);
                const speedInDegrees = (state.rotationSpeed * 180 / Math.PI).toFixed(1);
                
                console.log(`🎯 Nivel 2 Rotación: ${angleInDegrees}° | Fase: ${state.debugInfo.currentPhase} | Vel: ${speedInDegrees}°/s | Tiempo juego: ${(state.debugInfo.elapsedSinceGame/1000).toFixed(1)}s`);
            }
            
            break;
        }
        
        case 3: {
            // === MOTOR DE MOVIMIENTO NIVEL 3 CON GRIDOBJ ===
            
            // ============================================================================
            // 🎯 INICIALIZACIÓN NIVEL 3 CON GRIDOBJ Y MOTORES COMPLEJOS (SOLO UNA VEZ)
            // ============================================================================
            
            if (!initFlagsGrid.level3) {
                const DEG_TO_RAD = Math.PI / 180;
                
                // Crear estado completo para las dos rejas GridObj
                window.gridLevel3StateNew = {
                    initialized: true,
                    levelStartTime: currentTime,     // Momento de inicio del nivel
                    gameStartTime: null,             // Momento del primer disparo (cuando arranca cronómetro)
                    
                    // === REJA1: SOLO FLOTACIÓN ===
                    reja1: {
                        id: 'reja1',
                        // Parámetros de flotación únicos para Reja1
                        amplitudeY: 15,
                        amplitudeX: 12,
                        frequencyY: 0.0008,
                        frequencyX: 0.0006,
                        speed: 0.8,
                        phaseY: 0,
                        phaseX: Math.PI / 4
                    },
                    
                    // === REJA2: FLOTACIÓN + ROTACIÓN COMPLEJA ===
                    reja2: {
                        id: 'reja2',
                        // Parámetros de flotación únicos para Reja2
                        amplitudeY: 20,
                        amplitudeX: 18,
                        frequencyY: 0.0010,
                        frequencyX: 0.0007,
                        speed: 1.2,
                        phaseY: Math.PI / 3,
                        phaseX: Math.PI / 6,
                        
                        // === MOTOR DE ROTACIÓN COMPLEJO - NUEVAS FASES ===
                        // Configuración de ritmos y velocidades
                        DIRECTION_CHANGE_INTERVAL: 5000,      // 5 segundos para cambio de dirección (fase intermitente)
                        INTERMITTENT_START_TIME: 30000,       // 30 segundos para iniciar rotación intermitente
                        ACCELERATION_START_TIME: 50000,       // 50 segundos para iniciar aceleración final
                        BASE_ROTATION_SPEED: 20 * DEG_TO_RAD,  // Velocidad base para fase intermitente (20°/seg)
                        FAST_ROTATION_SPEED: 30 * DEG_TO_RAD,  // Velocidad rápida inicial para aceleración (30°/seg)
                        ACCELERATION_RATE: 10 * DEG_TO_RAD,    // Aceleración (10°/seg²)
                        MAX_ROTATION_SPEED: 120 * DEG_TO_RAD,  // Velocidad máxima (120°/seg)
                        
                        // Estado actual de rotación
                        currentRotation: 0,                    // Ángulo actual en radianes
                        rotationSpeed: 20 * DEG_TO_RAD,       // Velocidad actual (rad/seg)
                        rotationDirection: 1,                  // 1=horario, -1=antihorario
                        
                        // Control de fases
                        phase: 'preGame',                      // 'preGame', 'gameRunning', 'intermittent', 'acceleration'
                        lastDirectionChangeTime: currentTime, // Última vez que cambió dirección
                        
                        // Debug
                        debugInfo: {
                            elapsedSinceLevel: 0,
                            elapsedSinceGame: 0,
                            timeToIntermittent: 30000,
                            timeToAcceleration: 50000,
                            currentPhase: "pre-juego: solo flotación",
                            directionChanges: 0
                        }
                    }
                };
                
                initFlagsGrid.level3 = true;
                console.log("🎯 Nivel 3 GridObj: Estado de motores complejos inicializado");
                console.log("   📋 Reja1: Solo flotación");
                console.log("   📋 Reja2: Flotación + rotación compleja con fases temporales");
            }
            
            // ============================================================================
            // 🚀 MOTORES EXTERNOS PARA CONTROL DE REJAS GRIDOBJ
            // ============================================================================
            
            const state = window.gridLevel3StateNew;
            
            // ⏰ CÁLCULO DE TIEMPOS Y CONTROL DE FASES
            state.reja2.debugInfo.elapsedSinceLevel = currentTime - state.levelStartTime;
            
            // Detectar si el cronómetro del juego ha empezado (primer disparo)
            if (relojJuego.getEstado() === 'jugando' && state.gameStartTime === null) {
                state.gameStartTime = currentTime;
                state.reja2.phase = 'gameRunning';
                console.log("🎯 Nivel 3: Cronómetro iniciado, Reja2 entra en fase 'gameRunning'");
            }
            
            // Calcular tiempo transcurrido desde el primer disparo
            if (state.gameStartTime !== null) {
                state.reja2.debugInfo.elapsedSinceGame = currentTime - state.gameStartTime;
                state.reja2.debugInfo.timeToIntermittent = state.reja2.INTERMITTENT_START_TIME - state.reja2.debugInfo.elapsedSinceGame;
                state.reja2.debugInfo.timeToAcceleration = state.reja2.ACCELERATION_START_TIME - state.reja2.debugInfo.elapsedSinceGame;
            }
            
            // === MOTOR EXTERNO PARA REJA1 (SOLO FLOTACIÓN) ===
            const reja1 = getGridObj('reja1');
            if (reja1) {
                const r1 = state.reja1;
                
                // Calcular flotación para Reja1
                const offsetY1 = MathUtils.sineWave(
                    currentTime * r1.speed,
                    r1.frequencyY,
                    r1.amplitudeY,
                    r1.phaseY
                );
                
                const offsetX1 = MathUtils.cosineWave(
                    currentTime * r1.speed,
                    r1.frequencyX,
                    r1.amplitudeX,
                    r1.phaseX
                );
                
                // Controlar Reja1 externamente (solo flotación, sin rotación)
                reja1.setMovimiento(offsetX1, offsetY1, 0);
                reja1.updateLogic(deltaTime);
            }
            
            // === MOTOR EXTERNO PARA REJA2 (FLOTACIÓN + ROTACIÓN COMPLEJA) ===
            const reja2 = getGridObj('reja2');
            if (reja2) {
                const r2 = state.reja2;
                
                // Calcular flotación para Reja2 (diferente a Reja1)
                const offsetY2 = MathUtils.sineWave(
                    currentTime * r2.speed,
                    r2.frequencyY,
                    r2.amplitudeY,
                    r2.phaseY
                );
                
                const offsetX2 = MathUtils.sineWave(
                    currentTime * r2.speed,
                    r2.frequencyX,
                    r2.amplitudeX,
                    r2.phaseX
                );
                
                // === MOTOR DE ROTACIÓN COMPLEJO POR FASES ===
                const dt = deltaTime / 1000; // Delta time en segundos
                
                switch (r2.phase) {
                    case 'preGame': {
                        // === FASE PRE-JUEGO: SOLO FLOTACIÓN (SIN ROTACIÓN) ===
                        r2.debugInfo.currentPhase = "pre-juego: solo flotación";
                        
                        // No rotación en preGame - mantener rotación actual sin cambios
                        // r2.currentRotation se mantiene sin incrementar
                        break;
                    }
                    
                    case 'gameRunning': {
                        // === FASE JUEGO CORRIENDO (0-30s): SOLO FLOTACIÓN ===
                        
                        // Verificar si debe pasar a fase intermitente (30 segundos después del primer disparo)
                        if (r2.debugInfo.elapsedSinceGame >= r2.INTERMITTENT_START_TIME) {
                            r2.phase = 'intermittent';
                            r2.lastDirectionChangeTime = currentTime; // Reiniciar contador para cambios
                            r2.rotationDirection = 1; // Empezar en sentido horario
                            console.log("🔄 Reja2: Iniciando fase intermitente - rotación cada 5 segundos");
                            break;
                        }
                        
                        r2.debugInfo.currentPhase = `juego activo: solo flotación | rotación intermitente en ${(r2.debugInfo.timeToIntermittent/1000).toFixed(1)}s`;
                        
                        // No rotación en gameRunning (0-30s) - mantener rotación actual sin cambios
                        // r2.currentRotation se mantiene sin incrementar
                        break;
                    }
                    
                    case 'intermittent': {
                        // === FASE INTERMITENTE (30-50s): ROTACIÓN CADA 5 SEGUNDOS CAMBIA SENTIDO ===
                        
                        // Verificar si debe pasar a fase aceleración (50 segundos después del primer disparo)
                        if (r2.debugInfo.elapsedSinceGame >= r2.ACCELERATION_START_TIME) {
                            r2.phase = 'acceleration';
                            r2.rotationDirection = 1; // Forzar sentido horario
                            r2.rotationSpeed = r2.FAST_ROTATION_SPEED; // Velocidad inicial rápida
                            console.log("🚀 Reja2: Iniciando fase aceleración - solo horario a alta velocidad");
                            break;
                        }
                        
                        r2.debugInfo.currentPhase = `rotación intermitente cada 5s | aceleración en ${(r2.debugInfo.timeToAcceleration/1000).toFixed(1)}s`;
                        
                        // Verificar si debe cambiar dirección (cada 5 segundos)
                        if (currentTime - r2.lastDirectionChangeTime >= r2.DIRECTION_CHANGE_INTERVAL) {
                            r2.rotationDirection *= -1; // Cambiar dirección
                            r2.lastDirectionChangeTime = currentTime;
                            r2.debugInfo.directionChanges++;
                            
                            const direction = r2.rotationDirection > 0 ? 'horario' : 'antihorario';
                            console.log(`🔄 Reja2: Cambio de dirección #${r2.debugInfo.directionChanges} → ${direction} (fase intermitente)`);
                        }
                        
                        // Aplicar rotación con dirección variable
                        r2.currentRotation += r2.rotationDirection * r2.BASE_ROTATION_SPEED * dt;
                        break;
                    }
                    
                    case 'acceleration': {
                        // === FASE ACELERACIÓN (50s+): SOLO HORARIO, VELOCIDAD CRECIENTE ===
                        r2.debugInfo.currentPhase = "aceleración horaria continua";
                        
                        // Acelerar velocidad (solo horario)
                        r2.rotationSpeed += r2.ACCELERATION_RATE * dt;
                        
                        // Limitar velocidad máxima
                        if (r2.rotationSpeed > r2.MAX_ROTATION_SPEED) {
                            r2.rotationSpeed = r2.MAX_ROTATION_SPEED;
                            r2.debugInfo.currentPhase = "velocidad máxima horaria";
                        }
                        
                        // Aplicar rotación horaria acelerada
                        r2.currentRotation += r2.rotationSpeed * dt;
                        break;
                    }
                }
                
                // Normalizar ángulo
                const TWO_PI = Math.PI * 2;
                if (r2.currentRotation >= TWO_PI) {
                    r2.currentRotation = r2.currentRotation % TWO_PI;
                }
                if (r2.currentRotation < 0) {
                    r2.currentRotation = (r2.currentRotation % TWO_PI) + TWO_PI;
                }
                
                // Controlar Reja2 externamente (flotación + rotación compleja)
                reja2.setMovimiento(offsetX2, offsetY2, r2.currentRotation);
                reja2.updateLogic(deltaTime);
            }
            
            // === LIMPIAR GRIDSTATE GLOBAL (NO SE USA EN NIVEL 3 CON GRIDOBJ) ===
            gridState.current.offsetX = 0;
            gridState.current.offsetY = 0;
            gridState.current.rotationAngle = 0;
            
            // ============================================================================
            // 🐛 DEBUG INFO NIVEL 3 (mostrar cada 2 segundos)
            // ============================================================================
            
            if (Math.floor(currentTime / 2000) !== Math.floor((currentTime - deltaTime) / 2000)) {
                const r2 = state.reja2;
                const angleInDegrees = (r2.currentRotation * 180 / Math.PI).toFixed(1);
                const speedInDegrees = (r2.rotationSpeed * 180 / Math.PI).toFixed(1);
                const direction = r2.rotationDirection > 0 ? '↻' : '↺';
                
                console.log(`🎯 Nivel 3 Reja2: ${angleInDegrees}° ${direction} | ${r2.debugInfo.currentPhase} | Vel: ${speedInDegrees}°/s | Cambios: ${r2.debugInfo.directionChanges}`);
                
                if (r2.debugInfo.elapsedSinceGame > 0) {
                    console.log(`   ⏱️ Tiempo juego: ${(r2.debugInfo.elapsedSinceGame/1000).toFixed(1)}s | Aceleración en: ${(r2.debugInfo.timeToAcceleration/1000).toFixed(1)}s`);
                }
            }
            
            break;
        }
        
        default: {
            // Fallback: sin movimiento
            gridState.current.offsetX = 0;
            gridState.current.offsetY = 0;
            gridState.current.rotationAngle = 0;
            break;
        }
    }
    
    gridState.current.timestamp = currentTime;
}

// === RENDERIZADO (60 FPS CON INTERPOLACIÓN) ===
export function renderGrid(ctx, level) {
    // Calcular factor de interpolación
    const now = performance.now();
    const timeSinceLastLogic = now - gridState.current.timestamp;
    const alpha = Math.min(timeSinceLastLogic / (1000 / GAME_CONFIG.LOGIC_FPS), 1.0);
    
    // Componer grid con interpolación
    const canvasIndex = composeGrid(level, alpha);
    
    // RENDERIZAR AL CANVAS PRINCIPAL
    if (gridCanvases[canvasIndex]) {
        ctx.drawImage(gridCanvases[canvasIndex].canvas, 0, 0);
    }
}

// === COORDENADAS TRANSFORMADAS ===
function applyTransformMatrix(x, y, rejaId = null) {
    // Si se especifica una reja, intentar usar su matriz específica
    const matrix = rejaId ? getTransformMatrix(rejaId) : transformMatrix;
    
    if (!matrix) {
        return { x, y };
    }
    
    const transformedX = matrix.a * x + matrix.c * y + matrix.e;
    const transformedY = matrix.b * x + matrix.d * y + matrix.f;
    
    return {
        x: transformedX,
        y: transformedY
    };
}

export function getCoordenadasCubiertas(level) {
    if (!configGrid || configGrid.currentLevel !== level) {
        configGrid = calcularConfiguracionGrid(GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT, level);
        configGrid.currentLevel = level;
    }

    // APLICAR TRANSFORMACIONES A COORDENADAS BASE
    return configGrid.coordenadasCubiertasBase.map(coord => {
        const transformed = applyTransformMatrix(coord.x, coord.y);
        return {
            ...coord,
            x: transformed.x,        // Coordenadas transformadas
            y: transformed.y,
            baseX: coord.x,          // Coordenadas base originales
            baseY: coord.y
        };
    });
}

export function getCoordenadasDescubiertas(level) {
    if (!configGrid || configGrid.currentLevel !== level) {
        configGrid = calcularConfiguracionGrid(GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT, level);
        configGrid.currentLevel = level;
    }

    // APLICAR TRANSFORMACIONES A COORDENADAS BASE
    return configGrid.coordenadasDescubiertasBase.map(coord => {
        const transformed = applyTransformMatrix(coord.x, coord.y);
        return {
            ...coord,
            x: transformed.x,        // Coordenadas transformadas
            y: transformed.y,
            baseX: coord.x,          // Coordenadas base originales
            baseY: coord.y
        };
    });
}

// === INICIALIZACIÓN ===
export function initGrid(level = 1) {
    console.log(`🎮 Inicializando grid para nivel ${level} - P2b`);
    
    resetGridCanvases();
    
    // === RESETEAR BANDERAS DE INICIALIZACIÓN PARA NUEVO NIVEL ===
    resetInitFlagsForLevel(level);
    
    // Inicializar estados
    gridState.previous = { offsetX: 0, offsetY: 0, rotationAngle: 0, timestamp: 0 };
    gridState.current = { offsetX: 0, offsetY: 0, rotationAngle: 0, timestamp: performance.now() };
    
    // Inicializar estados de objetos para nivel 3
    objectsLevel3State.previous = {
        cuadradoGiratorio: { x: 0, y: 0, rotacion: 0 }
    };
    objectsLevel3State.current = {
        cuadradoGiratorio: { x: 0, y: 0, rotacion: 0 }
    };
    
    // DIBUJAR REJA BASE (SOLO UNA VEZ)
    
    // === INICIALIZACIÓN ESPECÍFICA POR NIVEL ===
    switch (level) {
        case 1:
        case 2:
            // Preparar canvas de composición para niveles legacy
            ensureGridCanvas(1); // Canvas base
            ensureGridCanvas(2); // Canvas composición
            break;
            
        case 3:
            // === INICIALIZACIÓN NIVEL 3 CON GRIDOBJ ===
            console.log("🎯 Inicializando nivel 3 con sistema GridObj");
            
            // Limpiar objetos GridObj anteriores
            clearAllGridObjs();
            
            // Obtener dimensiones del canvas
            const width = GAME_CONFIG.LOGICAL_WIDTH;
            const height = GAME_CONFIG.LOGICAL_HEIGHT;
            
            // === CREAR E INICIALIZAR REJA1 (2x3 CELDAS, SOLO FLOTACIÓN) ===
            const reja1 = createGridObj('reja1');
            reja1.setConfiguracionManual(3, 3); // 2 celdas horizontales, 3 verticales - SE DIBUJA CENTRADA AUTOMÁTICAMENTE
            // 🎨 ASIGNAR COLORES VERDES A REJA1
            reja1.colorDark = "rgb(0, 31, 20)";      // Verde oscuro
            reja1.colorClaro = "rgb(45, 200, 214)";   // Verde brillante
            reja1.config.tamCuadrado = CanvasDimensions.uml * 130;
            reja1.config.grosorLinea = CanvasDimensions.uml * 24;
            reja1.init(width, height, level);
            console.log("✅ Reja1 (2x3) creada e inicializada - CENTRADA automáticamente - 🎨 COLORES VERDES");
            
            // === CREAR E INICIALIZAR REJA2 (3x4 CELDAS, FLOTACIÓN + ROTACIÓN) ===
            const reja2 = createGridObj('reja2');
            reja2.setConfiguracionManual(2, 2); // 3 celdas horizontales, 4 verticales - SE DIBUJA CENTRADA AUTOMÁTICAMENTE
            // 🎨 ASIGNAR COLORES DORADOS A REJA2
            reja2.colorDark = "rgb(29, 23, 13)";     // Dorado oscuro
            reja2.colorClaro = "rgb(0, 255, 30)";   // Dorado brillante
            reja2.config.tamCuadrado = CanvasDimensions.uml * 195;
            reja2.config.grosorLinea = CanvasDimensions.uml * 24;
            reja2.init(width, height, level);
            console.log("✅ Reja2 (3x4) creada e inicializada - CENTRADA automáticamente - 🎨 COLORES DORADOS");
            console.log(`   Canvas lógico: ${width}x${height}`);
            
            // Preparar canvas de composición mínimo (para compatibilidad)
            ensureGridCanvas(1); // Canvas base (no usado)
            ensureGridCanvas(2); // Canvas composición final
            
            console.log("🎯 Nivel 3 con GridObj inicializado correctamente");
            console.log("🔷 Polígonos calculados automáticamente en cada reja GridObj");
            
            break;
            
        default:
            ensureGridCanvas(1); // Fallback
            ensureGridCanvas(2);
            break;
    }

    // DIBUJAR REJA BASE (SOLO PARA NIVELES LEGACY 1 Y 2)
    if (level <= 2) {
        dibujarRejaBase(level);
    } else {
        // Para nivel 3+, los objetos GridObj manejan su propio dibujo en init()
        console.log("✨ Nivel 3+: GridObj maneja su propio dibujarRejaBase");
    }

}

// === EXPORTACIONES ADICIONALES ===
export function getTransformMatrix(rejaId = null) {
    // Nivel 3+: Si se especifica una reja, usar su matriz específica
    if (rejaId && transformMatrices && transformMatrices[rejaId]) {
        return transformMatrices[rejaId];
    }
    
    // Niveles 1-2 o fallback: usar matriz tradicional
    return transformMatrix;
}

// === NUEVA FUNCIÓN: OBTENER TODAS LAS MATRICES POR REJA ===
export function getTransformMatrices() {
    return transformMatrices || {};
}

export function getGridConfig() {
    return configGrid;
}

// === EXPORTAR VARIABLE GLOBAL ===
export { distanciaMaxima };

// === FUNCIONES DE DEBUG PARA NIVEL 2 ===
// Función para simular disparo y activar cronómetro (testing)
window.debugSimulateGameStart = function() {
    if (!relojJuego.iniciado) {
        relojJuego.iniciar();
        console.log("🧪 [DEBUG] Cronómetro simulado - Juego iniciado");
    } else {
        console.log("🧪 [DEBUG] Cronómetro ya está iniciado");
    }
    return relojJuego.getEstado();
};

// Función para mostrar estado actual del sistema de rotación nivel 2
window.debugRotationStatus = function() {
    if (!window.gridLevel2State) {
        console.log("🧪 [DEBUG] Sistema de rotación nivel 2 no inicializado");
        return null;
    }
    
    const state = window.gridLevel2State;
    const angleInDegrees = (state.currentAngle * 180 / Math.PI).toFixed(1);
    const speedInDegrees = (state.rotationSpeed * 180 / Math.PI).toFixed(1);
    const elapsedGame = state.debugInfo.elapsedSinceGame / 1000;
    const elapsedLevel = state.debugInfo.elapsedSinceLevel / 1000;
    
    console.log("🧪 [DEBUG] Estado de rotación nivel 2:");
    console.log(`   Ángulo actual: ${angleInDegrees}°`);
    console.log(`   Velocidad: ${speedInDegrees}°/s`);
    console.log(`   Fase: ${state.debugInfo.currentPhase} (${state.phase})`);
    console.log(`   Tiempo desde nivel: ${elapsedLevel.toFixed(1)}s`);
    console.log(`   Tiempo desde juego: ${elapsedGame.toFixed(1)}s`);
    console.log(`   Cronómetro: ${relojJuego.getEstado()}`);
    
    return {
        angle: angleInDegrees,
        speed: speedInDegrees,
        phase: state.debugInfo.currentPhase,
        elapsedGame: elapsedGame,
        elapsedLevel: elapsedLevel,
        timerState: relojJuego.getEstado()
    };
};

// Función para forzar cambio de fase (testing)
window.debugForcePhase = function(phaseNumber) {
    if (!window.gridLevel2State) {
        console.log("🧪 [DEBUG] Sistema de rotación nivel 2 no inicializado");
        return;
    }
    
    const state = window.gridLevel2State;
    const oldPhase = state.phase;
    
    switch (phaseNumber) {
        case 0:
            state.phase = 0;
            state.targetAngle = -30 * Math.PI / 180;
            state.debugInfo.currentPhase = "inicial → -30° (FORZADO)";
            break;
        case 1:
            state.phase = 1;
            state.targetAngle = 30 * Math.PI / 180;
            state.debugInfo.currentPhase = "péndulo ±30° (FORZADO)";
            break;
        case 2:
            state.phase = 2;
            state.rotationSpeed = 45 * Math.PI / 180; // 45°/s base
            state.debugInfo.currentPhase = "aceleración horaria (FORZADO)";
            break;
        default:
            console.log("🧪 [DEBUG] Fase inválida. Use: 0=inicial, 1=péndulo, 2=aceleración");
            return;
    }
    
    console.log(`🧪 [DEBUG] Fase cambiada de ${oldPhase} a ${phaseNumber}`);
    return window.debugRotationStatus();
};

// Función para verificar sistema de interpolación y rendimiento
window.debugInterpolationSystem = function() {
    const currentTime = performance.now();
    
    console.log("🧪 [DEBUG] Sistema de Interpolación:");
    console.log(`   Estado anterior: ${JSON.stringify(gridState.previous)}`);
    console.log(`   Estado actual: ${JSON.stringify(gridState.current)}`);
    console.log(`   Timestamp diferencia: ${(currentTime - gridState.current.timestamp).toFixed(1)}ms`);
    console.log(`   Logic FPS objetivo: ${GAME_CONFIG.LOGIC_FPS}`);
    console.log(`   Intervalo lógico esperado: ${(1000 / GAME_CONFIG.LOGIC_FPS).toFixed(1)}ms`);
    
    // Calcular factor de interpolación actual
    const timeSinceLastLogic = currentTime - gridState.current.timestamp;
    const alpha = Math.min(timeSinceLastLogic / (1000 / GAME_CONFIG.LOGIC_FPS), 1.0);
    
    console.log(`   Factor interpolación (alpha): ${alpha.toFixed(3)}`);
    console.log(`   ¿Interpolación activa?: ${alpha < 1.0 ? '✅ SÍ' : '❌ NO (necesita update)'}`);
    
    return {
        previous: gridState.previous,
        current: gridState.current,
        timeSinceLastLogic: timeSinceLastLogic,
        alpha: alpha,
        isInterpolating: alpha < 1.0
    };
};

// Función para testing de sincronización temporal
window.debugTemporalSync = function(durationSeconds = 10) {
    console.log(`🧪 [DEBUG] Iniciando test de sincronización temporal por ${durationSeconds} segundos...`);
    
    const startTime = performance.now();
    const startLevel2State = window.gridLevel2State ? { ...window.gridLevel2State } : null;
    
    setTimeout(() => {
        const endTime = performance.now();
        const actualElapsed = endTime - startTime;
        const expectedElapsed = durationSeconds * 1000;
        const deviation = Math.abs(actualElapsed - expectedElapsed);
        
        console.log(`🧪 [DEBUG] Resultados de sincronización temporal:`);
        console.log(`   Tiempo esperado: ${expectedElapsed}ms`);
        console.log(`   Tiempo real: ${actualElapsed.toFixed(1)}ms`);
        console.log(`   Desviación: ${deviation.toFixed(1)}ms (${(deviation/expectedElapsed*100).toFixed(2)}%)`);
        
        if (window.gridLevel2State && startLevel2State) {
            const rotationChange = window.gridLevel2State.currentAngle - startLevel2State.currentAngle;
            const expectedRotation = window.gridLevel2State.rotationSpeed * (actualElapsed / 1000);
            
            console.log(`   Rotación observada: ${(rotationChange * 180 / Math.PI).toFixed(1)}°`);
            console.log(`   Rotación esperada: ${(expectedRotation * 180 / Math.PI).toFixed(1)}°`);
        }
        
        return {
            expectedElapsed,
            actualElapsed,
            deviation,
            deviationPercent: deviation/expectedElapsed*100
        };
    }, durationSeconds * 1000);
};

// Mensaje de ayuda para debug
// === FUNCIONES DE DEBUG PARA NIVEL 3 CON GRIDOBJ ===
// Función para mostrar estado de las rejas GridObj del nivel 3
window.debugGridObjNivel3 = function() {
    console.log("🧪 [DEBUG] Estado de rejas GridObj nivel 3:");
    
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    const state = window.gridLevel3StateNew;
    
    if (!state) {
        console.log("❌ Sistema GridObj nivel 3 no inicializado");
        return null;
    }
    
    console.log("=== REJA1 (2x3, SOLO FLOTACIÓN) ===");
    if (reja1) {
        console.log(`   ID: ${reja1.id}, Tipo: ${reja1.tipoVariante}`);
        console.log(`   Configuración: ${reja1.config.cantHor}x${reja1.config.cantVert} celdas`);
        console.log(`   Posición: (${reja1.posX.toFixed(1)}, ${reja1.posY.toFixed(1)}) | Rotación: ${(reja1.rot * 180 / Math.PI).toFixed(1)}°`);
        console.log(`   Base: (${reja1.config.baseX.toFixed(1)}, ${reja1.config.baseY.toFixed(1)})`);
        console.log(`   Activo: ${reja1.activo ? '✅ SÍ' : '❌ NO'} | Inicializado: ${reja1.inicializado ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   Motor - Amplitud: X=${state.reja1.amplitudeX}, Y=${state.reja1.amplitudeY}`);
        console.log(`   Motor - Frecuencia: X=${state.reja1.frequencyX}, Y=${state.reja1.frequencyY}`);
        console.log(`   Motor - Velocidad: ${state.reja1.speed}, Fase: X=${(state.reja1.phaseX * 180 / Math.PI).toFixed(1)}°, Y=${(state.reja1.phaseY * 180 / Math.PI).toFixed(1)}°`);
    } else {
        console.log("❌ Reja1 no existe");
    }
    
    console.log("=== REJA2 (3x4, FLOTACIÓN + ROTACIÓN) ===");
    if (reja2) {
        console.log(`   ID: ${reja2.id}, Tipo: ${reja2.tipoVariante}`);
        console.log(`   Configuración: ${reja2.config.cantHor}x${reja2.config.cantVert} celdas`);
        console.log(`   Posición: (${reja2.posX.toFixed(1)}, ${reja2.posY.toFixed(1)}) | Rotación: ${(reja2.rot * 180 / Math.PI).toFixed(1)}°`);
        console.log(`   Base: (${reja2.config.baseX.toFixed(1)}, ${reja2.config.baseY.toFixed(1)})`);
        console.log(`   Activo: ${reja2.activo ? '✅ SÍ' : '❌ NO'} | Inicializado: ${reja2.inicializado ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   Motor - Amplitud: X=${state.reja2.amplitudeX}, Y=${state.reja2.amplitudeY}`);
        console.log(`   Motor - Frecuencia: X=${state.reja2.frequencyX}, Y=${state.reja2.frequencyY}`);
        console.log(`   Motor - Velocidad: ${state.reja2.speed}, Fase: X=${(state.reja2.phaseX * 180 / Math.PI).toFixed(1)}°, Y=${(state.reja2.phaseY * 180 / Math.PI).toFixed(1)}°`);
        console.log(`   Motor - Rot. Velocidad: ${(state.reja2.rotationSpeed * 180 / Math.PI * 1000).toFixed(1)}°/s | Rot. Actual: ${(state.reja2.currentRotation * 180 / Math.PI).toFixed(1)}°`);
    } else {
        console.log("❌ Reja2 no existe");
    }
    
    return {
        state: state,
        reja1: reja1 ? {
            id: reja1.id,
            configuracion: `${reja1.config.cantHor}x${reja1.config.cantVert}`,
            posicion: { x: reja1.posX, y: reja1.posY },
            rotacion: reja1.rot * 180 / Math.PI,
            activo: reja1.activo,
            inicializado: reja1.inicializado
        } : null,
        reja2: reja2 ? {
            id: reja2.id,
            configuracion: `${reja2.config.cantHor}x${reja2.config.cantVert}`,
            posicion: { x: reja2.posX, y: reja2.posY },
            rotacion: reja2.rot * 180 / Math.PI,
            activo: reja2.activo,
            inicializado: reja2.inicializado
        } : null
    };
};

// Función para modificar parámetros de flotación de Reja1
window.debugSetReja1Flotacion = function(amplitudeX, amplitudeY, frequencyX, frequencyY, speed) {
    if (!window.gridLevel3StateNew) {
        console.log("🧪 [DEBUG] Sistema GridObj nivel 3 no inicializado");
        return;
    }
    
    const state = window.gridLevel3StateNew.reja1;
    console.log(`🧪 [DEBUG] Modificando parámetros de flotación Reja1:`);
    console.log(`   Anterior: Ampl(${state.amplitudeX}, ${state.amplitudeY}), Freq(${state.frequencyX}, ${state.frequencyY}), Speed(${state.speed})`);
    
    if (amplitudeX !== undefined) state.amplitudeX = amplitudeX;
    if (amplitudeY !== undefined) state.amplitudeY = amplitudeY;
    if (frequencyX !== undefined) state.frequencyX = frequencyX;
    if (frequencyY !== undefined) state.frequencyY = frequencyY;
    if (speed !== undefined) state.speed = speed;
    
    console.log(`   Nueva: Ampl(${state.amplitudeX}, ${state.amplitudeY}), Freq(${state.frequencyX}, ${state.frequencyY}), Speed(${state.speed})`);
    
    return window.debugGridObjNivel3();
};

// Función para modificar parámetros de flotación y rotación de Reja2
window.debugSetReja2Movimiento = function(amplitudeX, amplitudeY, frequencyX, frequencyY, speed, rotationSpeed) {
    if (!window.gridLevel3StateNew) {
        console.log("🧪 [DEBUG] Sistema GridObj nivel 3 no inicializado");
        return;
    }
    
    const state = window.gridLevel3StateNew.reja2;
    console.log(`🧪 [DEBUG] Modificando parámetros de movimiento Reja2:`);
    console.log(`   Anterior: Ampl(${state.amplitudeX}, ${state.amplitudeY}), Freq(${state.frequencyX}, ${state.frequencyY}), Speed(${state.speed})`);
    console.log(`   Anterior rotación: ${(state.rotationSpeed * 180 / Math.PI * 1000).toFixed(1)}°/s`);
    
    if (amplitudeX !== undefined) state.amplitudeX = amplitudeX;
    if (amplitudeY !== undefined) state.amplitudeY = amplitudeY;
    if (frequencyX !== undefined) state.frequencyX = frequencyX;
    if (frequencyY !== undefined) state.frequencyY = frequencyY;
    if (speed !== undefined) state.speed = speed;
    if (rotationSpeed !== undefined) state.rotationSpeed = rotationSpeed / 1000 * Math.PI / 180; // Convertir de °/s a rad/ms
    
    console.log(`   Nueva: Ampl(${state.amplitudeX}, ${state.amplitudeY}), Freq(${state.frequencyX}, ${state.frequencyY}), Speed(${state.speed})`);
    console.log(`   Nueva rotación: ${(state.rotationSpeed * 180 / Math.PI * 1000).toFixed(1)}°/s`);
    
    return window.debugGridObjNivel3();
};

// Función para resetear posiciones de ambas rejas
window.debugResetRejasNivel3 = function() {
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    if (reja1) {
        reja1.setPosicion(0, 0);
        reja1.setRotacion(0);
        console.log("🔄 Reja1 reseteada a posición (0,0) y rotación 0°");
    }
    
    if (reja2) {
        reja2.setPosicion(0, 0);
        reja2.setRotacion(0);
        if (window.gridLevel3StateNew) {
            window.gridLevel3StateNew.reja2.currentRotation = 0;
        }
        console.log("🔄 Reja2 reseteada a posición (0,0) y rotación 0°");
    }
    
    return window.debugGridObjNivel3();
};

// Función para mostrar estado completo del nivel 3 con GridObj
window.debugStatusNivel3 = function() {
    console.log("🧪 [DEBUG] Estado completo nivel 3 con GridObj:");
    console.log("=== GRID STATE GLOBAL ===");
    console.log(`   Offset X: ${gridState.current.offsetX.toFixed(1)} (no usado en nivel 3)`);
    console.log(`   Offset Y: ${gridState.current.offsetY.toFixed(1)} (no usado en nivel 3)`);
    console.log(`   Rotación grid: ${(gridState.current.rotationAngle * 180 / Math.PI).toFixed(1)}° (no usado en nivel 3)`);
    
    console.log("=== REGISTRY GRIDOBJ ===");
    window.debugGridObjs();
    
    console.log("=== NIVEL 3 ESPECÍFICO ===");
    const debugResult = window.debugGridObjNivel3();
    
    console.log("=== BANDERAS ===");
    console.log(`   Nivel 3 inicializado: ${initFlagsGrid.level3 ? '✅ SÍ' : '❌ NO'}`);
    
    return {
        gridState: gridState.current,
        gridLevel3StateNew: window.gridLevel3StateNew,
        gridObjsDebug: debugResult,
        inicializado: initFlagsGrid.level3
    };
};

console.log("🧪 [DEBUG] Funciones de testing disponibles:");
console.log("=== NIVEL 2 ===");
console.log("   debugSimulateGameStart() - Simular inicio de cronómetro");
console.log("   debugRotationStatus() - Ver estado actual de rotación");
console.log("   debugForcePhase(0|1|2) - Forzar fase específica");
console.log("   debugInterpolationSystem() - Verificar sistema de interpolación");
console.log("   debugTemporalSync(segundos) - Test de sincronización temporal");
console.log("=== NIVEL 3 CON GRIDOBJ ===");
console.log("   debugGridObjNivel3() - Ver estado de las rejas GridObj del nivel 3");
console.log("   debugSetReja1Flotacion(amplX, amplY, freqX, freqY, speed) - Modificar flotación Reja1");
console.log("   debugSetReja2Movimiento(amplX, amplY, freqX, freqY, speed, rotSpeed) - Modificar movimiento Reja2");
console.log("   debugResetRejasNivel3() - Resetear posiciones de ambas rejas");
console.log("   debugStatusNivel3() - Estado completo del nivel 3 con GridObj");
console.log("=== GRIDOBJ GENERAL ===");
console.log("   debugGridObjs() - Ver estado del registry de GridObj");

console.log('Grid.js V2 P2b IMPLEMENTADO - Motores de movimiento por nivel con personalidad propia');

// === FUNCIONES DE BANDERAS ===
// Función para resetear banderas de un nivel específico
function resetInitFlagsForLevel(level) {
    const levelKey = `level${level}`;
    if (initFlagsGrid.hasOwnProperty(levelKey)) {
        initFlagsGrid[levelKey] = false;
        
        // Limpieza específica por nivel
        switch (level) {
            case 2:
                // Limpiar estado global del nivel 2
                if (window.gridLevel2State) {
                    delete window.gridLevel2State;
                    console.log(`🎯 Estado global del nivel ${level} eliminado`);
                }
                break;
            case 3:
                // Limpiar estado global del nivel 3
                if (window.gridLevel3State) {
                    delete window.gridLevel3State;
                    console.log(`🎯 Estado global del nivel ${level} eliminado`);
                }
                // Limpiar objetos GridObj del nivel 3
                clearAllGridObjs();
                console.log(`🎯 Objetos GridObj del nivel ${level} eliminados`);
                break;
            // Agregar más niveles según necesidad
        }
        
        console.log(`🎯 Banderas del nivel ${level} reseteadas`);
    }
}

// Función para marcar nivel como inicializado
function setLevelInitialized(level) {
    const levelKey = `level${level}`;
    if (initFlagsGrid.hasOwnProperty(levelKey)) {
        initFlagsGrid[levelKey] = true;
        console.log(`🎯 Nivel ${level} marcado como inicializado`);
    }
}

// Función para verificar si un nivel necesita inicialización
function needsInitialization(level) {
    const levelKey = `level${level}`;
    return !initFlagsGrid[levelKey];
}

// =============================================================================================
// === NUEVA CLASE GRIDOBJ - OBJETO REJA INDEPENDIENTE ===
// =============================================================================================

/**
 * Clase GridObj - Representa una reja independiente con sus propios canvas, estado y configuración
 * Basada en las ideas del sistema de rejas del nivel 2 pero completamente independiente
 */
class GridObj {
    constructor(id) {
        this.id = id;
        
        // === CONFIGURACIÓN GEOMÉTRICA (FLEXIBLE) ===
        this.config = {
            // Valores opcionales - si están null se calculan automáticamente
            cantHor: null,      // Cantidad horizontal de celdas
            cantVert: null,     // Cantidad vertical de celdas
            tamCuadrado: null,  // Tamaño de cada celda
            grosorLinea: null,  // Grosor de los barrotes
            baseX: null,        // Posición base X
            baseY: null,        // Posición base Y
            
            // Configuración automática calculada
            numCeldasX: 0,
            numCeldasY: 0,
            cellSize: 0,
            gridWidth: 0,
            gridHeight: 0,
            
            // Coordenadas base (sin transformaciones)
            coordenadasCubiertasBase: [],
            coordenadasDescubiertasBase: [],
            
            // 🔷 SISTEMA DE POLÍGONOS INTEGRADO
            poligonosColision: [],        // Polígonos SAT calculados de esta reja
            contornosOriginales: [],      // Contornos sin simplificar (debug)
            timestampPoligonos: 0,        // Cuándo se calcularon los polígonos
            thresholdContornos: 0.5,      // Threshold para marching-squares
            configPoligonos: {
                alphaThreshold: 10,         // Umbral para píxeles activos
                toleranciaSimplificacion: 2, // Tolerancia simplify-js
                debugMode: false            // Modo debug para esta reja
            }
        };
        
        // 🎨 COLORES SIMPLES Y DIRECTOS (MODIFICABLES)
        this.colorDark = "rgb(0, 19, 24)";        // Color oscuro por defecto
        this.colorClaro = "rgba(0, 255, 255, 1)"; // Color claro por defecto
        
        // === ESTADO DE POSICIÓN Y ROTACIÓN (CONTROLADO EXTERNAMENTE) ===
        this.posX = 0;      // Posición X actual (controlada por motor externo)
        this.posY = 0;      // Posición Y actual (controlada por motor externo)
        this.rot = 0;       // Rotación actual en radianes (controlada por motor externo)
        
        // === ESTADO DE INTERPOLACIÓN (BASADO EN GRIDSTATE) ===
        this.interpolationState = {
            // Estado anterior (para interpolación)
            previous: {
                posX: 0,
                posY: 0,
                rot: 0,
                timestamp: 0
            },
            // Estado actual (30 FPS lógica)
            current: {
                posX: 0,
                posY: 0,
                rot: 0,
                timestamp: 0
            }
        };
        
        // === CANVAS VIRTUALES PROPIOS (BASADO EN GRIDCANVASES) ===
        this.canvases = [];
        this.transformMatrix = null;
        
        // === BANDERAS DE CONTROL ===
        this.inicializado = false;
        this.needsRedrawBase = true;  // Para redibujo de reja base
        this.activo = true;
        
        console.log(`🏗️ GridObj creado: ID=${id}, colores: dark='${this.colorDark}', claro='${this.colorClaro}'`);
    }
    
    // === MÉTODO PARA CAMBIAR COLORES FÁCILMENTE ===
    setColores(colorDark, colorClaro) {
        this.colorDark = colorDark;
        this.colorClaro = colorClaro;
        this.needsRedrawBase = true; // Marcar para redibujo
        console.log(`🎨 GridObj ${this.id}: Colores cambiados - dark='${colorDark}', claro='${colorClaro}'`);
    }
    
    // === CÁLCULO DE CONFIGURACIÓN GEOMÉTRICA ===
    calcularConfiguracion(width, height, level = 1) {
        // Si hay valores manuales configurados, usarlos; si no, calcular automáticamente
        const cantHor = this.config.cantHor || this.calcularCantidadHorizontalPorDefecto(width, height, level);
        const cantVert = this.config.cantVert || this.calcularCantidadVerticalPorDefecto(width, height, level);
        const tamCuadrado = this.config.tamCuadrado || this.calcularTamCuadradoPorDefecto(width, height, level);
        const grosorLinea = this.config.grosorLinea || this.calcularGrosorLineaPorDefecto(tamCuadrado, level);
        
        // Actualizar configuración
        this.config.cantHor = cantHor;
        this.config.cantVert = cantVert;
        this.config.tamCuadrado = tamCuadrado;
        this.config.grosorLinea = grosorLinea;
        this.config.numCeldasX = cantHor;
        this.config.numCeldasY = cantVert;
        this.config.cellSize = tamCuadrado;
        
        // Calcular dimensiones totales
        const anchoRejaReal = (cantHor + 1) * tamCuadrado;
        const altoRejaReal = (cantVert + 1) * tamCuadrado;
        
        this.config.gridWidth = anchoRejaReal;
        this.config.gridHeight = altoRejaReal;
        
        // Calcular posición base (si no está definida manualmente)
        this.config.baseX = this.config.baseX || (width - anchoRejaReal) / 2;
        this.config.baseY = this.config.baseY || (height - altoRejaReal) / 2;
        
        // Calcular coordenadas base
        this.calcularCoordenadasBase();
        
        console.log(`📐 GridObj ${this.id}: Configuración calculada - ${cantHor}x${cantVert}, celda=${tamCuadrado.toFixed(1)}px`);
        
        return this.config;
    }
    
    // === MÉTODOS DE CÁLCULO AUTOMÁTICO POR DEFECTO ===
    calcularCantidadHorizontalPorDefecto(width, height, level) {
        // Los mismos cálculos que el sistema actual pero como métodos independientes
        return 5; // 6 barrotes
    }
    
    calcularCantidadVerticalPorDefecto(width, height, level) {
        return 3; // 4 barrotes
    }
    
    calcularTamCuadradoPorDefecto(width, height, level) {
        return width / 7.5;
    }
    
    calcularGrosorLineaPorDefecto(tamCuadrado, level) {
        return tamCuadrado / 6;
    }
    
    // === CÁLCULO DE COORDENADAS BASE ===
    calcularCoordenadasBase() {
        this.config.coordenadasCubiertasBase = [];
        this.config.coordenadasDescubiertasBase = [];
        
        // ✅ CALCULAR POSICIÓN CENTRADA (IGUAL QUE EN DIBUJO)
        const canvasWidth = GAME_CONFIG.LOGICAL_WIDTH;
        const canvasHeight = GAME_CONFIG.LOGICAL_HEIGHT;
        const rejaWidth = (this.config.cantHor + 1) * this.config.tamCuadrado;
        const rejaHeight = (this.config.cantVert + 1) * this.config.tamCuadrado;
        
        const baseX = (canvasWidth - rejaWidth) / 2;
        const baseY = (canvasHeight - rejaHeight) / 2;
        
        // Intersecciones (cubiertas) - Basado en getCoordenadasCubiertas
        for (let i = 0.5; i <= this.config.cantVert + 0.5; i++) {
            for (let j = 0.5; j <= this.config.cantHor + 0.5; j++) {
                this.config.coordenadasCubiertasBase.push({
                    x: baseX + j * this.config.tamCuadrado,
                    y: baseY + i * this.config.tamCuadrado,
                    tipo: "interseccion",
                    indiceInterseccion: { i_linea: i, j_linea: j }
                });
            }
        }
        
        // Centros de celdas (descubiertas) - Basado en getCoordenadasDescubiertas
        for (let i = 0; i < this.config.cantVert; i++) {
            for (let j = 0; j < this.config.cantHor; j++) {
                this.config.coordenadasDescubiertasBase.push({
                    x: baseX + (j + 1.0) * this.config.tamCuadrado,
                    y: baseY + (i + 1.0) * this.config.tamCuadrado,
                    tipo: "celda",
                    indiceCelda: { fila: i, columna: j }
                });
            }
        }
        
        // TODO: Calcular polígonos de colisión para áreas cubiertas
        console.log(`📍 GridObj ${this.id}: Coordenadas calculadas (centradas) - baseX=${baseX.toFixed(1)}, baseY=${baseY.toFixed(1)}`);
    }
    
    // === GESTIÓN DE CANVAS VIRTUALES PROPIOS (BASADO EN ENSUREGRIDCANVAS) ===
    ensureCanvas(index) {
        if (!this.canvases[index]) {
            const canvas = document.createElement('canvas');
            this.canvases[index] = canvas.getContext('2d');
            console.log(`📊 GridObj ${this.id}: Canvas virtual ${index} creado`);
        }
        
        this.canvases[index].canvas.width = GAME_CONFIG.LOGICAL_WIDTH;
        this.canvases[index].canvas.height = GAME_CONFIG.LOGICAL_HEIGHT;
        
        return this.canvases[index];
    }
    
    // === MÉTODO DE DIBUJO DE REJA BASE (ÚNICO Y SIMPLE) ===
    dibujarRejaBase(level) {
        if (!this.needsRedrawBase) return; // Solo redibujar si es necesario
        
        // Canvas base (0) para la reja sin transformaciones
        this.ensureCanvas(0);
        const ctx = this.canvases[0];
        ctx.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
        ctx.lineWidth = this.config.grosorLinea;
        
        // USAR EXACTAMENTE EL MISMO PATRÓN DE DIBUJO QUE FUNCIONA EN NIVEL 2
        this.dibujarRejaBasePorDefecto(ctx);
        
        this.needsRedrawBase = false;
        console.log(`✨ GridObj ${this.id}: Reja base dibujada con patrón nivel 2`);
        
        // 🔷 NUEVO: Calcular polígonos automáticamente después del dibujo
        this.calcularPoligonos();
    }
    
    // === MÉTODO DE DIBUJO POR DEFECTO (CENTRADO EN CANVAS COMO NIVEL 1 Y 2) ===
    dibujarRejaBasePorDefecto(ctx) {
        // 🎨 USAR COLORES DIRECTOS CONFIGURABLES
        const colors = {
            dark: this.colorDark,
            bright: this.colorClaro
        };
        
        // ✅ CALCULAR POSICIÓN CENTRADA EN EL CANVAS (COMO NIVEL 1 Y 2)
        const canvasWidth = GAME_CONFIG.LOGICAL_WIDTH;
        const canvasHeight = GAME_CONFIG.LOGICAL_HEIGHT;
        const rejaWidth = (this.config.cantHor + 1) * this.config.tamCuadrado;
        const rejaHeight = (this.config.cantVert + 1) * this.config.tamCuadrado;
        
        const baseX = (canvasWidth - rejaWidth) / 2;
        const baseY = (canvasHeight - rejaHeight) / 2;
        
        console.log(`🎯 GridObj ${this.id}: Dibujando reja centrada en canvas - baseX=${baseX.toFixed(1)}, baseY=${baseY.toFixed(1)}`);
        
        // === LÍNEAS HORIZONTALES (EXACTAMENTE COMO NIVEL 1) ===
        for (let i = 0.5; i <= this.config.cantVert + 0.5; i++) {
            const y = baseY + i * this.config.tamCuadrado;
            const grad = ctx.createLinearGradient(0, y - this.config.grosorLinea/2, 0, y + this.config.grosorLinea/2);
            grad.addColorStop(0, colors.dark);
            grad.addColorStop(0.5, colors.bright);
            grad.addColorStop(1, colors.dark);
            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(baseX, y);
            ctx.lineTo(baseX + (this.config.cantHor + 1) * this.config.tamCuadrado, y);
            ctx.stroke();
        }
        
        // === LÍNEAS VERTICALES CON if (1==0) PARA PRUEBAS (EXACTAMENTE COMO NIVEL 1) ===
        if (1==1) {

            // Dibujar líneas verticales - anulado reemplazado
            for (let j = 0.5; j <= this.config.cantHor + 0.5; j++) {
                const x = baseX + j * this.config.tamCuadrado;
                const grad = ctx.createLinearGradient(x - this.config.grosorLinea/2, 0, x + this.config.grosorLinea/2, 0);
                grad.addColorStop(0, colors.dark);
                grad.addColorStop(0.5, colors.bright);
                grad.addColorStop(1, colors.dark);
                ctx.strokeStyle = grad;
                ctx.beginPath();
                ctx.moveTo(x, baseY);
                ctx.lineTo(x, baseY + (this.config.cantVert + 1) * this.config.tamCuadrado);
                ctx.stroke();
            }

        } else {

            // Dibujar líneas verticales entrelazadas
            let y1 = 1
            let par = false
            for (let j = 0.5; j <= this.config.cantHor + 0.5; j++) {
                const x = baseX + j * this.config.tamCuadrado;
                if (par == false) {
                    y1 = baseY +  (this.config.tamCuadrado*1.5)-(this.config.grosorLinea/2)
                } else {
                    y1 = baseY +  (this.config.tamCuadrado*0.5)-(this.config.grosorLinea/2)
                }
                const grad = ctx.createLinearGradient(x - this.config.grosorLinea/2, 0, x + this.config.grosorLinea/2, 0);
                grad.addColorStop(0, colors.dark);
                grad.addColorStop(0.5, colors.bright);
                grad.addColorStop(1, colors.dark);
                ctx.strokeStyle = grad;
                ctx.beginPath();
                ctx.moveTo(x, baseY);
                ctx.lineTo(x, y1 );
                y1= y1 + this.config.grosorLinea;
                ctx.moveTo(x, y1);
                ctx.lineTo(x, y1+(this.config.tamCuadrado*2) - this.config.grosorLinea);
                if (par == false) {
                    y1 = y1+(this.config.tamCuadrado*2) - this.config.grosorLinea + this.config.grosorLinea;
                } else {
                    y1 = y1+(this.config.tamCuadrado*2) - this.config.grosorLinea+(this.config.grosorLinea);
                }
                ctx.moveTo(x, y1);
                ctx.lineTo(x, baseY + (this.config.cantVert + 1) * this.config.tamCuadrado);
                ctx.stroke();
                if (par == false) {
                    par = true
                } else {
                    par = false
                }
            }
        }
    }
    
    // === MÉTODOS DE DIBUJO ESPECÍFICOS ELIMINADOS ===
    // Se simplificó la clase para usar solo dibujarRejaBasePorDefecto() basado en el patrón correcto del nivel 2
    
    // === ACTUALIZACIÓN LÓGICA (30 FPS) - BASADO EN UPDATEGRIDLOGIC ===
    updateLogic(deltaTime) {
        if (!this.activo) return;
        
        // Guardar estado anterior para interpolación (basado en gridState)
        this.interpolationState.previous = { ...this.interpolationState.current };
        
        // Actualizar estado actual con valores controlados externamente
        this.interpolationState.current = {
            posX: this.posX,
            posY: this.posY,
            rot: this.rot,
            timestamp: performance.now()
        };
    }
    
    // === COMPOSICIÓN Y RENDERIZADO (60 FPS CON INTERPOLACIÓN) - BASADO EN COMPOSEGRID ===
    render(ctxDestino, alpha = 1.0) {
        if (!this.activo || !this.canvases[0]) return;
        
        // Interpolación suave (basada en composeGrid)
        const interpolatedState = {
            posX: Utils.lerp(this.interpolationState.previous.posX, this.interpolationState.current.posX, alpha),
            posY: Utils.lerp(this.interpolationState.previous.posY, this.interpolationState.current.posY, alpha),
            rot: this.lerpAngle(this.interpolationState.previous.rot, this.interpolationState.current.rot, alpha)
        };
        
        // Canvas de composición (1)
        this.ensureCanvas(1);
        const compCtx = this.canvases[1];
        compCtx.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
        
        // Aplicar transformaciones
        compCtx.save();
        
        // Aplicar traslación PRIMERO
        compCtx.translate(interpolatedState.posX, interpolatedState.posY);
        
        // Aplicar rotación desde el centro del CANVAS (donde está la reja centrada)
        if (interpolatedState.rot !== 0) {
            // ✅ CORRECTO: Centro del canvas donde está dibujada la reja centrada
            const centerX = GAME_CONFIG.LOGICAL_WIDTH / 2;
            const centerY = GAME_CONFIG.LOGICAL_HEIGHT / 2;
            
            compCtx.translate(centerX, centerY);
            compCtx.rotate(interpolatedState.rot);
            compCtx.translate(-centerX, -centerY);
            
            // Logs removidos para limpiar consola
        } else if (interpolatedState.posX !== 0 || interpolatedState.posY !== 0) {
            // Logs removidos para limpiar consola
        }
        
        // Capturar matriz de transformación
        this.transformMatrix = compCtx.getTransform();
        
        // Dibujar reja base
        compCtx.drawImage(this.canvases[0].canvas, 0, 0);
        
        compCtx.restore();
        
        // Renderizar al contexto destino
        ctxDestino.drawImage(this.canvases[1].canvas, 0, 0);
    }
    
    // === UTILIDADES ===
    lerpAngle(from, to, t) {
        // Función de interpolación angular (copiada del composeGrid)
        const TWO_PI = Math.PI * 2;
        
        // Normalizar ángulos al rango [0, 2π]
        from = ((from % TWO_PI) + TWO_PI) % TWO_PI;
        to = ((to % TWO_PI) + TWO_PI) % TWO_PI;
        
        // Calcular la diferencia más corta
        let diff = to - from;
        if (diff > Math.PI) {
            diff -= TWO_PI;
        } else if (diff < -Math.PI) {
            diff += TWO_PI;
        }
        
        // Interpolación suave
        return from + diff * t;
    }
    
    // === COORDENADAS TRANSFORMADAS (BASADO EN GETCOORDENADAS) ===
    getCoordenadasCubiertas() {
        return this.config.coordenadasCubiertasBase.map(coord => {
            const transformed = this.applyTransformMatrix(coord.x, coord.y);
            return {
                ...coord,
                x: transformed.x,
                y: transformed.y,
                baseX: coord.x,
                baseY: coord.y
            };
        });
    }
    
    getCoordenadasDescubiertas() {
        return this.config.coordenadasDescubiertasBase.map(coord => {
            const transformed = this.applyTransformMatrix(coord.x, coord.y);
            return {
                ...coord,
                x: transformed.x,
                y: transformed.y,
                baseX: coord.x,
                baseY: coord.y
            };
        });
    }
    
    applyTransformMatrix(x, y) {
        // Aplicar matriz de transformación (copiado de applyTransformMatrix)
        if (!this.transformMatrix) {
            return { x, y };
        }
        
        const transformedX = this.transformMatrix.a * x + this.transformMatrix.c * y + this.transformMatrix.e;
        const transformedY = this.transformMatrix.b * x + this.transformMatrix.d * y + this.transformMatrix.f;
        
        return {
            x: transformedX,
            y: transformedY
        };
    }
    
    // === MÉTODO DE RESIZE ===
    resize(width, height, level) {
        this.calcularConfiguracion(width, height, level);
        this.needsRedrawBase = true;
        console.log(`🔄 GridObj ${this.id}: Resize aplicado`);
    }
    
    // 🔷 === SISTEMA DE POLÍGONOS INTEGRADO ===
    
    /**
     * Calcula polígonos de colisión a partir del canvas[0] dibujado
     */
    calcularPoligonos() {
        const startTime = performance.now();
        
        try {
            // Obtener canvas base (sin transformaciones)
            const ctx = this.canvases[0];
            if (!ctx || !ctx.canvas) {
                console.warn(`⚠️ GridObj ${this.id}: Canvas[0] no disponible para cálculo de polígonos`);
                return;
            }
            
            // 1. Detectar píxeles activos
            const binaryGrid = this.detectarPixelesActivos(ctx);
            if (binaryGrid.length === 0) {
                console.warn(`⚠️ GridObj ${this.id}: No se detectaron píxeles activos`);
                return;
            }
            
            // 2. Trazar contornos
            const contornos = this.trazarContornos(binaryGrid);
            this.config.contornosOriginales = contornos;
            
            // 3. Simplificar y convertir a polígonos SAT
            this.config.poligonosColision = [];
            for (const contorno of contornos) {
                const simplified = this.simplificarContorno(contorno);
                const satPolygon = this.crearPoligonoSAT(simplified);
                if (satPolygon) {
                    this.config.poligonosColision.push(satPolygon);
                }
            }
            
            this.config.timestampPoligonos = Date.now();
            const processingTime = performance.now() - startTime;
            
            console.log(`✅ GridObj ${this.id}: ${this.config.poligonosColision.length} polígonos calculados en ${processingTime.toFixed(1)}ms`);
            
            if (this.config.configPoligonos.debugMode) {
                console.log(`🧪 [DEBUG] ${this.id}: Contornos originales: ${contornos.length}, Polígonos finales: ${this.config.poligonosColision.length}`);
            }
            
        } catch (error) {
            console.error(`❌ GridObj ${this.id}: Error calculando polígonos:`, error);
        }
    }
    
    /**
     * Detecta píxeles activos en el canvas
     */
    detectarPixelesActivos(ctx) {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        let imgData;
        try {
            imgData = ctx.getImageData(0, 0, width, height);
        } catch (error) {
            console.error(`❌ GridObj ${this.id}: Error obteniendo ImageData:`, error);
            return [];
        }
        
        const data = imgData.data;
        const binaryGrid = [];
        
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const alpha = data[i + 3];
                row.push(alpha > this.config.configPoligonos.alphaThreshold ? 1 : 0);
            }
            binaryGrid.push(row);
        }
        
        return binaryGrid;
    }
    
    /**
     * Traza contornos usando marching-squares
     */
    trazarContornos(binaryGrid) {
        try {
            // Usar threshold configurable (por defecto 0.5)
            const threshold = this.config.thresholdContornos || 0.5;
            const contours = isoContours(binaryGrid, threshold);
            
            if (this.config.configPoligonos.debugMode) {
                console.log(`🎯 GridObj ${this.id}: Usando threshold ${threshold}, detectados ${contours.length} contornos`);
            }
            
            return contours || [];
        } catch (error) {
            console.error(`❌ GridObj ${this.id}: Error trazando contornos:`, error);
            return [];
        }
    }
    
    /**
     * Simplifica contorno usando Douglas-Peucker
     */
    simplificarContorno(contorno) {
        if (!contorno || contorno.length < 3) {
            return contorno;
        }
        
        try {
            return simplify(contorno, this.config.configPoligonos.toleranciaSimplificacion);
        } catch (error) {
            console.error(`❌ GridObj ${this.id}: Error simplificando contorno:`, error);
            return contorno;
        }
    }
    
    /**
     * Crea polígono SAT a partir de contorno simplificado
     */
    crearPoligonoSAT(contorno) {
        if (!contorno || contorno.length < 3) {
            return null;
        }
        
        try {
            const satPoints = contorno.map(p => new Vector(p.x, p.y));
            return new Polygon(new Vector(0, 0), satPoints);
        } catch (error) {
            console.error(`❌ GridObj ${this.id}: Error creando polígono SAT:`, error);
            return null;
        }
    }
    
    /**
     * Detecta colisión de la pelota con los polígonos de esta reja
     * ⚠️ IMPORTANTE: Usa polígonos transformados igual que el debug visual
     * @param {Object} ballData - {x, y, radius}
     * @returns {boolean} true si hay colisión
     */
    detectarColisionPelota(ballData) {
        if (!ballData || !this.config.poligonosColision.length) {
            return false;
        }
        
        try {
            // Crear círculo SAT para la pelota
            const ballCircle = new Circle(new Vector(ballData.x, ballData.y), ballData.radius);
            
            // Probar colisión contra todos los polígonos de esta reja
            for (const polygonBase of this.config.poligonosColision) {
                // 🔄 APLICAR MISMAS TRANSFORMACIONES QUE EL DEBUG VISUAL
                const polygonTransformado = this.transformarPoligonoParaSAT(polygonBase);
                
                if (testPolygonCircle(polygonTransformado, ballCircle)) {
                    if (this.config.configPoligonos.debugMode) {
                        console.log(`💥 GridObj ${this.id}: Colisión detectada con pelota(${ballData.x}, ${ballData.y}, r=${ballData.radius})`);
                    }
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error(`❌ GridObj ${this.id}: Error en detección de colisión:`, error);
            return false;
        }
    }
    
    /**
     * Transforma un polígono base aplicando las mismas transformaciones que el debug visual
     * @param {Polygon} polygonBase - Polígono en coordenadas base
     * @returns {Polygon} Polígono transformado para SAT
     */
    transformarPoligonoParaSAT(polygonBase) {
        const puntosTransformados = polygonBase.points.map(point => {
            const puntoTransformado = this.aplicarTransformacionesDebug(point);
            return new Vector(puntoTransformado.x, puntoTransformado.y);
        });
        
        return new Polygon(new Vector(0, 0), puntosTransformados);
    }
    
    /**
     * Obtiene información de debug de polígonos
     */
    getDebugPoligonos() {
        return {
            rejaId: this.id,
            cantidadPoligonos: this.config.poligonosColision.length,
            cantidadContornos: this.config.contornosOriginales.length,
            timestamp: this.config.timestampPoligonos,
            configuracion: this.config.configPoligonos
        };
    }
    
    // 🎨 === SISTEMA DE DEBUG VISUAL DE POLÍGONOS ===
    
    /**
     * Dibuja los polígonos de esta reja en la capa borrador para debug visual
     * ⚠️ IMPORTANTE: Dibuja EXACTAMENTE lo mismo que evalúa el SAT
     * @param {CanvasRenderingContext2D} ctxBorrador - Contexto de la capa borrador
     * @param {string} color - Color para dibujar los polígonos
     * @param {number} alpha - Transparencia (0-1)
     */
    dibujarPoligonosDebug(ctxBorrador, color = 'white', alpha = 0.6) {
        if (!this.config.poligonosColision.length) {
            return 0; // No hay polígonos para dibujar
        }
        
        // Configurar estilo para polígonos LLENOS (más claro para entender)
        ctxBorrador.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctxBorrador.strokeStyle = color;
        ctxBorrador.lineWidth = 2; // Borde más fino
        ctxBorrador.setLineDash([]); // Línea sólida
        
        let poligonosDrawn = 0;
        
        for (const polygon of this.config.poligonosColision) {
            if (polygon.points && polygon.points.length > 0) {
                ctxBorrador.beginPath();
                
                // Aplicar EXACTAMENTE las mismas transformaciones que usa SAT
                const firstPoint = this.aplicarTransformacionesDebug(polygon.points[0]);
                ctxBorrador.moveTo(firstPoint.x, firstPoint.y);
                
                for (let i = 1; i < polygon.points.length; i++) {
                    const point = this.aplicarTransformacionesDebug(polygon.points[i]);
                    ctxBorrador.lineTo(point.x, point.y);
                }
                
                ctxBorrador.closePath();
                
                // Dibujar LLENO para ver claramente qué es área sólida
                ctxBorrador.fill();
                // Y también el borde para definir mejor
                ctxBorrador.stroke();
                
                poligonosDrawn++;
            }
        }
        
        return poligonosDrawn;
    }
    
    /**
     * Aplica transformaciones del objeto para debug visual
     * ⚠️ DEBE SER IDÉNTICO a cómo se renderiza la reja en pantalla
     * @param {Object} point - Punto original {x, y}
     * @returns {Object} Punto transformado {x, y}
     */
    aplicarTransformacionesDebug(point) {
        // 🔄 APLICAR TRANSFORMACIONES REALES DEL GRIDOBJ
        
        // Si hay matriz de transformación disponible, usarla
        if (this.transformMatrix) {
            const transformed = this.applyTransformMatrix(point.x, point.y);
            return {
                x: transformed.x,
                y: transformed.y
            };
        }
        
        // Si no hay matriz, aplicar transformaciones básicas
        // (posición + rotación manual)
        let x = point.x;
        let y = point.y;
        
        // Aplicar rotación desde el centro del objeto si hay rotación
        if (this.rot && this.rot !== 0) {
            const centerX = GAME_CONFIG.LOGICAL_WIDTH / 2;  // Centro de la reja
            const centerY = GAME_CONFIG.LOGICAL_HEIGHT / 2;
            
            // Trasladar al origen
            const localX = x - centerX;
            const localY = y - centerY;
            
            // Rotar
            const cos = Math.cos(this.rot);
            const sin = Math.sin(this.rot);
            const rotatedX = localX * cos - localY * sin;
            const rotatedY = localX * sin + localY * cos;
            
            // Volver a trasladar
            x = rotatedX + centerX;
            y = rotatedY + centerY;
        }
        
        // Aplicar traslación
        return {
            x: x + this.posX,
            y: y + this.posY
        };
    }
    
    // === MÉTODO DE INICIALIZACIÓN ===
    init(width, height, level) {
        this.calcularConfiguracion(width, height, level);
        this.dibujarRejaBase(level);
        this.inicializado = true;
        
        // Inicializar estado de interpolación
        const now = performance.now();
        this.interpolationState.previous = { posX: this.posX, posY: this.posY, rot: this.rot, timestamp: now };
        this.interpolationState.current = { posX: this.posX, posY: this.posY, rot: this.rot, timestamp: now };
        
        console.log(`🎯 GridObj ${this.id}: Inicializado correctamente`);
        return this;
    }
    
    // === MÉTODO DE LIMPIEZA ===
    dispose() {
        this.canvases.forEach(ctx => {
            if (ctx && ctx.canvas) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }
        });
        this.canvases.length = 0;
        this.inicializado = false;
        console.log(`🗑️ GridObj ${this.id}: Recursos liberados`);
    }
    
    // === MÉTODOS DE CONFIGURACIÓN MANUAL ===
    setConfiguracionManual(cantHor, cantVert, tamCuadrado = null, grosorLinea = null) {
        this.config.cantHor = cantHor;
        this.config.cantVert = cantVert;
        if (tamCuadrado !== null) this.config.tamCuadrado = tamCuadrado;
        if (grosorLinea !== null) this.config.grosorLinea = grosorLinea;
        this.needsRedrawBase = true;
        console.log(`⚙️ GridObj ${this.id}: Configuración manual aplicada - ${cantHor}x${cantVert} (centrado automático)`);
    }
    
    // === MÉTODOS DE CONTROL EXTERNO DE ESTADO ===
    setPosicion(x, y) {
        this.posX = x;
        this.posY = y;
    }
    
    setRotacion(radianes) {
        this.rot = radianes;
    }
    
    setMovimiento(x, y, rotacionRad) {
        this.posX = x;
        this.posY = y;
        this.rot = rotacionRad;
    }
}

// === GESTOR GLOBAL DE GRIDOBJ ===
let gridObjectsRegistry = new Map(); // Registro de objetos GridObj por ID

// === FUNCIONES UTILITARIAS PARA GRIDOBJ ===
export function createGridObj(id) {
    const gridObj = new GridObj(id);
    gridObjectsRegistry.set(id, gridObj);
    console.log(`🎯 GridObj ${id} creado y registrado`);
    return gridObj;
}

export function getGridObj(id) {
    return gridObjectsRegistry.get(id) || null;
}

export function getAllGridObjs() {
    return Array.from(gridObjectsRegistry.values());
}

export function removeGridObj(id) {
    const gridObj = gridObjectsRegistry.get(id);
    if (gridObj) {
        gridObj.dispose();
        gridObjectsRegistry.delete(id);
        console.log(`🗑️ GridObj ${id} eliminado del registro`);
        return true;
    }
    return false;
}

export function clearAllGridObjs() {
    gridObjectsRegistry.forEach(gridObj => gridObj.dispose());
    gridObjectsRegistry.clear();
    console.log(`🗑️ Todos los GridObj eliminados del registro`);
}

// === DEBUG PARA GRIDOBJ ===
window.debugGridObjs = function() {
    console.log("🧪 [DEBUG] Estado de GridObj Registry:");
    console.log(`   Total objetos: ${gridObjectsRegistry.size}`);
    
    gridObjectsRegistry.forEach((gridObj, id) => {
        console.log(`   ${id}: activo=${gridObj.activo}, inicializado=${gridObj.inicializado}`);
        console.log(`      posición=(${gridObj.posX.toFixed(1)}, ${gridObj.posY.toFixed(1)}), rotación=${(gridObj.rot * 180 / Math.PI).toFixed(1)}°`);
        console.log(`      config=${gridObj.config.cantHor}x${gridObj.config.cantVert}, celda=${gridObj.config.tamCuadrado ? gridObj.config.tamCuadrado.toFixed(1) : 'auto'}px`);
        console.log(`      🎨 colores: dark='${gridObj.colorDark}', claro='${gridObj.colorClaro}'`);
    });
    
    return {
        totalObjetos: gridObjectsRegistry.size,
        objetos: Array.from(gridObjectsRegistry.entries()).map(([id, obj]) => ({
            id,
            activo: obj.activo,
            inicializado: obj.inicializado,
            posicion: { x: obj.posX, y: obj.posY },
            rotacion: obj.rot * 180 / Math.PI,
            colores: { dark: obj.colorDark, claro: obj.colorClaro }
        }))
    };
};

// === FUNCIONES DE DEBUG PARA NIVEL 3 ===
window.debugGridObjNivel3 = function() {
    const objs = getAllGridObjs();
    if (objs.length === 0) {
        console.log("🧪 [DEBUG] No hay objetos GridObj creados");
        return;
    }
    
    console.log("🧪 [DEBUG] Estado de objetos GridObj nivel 3:");
    objs.forEach(obj => {
        const width = (obj.config.cantHor + 1) * obj.config.tamCuadrado;
        const height = (obj.config.cantVert + 1) * obj.config.tamCuadrado;
        
        console.log(`   ${obj.id} (${obj.config.cantHor}x${obj.config.cantVert}):`);
        console.log(`     Tamaño calculado: ${width.toFixed(1)}x${height.toFixed(1)}`);
        console.log(`     Movimiento: pos(${obj.posX}, ${obj.posY}) rot(${(obj.rot * 180/Math.PI).toFixed(1)}°)`);
        console.log(`     🎨 Colores: dark='${obj.colorDark}' claro='${obj.colorClaro}'`);
        console.log(`     Canvas: ${GAME_CONFIG.LOGICAL_WIDTH}x${GAME_CONFIG.LOGICAL_HEIGHT} - ✅ Centrado automático`);
    });
    
    return objs.map(obj => ({
        id: obj.id,
        size: { w: (obj.config.cantHor + 1) * obj.config.tamCuadrado, h: (obj.config.cantVert + 1) * obj.config.tamCuadrado },
        movement: { x: obj.posX, y: obj.posY, rot: obj.rot * 180/Math.PI }
    }));
};

window.debugSetReja1Flotacion = function(y) {
    const reja1 = getGridObj('reja1');
    if (reja1) {
        reja1.setPosicion(0, y);
        console.log(`🧪 [DEBUG] Reja1 flotación Y = ${y}`);
    } else {
        console.log("🧪 [DEBUG] Reja1 no encontrada");
    }
};

window.debugSetReja2Movimiento = function(x, y, rotacionGrados) {
    const reja2 = getGridObj('reja2');
    if (reja2) {
        const rotacionRad = rotacionGrados * Math.PI / 180;
        reja2.setMovimiento(x, y, rotacionRad);
        console.log(`🧪 [DEBUG] Reja2 movimiento: X=${x}, Y=${y}, Rot=${rotacionGrados}°`);
    } else {
        console.log("🧪 [DEBUG] Reja2 no encontrada");
    }
};

window.debugCambiarColoresReja = function(rejaId, colorDark, colorClaro) {
    const reja = getGridObj(rejaId);
    if (!reja) {
        console.log(`🧪 [DEBUG] Reja '${rejaId}' no encontrada`);
        return;
    }
    
    // Cambiar colores directamente
    reja.colorDark = colorDark;
    reja.colorClaro = colorClaro;
    reja.needsRedrawBase = true;
    
    // Redibujar la reja con los nuevos colores
    reja.dibujarRejaBase(3);
    
    console.log(`🧪 [DEBUG] ${rejaId} colores cambiados:`);
    console.log(`   colorDark: ${colorDark}, colorClaro: ${colorClaro}`);
    
    return { rejaId, colorDark, colorClaro };
};

// Función auxiliar para colores predefinidos
window.debugColoresPreset = function(rejaId, preset) {
    const presets = {
        'verde': { dark: "rgb(0, 31, 20)", claro: "rgb(19, 231, 16)" },
        'dorado': { dark: "rgb(60, 45, 20)", claro: "rgb(255, 215, 0)" },
        'gris': { dark: "rgb(40, 40, 40)", claro: "rgb(200, 200, 200)" },
        'cyan': { dark: "rgb(0, 19, 24)", claro: "rgba(0, 255, 255, 1)" },
        'magenta': { dark: "rgb(32, 81, 40)", claro: "rgb(196, 25, 202)" },
        'rojo': { dark: "rgb(40, 10, 10)", claro: "rgb(255, 50, 50)" }
    };
    
    if (!presets[preset]) {
        console.log(`🧪 [DEBUG] Preset '${preset}' no disponible. Disponibles: ${Object.keys(presets).join(', ')}`);
        return;
    }
    
    const colores = presets[preset];
    return window.debugCambiarColoresReja(rejaId, colores.dark, colores.claro);
};

console.log("✅ CLASE GRIDOBJ IMPLEMENTADA - Objetos de reja independientes disponibles");
console.log("🧪 [DEBUG] Funciones disponibles:");
console.log("   debugGridObjNivel3() - Ver estado de objetos nivel 3");
console.log("   debugSetReja1Flotacion(y) - Mover Reja1 verticalmente");
console.log("   debugSetReja2Movimiento(x, y, grados) - Mover y rotar Reja2");
console.log("   debugCambiarColoresReja(id, colorDark, colorClaro) - Cambiar colores RGB directamente");
console.log("   debugColoresPreset(id, preset) - Usar colores predefinidos");
console.log("     Presets: 'verde', 'dorado', 'gris', 'cyan', 'magenta', 'rojo'");
console.log("   debugGridObjs() - Ver estado detallado de todos los objetos");
console.log("💡 [EJEMPLO] reja1.colorDark = 'rgb(100,0,0)'; reja1.colorClaro = 'rgb(255,100,100)';");

// ============================================================================
// 🎛️ FUNCIONES DE CONFIGURACIÓN DE MOTORES NIVEL 3
// ============================================================================

// === CONFIGURACIÓN DE PARÁMETROS DE TIEMPO Y VELOCIDAD ===
window.configNivel3Parametros = function(config = {}) {
    if (!window.gridLevel3StateNew) {
        console.log("🚨 [CONFIG] Nivel 3 no está inicializado. Inicia el nivel 3 primero.");
        return;
    }
    
    const state = window.gridLevel3StateNew;
    const r2 = state.reja2;
    const DEG_TO_RAD = Math.PI / 180;
    
    // Aplicar nuevos parámetros si se proporcionan
    if (config.intervaloChangeDir !== undefined) {
        r2.DIRECTION_CHANGE_INTERVAL = config.intervaloChangeDir * 1000; // convertir segundos a milisegundos
        console.log(`🎛️ [CONFIG] Intervalo cambio dirección: ${config.intervaloChangeDir}s`);
    }
    
    if (config.tiempoIntermitente !== undefined) {
        r2.INTERMITTENT_START_TIME = config.tiempoIntermitente * 1000; // convertir segundos a milisegundos
        console.log(`🎛️ [CONFIG] Tiempo para rotación intermitente: ${config.tiempoIntermitente}s`);
    }
    
    if (config.tiempoAceleracion !== undefined) {
        r2.ACCELERATION_START_TIME = config.tiempoAceleracion * 1000; // convertir segundos a milisegundos
        console.log(`🎛️ [CONFIG] Tiempo para aceleración: ${config.tiempoAceleracion}s`);
    }
    
    if (config.velocidadBaseDeg !== undefined) {
        r2.BASE_ROTATION_SPEED = config.velocidadBaseDeg * DEG_TO_RAD;
        console.log(`🎛️ [CONFIG] Velocidad base: ${config.velocidadBaseDeg}°/s`);
    }
    
    if (config.velocidadRapidaDeg !== undefined) {
        r2.FAST_ROTATION_SPEED = config.velocidadRapidaDeg * DEG_TO_RAD;
        console.log(`🎛️ [CONFIG] Velocidad rápida inicial: ${config.velocidadRapidaDeg}°/s`);
    }
    
    if (config.aceleracionDeg !== undefined) {
        r2.ACCELERATION_RATE = config.aceleracionDeg * DEG_TO_RAD;
        console.log(`🎛️ [CONFIG] Aceleración: ${config.aceleracionDeg}°/s²`);
    }
    
    if (config.velocidadMaxDeg !== undefined) {
        r2.MAX_ROTATION_SPEED = config.velocidadMaxDeg * DEG_TO_RAD;
        console.log(`🎛️ [CONFIG] Velocidad máxima: ${config.velocidadMaxDeg}°/s`);
    }
    
    // Mostrar configuración actual
    console.log("🎛️ [CONFIG] Configuración actual Nivel 3:");
    console.log(`   Cambio dirección cada: ${r2.DIRECTION_CHANGE_INTERVAL/1000}s (en fase intermitente)`);
    console.log(`   Rotación intermitente inicia en: ${r2.INTERMITTENT_START_TIME/1000}s (desde primer disparo)`);
    console.log(`   Aceleración inicia en: ${r2.ACCELERATION_START_TIME/1000}s (desde primer disparo)`);
    console.log(`   Velocidad base: ${(r2.BASE_ROTATION_SPEED*180/Math.PI).toFixed(1)}°/s`);
    console.log(`   Velocidad rápida: ${(r2.FAST_ROTATION_SPEED*180/Math.PI).toFixed(1)}°/s`);
    console.log(`   Aceleración: ${(r2.ACCELERATION_RATE*180/Math.PI).toFixed(1)}°/s²`);
    console.log(`   Velocidad máxima: ${(r2.MAX_ROTATION_SPEED*180/Math.PI).toFixed(1)}°/s`);
    
    return {
        intervaloChangeDir: r2.DIRECTION_CHANGE_INTERVAL/1000,
        tiempoIntermitente: r2.INTERMITTENT_START_TIME/1000,
        tiempoAceleracion: r2.ACCELERATION_START_TIME/1000,
        velocidadBase: r2.BASE_ROTATION_SPEED*180/Math.PI,
        velocidadRapida: r2.FAST_ROTATION_SPEED*180/Math.PI,
        aceleracion: r2.ACCELERATION_RATE*180/Math.PI,
        velocidadMax: r2.MAX_ROTATION_SPEED*180/Math.PI
    };
};

// === FUNCIONES ESPECÍFICAS PARA CADA PARÁMETRO ===
window.setTiempoCambioDir = function(segundos) {
    return window.configNivel3Parametros({ intervaloChangeDir: segundos });
};

window.setTiempoIntermitente = function(segundos) {
    return window.configNivel3Parametros({ tiempoIntermitente: segundos });
};

window.setTiempoAceleracion = function(segundos) {
    return window.configNivel3Parametros({ tiempoAceleracion: segundos });
};

window.setVelocidadBase = function(gradosPorSegundo) {
    return window.configNivel3Parametros({ velocidadBaseDeg: gradosPorSegundo });
};

window.setVelocidadRapida = function(gradosPorSegundo) {
    return window.configNivel3Parametros({ velocidadRapidaDeg: gradosPorSegundo });
};

window.setAceleracion = function(gradosPorSegundoCuadrado) {
    return window.configNivel3Parametros({ aceleracionDeg: gradosPorSegundoCuadrado });
};

window.setVelocidadMaxima = function(gradosPorSegundo) {
    return window.configNivel3Parametros({ velocidadMaxDeg: gradosPorSegundo });
};

// === FUNCIÓN PARA REINICIAR ROTACIÓN Y FASES ===
window.resetReja2Rotacion = function() {
    if (!window.gridLevel3StateNew) {
        console.log("🚨 [RESET] Nivel 3 no está inicializado");
        return;
    }
    
    const currentTime = performance.now();
    const r2 = window.gridLevel3StateNew.reja2;
    
    // Reiniciar estado de rotación
    r2.currentRotation = 0;
    r2.rotationSpeed = r2.BASE_ROTATION_SPEED;
    r2.rotationDirection = 1;
    r2.phase = window.gridLevel3StateNew.gameStartTime ? 'gameRunning' : 'preGame';
    r2.lastDirectionChangeTime = currentTime;
    r2.debugInfo.directionChanges = 0;
    
    console.log("🔄 [RESET] Reja2 rotación reiniciada");
    console.log(`   Fase: ${r2.phase}`);
    console.log(`   Dirección: ${r2.rotationDirection > 0 ? 'horario' : 'antihorario'}`);
    
    return r2.phase;
};

// === FUNCIÓN PARA FORZAR CAMBIO DE FASE ===
window.forzarFaseReja2 = function(fase) {
    if (!window.gridLevel3StateNew) {
        console.log("🚨 [FORZAR] Nivel 3 no está inicializado");
        return;
    }
    
    const currentTime = performance.now();
    const r2 = window.gridLevel3StateNew.reja2;
    const fases = ['preGame', 'gameRunning', 'intermittent', 'acceleration'];
    
    if (!fases.includes(fase)) {
        console.log(`🚨 [FORZAR] Fase '${fase}' no válida. Disponibles: ${fases.join(', ')}`);
        return;
    }
    
    const faseAnterior = r2.phase;
    r2.phase = fase;
    
    // Ajustar cronómetros según la fase
    switch (fase) {
        case 'preGame':
            window.gridLevel3StateNew.gameStartTime = null;
            break;
        case 'gameRunning':
            if (!window.gridLevel3StateNew.gameStartTime) {
                window.gridLevel3StateNew.gameStartTime = currentTime;
            }
            break;
        case 'intermittent':
            if (!window.gridLevel3StateNew.gameStartTime) {
                window.gridLevel3StateNew.gameStartTime = currentTime - r2.INTERMITTENT_START_TIME;
            }
            r2.lastDirectionChangeTime = currentTime; // Reiniciar contador
            r2.rotationDirection = 1; // Empezar horario
            break;
        case 'acceleration':
            if (!window.gridLevel3StateNew.gameStartTime) {
                window.gridLevel3StateNew.gameStartTime = currentTime - r2.ACCELERATION_START_TIME;
            }
            r2.rotationDirection = 1; // Forzar horario
            r2.rotationSpeed = r2.FAST_ROTATION_SPEED;
            break;
    }
    
    console.log(`🎭 [FORZAR] Fase cambiada: ${faseAnterior} → ${fase}`);
    
    return { anterior: faseAnterior, actual: fase };
};

// === FUNCIÓN PARA VER ESTADO COMPLETO DEL MOTOR ===
window.estadoMotorReja2 = function() {
    if (!window.gridLevel3StateNew) {
        console.log("🚨 [ESTADO] Nivel 3 no está inicializado");
        return null;
    }
    
    const state = window.gridLevel3StateNew;
    const r2 = state.reja2;
    const currentTime = performance.now();
    
    const estado = {
        fase: r2.phase,
        tiempos: {
            elapsedSinceLevel: (currentTime - state.levelStartTime) / 1000,
            elapsedSinceGame: state.gameStartTime ? (currentTime - state.gameStartTime) / 1000 : 0,
            timeToAcceleration: Math.max(0, r2.ACCELERATION_START_TIME - r2.debugInfo.elapsedSinceGame) / 1000,
            timeToNextDirectionChange: Math.max(0, r2.DIRECTION_CHANGE_INTERVAL - (currentTime - r2.lastDirectionChangeTime)) / 1000
        },
        rotacion: {
            angulo: r2.currentRotation * 180 / Math.PI,
            velocidad: r2.rotationSpeed * 180 / Math.PI,
            direccion: r2.rotationDirection > 0 ? 'horario' : 'antihorario',
            cambiosDir: r2.debugInfo.directionChanges
        },
        configuracion: {
            intervaloChangeDir: r2.DIRECTION_CHANGE_INTERVAL / 1000,
            tiempoAceleracion: r2.ACCELERATION_START_TIME / 1000,
            velocidadBase: r2.BASE_ROTATION_SPEED * 180 / Math.PI,
            velocidadRapida: r2.FAST_ROTATION_SPEED * 180 / Math.PI,
            aceleracion: r2.ACCELERATION_RATE * 180 / Math.PI,
            velocidadMax: r2.MAX_ROTATION_SPEED * 180 / Math.PI
        }
    };
    
    console.log("📊 [ESTADO] Motor Reja2 Nivel 3:");
    console.log(`   🎭 Fase actual: ${estado.fase}`);
    console.log(`   ⏱️ Tiempo nivel: ${estado.tiempos.elapsedSinceLevel.toFixed(1)}s`);
    console.log(`   ⏱️ Tiempo juego: ${estado.tiempos.elapsedSinceGame.toFixed(1)}s`);
    console.log(`   🔄 Rotación: ${estado.rotacion.angulo.toFixed(1)}° ${estado.rotacion.direccion} @ ${estado.rotacion.velocidad.toFixed(1)}°/s`);
    console.log(`   🔄 Cambios dirección: ${estado.rotacion.cambiosDir} | Próximo en: ${estado.tiempos.timeToNextDirectionChange.toFixed(1)}s`);
    
    if (estado.fase !== 'acceleration') {
        console.log(`   🚀 Aceleración en: ${estado.tiempos.timeToAcceleration.toFixed(1)}s`);
    }
    
    return estado;
};

console.log("🎛️ [CONFIG] Funciones de configuración Nivel 3 disponibles:");
console.log("   configNivel3Parametros({intervaloChangeDir, tiempoIntermitente, tiempoAceleracion, velocidadBaseDeg, etc}) - Configurar múltiples");
console.log("   setTiempoCambioDir(segundos) - Cambiar intervalo de cambio de dirección (fase intermitente)");
console.log("   setTiempoIntermitente(segundos) - Cambiar tiempo para iniciar rotación intermitente");
console.log("   setTiempoAceleracion(segundos) - Cambiar tiempo para aceleración final");
console.log("   setVelocidadBase(grados/s) - Velocidad base de rotación (fase intermitente)");
console.log("   setVelocidadRapida(grados/s) - Velocidad inicial en fase aceleración");
console.log("   setAceleracion(grados/s²) - Tasa de aceleración");
console.log("   setVelocidadMaxima(grados/s) - Velocidad máxima");
console.log("   resetReja2Rotacion() - Reiniciar rotación y contadores");
console.log("   forzarFaseReja2('preGame'|'gameRunning'|'intermittent'|'acceleration') - Cambiar fase manualmente");
console.log("   estadoMotorReja2() - Ver estado completo del motor");
console.log("💡 [EJEMPLOS]:");
console.log("   setTiempoCambioDir(5) - Cambiar dirección cada 5 segundos (en fase intermitente)");
console.log("   setTiempoIntermitente(30) - Rotación intermitente después de 30 segundos");
console.log("   setTiempoAceleracion(50) - Acelerar después de 50 segundos");
console.log("   setVelocidadBase(30) - Rotar a 30°/s en la fase intermitente");

// === FUNCIONES DE DEBUG GLOBALES PARA POLÍGONOS GRIDOBJ ===

/**
 * Debug de polígonos para una reja específica
 */
window.debugGridObjPolygons = function(rejaId) {
    const reja = getGridObj(rejaId);
    if (!reja) {
        console.log(`⚠️ [DEBUG] Reja '${rejaId}' no encontrada`);
        return null;
    }
    
    const debugInfo = reja.getDebugPoligonos();
    console.log(`🧪 [DEBUG] Polígonos de ${rejaId}:`, debugInfo);
    return debugInfo;
};

/**
 * Test completo del sistema de polígonos integrado
 */
window.testGridObjPolygons = function() {
    console.log("🧪 [TEST] Sistema de polígonos integrado en GridObj...");
    
    // Verificar nivel 3
    const currentLevel = window.gameInstance ? window.gameInstance.currentLevel : 0;
    if (currentLevel !== 3) {
        console.log("⚠️ [TEST] El test requiere estar en nivel 3");
        return { error: "Nivel incorrecto" };
    }
    
    const results = {
        nivel: currentLevel,
        reja1: null,
        reja2: null,
        testColisiones: []
    };
    
    // Test reja1
    const reja1 = getGridObj('reja1');
    if (reja1) {
        results.reja1 = reja1.getDebugPoligonos();
        console.log(`✅ Reja1: ${results.reja1.cantidadPoligonos} polígonos`);
    } else {
        console.log("❌ Reja1 no encontrada");
    }
    
    // Test reja2
    const reja2 = getGridObj('reja2');
    if (reja2) {
        results.reja2 = reja2.getDebugPoligonos();
        console.log(`✅ Reja2: ${results.reja2.cantidadPoligonos} polígonos`);
    } else {
        console.log("❌ Reja2 no encontrada");
    }
    
    // Test de colisiones
    const testPoints = [
        { x: 200, y: 200, radius: 8, expected: "cubierta" },
        { x: 450, y: 300, radius: 8, expected: "descubierta" },
        { x: 700, y: 400, radius: 8, expected: "cubierta" }
    ];
    
    for (const point of testPoints) {
        let collision1 = false, collision2 = false;
        
        if (reja1) {
            collision1 = reja1.detectarColisionPelota(point);
        }
        if (reja2) {
            collision2 = reja2.detectarColisionPelota(point);
        }
        
        const resultado = (collision1 || collision2) ? "cubierta" : "descubierta";
        
        results.testColisiones.push({
            point: point,
            collision1: collision1,
            collision2: collision2,
            resultado: resultado,
            expected: point.expected,
            correcto: resultado === point.expected
        });
    }
    
    console.log("🧪 [TEST] Resultados:", results);
    return results;
};

/**
 * Visualizar polígonos de todas las rejas
 */
window.visualizeGridObjPolygons = function() {
    console.log("🎨 [DEBUG] Visualizando polígonos de GridObj...");
    
    const canvas = document.getElementById('canvas-principal');
    if (!canvas) {
        console.error("❌ Canvas principal no encontrado");
        return;
    }
    
    const ctx = canvas.getContext('2d');
    let polygonsDrawn = 0;
    
    // Visualizar reja1 (rojo)
    const reja1 = getGridObj('reja1');
    if (reja1 && reja1.config.poligonosColision.length > 0) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        
        for (const polygon of reja1.config.poligonosColision) {
            if (polygon.points && polygon.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
                
                for (let i = 1; i < polygon.points.length; i++) {
                    ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
                }
                
                ctx.closePath();
                ctx.stroke();
                polygonsDrawn++;
            }
        }
        
        console.log(`🎨 Reja1: ${reja1.config.poligonosColision.length} polígonos dibujados en rojo`);
    }
    
    // Visualizar reja2 (verde)
    const reja2 = getGridObj('reja2');
    if (reja2 && reja2.config.poligonosColision.length > 0) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        
        for (const polygon of reja2.config.poligonosColision) {
            if (polygon.points && polygon.points.length > 0) {
                ctx.beginPath();
                ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
                
                for (let i = 1; i < polygon.points.length; i++) {
                    ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
                }
                
                ctx.closePath();
                ctx.stroke();
                polygonsDrawn++;
            }
        }
        
        console.log(`🎨 Reja2: ${reja2.config.poligonosColision.length} polígonos dibujados en verde`);
    }
    
    console.log(`🎨 [DEBUG] Total: ${polygonsDrawn} polígonos visualizados`);
};

// === FUNCIONES GLOBALES DE DEBUG VISUAL ===

/**
 * Detecta si estamos en live server (desarrollo)
 */
function isLiveServer() {
    return window.location.hostname === '127.0.0.1' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname.includes('local');
}

/**
 * Activa la visualización de polígonos por un tiempo determinado
 * Se llama desde el sistema de disparos en cada disparo
 */
window.activarVisualizacionPoligonos = function(duracionExtendida = false) {
    // Solo activar si el debug está habilitado y estamos en desarrollo
    if (!window.debugDeteccionDibujoPoligonos || !isLiveServer()) {
        return;
    }
    
    // Duración: normal para disparos (30 frames), extendida para diagnóstico (300 frames = 5 segundos)
    const frames = duracionExtendida ? 300 : window.debugVisualizacionState.maxFrames;
    
    // Activar visualización
    window.debugVisualizacionState.activo = true;
    window.debugVisualizacionState.framesRestantes = frames;
    window.debugVisualizacionState.ultimoDisparo = performance.now();
    
    const duracion = duracionExtendida ? "5 segundos" : `${window.debugVisualizacionState.maxFrames} frames`;
    console.log(`🎨 [DEBUG] Visualización de polígonos activada por ${duracion}`);
};

/**
 * Dibuja todos los polígonos de detección en la capa borrador
 * Se debe llamar desde el game loop principal si la visualización está activa
 */
window.dibujarDebugPoligonos = function() {
    // Verificar si la visualización está activa
    if (!window.debugVisualizacionState.activo || 
        !window.debugDeteccionDibujoPoligonos || 
        !isLiveServer()) {
        return;
    }
    
    // Decrementar frames restantes
    window.debugVisualizacionState.framesRestantes--;
    
    // Desactivar si se acabó el tiempo
    if (window.debugVisualizacionState.framesRestantes <= 0) {
        window.debugVisualizacionState.activo = false;
        
        // ✨ LIMPIAR VISUALIZACIÓN: Los polígonos se borrarán en el siguiente frame normal
        // No necesitamos limpiar manualmente, el render normal limpia todo
        
        console.log("🎨 [DEBUG] Visualización de polígonos desactivada");
        return;
    }
    
    // Obtener canvas de borrador
    const canvas = document.getElementById('canvas-principal');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Limpiar solo si es el primer frame de visualización
    if (window.debugVisualizacionState.framesRestantes === window.debugVisualizacionState.maxFrames - 1) {
        // No limpiar todo el canvas, solo preparar para dibujo
        ctx.save();
    }
    
    let totalPoligonos = 0;
    
    // Dibujar polígonos de reja1 (blanco con transparencia)
    const reja1 = getGridObj('reja1');
    if (reja1) {
        const count1 = reja1.dibujarPoligonosDebug(ctx, 'white', 0.4);
        totalPoligonos += count1;
    }
    
    // Dibujar polígonos de reja2 (blanco con transparencia)
    const reja2 = getGridObj('reja2');
    if (reja2) {
        const count2 = reja2.dibujarPoligonosDebug(ctx, 'white', 0.4);
        totalPoligonos += count2;
    }
    
    // Dibujar círculo de la pelota (verde para distinguir)
    const ballState = getPelotaState ? getPelotaState() : null;
    const ballPosition = getPelotaPosition ? getPelotaPosition() : null;
    
    if (ballState && ballPosition) {
        // Área de la pelota (círculo lleno verde translúcido)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(ballPosition.x, ballPosition.y, ballState.radio || 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Borde de la pelota (verde sólido)
        ctx.strokeStyle = 'lime';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.stroke();
        
        // Punto central de la pelota (rojo para visibilidad)
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(ballPosition.x, ballPosition.y, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Mostrar info detallada en la primera ejecución
    if (window.debugVisualizacionState.framesRestantes === window.debugVisualizacionState.maxFrames - 1) {
        console.log(`🎨 [DEBUG] Dibujando ${totalPoligonos} polígonos de detección + pelota`);
        
        // Info detallada de transformaciones
        if (reja1) {
            console.log(`🔄 [DEBUG] Reja1 - posX:${reja1.posX.toFixed(1)} posY:${reja1.posY.toFixed(1)} rot:${(reja1.rot*180/Math.PI).toFixed(1)}° matriz:${!!reja1.transformMatrix}`);
        }
        if (reja2) {
            console.log(`🔄 [DEBUG] Reja2 - posX:${reja2.posX.toFixed(1)} posY:${reja2.posY.toFixed(1)} rot:${(reja2.rot*180/Math.PI).toFixed(1)}° matriz:${!!reja2.transformMatrix}`);
        }
        if (ballPosition) {
            console.log(`🎯 [DEBUG] Pelota - x:${ballPosition.x.toFixed(1)} y:${ballPosition.y.toFixed(1)} radio:${ballState.radio || 8}`);
        }
        
        console.log(`⚠️ [DEBUG] VERIFICAR: Los polígonos blancos deben verse EXACTAMENTE donde está la reja visible`);
        console.log(`⚠️ [DEBUG] VERIFICAR: El círculo verde debe estar EXACTAMENTE donde está la pelota`);
    }
    
    ctx.restore();
};

/**
 * Función manual para activar visualización desde consola
 */
window.debugShowPolygons = function() {
    console.log("🎨 [DEBUG] Activando visualización manual de polígonos...");
    window.pausarParaDiagnostico();
    window.activarVisualizacionPoligonos(true);
    console.log("💡 Para reanudar: reanudarDespuesDiagnostico()");
};

/**
 * Verifica coherencia entre evaluación SAT y visualización debug
 */
/**
 * Diagnóstico simple: ¿Qué está detectando realmente?
 */
/**
 * Pausar/reanudar juego para diagnóstico
 */
window.pausarParaDiagnostico = function() {
    if (window.gameInstance && window.gameInstance.pauseGame) {
        window.gameInstance.pauseGame();
        console.log("⏸️ Juego pausado para diagnóstico");
    } else {
        console.log("⚠️ No se pudo pausar automáticamente");
        console.log("💡 Pausa manualmente con ESPACIO o el botón de pausa");
    }
};

window.reanudarDespuesDiagnostico = function() {
    if (window.gameInstance && window.gameInstance.resumeGame) {
        window.gameInstance.resumeGame();
        console.log("▶️ Juego reanudado");
    }
};

window.diagnosticarDeteccionPoligonos = function() {
    console.log("🔍 [DIAGNÓSTICO] ¿Qué está detectando el sistema?");
    
    // Pausar automáticamente
    window.pausarParaDiagnostico();
    
    const reja1 = getGridObj('reja1');
    if (!reja1) {
        console.log("❌ Reja1 no encontrada");
        return;
    }
    
    // Mostrar info básica
    console.log(`📊 Polígonos detectados: ${reja1.config.poligonosColision.length}`);
    
    // Calcular área de cada polígono
    reja1.config.poligonosColision.forEach((polygon, index) => {
        const area = calcularAreaPoligono(polygon.points);
        const vertices = polygon.points.length;
        console.log(`   Polígono ${index}: ${vertices} vértices, área ≈ ${area.toFixed(0)}px²`);
    });
    
    console.log("💡 [INTERPRETACIÓN]:");
    console.log("   - Áreas pequeñas (~100-500px²) = Probablemente barrotes ✅");
    console.log("   - Áreas grandes (~1000+px²) = Probablemente celdas vacías ❌");
    
    // Activar visualización extendida (5 segundos) para diagnóstico
    window.activarVisualizacionPoligonos(true);
    
    console.log("👀 Mira los polígonos blancos: ¿cuáles están en barrotes y cuáles en espacios vacíos?");
    console.log("💡 Para reanudar: reanudarDespuesDiagnostico()");
};

/**
 * Calcula área aproximada de un polígono
 */
function calcularAreaPoligono(points) {
    if (!points || points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
}

/**
 * Prueba diferentes thresholds para ver cuál funciona mejor
 */
window.probarThresholds = function() {
    console.log("🧪 [PRUEBA] Probando diferentes thresholds...");
    
    // Pausar automáticamente
    window.pausarParaDiagnostico();
    
    const reja1 = getGridObj('reja1');
    if (!reja1 || !reja1.canvases[0]) {
        console.log("❌ Reja1 no disponible");
        return;
    }
    
    // Detectar píxeles una sola vez
    const binaryGrid = reja1.detectarPixelesActivos(reja1.canvases[0]);
    
    const thresholds = [0.2, 0.5, 0.8];
    
    thresholds.forEach(threshold => {
        const contours = isoContours(binaryGrid, threshold);
        console.log(`📐 Threshold ${threshold}: ${contours.length} contornos detectados`);
        
        contours.forEach((contour, index) => {
            const area = calcularAreaPoligono(contour);
            console.log(`     Contorno ${index}: ${contour.length} puntos, área ≈ ${area.toFixed(0)}px²`);
        });
    });
    
    console.log("💡 ¿Cuál threshold detecta menos contornos grandes (celdas vacías)?");
    console.log("   Usa: cambiarThreshold(0.2) o cambiarThreshold(0.8) para probar");
};

/**
 * Cambia el threshold y recalcula polígonos
 */
window.cambiarThreshold = function(nuevoThreshold) {
    console.log(`🔧 Cambiando threshold a ${nuevoThreshold}...`);
    
    // Pausar automáticamente
    window.pausarParaDiagnostico();
    
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    if (reja1) {
        reja1.config.thresholdContornos = nuevoThreshold;
        reja1.config.configPoligonos.debugMode = true; // Activar debug temporal
        reja1.calcularPoligonos();
        console.log(`✅ Reja1: ${reja1.config.poligonosColision.length} polígonos con threshold ${nuevoThreshold}`);
    }
    
    if (reja2) {
        reja2.config.thresholdContornos = nuevoThreshold;
        reja2.config.configPoligonos.debugMode = true; // Activar debug temporal
        reja2.calcularPoligonos();
        console.log(`✅ Reja2: ${reja2.config.poligonosColision.length} polígonos con threshold ${nuevoThreshold}`);
    }
    
    // Mostrar resultado visualmente con duración extendida
    window.activarVisualizacionPoligonos(true);
    
    console.log("👀 Compara visualmente: ¿Los polígonos blancos están solo en los barrotes ahora?");
    console.log("💡 Para reanudar: reanudarDespuesDiagnostico()");
};

window.verificarCoherenciaSAT = function() {
    console.log("🔍 [DEBUG] Verificando coherencia SAT vs Visualización...");
    
    const nivel = window.gameInstance ? window.gameInstance.currentLevel : 0;
    if (nivel !== 3) {
        console.log("⚠️ Solo disponible en nivel 3");
        return;
    }
    
    const ballPosition = getPelotaPosition ? getPelotaPosition() : null;
    const ballState = getPelotaState ? getPelotaState() : null;
    
    if (!ballPosition || !ballState) {
        console.log("⚠️ No se puede obtener posición/estado de pelota");
        return;
    }
    
    const ballData = {
        x: ballPosition.x,
        y: ballPosition.y,
        radius: ballState.radio || 8
    };
    
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    console.log(`🎯 Pelota: (${ballData.x.toFixed(1)}, ${ballData.y.toFixed(1)}) radio=${ballData.radius}`);
    
    if (reja1) {
        const collision1 = reja1.detectarColisionPelota(ballData);
        console.log(`🔴 Reja1: ${collision1 ? 'COLISIÓN' : 'sin colisión'} - ${reja1.config.poligonosColision.length} polígonos`);
        console.log(`   Transformaciones: posX=${reja1.posX.toFixed(1)} posY=${reja1.posY.toFixed(1)} rot=${(reja1.rot*180/Math.PI).toFixed(1)}°`);
    }
    
    if (reja2) {
        const collision2 = reja2.detectarColisionPelota(ballData);
        console.log(`🔵 Reja2: ${collision2 ? 'COLISIÓN' : 'sin colisión'} - ${reja2.config.poligonosColision.length} polígonos`);
        console.log(`   Transformaciones: posX=${reja2.posX.toFixed(1)} posY=${reja2.posY.toFixed(1)} rot=${(reja2.rot*180/Math.PI).toFixed(1)}°`);
    }
    
    // Mostrar visualización para comparar
    window.pausarParaDiagnostico();
    window.activarVisualizacionPoligonos(true);
    
    console.log("💡 Compara visualmente: ¿Los polígonos blancos coinciden con donde detecta colisión?");
    console.log("💡 Para reanudar: reanudarDespuesDiagnostico()");
};

console.log("📦 Sistema de Grid cargado - Multi-nivel con GridObj y polígonos integrados");
console.log("🎨 [DEBUG] Funciones disponibles (pausan automáticamente):");
console.log("   🔍 DIAGNÓSTICO:");
console.log("     diagnosticarDeteccionPoligonos() - Ver qué está detectando");
console.log("     probarThresholds() - Probar diferentes configuraciones");
console.log("   🔧 AJUSTES:");
console.log("     cambiarThreshold(0.2) - Cambiar a threshold 0.2");
console.log("     cambiarThreshold(0.8) - Cambiar a threshold 0.8");
console.log("   👀 VISUALIZACIÓN:");
console.log("     debugShowPolygons() - Mostrar polígonos manualmente");
console.log("     verificarCoherenciaSAT() - Verificar coherencia SAT");
console.log("   ⏸️ CONTROL:");
console.log("     pausarParaDiagnostico() - Pausar juego");
console.log("     reanudarDespuesDiagnostico() - Reanudar juego");
console.log("     estadoDebugPoligonos() - Estado del sistema");