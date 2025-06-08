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

// Variables para fixed time step
const FIXED_UPDATE_RATE = 30; // 30 actualizaciones por segundo
const FIXED_TIME_STEP = 1000 / FIXED_UPDATE_RATE;
let accumulator = 0;
let lastFixedUpdateTime = performance.now();
let gameStartTime = 0; // Nueva variable para tiempo absoluto

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
    gameStartTime = performance.now(); // Inicializar tiempo de inicio
    gameState.stateStartTime = gameStartTime; // Nuevo: tiempo cuando inició el estado actual
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
    const frameTime = currentTime - lastFixedUpdateTime;
    lastFixedUpdateTime = currentTime;
    
    // Limitar frameTime para evitar espirales de muerte
    const maxFrameTime = 250; // máximo 250ms de frame time
    const deltaTime = Math.min(frameTime, maxFrameTime);
    
    // Acumular el tiempo transcurrido
    accumulator += deltaTime;
    
    // Actualizar la lógica en pasos fijos
    while (accumulator >= FIXED_TIME_STEP) {
        updateGameLogic(FIXED_TIME_STEP);
        accumulator -= FIXED_TIME_STEP;
    }
    
    // El render siempre ocurre en cada frame
    render();
    
    // Actualizar métricas de rendimiento si está disponible el sistema
    if (window.shootingSystem && window.shootingSystem.performanceMonitor) {
        if (typeof updatePerformanceMetrics === 'function') {
            updatePerformanceMetrics();
        }
    }
    
    // Continuar el loop
    window.gameLoopRequestId = requestAnimationFrame(gameLoop);
}

// Nueva función para manejar toda la lógica del juego
function updateGameLogic(deltaTime) {
    const currentTime = performance.now();
    
    // Actualizar la rotación de la reja si la función está disponible
    if (typeof window.updateGridRotation === 'function') {
        window.updateGridRotation(deltaTime);
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
            
            // Solo incrementar el tiempo si la pelota está en el destino
            if (ballMovement.isAtDestination()) {
                // En lugar de acumular deltaTime, usamos tiempo absoluto
                const tiempoEnEstado = currentTime - gameState.stateStartTime;
                
                if (tiempoEnEstado >= TIEMPO_EN_DESTINO) {
                    // En nivel 1 siempre alterna entre cubierto y descubierto
                    gameState.currentState = (gameState.currentState === "covered") ? "uncovered" : "covered";
                    gameState.stateStartTime = currentTime; // Actualizar tiempo de inicio del nuevo estado
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
            const CANT_PELOTAS  = 24 + 10;       // valor aprox. medido para los parametros 300,700, 0.5 + 3 para aumentar la compensacion a descubierta

            const TIEMPO_DESCUBIERTO_BUSCADO = (TIEMPO_MINIMO + TIEMPO_MAXIMO) / 2 * ((1-PROB_CUBIERTO) *CANT_PELOTAS );
            
            // Obtener tiempo restante actual
            const tiempoRestante = getRemainingTime();

            // Nueva lógica para activar la contabilización basada en tiempo restante
            if (!contabilizandoTiempo && tiempoRestante < 60000) {
                contabilizandoTiempo = true;
                totalTiempoDescubierto = 0; // Reiniciamos el contador por seguridad
            }

            // Si el juego no ha comenzado o quedan más de 15 segundos
            const TIEMPO_COMPENSACION = 15000; // 15 segundos para compensación
            if (tiempoRestante > TIEMPO_COMPENSACION) {
                // Solo incrementar el tiempo si la pelota está en el destino
                if (ballMovement.isAtDestination()) {
                    // En lugar de acumular deltaTime, usamos tiempo absoluto
                    const tiempoEnEstado = currentTime - gameState.stateStartTime;
                    
                    // Generar tiempo aleatorio para este destino si no existe
                    if (!gameState.currentDestinoDuration) {
                        const tiempoPlanificado = getRandomDestinationTime(TIEMPO_MINIMO, TIEMPO_MAXIMO);
                        gameState.currentDestinoDuration = tiempoPlanificado;
                        
                        // Si el juego ya comenzó y estamos en estado descubierto, acumular el tiempo planificado
                        if (contabilizandoTiempo && gameState.currentState === "uncovered") {
                            totalTiempoDescubierto += tiempoPlanificado;
                            
                        }
                    }
                    
                    // Si cumplió el tiempo en el destino actual
                    if (tiempoEnEstado >= gameState.currentDestinoDuration) {
                        // En nivel 2 el próximo estado es aleatorio
                        const nuevoEstado = getNextDestinationState(PROB_CUBIERTO);
                        gameState.currentState = nuevoEstado;
                        gameState.stateStartTime = currentTime; // Actualizar tiempo de inicio del nuevo estado
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
            } else {
                // ═══════════════════════════════════════════════════════════
                // ÚLTIMOS 15 SEGUNDOS - FASE DE COMPENSACIÓN
                // ═══════════════════════════════════════════════════════════
                if (!window.compensacionIniciada) {
                    window.compensacionIniciada = true;
                    
                    // Calcular tiempos de compensación
                    const TIEMPO_VIAJE_PELOTA = 1500; // ms estimado que tarda la pelota en viajar
                    const CANTIDAD_PELOTAS = 3.5;  // tiempo para descontar por viaje de polotas
                    const TIEMPO_TOTAL_VIAJES = TIEMPO_VIAJE_PELOTA * CANTIDAD_PELOTAS;
                    
                    const tiempoFaltante = TIEMPO_DESCUBIERTO_BUSCADO - totalTiempoDescubierto;
                    const Txxx = Math.max(tiempoFaltante, 50); // Tiempo mínimo 50ms si da negativo
                    const Cxxx = Math.max(TIEMPO_COMPENSACION - TIEMPO_TOTAL_VIAJES - Txxx, 50); // Tiempo restante para estado cubierto
                    
                    // Crear secuencia de tiempos para los últimos 15 segundos
                    window.secuenciaCompensacion = [
                        { estado: "uncovered", duracion: Math.max(Math.floor(Txxx / 2), 50) },
                        { estado: "covered", duracion: Math.max(Math.floor(Cxxx / 2), 50) },
                        { estado: "covered", duracion: Math.max(Math.floor(Cxxx / 2), 50) },
                        { estado: "uncovered", duracion: Math.max(Math.floor(Txxx / 2), 50) },
                        { estado: "uncovered", duracion: Math.max(Txxx, 50) }  // Última usa todo el Txxx restante
                    ];
                    
                    window.indiceSecuenciaActual = 0;
                    window.tiempoEnSecuenciaActual = 0;
                    
                    console.log("╔════ INICIO COMPENSACIÓN FINAL ════╗ tiempo descubierto acumulado:", totalTiempoDescubierto);
                    console.log("║ Tiempo restante:", tiempoRestante.toFixed(0), "ms");
                    console.log("║ Tiempo acumulado descubierto:", totalTiempoDescubierto.toFixed(0), "ms");
                    console.log("║ Tiempo objetivo descubierto:", TIEMPO_DESCUBIERTO_BUSCADO.toFixed(0), "ms");
                    console.log("║ Tiempo faltante:", tiempoFaltante.toFixed(0), "ms");
                    console.log("║ Tiempo total viajes (5 pelotas):", TIEMPO_TOTAL_VIAJES, "ms");
                    console.log("╠════ SECUENCIA PLANIFICADA ════╣");
                    window.secuenciaCompensacion.forEach((seq, idx) => {
                        console.log(`║ ${idx}: ${seq.estado.toUpperCase()} - ${seq.duracion}ms`);
                    });
                    console.log("╚══════════════════════════════╝");

                    // Forzar el primer estado inmediatamente
                    const primerEstado = window.secuenciaCompensacion[0];
                    gameState.currentState = primerEstado.estado;
                    if (gameState.currentState === "covered") {
                        const nuevoTarget = ballMovement.selectRandomCoveredTarget();
                        console.log("⭐ Primer estado CUBIERTO forzado, target:", nuevoTarget);
                    } else {
                        const nuevoTarget = ballMovement.selectRandomUncoveredTarget();
                        console.log("⭐ Primer estado DESCUBIERTO forzado, target:", nuevoTarget);
                    }
                    ballMovement.resetTimeAtDestination();
                }
                
                // Ejecutar la secuencia de compensación
                if (window.secuenciaCompensacion && window.indiceSecuenciaActual < window.secuenciaCompensacion.length) {
                    const secuenciaActual = window.secuenciaCompensacion[window.indiceSecuenciaActual];
                    window.tiempoEnSecuenciaActual += deltaTime;
                    
                    // Log del progreso actual (solo cuando cambia de estado)
                    if (window.indiceSecuenciaActual !== window.ultimoIndiceLoggeado) {
                        console.log(`▶ PASO ${window.indiceSecuenciaActual}:`,
                                  `\n   Estado: ${secuenciaActual.estado.toUpperCase()}`,
                                  `\n   Duración objetivo: ${secuenciaActual.duracion}ms`);
                        window.ultimoIndiceLoggeado = window.indiceSecuenciaActual;
                    }
                    
                    // Log cada segundo del progreso
                    if (Math.floor(window.tiempoEnSecuenciaActual / 1000) > Math.floor((window.tiempoEnSecuenciaActual - deltaTime) / 1000)) {
                        console.log(`   Progreso paso ${window.indiceSecuenciaActual}: ${window.tiempoEnSecuenciaActual.toFixed(0)}/${secuenciaActual.duracion}ms`);
                    }
                    
                    if (window.tiempoEnSecuenciaActual >= secuenciaActual.duracion) {
                        console.log(`✓ Completado paso ${window.indiceSecuenciaActual} (${secuenciaActual.estado})`);
                        
                        // Pasar al siguiente estado en la secuencia
                        window.tiempoEnSecuenciaActual = 0;
                        window.indiceSecuenciaActual++;
                        
                        if (window.indiceSecuenciaActual < window.secuenciaCompensacion.length) {
                            const siguienteSecuencia = window.secuenciaCompensacion[window.indiceSecuenciaActual];
                            gameState.currentState = siguienteSecuencia.estado;
                            
                            // Asegurar que cada cambio tenga un nuevo destino aleatorio
                            if (gameState.currentState === "covered") {
                                const nuevoTarget = ballMovement.selectRandomCoveredTarget();
                                console.log(`➔ Nuevo target CUBIERTO para paso ${window.indiceSecuenciaActual}:`, nuevoTarget);
                            } else {
                                const nuevoTarget = ballMovement.selectRandomUncoveredTarget();
                                console.log(`➔ Nuevo target DESCUBIERTO para paso ${window.indiceSecuenciaActual}:`, nuevoTarget);
                            }
                            ballMovement.resetTimeAtDestination();
                            currentTargetForDebugging = ballMovement.config.currentTarget;
                        }
                    }
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
                // En lugar de acumular deltaTime, usamos tiempo absoluto
                const tiempoEnEstado = currentTime - gameState.stateStartTime;
                
                if (tiempoEnEstado >= TIEMPO_EN_DESTINO) {
                    gameState.currentState = (gameState.currentState === "covered") ? "uncovered" : "covered";
                    gameState.stateStartTime = currentTime; // Actualizar tiempo de inicio del nuevo estado
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
    
    // Si hay nueva posición, actualizar la pelota
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
    
    // Actualizar el punto de depuración si está habilitado
    if (window.IS_LOCAL_ENVIRONMENT && currentTargetForDebugging) {
        if (typeof setBorradorTargetPoint === 'function') {
            setBorradorTargetPoint(currentTargetForDebugging);
        }
    }
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