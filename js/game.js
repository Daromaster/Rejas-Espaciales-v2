// Constante de versión del juego
const GAME_VERSION = "2.1.103";
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
    coveredDuration: 1000,  // segundos en estado cubierto
    uncoveredDuration: 1000, // segundos en estado descubierto
    lastFrameTime: 0,       // Último tiempo de frame para control preciso
    frameCount: 0           // Contador de frames para debugging
};

// Exportar gameState al objeto window para que sea accesible desde otros módulos
window.gameState = gameState;

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
            // NIVEL 1: LÓGICA EXACTA ANTERIOR (SIN CAMBIOS)
            // ═══════════════════════════════════════════════════════════
            
            // Solo incrementar el tiempo si la pelota está en el destino
            if (ballMovement.isAtDestination()) {
                gameState.stateTime += deltaTime; // Usar tiempo real en lugar de valor fijo
            }
            
            // Cambio de estado solo si la pelota ha estado suficiente tiempo en el destino
            if (gameState.currentState === "covered" && gameState.stateTime >= gameState.coveredDuration) {
                gameState.currentState = "uncovered";
                gameState.stateTime = 0;
                gameState.frameCount = 0;
                ballMovement.selectRandomUncoveredTarget();
                ballMovement.resetTimeAtDestination();
                currentTargetForDebugging = ballMovement.config.currentTarget;
                
            } else if (gameState.currentState === "uncovered" && gameState.stateTime >= gameState.uncoveredDuration) {
                gameState.currentState = "covered";
                gameState.stateTime = 0;
                gameState.frameCount = 0;
                ballMovement.selectRandomCoveredTarget();
                ballMovement.resetTimeAtDestination();
                currentTargetForDebugging = ballMovement.config.currentTarget;
            }
            
            // Actualizar posición de la pelota según el estado
            if (gameState.currentState === "covered") {
                newPosition = ballMovement.moveToCoveredTarget();
            } else { // Estado descubierto
                newPosition = ballMovement.moveToUncoveredTarget();
            }
            break;
        }
        
        case 2: {
            // ═══════════════════════════════════════════════════════════
            // NIVEL 2: TEMPORALMENTE COPIADO DE NIVEL 1 PARA DIAGNÓSTICO
            // ═══════════════════════════════════════════════════════════
            
            // Solo incrementar el tiempo si la pelota está en el destino
            if (ballMovement.isAtDestination()) {
                gameState.stateTime += deltaTime; // Usar tiempo real en lugar de valor fijo
            }
            
            // Cambio de estado solo si la pelota ha estado suficiente tiempo en el destino
            if (gameState.currentState === "covered" && gameState.stateTime >= gameState.coveredDuration) {
                gameState.currentState = "uncovered";
                gameState.stateTime = 0;
                gameState.frameCount = 0;
                ballMovement.selectRandomUncoveredTarget();
                ballMovement.resetTimeAtDestination();
                currentTargetForDebugging = ballMovement.config.currentTarget;
                
            } else if (gameState.currentState === "uncovered" && gameState.stateTime >= gameState.uncoveredDuration) {
                gameState.currentState = "covered";
                gameState.stateTime = 0;
                gameState.frameCount = 0;
                ballMovement.selectRandomCoveredTarget();
                ballMovement.resetTimeAtDestination();
                currentTargetForDebugging = ballMovement.config.currentTarget;
            }
            
            // Actualizar posición de la pelota según el estado
            if (gameState.currentState === "covered") {
                newPosition = ballMovement.moveToCoveredTarget();
            } else { // Estado descubierto
                newPosition = ballMovement.moveToUncoveredTarget();
            }
            break;
        }
        
        default: {
            // ═══════════════════════════════════════════════════════════
            // FALLBACK: Usar lógica de nivel 1 para niveles no implementados
            // ═══════════════════════════════════════════════════════════
            console.warn(`⚠️ Nivel ${currentLevel} no implementado, usando nivel 1`);
            
            // Exactamente el mismo código que case 1 (duplicado para seguridad)
            if (ballMovement.isAtDestination()) {
                gameState.stateTime += deltaTime;
            }
            
            if (gameState.currentState === "covered" && gameState.stateTime >= gameState.coveredDuration) {
                gameState.currentState = "uncovered";
                gameState.stateTime = 0;
                gameState.frameCount = 0;
                ballMovement.selectRandomUncoveredTarget();
                ballMovement.resetTimeAtDestination();
                currentTargetForDebugging = ballMovement.config.currentTarget;
                
            } else if (gameState.currentState === "uncovered" && gameState.stateTime >= gameState.uncoveredDuration) {
                gameState.currentState = "covered";
                gameState.stateTime = 0;
                gameState.frameCount = 0;
                ballMovement.selectRandomCoveredTarget();
                ballMovement.resetTimeAtDestination();
                currentTargetForDebugging = ballMovement.config.currentTarget;
            }
            
            if (gameState.currentState === "covered") {
                newPosition = ballMovement.moveToCoveredTarget();
            } else {
                newPosition = ballMovement.moveToUncoveredTarget();
            }
            break;
        }
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