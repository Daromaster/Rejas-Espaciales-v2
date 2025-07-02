// Grid.js - Sistema de rejas espaciales V2 - P2b

import { GAME_CONFIG, LEVELS_CONFIG, Utils } from './config.js';
import { relojJuego } from './relojJuego.js';

// === VARIABLES PRINCIPALES ===
let configGrid = null; // Configuración única para todos los niveles
let gridCanvases = []; // Array de canvas virtuales para composición
let transformMatrix = null; // Matriz de transformación para cálculos
let distanciaMaxima = 200; // Variable global para viaje de pelota

// === BANDERAS DE INICIALIZACIÓN POR NIVEL ===
let initFlagsLevel2 = false; // Bandera para inicializar variables del nivel 2 solo una vez

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
            
            // Dibujar líneas verticales
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
            
            console.log("✨ Reja base nivel 1 dibujada CORRECTAMENTE en gridCanvases[1]");
            break;
        }
        
        case 2: {
            // NIVEL 2: Misma reja base que nivel 1 (la diferencia está en la rotación)
            configGrid = calcularConfiguracionGrid(width, height, 2);
            
            // CANVAS BASE (1): Reja sin transformaciones (igual que nivel 1 pero con posible color diferente)
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
            
            // Dibujar líneas verticales
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
            
            console.log("✨ Reja base nivel 2 dibujada CORRECTAMENTE en gridCanvases[1] con color verde");
            break;
        }
        
        default:
            console.warn(`⚠️ Nivel ${level} no implementado`);
            break;
    }
}

// === COMPOSICIÓN CON TRANSFORMACIONES (CADA FRAME) ===
function composeGrid(level, alpha = 1.0) {
    // INTERPOLACIÓN ENTRE ESTADOS ANTERIOR Y ACTUAL
    const interpolatedState = {
        offsetX: Utils.lerp(gridState.previous.offsetX, gridState.current.offsetX, alpha),
        offsetY: Utils.lerp(gridState.previous.offsetY, gridState.current.offsetY, alpha),
        rotationAngle: Utils.lerp(gridState.previous.rotationAngle, gridState.current.rotationAngle, alpha)
    };
    
    switch (level) {
        case 1: {
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
            const amplitudeY = 40;        // Amplitud vertical de flotación
            const amplitudeX = 45;        // Amplitud horizontal de flotación
            const frequencyY = 0.00015;   // Frecuencia vertical
            const frequencyX = 0.0001;    // Frecuencia horizontal
            const speed = 1;              // Velocidad general de flotación
            const phaseY = 0;             // Fase inicial Y
            const phaseX = Math.PI / 2;   // Fase inicial X
            
            // --- PARÁMETROS DE ROTACIÓN ---
            const DEG_TO_RAD = Math.PI / 180;
            const TARGET_ANGLE_INITIAL = -30 * DEG_TO_RAD;   // -30 grados inicial
            const PENDULUM_ANGLE = 30 * DEG_TO_RAD;          // ±30 grados péndulo
            const INITIAL_ROTATION_SPEED = 20 * DEG_TO_RAD;  // Velocidad inicial (20°/seg)
            const PENDULUM_SPEED = 20 * DEG_TO_RAD;          // Velocidad del péndulo (45°/seg)
            const ACCELERATION_START_TIME = 35000;           // 35 segundos (quedan 25)
            const HORARIO_ACCEL_RATE = 5 * DEG_TO_RAD;      // Aceleración horaria (60°/seg²)
            const MAX_ROTATION_SPEED = 30 * DEG_TO_RAD;     // Velocidad máxima (180°/seg)
            
            // ============================================================================
            // 🏗️ INICIALIZACIÓN DE VARIABLES PERSISTENTES (SOLO UNA VEZ)
            // ============================================================================
            
            // Variables estáticas que persisten entre frames (SOLO se inicializan UNA vez)
            if (!initFlagsLevel2) {
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
                
                initFlagsLevel2 = true; // Marcar como inicializado
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
            
            const dt = deltaTime / 1000; // Delta time en segundos
            
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
                    
                    // Normalizar ángulo para evitar overflow
                    while (state.currentAngle > Math.PI * 2) {
                        state.currentAngle -= Math.PI * 2;
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
            // === MOTOR DE MOVIMIENTO NIVEL 3: MOVIMIENTO ELÍPTICO (EJEMPLO FUTURO) ===
            // Parámetros completamente diferentes
            const ellipseData = MathUtils.ellipticalMotion(
                currentTime * 0.8,  // Velocidad diferente
                0.0012,             // Frecuencia X elipse
                0.0008,             // Frecuencia Y elipse  
                35,                 // Amplitud X elipse
                20,                 // Amplitud Y elipse
                0,                  // Fase X
                Math.PI / 4         // Fase Y diferente
            );
            
            gridState.current.offsetX = ellipseData.x;
            gridState.current.offsetY = ellipseData.y;
            
            // === MOTOR DE ROTACIÓN PENDULAR NIVEL 3 ===
            const pendulumAmplitude = Math.PI / 4; // 45 grados máximo
            const pendulumFreq = 0.0005;
            gridState.current.rotationAngle = MathUtils.sineWave(
                currentTime, 
                pendulumFreq, 
                pendulumAmplitude
            );
            
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
    if (level === 2) {
        initFlagsLevel2 = false; // Permitir reinicialización de variables del nivel 2
        // Limpiar estado global si existe
        if (window.gridLevel2State) {
            delete window.gridLevel2State;
        }
        console.log("🎯 Banderas del nivel 2 reseteadas para reinicialización");
    }
    
    // Inicializar estados
    gridState.previous = { offsetX: 0, offsetY: 0, rotationAngle: 0, timestamp: 0 };
    gridState.current = { offsetX: 0, offsetY: 0, rotationAngle: 0, timestamp: performance.now() };
    
    // DIBUJAR REJA BASE (SOLO UNA VEZ)
    
    // Preparar canvas de composición
    switch (level) {
        case 1:
        case 2:
        case 3:
            ensureGridCanvas(1); // Canvas para composición
            ensureGridCanvas(2); // Canvas para composición
            break;
        default:
            break;
    }

    dibujarRejaBase(level);

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

// Mensaje de ayuda para debug
console.log("🧪 [DEBUG] Funciones de testing nivel 2 disponibles:");
console.log("   debugSimulateGameStart() - Simular inicio de cronómetro");
console.log("   debugRotationStatus() - Ver estado actual de rotación");
console.log("   debugForcePhase(0|1|2) - Forzar fase específica");

console.log('Grid.js V2 P2b IMPLEMENTADO - Motores de movimiento por nivel con personalidad propia');