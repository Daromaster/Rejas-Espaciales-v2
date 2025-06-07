// Constante de versión del juego
const GAME_VERSION = "2.1.105";
window.GAME_VERSION = GAME_VERSION;

// Test de edición - Comentario simple
// Segunda prueba de comentario
// Lógica principal del juego
let gameState = {
    isRunning: false,
    score: 0,
    level: 1,
    currentState: "covered", // Estado inicial: cubierto
    stateTime: 0,           // Tiempo en el estado actual
    coveredDuration: 1000,  // valor base de referencia para estado cubierto
    uncoveredDuration: 1000, // valor base de referencia para estado descubierto
    lastFrameTime: 0,       // Último tiempo de frame para control preciso
    frameCount: 0,          // Contador de frames para debugging
    // Configuraciones específicas por nivel
    level1: {
        coveredDuration: 950,
        uncoveredDuration: 950
    },
    level2: {
        getRandomDuration: function() {
            return Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
        },
        getRandomNextState: function() {
            return Math.random() < 0.5 ? "covered" : "uncovered";
        }
    }
};

// Exportar gameState al objeto window para que sea accesible desde otros módulos
window.gameState = gameState;

// Función auxiliar para obtener la duración según el nivel y estado
function getDurationForState(level, state) {
    switch(level) {
        case 1:
            return state === "covered" ? gameState.level1.coveredDuration : gameState.level1.uncoveredDuration;
        case 2:
            return gameState.level2.getRandomDuration();
        default:
            return state === "covered" ? gameState.coveredDuration : gameState.uncoveredDuration;
    }
}

// Función auxiliar para obtener el próximo estado según el nivel
function getNextState(level, currentState) {
    switch(level) {
        case 1:
            // Alternancia fija
            return currentState === "covered" ? "uncovered" : "covered";
        case 2:
            // Aleatorio
            return gameState.level2.getRandomNextState();
        default:
            return currentState === "covered" ? "uncovered" : "covered";
    }
}

function initGame() {
    // Inicializar estado del juego
    gameState.isRunning = true;
    gameState.score = 0;
    gameState.level = 1;
    gameState.currentState = "covered"; // Asegurar que el estado inicial sea "covered"
    gameState.stateTime = 0;
    
    // Inicializar posición de la pelota en el centro del canvas (o donde se decida)
    // Verificar que canvasBall esté disponible antes de usarlo
    if (!window.canvasBall) {
        console.error("canvasBall no está disponible. Verificar que renderer.js se haya cargado correctamente.");
        return;
    }
    const centerX = canvasBall.width / 2;
    const centerY = canvasBall.height / 2;
    ballMovement.config.currentPosition = { x: centerX, y: centerY };
    actualizarPosicionBall(centerX, centerY); // Dibuja la pelota en su posición inicial

    // Seleccionar y establecer el primer objetivo cubierto inmediatamente
    const primerObjetivoCubierto = ballMovement.selectRandomCoveredTarget();
    
    if (window.IS_LOCAL_ENVIRONMENT) { // Solo dibujar punto de depuración en entorno local
        if (primerObjetivoCubierto) {
            // Usar la nueva función del módulo borrador
            if (typeof setBorradorTargetPoint === 'function') {
                setBorradorTargetPoint(primerObjetivoCubierto);
            }
        }
    }
    
    gameState.lastFrameTime = performance.now();
    gameState.frameCount = 0;
    
    // Si ya había un loop ejecutándose, cancelarlo
    if (window.gameLoopRequestId) {
        console.log("Cancelando loop existente antes de iniciar uno nuevo:", window.gameLoopRequestId);
        window.cancelAnimationFrame(window.gameLoopRequestId);
        window.gameLoopRequestId = null;
    }
    
    // Iniciar bucle del juego unificado
    window.gameLoopRequestId = requestAnimationFrame(gameLoop);
    console.log("Nuevo loop de juego iniciado con ID:", window.gameLoopRequestId);
}

// Función para reiniciar el juego
function resetGame() {
    console.log("Reiniciando juego...");
    
    // Detener el bucle del juego actual
    gameState.isRunning = false;
    
    // Cancelar cualquier animación pendiente
    if (window.gameLoopRequestId) {
        console.log("Cancelando animación previa en resetGame:", window.gameLoopRequestId);
        window.cancelAnimationFrame(window.gameLoopRequestId);
        window.gameLoopRequestId = null;
    }
    
    // Limpiar todos los disparos activos
    if (window.shootingSystem) {
        window.shootingSystem.shots = [];
        
        // Reiniciar el sistema de tiempo si la función está disponible
        if (typeof window.resetGameTime === 'function') {
            window.resetGameTime();
        }
        
        // IMPORTANTE: NO resetear la variable infoShown
        // El panel informativo solo debe mostrarse al cargar la página
        // no al reiniciar el juego
    }
    
    // Pequeña pausa para asegurar que todo se detiene correctamente
    setTimeout(() => {
        // Reiniciar variables del juego
        gameState.score = 0;
        gameState.level = 1;
        gameState.currentState = "covered";
        gameState.stateTime = 0;
        gameState.frameCount = 0;
        
        // Reiniciar posición de la pelota
        if (!window.canvasBall) {
            console.error("canvasBall no está disponible en resetGame.");
            return;
        }
        const centerX = canvasBall.width / 2;
        const centerY = canvasBall.height / 2;
        ballMovement.config.currentPosition = { x: centerX, y: centerY };
        actualizarPosicionBall(centerX, centerY);
        
        // Reiniciar el color de la pelota
        if (typeof window.resetBallColor === 'function') {
            window.resetBallColor();
        }
        
        // Reiniciar sistemas relacionados
        if (typeof window.ballMovement.resetMovement === 'function') {
            window.ballMovement.resetMovement();
        } else {
            // Fallback si no existe la función específica
            ballMovement.config.currentTarget = null;
        }
        
        // Reiniciar dirección de movimiento de la pelota
        if (window.ballMovement.config.direction) {
            window.ballMovement.config.direction = { x: 0, y: 0 };
        }
        
        // Actualizar la puntuación en pantalla
        if (typeof window.updateScoreDisplay === 'function') {
            window.updateScoreDisplay();
        }
        
        // Iniciar el juego de nuevo
        gameState.isRunning = true;
        gameState.lastFrameTime = performance.now();
        
        // Seleccionar nuevo objetivo cubierto
        const nuevoObjetivo = ballMovement.selectRandomCoveredTarget();
        
        if (window.IS_LOCAL_ENVIRONMENT && typeof setBorradorTargetPoint === 'function') {
            if (nuevoObjetivo) {
                setBorradorTargetPoint(nuevoObjetivo);
            }
        }
        
        // Limpiar la bandera de reinicio si existe
        if (window.isGameRestarting) {
            window.isGameRestarting = false;
        }
        
        // Reiniciar el loop con un nuevo ID
        window.gameLoopRequestId = requestAnimationFrame(gameLoop);
        console.log("Nuevo loop de juego iniciado en resetGame con ID:", window.gameLoopRequestId);
        
        console.log("¡Juego reiniciado!");
    }, 100);
}

// Exportar la función de reinicio
window.resetGame = resetGame;

function gameLoop() {
    if (!gameState.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - gameState.lastFrameTime;
    gameState.lastFrameTime = currentTime;
    gameState.frameCount++;

    // Actualizar métricas de rendimiento si está disponible el sistema
    if (window.shootingSystem && window.shootingSystem.performanceMonitor) {
        const perfMon = window.shootingSystem.performanceMonitor;
        
        // Actualizar datos del frame actual para medición más precisa
        if (typeof updatePerformanceMetrics === 'function') {
            updatePerformanceMetrics();
        } else {
            // Método alternativo si la función específica no está disponible
            const frameDelta = currentTime - perfMon.lastFrameTime;
            perfMon.lastFrameTime = currentTime;
            
            // Verificar que el deltaTime no sea demasiado grande (por ejemplo, después de cambio de pestaña)
            if (frameDelta < 100) {
                // Calcular FPS actual y añadir al historial
                const currentFPS = 1000 / frameDelta;
                perfMon.frameRates.push(currentFPS);
                if (perfMon.frameRates.length > perfMon.samplingSize) {
                    perfMon.frameRates.shift();
                }
            }
        }
    }

    // Obtener nivel actual para el SELECT CASE principal
    const currentLevel = window.LevelManager ? window.LevelManager.getCurrentLevelInfo().level : 1;
    
    // Variables para almacenar la nueva posición y target de debugging
    let newPosition;
    let currentTargetForDebugging = ballMovement.config.currentTarget;
    
    // 🔥 SELECT CASE PRINCIPAL - TODO EL ALGORITMO DE ESTADOS POR NIVEL
    switch(currentLevel) {
        case 1: {
            // ═══════════════════════════════════════════════════════════
            // NIVEL 1: Alternancia fija con tiempos fijos
            // ═══════════════════════════════════════════════════════════
            const TIEMPO_EN_DESTINO = 950; // ms que debe permanecer en cada destino
            const PATRON_FIJO = true;      // true = alterna siempre entre cubierto y descubierto
            
            // Solo incrementar el tiempo si la pelota está en el destino
            if (ballMovement.isAtDestination()) {
                gameState.stateTime += deltaTime;
                
                // Si cumplió el tiempo en el destino actual
                if (gameState.stateTime >= TIEMPO_EN_DESTINO) {
                    // En nivel 1 siempre alterna entre cubierto y descubierto
                    gameState.currentState = (gameState.currentState === "covered") ? "uncovered" : "covered";
                    gameState.stateTime = 0;
                    gameState.frameCount = 0;
                    
                    // Seleccionar nuevo destino según el estado
                    if (gameState.currentState === "covered") {
                        ballMovement.selectRandomCoveredTarget();
                    } else {
                        ballMovement.selectRandomUncoveredTarget();
                    }
                    ballMovement.resetTimeAtDestination();
                    currentTargetForDebugging = ballMovement.config.currentTarget;
                }
            }
            break;
        }
        
        case 2: {
            // ═══════════════════════════════════════════════════════════
            // NIVEL 2: Selección y tiempos aleatorios
            // ═══════════════════════════════════════════════════════════
            const TIEMPO_MINIMO = 300;     // ms mínimo en un destino
            const TIEMPO_MAXIMO = 700;    // ms máximo en un destino
            const PROB_CUBIERTO = 0.5;     // Probabilidad de que el próximo sea cubierto
            const CANT_PELOTAS  = 24;       // valor aprox. medido para los parametros 300,700, 0.5

            const TIEMPO_DESCUBIERTO_BUSCADO = (TIEMPO_MINIMO + TIEMPO_MAXIMO) / 2 * ((1-PROB_CUBIERTO) *CANT_PELOTAS );
          
            
            // Solo incrementar el tiempo si la pelota está en el destino
            if (ballMovement.isAtDestination()) {
                gameState.stateTime += deltaTime;
                
                // Generar tiempo aleatorio para este destino si no existe
                if (!gameState.currentDestinoDuration) {
                    gameState.currentDestinoDuration = getRandomDestinationTime(TIEMPO_MINIMO, TIEMPO_MAXIMO);
                }
                
                // Si cumplió el tiempo en el destino actual
                if (gameState.stateTime >= gameState.currentDestinoDuration) {
                    // Solo contabilizar tiempo si el juego ya comenzó (primer disparo realizado)
                    if (window.shootingSystem && window.shootingSystem.gameStarted) {
                        // Activar la contabilización si aún no está activa
                        if (!contabilizandoTiempo) {
                            contabilizandoTiempo = true;
                            console.log("Iniciando contabilización de tiempo descubierto");
                        }

                        // Obtener tiempo restante del nivel
                        const tiempoRestante = getRemainingTime();
                        
                        // Si estamos en los últimos 10 segundos, mostrar el tiempo acumulado
                        if (tiempoRestante <= 10000 && tiempoRestante > 9900) {
                            console.log("🕒 Tiempo total descubierto acumulado:", totalTiempoDescubierto, "ms");
                        }
                    }

                    // En nivel 2 el próximo estado es aleatorio
                    const nuevoEstado = getNextDestinationState(PROB_CUBIERTO);
                    
                    // Si el juego ya comenzó y el nuevo estado es descubierto, acumular su tiempo planificado
                    if (contabilizandoTiempo && nuevoEstado === "uncovered") {
                        const tiempoPlanificado = getRandomDestinationTime(TIEMPO_MINIMO, TIEMPO_MAXIMO);
                        totalTiempoDescubierto += tiempoPlanificado;
                        console.log("Sumando tiempo planificado descubierto:", tiempoPlanificado, "ms");
                    }

                    gameState.currentState = nuevoEstado;
                    gameState.stateTime = 0;
                    gameState.frameCount = 0;
                    gameState.currentDestinoDuration = null; // Reset para el próximo destino
                    
                    // Seleccionar nuevo destino según el estado
                    if (gameState.currentState === "covered") {
                        ballMovement.selectRandomCoveredTarget();
                    } else {
                        ballMovement.selectRandomUncoveredTarget();
                    }
                    ballMovement.resetTimeAtDestination();
                    currentTargetForDebugging = ballMovement.config.currentTarget;
                }
            }
            break;
        }
        
        default: {
            // ═══════════════════════════════════════════════════════════
            // FALLBACK: Usar lógica de nivel 1
            // ═══════════════════════════════════════════════════════════
            console.warn(`⚠️ Nivel ${currentLevel} no implementado, usando nivel 1`);
            
            const TIEMPO_EN_DESTINO = 950;
            
            if (ballMovement.isAtDestination()) {
                gameState.stateTime += deltaTime;
                
                if (gameState.stateTime >= TIEMPO_EN_DESTINO) {
                    gameState.currentState = (gameState.currentState === "covered") ? "uncovered" : "covered";
                    gameState.stateTime = 0;
                    gameState.frameCount = 0;
                    
                    if (gameState.currentState === "covered") {
                        ballMovement.selectRandomCoveredTarget();
                    } else {
                        ballMovement.selectRandomUncoveredTarget();
                    }
                    ballMovement.resetTimeAtDestination();
                    currentTargetForDebugging = ballMovement.config.currentTarget;
                }
            }
            break;
        }
    }
    
    // Actualizar posición de la pelota según el estado actual
    if (gameState.currentState === "covered") {
        newPosition = ballMovement.moveToCoveredTarget();
    } else {
        newPosition = ballMovement.moveToUncoveredTarget();
    }
    
    if (newPosition) {
        actualizarPosicionBall(newPosition.x, newPosition.y);
        
        // Detectar estado real de la pelota usando el detector
        if (window.ballStateDetector) {
            const detectedMathState = window.ballStateDetector.detectStateMathematically(newPosition);
            const detectedPixelState = window.ballStateDetector.detectStateByPixels(newPosition);
            const detectedState = window.ballStateDetector.detectState(newPosition);
            
            // Actualizar los indicadores de estado en la capa de borrador
            if (typeof setBorradorStateIndicators === 'function') {
                setBorradorStateIndicators(detectedMathState, detectedPixelState);
            }
        }
    }
    
    // Actualizar punto de destino en la capa borrador (solo en entorno local)
    if (window.IS_LOCAL_ENVIRONMENT && typeof setBorradorTargetPoint === 'function') {
        if (currentTargetForDebugging) {
            setBorradorTargetPoint(currentTargetForDebugging);
        }
    }
    
    if (typeof render === 'function') {
        render();
    } else {
        console.error("Función render() no encontrada.");
    }

    // Guardar la referencia al ID de requestAnimationFrame para poder cancelarlo después
    window.gameLoopRequestId = requestAnimationFrame(gameLoop);
}

// Event listeners para el juego
window.addEventListener("DOMContentLoaded", () => {
    // initRenderer() DEBE llamarse antes que initGame() para que los canvas estén listos.
    // Asumiendo que initRenderer() es llamado por su propio DOMContentLoaded en renderer.js
    // y ese script se carga antes que game.js, o se llama explícitamente.
    initGame(); 
});

// Exportar funciones necesarias
window.initGame = initGame;

// Observador para detectar cambios en el DOM
// Nos permite identificar y manipular elementos añadidos dinámicamente
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Recorrer todos los nodos añadidos
            mutation.addedNodes.forEach((node) => {
                // Verificar si es el panel de fin de juego
                if (node.id === 'game-end-panel') {
                    console.log('Panel de fin de juego detectado');
                    handleEndGamePanel(node);
                }
            });
        }
    });
});

// Función para manejar el panel de fin de juego
function handleEndGamePanel(panel) {
    // Intentar encontrar el panel de ranking dentro del panel de fin de juego
    const rankingPanel = document.getElementById('ranking-list');
    
    if (rankingPanel) {
        console.log('Panel de ranking detectado');
        // Lógica específica para manipular el panel de ranking
    }
}

// Iniciar la observación del DOM
observer.observe(document.body, { childList: true });

function updateGame() {
    const currentLevel = gameState.currentLevel;
    
    if (gameState.gameOver || gameState.paused) {
        return;
    }

    // Actualizar tiempo de nivel
    gameState.levelDuration = Date.now() - gameState.levelStartTime;

    switch(currentLevel) {
        case 1: {
            // Lógica específica del nivel 1
            break;
        }
        
        case 2: {
            // Lógica específica del nivel 2
            break;
        }
        
        default: {
            console.warn(`⚠️ Nivel ${currentLevel} no implementado, usando nivel 1`);
            break;
        }
    }
}

// Inicializar el estado del juego
function init() {
    this.currentLevel = 1;
    this.currentSubLevel = 1;
    this.totalLevels = 2;
    this.stateTime = 0;
    this.coveredDuration = 1000;  // 1 segundo en estado cubierto
    this.uncoveredDuration = 1000; // 1 segundo en estado descubierto
    this.isCovered = false;
    this.isGameOver = false;
    this.score = 0;
    this.ballMovement = window.ballMovement;
    this.ballMovement.config.currentTarget = null;
    this.ballMovement.config.isAtDestination = false;
    console.log("Estado del juego inicializado");
}

// Exportar funciones necesarias
window.init = init;

// Función para generar tiempo aleatorio entre TIEMPO_MINIMO y TIEMPO_MAXIMO
function getRandomDestinationTime(minTime, maxTime) {
    return Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
}

// Función para determinar el próximo estado basado en PROB_CUBIERTO
function getNextDestinationState(probCubierto) {
    return (Math.random() < probCubierto) ? "covered" : "uncovered";
}

// Variables para tracking de tiempo descubierto
let totalTiempoDescubierto = 0;
let contabilizandoTiempo = false; 