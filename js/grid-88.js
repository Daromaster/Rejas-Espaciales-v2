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

// === ESTADO DE OBJETOS INTEGRADOS (NIVEL 3+) ===
let objetosGrid = {
    // Objeto nivel 3: cuadrado giratorio
    cuadradoGiratorio: {
        rotacion: 0,
        velocidadRotacion: 0.002, // rad/ms
        tamaño: 80,
        color: '#ff6b6b',
        activo: false
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
            // NIVEL 3: Reja con cuadrado giratorio integrado
            configGrid = calcularConfiguracionGrid(width, height, level);
            
            // CANVAS BASE (1): Reja sin transformaciones
            ensureGridCanvas(1);
            gridCanvases[1].clearRect(0, 0, width, height);
            gridCanvases[1].lineWidth = configGrid.grosorLinea;
            
            // Colores para nivel 3 (magenta/morado)
            const gradientColors = {
                dark: "rgb(32, 81, 40)",
                bright: "rgb(196, 25, 202)",
                border: "rgb(0, 0, 0)"
            };
            
            // Dibujar líneas horizontales
            for (let i = 0.5; i <= configGrid.cantidadVert + 0.5; i++) {
                const y = configGrid.baseY + i * configGrid.tamCuadrado;
                const grad = gridCanvases[1].createLinearGradient(0, y - configGrid.grosorLinea/2, 0, y + configGrid.grosorLinea/2);
                grad.addColorStop(0, gradientColors.border);
                grad.addColorStop(0.5, gradientColors.bright);
                grad.addColorStop(1, gradientColors.border);
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
                grad.addColorStop(0, gradientColors.border);
                grad.addColorStop(0.5, gradientColors.bright);
                grad.addColorStop(1, gradientColors.border);
                gridCanvases[1].strokeStyle = grad;
                gridCanvases[1].beginPath();
                gridCanvases[1].moveTo(x, configGrid.baseY);
                gridCanvases[1].lineTo(x, configGrid.baseY + (configGrid.cantidadVert + 1) * configGrid.tamCuadrado);
                gridCanvases[1].stroke();
            }
            
            console.log("✨ Reja base nivel 3 dibujada CORRECTAMENTE en gridCanvases[1]");
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
        

        case 3: {
            // NIVEL 3: Reja con cuadrado giratorio integrado
            // Según las especificaciones de "Objetos Ideas.md":
            // - gridCanvases[2] para dibujar el cuadrado
            // - gridCanvases[3] para pegar el cuadrado girando
            // - gridCanvases[4] para pegar reja base + cuadrado desplazado
            // - gridCanvases[5] para el conjunto con flotación
            
            // PASO 1: Dibujar cuadrado base en gridCanvases[2]
            ensureGridCanvas(2);
            gridCanvases[2].clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
            
            if (objetosGrid.cuadradoGiratorio.activo) {
                const obj = objetosGrid.cuadradoGiratorio;
                const centroX = GAME_CONFIG.LOGICAL_WIDTH / 2;
                const centroY = GAME_CONFIG.LOGICAL_HEIGHT / 2;
                const mitadTamaño = obj.tamaño / 2;
                
                // Dibujar cuadrado centrado
                gridCanvases[2].fillStyle = obj.color;
                gridCanvases[2].strokeStyle = '#ff0000';
                gridCanvases[2].lineWidth = 3;
                
                gridCanvases[2].fillRect(
                    centroX - mitadTamaño, 
                    centroY - mitadTamaño, 
                    obj.tamaño, 
                    obj.tamaño
                );
                gridCanvases[2].strokeRect(
                    centroX - mitadTamaño, 
                    centroY - mitadTamaño, 
                    obj.tamaño, 
                    obj.tamaño
                );
            }
            
            // PASO 2: Aplicar rotación al cuadrado en gridCanvases[3]
            ensureGridCanvas(3);
            gridCanvases[3].clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
            
            if (objetosGrid.cuadradoGiratorio.activo) {
                const centroX = GAME_CONFIG.LOGICAL_WIDTH / 2;
                const centroY = GAME_CONFIG.LOGICAL_HEIGHT / 2;
                
                gridCanvases[3].save();
                gridCanvases[3].translate(centroX, centroY);
                gridCanvases[3].rotate(objetosGrid.cuadradoGiratorio.rotacion);
                gridCanvases[3].translate(-centroX, -centroY);
                
                // Dibujar el cuadrado base rotado
                gridCanvases[3].drawImage(gridCanvases[2].canvas, 0, 0);
                
                gridCanvases[3].restore();
            }
            
            // PASO 3: Componer reja base + cuadrado en gridCanvases[4]
            ensureGridCanvas(4);
            gridCanvases[4].clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
            
            // Dibujar reja base primero
            gridCanvases[4].drawImage(gridCanvases[1].canvas, 0, 0);
            
            // Dibujar cuadrado giratorio encima
            if (objetosGrid.cuadradoGiratorio.activo) {
                gridCanvases[4].drawImage(gridCanvases[3].canvas, 0, 0);
            }
            
            // PASO 4: Aplicar flotación al conjunto en gridCanvases[5]
            ensureGridCanvas(5);
            gridCanvases[5].clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
            
            gridCanvases[5].save();
            gridCanvases[5].translate(interpolatedState.offsetX, interpolatedState.offsetY);
            
            // CAPTURAR MATRIZ DE TRANSFORMACIÓN
            transformMatrix = gridCanvases[5].getTransform();
            
            // Componer imagen final con flotación
            gridCanvases[5].drawImage(gridCanvases[4].canvas, 0, 0);
            
            gridCanvases[5].restore();
            
            return 5; // Retornar índice del canvas final para este nivel
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
            // === MOTOR DE MOVIMIENTO NIVEL 3: FLOTACIÓN + CUADRADO GIRATORIO ===
            
            // Inicialización una sola vez al empezar el nivel
            if (needsInitialization(level)) {
                console.log("🔧 Inicializando objetos nivel 3...");
                
                // Activar cuadrado giratorio
                objetosGrid.cuadradoGiratorio.activo = true;
                objetosGrid.cuadradoGiratorio.rotacion = 0;
                
                setLevelInitialized(level);
                console.log("✅ Objetos nivel 3 inicializados");
            }
            
            // --- PARÁMETROS DE FLOTACIÓN NIVEL 3 ---
            const amplitudeY = 25;        // Amplitud vertical diferente
            const amplitudeX = 20;        // Amplitud horizontal diferente
            const frequencyY = 0.0012;    // Frecuencia vertical
            const frequencyX = 0.0008;    // Frecuencia horizontal
            const speed = 1.0;            // Velocidad general
            const phaseY = Math.PI / 4;   // Fase inicial Y
            const phaseX = Math.PI / 6;   // Fase inicial X
            
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
            
            // Sin rotación de la reja en nivel 3
            gridState.current.rotationAngle = 0;
            
            // --- MOTOR DEL CUADRADO GIRATORIO ---
            if (objetosGrid.cuadradoGiratorio.activo) {
                // Actualizar rotación del cuadrado
                objetosGrid.cuadradoGiratorio.rotacion += objetosGrid.cuadradoGiratorio.velocidadRotacion * deltaTime;
                
                // Normalizar ángulo (0 a 2π)
                if (objetosGrid.cuadradoGiratorio.rotacion >= 2 * Math.PI) {
                    objetosGrid.cuadradoGiratorio.rotacion -= 2 * Math.PI;
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
// === FUNCIONES DE DEBUG PARA NIVEL 3 ===
// Función para mostrar estado del cuadrado giratorio
window.debugObjetoNivel3 = function() {
    if (!objetosGrid.cuadradoGiratorio.activo) {
        console.log("🧪 [DEBUG] Cuadrado giratorio nivel 3 no está activo");
        return null;
    }
    
    const obj = objetosGrid.cuadradoGiratorio;
    const rotacionGrados = (obj.rotacion * 180 / Math.PI).toFixed(1);
    const velocidadGrados = (obj.velocidadRotacion * 180 / Math.PI * 1000).toFixed(1); // por segundo
    
    console.log("🧪 [DEBUG] Estado del cuadrado giratorio nivel 3:");
    console.log(`   Rotación actual: ${rotacionGrados}°`);
    console.log(`   Velocidad: ${velocidadGrados}°/s`);
    console.log(`   Tamaño: ${obj.tamaño}px`);
    console.log(`   Color: ${obj.color}`);
    console.log(`   Activo: ${obj.activo ? '✅ SÍ' : '❌ NO'}`);
    
    return {
        rotacion: rotacionGrados,
        velocidad: velocidadGrados,
        tamaño: obj.tamaño,
        color: obj.color,
        activo: obj.activo
    };
};

// Función para modificar velocidad del cuadrado giratorio
window.debugSetVelocidadCuadrado = function(gradosPorSegundo) {
    if (!objetosGrid.cuadradoGiratorio.activo) {
        console.log("🧪 [DEBUG] Cuadrado giratorio nivel 3 no está activo");
        return;
    }
    
    const radianesPorMs = (gradosPorSegundo * Math.PI / 180) / 1000;
    const velocidadAnterior = objetosGrid.cuadradoGiratorio.velocidadRotacion;
    
    objetosGrid.cuadradoGiratorio.velocidadRotacion = radianesPorMs;
    
    console.log(`🧪 [DEBUG] Velocidad del cuadrado cambiada:`);
    console.log(`   Anterior: ${(velocidadAnterior * 180 / Math.PI * 1000).toFixed(1)}°/s`);
    console.log(`   Nueva: ${gradosPorSegundo}°/s`);
    
    return window.debugObjetoNivel3();
};

// Función para mostrar estado completo del nivel 3
window.debugStatusNivel3 = function() {
    console.log("🧪 [DEBUG] Estado completo nivel 3:");
    console.log("=== GRID STATE ===");
    console.log(`   Offset X: ${gridState.current.offsetX.toFixed(1)}`);
    console.log(`   Offset Y: ${gridState.current.offsetY.toFixed(1)}`);
    console.log(`   Rotación grid: ${(gridState.current.rotationAngle * 180 / Math.PI).toFixed(1)}°`);
    
    console.log("=== OBJETOS GRID ===");
    window.debugObjetoNivel3();
    
    console.log("=== BANDERAS ===");
    console.log(`   Nivel 3 inicializado: ${initFlagsGrid.level3 ? '✅ SÍ' : '❌ NO'}`);
    
    return {
        gridState: gridState.current,
        objetosGrid: objetosGrid,
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
console.log("=== NIVEL 3 ===");
console.log("   debugObjetoNivel3() - Ver estado del cuadrado giratorio");
console.log("   debugSetVelocidadCuadrado(grados/s) - Cambiar velocidad del cuadrado");
console.log("   debugStatusNivel3() - Estado completo del nivel 3");

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
                // Limpiar objetos del nivel 3
                objetosGrid.cuadradoGiratorio.activo = false;
                objetosGrid.cuadradoGiratorio.rotacion = 0;
                console.log(`🎯 Objetos del nivel ${level} reseteados`);
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