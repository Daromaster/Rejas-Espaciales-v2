// Grid.js - Sistema de rejas espaciales V2 - P2b

import { GAME_CONFIG, LEVELS_CONFIG, Utils } from './config.js';
import { relojJuego } from './relojJuego.js';

// === VARIABLES PRINCIPALES ===
let configGrid = null; // Configuración única para todos los niveles
let gridCanvases = []; // Array de canvas virtuales para composición
let transformMatrix = null; // Matriz de transformación para cálculos
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
                
                // === CAPTURAR MATRIZ DE TRANSFORMACIÓN (DEL ÚLTIMO OBJETO RENDERIZADO) ===
                // Para compatibilidad con el sistema de coordenadas, usar transformMatrix de reja2 si existe
                if (reja2 && reja2.transformMatrix) {
                    transformMatrix = reja2.transformMatrix;
                } else if (reja1 && reja1.transformMatrix) {
                    transformMatrix = reja1.transformMatrix;
                } else {
                    // Fallback: matriz identidad
                    transformMatrix = new DOMMatrix();
                }
                
                // Debug ocasional para verificar renderizado
                if (Math.random() < 0.005) { // 0.5% de probabilidad
                    console.log(`🎯 [DEBUG] Nivel 3 GridObj renderizado:`);
                    console.log(`   Reja1 activa: ${reja1 ? reja1.activo : 'NO EXISTE'}`);
                    console.log(`   Reja2 activa: ${reja2 ? reja2.activo : 'NO EXISTE'}`);
                    console.log(`   Alpha: ${alpha.toFixed(3)}`);
                }
                
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
            // 🎯 INICIALIZACIÓN NIVEL 3 CON GRIDOBJ (SOLO UNA VEZ)
            // ============================================================================
            
            if (!initFlagsGrid.level3) {
                // Crear estado para las dos rejas GridObj
                window.gridLevel3StateNew = {
                    initialized: true,
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
                    reja2: {
                        id: 'reja2',
                        // Parámetros de flotación y rotación únicos para Reja2
                        amplitudeY: 20,
                        amplitudeX: 18,
                        frequencyY: 0.0010,
                        frequencyX: 0.0007,
                        speed: 1.2,
                        phaseY: Math.PI / 3,
                        phaseX: Math.PI / 6,
                        // Parámetros de rotación
                        rotationSpeed: 0.001,  // rad/ms
                        currentRotation: 0
                    }
                };
                
                initFlagsGrid.level3 = true;
                console.log("🎯 Nivel 3 GridObj: Estado de motores inicializado");
            }
            
            // ============================================================================
            // 🚀 MOTORES EXTERNOS PARA CONTROL DE REJAS GRIDOBJ
            // ============================================================================
            
            const state = window.gridLevel3StateNew;
            
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
            
            // === MOTOR EXTERNO PARA REJA2 (FLOTACIÓN + ROTACIÓN) ===
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
                
                // Calcular rotación para Reja2
                r2.currentRotation += r2.rotationSpeed * deltaTime;
                
                // Normalizar ángulo
                if (r2.currentRotation >= 2 * Math.PI) {
                    r2.currentRotation -= 2 * Math.PI;
                }
                
                // Controlar Reja2 externamente (flotación + rotación)
                reja2.setMovimiento(offsetX2, offsetY2, r2.currentRotation);
                reja2.updateLogic(deltaTime);
            }
            
            // === LIMPIAR GRIDSTATE GLOBAL (NO SE USA EN NIVEL 3 CON GRIDOBJ) ===
            gridState.current.offsetX = 0;
            gridState.current.offsetY = 0;
            gridState.current.rotationAngle = 0;
            
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
function applyTransformMatrix(x, y) {
    if (!transformMatrix) {
        return { x, y };
    }
    
    const transformedX = transformMatrix.a * x + transformMatrix.c * y + transformMatrix.e;
    const transformedY = transformMatrix.b * x + transformMatrix.d * y + transformMatrix.f;
    
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
            const reja1 = createGridObj('reja1', 'nivel3');
            reja1.setConfiguracionManual(2, 3); // 2 celdas horizontales, 3 verticales - SE DIBUJA CENTRADA AUTOMÁTICAMENTE
            reja1.init(width, height, level);
            console.log("✅ Reja1 (2x3) creada e inicializada - CENTRADA automáticamente");
            
            // === CREAR E INICIALIZAR REJA2 (3x4 CELDAS, FLOTACIÓN + ROTACIÓN) ===
            const reja2 = createGridObj('reja2', 'nivel3');
            reja2.setConfiguracionManual(3, 4); // 3 celdas horizontales, 4 verticales - SE DIBUJA CENTRADA AUTOMÁTICAMENTE
            reja2.init(width, height, level);
            console.log("✅ Reja2 (3x4) creada e inicializada - CENTRADA automáticamente");
            console.log(`   Canvas lógico: ${width}x${height}`);
            
            // Preparar canvas de composición mínimo (para compatibilidad)
            ensureGridCanvas(1); // Canvas base (no usado)
            ensureGridCanvas(2); // Canvas composición final
            
            console.log("🎯 Nivel 3 con GridObj inicializado correctamente");
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
export function getTransformMatrix() {
    return transformMatrix;
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
    constructor(id, tipoVariante = 'default') {
        this.id = id;
        this.tipoVariante = tipoVariante;
        
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
            poligonosColision: []
        };
        
        // === COLORES POR TIPO VARIANTE ===
        this.colores = this.initColoresPorTipo(tipoVariante);
        
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
        
        console.log(`🏗️ GridObj creado: ID=${id}, TipoVariante=${tipoVariante}`);
    }
    
    // === INICIALIZACIÓN DE COLORES POR TIPO VARIANTE ===
    initColoresPorTipo(tipo) {
        const tiposColores = {
            default: {
                dark: "rgb(0, 19, 24)",
                bright: "rgba(0, 255, 255, 1)"
            },
            nivel1: {
                dark: "rgb(0, 19, 24)",
                bright: "rgba(0, 255, 255, 1)"
            },
            nivel2: {
                dark: "rgb(0, 31, 20)",
                bright: "rgb(19, 231, 16)"
            },
            nivel3: {
                dark: "rgb(32, 81, 40)",
                bright: "rgb(196, 25, 202)",
                border: "rgb(0, 0, 0)"
            },
            // Futuros tipos para diferentes variantes
            metalico: {
                dark: "rgb(40, 40, 40)",
                bright: "rgb(200, 200, 200)"
            },
            dorado: {
                dark: "rgb(60, 45, 20)",
                bright: "rgb(255, 215, 0)"
            }
        };
        
        return tiposColores[tipo] || tiposColores.default;
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
    }
    
    // === MÉTODO DE DIBUJO POR DEFECTO (CENTRADO EN CANVAS COMO NIVEL 1 Y 2) ===
    dibujarRejaBasePorDefecto(ctx) {
        const colors = this.colores;
        
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
            
            console.log(`🔄 GridObj ${this.id}: Posición (${interpolatedState.posX.toFixed(1)}, ${interpolatedState.posY.toFixed(1)}) + Rotación ${(interpolatedState.rot * 180/Math.PI).toFixed(1)}°`);
        } else if (interpolatedState.posX !== 0 || interpolatedState.posY !== 0) {
            console.log(`📍 GridObj ${this.id}: Solo posición (${interpolatedState.posX.toFixed(1)}, ${interpolatedState.posY.toFixed(1)})`);
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
export function createGridObj(id, tipoVariante = 'default') {
    const gridObj = new GridObj(id, tipoVariante);
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
        console.log(`   ${id}: activo=${gridObj.activo}, inicializado=${gridObj.inicializado}, tipo=${gridObj.tipoVariante}`);
        console.log(`      posición=(${gridObj.posX.toFixed(1)}, ${gridObj.posY.toFixed(1)}), rotación=${(gridObj.rot * 180 / Math.PI).toFixed(1)}°`);
        console.log(`      config=${gridObj.config.cantHor}x${gridObj.config.cantVert}, celda=${gridObj.config.tamCuadrado ? gridObj.config.tamCuadrado.toFixed(1) : 'auto'}px`);
    });
    
    return {
        totalObjetos: gridObjectsRegistry.size,
        objetos: Array.from(gridObjectsRegistry.entries()).map(([id, obj]) => ({
            id,
            activo: obj.activo,
            inicializado: obj.inicializado,
            tipo: obj.tipoVariante,
            posicion: { x: obj.posX, y: obj.posY },
            rotacion: obj.rot * 180 / Math.PI
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

console.log("✅ CLASE GRIDOBJ IMPLEMENTADA - Objetos de reja independientes disponibles");
console.log("🧪 [DEBUG] Funciones disponibles:");
console.log("   debugGridObjNivel3() - Ver estado de objetos nivel 3");
console.log("   debugSetReja1Flotacion(y) - Mover Reja1 verticalmente");
console.log("   debugSetReja2Movimiento(x, y, grados) - Mover y rotar Reja2");
console.log("   debugGridObjs() - Ver estado detallado de todos los objetos");