// Sistema de efectos y disparos

// Configuración del sistema de disparos
const shootingSystem = {
    isActive: false,            // ¿Hay un disparo activo?
    startTime: 0,               // Tiempo en que se inició el disparo
    duration: 200,              // Duración en milisegundos (reducida a 200ms para mayor velocidad)
    cooldown: 250,              // Tiempo de espera entre disparos (reducido a 250ms para mayor frecuencia)
    lastShootTime: 0,           // Último momento en que se realizó un disparo
    startColor: 'rgba(255, 136, 0, 1)',    // Color naranja para el inicio del disparo
    endColor: 'rgba(225, 0, 255,0.7)',        // Color rojo para el final del disparo
    shots: [],                  // Array para almacenar los disparos activos
    startWidth: 10,             // Ancho del disparo en el origen (10 píxeles)
    endWidth: 2,                // Ancho del disparo en el destino (2 píxeles)
    shootButton: null,          // Referencia al botón de disparo
    isMobile: false,            // Indicador si es dispositivo móvil
    scoreDisplay: null,         // Elemento para mostrar la puntuación
    resetButton: null,          // Referencia al botón de reinicio
    audioButton: null,          // Referencia al botón de audio
    timeDisplay: null,          // Elemento para mostrar el tiempo
    gameStarted: false,         // Indica si el juego ha comenzado (primer disparo)
    gameStartTime: 0,           // Tiempo de inicio del juego
    gameTimer: null,            // Referencia al temporizador
    gameEnded: false,           // Indica si el juego ha terminado
    activeParticles: [],        // Array para almacenar todas las partículas activas
    infoShown: false,           // Indica si ya se mostró el panel de información inicial
    infoPanel: null,            // Referencia al panel de información
    // Sistema de detección de rendimiento
    performanceMonitor: {
        frameRates: [],         // Historial de framerates recientes
        lastFrameTime: 0,       // Tiempo del último frame para calcular FPS
        lowPerformanceMode: false, // Indicador de modo de bajo rendimiento
        frameRateThreshold: 50, // Umbral de FPS para considerar bajo rendimiento (ahora más alto para ser más estrictos)
        samplingSize: 30,       // Cantidad de muestras para promedio (reducido para decisiones más rápidas)
        checkInterval: 1000,    // Intervalo para comprobar rendimiento (ms) - más frecuente
        lastCheckTime: 0,       // Último momento en que se comprobó el rendimiento
        consecutiveLowFPS: 0,   // Contador de frames consecutivos con bajo FPS
        forceCheckAfterShot: true, // Forzar comprobación después de cada disparo
        debugElement: null,     // Elemento para mostrar información de debug (opcional)
        performanceTestedOnMobile: false // Indica si ya hemos realizado un test inicial en móvil
    },
    // Sistema de audio para efectos de sonido
    audio: {
        enabled: true,           // Si los efectos de sonido están habilitados
        shotSound: null,         // Sonido al disparar
        hitSound: null,          // Sonido al impactar la pelota
        missSound: null,         // Sonido al fallar el disparo
        volume: 0.7,             // Volumen predeterminado (0-1)
        muted: false,            // Si el audio está silenciado
        durations: {
            hit: 400,   // 400ms para el sonido de impacto
            miss: 350   // 350ms para el sonido de fallo
        },
        soundPools: {
            hit: [],
            miss: []
        }
    }
};

// Sistema de audio para cargar y reproducir efectos de sonido
function initAudioSystem() {
    console.log("Inicializando sistema de audio...");
    
    // Eliminar limitaciones de duración para permitir que los sonidos se reproduzcan completos
    shootingSystem.audio.durations = null;
    
    // Crear pool de sonidos para permitir múltiples reproducciones simultáneas
    shootingSystem.audio.soundPools = {
        hit: [],
        miss: []
    };
    
    // Cantidad de sonidos en cada pool
    const poolSize = 3;
    
    // Crear pool para sonido de impacto
    for (let i = 0; i < poolSize; i++) {
        const hitSound = new Audio("assets/audio/Disparo 2.mp3");
        hitSound.volume = shootingSystem.audio.volume;
        hitSound.load();
        shootingSystem.audio.soundPools.hit.push(hitSound);
    }
    
    // Crear pool para sonido de fallo
    for (let i = 0; i < poolSize; i++) {
        const missSound = new Audio("assets/audio/Zumbido 2 - Corto.mp3");
        missSound.volume = shootingSystem.audio.volume;
        missSound.load();
        shootingSystem.audio.soundPools.miss.push(missSound);
    }
    
    console.log("Sistema de audio inicializado correctamente con pools de sonido");
}

// Reproducir un efecto de sonido específico
function playSound(soundType, delay = 0) {
    // No reproducir si el audio está deshabilitado o silenciado
    if (!shootingSystem.audio.enabled || shootingSystem.audio.muted) {
        return;
    }
    
    // No hacer nada si se intenta reproducir el sonido de disparo
    if (soundType === 'shot') {
        return;
    }
    
    // Verificar que el tipo de sonido tenga un pool válido
    if (!shootingSystem.audio.soundPools || !shootingSystem.audio.soundPools[soundType]) {
        console.warn("Pool de sonido no disponible para:", soundType);
        return;
    }
    
    // Función para reproducir el sonido desde el pool
    const playSoundFromPool = () => {
        // Obtener el pool de sonidos correspondiente
        const soundPool = shootingSystem.audio.soundPools[soundType];
        
        // Buscar un sonido disponible en el pool (que no se esté reproduciendo)
        let sound = null;
        for (let i = 0; i < soundPool.length; i++) {
            if (soundPool[i].paused || soundPool[i].ended) {
                sound = soundPool[i];
                break;
            }
        }
        
        // Si no hay sonidos disponibles, usar el primero del pool (se interrumpirá)
        if (!sound && soundPool.length > 0) {
            sound = soundPool[0];
        }
        
        // Reproducir el sonido si se encontró uno
        if (sound) {
            // Reiniciar el sonido antes de reproducirlo
            sound.currentTime = 0;
            
            // Reproducir a volumen completo
            sound.volume = shootingSystem.audio.volume;
            
            // Intentar reproducir, manejando posibles errores
            sound.play().catch(err => {
                console.warn("Error al reproducir sonido:", err);
            });
        }
    };
    
    // Reproducir con o sin retraso
    if (delay > 0) {
        setTimeout(playSoundFromPool, delay);
    } else {
        playSoundFromPool();
    }
}

// Actualizar volumen de todos los sonidos en pools
window.setAudioVolume = function(volume) {
    // Asegurar que el volumen esté entre 0 y 1
    volume = Math.max(0, Math.min(1, volume));
    shootingSystem.audio.volume = volume;
    
    // Actualizar volumen en todos los sonidos de los pools
    if (shootingSystem.audio.soundPools) {
        // Recorrer cada pool
        Object.keys(shootingSystem.audio.soundPools).forEach(poolKey => {
            const pool = shootingSystem.audio.soundPools[poolKey];
            // Actualizar cada sonido en el pool
            pool.forEach(sound => {
                sound.volume = volume;
            });
        });
    }
};

// Función para inicializar efectos
function initEffects() {
    // Inicialización de efectos
    console.log("Sistema de efectos inicializado");
    
    // Inicializar sistema de audio
    initAudioSystem();
    
    // Detectar si es un dispositivo móvil
    shootingSystem.isMobile = detectMobileDevice();
    
    // En dispositivos móviles, activar modo de bajo rendimiento por defecto
    // y luego comprobar si el dispositivo puede manejar el modo completo
    if (shootingSystem.isMobile) {
        console.log("Dispositivo móvil detectado - Activando modo de bajo rendimiento por defecto");
        shootingSystem.performanceMonitor.lowPerformanceMode = true;
    }
    
    // Inicializar el monitor de rendimiento
    shootingSystem.performanceMonitor.lastFrameTime = performance.now();
    shootingSystem.performanceMonitor.lastCheckTime = performance.now();
    
    // Crear elemento de debug para FPS si estamos en entorno de desarrollo
    if (window.IS_LOCAL_ENVIRONMENT) {
        createPerformanceDebugDisplay();
    }
    
    // Configurar listener para la tecla espacio (disparo)
    window.addEventListener('keydown', handleKeyDown);
    
    // Crear y configurar el botón de disparo (para dispositivos táctiles)
    createShootButton();
    
    // Crear y configurar el botón de audio
    createAudioButton();
    
    // Crear y configurar el botón de reinicio
    createResetButton();
    
    // Crear y configurar el elemento de puntuación
    createScoreDisplay();
    
    // Crear y configurar el elemento de tiempo
    createTimeDisplay();
    
    // Actualizar instrucciones según el dispositivo
    updateInstructions();
    
    // Ajustar la interfaz para dispositivos móviles
    adjustUIForMobile();
    
    // Configurar detector de cambio de orientación
    window.addEventListener('resize', function() {
        // Esperar un momento para que se complete el cambio de tamaño
        setTimeout(adjustUIForMobile, 300);
    });
    
    // Listener específico para cambios de orientación en dispositivos móviles
    window.addEventListener('orientationchange', function() {
        console.log("Orientación cambiada - Ajustando la interfaz");
        // Dar un tiempo más largo para que el navegador actualice completamente las dimensiones
        setTimeout(adjustUIForMobile, 500);
    });
    
    // Reiniciar el sistema de disparos
    shootingSystem.isActive = false;
    shootingSystem.shots = [];
    
    // Reiniciar variables de tiempo
    shootingSystem.gameStarted = false;
    shootingSystem.gameStartTime = 0;
    shootingSystem.gameEnded = false;
    
    // Si existe un temporizador previo, detenerlo
    if (shootingSystem.gameTimer) {
        clearInterval(shootingSystem.gameTimer);
        shootingSystem.gameTimer = null;
    }
    
    // Mostrar panel de información inicial si no se ha mostrado antes y no es un reinicio desde el ranking
    if (!shootingSystem.infoShown && !window.isGameRestarting) {
        showInfoPanel();
    }
    
    // Realizar un test de rendimiento inicial (después de 2 segundos)
    setTimeout(performInitialPerformanceTest, 2000);
}

// Función para mostrar el panel de información inicial
function showInfoPanel() {
    // Crear un panel de información
    const infoPanel = document.createElement('div');
    infoPanel.id = 'info-panel';
    
    // Estilos del panel
    infoPanel.style.position = 'fixed';
    infoPanel.style.top = '50%';
    infoPanel.style.left = '50%';
    infoPanel.style.transform = 'translate(-50%, -50%)';
    infoPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    infoPanel.style.color = 'white';
    infoPanel.style.padding = '20px';
    infoPanel.style.borderRadius = '10px';
    infoPanel.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.5)';
    infoPanel.style.textAlign = 'center';
    infoPanel.style.zIndex = '3000';
    infoPanel.style.minWidth = '80%';
    infoPanel.style.maxWidth = '600px';
    infoPanel.style.cursor = 'pointer'; // Indicar que todo el panel es clickeable
    
    // Contenido del panel
    infoPanel.innerHTML = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 15px 0; font-size: 24px;">Instrucciones del Juego</h2>
        <p style="font-size: 18px; margin: 15px 0; line-height: 1.5;">El juego se trata de lograr dispararle a la pelota cuando <strong style="color: rgba(0, 255, 255, 1);">no está cubierta</strong> por los barrotes de la reja.</p>
        <p style="font-size: 16px; margin: 15px 0; line-height: 1.5;">Tienes <strong>1 minuto</strong> para conseguir la mayor cantidad de puntos posibles.</p>
        <p style="font-size: 16px; margin: 15px 0;">- Aciertos: <strong style="color: #00ff00;">+10 puntos</strong></p>
        <p style="font-size: 16px; margin: 15px 0;">- Fallos: <strong style="color: #ff0000;">Fallar el disparo puede restar puntos</strong></p>
        <p style="font-size: 16px; margin: 15px 0; color: rgba(0, 255, 255, 0.8);">Toca en cualquier parte para comenzar</p>
        <button id="start-game-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: 12px 25px; margin-top: 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 18px;">¡COMENZAR!</button>
    `;
    
    // Añadir panel al DOM
    document.body.appendChild(infoPanel);
    
    // Guardar referencia
    shootingSystem.infoPanel = infoPanel;
    
    // Función para cerrar el panel y comenzar el juego
    const closeInfoPanel = function() {
        // Registrar que el panel de información ya se mostró
        shootingSystem.infoShown = true;
        
        // Eliminar el panel de información
        if (infoPanel.parentNode) {
            document.body.removeChild(infoPanel);
        }
        
        // Permitir que el juego comience con el primer disparo
        console.log("Panel de información cerrado, el juego puede comenzar ahora");
    };
    
    // Configurar evento para el botón de inicio (para mantener compatibilidad)
    const startButton = document.getElementById('start-game-button');
    if (startButton) {
        startButton.addEventListener('click', function(e) {
            e.stopPropagation(); // Evitar que el clic se propague al panel
            closeInfoPanel();
        });
    }
    
    // Configurar evento para cerrar al hacer clic en cualquier parte del panel
    infoPanel.addEventListener('click', closeInfoPanel);
    
    // Configurar evento para dispositivos táctiles
    infoPanel.addEventListener('touchend', function(e) {
        e.preventDefault(); // Prevenir comportamiento predeterminado
        closeInfoPanel();
    });
}

// Función para crear un display de depuración de rendimiento
function createPerformanceDebugDisplay() {
    const debugElement = document.createElement('div');
    debugElement.id = 'performance-debug';
    
    // Estilos
    debugElement.style.position = 'absolute';
    debugElement.style.bottom = '10px';
    debugElement.style.left = '10px';
    debugElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    debugElement.style.color = 'white';
    debugElement.style.padding = '5px 10px';
    debugElement.style.borderRadius = '5px';
    debugElement.style.fontSize = '12px';
    debugElement.style.fontFamily = 'monospace';
    debugElement.style.zIndex = '9999';
    
    debugElement.textContent = 'FPS: -- | Modo: --';
    
    document.body.appendChild(debugElement);
    shootingSystem.performanceMonitor.debugElement = debugElement;
}

// Función para realizar un test inicial de rendimiento
function performInitialPerformanceTest() {
    if (!shootingSystem.isMobile || shootingSystem.performanceMonitor.performanceTestedOnMobile) {
        return;
    }
    
    console.log("Realizando test inicial de rendimiento en dispositivo móvil...");
    
    // Guardar el estado actual de partículas para restaurarlo después
    const previousParticleCount = 20;
    const testDuration = 3000; // 3 segundos
    const testPosition = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    };
    
    // Crear un conjunto de partículas de prueba
    createTestParticles(testPosition, previousParticleCount);
    
    // Iniciar la medición de rendimiento
    const startTime = performance.now();
    const frameRates = [];
    let lastFrameTime = startTime;
    let testFrame = 0;
    
    function measureFrame() {
        testFrame++;
        const now = performance.now();
        const deltaTime = now - lastFrameTime;
        lastFrameTime = now;
        
        // Calcular FPS actual
        const currentFPS = 1000 / deltaTime;
        frameRates.push(currentFPS);
        
        // Actualizar el visual de debug si existe
        if (shootingSystem.performanceMonitor.debugElement) {
            shootingSystem.performanceMonitor.debugElement.textContent = 
                `Test FPS: ${currentFPS.toFixed(1)} | Frame: ${testFrame}`;
        }
        
        // Continuar la prueba si no ha terminado
        if (now - startTime < testDuration) {
            requestAnimationFrame(measureFrame);
        } else {
            // La prueba ha terminado, analizar resultados
            finalizePerformanceTest(frameRates);
        }
    }
    
    // Iniciar la medición
    requestAnimationFrame(measureFrame);
}

// Crear partículas de prueba para el test de rendimiento
function createTestParticles(position, count) {
    // Crear partículas de diferentes tipos para simular carga real
    const types = ['chispa', 'metal', 'brillo', 'humo'];
    const colors = {
        chispa: ['rgba(255, 215, 0, 0.9)'],
        metal: ['rgba(192, 192, 192, 0.8)'],
        brillo: ['rgba(255, 255, 224, 0.9)'],
        humo: ['rgba(169, 169, 169, 0.3)']
    };
    
    for (let i = 0; i < count; i++) {
        const typeIndex = i % types.length;
        createSingleParticle(position, types[typeIndex], colors[types[typeIndex]]);
    }
}

// Finalizar el test de rendimiento y analizar resultados
function finalizePerformanceTest(frameRates) {
    // Descartar los primeros y últimos frames para mayor precisión
    const trimmedFrames = frameRates.slice(5, -5);
    
    // Calcular el promedio de FPS
    const avgFPS = trimmedFrames.reduce((sum, fps) => sum + fps, 0) / trimmedFrames.length;
    
    console.log(`Test de rendimiento completado. FPS promedio: ${avgFPS.toFixed(1)}`);
    
    // Determinar el modo basado en el resultado
    const newPerformanceMode = avgFPS < shootingSystem.performanceMonitor.frameRateThreshold;
    shootingSystem.performanceMonitor.lowPerformanceMode = newPerformanceMode;
    
    console.log(`Resultado del test: Modo de ${newPerformanceMode ? 'bajo' : 'alto'} rendimiento activado`);
    
    // Actualizar el visual de debug si existe
    if (shootingSystem.performanceMonitor.debugElement) {
        shootingSystem.performanceMonitor.debugElement.textContent = 
            `FPS: ${avgFPS.toFixed(1)} | Modo: ${newPerformanceMode ? 'Bajo' : 'Alto'}`;
    }
    
    // Marcar que ya hemos realizado el test inicial
    shootingSystem.performanceMonitor.performanceTestedOnMobile = true;
    
    // Limpiar todas las partículas de prueba
    clearAllParticles();
}

// Nueva función: Actualizar las métricas de rendimiento
function updatePerformanceMetrics() {
    const perfMon = shootingSystem.performanceMonitor;
    const now = performance.now();
    
    // Calcular el tiempo transcurrido desde el último frame
    const deltaTime = now - perfMon.lastFrameTime;
    perfMon.lastFrameTime = now;
    
    // Evitar valores extremos que pueden ocurrir en pausas o cambios de pestaña
    if (deltaTime > 100) {
        return; // Saltar este frame si el deltaTime es demasiado grande
    }
    
    // Calcular FPS actual
    const currentFPS = 1000 / deltaTime;
    
    // Añadir al historial (limitado al tamaño de muestreo)
    perfMon.frameRates.push(currentFPS);
    if (perfMon.frameRates.length > perfMon.samplingSize) {
        perfMon.frameRates.shift();
    }
    
    // Actualizar el contador de frames consecutivos con bajo FPS
    if (currentFPS < perfMon.frameRateThreshold) {
        perfMon.consecutiveLowFPS++;
    } else {
        perfMon.consecutiveLowFPS = 0;
    }
    
    // Si tenemos 5 frames consecutivos con bajo FPS, activar inmediatamente el modo bajo rendimiento
    if (perfMon.consecutiveLowFPS >= 5 && !perfMon.lowPerformanceMode) {
        perfMon.lowPerformanceMode = true;
        console.log(`Activación inmediata de modo bajo rendimiento. FPS actual: ${currentFPS.toFixed(1)}`);
        
        // Limpiar partículas existentes para mejorar rendimiento inmediatamente
        if (shootingSystem.activeParticles.length > 10) {
            clearAllParticles();
        }
    }
    
    // Comprobar el rendimiento cada X milisegundos
    if (now - perfMon.lastCheckTime > perfMon.checkInterval) {
        perfMon.lastCheckTime = now;
        
        // Solo evaluar si tenemos suficientes muestras
        if (perfMon.frameRates.length >= Math.min(10, perfMon.samplingSize / 2)) {
            // Calcular el promedio de FPS
            const avgFPS = perfMon.frameRates.reduce((sum, fps) => sum + fps, 0) / perfMon.frameRates.length;
            
            // Determinar si cambiamos el modo de rendimiento
            // Usamos umbrales diferentes para activar/desactivar para evitar cambios constantes
            let newPerformanceMode = perfMon.lowPerformanceMode;
            
            if (avgFPS < perfMon.frameRateThreshold - 5 && !perfMon.lowPerformanceMode) {
                // Cambiar a modo bajo rendimiento si el FPS es menor al umbral - 5
                newPerformanceMode = true;
            } else if (avgFPS > perfMon.frameRateThreshold + 10 && perfMon.lowPerformanceMode) {
                // Solo volver a alto rendimiento si supera el umbral por un buen margen (+10)
                newPerformanceMode = false;
            }
            
            // Si hay un cambio de modo, registrarlo
            if (newPerformanceMode !== perfMon.lowPerformanceMode) {
                perfMon.lowPerformanceMode = newPerformanceMode;
                console.log(`Cambiando a modo de ${newPerformanceMode ? 'bajo' : 'alto'} rendimiento. FPS promedio: ${avgFPS.toFixed(1)}`);
            }
            
            // Actualizar el visual de debug si existe
            if (perfMon.debugElement) {
                perfMon.debugElement.textContent = 
                    `FPS: ${avgFPS.toFixed(1)} | Modo: ${newPerformanceMode ? 'Bajo' : 'Alto'}`;
            }
        }
    }
}

// Crear un efecto de partículas cuando se dispara y se falla
function createParticleEffect(position) {
    if (!position) return;
    
    // Obtener el canvas y su contexto
    const canvas = document.getElementById('canvas-juego');
    if (!canvas) return;
    
    // Monitorear el rendimiento - forzar comprobación inmediata después de un disparo
    if (shootingSystem.performanceMonitor.forceCheckAfterShot) {
        shootingSystem.performanceMonitor.lastCheckTime = 0; // Forzar comprobación inmediata
    }
    updatePerformanceMetrics();
    
    // Número total de partículas basado en el rendimiento
    let particleCount;
    let particleTypes;
    
    if (shootingSystem.performanceMonitor.lowPerformanceMode) {
        // Modo de bajo rendimiento: mucho menos partículas y tipos más simples
        particleCount = 8; // Reducido aún más para dispositivos muy limitados
        
        particleTypes = [
            { type: 'chispa', count: 5 },      // Reducido a solo 5 chispas
            { type: 'metal', count: 3 }        // Y 3 fragmentos metálicos
        ];
        
        console.log("Usando sistema de partículas simplificado (modo bajo rendimiento)");
    } else {
        // Modo de rendimiento normal: sistema completo
        particleCount = 30;
        
        particleTypes = [
            { type: 'chispa', count: 15 },      // Chispas pequeñas y rápidas
            { type: 'metal', count: 7 },        // Fragmentos metálicos medianos
            { type: 'brillo', count: 5 },       // Destellos brillantes
            { type: 'humo', count: 3 }          // Pequeñas partículas de humo
        ];
    }
    
    // Colores para las partículas
    const colors = {
        chispa: [
            'rgba(255, 215, 0, 0.9)',       // Dorado brillante
            'rgba(255, 255, 255, 0.9)',     // Blanco brillante
            'rgba(255, 140, 0, 0.9)'        // Naranja brillante
        ],
        metal: [
            'rgba(192, 192, 192, 0.8)',     // Plata
            'rgba(169, 169, 169, 0.8)',     // Gris oscuro
            'rgba(105, 105, 105, 0.8)'      // Gris muy oscuro
        ],
        brillo: [
            'rgba(255, 255, 224, 0.9)',     // Amarillo claro
            'rgba(240, 230, 140, 0.9)',     // Caqui
            'rgba(250, 250, 210, 0.9)'      // Amarillo pálido
        ],
        humo: [
            'rgba(169, 169, 169, 0.3)',     // Gris oscuro transparente
            'rgba(119, 136, 153, 0.3)',     // Gris pizarra claro
            'rgba(211, 211, 211, 0.3)'      // Gris claro
        ]
    };
    
    // Crear diferentes tipos de partículas
    particleTypes.forEach(particleType => {
        for (let i = 0; i < particleType.count; i++) {
            createSingleParticle(position, particleType.type, colors[particleType.type]);
        }
    });
}

// Detectar si es un dispositivo móvil
function detectMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
}

// Actualizar instrucciones según el dispositivo
function updateInstructions() {
    const zonaInferior = document.getElementById('zona-inferior');
    if (zonaInferior) {
        if (shootingSystem.isMobile) {
            zonaInferior.innerHTML = '<p>Toca el botón <span style="color: #FF9500;">⚡</span> para Disparar | <span style="color: #FFA500;">🔇</span> para Audio | <span style="color: #5F9EA0;">↺</span> para Reiniciar</p>';
        } else {
            zonaInferior.innerHTML = '<p>Presiona <span style="background: #333; padding: 2px 5px; border-radius: 3px;">Space</span> para Disparar | <span style="background: #333; padding: 2px 5px; border-radius: 3px;">M</span> para Audio | <span style="background: #333; padding: 2px 5px; border-radius: 3px;">R</span> para Reiniciar</p>';
        }
    }
}

// Crear y configurar el botón de disparo
function createShootButton() {
    // Crear el botón si no existe
    if (!shootingSystem.shootButton) {
        const shootButton = document.createElement('div');
        shootButton.id = 'shoot-button';
        
        // Estilos del botón
        shootButton.style.position = 'absolute';
        shootButton.style.bottom = '5vh';
        shootButton.style.right = '5vh';
        shootButton.style.width = '15vmin';
        shootButton.style.height = '15vmin';
        shootButton.style.backgroundColor = 'rgba(255, 100, 0, 0.7)';
        shootButton.style.borderRadius = '50%';
        shootButton.style.display = 'flex';
        shootButton.style.alignItems = 'center';
        shootButton.style.justifyContent = 'center';
        shootButton.style.cursor = 'pointer';
        shootButton.style.zIndex = '1000';
        
        // Usar emoji o caracter unicode como alternativa
        shootButton.innerHTML = '<span style="color: white; font-size: 24px; transform: rotate(45deg);">⚡</span>';
        
        // Mostrar etiqueta "Disparar" junto al botón en dispositivos móviles
        if (shootingSystem.isMobile) {
            const label = document.createElement('div');
            label.style.position = 'absolute';
            label.style.bottom = '12vh';
            label.style.right = '5vh';
            label.style.color = 'white';
            label.style.fontWeight = 'bold';
            label.style.textShadow = '0 0 5px #000';
            label.style.zIndex = '1000';
            label.innerHTML = 'Disparar';
            document.body.appendChild(label);
        }
        
        // Añadir eventos de toque/clic
        shootButton.addEventListener('touchstart', handleShootButtonPress);
        shootButton.addEventListener('mousedown', handleShootButtonPress);
        
        // Prevenir eventos predeterminados de los toques para evitar desplazamientos indeseados
        shootButton.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // Añadir al DOM
        document.body.appendChild(shootButton);
        
        // Guardar referencia
        shootingSystem.shootButton = shootButton;
    }
}

// Crear y configurar el botón de audio
function createAudioButton() {
    // Crear el botón si no existe
    if (!shootingSystem.audioButton) {
        const audioButton = document.createElement('div');
        audioButton.id = 'audio-button';
        
        // Estilos del botón (similar al botón de reinicio pero con color diferente)
        audioButton.style.position = 'absolute';
        audioButton.style.bottom = '5vh';
        audioButton.style.left = 'calc(5vh + 20vmin)'; // Posicionado relativo al botón de reinicio
        audioButton.style.width = '15vmin';
        audioButton.style.height = '15vmin';
        audioButton.style.backgroundColor = 'rgba(255, 165, 0, 0.7)'; // Color naranja
        audioButton.style.borderRadius = '50%';
        audioButton.style.display = 'flex';
        audioButton.style.alignItems = 'center';
        audioButton.style.justifyContent = 'center';
        audioButton.style.cursor = 'pointer';
        audioButton.style.zIndex = '1000';
        
        // Usar símbolo de audio muteado por defecto
        audioButton.innerHTML = '<span style="color: white; font-size: 30px;">🔇</span>';
        
        // Añadir eventos de toque/clic
        audioButton.addEventListener('touchstart', handleAudioButtonPress);
        audioButton.addEventListener('mousedown', handleAudioButtonPress);
        
        // Prevenir eventos predeterminados de los toques
        audioButton.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // Mostrar etiqueta "Audio" junto al botón en dispositivos móviles
        if (shootingSystem.isMobile) {
            const label = document.createElement('div');
            label.style.position = 'absolute';
            label.style.bottom = '12vh';
            label.style.left = 'calc(5vh + 20vmin)'; // Alineado con el botón de audio
            label.style.color = 'white';
            label.style.fontWeight = 'bold';
            label.style.textShadow = '0 0 5px #000';
            label.style.zIndex = '1000';
            label.innerHTML = 'Audio';
            document.body.appendChild(label);
        }
        
        // Añadir al DOM
        document.body.appendChild(audioButton);
        
        // Guardar referencia
        shootingSystem.audioButton = audioButton;
        
        // Inicializar audio como desactivado
        shootingSystem.audio.enabled = false;
        shootingSystem.audio.muted = true;
    }
}

function handleAudioButtonPress(event) {
    // Prevenir comportamiento predeterminado
    event.preventDefault();
    
    // Efecto visual al presionar
    if (shootingSystem.audioButton) {
        shootingSystem.audioButton.style.transform = 'scale(0.9)';
        shootingSystem.audioButton.style.backgroundColor = 'rgba(255, 140, 0, 0.9)';
        
        // Restaurar después de un breve momento
        setTimeout(function() {
            shootingSystem.audioButton.style.transform = 'scale(1)';
            shootingSystem.audioButton.style.backgroundColor = 'rgba(255, 165, 0, 0.7)';
        }, 100);
    }
    
    // Alternar estado del audio
    const isMuted = window.toggleAudioMute();
    
    // Actualizar el ícono del botón
    if (shootingSystem.audioButton) {
        shootingSystem.audioButton.innerHTML = isMuted ? 
            '<span style="color: white; font-size: 30px;">🔇</span>' : 
            '<span style="color: white; font-size: 30px;">🔊</span>';
    }
    
    return false;
}

// Crear y configurar el botón de reinicio
function createResetButton() {
    // Crear el botón si no existe
    if (!shootingSystem.resetButton) {
        const resetButton = document.createElement('div');
        resetButton.id = 'reset-button';
        
        // Estilos del botón (similar al botón de disparo pero del lado izquierdo)
        resetButton.style.position = 'absolute';
        resetButton.style.bottom = '5vh';
        resetButton.style.left = '5vh';
        resetButton.style.width = '15vmin';
        resetButton.style.height = '15vmin';
        resetButton.style.backgroundColor = 'rgba(95, 158, 160, 0.7)'; // Color azul verdoso
        resetButton.style.borderRadius = '50%';
        resetButton.style.display = 'flex';
        resetButton.style.alignItems = 'center';
        resetButton.style.justifyContent = 'center';
        resetButton.style.cursor = 'pointer';
        resetButton.style.zIndex = '1000';
        
        // Usar símbolo de reinicio
        resetButton.innerHTML = '<span style="color: white; font-size: 30px;">↺</span>';
        
        // Añadir eventos de toque/clic
        resetButton.addEventListener('touchstart', handleResetButtonPress);
        resetButton.addEventListener('mousedown', handleResetButtonPress);
        
        // Prevenir eventos predeterminados de los toques
        resetButton.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // Mostrar etiqueta "Reiniciar" junto al botón en dispositivos móviles
        if (shootingSystem.isMobile) {
            const label = document.createElement('div');
            label.style.position = 'absolute';
            label.style.bottom = '12vh';
            label.style.left = '5vh';
            label.style.color = 'white';
            label.style.fontWeight = 'bold';
            label.style.textShadow = '0 0 5px #000';
            label.style.zIndex = '1000';
            label.innerHTML = 'Reiniciar';
            document.body.appendChild(label);
        }
        
        // Añadir al DOM
        document.body.appendChild(resetButton);
        
        // Guardar referencia
        shootingSystem.resetButton = resetButton;
    }
}

function handleShootButtonPress(event) {
    // Prevenir comportamiento predeterminado
    event.preventDefault();
    
    // Intentar disparar
    tryToShoot();
    
    // Efecto visual al presionar
    if (shootingSystem.shootButton) {
        shootingSystem.shootButton.style.transform = 'scale(0.9)';
        shootingSystem.shootButton.style.backgroundColor = 'rgba(255, 50, 0, 0.9)';
        
        // Restaurar después de un breve momento
        setTimeout(function() {
            shootingSystem.shootButton.style.transform = 'scale(1)';
            shootingSystem.shootButton.style.backgroundColor = 'rgba(255, 100, 0, 0.7)';
        }, 100);
    }
    
    return false;
}

function handleResetButtonPress(event) {
    // Prevenir comportamiento predeterminado
    event.preventDefault();
    
    // Efecto visual al presionar
    if (shootingSystem.resetButton) {
        shootingSystem.resetButton.style.transform = 'scale(0.9)';
        shootingSystem.resetButton.style.backgroundColor = 'rgba(70, 130, 150, 0.9)';
        
        // Restaurar después de un breve momento
        setTimeout(function() {
            shootingSystem.resetButton.style.transform = 'scale(1)';
            shootingSystem.resetButton.style.backgroundColor = 'rgba(95, 158, 160, 0.7)';
        }, 100);
    }
    
    // Reiniciar el tiempo primero
    resetGameTime();
    
    // Reiniciar el juego
    if (typeof window.resetGame === 'function') {
        window.resetGame();
    } else {
        console.error("Función resetGame no encontrada");
    }
    
    return false;
}

function handleKeyDown(event) {
    // Verificar si estamos en el panel de ranking (si hay un input activo)
    const isInputActive = document.activeElement && document.activeElement.tagName === 'INPUT';
    
    // Si estamos en un campo de entrada, permitir la entrada de texto normal
    if (isInputActive) {
        return; // No procesar atajos de teclado cuando se está escribiendo
    }
    
    // Detectar si se presionó la tecla espaciadora
    if (event.code === 'Space' || event.key === ' ') {
        tryToShoot();
    }
    
    // Detectar si se presionó la tecla M para audio
    if (event.code === 'KeyM' || event.key === 'm' || event.key === 'M') {
        // Llamar a la misma función que el botón de audio para mantener consistencia
        handleAudioButtonPress(event);
    }
    
    // Detectar si se presionó la tecla R para reiniciar
    if (event.code === 'KeyR' || event.key === 'r' || event.key === 'R') {
        // Llamar a la misma función que el botón de reinicio para mantener consistencia
        handleResetButtonPress(event);
    }
}

function tryToShoot() {
    // No permitir disparos si el juego ha terminado
    if (shootingSystem.gameEnded) {
        console.log("El juego ha terminado. No se pueden realizar más disparos.");
        return;
    }
    
    // No permitir disparos si el panel de información aún está visible
    if (!shootingSystem.infoShown) {
        console.log("Cierra el panel de información para comenzar a jugar.");
        return;
    }
    
    const currentTime = performance.now();
    
    // Verificar si podemos disparar (cooldown)
    if (currentTime - shootingSystem.lastShootTime < shootingSystem.cooldown) {
        return; // Todavía en cooldown, no podemos disparar
    }
    
    // Ya no reproducimos el sonido de disparo
    // playSound('shot');
    
    // Crear un nuevo disparo
    createShot();
    
    // Actualizar tiempo del último disparo
    shootingSystem.lastShootTime = currentTime;
    shootingSystem.isActive = true;
    shootingSystem.startTime = currentTime;
    
    // Verificar si podemos sumar puntos
    checkAndAddPoints();
}

// Función para verificar estado de la pelota y sumar puntos si corresponde
function checkAndAddPoints() {
    // Iniciar el temporizador si es el primer disparo
    if (!shootingSystem.gameStarted && !shootingSystem.gameEnded) {
        startGameTimer();
    }
    
    // Verificar si tenemos acceso al detector de estado y la posición de la pelota
    if (!window.ballStateDetector || !window.ballMovement || 
        !window.ballMovement.config || !window.ballMovement.config.currentPosition) {
        console.warn("No se pudo acceder al detector de estado o posición de la pelota");
        return;
    }
    
    // Obtener la posición actual de la pelota
    const ballPosition = window.ballMovement.config.currentPosition;
    
    // Verificar que gameState esté disponible en el objeto window
    if (!window.gameState) {
        console.error("No se pudo acceder a gameState");
        return;
    }
    
    // Obtener el estado actual usando SOLO la detección geométrica (más confiable)
    const detectedState = window.ballStateDetector.detectStateMathematically(ballPosition);
    
    // Mostrar en consola el estado detectado (para depuración)
    console.log("Estado detectado en disparo:", detectedState);
    
    // Si la pelota está en estado "descubierto", sumar puntos
    if (detectedState === 'uncovered') {
        // Reproducir sonido de impacto inmediatamente (ya no hay sonido de disparo que pueda solaparse)
        playSound('hit');
        
        // Sumar 10 puntos por disparo exitoso
        window.gameState.score += 10;
        
        // Mostrar efecto visual de puntos ganados
        showPointsEffect(ballPosition, 10);
        
        // Activar el efecto de cambio de color en la pelota
        if (typeof window.ballHit === 'function') {
            window.ballHit();
        }
        
        console.log("¡Disparo exitoso! +10 puntos. Total: " + window.gameState.score);
        
        // Actualizar el marcador inmediatamente
        updateScoreDisplay();
        
        // Efecto adicional de éxito (destello en el elemento de puntuación)
        if (shootingSystem.scoreDisplay) {
            // Destello del marcador
            shootingSystem.scoreDisplay.style.transition = 'all 0.2s ease-in-out';
            shootingSystem.scoreDisplay.style.transform = 'scale(1.2)';
            shootingSystem.scoreDisplay.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
            
            // Volver al estado normal
            setTimeout(() => {
                shootingSystem.scoreDisplay.style.transform = 'scale(1)';
                shootingSystem.scoreDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }, 200);
        }
    } else {
        // Reproducir sonido de fallo inmediatamente (ya no hay sonido de disparo que pueda solaparse)
        playSound('miss');
        
        // La pelota está en estado "cubierto", penalizar si corresponde
        console.log("Disparo fallido - La pelota está cubierta");
        
        // Solo penalizar si el jugador tiene suficientes puntos (más de 20)
        const puntosActuales = window.gameState.score;
        if (puntosActuales > 20) {
            // Determinar la penalización según el tiempo transcurrido
            let penalizacion = 5; // Penalización inicial: 5 puntos
            
            // Verificar si hemos pasado los primeros 30 segundos
            const tiempoTranscurrido = Date.now() - shootingSystem.gameStartTime;
            if (tiempoTranscurrido > 30000) { // 30 segundos en milisegundos
                penalizacion = 10; // Aumentar a 10 puntos en la segunda mitad
            }
            
            // Restar puntos por disparo fallido
            window.gameState.score -= penalizacion;
            console.log(`Penalización: -${penalizacion} puntos (${tiempoTranscurrido > 30000 ? 'segunda' : 'primera'} mitad). Total: ${window.gameState.score}`);
            
            // Mostrar efecto visual de puntos perdidos
            showPointsEffect(ballPosition, -penalizacion, true);
            
            // Actualizar el marcador inmediatamente
            updateScoreDisplay();
            
            // Efecto adicional de penalización (destello en el elemento de puntuación)
            if (shootingSystem.scoreDisplay) {
                // Destello del marcador
                shootingSystem.scoreDisplay.style.transition = 'all 0.2s ease-in-out';
                shootingSystem.scoreDisplay.style.transform = 'scale(1.2)';
                shootingSystem.scoreDisplay.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
                
                // Volver al estado normal
                setTimeout(() => {
                    shootingSystem.scoreDisplay.style.transform = 'scale(1)';
                    shootingSystem.scoreDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                }, 200);
            }
        } else {
            console.log("Sin penalización (puntos ≤ 20)");
        }
        
        // Mostrar efecto de partículas en el punto de impacto
        createParticleEffect(ballPosition);
    }
}

// Función auxiliar para obtener el tiempo restante en milisegundos
function getRemainingTime() {
    if (!shootingSystem.gameStarted || shootingSystem.gameEnded) return 60000; // Valor por defecto: 1 minuto
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - shootingSystem.gameStartTime;
    const totalGameTime = 60 * 1000; // 1 minuto en milisegundos
    const remainingTime = Math.max(0, totalGameTime - elapsedTime);
    
    return remainingTime;
}

// Mostrar un efecto visual para los puntos ganados o perdidos
function showPointsEffect(position, points, isPenalty = false) {
    // Verificar si tenemos una posición válida
    if (!position) return;
    
    // Obtener el canvas y su posición en la página
    const canvas = document.getElementById('canvas-juego');
    if (!canvas) {
        console.warn("No se pudo encontrar el canvas para posicionar el efecto de puntos");
        return;
    }
    
    // Obtener las coordenadas relativas al viewport del canvas
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calcular la posición absoluta en la página (relativa al viewport)
    const absoluteX = canvasRect.left + position.x;
    const absoluteY = canvasRect.top + position.y - 30; // Un poco arriba de la pelota
    
    // Crear elemento flotante para mostrar los puntos
    const pointsElement = document.createElement('div');
    
    // Determinar el texto y los estilos según el tipo de puntos
    if (isPenalty) {
        pointsElement.textContent = points; // Ya incluye el signo negativo
        pointsElement.style.color = 'rgba(255, 50, 50, 1)';
        pointsElement.style.textShadow = '0 0 10px #ff0000, 0 0 20px #ff0000';
    } else {
        pointsElement.textContent = '+' + points;
        pointsElement.style.color = 'rgba(0, 255, 0, 1)';
        pointsElement.style.textShadow = '0 0 10px #00ff00, 0 0 20px #00ff00';
    }
    
    // Estilos comunes
    pointsElement.style.position = 'fixed'; // Usamos fixed para posición relativa al viewport
    pointsElement.style.left = absoluteX + 'px';
    pointsElement.style.top = absoluteY + 'px';
    pointsElement.style.fontWeight = 'bold';
    pointsElement.style.fontSize = '36px';
    pointsElement.style.zIndex = '1001';
    pointsElement.style.pointerEvents = 'none';
    pointsElement.style.transition = 'all 1.5s ease-out';
    
    // Añadir al body para que sea visible
    document.body.appendChild(pointsElement);
    
    // Animar el elemento
    setTimeout(() => {
        pointsElement.style.opacity = '0';
        pointsElement.style.transform = 'translateY(-50px) scale(1.5)';
    }, 10);
    
    // Eliminar después de la animación
    setTimeout(() => {
        if (pointsElement.parentNode) {
            document.body.removeChild(pointsElement);
        }
    }, 1500);
}

function createShot() {
    // Obtener dimensiones del canvas
    const canvasWidth = canvasEffects.width;
    const canvasHeight = canvasEffects.height;
    
    // Calcular posiciones de origen de los disparos
    
    // Puntos de origen (1/10 desde abajo y 1/10 desde los laterales)
    const yStart = canvasHeight - canvasHeight * 0.1; // 1/10 inferior del canvas
    const leftXStart = canvasWidth * 0.1; // 1/10 izquierdo del ancho
    const rightXStart = canvasWidth * 0.9; // 9/10 (simetría) del ancho
    
    // Obtener la posición actual de la pelota (destino de los disparos)
    let targetX = canvasWidth / 2;  // Valor por defecto: centro del canvas
    let targetY = canvasHeight / 2; // Valor por defecto: centro del canvas
    
    // Si existe la posición de la pelota, usarla como destino
    if (window.ballMovement && window.ballMovement.config && window.ballMovement.config.currentPosition) {
        targetX = window.ballMovement.config.currentPosition.x;
        targetY = window.ballMovement.config.currentPosition.y;
    }
    
    // Desplazamiento del destino para evitar que las líneas se crucen
    const offsetDestino = 5; // 5 píxeles de separación
    
    // Crear puntos de destino desplazados a 5 píxeles a cada lado del centro de la pelota
    // Simplificamos a desplazamiento horizontal para mayor claridad visual
    const leftTargetX = targetX - offsetDestino; // 5px a la izquierda del centro de la pelota
    const leftTargetY = targetY;
    
    const rightTargetX = targetX + offsetDestino; // 5px a la derecha del centro de la pelota
    const rightTargetY = targetY;
    
    // Crear los dos disparos con destinos ligeramente separados
    const newShots = [
        {
            startX: leftXStart,
            startY: yStart,
            endX: leftTargetX,
            endY: leftTargetY,
            createdAt: performance.now()
        },
        {
            startX: rightXStart,
            startY: yStart,
            endX: rightTargetX,
            endY: rightTargetY,
            createdAt: performance.now()
        }
    ];
    
    // Añadir los nuevos disparos al array
    shootingSystem.shots.push(...newShots);
    
    console.log("¡Disparo creado hacia la pelota!");
}

function dibujarEffects() {
    // Limpiar canvas de efectos
    ctxEffects.clearRect(0, 0, canvasEffects.width, canvasEffects.height);
    
    // Actualizar métricas de rendimiento
    updatePerformanceMetrics();
    
    // Verificar si hay disparos activos y dibujarlos
    const currentTime = performance.now();
    
    // Filtrar y dibujar sólo los disparos que aún están activos
    shootingSystem.shots = shootingSystem.shots.filter(shot => {
        const shotAge = currentTime - shot.createdAt;
        
        // Si el disparo es reciente, dibujarlo
        if (shotAge <= shootingSystem.duration) {
            drawShot(shot);
            return true; // Mantener en el array
        }
        
        return false; // Eliminar del array (disparo expirado)
    });
    
    // Actualizar estado general de disparos
    if (shootingSystem.shots.length === 0) {
        shootingSystem.isActive = false;
    }
}

function drawShot(shot) {
    // Dibujar un disparo con forma cónica y gradiente de naranja a rojo
    
    // Crear un gradiente lineal desde el origen al destino del disparo
    const gradient = ctxEffects.createLinearGradient(
        shot.startX, shot.startY, 
        shot.endX, shot.endY
    );
    
    // Definir los colores del gradiente
    gradient.addColorStop(0, shootingSystem.startColor);  // Naranja en el origen
    gradient.addColorStop(1, shootingSystem.endColor);    // Rojo en el destino
    
    // Usar el gradiente como color de relleno
    ctxEffects.fillStyle = gradient;
    
    // Calcular el ángulo del disparo
    const dx = shot.endX - shot.startX;
    const dy = shot.endY - shot.startY;
    const angle = Math.atan2(dy, dx);
    
    // Ángulos perpendiculares para calcular los bordes del cono
    const perpAngle1 = angle + Math.PI/2;
    const perpAngle2 = angle - Math.PI/2;
    
    // Mitad del ancho en origen y destino
    const startHalfWidth = shootingSystem.startWidth / 2;
    const endHalfWidth = shootingSystem.endWidth / 2;
    
    // Calcular los 4 puntos del cono
    const startPoint1 = {
        x: shot.startX + Math.cos(perpAngle1) * startHalfWidth,
        y: shot.startY + Math.sin(perpAngle1) * startHalfWidth
    };
    
    const startPoint2 = {
        x: shot.startX + Math.cos(perpAngle2) * startHalfWidth,
        y: shot.startY + Math.sin(perpAngle2) * startHalfWidth
    };
    
    const endPoint1 = {
        x: shot.endX + Math.cos(perpAngle1) * endHalfWidth,
        y: shot.endY + Math.sin(perpAngle1) * endHalfWidth
    };
    
    const endPoint2 = {
        x: shot.endX + Math.cos(perpAngle2) * endHalfWidth,
        y: shot.endY + Math.sin(perpAngle2) * endHalfWidth
    };
    
    // Dibujar el polígono cónico
    ctxEffects.beginPath();
    ctxEffects.moveTo(startPoint1.x, startPoint1.y);
    ctxEffects.lineTo(endPoint1.x, endPoint1.y);
    ctxEffects.lineTo(endPoint2.x, endPoint2.y);
    ctxEffects.lineTo(startPoint2.x, startPoint2.y);
    ctxEffects.closePath();
    ctxEffects.fill();
    
    // Opcional: agregar un borde al cono
    ctxEffects.strokeStyle = 'rgba(255, 255, 255, 1)';  // Borde blanco
    ctxEffects.lineWidth = 0.5;
    ctxEffects.stroke();
    
    // Añadir brillo interior (opcional para efecto más intenso)
    const innerGradient = ctxEffects.createLinearGradient(
        shot.startX, shot.startY, 
        shot.endX, shot.endY
    );
    innerGradient.addColorStop(0, 'rgba(255, 255, 0, 0.5)');  // Amarillo semitransparente en origen
    innerGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');      // Rojo transparente en destino
    
    // Dibujar un cono más estrecho en el interior para el brillo
    const innerStartWidth = startHalfWidth * 0.6;
    const innerEndWidth = endHalfWidth * 0.6;
    
    const innerStartPoint1 = {
        x: shot.startX + Math.cos(perpAngle1) * innerStartWidth,
        y: shot.startY + Math.sin(perpAngle1) * innerStartWidth
    };
    
    const innerStartPoint2 = {
        x: shot.startX + Math.cos(perpAngle2) * innerStartWidth,
        y: shot.startY + Math.sin(perpAngle2) * innerStartWidth
    };
    
    const innerEndPoint1 = {
        x: shot.endX + Math.cos(perpAngle1) * innerEndWidth,
        y: shot.endY + Math.sin(perpAngle1) * innerEndWidth
    };
    
    const innerEndPoint2 = {
        x: shot.endX + Math.cos(perpAngle2) * innerEndWidth,
        y: shot.endY + Math.sin(perpAngle2) * innerEndWidth
    };
    
    ctxEffects.fillStyle = innerGradient;
    ctxEffects.beginPath();
    ctxEffects.moveTo(innerStartPoint1.x, innerStartPoint1.y);
    ctxEffects.lineTo(innerEndPoint1.x, innerEndPoint1.y);
    ctxEffects.lineTo(innerEndPoint2.x, innerEndPoint2.y);
    ctxEffects.lineTo(innerStartPoint2.x, innerStartPoint2.y);
    ctxEffects.closePath();
    ctxEffects.fill();
}

// Crear y configurar el elemento de puntuación
function createScoreDisplay() {
    // Crear el elemento si no existe
    if (!shootingSystem.scoreDisplay) {
        const scoreElement = document.createElement('div');
        scoreElement.id = 'score-display';
        
        // Estilos del elemento
        scoreElement.style.position = 'absolute';
        scoreElement.style.top = '10px';
        scoreElement.style.left = '10px';
        scoreElement.style.color = 'rgba(0, 255, 255, 1)';
        scoreElement.style.fontFamily = 'Arial, sans-serif';
        scoreElement.style.fontSize = '18px';
        scoreElement.style.fontWeight = 'bold';
        scoreElement.style.padding = '5px 10px';
        scoreElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        scoreElement.style.borderRadius = '5px';
        scoreElement.style.zIndex = '1000';
        scoreElement.style.textShadow = '1px 1px 2px #000';
        
        // Contenido inicial
        scoreElement.textContent = 'Puntos: 0';
        
        // Añadir al DOM
        document.body.appendChild(scoreElement);
        
        // Guardar referencia
        shootingSystem.scoreDisplay = scoreElement;
        
        // Configurar actualización periódica de la puntuación
        setInterval(updateScoreDisplay, 500); // Actualizar cada 500ms
    }
}

// Actualizar el elemento de puntuación
function updateScoreDisplay() {
    if (shootingSystem.scoreDisplay && window.gameState) {
        shootingSystem.scoreDisplay.textContent = 'Puntos: ' + window.gameState.score;
    }
}

// Crear y configurar el elemento de tiempo
function createTimeDisplay() {
    // Crear el elemento si no existe
    if (!shootingSystem.timeDisplay) {
        const timeElement = document.createElement('div');
        timeElement.id = 'time-display';
        
        // Estilos del elemento (simétrico al contador de puntos)
        timeElement.style.position = 'absolute';
        timeElement.style.top = '10px';
        timeElement.style.right = '10px';
        timeElement.style.color = 'rgba(0, 255, 255, 1)';
        timeElement.style.fontFamily = 'Arial, sans-serif';
        timeElement.style.fontSize = '18px';
        timeElement.style.fontWeight = 'bold';
        timeElement.style.padding = '5px 10px';
        timeElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        timeElement.style.borderRadius = '5px';
        timeElement.style.zIndex = '1000';
        timeElement.style.textShadow = '1px 1px 2px #000';
        
        // Contenido inicial - mostrar 1 minuto como tiempo inicial
        timeElement.textContent = 'Tiempo: 01:00.0';
        
        // Añadir al DOM
        document.body.appendChild(timeElement);
        
        // Guardar referencia
        shootingSystem.timeDisplay = timeElement;
    }
}

// Iniciar el temporizador del juego
function startGameTimer() {
    if (!shootingSystem.gameStarted) {
        shootingSystem.gameStarted = true;
        shootingSystem.gameStartTime = Date.now();
        
        // Actualizar el tiempo cada 100ms
        shootingSystem.gameTimer = setInterval(updateGameTime, 100);
        
        // Actualizar inmediatamente
        updateGameTime();
    }
}

// Actualizar el tiempo del juego - ahora como cuenta regresiva
function updateGameTime() {
    if (!shootingSystem.gameStarted || shootingSystem.gameEnded) return;
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - shootingSystem.gameStartTime;
    
    // Calcular tiempo restante (1 minuto - tiempo transcurrido)
    const totalGameTime = 60 * 1000; // 1 minuto en milisegundos
    const remainingTime = Math.max(0, totalGameTime - elapsedTime);
    
    // Convertir a minutos, segundos y décimas
    const remainingSeconds = Math.floor(remainingTime / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const deciseconds = Math.floor((remainingTime % 1000) / 100); // Décimas de segundo
    
    // Formatear el tiempo como MM:SS.d
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
    
    // Actualizar el elemento de tiempo
    if (shootingSystem.timeDisplay) {
        shootingSystem.timeDisplay.textContent = 'Tiempo: ' + formattedTime;
        
        // Cambiar color cuando queda poco tiempo (menos de 10 segundos)
        if (remainingTime <= 10000) {
            shootingSystem.timeDisplay.style.color = 'rgba(255, 50, 50, 1)'; // Rojo para advertencia
            
            // Parpadeo en los últimos 5 segundos
            if (remainingTime <= 5000) {
                const blinkState = Math.floor(Date.now() / 500) % 2 === 0;
                shootingSystem.timeDisplay.style.opacity = blinkState ? '1' : '0.5';
            }
        } else {
            shootingSystem.timeDisplay.style.color = 'rgba(0, 255, 255, 1)'; // Color normal
            shootingSystem.timeDisplay.style.opacity = '1';
        }
    }
    
    // Si llega a 0, detener el juego
    if (remainingTime <= 0) {
        endGame();
    }
}

// Finalizar el juego al llegar a 0
function endGame() {
    if (shootingSystem.gameEnded) return;
    
    console.log("Juego finalizado");
    shootingSystem.gameEnded = true;
    
    // Detener el temporizador
    if (shootingSystem.gameTimer) {
        clearInterval(shootingSystem.gameTimer);
        shootingSystem.gameTimer = null;
    }
    
    // Asegurar que el tiempo muestre exactamente 00:00.0
    if (shootingSystem.timeDisplay) {
        shootingSystem.timeDisplay.textContent = 'Tiempo: 00:00.0';
        shootingSystem.timeDisplay.style.color = 'rgba(255, 50, 50, 1)'; // Rojo para tiempo agotado
        shootingSystem.timeDisplay.style.opacity = '1'; // Asegurar visibilidad
    }
    
    // Detener el juego
    if (window.gameState) {
        console.log("Deteniendo el bucle del juego (gameState.isRunning = false)");
        window.gameState.isRunning = false;
        
        // Asegurarnos que el bucle se detenga cancelando cualquier animación pendiente
        if (window.gameLoopRequestId) {
            console.log("Cancelando animación pendiente:", window.gameLoopRequestId);
            window.cancelAnimationFrame(window.gameLoopRequestId);
            window.gameLoopRequestId = null;
        }
    } else {
        console.error("No se pudo acceder a gameState");
    }
    
    // Desactivar visualmente los botones
    if (shootingSystem.shootButton) {
        shootingSystem.shootButton.style.opacity = '0.3';
        shootingSystem.shootButton.style.pointerEvents = 'none';
    }
    
    if (shootingSystem.resetButton) {
        // El botón de reinicio lo mantenemos activo, pero lo resaltamos
        shootingSystem.resetButton.style.transform = 'scale(1.1)';
        shootingSystem.resetButton.style.boxShadow = '0 0 15px rgba(95, 158, 160, 0.8)';
    }
    
    // Limpiar todos los disparos activos
    shootingSystem.shots = [];
    shootingSystem.isActive = false;
    
    // Mostrar mensaje de fin de juego
    showGameEndMessage();
}

// Mostrar panel de fin de juego con puntuación y opciones
function showGameEndMessage() {
    console.log("Mostrando panel de fin de juego");
    
    // Crear panel de resultados
    const endPanel = document.createElement('div');
    endPanel.id = 'game-end-panel';
    
    // Estilos similares al panel de información inicial
    endPanel.style.position = 'fixed';
    endPanel.style.top = '50%';
    endPanel.style.left = '50%';
    endPanel.style.transform = 'translate(-50%, -50%)';
    endPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    endPanel.style.color = 'white';
    endPanel.style.padding = '25px';
    endPanel.style.borderRadius = '10px';
    endPanel.style.boxShadow = '0 0 25px rgba(255, 50, 50, 0.7)';
    endPanel.style.textAlign = 'center';
    endPanel.style.zIndex = '3000';
    endPanel.style.minWidth = '300px';
    endPanel.style.maxWidth = '600px';
    
    // Obtener puntuación final
    const finalScore = window.gameState ? window.gameState.score : 0;
    
    // Contenido del panel
    endPanel.innerHTML = `
        <h2 style="color: rgba(255, 50, 50, 1); margin: 0 0 20px 0; font-size: 28px;">¡Tiempo Finalizado!</h2>
        <p style="font-size: 22px; margin: 15px 0;">Tu puntuación final es:</p>
        <p style="font-size: 42px; margin: 20px 0; color: rgba(0, 255, 255, 1); font-weight: bold;">${finalScore} puntos</p>
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 25px;">
            <button id="submit-score-button" style="background-color: rgba(50, 205, 50, 0.8); color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 18px;">GUARDAR EN RANKING</button>
            <button id="restart-game-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 18px;">JUGAR DE NUEVO</button>
        </div>
    `;
    
    // Añadir al DOM
    document.body.appendChild(endPanel);
    
    // Configurar botón de reinicio
    const restartButton = document.getElementById('restart-game-button');
    if (restartButton) {
        restartButton.addEventListener('click', function() {
            console.log("Botón JUGAR DE NUEVO clickeado");
            
            // Verificar si la función resetGame está disponible
            console.log("¿resetGame está disponible?", typeof window.resetGame === 'function');
            
            // Cerrar el panel
            if (endPanel.parentNode) {
                document.body.removeChild(endPanel);
                console.log("Panel de fin de juego cerrado");
            }
            
            // Usar la función auxiliar para reiniciar el juego
            if (typeof window.effectsResetGame === 'function') {
                console.log("Usando función auxiliar effectsResetGame");
                window.effectsResetGame();
            } else if (typeof window.resetGame === 'function') {
                console.log("Llamando a window.resetGame()");
                window.resetGame();
            } else {
                console.error("Ninguna función de reinicio disponible");
                alert("No se pudo reiniciar el juego. Por favor, recarga la página.");
                window.location.reload();
            }
        });
    }
    
    // Configurar botón de enviar al ranking
    const submitButton = document.getElementById('submit-score-button');
    if (submitButton) {
        submitButton.addEventListener('click', function() {
            // Cambiar el panel para mostrar el formulario de envío
            showRankingSubmitForm(endPanel, finalScore);
        });
    }
}

// Mostrar formulario para enviar puntuación al ranking
function showRankingSubmitForm(panel, score) {
    // Cambiar el contenido del panel
    panel.innerHTML = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 20px 0; font-size: 24px;">Guardar Puntuación</h2>
        <p style="font-size: 16px; margin: 15px 0;">Ingresa tu nombre para guardar tu puntuación en el ranking:</p>
        <p style="font-size: 28px; margin: 10px 0; color: rgba(0, 255, 255, 1); font-weight: bold;">${score} puntos</p>
        
        <div style="margin: 20px 0;">
            <input type="text" id="player-name-input" placeholder="Tu nombre" style="padding: 10px; width: 80%; font-size: 16px; border-radius: 5px; border: 2px solid rgba(0, 255, 255, 0.5); background-color: rgba(0, 0, 0, 0.7); color: white;" maxlength="20">
        </div>
        
        <div id="ranking-submit-message" style="min-height: 20px; margin: 10px 0; color: rgba(255, 255, 0, 0.8);"></div>
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
            <button id="save-score-button" style="background-color: rgba(50, 205, 50, 0.8); color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 18px;">GUARDAR</button>
            <button id="cancel-score-button" style="background-color: rgba(150, 150, 150, 0.8); color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px;">CANCELAR</button>
        </div>
    `;
    
    // Configurar botón de guardar
    const saveButton = document.getElementById('save-score-button');
    const nameInput = document.getElementById('player-name-input');
    const messageDiv = document.getElementById('ranking-submit-message');
    
    if (saveButton && nameInput && messageDiv) {
        // Auto-focus en el campo de nombre
        nameInput.focus();
        
        saveButton.addEventListener('click', async function() {
            const playerName = nameInput.value.trim();
            
            if (!playerName) {
                messageDiv.textContent = "Por favor ingresa tu nombre";
                messageDiv.style.color = "rgba(255, 50, 50, 0.9)";
                return;
            }
            
            // Deshabilitar botón durante el envío
            saveButton.disabled = true;
            saveButton.textContent = "GUARDANDO...";
            saveButton.style.backgroundColor = "rgba(50, 205, 50, 0.4)";
            
            try {
                // Usar el cliente API para guardar la puntuación
                if (window.apiClient && window.apiClient.ranking) {
                    await window.apiClient.ranking.save(playerName, score);
                    messageDiv.textContent = "¡Puntuación guardada con éxito!";
                    messageDiv.style.color = "rgba(50, 205, 50, 0.9)";
                    
                    // Mostrar el ranking después de guardar
                    setTimeout(() => {
                        showRankingList(panel, score, playerName);
                    }, 1500);
                } else {
                    throw new Error("API Client no disponible");
                }
            } catch (error) {
                console.error("Error al guardar puntuación:", error);
                messageDiv.textContent = "Error al guardar. Intenta de nuevo.";
                messageDiv.style.color = "rgba(255, 50, 50, 0.9)";
                
                // Reactivar botón
                saveButton.disabled = false;
                saveButton.textContent = "GUARDAR";
                saveButton.style.backgroundColor = "rgba(50, 205, 50, 0.8)";
            }
        });
    }
    
    // Configurar botón de cancelar
    const cancelButton = document.getElementById('cancel-score-button');
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            // Volver al panel anterior
            showGameEndMessage();
        });
    }
}

// Mostrar lista de ranking
async function showRankingList(panel, playerScore, playerName) {
    panel.innerHTML = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 15px 0; font-size: 24px;">Ranking de Puntuaciones</h2>
        <div id="ranking-loading" style="margin: 20px 0;">Cargando ranking...</div>
        <div id="ranking-list" style="max-height: 300px; overflow-y: auto; margin: 10px 0; display: none;"></div>
        <button id="play-again-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: 12px 20px; margin-top: 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 18px;">JUGAR DE NUEVO</button>
    `;
    
    const loadingDiv = document.getElementById('ranking-loading');
    const rankingListDiv = document.getElementById('ranking-list');
    const playAgainButton = document.getElementById('play-again-button');
    
    // Configurar botón de jugar de nuevo
    if (playAgainButton) {
        playAgainButton.addEventListener('click', function() {
            console.log("Botón JUGAR DE NUEVO (desde ranking) clickeado");
            
            // Verificar si la función resetGame está disponible
            console.log("¿resetGame está disponible?", typeof window.resetGame === 'function');
            
            // Indicar que estamos reiniciando desde el ranking
            window.isGameRestarting = true;
            console.log("Bandera isGameRestarting establecida:", window.isGameRestarting);
            
            // Cerrar el panel
            if (panel.parentNode) {
                document.body.removeChild(panel);
                console.log("Panel de ranking cerrado");
            }
            
            // Usar la función auxiliar para reiniciar el juego
            if (typeof window.effectsResetGame === 'function') {
                console.log("Usando función auxiliar effectsResetGame desde ranking");
                window.effectsResetGame();
            } else if (typeof window.resetGame === 'function') {
                console.log("Llamando a window.resetGame() desde ranking");
                window.resetGame();
            } else {
                console.error("Ninguna función de reinicio disponible");
                alert("No se pudo reiniciar el juego. Por favor, recarga la página.");
                window.location.reload();
            }
        });
    }
    
    // Cargar el ranking
    if (rankingListDiv && loadingDiv) {
        try {
            let rankingData = [];
            
            if (window.apiClient && window.apiClient.ranking) {
                rankingData = await window.apiClient.ranking.getAll();
            }
            
            // Ocultar mensaje de carga
            loadingDiv.style.display = 'none';
            rankingListDiv.style.display = 'block';
            
            // Formatear y mostrar el ranking
            if (rankingData && rankingData.length > 0) {
                // Construir tabla de ranking
                let tableHTML = `
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <tr style="border-bottom: 1px solid rgba(0, 255, 255, 0.5);">
                            <th style="padding: 8px; text-align: center;">#</th>
                            <th style="padding: 8px;">Jugador</th>
                            <th style="padding: 8px; text-align: right;">Puntos</th>
                        </tr>
                `;
                
                // Añadir filas
                rankingData.forEach((entry, index) => {
                    // Destacar la entrada del jugador actual
                    const isCurrentPlayer = entry.nombre === playerName && entry.puntaje === playerScore;
                    const rowStyle = isCurrentPlayer ? 
                        'background-color: rgba(0, 255, 255, 0.2); font-weight: bold;' : 
                        ((index % 2 === 0) ? 'background-color: rgba(30, 30, 30, 0.5);' : '');
                    
                    tableHTML += `
                        <tr style="border-bottom: 1px solid rgba(100, 100, 100, 0.3); ${rowStyle}">
                            <td style="padding: 8px; text-align: center;">${index + 1}</td>
                            <td style="padding: 8px;">${entry.nombre}</td>
                            <td style="padding: 8px; text-align: right; color: ${isCurrentPlayer ? 'rgba(0, 255, 255, 1)' : 'white'};">${entry.puntaje}</td>
                        </tr>
                    `;
                });
                
                tableHTML += '</table>';
                rankingListDiv.innerHTML = tableHTML;
            } else {
                rankingListDiv.innerHTML = '<p style="text-align: center;">No hay puntuaciones registradas todavía.</p>';
            }
        } catch (error) {
            console.error("Error al cargar el ranking:", error);
            loadingDiv.style.display = 'none';
            rankingListDiv.style.display = 'block';
            rankingListDiv.innerHTML = '<p style="color: rgba(255, 50, 50, 0.9); text-align: center;">Error al cargar el ranking. Por favor intenta más tarde.</p>';
        }
    }
}

// Exportar la función endGame al ámbito global
window.endGame = endGame;

// Eliminar todas las partículas activas
function clearAllParticles() {
    // Eliminar cada partícula del DOM
    shootingSystem.activeParticles.forEach(particle => {
        if (particle.element && particle.element.parentNode) {
            document.body.removeChild(particle.element);
        }
    });
    
    // Vaciar el array de partículas
    shootingSystem.activeParticles = [];
    console.log("Todas las partículas han sido eliminadas");
}

// Crear una única partícula con propiedades según su tipo
function createSingleParticle(position, type, typeColors) {
    // Obtener el canvas
    const canvas = document.getElementById('canvas-juego');
    if (!canvas) return;
    
    // Posición inicial (punto de impacto)
    const canvasRect = canvas.getBoundingClientRect();
    const x = canvasRect.left + position.x;
    const y = canvasRect.top + position.y;
    
    // Propiedades según el tipo
    let size, speed, life, gravity, rotationSpeed, shape, hasTail, hasGlow, canBounce;
    
    // Ajustar parámetros según el modo de rendimiento
    const isLowPerformance = shootingSystem.performanceMonitor.lowPerformanceMode;
    
    switch(type) {
        case 'chispa':
            // Chispas pequeñas y rápidas
            size = Math.random() * 2 + 1;                // 1-3px
            speed = Math.random() * 8 + 5;               // 5-13 velocidad
            life = isLowPerformance ? (Math.random() * 20 + 40) : (Math.random() * 30 + 60); // Vida más corta en modo bajo rendimiento
            gravity = 0.3;                               // Gravedad media
            rotationSpeed = isLowPerformance ? 0 : (Math.random() * 12 - 6); // Sin rotación en modo bajo rendimiento
            shape = 'circle';                            // Forma circular
            hasTail = isLowPerformance ? false : true;   // Sin estela en modo bajo rendimiento
            hasGlow = isLowPerformance ? false : true;   // Sin brillo en modo bajo rendimiento
            canBounce = false;                           // Sin rebote
            break;
            
        case 'metal':
            // Fragmentos metálicos medianos
            size = Math.random() * 3 + 2;                // 2-5px
            speed = Math.random() * 5 + 3;               // 3-8 velocidad
            life = isLowPerformance ? (Math.random() * 30 + 50) : (Math.random() * 50 + 80); // Vida más corta en modo bajo rendimiento
            gravity = 0.4;                               // Gravedad alta
            rotationSpeed = isLowPerformance ? 0 : (Math.random() * 6 - 3); // Sin rotación en modo bajo rendimiento
            shape = isLowPerformance ? 'circle' : (Math.random() > 0.5 ? 'triangle' : 'square'); // Solo círculos en modo bajo rendimiento
            hasTail = false;                             // Sin estela
            hasGlow = false;                             // Sin brillo
            canBounce = isLowPerformance ? false : true; // Sin rebote en modo bajo rendimiento
            break;
            
        case 'brillo':
            // Destellos brillantes 
            size = Math.random() * 4 + 3;                // 3-7px
            speed = Math.random() * 3 + 2;               // 2-5 velocidad
            life = Math.random() * 70 + 100;             // 100-170 duración
            gravity = 0.1;                               // Gravedad baja
            rotationSpeed = Math.random() * 3 - 1.5;     // Rotación lenta
            shape = 'circle';                            // Forma circular
            hasTail = false;                             // Sin estela
            hasGlow = true;                              // Con brillo fuerte
            canBounce = false;                           // Sin rebote
            break;
            
        case 'humo':
            // Pequeñas partículas de humo
            size = Math.random() * 5 + 4;                // 4-9px
            speed = Math.random() * 2 + 1;               // 1-3 velocidad
            life = Math.random() * 100 + 150;            // 150-250 duración
            gravity = -0.05;                             // Gravedad negativa (sube)
            rotationSpeed = Math.random() * 2 - 1;       // Rotación muy lenta
            shape = 'circle';                            // Forma circular
            hasTail = false;                             // Sin estela
            hasGlow = false;                             // Sin brillo
            canBounce = false;                           // Sin rebote
            break;
    }
    
    // Color aleatorio del tipo
    const color = typeColors[Math.floor(Math.random() * typeColors.length)];
    
    // Velocidad y dirección aleatorias
    // Distribución en cono (hacia arriba principalmente para el metal)
    let angle;
    if (type === 'metal') {
        // Distribución en un cono dirigido hacia arriba (180º -/+ 80º)
        angle = Math.PI - (Math.random() * Math.PI * 0.9 - Math.PI * 0.45);
    } else {
        // Distribución circular completa
        angle = Math.random() * Math.PI * 2;
    }
    
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    // Crear elemento según la forma
    const particle = document.createElement('div');
    
    // Estilos base comunes
    particle.style.position = 'fixed';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.zIndex = '1000';
    particle.style.pointerEvents = 'none';
    
    // Aplicar forma y estilos específicos
    switch(shape) {
        case 'circle':
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.borderRadius = '50%';
            particle.style.backgroundColor = color;
            break;
            
        case 'square':
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.backgroundColor = color;
            break;
            
        case 'triangle':
            particle.style.width = '0';
            particle.style.height = '0';
            particle.style.borderLeft = size/2 + 'px solid transparent';
            particle.style.borderRight = size/2 + 'px solid transparent';
            particle.style.borderBottom = size + 'px solid ' + color;
            particle.style.backgroundColor = 'transparent';
            break;
    }
    
    // Aplicar efectos adicionales
    if (hasGlow) {
        // Brillo más intenso para las chispas y destellos
        const glowColor = color.replace(')', ', 0.7)').replace('rgba', 'rgba');
        const glowSize = type === 'brillo' ? size * 3 : size * 2;
        particle.style.boxShadow = `0 0 ${glowSize}px ${glowSize/2}px ${glowColor}`;
    }
    
    // Crear estela si corresponde
    let tail = null;
    if (hasTail) {
        tail = document.createElement('div');
        tail.style.position = 'fixed';
        tail.style.width = size/3 + 'px';
        tail.style.height = size * 3 + 'px';
        tail.style.backgroundColor = color.replace(')', ', 0.5)').replace('rgba', 'rgba');
        tail.style.borderRadius = '50%';
        tail.style.zIndex = '999';
        tail.style.pointerEvents = 'none';
        tail.style.transformOrigin = 'center top';
        document.body.appendChild(tail);
    }
    
    // Añadir al DOM
    document.body.appendChild(particle);
    
    // Datos para la animación
    const particleData = {
        element: particle,
        tail: tail,
        posX: x,
        posY: y,
        vx: vx,
        vy: vy,
        gravity: gravity,
        life: life,
        maxLife: life,
        size: size,
        rotation: 0,
        rotationSpeed: rotationSpeed,
        opacity: 1,
        type: type,
        hasBounced: false,
        canBounce: canBounce
    };
    
    // Añadir a la lista de partículas activas
    shootingSystem.activeParticles.push(particleData);
    
    // Iniciar animación
    requestAnimationFrame(() => animateParticle(particleData));
}

// Animar una partícula
function animateParticle(particle) {
    // Reducir vida
    particle.life -= 1;
    
    // Si la vida llegó a cero o es una partícula huérfana, eliminarla
    if (particle.life <= 0 || !particle.element || !particle.element.parentNode) {
        // Eliminar del DOM
        if (particle.element && particle.element.parentNode) {
            document.body.removeChild(particle.element);
        }
        
        // Eliminar la estela si existe
        if (particle.tail && particle.tail.parentNode) {
            document.body.removeChild(particle.tail);
        }
        
        // Eliminar de la lista de partículas activas
        const index = shootingSystem.activeParticles.indexOf(particle);
        if (index > -1) {
            shootingSystem.activeParticles.splice(index, 1);
        }
        
        return;
    }
    
    // Aplicar física
    particle.vy += particle.gravity;
    
    // Comprobar si puede rebotar en el "suelo" (solo para fragmentos metálicos)
    const canvas = document.getElementById('canvas-juego');
    if (canvas && particle.canBounce && !particle.hasBounced) {
        const canvasRect = canvas.getBoundingClientRect();
        const floorY = canvasRect.bottom - 20; // 20px desde el fondo
        
        if (particle.posY >= floorY) {
            // Invertir velocidad Y con pérdida de energía
            particle.vy = -particle.vy * 0.6;
            particle.vx = particle.vx * 0.8; // Reducir también velocidad X por fricción
            particle.hasBounced = true; // Para que solo rebote una vez
            
            // Crear pequeña partícula de "impacto"
            if (Math.random() > 0.5) {
                createImpactParticle(particle.posX, floorY);
            }
        }
    }
    
    // Actualizar posición
    particle.posX += particle.vx;
    particle.posY += particle.vy;
    
    // Efectos específicos por tipo
    switch(particle.type) {
        case 'brillo':
            // Parpadeo aleatorio
            if (Math.random() > 0.8) {
                particle.element.style.opacity = Math.random() * 0.5 + 0.5;
            }
            break;
            
        case 'humo':
            // Crecimiento gradual
            const scale = 1 + (1 - particle.life / particle.maxLife) * 2;
            particle.element.style.transform = `scale(${scale})`;
            break;
    }
    
    // Calcular opacidad basada en ciclo de vida
    particle.opacity = particle.life / particle.maxLife;
    
    // Aplicar rotación si tiene velocidad de rotación
    if (particle.rotationSpeed !== 0) {
        particle.rotation += particle.rotationSpeed;
        if (particle.element.style.borderBottom) {
            // Es un triángulo
            particle.element.style.transform = `rotate(${particle.rotation}deg)`;
        } else {
            // Es un círculo o cuadrado
            particle.element.style.transform = `rotate(${particle.rotation}deg)`;
        }
    }
    
    // Actualizar posición y opacidad
    particle.element.style.left = particle.posX + 'px';
    particle.element.style.top = particle.posY + 'px';
    particle.element.style.opacity = particle.opacity;
    
    // Actualizar la estela si existe
    if (particle.tail) {
        // Calcular posición y rotación de la estela
        const angle = Math.atan2(particle.vy, particle.vx);
        const distance = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        
        particle.tail.style.left = (particle.posX + particle.size/2) + 'px';
        particle.tail.style.top = (particle.posY + particle.size/2) + 'px';
        particle.tail.style.transform = `rotate(${angle + Math.PI/2}rad)`;
        particle.tail.style.opacity = particle.opacity * 0.7;
        particle.tail.style.height = (distance * 2) + 'px';
    }
    
    // Continuar animación
    requestAnimationFrame(() => animateParticle(particle));
}

// Crear pequeña partícula de impacto (cuando un fragmento rebota)
function createImpactParticle(x, y) {
    const impact = document.createElement('div');
    impact.style.position = 'fixed';
    impact.style.width = '4px';
    impact.style.height = '1px';
    impact.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    impact.style.left = x + 'px';
    impact.style.top = y + 'px';
    impact.style.zIndex = '999';
    impact.style.pointerEvents = 'none';
    
    document.body.appendChild(impact);
    
    let opacity = 1;
    let width = 4;
    
    // Animar el impacto (se expande y desaparece rápidamente)
    const animateImpact = () => {
        opacity -= 0.1;
        width += 1;
        
        if (opacity <= 0) {
            if (impact.parentNode) {
                document.body.removeChild(impact);
            }
            return;
        }
        
        impact.style.opacity = opacity;
        impact.style.width = width + 'px';
        impact.style.left = (x - width/2) + 'px'; // Mantener centrado mientras crece
        
        requestAnimationFrame(animateImpact);
    };
    
    requestAnimationFrame(animateImpact);
}

// Nueva función para ajustar la interfaz en dispositivos móviles
function adjustUIForMobile() {
    // Verificar si es un dispositivo móvil
    const isMobile = shootingSystem.isMobile;
    
    // Obtener orientación actual del dispositivo
    const isPortrait = window.innerHeight > window.innerWidth;
    
    // Referenciar los elementos de la interfaz
    const header = document.getElementById('zona-superior');
    const gameTitle = header ? header.querySelector('h1') : null;
    
    // Si no encontramos elementos, salir
    if (!header || !gameTitle) {
        return;
    }
    
    if (isPortrait) {
        // Modo vertical (portrait)
        console.log("Ajustando interfaz para modo vertical");
        
        // Configurar header para disposición vertical
        header.style.flexDirection = 'column';
        header.style.justifyContent = 'space-around';
        header.style.alignItems = 'center'; // Centrar horizontalmente
        
        // Ajustar título
        gameTitle.style.fontSize = '1.5rem';
        gameTitle.style.margin = '5px 0';
        gameTitle.style.textAlign = 'center';
        
        // Crear/obtener contenedor para estadísticas
        let statsContainer = document.getElementById('stats-container');
        if (!statsContainer) {
            statsContainer = document.createElement('div');
            statsContainer.id = 'stats-container';
            statsContainer.style.display = 'flex';
            statsContainer.style.justifyContent = 'space-between';
            statsContainer.style.width = '100%';
            statsContainer.style.padding = '0 10px';
            statsContainer.style.marginBottom = '5px';
            
            header.appendChild(statsContainer);
        }
        
        // Mover puntuación al contenedor
        if (shootingSystem.scoreDisplay) {
            shootingSystem.scoreDisplay.style.position = 'relative';
            shootingSystem.scoreDisplay.style.top = 'auto';
            shootingSystem.scoreDisplay.style.left = 'auto';
            
            if (shootingSystem.scoreDisplay.parentNode !== statsContainer) {
                if (shootingSystem.scoreDisplay.parentNode) {
                    shootingSystem.scoreDisplay.parentNode.removeChild(shootingSystem.scoreDisplay);
                }
                statsContainer.appendChild(shootingSystem.scoreDisplay);
            }
        }
        
        // Mover reloj al contenedor
        if (shootingSystem.timeDisplay) {
            shootingSystem.timeDisplay.style.position = 'relative';
            shootingSystem.timeDisplay.style.top = 'auto';
            shootingSystem.timeDisplay.style.right = 'auto';
            
            if (shootingSystem.timeDisplay.parentNode !== statsContainer) {
                if (shootingSystem.timeDisplay.parentNode) {
                    shootingSystem.timeDisplay.parentNode.removeChild(shootingSystem.timeDisplay);
                }
                statsContainer.appendChild(shootingSystem.timeDisplay);
            }
        }
        
        // Ajustar botones de juego
        if (shootingSystem.shootButton) {
            shootingSystem.shootButton.style.bottom = '12vh';
        }
        
        if (shootingSystem.resetButton) {
            shootingSystem.resetButton.style.bottom = '12vh';
        }
        
        if (shootingSystem.audioButton) {
            shootingSystem.audioButton.style.bottom = '12vh';
            shootingSystem.audioButton.style.left = 'calc(5vh + 20vmin)'; // Mantiene relación con el botón de reset
        }
    } else {
        // Modo horizontal (landscape)
        console.log("Ajustando interfaz para modo horizontal");
        
        // Restaurar header
        header.style.flexDirection = 'row';
        header.style.justifyContent = 'center';
        header.style.alignItems = 'center';
        
        // Restaurar título
        gameTitle.style.fontSize = '2rem';
        gameTitle.style.margin = '0';
        gameTitle.style.textAlign = 'center';
        
        // IMPORTANTE: Eliminar el contenedor de estadísticas si existe
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer && statsContainer.parentNode) {
            // Primero mover los displays de vuelta al body
            if (shootingSystem.scoreDisplay && shootingSystem.scoreDisplay.parentNode === statsContainer) {
                statsContainer.removeChild(shootingSystem.scoreDisplay);
                document.body.appendChild(shootingSystem.scoreDisplay);
            }
            
            if (shootingSystem.timeDisplay && shootingSystem.timeDisplay.parentNode === statsContainer) {
                statsContainer.removeChild(shootingSystem.timeDisplay);
                document.body.appendChild(shootingSystem.timeDisplay);
            }
            
            // Eliminar el contenedor
            statsContainer.parentNode.removeChild(statsContainer);
        }
        
        // Restaurar contadores
        if (shootingSystem.scoreDisplay) {
            shootingSystem.scoreDisplay.style.position = 'absolute';
            shootingSystem.scoreDisplay.style.top = '10px';
            shootingSystem.scoreDisplay.style.left = '10px';
        }
        
        if (shootingSystem.timeDisplay) {
            shootingSystem.timeDisplay.style.position = 'absolute';
            shootingSystem.timeDisplay.style.top = '10px';
            shootingSystem.timeDisplay.style.right = '10px';
        }
        
        // Restaurar botones
        if (shootingSystem.shootButton) {
            shootingSystem.shootButton.style.bottom = '5vh';
        }
        
        if (shootingSystem.resetButton) {
            shootingSystem.resetButton.style.bottom = '5vh';
        }
        
        if (shootingSystem.audioButton) {
            shootingSystem.audioButton.style.bottom = '5vh';
            shootingSystem.audioButton.style.left = 'calc(5vh + 20vmin)'; // Mantiene relación con el botón de reset
        }
    }
    
    // Ajustar canvas
    if (typeof ajustarCanvasYCapas === 'function') {
        ajustarCanvasYCapas();
    }
}

// Exportar funciones necesarias
window.initEffects = initEffects;
window.dibujarEffects = dibujarEffects;
window.resetGameTime = resetGameTime;

// Exportar funciones para el sistema de audio
window.playSound = playSound;
window.setAudioEnabled = function(enabled) {
    shootingSystem.audio.enabled = enabled;
};
window.setAudioVolume = function(volume) {
    // Asegurar que el volumen esté entre 0 y 1
    volume = Math.max(0, Math.min(1, volume));
    shootingSystem.audio.volume = volume;
    
    // Actualizar volumen en los objetos de audio
    if (shootingSystem.audio.hitSound) shootingSystem.audio.hitSound.volume = volume;
    if (shootingSystem.audio.missSound) shootingSystem.audio.missSound.volume = volume;
};
window.toggleAudioMute = function() {
    shootingSystem.audio.muted = !shootingSystem.audio.muted;
    return shootingSystem.audio.muted;
}; 

// Reiniciar el tiempo del juego
function resetGameTime() {
    console.log("Reiniciando sistema de tiempo...");
    
    // Detener el temporizador si existe
    if (shootingSystem.gameTimer) {
        clearInterval(shootingSystem.gameTimer);
        shootingSystem.gameTimer = null;
    }
    
    // Reiniciar variables de tiempo
    shootingSystem.gameStarted = false;
    shootingSystem.gameEnded = false;
    shootingSystem.gameStartTime = 0;
    
    // Actualizar el display a 1 minuto inicial
    if (shootingSystem.timeDisplay) {
        shootingSystem.timeDisplay.textContent = 'Tiempo: 01:00.0';
        shootingSystem.timeDisplay.style.color = 'rgba(0, 255, 255, 1)'; // Restaurar color original
        shootingSystem.timeDisplay.style.opacity = '1'; // Restaurar opacidad
    }
    
    // Restaurar los botones a su estado original
    if (shootingSystem.shootButton) {
        shootingSystem.shootButton.style.opacity = '1';
        shootingSystem.shootButton.style.pointerEvents = 'auto';
    }
    
    if (shootingSystem.resetButton) {
        shootingSystem.resetButton.style.transform = 'scale(1)';
        shootingSystem.resetButton.style.boxShadow = 'none';
    }
    
    // Limpiar todas las partículas activas
    clearAllParticles();
    
    console.log("Sistema de tiempo reiniciado correctamente");
}

// Función auxiliar para reiniciar el juego (como alternativa a window.resetGame)
window.effectsResetGame = function() {
    console.log("Ejecutando effectsResetGame como alternativa");
    
    // Reiniciar el tiempo primero
    if (typeof window.resetGameTime === 'function') {
        window.resetGameTime();
    }
    
    // Intentar obtener la función resetGame del módulo game.js
    if (typeof window.resetGame === 'function') {
        console.log("Llamando a window.resetGame desde effectsResetGame");
        window.resetGame();
    } else {
        console.log("Intentando reiniciar el juego manualmente");
        
        // Recargar la página como último recurso
        console.log("Recargando la página como último recurso");
        window.location.reload();
    }
};