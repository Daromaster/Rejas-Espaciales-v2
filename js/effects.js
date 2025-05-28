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
    totalScoreDisplay: null,    // Elemento para mostrar la puntuación total acumulada
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
    modalActive: false,         // Indica si hay un modal activo
    audio: {                    // Configuración de audio
        muted: false,
        volume: 0.3
    },
    // Sistema de detección de rendimiento
    performanceMonitor: {
        frameRates: [],         // Historial de framerates recientes
        lastFrameTime: 0,       // Tiempo del último frame para calcular FPS
        lowPerformanceMode: false, // Indicador de modo de bajo rendimiento
        frameRateThreshold: 50, // Umbral de FPS para considerar bajo rendimiento
        samplingSize: 30,       // Cantidad de muestras para promedio
        checkInterval: 1000,    // Intervalo para comprobar rendimiento (ms)
        lastCheckTime: 0,       // Último momento en que se comprobó el rendimiento
        consecutiveLowFPS: 0,   // Contador de frames consecutivos con bajo FPS
        forceCheckAfterShot: true, // Forzar comprobación después de cada disparo
        debugElement: null,     // Elemento para mostrar información de debug
        performanceTestedOnMobile: false // Indica si ya hemos realizado un test inicial en móvil
    },
    levelDisplay: null,         // Elemento para mostrar el nivel actual
    completedLevel: null        // Guardar el nivel completado para el ranking
};

// ===== CONFIGURACIÓN CENTRALIZADA DE BOTONES MÓVILES =====
// Esta configuración controla el posicionamiento de botones y etiquetas en dispositivos móviles
// Interactúa con: adjustUIForMobile(), createShootButton(), createResetButton(), createAudioButton()
const mobileButtonConfig = {
    // Posiciones de botones según orientación
    buttons: {
        landscape: {
            bottom: '5vh',      // Posición de botones en horizontal
            labelOffset: '2vh'  // Separación hacia abajo desde el botón (5vh - 2vh = 3vh desde bottom)
        },
        portrait: {
            bottom: '12vh',     // Posición de botones en vertical
            labelOffset: '6vh'  // Separación hacia abajo desde el botón (12vh - 6vh = 6vh desde bottom)
        }
    },
    
    // Función para calcular posición de etiquetas automáticamente
    getLabelPosition: function(isPortrait) {
        const config = isPortrait ? this.buttons.portrait : this.buttons.landscape;
        const buttonBottom = parseInt(config.bottom);
        const labelOffset = parseInt(config.labelOffset);
        
        // Para que aparezcan DEBAJO, restamos el offset del bottom del botón
        // (menor valor de bottom = más cerca del borde inferior = más abajo)
        const labelBottom = buttonBottom - labelOffset;
        return labelBottom + 'vh';
    },
    
    // Función para obtener posición de botones
    getButtonPosition: function(isPortrait) {
        return isPortrait ? this.buttons.portrait.bottom : this.buttons.landscape.bottom;
    }
};

// ===== FUNCIÓN CENTRALIZADA PARA ACTUALIZAR ETIQUETAS DE BOTONES =====
// Esta función actualiza las posiciones de todas las etiquetas según la orientación actual
function updateButtonLabels() {
    const isPortrait = window.innerHeight > window.innerWidth;
    const labelBottom = mobileButtonConfig.getLabelPosition(isPortrait);
    
    console.log(`Actualizando etiquetas de botones - Orientación: ${isPortrait ? 'vertical' : 'horizontal'}, Posición: ${labelBottom}`);
    
    // Actualizar etiqueta del botón de disparar
    const shootLabel = document.querySelector('[data-button-label="shoot"]');
    if (shootLabel) {
        shootLabel.style.bottom = labelBottom;
    }
    
    // Actualizar etiqueta del botón de reiniciar
    const resetLabel = document.querySelector('[data-button-label="reset"]');
    if (resetLabel) {
        resetLabel.style.bottom = labelBottom;
    }
    
    // Actualizar etiqueta del botón de audio
    const audioLabel = document.querySelector('[data-button-label="audio"]');
    if (audioLabel) {
        audioLabel.style.bottom = labelBottom;
    }
}

// Nuevo sistema de audio basado en Howler.js
function initAudioSystem() {
    console.log("Inicializando sistema de audio con Howler.js...");
    
    // Sistema avanzado de gestión de sonido para disparos rápidos
    const audioManager = {
        lastSoundTimes: {}, // Tiempo de la última reproducción de cada tipo de sonido
        cooldowns: {         // Tiempo mínimo entre reproducciones (ms)
            shoot: 200,      // Cooldown para disparo
            hit: 300,        // Cooldown para acierto
            miss: 400        // Cooldown para fallo
        },
        queuedSounds: {      // Sonidos en cola para reproducir cuando termine la secuencia
            hit: false,      // ¿Hay acierto en cola?
            miss: false      // ¿Hay fallo en cola?
        },
        isRapidFiring: false,    // ¿Estamos en modo de disparos rápidos?
        rapidFireThreshold: 300, // Umbral para considerar disparos rápidos (ms)
        lastShootTime: 0,        // Último momento de disparo
        rapidFireTimeout: null   // Temporizador para detectar fin de secuencia de disparos rápidos
    };
    
    // Guardar referencia del gestor de audio
    shootingSystem.audio.manager = audioManager;
    
    // Crear instancias de Howl para cada sonido
    shootingSystem.audio.sounds = {
        // Sonido de disparo
        shoot: new Howl({
            src: ['assets/audio/Disparo Sinte 1.wav'],
            volume: shootingSystem.audio.volume * 0.9,
            preload: true,
            pool: 3
        }),
        // Sonido de acierto (ganar puntos)
        hit: new Howl({
            src: ['assets/audio/Acierto Sinte 1.wav'],
            volume: shootingSystem.audio.volume,
            preload: true,
            pool: 2
        }),
        // Sonido de fallo (golpe en reja)
        miss: new Howl({
            src: ['assets/audio/Metal 1.wav'],
            volume: shootingSystem.audio.volume * 0.7,
            preload: true,
            pool: 2
        })
    };
    
    // Cargar preferencias de audio desde localStorage
    loadAudioPreferences();
    
    console.log("Sistema de audio con Howler.js inicializado correctamente");
}

// Cargar preferencias de audio guardadas
function loadAudioPreferences() {
    try {
        // Intentar cargar el estado del audio (muted o no)
        const audioPrefs = localStorage.getItem('rejasEspacialesAudioPrefs');
        
        if (audioPrefs) {
            const prefs = JSON.parse(audioPrefs);
            console.log("Preferencias de audio cargadas:", prefs);
            
            // Aplicar las preferencias guardadas
            shootingSystem.audio.muted = !!prefs.muted;
            shootingSystem.audio.enabled = !prefs.muted; // Habilitar audio si no está muteado
            
            // Actualizar el ícono del botón si ya existe
            if (shootingSystem.audioButton) {
                shootingSystem.audioButton.innerHTML = shootingSystem.audio.muted ? 
                    '<span style="color: white; font-size: 30px;">🔇</span>' : 
                    '<span style="color: white; font-size: 30px;">🔊</span>';
            }
        }
    } catch (error) {
        console.warn("No se pudieron cargar las preferencias de audio:", error);
    }
}

// Guardar preferencias de audio en localStorage
function saveAudioPreferences() {
    try {
        const audioPrefs = {
            muted: shootingSystem.audio.muted
        };
        
        localStorage.setItem('rejasEspacialesAudioPrefs', JSON.stringify(audioPrefs));
        console.log("Preferencias de audio guardadas:", audioPrefs);
    } catch (error) {
        console.warn("No se pudieron guardar las preferencias de audio:", error);
    }
}

// Reproducir un efecto de sonido con gestión inteligente
function playSound(soundType, delay = 0) {
    // No reproducir si el audio está deshabilitado o silenciado
    if (!shootingSystem.audio.enabled || shootingSystem.audio.muted) {
        return;
    }
    
    // Verificar que el tipo de sonido existe
    if (!shootingSystem.audio.sounds || !shootingSystem.audio.sounds[soundType]) {
        console.warn("Sonido no disponible:", soundType);
        return;
    }
    
    // Referencia al gestor de audio
    const audioManager = shootingSystem.audio.manager;
    const currentTime = performance.now();
    
    // Función para comprobar si estamos en modo de disparos rápidos
    const checkRapidFire = () => {
        const timeSinceLastShot = currentTime - audioManager.lastShootTime;
        
        // Si estamos disparando rápido
        if (timeSinceLastShot < audioManager.rapidFireThreshold) {
            // Activar modo de disparos rápidos si no estaba activado
            if (!audioManager.isRapidFiring) {
                console.log("Modo de disparos rápidos activado");
                audioManager.isRapidFiring = true;
            }
            
            // Limpiar timeout anterior si existe
            if (audioManager.rapidFireTimeout) {
                clearTimeout(audioManager.rapidFireTimeout);
            }
            
            // Configurar nuevo timeout para detectar fin de secuencia
            audioManager.rapidFireTimeout = setTimeout(() => {
                console.log("Fin de secuencia de disparos rápidos");
                audioManager.isRapidFiring = false;
                
                // Reproducir sonidos en cola al terminar la secuencia
                if (audioManager.queuedSounds.hit) {
                    shootingSystem.audio.sounds.hit.play();
                    audioManager.queuedSounds.hit = false;
                } else if (audioManager.queuedSounds.miss) {
                    shootingSystem.audio.sounds.miss.play();
                    audioManager.queuedSounds.miss = false;
                }
            }, audioManager.rapidFireThreshold + 100);
        }
        
        // Actualizar tiempo del último disparo
        audioManager.lastShootTime = currentTime;
    };
    
    // Función específica para reproducir sonido con reglas avanzadas
    const playSoundWithRules = () => {
        // Verificar tiempo desde última reproducción de este sonido
        const lastTime = audioManager.lastSoundTimes[soundType] || 0;
        const timeSinceLastSound = currentTime - lastTime;
        
        // Aplicar reglas según el tipo de sonido
        switch(soundType) {
            case 'shoot':
                // Si es un disparo, siempre reproducirlo pero comprobar modo de disparos rápidos
                checkRapidFire();
                
                // Si estamos en modo de disparos rápidos, reducir volumen y variar tono
                if (audioManager.isRapidFiring) {
                    const sound = shootingSystem.audio.sounds[soundType];
                    sound.volume(shootingSystem.audio.volume * 0.6);
                    sound.rate(0.9 + Math.random() * 0.2); // Variar tono ligeramente
                    sound.play();
                } else {
                    // Disparo normal a volumen completo
                    shootingSystem.audio.sounds[soundType].volume(shootingSystem.audio.volume * 0.9);
                    shootingSystem.audio.sounds[soundType].rate(1.0);
                    shootingSystem.audio.sounds[soundType].play();
                }
                break;
                
            case 'hit':
                // Si estamos en modo de disparos rápidos, encolar sonido de acierto
                if (audioManager.isRapidFiring) {
                    audioManager.queuedSounds.hit = true;
                } 
                // Si no es disparo rápido o ha pasado suficiente tiempo del último acierto, reproducir
                else if (timeSinceLastSound >= audioManager.cooldowns[soundType]) {
                    shootingSystem.audio.sounds[soundType].play();
                }
                break;
                
            case 'miss':
                // Si estamos en modo de disparos rápidos, encolar sonido de fallo
                // (con menor prioridad que el acierto)
                if (audioManager.isRapidFiring) {
                    if (!audioManager.queuedSounds.hit) { // Solo si no hay acierto en cola
                        audioManager.queuedSounds.miss = true;
                    }
                } 
                // Si no es disparo rápido o ha pasado suficiente tiempo, reproducir
                else if (timeSinceLastSound >= audioManager.cooldowns[soundType]) {
                    shootingSystem.audio.sounds[soundType].play();
                }
                break;
                
            default:
                // Para otros sonidos, aplicar cooldown simple
                if (timeSinceLastSound >= (audioManager.cooldowns[soundType] || 200)) {
                    shootingSystem.audio.sounds[soundType].play();
                }
        }
        
        // Actualizar tiempo de última reproducción
        audioManager.lastSoundTimes[soundType] = currentTime;
    };
    
    // Reproducir con o sin retraso
    if (delay > 0) {
        setTimeout(playSoundWithRules, delay);
    } else {
        playSoundWithRules();
    }
}

// Actualizar volumen de todos los sonidos
window.setAudioVolume = function(volume) {
    // Asegurar que el volumen esté entre 0 y 1
    volume = Math.max(0, Math.min(1, volume));
    shootingSystem.audio.volume = volume;
    
    // Actualizar volumen en todos los sonidos
    if (shootingSystem.audio.sounds) {
        Object.values(shootingSystem.audio.sounds).forEach(sound => {
            sound.volume(volume);
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
    
    // Crear display del nivel actual
    createLevelDisplay();
    
    // Crear y configurar el elemento de tiempo
    createTimeDisplay();
    
    // Actualizar instrucciones según el dispositivo
    updateInstructions();
    
    // Ajustar la interfaz para dispositivos móviles
    adjustUIForMobile();
    
    // 🔄 Llamada adicional con delay para reorganizar si ya estamos en nivel 2+
    setTimeout(() => {
        if (shootingSystem.isMobile && window.LevelManager && window.LevelManager.current.level >= 2) {
            console.log("🔄 Reorganización adicional para nivel 2+ en carga inicial...");
            adjustUIForMobile();
        }
    }, 200);
    
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
    
    // Activar el modo modal
    setModalActive(true);
    
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
        
        // Desactivar el modo modal
        setModalActive(false);
        
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
    // Si existe la función de debug móvil, usarla
    if (typeof window.checkIfMobileWithDebug === 'function') {
        return window.checkIfMobileWithDebug();
    }
    
    // Fallback a detección tradicional
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
}

// Actualizar instrucciones según el dispositivo
function updateInstructions() {
    const zonaInferior = document.getElementById('zona-inferior');
    if (zonaInferior) {
        if (shootingSystem.isMobile) {
            // COMENTADO: Instrucciones de modo móvil eliminadas por solicitud del usuario
            // Las etiquetas junto a los botones (Disparar, Audio, Reiniciar) se mantienen
            // zonaInferior.innerHTML = '<p>Toca el botón <span style="color: #FF9500;">⚡</span> para Disparar | <span style="color: #FFA500;">🔇</span> para Audio | <span style="color: #5F9EA0;">↺</span> para Reiniciar</p>';
            zonaInferior.innerHTML = ''; // Limpiar instrucciones en modo móvil
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
        
        // Obtener posición inicial según orientación
        const isPortrait = window.innerHeight > window.innerWidth;
        const buttonBottom = mobileButtonConfig.getButtonPosition(isPortrait);
        
        // Estilos del botón
        shootButton.style.position = 'absolute';
        shootButton.style.bottom = buttonBottom;
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
        
        // Mostrar etiqueta "Disparar" junto al botón SIEMPRE
        const label = document.createElement('div');
        label.setAttribute('data-button-label', 'shoot'); // Identificador para actualización automática
        label.style.position = 'absolute';
        label.style.bottom = mobileButtonConfig.getLabelPosition(isPortrait);
        label.style.right = '5vh';
        label.style.color = 'white';
        label.style.fontWeight = 'bold';
        label.style.textShadow = '0 0 5px #000';
        label.style.zIndex = '1000';
        label.style.fontSize = '14px'; // Tamaño de fuente apropiado
        label.innerHTML = 'Disparar';
        document.body.appendChild(label);
        
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
        
        // Obtener posición inicial según orientación
        const isPortrait = window.innerHeight > window.innerWidth;
        const buttonBottom = mobileButtonConfig.getButtonPosition(isPortrait);
        
        // Estilos del botón (similar al botón de reinicio pero con color diferente)
        audioButton.style.position = 'absolute';
        audioButton.style.bottom = buttonBottom;
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
        
        // Usar el símbolo correspondiente según el estado actual del audio
        audioButton.innerHTML = shootingSystem.audio.muted ? 
            '<span style="color: white; font-size: 30px;">🔇</span>' : 
            '<span style="color: white; font-size: 30px;">🔊</span>';
        
        // Añadir eventos de toque/clic
        audioButton.addEventListener('touchstart', handleAudioButtonPress);
        audioButton.addEventListener('mousedown', handleAudioButtonPress);
        
        // Prevenir eventos predeterminados de los toques
        audioButton.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // Mostrar etiqueta "Audio" junto al botón SIEMPRE
        const label = document.createElement('div');
        label.setAttribute('data-button-label', 'audio'); // Identificador para actualización automática
        label.style.position = 'absolute';
        label.style.bottom = mobileButtonConfig.getLabelPosition(isPortrait);
        label.style.left = 'calc(5vh + 20vmin)'; // Alineado con el botón de audio
        label.style.color = 'white';
        label.style.fontWeight = 'bold';
        label.style.textShadow = '0 0 5px #000';
        label.style.zIndex = '1000';
        label.style.fontSize = '14px'; // Tamaño de fuente apropiado
        label.innerHTML = 'Audio';
        document.body.appendChild(label);
        
        // Añadir al DOM
        document.body.appendChild(audioButton);
        
        // Guardar referencia
        shootingSystem.audioButton = audioButton;
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
    
    // Guardar preferencias en localStorage
    saveAudioPreferences();
    
    return false;
}

// Crear y configurar el botón de reinicio
function createResetButton() {
    // Crear el botón si no existe
    if (!shootingSystem.resetButton) {
        const resetButton = document.createElement('div');
        resetButton.id = 'reset-button';
        
        // Obtener posición inicial según orientación
        const isPortrait = window.innerHeight > window.innerWidth;
        const buttonBottom = mobileButtonConfig.getButtonPosition(isPortrait);
        
        // Estilos del botón (similar al botón de disparo pero del lado izquierdo)
        resetButton.style.position = 'absolute';
        resetButton.style.bottom = buttonBottom;
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
        
        // Mostrar etiqueta "Reiniciar" junto al botón SIEMPRE
        const label = document.createElement('div');
        label.setAttribute('data-button-label', 'reset'); // Identificador para actualización automática
        label.style.position = 'absolute';
        label.style.bottom = mobileButtonConfig.getLabelPosition(isPortrait);
        label.style.left = '5vh';
        label.style.color = 'white';
        label.style.fontWeight = 'bold';
        label.style.textShadow = '0 0 5px #000';
        label.style.zIndex = '1000';
        label.style.fontSize = '14px'; // Tamaño de fuente apropiado
        label.innerHTML = 'Reiniciar';
        document.body.appendChild(label);
        
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
    
    // Usar la función unificada para reiniciar el juego
    window.completeGameReset();
    
    return false;
}

function handleKeyDown(event) {
    // Verificar si hay un panel modal activo
    if (shootingSystem.modalActive) {
        // Si estamos en un input, permitir la entrada de texto normal
        const isInputActive = document.activeElement && document.activeElement.tagName === 'INPUT';
        
        if (isInputActive) {
            // Si estamos en un input, permitir todas las teclas para poder escribir
            return;
        } else {
            // Permitir teclas de desarrollo y navegador incluso en modo modal
            
            // Lista de teclas permitidas (teclas funcionales y teclas de desarrollo)
            const allowedKeys = [
                'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                'PrintScreen', 'ScrollLock', 'Pause', 'Insert'
            ];
            
            // Verificar si la tecla es una de las permitidas
            if (allowedKeys.includes(event.key) || 
                event.ctrlKey ||  // Permitir combinaciones con Ctrl
                event.altKey ||   // Permitir combinaciones con Alt
                event.metaKey) {  // Permitir combinaciones con tecla Windows/Command
                
                // Permitir que estas teclas funcionen normalmente
                return;
            }
            
            // Si es Escape, cerrar el panel activo
            if (event.code === 'Escape') {
                closeActiveModal();
            }
            
            // Prevenir acción de otras teclas cuando hay un modal activo
            event.preventDefault();
            return;
        }
    }
    
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
        // Usar la función unificada para reiniciar
        window.completeGameReset();
    }
}

function tryToShoot() {
    // No permitir disparos si hay un panel modal activo
    if (shootingSystem.modalActive) {
        console.log("No se permite disparar mientras hay un panel abierto");
        return;
    }
    
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
    
    // Reproducir sonido de disparo
    playSound('shoot');
    
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
        // Reproducir sonido de acierto
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
            // Destello del marcador del nivel
            shootingSystem.scoreDisplay.style.transition = 'all 0.2s ease-in-out';
            shootingSystem.scoreDisplay.style.transform = 'scale(1.2)';
            shootingSystem.scoreDisplay.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
            
            // Volver al estado normal
            setTimeout(() => {
                shootingSystem.scoreDisplay.style.transform = 'scale(1)';
                shootingSystem.scoreDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }, 200);
        }
        
        // Efecto adicional en el display de puntuación total (si está visible)
        if (shootingSystem.totalScoreDisplay && shootingSystem.totalScoreDisplay.style.display === 'block') {
            // Destello del marcador total
            shootingSystem.totalScoreDisplay.style.transition = 'all 0.2s ease-in-out';
            shootingSystem.totalScoreDisplay.style.transform = 'scale(1.2)';
            shootingSystem.totalScoreDisplay.style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // Color dorado
            
            // Volver al estado normal
            setTimeout(() => {
                shootingSystem.totalScoreDisplay.style.transform = 'scale(1)';
                shootingSystem.totalScoreDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }, 200);
        }
    } else {
        // Reproducir sonido de impacto en reja
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
            
            // Efecto adicional en el display de puntuación total (si está visible)
            if (shootingSystem.totalScoreDisplay && shootingSystem.totalScoreDisplay.style.display === 'block') {
                // Destello del marcador total (penalización)
                shootingSystem.totalScoreDisplay.style.transition = 'all 0.2s ease-in-out';
                shootingSystem.totalScoreDisplay.style.transform = 'scale(1.2)';
                shootingSystem.totalScoreDisplay.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; // Color rojo para penalización
                
                // Volver al estado normal
                setTimeout(() => {
                    shootingSystem.totalScoreDisplay.style.transform = 'scale(1)';
                    shootingSystem.totalScoreDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
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
    // Crear el elemento de puntuación del nivel actual si no existe
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
        scoreElement.textContent = 'Puntaje: 0';
        
        // Añadir al DOM
        document.body.appendChild(scoreElement);
        
        // Guardar referencia
        shootingSystem.scoreDisplay = scoreElement;
    }
    
    // Crear el elemento de puntuación total si no existe
    if (!shootingSystem.totalScoreDisplay) {
        const totalScoreElement = document.createElement('div');
        totalScoreElement.id = 'total-score-display';
        
        // Estilos del elemento (debajo del puntaje del nivel)
        totalScoreElement.style.position = 'absolute';
        totalScoreElement.style.top = '45px'; // Debajo del puntaje del nivel
        totalScoreElement.style.left = '10px';
        totalScoreElement.style.color = 'rgba(255, 255, 0, 1)'; // Color dorado para diferenciarlo
        totalScoreElement.style.fontFamily = 'Arial, sans-serif';
        totalScoreElement.style.fontSize = '14px'; // Ligeramente más pequeño
        totalScoreElement.style.fontWeight = 'bold';
        totalScoreElement.style.padding = '4px 8px';
        totalScoreElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        totalScoreElement.style.borderRadius = '5px';
        totalScoreElement.style.zIndex = '1000';
        totalScoreElement.style.textShadow = '1px 1px 2px #000';
        totalScoreElement.style.display = 'none'; // Oculto inicialmente
        
        // Contenido inicial
        totalScoreElement.textContent = 'Total: 0';
        
        // Añadir al DOM
        document.body.appendChild(totalScoreElement);
        
        // Guardar referencia
        shootingSystem.totalScoreDisplay = totalScoreElement;
    }
    
    // Configurar actualización periódica de la puntuación
    if (!shootingSystem.scoreUpdateInterval) {
        shootingSystem.scoreUpdateInterval = setInterval(updateScoreDisplay, 500); // Actualizar cada 500ms
    }
}

// Actualizar el elemento de puntuación
function updateScoreDisplay() {
    if (shootingSystem.scoreDisplay && window.gameState) {
        // Actualizar puntaje del nivel actual
        shootingSystem.scoreDisplay.textContent = 'Puntaje: ' + window.gameState.score;
    }
    
    if (shootingSystem.totalScoreDisplay && window.LevelManager) {
        // Obtener nivel actual
        const currentLevel = window.LevelManager.current.level;
        
        // Calcular puntuación total: puntuación acumulada + puntuación del nivel actual
        const accumulatedScore = window.LevelManager.progress.totalScore;
        const currentLevelScore = window.gameState ? window.gameState.score : 0;
        const totalScore = accumulatedScore + currentLevelScore;
        
        // Actualizar display de puntuación total
        shootingSystem.totalScoreDisplay.textContent = 'Total: ' + totalScore;
        
        // Guardar el estado actual de visibilidad antes del cambio
        const wasVisible = shootingSystem.totalScoreDisplay.style.display === 'block';
        
        // Mostrar el display total solo del nivel 2 en adelante
        if (currentLevel >= 2) {
            shootingSystem.totalScoreDisplay.style.display = 'block';
            
            // Si no era visible antes y ahora sí, reorganizar interfaz móvil
            if (!wasVisible && shootingSystem.isMobile) {
                console.log("🔄 Puntaje total ahora visible - Reorganizando interfaz móvil...");
                setTimeout(adjustUIForMobile, 100); // Pequeño delay para asegurar que el DOM se actualice
            }
        } else {
            shootingSystem.totalScoreDisplay.style.display = 'none';
        }
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

// Crear y configurar el elemento para mostrar el nivel actual
function createLevelDisplay() {
    // Crear el elemento si no existe
    if (!shootingSystem.levelDisplay) {
        const levelElement = document.createElement('div');
        levelElement.id = 'level-display';
        
        // Estilos del elemento (debajo del título del juego)
        levelElement.style.position = 'absolute';
        levelElement.style.top = '65px'; // Más separado del título (era 50px)
        levelElement.style.left = '50%';
        levelElement.style.transform = 'translateX(-50%)';
        levelElement.style.color = 'rgba(255, 255, 255, 1)';
        levelElement.style.fontFamily = 'Arial, sans-serif';
        levelElement.style.fontSize = '14px'; // Ligeramente más pequeño
        levelElement.style.fontWeight = 'bold';
        levelElement.style.padding = '4px 12px'; // Más compacto
        levelElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        levelElement.style.borderRadius = '5px';
        levelElement.style.zIndex = '1000';
        levelElement.style.textShadow = '1px 1px 2px #000';
        levelElement.style.border = '1px solid rgba(255, 255, 255, 0.3)';
        
        // Contenido inicial
        levelElement.textContent = 'Nivel: 1 - Básico';
        
        // Añadir al DOM
        document.body.appendChild(levelElement);
        
        // Guardar referencia
        shootingSystem.levelDisplay = levelElement;
        
        // Configurar actualización periódica del nivel
        setInterval(updateLevelDisplay, 1000); // Actualizar cada segundo
    }
}

// Actualizar el elemento del nivel actual
function updateLevelDisplay() {
    if (!shootingSystem.levelDisplay) return;
    
    if (window.LevelManager) {
        const levelInfo = window.LevelManager.getCurrentLevelInfo();
        let levelText = `Nivel: ${levelInfo.level} - ${levelInfo.name}`;
        
        // Añadir sub-nivel si existe
        if (levelInfo.subLevel) {
            levelText += levelInfo.subLevel.toUpperCase();
        }
        
        shootingSystem.levelDisplay.textContent = levelText;
        
        // 🎨 Cambiar color de borde según el nivel para que coincida con la reja
        if (window.getGridColorsForLevel) {
            const gridColors = window.getGridColorsForLevel();
            if (gridColors) {
                // Usar el color brillante de la reja como color de borde
                shootingSystem.levelDisplay.style.borderColor = gridColors.bright;
                shootingSystem.levelDisplay.style.boxShadow = `0 0 5px ${gridColors.bright}40`; // 40 = 25% opacity en hex
            }
        }
    } else if (window.gameState && window.gameState.currentLevel) {
        // Fallback si LevelManager no está disponible
        shootingSystem.levelDisplay.textContent = `Nivel: ${window.gameState.currentLevel}`;
    }
}

// Iniciar el temporizador del juego
function startGameTimer() {
    if (!shootingSystem.gameStarted) {
        shootingSystem.gameStarted = true;
        shootingSystem.gameStartTime = Date.now();
        
        // 🚀 WAKE-UP CRÍTICO: Despertar backend al iniciar juego o nuevo nivel
        console.log("🎮 Juego/Nivel iniciado - Despertando backend para asegurar disponibilidad...");
        
        // Hacer wake-up en producción (GitHub Pages) para cada inicio de nivel
        if (window.apiClient && !window.apiClient.config.isLocalEnvironment()) {
            // Determinar si es primer nivel o nivel siguiente
            const currentLevel = window.LevelManager ? window.LevelManager.current.level : 1;
            const levelType = currentLevel === 1 ? 'primer nivel' : `nivel ${currentLevel}`;
            
            // Wake-up asíncrono sin bloquear el inicio del juego/nivel
            (async () => {
                try {
                    console.log(`🔄 Wake-up del backend para ${levelType}...`);
                    const startTime = performance.now();
                    
                    const response = await fetch(`${window.apiClient.config.getBaseUrl()}/health`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(15000), // 15 segundos timeout
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': `RejasEspacialesGame/Level${currentLevel}Start`
                        }
                    });
                    
                    const endTime = performance.now();
                    const responseTime = Math.round(endTime - startTime);
                    
                    if (response.ok) {
                        console.log(`✅ Backend despertado exitosamente para ${levelType} en ${responseTime}ms`);
                        // Actualizar indicador si existe
                        const statusDiv = document.getElementById('backend-status');
                        if (statusDiv) {
                            statusDiv.style.display = 'block';
                            statusDiv.innerHTML = `
                                <div style="color: rgba(100, 255, 100, 0.9);">
                                    ✅ Backend listo (${levelType})
                                </div>
                                <div style="font-size: 10px; margin-top: 2px;">
                                    Respuesta: ${responseTime}ms
                                </div>
                            `;
                            
                            // Ocultar después de 3 segundos
                            setTimeout(() => {
                                statusDiv.style.display = 'none';
                            }, 3000);
                        }
                    } else {
                        console.warn(`⚠️ Backend respondió con status ${response.status} para ${levelType}`);
                    }
                } catch (error) {
                    console.log(`⚠️ Error al despertar backend para ${levelType}: ${error.message}`);
                    // No es crítico si falla, el juego continúa
                }
            })();
        }
        
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
    
    // Obtener duración del nivel actual desde LevelManager
    let totalGameTime = 60 * 1000; // Default: 1 minuto en milisegundos
    if (window.LevelManager) {
        totalGameTime = window.LevelManager.getCurrentLevelDuration();
        console.log(`⏱️ Usando duración de nivel: ${totalGameTime}ms`);
    }
    
    // Calcular tiempo restante
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
    
    // Si llega a 0, verificar si termina nivel o el juego completo
    if (remainingTime <= 0) {
        handleTimeExpired();
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

// Terminar el juego voluntariamente desde transición de nivel
function endGameVoluntarily(finalScore) {
    console.log("🏁 Terminando juego voluntariamente con puntuación:", finalScore);
    
    // Marcar como juego terminado
    shootingSystem.gameEnded = true;
    
    // Detener el temporizador si existe
    if (shootingSystem.gameTimer) {
        clearInterval(shootingSystem.gameTimer);
        shootingSystem.gameTimer = null;
    }
    
    // Detener el bucle del juego
    if (window.gameState) {
        window.gameState.isRunning = false;
        if (window.gameLoopRequestId) {
            window.cancelAnimationFrame(window.gameLoopRequestId);
            window.gameLoopRequestId = null;
        }
        
        // Actualizar puntuación final en gameState
        window.gameState.score = finalScore;
    }
    
    // Desactivar visualmente los botones
    if (shootingSystem.shootButton) {
        shootingSystem.shootButton.style.opacity = '0.3';
        shootingSystem.shootButton.style.pointerEvents = 'none';
    }
    
    if (shootingSystem.resetButton) {
        shootingSystem.resetButton.style.transform = 'scale(1.1)';
        shootingSystem.resetButton.style.boxShadow = '0 0 15px rgba(95, 158, 160, 0.8)';
    }
    
    // Limpiar todos los disparos activos
    shootingSystem.shots = [];
    shootingSystem.isActive = false;
    
    // Mostrar directamente el panel de fin de juego con opciones de ranking
    showGameEndMessage();
}

// Mostrar panel de fin de juego con puntuación y opciones
function showGameEndMessage() {
    console.log("Mostrando panel de fin de juego");
    
    // Obtener puntuación final
    const finalScore = window.gameState ? window.gameState.score : 0;
    
    // Crear levelResult para compatibilidad con el modal unificado
    const levelResult = {
        levelCompleted: true,
        isLastLevel: true,
        levelScore: finalScore,
        totalScore: finalScore,
        nextLevel: null
    };
    
    // Usar el modal unificado en modo fin de juego
    showUnifiedGameModal(levelResult, true);
}

// Mostrar formulario para enviar puntuación al ranking
function showRankingSubmitForm(panel, score) {
    // Determinar tamaños y espaciado basados en si es dispositivo móvil
    const isMobile = shootingSystem.isMobile;
    const buttonPadding = isMobile ? '16px 20px' : '12px 20px';
    const buttonMargin = isMobile ? '10px 0' : '5px 0';
    const buttonSize = isMobile ? '20px' : '18px';
    const inputPadding = isMobile ? '15px' : '10px';
    const inputFontSize = isMobile ? '18px' : '16px';

    // Intentar recuperar el nombre guardado anteriormente
    let savedPlayerName = '';
    try {
        savedPlayerName = localStorage.getItem('rejasEspacialesPlayerName') || '';
        if (savedPlayerName) {
            console.log("Nombre de jugador recuperado de localStorage:", savedPlayerName);
        }
    } catch(storageError) {
        console.warn("No se pudo recuperar el nombre desde localStorage:", storageError);
    }

    // Cambiar el contenido del panel
    panel.innerHTML = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 20px 0; font-size: 24px;">Guardar Puntuación</h2>
        <p style="font-size: 16px; margin: 15px 0;">Ingresa tu nombre para guardar tu puntuación en el ranking:</p>
        <p style="font-size: 28px; margin: 10px 0; color: rgba(0, 255, 255, 1); font-weight: bold;">${score} puntos</p>
        
        <div style="margin: 20px 0;">
            <input type="text" id="player-name-input" placeholder="Tu nombre" style="padding: ${inputPadding}; width: 80%; font-size: ${inputFontSize}; border-radius: 5px; border: 2px solid rgba(0, 255, 255, 0.5); background-color: rgba(0, 0, 0, 0.7); color: white;" maxlength="20" value="${savedPlayerName}">
        </div>
        
        <div id="ranking-submit-message" style="min-height: 20px; margin: 10px 0; color: rgba(255, 255, 0, 0.8);"></div>
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
            <button id="save-score-button" style="background-color: rgba(50, 205, 50, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">GUARDAR</button>
            <button id="cancel-score-button" style="background-color: rgba(150, 150, 150, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">CANCELAR</button>
        </div>
    `;
    
    // Configurar botón de guardar
    const saveButton = document.getElementById('save-score-button');
    const nameInput = document.getElementById('player-name-input');
    const messageDiv = document.getElementById('ranking-submit-message');
    
    if (saveButton && nameInput && messageDiv) {
        // Si hay un nombre guardado, seleccionarlo para facilitar edición
        if (savedPlayerName) {
            // ❌ AUTO-FOCUS REMOVIDO: No dar foco ni seleccionar automáticamente
            // Anteriormente: nameInput.focus() y nameInput.select()
            // Ahora: El nombre se muestra automáticamente pero sin foco
        } else {
            // ❌ AUTO-FOCUS REMOVIDO: No dar foco automático para evitar teclado móvil
            // Anteriormente se daba foco automático en ambos casos:
            // 1. Si había nombre guardado: nameInput.focus() y nameInput.select()
            // 2. Si no había nombre: nameInput.focus() (excepto iOS)
            // Ahora el usuario debe hacer clic manualmente en el campo si quiere editarlo
            // El nombre por defecto se mostrará automáticamente pero sin foco
        }
        
        // Handler para guardar
        const handleSave = async function(e) {
            e.preventDefault(); // Prevenir comportamiento predeterminado
            
            // Deshabilitar botón temporalmente
            saveButton.disabled = true;
            saveButton.textContent = "GUARDANDO...";
            saveButton.style.backgroundColor = "rgba(100, 100, 100, 0.5)";
            
            const playerName = nameInput.value.trim();
            
            // Validar que el nombre no esté vacío
            if (!playerName) {
                messageDiv.textContent = "Por favor ingresa tu nombre";
                messageDiv.style.color = "rgba(255, 50, 50, 0.9)";
                // Reactivar botón
                saveButton.disabled = false;
                saveButton.textContent = "GUARDAR";
                saveButton.style.backgroundColor = "rgba(50, 205, 50, 0.8)";
                return;
            }
            
            const deviceType = shootingSystem.isMobile ? 'mobile' : 'desktop';
            let ubicacion = "desconocida";
            
            // Agregar variable para controlar el modo de respaldo
            let isRetryWithoutGeo = saveButton.dataset.retryWithoutGeo === 'true';
            
            try {
                // Solo intentar geolocalización si no es un reintento sin geo
                if (!isRetryWithoutGeo) {
                    messageDiv.textContent = "Obteniendo ubicación...";
                    
                    // Verificar si estamos en entorno de desarrollo
                    const isLocalEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    
                    if (isLocalEnv) {
                        // En desarrollo local
                        try {
                            ubicacion = await window.apiClient.ranking.getLocationFromIP();
                            console.log("Ubicación obtenida por IP:", ubicacion);
                        } catch (geoError) {
                            console.warn("Error en geolocalización IP:", geoError);
                            ubicacion = "desconocida";
                        }
                    } else if (navigator.geolocation) {
                        // En producción, usar la API de geolocalización del navegador
                        console.log("Entorno de producción, usando geolocalización del navegador");
                        
                        try {
                            // Envolver la geolocalización en una promesa para manejarla mejor
                            const getPosition = () => {
                                return new Promise((resolve, reject) => {
                                    // MEJORA: Timeouts diferenciados por dispositivo
                                    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
                                    const timeoutMs = isMobile ? 3000 : 8000; // Móvil: 3s, Desktop: 8s
                                    
                                    console.log(`Detectado dispositivo: ${isMobile ? 'móvil' : 'desktop'}, timeout: ${timeoutMs}ms`);
                                    
                                    const geoTimeout = setTimeout(() => {
                                        reject(new Error('Geolocation timeout'));
                                    }, timeoutMs);
                                    
                                    const geoOptions = { 
                                        timeout: isMobile ? 2500 : 6000,        // Móvil: 2.5s, Desktop: 6s
                                        enableHighAccuracy: isMobile            // Solo alta precisión en móvil
                                    };
                                    
                                    navigator.geolocation.getCurrentPosition(
                                        position => {
                                            clearTimeout(geoTimeout);
                                            resolve(position);
                                        },
                                        error => {
                                            clearTimeout(geoTimeout);
                                            reject(error);
                                        },
                                        geoOptions
                                    );
                                });
                            };
                            
                            try {
                                messageDiv.textContent = "Solicitando ubicación...";
                                const position = await getPosition();
                                
                                messageDiv.textContent = "Obteniendo nombre de localidad...";
                                
                                try {
                                    // Usar las coordenadas para obtener el nombre de la localidad con un timeout
                                    if (window.apiClient && window.apiClient.ranking) {
                                        const locationPromise = window.apiClient.ranking.getLocationFromCoords(
                                            position.coords.latitude, 
                                            position.coords.longitude
                                        );
                                        
                                        const timeoutPromise = new Promise((_, reject) => {
                                            setTimeout(() => reject(new Error('Reverse geocoding timeout')), 3000); // Reducido de 5000 a 3000
                                        });
                                        
                                        // Race entre la obtención de ubicación y el timeout
                                        ubicacion = await Promise.race([locationPromise, timeoutPromise])
                                            .catch(error => {
                                                console.warn("Error o timeout en geocodificación inversa:", error);
                                                return "desconocida";
                                            });
                                    }
                                } catch (reverseGeoError) {
                                    console.warn("Error en geocodificación inversa:", reverseGeoError);
                                    ubicacion = "desconocida";
                                }
                            } catch (positionError) {
                                console.error("Error de geolocalización:", positionError.message);
                                messageDiv.textContent = "Ubicación GPS no disponible, probando método alternativo...";
                                
                                // NUEVO: Intentar geolocalización por IP como respaldo
                                try {
                                    console.log("Intentando geolocalización por IP como respaldo...");
                                    if (window.apiClient && window.apiClient.ranking) {
                                        ubicacion = await window.apiClient.ranking.getLocationFromIP();
                                        console.log("✅ Ubicación obtenida por IP como respaldo:", ubicacion);
                                    }
                                } catch (ipGeoError) {
                                    console.warn("Error en geolocalización por IP:", ipGeoError);
                                    ubicacion = "desconocida";
                                }
                            }
                        } catch (geoWrapperError) {
                            console.warn("Error en wrapper de geolocalización:", geoWrapperError);
                            ubicacion = "desconocida";
                        }
                    } else {
                        // NUEVO: Si no hay navigator.geolocation, intentar por IP directamente
                        console.log("Geolocalización no disponible, usando método por IP...");
                        try {
                            if (window.apiClient && window.apiClient.ranking) {
                                ubicacion = await window.apiClient.ranking.getLocationFromIP();
                                console.log("✅ Ubicación obtenida por IP (navegador sin GPS):", ubicacion);
                            }
                        } catch (ipGeoError) {
                            console.warn("Error en geolocalización por IP:", ipGeoError);
                            ubicacion = "desconocida";
                        }
                    }
                } else {
                    // En modo reintento, saltamos la geolocalización
                    console.log("Modo reintento: Saltando geolocalización");
                    ubicacion = "desconocida";
                }
            } catch (outerGeoError) {
                console.warn("Error general al obtener ubicación:", outerGeoError);
                ubicacion = "desconocida";
            }
            
            messageDiv.textContent = "Guardando puntuación...";
            
            try {
                // Usar el cliente API para guardar la puntuación
                if (window.apiClient && window.apiClient.ranking) {
                    // 🎯 CORRECCIÓN: Usar el nivel completado, no el nivel actual
                    // Si hay un nivel completado guardado (desde transición), usarlo
                    // Si no, usar el nivel actual (para partidas normales que terminan por tiempo)
                    const currentLevel = shootingSystem.completedLevel || 
                        (window.LevelManager ? `${window.LevelManager.current.level}` : "1");
                    
                    console.log(`🎯 Guardando ranking con nivel: ${currentLevel}`);
                    
                    // Guardar la puntuación
                    const savePromise = window.apiClient.ranking.save(playerName, score, deviceType, ubicacion, currentLevel);
                    
                    // Aplicar un timeout para evitar bloqueos
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Timeout al guardar")), 8000) // Aumentado de 5000 a 8000
                    );
                    
                    const result = await Promise.race([savePromise, timeoutPromise]);
                    
                    console.log("Resultado de guardar puntuación:", result);
                    
                    // Guardar el nombre del jugador en localStorage para futuras partidas
                    try {
                        localStorage.setItem('rejasEspacialesPlayerName', playerName);
                        console.log("Nombre del jugador guardado en localStorage:", playerName);
                    } catch(storageError) {
                        console.warn("No se pudo guardar el nombre en localStorage:", storageError);
                    }
                    
                    // Mostrar mensaje según el resultado
                    if (result.fallbackUsed) {
                        // Se usó el respaldo local
                        messageDiv.innerHTML = `
                            <p style="color: rgba(255, 165, 0, 0.9); margin-bottom: 10px;">
                                ⚠️ Servidor no disponible<br>
                                <span style="font-size: 0.9em;">Puntuación guardada localmente</span>
                            </p>
                            <p style="color: rgba(255, 255, 255, 0.8); font-size: 0.8em;">
                                Se sincronizará cuando el servidor esté disponible
                            </p>
                        `;
                    } else if (result.serverSave) {
                        // Guardado exitoso en el servidor
                        messageDiv.innerHTML = `
                            <p style="color: rgba(0, 255, 0, 0.9);">
                                ✅ Puntuación guardada exitosamente
                            </p>
                        `;
                    } else {
                        // Resultado desconocido pero exitoso
                        messageDiv.innerHTML = `
                            <p style="color: rgba(0, 255, 0, 0.9);">
                                ✅ Puntuación guardada
                            </p>
                        `;
                    }
                    
                    // Mostrar el ranking inmediatamente sin temporizador
                    showRankingList(panel, score, playerName);
                    
                    // 🎯 LIMPIAR el nivel completado después de guardar
                    shootingSystem.completedLevel = null;
                } else {
                    throw new Error("API Client no disponible");
                }
            } catch (error) {
                console.error("Error al guardar puntuación:", error);
                
                // Si no es un reintento y el error podría estar relacionado con geolocalización,
                // ofrecer guardar sin geolocalización
                if (!isRetryWithoutGeo) {
                    messageDiv.innerHTML = `
                        <p style="color: rgba(255, 100, 100, 0.9); margin-bottom: 10px;">
                            Error al guardar. Esto podría deberse a problemas de conexión<br>
                            o con la geolocalización.
                        </p>
                        <p style="color: rgba(255, 255, 255, 0.8); font-size: 0.9em;">
                            ¿Intentar guardar sin ubicación?
                        </p>
                    `;
                    
                    // Cambiar el botón para permitir reintento sin geolocalización
                    saveButton.disabled = false;
                    saveButton.textContent = "GUARDAR SIN UBICACIÓN";
                    saveButton.style.backgroundColor = "rgba(255, 165, 0, 0.8)"; // Color naranja para diferenciarlo
                    saveButton.dataset.retryWithoutGeo = 'true';
                    
                } else {
                    // Si ya falló el reintento sin geo, mostrar error final
                    messageDiv.innerHTML = `
                        <p style="color: rgba(255, 50, 50, 0.9);">
                            Error persistente al guardar.<br>
                            <span style="font-size: 0.9em;">Verifica tu conexión e intenta más tarde.</span>
                        </p>
                    `;
                    
                    // Reactivar botón para otro intento completo
                    saveButton.disabled = false;
                    saveButton.textContent = "REINTENTAR";
                    saveButton.style.backgroundColor = "rgba(50, 205, 50, 0.8)";
                    saveButton.dataset.retryWithoutGeo = 'false';
                }
            }
        };
        
        saveButton.addEventListener('click', handleSave);
        saveButton.addEventListener('touchend', handleSave);
        
        // Efectos visuales para dispositivos táctiles
        if (isMobile) {
            saveButton.addEventListener('touchstart', function(e) {
                if (this.disabled) return;
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
                this.style.opacity = '0.9';
            });
            
            saveButton.addEventListener('touchend', function(e) {
                if (this.disabled) return;
                this.style.transform = 'scale(1)';
                this.style.opacity = '1';
            });
            
            saveButton.addEventListener('touchcancel', function(e) {
                if (this.disabled) return;
                this.style.transform = 'scale(1)';
                this.style.opacity = '1';
            });
        }
    }
    
    // Configurar botón de cancelar
    const cancelButton = document.getElementById('cancel-score-button');
    if (cancelButton) {
        // Handler para cancelar
        const handleCancel = function(e) {
            e.preventDefault(); // Prevenir comportamiento predeterminado
            console.log("Botón CANCELAR clickeado - volviendo al panel original");
            
            // Simplemente restaurar el contenido original sin recrear el panel
            if (shootingSystem.originalEndPanel) {
                // Restaurar el contenido original
                panel.innerHTML = shootingSystem.originalEndPanel.content;
                
                // Configurar nuevamente los listeners en los botones restaurados
                const restartButton = document.getElementById('restart-game-button');
                if (restartButton) {
                    // Configurar evento para reinicar juego
                    const handleRestart = function(e) {
                        e.preventDefault();
                        console.log("Botón JUGAR DE NUEVO clickeado");
                        setModalActive(false);
                        window.completeGameReset(panel);
                    };
                    
                    // Asegurar que no haya listeners duplicados
                    restartButton.removeEventListener('click', handleRestart);
                    restartButton.removeEventListener('touchend', handleRestart);
                    
                    // Agregar los listeners
                    restartButton.addEventListener('click', handleRestart);
                    restartButton.addEventListener('touchend', handleRestart);
                    
                    // Efectos táctiles si es móvil
                    if (shootingSystem.isMobile) {
                        restartButton.addEventListener('touchstart', function(e) {
                            e.preventDefault();
                            this.style.transform = 'scale(0.95)';
                            this.style.opacity = '0.9';
                        });
                        
                        restartButton.addEventListener('touchend', function(e) {
                            this.style.transform = 'scale(1)';
                            this.style.opacity = '1';
                        });
                    }
                }
                
                // Configurar el botón de enviar al ranking
                const submitButton = document.getElementById('submit-score-button');
                if (submitButton) {
                    // Configurar handler para mostrar formulario
                    const handleSubmit = function(e) {
                        e.preventDefault();
                        showRankingSubmitForm(panel, shootingSystem.originalEndPanel.score);
                    };
                    
                    // Asegurar que no haya listeners duplicados
                    submitButton.removeEventListener('click', handleSubmit);
                    submitButton.removeEventListener('touchend', handleSubmit);
                    
                    // Agregar los listeners
                    submitButton.addEventListener('click', handleSubmit);
                    submitButton.addEventListener('touchend', handleSubmit);
                    
                    // Efectos táctiles si es móvil
                    if (shootingSystem.isMobile) {
                        submitButton.addEventListener('touchstart', function(e) {
                            e.preventDefault();
                            this.style.transform = 'scale(0.95)';
                            this.style.opacity = '0.9';
                        });
                        
                        submitButton.addEventListener('touchend', function(e) {
                            this.style.transform = 'scale(1)';
                            this.style.opacity = '1';
                        });
                    }
                }
            } else {
                // Si por alguna razón no tenemos el panel original, cerrar el actual
                if (panel.parentNode) {
                    // Desactivar el bloqueo modal
                    setModalActive(false);
                    document.body.removeChild(panel);
                }
            }
        };
        
        cancelButton.addEventListener('click', handleCancel);
        cancelButton.addEventListener('touchend', handleCancel);
        
        // Efectos visuales para dispositivos táctiles
        if (isMobile) {
            cancelButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
                this.style.opacity = '0.9';
            });
            
            cancelButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
                this.style.opacity = '1';
            });
            
            cancelButton.addEventListener('touchcancel', function(e) {
                this.style.transform = 'scale(1)';
                this.style.opacity = '1';
            });
        }
    }
}

// Mostrar lista de ranking
async function showRankingList(panel, playerScore, playerName) {
        // Debugging para el cierre automático
    
    // Determinar tamaños y espaciado basados en si es dispositivo móvil
    const isMobile = shootingSystem.isMobile;
    const buttonPadding = isMobile ? '16px 20px' : '12px 20px';
    const buttonSize = isMobile ? '20px' : '18px';
    const tableHeaderSize = isMobile ? '16px' : '14px';
    const tableCellPadding = isMobile ? '10px' : '8px';
    const maxHeight = isMobile ? '50vh' : '300px';

    // Asegurarse de que el panel existe antes de manipularlo
    if (!panel || !panel.parentNode) {
        console.error("ERROR: Panel inválido o ya fue removido");
        return;
    }

    panel.innerHTML = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 15px 0; font-size: 24px;">Ranking de Puntuaciones</h2>
        <div id="ranking-loading" style="margin: 20px 0;">Cargando ranking...</div>
        <div id="ranking-list" style="max-height: ${maxHeight}; overflow-y: auto; margin: 10px 0; display: none; -webkit-overflow-scrolling: touch;"></div>
        <div id="ranking-status" style="display: none; margin: 10px 0; font-size: 12px; color: rgba(255, 255, 255, 0.6);"></div>
        <div id="backend-status" style="display: none; margin: 10px 0; padding: 8px; border-radius: 4px; font-size: 11px; text-align: center; background: rgba(0, 100, 255, 0.1); border: 1px solid rgba(0, 100, 255, 0.3); color: rgba(100, 150, 255, 0.9);">
            <div id="backend-status-text">🔄 Preparando backend...</div>
            <div id="backend-status-detail" style="margin-top: 4px; opacity: 0.7; font-size: 10px;"></div>
        </div>
        <div id="server-retry-container" style="display: none; margin: 15px 0;">
            <button id="retry-server-button" style="background-color: rgba(255, 165, 0, 0.8); color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">🔄 REINTENTAR SERVIDOR</button>
        </div>
        <button id="play-again-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: ${buttonPadding}; margin-top: 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">JUGAR DE NUEVO</button>
    `;
    
    const loadingDiv = document.getElementById('ranking-loading');
    const rankingListDiv = document.getElementById('ranking-list');
    const playAgainButton = document.getElementById('play-again-button');
    const rankingStatusDiv = document.getElementById('ranking-status');
    const retryServerContainer = document.getElementById('server-retry-container');
    const retryServerButton = document.getElementById('retry-server-button');
    
    // Configurar bandera para controlar si el juego se ha reiniciado
    // Esto evitará operaciones en componentes que ya no existen
    let panelClosed = false;
    
    // Configurar botón de reintentar servidor
    if (retryServerButton && retryServerContainer) {
        const handleRetryServer = async function(e) {
            e.preventDefault();
            
            // Cambiar estado del botón
            retryServerButton.disabled = true;
            retryServerButton.textContent = '🔄 Conectando...';
            retryServerButton.style.backgroundColor = 'rgba(150, 150, 150, 0.8)';
            
            try {
                console.log("Reintentando conexión al servidor...");
                
                // Intentar obtener datos del servidor
                const serverData = await window.apiClient.ranking.getAll();
                
                // Si llegamos aquí, el servidor respondió
                if (serverData && !serverData[0]?.local) {
                    console.log("✅ Servidor reconectado exitosamente");
                    
                    // Actualizar la lista con datos del servidor
                    if (rankingListDiv && rankingStatusDiv) {
                        loadingDiv.style.display = 'none';
                        rankingListDiv.style.display = 'block';
                        rankingStatusDiv.style.display = 'block';
                        rankingStatusDiv.innerHTML = '🌐 Datos del servidor (reconectado)';
                        
                        // Ocultar botón de reintentar
                        retryServerContainer.style.display = 'none';
                        
                        // Actualizar tabla con datos del servidor
                        updateRankingTable(serverData, playerScore, playerName, tableCellPadding, tableHeaderSize, isMobile);
                    }
                } else {
                    throw new Error("Servidor aún no disponible");
                }
                
            } catch (error) {
                console.warn("Servidor aún no disponible:", error);
                
                // Restaurar botón
                retryServerButton.disabled = false;
                retryServerButton.textContent = '🔄 REINTENTAR SERVIDOR';
                retryServerButton.style.backgroundColor = 'rgba(255, 165, 0, 0.8)';
                
                // Mostrar mensaje temporal de error
                if (rankingStatusDiv) {
                    const originalText = rankingStatusDiv.innerHTML;
                    rankingStatusDiv.innerHTML = '❌ Servidor aún no disponible';
                    rankingStatusDiv.style.color = 'rgba(255, 100, 100, 0.8)';
                    
                    // Restaurar mensaje original después de 3 segundos
                    setTimeout(() => {
                        rankingStatusDiv.innerHTML = originalText;
                        rankingStatusDiv.style.color = 'rgba(255, 255, 255, 0.6)';
                    }, 3000);
                }
            }
        };
        
        retryServerButton.addEventListener('click', handleRetryServer);
        retryServerButton.addEventListener('touchend', handleRetryServer);
        
        // Efectos táctiles
        if (isMobile) {
            retryServerButton.addEventListener('touchstart', function(e) {
                if (this.disabled) return;
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });
            
            retryServerButton.addEventListener('touchend', function(e) {
                if (this.disabled) return;
                this.style.transform = 'scale(1)';
            });
        }
    }
    
    // Configurar botón de jugar de nuevo
    if (playAgainButton) {
        // Handler para jugar de nuevo
        const handlePlayAgain = function(e) {            e.preventDefault(); // Prevenir comportamiento predeterminado            console.log("Botón JUGAR DE NUEVO (desde ranking) clickeado");                        // Marcar que el panel se está cerrando            panelClosed = true;                        // Desactivar el modo modal
            setModalActive(false);
            
            // Usar la función unificada para reiniciar, pasando el panel para cerrarlo
            window.completeGameReset(panel);
        };
        
        playAgainButton.addEventListener('click', handlePlayAgain);
        playAgainButton.addEventListener('touchend', handlePlayAgain);
        
        // Efectos visuales para dispositivos táctiles
        if (isMobile) {
            playAgainButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
                this.style.opacity = '0.9';
            });
            
            playAgainButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
                this.style.opacity = '1';
            });
            
            playAgainButton.addEventListener('touchcancel', function(e) {
                this.style.transform = 'scale(1)';
                this.style.opacity = '1';
            });
        }
    }
    
    // Cargar el ranking
    if (rankingListDiv && loadingDiv) {
        try {
            let rankingData = [];
            let isLocalData = false;
            
            if (window.apiClient && window.apiClient.ranking && !panelClosed) {
                
                // Añadir timeout para prevenir bloqueos
                const fetchPromise = window.apiClient.ranking.getAll();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Timeout obteniendo ranking')), 6000);
                });
                
                try {
                    rankingData = await Promise.race([fetchPromise, timeoutPromise]);
                    
                    // Verificar si son datos locales
                    isLocalData = rankingData.length > 0 && rankingData[0].local === true;
                    
                } catch (fetchError) {
                    console.error("Error o timeout al obtener ranking:", fetchError);
                    isLocalData = true;
                    // Continuar con rankingData vacío
                }
            }
            
            // Si el panel fue cerrado durante la carga, abortar
            if (panelClosed) {
                console.log("Panel cerrado durante la carga de datos, abortando renderizado");
                return;
            }
            
            // Verificar nuevamente que el panel sigue existiendo
            if (!panel || !panel.parentNode) {
                console.error("ERROR: Panel ya no existe durante la carga de datos");
                return;
            }
            
            // Verificar que los elementos siguen existiendo
            if (!rankingListDiv || !loadingDiv) {
                console.error("ERROR: Elementos del ranking ya no existen durante la carga de datos");
                return;
            }
            
            // Ocultar mensaje de carga
            loadingDiv.style.display = 'none';
            rankingListDiv.style.display = 'block';
            
            // Mostrar estado del ranking
            if (rankingStatusDiv) {
                rankingStatusDiv.style.display = 'block';
                if (isLocalData) {
                    rankingStatusDiv.innerHTML = '📱 Mostrando datos locales (servidor no disponible)';
                    // Mostrar botón de reintentar servidor
                    if (retryServerContainer) {
                        retryServerContainer.style.display = 'block';
                    }
                } else {
                    rankingStatusDiv.innerHTML = '🌐 Datos del servidor';
                    // Ocultar botón de reintentar servidor
                    if (retryServerContainer) {
                        retryServerContainer.style.display = 'none';
                    }
                }
            }
            
            // Formatear y mostrar el ranking
            if (rankingData && rankingData.length > 0) {
                updateRankingTable(rankingData, playerScore, playerName, tableCellPadding, tableHeaderSize, isMobile);
            } else {
                rankingListDiv.innerHTML = '<p style="text-align: center;">No hay puntuaciones registradas todavía.</p>';
            }
            
            // 🎯 LIMPIAR el nivel completado después de mostrar ranking
            shootingSystem.completedLevel = null;
            console.log("📝 Nivel completado limpiado después de mostrar ranking");
            
        } catch (error) {            console.error("Error al cargar el ranking:", error);                        // Si el panel fue cerrado durante la carga, abortar
            if (panelClosed) {
                console.log("Panel cerrado durante el manejo de error, abortando");
                return;
            }
            
            // Verificar si los elementos todavía existen
            if (loadingDiv && rankingListDiv) {
                loadingDiv.style.display = 'none';
                rankingListDiv.style.display = 'block';
                rankingListDiv.innerHTML = '<p style="color: rgba(255, 50, 50, 0.9); text-align: center;">Error al cargar el ranking. Por favor intenta más tarde.</p>';
            }
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
    
    // Obtener posición de botones según orientación usando configuración centralizada
    const buttonBottom = mobileButtonConfig.getButtonPosition(isPortrait);
    
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
            statsContainer.style.alignItems = 'flex-start'; // Alinear arriba
            statsContainer.style.width = '100%';
            statsContainer.style.padding = '0 10px';
            statsContainer.style.marginBottom = '5px';
            
            header.appendChild(statsContainer);
        }
        
        // Crear/obtener contenedor para los puntajes (lado izquierdo)
        let scoresContainer = document.getElementById('scores-container');
        if (!scoresContainer) {
            scoresContainer = document.createElement('div');
            scoresContainer.id = 'scores-container';
            scoresContainer.style.display = 'flex';
            scoresContainer.style.flexDirection = 'column'; // Uno debajo del otro
            scoresContainer.style.alignItems = 'flex-start';
            scoresContainer.style.gap = '5px'; // Espacio entre puntajes
            
            statsContainer.appendChild(scoresContainer);
        }
        
        // ✅ IMPORTANTE: Limpiar el contenedor para forzar el orden correcto
        scoresContainer.innerHTML = '';
        
        // ✅ Añadir elementos en el orden correcto: primero puntaje del nivel
        if (shootingSystem.scoreDisplay) {
            shootingSystem.scoreDisplay.style.position = 'relative';
            shootingSystem.scoreDisplay.style.top = 'auto';
            shootingSystem.scoreDisplay.style.left = 'auto';
            shootingSystem.scoreDisplay.style.order = '1'; // Primer elemento visualmente
            scoresContainer.appendChild(shootingSystem.scoreDisplay);
        }
        
        // ✅ Luego añadir puntuación total (si está visible)
        if (shootingSystem.totalScoreDisplay && shootingSystem.totalScoreDisplay.style.display === 'block') {
            shootingSystem.totalScoreDisplay.style.position = 'relative';
            shootingSystem.totalScoreDisplay.style.top = 'auto';
            shootingSystem.totalScoreDisplay.style.left = 'auto';
            shootingSystem.totalScoreDisplay.style.order = '2'; // Segundo elemento visualmente
            scoresContainer.appendChild(shootingSystem.totalScoreDisplay);
        }
        
        // Mover reloj al contenedor principal (lado derecho)
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
        
        // Ajustar botones de juego usando configuración centralizada
        if (shootingSystem.shootButton) {
            shootingSystem.shootButton.style.bottom = buttonBottom;
        }
        
        if (shootingSystem.resetButton) {
            shootingSystem.resetButton.style.bottom = buttonBottom;
        }
        
        if (shootingSystem.audioButton) {
            shootingSystem.audioButton.style.bottom = buttonBottom;
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
            // Buscar y limpiar el contenedor de puntajes interno
            const scoresContainer = document.getElementById('scores-container');
            if (scoresContainer) {
                // Mover los displays de puntajes del contenedor interno al body
                if (shootingSystem.scoreDisplay && shootingSystem.scoreDisplay.parentNode === scoresContainer) {
                    scoresContainer.removeChild(shootingSystem.scoreDisplay);
                    document.body.appendChild(shootingSystem.scoreDisplay);
                }
                
                if (shootingSystem.totalScoreDisplay && shootingSystem.totalScoreDisplay.parentNode === scoresContainer) {
                    scoresContainer.removeChild(shootingSystem.totalScoreDisplay);
                    document.body.appendChild(shootingSystem.totalScoreDisplay);
                }
            }
            
            // Mover displays del contenedor principal al body
            if (shootingSystem.scoreDisplay && shootingSystem.scoreDisplay.parentNode === statsContainer) {
                statsContainer.removeChild(shootingSystem.scoreDisplay);
                document.body.appendChild(shootingSystem.scoreDisplay);
            }
            
            if (shootingSystem.totalScoreDisplay && shootingSystem.totalScoreDisplay.parentNode === statsContainer) {
                statsContainer.removeChild(shootingSystem.totalScoreDisplay);
                document.body.appendChild(shootingSystem.totalScoreDisplay);
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
            shootingSystem.scoreDisplay.style.order = ''; // Limpiar order
        }
        
        if (shootingSystem.totalScoreDisplay) {
            shootingSystem.totalScoreDisplay.style.position = 'absolute';
            shootingSystem.totalScoreDisplay.style.top = '45px';
            shootingSystem.totalScoreDisplay.style.left = '10px';
            shootingSystem.totalScoreDisplay.style.order = ''; // Limpiar order
        }
        
        if (shootingSystem.timeDisplay) {
            shootingSystem.timeDisplay.style.position = 'absolute';
            shootingSystem.timeDisplay.style.top = '10px';
            shootingSystem.timeDisplay.style.right = '10px';
        }
        
        // Restaurar botones usando configuración centralizada
        if (shootingSystem.shootButton) {
            shootingSystem.shootButton.style.bottom = buttonBottom;
        }
        
        if (shootingSystem.resetButton) {
            shootingSystem.resetButton.style.bottom = buttonBottom;
        }
        
        if (shootingSystem.audioButton) {
            shootingSystem.audioButton.style.bottom = buttonBottom;
            shootingSystem.audioButton.style.left = 'calc(5vh + 20vmin)'; // Mantiene relación con el botón de reset
        }
    }
    
    // ===== ACTUALIZAR ETIQUETAS DE BOTONES MÓVILES =====
    // Esta llamada sincroniza automáticamente las posiciones de las etiquetas con los botones
    updateButtonLabels();
    
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
    
    // Si activamos el audio y estaba muteado, desmutearlo
    if (enabled && shootingSystem.audio.muted) {
        shootingSystem.audio.muted = false;
        
        // Actualizar el ícono del botón si existe
        if (shootingSystem.audioButton) {
            shootingSystem.audioButton.innerHTML = '<span style="color: white; font-size: 30px;">🔊</span>';
        }
    }
};
window.setAudioVolume = function(volume) {
    // Asegurar que el volumen esté entre 0 y 1
    volume = Math.max(0, Math.min(1, volume));
    shootingSystem.audio.volume = volume;
    
    // Actualizar el volumen en todos los sonidos
    if (shootingSystem.audio.sounds) {
        Object.values(shootingSystem.audio.sounds).forEach(sound => {
            sound.volume(volume);
        });
    }
};

// Función para alternar el estado de mute
window.toggleAudioMute = function() {
    // Invertir el estado actual
    shootingSystem.audio.muted = !shootingSystem.audio.muted;
    
    // Si quitamos el mute, también activamos el audio
    if (!shootingSystem.audio.muted) {
        shootingSystem.audio.enabled = true;
    }
    
    // Guardar preferencias en localStorage
    saveAudioPreferences();
    
    // Para pruebas rápidas, reproducir un sonido si acabamos de desmutear
    if (!shootingSystem.audio.muted) {
        // Reproducir un sonido corto para comprobar
        setTimeout(() => playSound('shoot'), 100);
    }
    
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
    
    // Detener el intervalo de actualización de puntuación si existe
    if (shootingSystem.scoreUpdateInterval) {
        clearInterval(shootingSystem.scoreUpdateInterval);
        shootingSystem.scoreUpdateInterval = null;
    }
    
    // Reiniciar variables de tiempo
    shootingSystem.gameStarted = false;
    shootingSystem.gameEnded = false;
    shootingSystem.gameStartTime = 0;
    
    // 🎯 LIMPIAR el nivel completado en reinicios
    shootingSystem.completedLevel = null;
    
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

// Función auxiliar para reiniciar el juego desde los efectos
window.effectsResetGame = function() {
    console.log("Ejecutando efectsResetGame");
    
    // Asegurarse de que no hay paneles residuales
    const endPanels = document.querySelectorAll('#game-end-panel');
    endPanels.forEach(panel => {
        if (panel && panel.parentNode) {
            panel.parentNode.removeChild(panel);
        }
    });
    
    // Reiniciar banderas internas
    if (window.shootingSystem) {
        window.shootingSystem.gameEnded = false;
        window.shootingSystem.isActive = true;
        
        // Reactivar botones si existen
        if (window.shootingSystem.shootButton) {
            window.shootingSystem.shootButton.style.opacity = '1';
            window.shootingSystem.shootButton.style.pointerEvents = 'auto';
        }
        
        if (window.shootingSystem.resetButton) {
            window.shootingSystem.resetButton.style.transform = 'scale(1)';
            window.shootingSystem.resetButton.style.boxShadow = 'none';
        }
    }
    
    // Llamar a la función principal de reinicio
    if (typeof window.resetGame === 'function') {
        console.log("Llamando a resetGame desde effectsResetGame");
        window.resetGame();
    } else {
        console.error("No se encontró la función resetGame");
        // DESHABILITADO: Esta línea parece ser la causante de recargas no deseadas
        // window.location.reload(); // Último recurso: recargar la página
        console.error("No se pudo realizar el resetGame. Se recomienda recargar manualmente la página.");
    }
};

// Función unificada para reiniciar completamente el juego desde cualquier punto
window.completeGameReset = function(panel = null) {
    console.log("Ejecutando reinicio completo del juego");
    
    
    
    // 0. Desactivar cualquier modal activo
    if (shootingSystem.modalActive) {
        setModalActive(false);
    }
    
    // 1. Cerrar cualquier panel que se haya pasado
    if (panel && panel.parentNode) {
        // Importante: eliminar todos los listeners antes de quitar del DOM
        // Esto previene que callbacks pendientes se ejecuten en elementos eliminados
        const clone = panel.cloneNode(true);
        panel.parentNode.replaceChild(clone, panel);
        clone.parentNode.removeChild(clone);
        console.log("Panel cerrado durante reinicio (con limpieza de eventos)");
    }
    
    // 2. Asegurarse que el juego no esté en estado "finalizado"
    if (window.shootingSystem) {
        window.shootingSystem.gameEnded = false;
    }
    
    // 3. Establecer bandera para evitar que se muestre el panel inicial
    window.isGameRestarting = true;
    
    // 4. Reiniciar el tiempo
    resetGameTime();
    
    // 5. Reiniciar el juego con la función principal
    if (typeof window.resetGame === 'function') {
        console.log("Llamando a resetGame() desde completeGameReset");
        window.resetGame();
    } else {
        console.error("Función resetGame no encontrada");
        // No recargar la página automáticamente, podría causar bucle
        console.error("No se pudo reiniciar el juego correctamente");
    }
    
    // 6. Reactivar los botones explícitamente
    if (window.shootingSystem) {
        if (window.shootingSystem.shootButton) {
            shootingSystem.shootButton.style.opacity = '1';
            shootingSystem.shootButton.style.pointerEvents = 'auto';
        }
        
        if (window.shootingSystem.resetButton) {
            shootingSystem.resetButton.style.transform = 'scale(1)';
            shootingSystem.resetButton.style.boxShadow = 'none';
        }
    }
    
    console.log("Reinicio completo finalizado");
};

// Nueva función: Bloquear/Desbloquear interacción durante paneles modales
function setModalActive(active) {
    shootingSystem.modalActive = active;
    console.log(`Panel modal ${active ? 'activado' : 'desactivado'}`);
    
    // Desactivar visualmente los botones cuando el modal está activo
    if (shootingSystem.shootButton) {
        shootingSystem.shootButton.style.pointerEvents = active ? 'none' : 'auto';
        shootingSystem.shootButton.style.opacity = active ? '0.3' : '1';
    }
    
    if (shootingSystem.resetButton) {
        shootingSystem.resetButton.style.pointerEvents = active ? 'none' : 'auto';
        shootingSystem.resetButton.style.opacity = active ? '0.3' : '1';
    }
    
    if (shootingSystem.audioButton) {
        shootingSystem.audioButton.style.pointerEvents = active ? 'none' : 'auto';
        shootingSystem.audioButton.style.opacity = active ? '0.3' : '1';
    }
    
    // Crear/remover un overlay para bloquear la interacción con el resto de la página
    const existingOverlay = document.getElementById('modal-overlay');
    
    if (active && !existingOverlay) {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        overlay.style.zIndex = '2000'; // Menor que el panel (3000)
        document.body.appendChild(overlay);
    } else if (!active && existingOverlay) {
        // Remover overlay
        document.body.removeChild(existingOverlay);
    }
}

// Nueva función para cerrar el modal activo
function closeActiveModal() {
    console.log("Cerrando panel modal activo (Escape)");
    
    // Buscar panel activo para cerrarlo
    const endPanel = document.getElementById('game-end-panel');
    const infoPanel = document.getElementById('info-panel');
    
    if (endPanel) {
        // Si estamos en algún panel de fin de juego o ranking, volver al juego
        window.completeGameReset(endPanel);
    } else if (infoPanel) {
        // Si estamos en el panel de información inicial, cerrarlo
        if (infoPanel.parentNode) {
            setModalActive(false);
            
            // Importante: eliminar todos los listeners antes de quitar del DOM
            const clone = infoPanel.cloneNode(true);
            infoPanel.parentNode.replaceChild(clone, infoPanel);
            clone.parentNode.removeChild(clone);
            
            shootingSystem.infoShown = true;
            console.log("Panel de información cerrado con Escape (con limpieza de eventos)");
        }
    } else {
        // Si no encontramos un panel específico, solo desactivar el modo modal
        setModalActive(false);
    }
}

// Guardar la puntuación y mostrar el resultado
async function handleFormSubmit(e, nameInput, panel, score) {
    e.preventDefault();
    
    // Procesar el nombre del jugador
    const playerName = nameInput.value.trim();
    if (!playerName) {
        const messageDiv = document.getElementById('ranking-submit-message');
        if (messageDiv) {
            messageDiv.textContent = "Por favor ingresa tu nombre";
        }
        return;
    }
    
    // Ocultar el formulario y mostrar mensaje de guardando
    const submitForm = document.getElementById('ranking-submit-form');
    if (submitForm) {
        submitForm.innerHTML = '<div style="text-align: center; padding: 20px;">Guardando puntuación...</div>';
    }
    
    try {
        // Detectar tipo de dispositivo (desktop o mobile)
        const deviceType = shootingSystem.isMobile ? 'mobile' : 'desktop';
        
        // Variable para almacenar la ubicación
        let ubicacion = "desconocida";
        
        // Intentar obtener la ubicación por geolocalización
        if (navigator.geolocation) {
            try {
                // Obtener ubicación por GPS/localización del navegador
                ubicacion = await new Promise((resolve) => {
                    const geoSuccess = async (position) => {
                        try {
                            if (window.apiClient && window.apiClient.ranking) {
                                const locationPromise = window.apiClient.ranking.getLocationFromCoords(
                                    position.coords.latitude, 
                                    position.coords.longitude
                                );
                                
                                // Aplicar un timeout para evitar bloqueos
                                const timeoutPromise = new Promise((_, reject) => 
                                    setTimeout(() => resolve("desconocida"), 3000)
                                );
                                
                                const location = await Promise.race([locationPromise, timeoutPromise]);
                                resolve(location);
                            } else {
                                resolve("desconocida");
                            }
                        } catch (error) {
                            console.error("Error al obtener ubicación:", error);
                            resolve("desconocida");
                        }
                    };
                    
                    const geoError = (error) => {
                        console.warn("Error de geolocalización:", error);
                        resolve("desconocida");
                    };
                    
                    navigator.geolocation.getCurrentPosition(geoSuccess, geoError, {
                        timeout: 5000,
                        maximumAge: 60000
                    });
                    
                    // Aplico timeout para evitar bloqueos
                    setTimeout(() => resolve("desconocida"), 6000);
                });
            } catch (geoError) {
                console.warn("Error al intentar geolocalización:", geoError);
            }
        }
        
        // Si no se pudo obtener ubicación, intentar con IP
        if (ubicacion === "desconocida" && window.apiClient && window.apiClient.ranking) {
            try {
                const locationPromise = window.apiClient.ranking.getLocationFromIP();
                // Aplicar un timeout para evitar bloqueos
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => "desconocida", 3000)
                );
                
                ubicacion = await Promise.race([locationPromise, timeoutPromise]);
            } catch (ipError) {
                console.warn("Error al obtener ubicación por IP:", ipError);
            }
        }
        
        // Guardar la puntuación en el ranking
        if (window.apiClient && window.apiClient.ranking) {
            try {
                // 🎯 CORRECCIÓN: Usar el nivel completado, no el nivel actual
                // Si hay un nivel completado guardado (desde transición), usarlo
                // Si no, usar el nivel actual (para partidas normales que terminan por tiempo)
                const currentLevel = shootingSystem.completedLevel || 
                    (window.LevelManager ? `${window.LevelManager.current.level}` : "1");
                
                console.log(`🎯 Guardando ranking con nivel: ${currentLevel}`);
                
                // Guardar la puntuación
                const savePromise = window.apiClient.ranking.save(playerName, score, deviceType, ubicacion, currentLevel);
                
                // Aplicar un timeout para evitar bloqueos
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => ({ success: false, message: "Timeout al guardar" }), 5000)
                );
                
                const result = await Promise.race([savePromise, timeoutPromise]);
                
                console.log("Resultado de guardar puntuación:", result);
                
                // Guardar el nombre del jugador en localStorage para futuras partidas
                try {
                    localStorage.setItem('rejasEspacialesPlayerName', playerName);
                    console.log("Nombre del jugador guardado en localStorage:", playerName);
                } catch(storageError) {
                    console.warn("No se pudo guardar el nombre en localStorage:", storageError);
                }
                
                // Mostrar el ranking inmediatamente sin temporizador
                showRankingList(panel, score, playerName);
            } catch (saveError) {
                console.error("Error al guardar puntuación:", saveError);
                
                // Mostrar mensaje de error
                if (submitForm) {
                    submitForm.innerHTML = '<div style="color: rgba(255, 100, 100, 0.9); text-align: center; padding: 20px;">No se pudo guardar la puntuación. <button id="retry-button" style="background-color: rgba(255, 200, 0, 0.7); color: black; border: none; padding: 8px 15px; margin-top: 10px; border-radius: 5px; cursor: pointer;">Reintentar</button></div>';
                    
                    // Configurar botón de reintentar
                    const retryButton = document.getElementById('retry-button');
                    if (retryButton) {
                        retryButton.addEventListener('click', (e) => {
                            e.preventDefault();
                            // Mostrar formulario nuevamente
                            showRankingSubmitForm(panel, score);
                        });
                    }
                }
            }
        } else {
            // Si no hay API client, simplemente mostrar el ranking
            showRankingList(panel, score, playerName);
        }
    } catch (error) {
        console.error("Error general al enviar puntuación:", error);
        // Mostrar mensaje de error
        if (submitForm) {
            submitForm.innerHTML = '<div style="color: rgba(255, 100, 100, 0.9); text-align: center; padding: 20px;">No se pudo guardar la puntuación.</div>';
        }
    }
}

// Función auxiliar para actualizar la tabla de ranking
function updateRankingTable(rankingData, playerScore, playerName, tableCellPadding, tableHeaderSize, isMobile) {
    const rankingListDiv = document.getElementById('ranking-list');
    if (!rankingListDiv) return;
    
    // Construir tabla de ranking
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr style="border-bottom: 1px solid rgba(0, 255, 255, 0.5);">
                <th style="padding: ${tableCellPadding}; text-align: center; font-size: ${tableHeaderSize};">#</th>
                <th style="padding: ${tableCellPadding}; font-size: ${tableHeaderSize};">Jugador</th>
                <th style="padding: ${tableCellPadding}; text-align: right; font-size: ${tableHeaderSize};">Puntos</th>
                <th style="padding: ${tableCellPadding}; text-align: center; font-size: ${tableHeaderSize};">Nivel</th>
                <th style="padding: ${tableCellPadding}; text-align: center; font-size: ${tableHeaderSize};">Dispositivo</th>
                <th style="padding: ${tableCellPadding}; font-size: ${tableHeaderSize};">Ubicación</th>
                <th style="padding: ${tableCellPadding}; text-align: center; font-size: ${tableHeaderSize};">Versión</th>
                <th style="padding: ${tableCellPadding}; text-align: center; font-size: ${tableHeaderSize};">Fecha/Hora</th>
            </tr>
    `;
    
    // Añadir filas
    rankingData.forEach((entry, index) => {
        // Destacar la entrada del jugador actual
        const isCurrentPlayer = entry.nombre === playerName && entry.puntaje === playerScore;
        let rowStyle = '';
        
        if (isCurrentPlayer) {
            rowStyle = 'background-color: rgba(0, 255, 255, 0.2); font-weight: bold;';
        } else if (entry.local) {
            // Entradas locales con fondo ligeramente diferente
            rowStyle = 'background-color: rgba(255, 165, 0, 0.1);';
        } else {
            // Entradas del servidor con alternancia normal
            rowStyle = (index % 2 === 0) ? 'background-color: rgba(30, 30, 30, 0.5);' : '';
        }
        
        // Formatear dispositivo (desktop o mobile)
        const deviceIcon = (entry.dispositivo === 'mobile') ? '📱' : '💻';
        
        // Formatear nivel (mostrar "1" si no está disponible)
        const nivel = entry.nivel || "1";
        
        // Formatear ubicación (mostrar "desconocida" si no está disponible)
        const location = entry.ubicacion || "desconocida";
        
        // Formatear versión (mostrar "desconocida" si no está disponible)
        const version = entry.version || "desconocida";
        
        // Formatear fecha/hora (mostrar "--" si no está disponible)
        const fechaHora = entry.fechaHora || "--";
        
        // Añadir indicador visual para entradas locales
        const localIndicator = entry.local ? ' 📱' : '';
        
        tableHTML += `
            <tr style="border-bottom: 1px solid rgba(100, 100, 100, 0.3); ${rowStyle}">
                <td style="padding: ${tableCellPadding}; text-align: center;">${index + 1}</td>
                <td style="padding: ${tableCellPadding};">${entry.nombre}${localIndicator}</td>
                <td style="padding: ${tableCellPadding}; text-align: right; color: ${isCurrentPlayer ? 'rgba(0, 255, 255, 1)' : 'white'};">${entry.puntaje}</td>
                <td style="padding: ${tableCellPadding}; text-align: center;">${nivel}</td>
                <td style="padding: ${tableCellPadding}; text-align: center;">${deviceIcon}</td>
                <td style="padding: ${tableCellPadding};">${location}</td>
                <td style="padding: ${tableCellPadding}; text-align: center;">${version}</td>
                <td style="padding: ${tableCellPadding}; text-align: center;">${fechaHora}</td>
            </tr>
        `;
    });
    
    tableHTML += '</table>';
    rankingListDiv.innerHTML = tableHTML;
}

// Exportar función para uso en otros módulos
window.updateRankingTable = updateRankingTable;

// Manejar cuando el tiempo se agota - decidir si es fin de nivel o fin del juego
function handleTimeExpired() {
    if (shootingSystem.gameEnded) return;
    
    console.log("⏰ Tiempo agotado - evaluando si continuar nivel o finalizar juego");
    
    // Verificar si LevelManager está disponible
    if (!window.LevelManager) {
        console.warn("⚠️ LevelManager no disponible, usando lógica de fin de juego clásica");
        endGame();
        return;
    }
    
    // Obtener puntuación actual del nivel
    const levelScore = window.gameState ? window.gameState.score : 0;
    
    // Completar el nivel actual en LevelManager
    const levelResult = window.LevelManager.completeCurrentLevel(levelScore);
    
    console.log("📊 Resultado del nivel:", levelResult);
    
    // Detener el temporizador y el juego temporalmente
    if (shootingSystem.gameTimer) {
        clearInterval(shootingSystem.gameTimer);
        shootingSystem.gameTimer = null;
    }
    
    // Detener el juego temporalmente
    if (window.gameState) {
        window.gameState.isRunning = false;
        if (window.gameLoopRequestId) {
            window.cancelAnimationFrame(window.gameLoopRequestId);
            window.gameLoopRequestId = null;
        }
    }
    
    // Decidir qué hacer basado en si es el último nivel
    if (levelResult.isLastLevel) {
        console.log("🏁 Último nivel completado - terminando juego");
        shootingSystem.gameEnded = true;
        
        // Llamar al modal unificado en modo fin de juego
        showUnifiedGameModal(levelResult, true);
    } else {
        console.log("📈 Nivel completado - mostrando pausa entre niveles");
        shootingSystem.gameEnded = false; // No es fin del juego, solo pausa
        showLevelTransitionScreen(levelResult);
    }
}

// Mostrar pantalla de transición entre niveles
function showLevelTransitionScreen(levelResult) {
    console.log("🎮 Mostrando pantalla de transición entre niveles");
    
    // 🎯 GUARDAR el nivel completado ANTES de avanzar al siguiente
    shootingSystem.completedLevel = window.LevelManager ? window.LevelManager.current.level : 1;
    console.log(`📝 Nivel completado guardado: ${shootingSystem.completedLevel}`);
    
    // Activar el bloqueo modal
    setModalActive(true);
    
    // Obtener información del siguiente nivel
    const hasAdvanced = window.LevelManager.advanceLevel();
    const nextLevelInfo = window.LevelManager.getCurrentLevelInfo();
    
    // Crear panel de transición
    const transitionPanel = document.createElement('div');
    transitionPanel.id = 'level-transition-panel';
    
    // Estilos del panel
    transitionPanel.style.position = 'fixed';
    transitionPanel.style.top = '50%';
    transitionPanel.style.left = '50%';
    transitionPanel.style.transform = 'translate(-50%, -50%)';
    transitionPanel.style.backgroundColor = 'rgba(0, 40, 80, 0.95)';
    transitionPanel.style.color = 'white';
    transitionPanel.style.padding = '30px';
    transitionPanel.style.borderRadius = '15px';
    transitionPanel.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6)';
    transitionPanel.style.textAlign = 'center';
    transitionPanel.style.zIndex = '3000';
    transitionPanel.style.minWidth = '350px';
    transitionPanel.style.maxWidth = '90%';
    transitionPanel.style.maxHeight = '80%';
    transitionPanel.style.overflowY = 'auto';
    
    // Determinar tamaños basados en dispositivo
    const isMobile = shootingSystem.isMobile;
    const buttonPadding = isMobile ? '16px 20px' : '12px 20px';
    const buttonMargin = isMobile ? '10px 0' : '5px 0';
    const buttonSize = isMobile ? '20px' : '18px';
    
    // Obtener resumen de progreso
    const progressSummary = window.LevelManager.getProgressSummary();
    
    // Contenido del panel
    const panelContent = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 20px 0; font-size: 28px;">¡Nivel Completado!</h2>
        
        <div style="margin: 20px 0;">
            <p style="font-size: 20px; margin: 10px 0;">Puntuación del nivel:</p>
            <p style="font-size: 36px; margin: 10px 0; color: rgba(50, 255, 50, 1); font-weight: bold;">${levelResult.levelScore} puntos</p>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background-color: rgba(255, 255, 255, 0.1); border-radius: 8px;">
            <p style="font-size: 18px; margin: 5px 0;">Puntuación total: <span style="color: rgba(255, 255, 0, 1); font-weight: bold;">${levelResult.totalScore} puntos</span></p>
            <p style="font-size: 16px; margin: 5px 0;">Nivel actual: ${progressSummary.currentLevel} de ${progressSummary.totalLevels}</p>
        </div>
        
        ${hasAdvanced ? `
        <div style="margin: 25px 0;">
            <h3 style="color: rgba(255, 255, 255, 0.9); margin: 15px 0;">Siguiente Nivel:</h3>
            <p style="font-size: 22px; margin: 10px 0; color: rgba(0, 255, 255, 1); font-weight: bold;">${nextLevelInfo.name}</p>
            <p style="font-size: 16px; margin: 10px 0; color: rgba(255, 255, 255, 0.8);">${nextLevelInfo.description}</p>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 30px;">
            <button id="continue-next-level-button" style="background-color: rgba(0, 255, 0, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">CONTINUAR SIGUIENTE NIVEL</button>
            <button id="end-game-now-button" style="background-color: rgba(255, 165, 0, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">FINALIZAR Y GUARDAR EN RANKING</button>
            <button id="restart-from-level1-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">EMPEZAR DE NUEVO</button>
        </div>
        ` : `
        <div style="margin: 25px 0;">
            <p style="font-size: 18px; color: rgba(255, 255, 0, 1);">No se pudo avanzar al siguiente nivel.</p>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 30px;">
            <button id="end-game-now-button" style="background-color: rgba(255, 165, 0, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">FINALIZAR Y GUARDAR EN RANKING</button>
            <button id="restart-from-level1-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">EMPEZAR DE NUEVO</button>
        </div>
        `}
    `;
    
    transitionPanel.innerHTML = panelContent;
    document.body.appendChild(transitionPanel);
    
    // Configurar botón de continuar siguiente nivel
    const continueButton = document.getElementById('continue-next-level-button');
    if (continueButton) {
        const handleContinue = function(e) {
            e.preventDefault();
            console.log("🚀 Continuando al siguiente nivel");
            
            // Cerrar panel
            setModalActive(false);
            document.body.removeChild(transitionPanel);
            
            // Reiniciar el nivel (pero mantener progreso total)
            restartCurrentLevel();
        };
        
        continueButton.addEventListener('click', handleContinue);
        continueButton.addEventListener('touchend', handleContinue);
        
        // Efectos táctiles para móvil
        if (isMobile) {
            continueButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });
            continueButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            });
            continueButton.addEventListener('touchcancel', function(e) {
                this.style.transform = 'scale(1)';
            });
        }
    }
    
    // Configurar botón de finalizar juego
    const endGameButton = document.getElementById('end-game-now-button');
    if (endGameButton) {
        const handleEndGame = function(e) {
            e.preventDefault();
            console.log("🏁 Finalizando juego voluntariamente y guardando puntuación total");
            
            // Cerrar panel de transición
            setModalActive(false);
            document.body.removeChild(transitionPanel);
            
            // Terminar juego voluntariamente con la puntuación total
            endGameVoluntarily(levelResult.totalScore);
        };
        
        endGameButton.addEventListener('click', handleEndGame);
        endGameButton.addEventListener('touchend', handleEndGame);
        
        // Efectos táctiles para móvil
        if (isMobile) {
            endGameButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });
            endGameButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            });
            endGameButton.addEventListener('touchcancel', function(e) {
                this.style.transform = 'scale(1)';
            });
        }
    }
    
    // Configurar botón de empezar de nuevo
    const restartButton = document.getElementById('restart-from-level1-button');
    if (restartButton) {
        const handleRestart = function(e) {
            e.preventDefault();
            console.log("🔄 Empezando de nuevo desde nivel 1");
            
            // Cerrar panel
            setModalActive(false);
            document.body.removeChild(transitionPanel);
            
            // Resetear completamente el LevelManager
            window.LevelManager.reset();
            
            // Usar la función completa de reset
            window.completeGameReset();
        };
        
        restartButton.addEventListener('click', handleRestart);
        restartButton.addEventListener('touchend', handleRestart);
        
        // Efectos táctiles para móvil
        if (isMobile) {
            restartButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });
            restartButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            });
            restartButton.addEventListener('touchcancel', function(e) {
                this.style.transform = 'scale(1)';
            });
        }
    }
}

// Reiniciar el nivel actual (mantener progreso total)
function restartCurrentLevel() {
    console.log("🔄 Reiniciando nivel actual...");
    
    // Resetear gameState para el nuevo nivel (mantener progreso de LevelManager)
    if (window.gameState) {
        window.gameState.score = 0; // Puntuación del nivel actual se resetea
        window.gameState.isRunning = true;
        window.gameState.currentLevel = window.LevelManager.current.level;
        window.gameState.currentSubLevel = window.LevelManager.current.subLevel;
    }
    
    // Resetear sistema de shooting
    shootingSystem.gameEnded = false;
    shootingSystem.isActive = true;
    shootingSystem.shots = [];
    
    // 🎯 IMPORTANTE: Resetear estado del juego para esperar el primer disparo
    shootingSystem.gameStarted = false;  // ← Esto hace que espere el primer disparo
    shootingSystem.gameStartTime = 0;
    
    // Reactivar botones
    if (shootingSystem.shootButton) {
        shootingSystem.shootButton.style.opacity = '1';
        shootingSystem.shootButton.style.pointerEvents = 'auto';
    }
    
    if (shootingSystem.resetButton) {
        shootingSystem.resetButton.style.transform = 'scale(1)';
        shootingSystem.resetButton.style.boxShadow = 'none';
    }
    
    // Resetear tiempo del nivel (pero NO iniciar el timer)
    resetGameTime();
    
    // 🚫 NO llamar a startGameTimer() aquí - debe esperar al primer disparo
    // startGameTimer(); ← REMOVIDO
    
    // Limpiar partículas
    clearAllParticles();
    
    // Actualizar displays
    updateScoreDisplay();
    updateLevelDisplay(); // Actualizar display del nivel
    
    // Reiniciar bucle de juego
    if (window.gameLoop && typeof window.gameLoop === 'function') {
        window.gameLoop();
    }
    
    console.log("✅ Nivel reiniciado correctamente - Esperando primer disparo para iniciar cronómetro");
}

// Finalizar el juego al llegar a 0

// Mostrar modal unificado para transiciones de nivel y fin de juego
function showUnifiedGameModal(levelResult = null, isGameEnd = false) {
    console.log(`🎮 Mostrando modal unificado - ${isGameEnd ? 'Fin de juego' : 'Transición de nivel'}`);
    
    // ✨ Mostrar animación de puntos si hay puntos que mostrar
    const scoreToAnimate = isGameEnd ? 
        (levelResult && levelResult.totalScore > 0 ? levelResult.totalScore : 0) : 
        (levelResult && levelResult.levelScore > 0 ? levelResult.levelScore : 0);
    
    if (scoreToAnimate > 0) {
        showScoreAnimation(levelResult, isGameEnd, () => {
            // Callback: mostrar el modal después de la animación
            showActualUnifiedModal(levelResult, isGameEnd);
        });
        return;
    }
    
    // Si no hay puntos, mostrar modal directamente
    showActualUnifiedModal(levelResult, isGameEnd);
}

// 🎰 ANIMACIÓN TIPO TRAGAMONEDAS para mostrar puntos
function showScoreAnimation(levelResult, isGameEnd, callback) {
    console.log(`🎰 Iniciando animación de puntos tipo tragamonedas - ${isGameEnd ? 'Fin de juego' : 'Transición de nivel'}`);
    
    // Activar el bloqueo modal
    setModalActive(true);
    
    // Crear panel de animación
    const animationPanel = document.createElement('div');
    animationPanel.id = 'score-animation-panel';
    
    // Estilos del panel de animación
    animationPanel.style.position = 'fixed';
    animationPanel.style.top = '0';
    animationPanel.style.left = '0';
    animationPanel.style.width = '100%';
    animationPanel.style.height = '100%';
    animationPanel.style.display = 'flex';
    animationPanel.style.flexDirection = 'column';
    animationPanel.style.justifyContent = 'center';
    animationPanel.style.alignItems = 'center';
    animationPanel.style.zIndex = '2999'; // Justo debajo del modal principal
    animationPanel.style.color = 'white';
    animationPanel.style.textAlign = 'center';
    
    // Estilos específicos según el contexto
    if (isGameEnd) {
        animationPanel.style.backgroundColor = 'rgba(20, 0, 40, 0.95)'; // Más oscuro para fin de juego
    } else {
        animationPanel.style.backgroundColor = 'rgba(0, 20, 40, 0.95)'; // Azul para transición
    }
    
    // Contenido del panel de animación
    const isMobile = shootingSystem.isMobile;
    const titleSize = isMobile ? '24px' : '32px';
    const scoreSize = isMobile ? '60px' : '80px';
    
    // Definir título y texto según el contexto
    const title = isGameEnd ? '¡Juego Finalizado!' : '¡Nivel Completado!';
    const scoreLabel = isGameEnd ? 'Tu puntuación total:' : 'Puntuación del nivel:';
    const titleColor = isGameEnd ? 'rgba(255, 100, 100, 1)' : 'rgba(0, 255, 255, 1)';
    
    animationPanel.innerHTML = `
        <h1 style="font-size: ${titleSize}; margin: 0 0 30px 0; color: ${titleColor};">${title}</h1>
        <p style="font-size: 20px; margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.8);">${scoreLabel}</p>
        <div id="animated-score" style="font-size: ${scoreSize}; font-weight: bold; color: rgba(50, 255, 50, 1); margin: 20px 0; font-family: 'Courier New', monospace;">0</div>
        <p style="font-size: 18px; margin: 0; color: rgba(255, 255, 255, 0.6);">puntos</p>
    `;
    
    document.body.appendChild(animationPanel);
    
    // Configurar la animación
    const scoreElement = document.getElementById('animated-score');
    
    // Determinar qué puntaje animar según el contexto
    const targetScore = isGameEnd ? levelResult.totalScore : levelResult.levelScore;
    let currentScore = 0;
    
    // Duración total de la animación: 2 segundos
    const animationDuration = 2000;
    const updateInterval = 50; // Actualizar cada 50ms
    const totalUpdates = animationDuration / updateInterval;
    const increment = targetScore / totalUpdates;
    
    console.log(`🎰 Animando de 0 a ${targetScore} puntos en ${animationDuration}ms`);
    
    // Función de animación
    const animateScore = () => {
        currentScore += increment;
        
        if (currentScore >= targetScore) {
            // Llegamos al objetivo
            currentScore = targetScore;
            scoreElement.textContent = Math.floor(currentScore);
            
            console.log("🎰 Animación de puntos completada, esperando 1 segundo...");
            
            // Esperar 1 segundo más antes de continuar
            setTimeout(() => {
                // Remover panel de animación
                setModalActive(false); // Temporalmente desactivar modal
                document.body.removeChild(animationPanel);
                
                console.log("🎰 Animación finalizada, mostrando modal de transición");
                
                // Llamar al callback para mostrar el modal real
                callback();
            }, 1000);
            
        } else {
            // Continuar animación
            scoreElement.textContent = Math.floor(currentScore);
            setTimeout(animateScore, updateInterval);
        }
    };
    
    // Iniciar la animación después de un pequeño delay
    setTimeout(animateScore, 200);
}

// Función que contiene la lógica original del modal (separada para reutilizar)
function showActualUnifiedModal(levelResult = null, isGameEnd = false) {
    console.log(`🎮 Mostrando modal real - ${isGameEnd ? 'Fin de juego' : 'Transición de nivel'}`);
    
    // Activar el bloqueo modal
    setModalActive(true);
    
    // Si es fin de juego, crear levelResult básico
    if (isGameEnd && !levelResult) {
        const finalScore = window.gameState ? window.gameState.score : 0;
        levelResult = {
            levelCompleted: true,
            isLastLevel: true,
            levelScore: finalScore,
            totalScore: finalScore,
            nextLevel: null
        };
    }
    
    // 🎯 GUARDAR el nivel completado ANTES de avanzar al siguiente (solo si no es fin de juego)
    if (!isGameEnd) {
        shootingSystem.completedLevel = window.LevelManager ? window.LevelManager.current.level : 1;
        console.log(`📝 Nivel completado guardado: ${shootingSystem.completedLevel}`);
    }
    
    // Obtener información del siguiente nivel (solo si no es fin de juego)
    let hasAdvanced = false;
    let nextLevelInfo = null;
    
    if (!isGameEnd && window.LevelManager) {
        hasAdvanced = window.LevelManager.advanceLevel();
        nextLevelInfo = window.LevelManager.getCurrentLevelInfo();
    }
    
    // Crear panel
    const modalPanel = document.createElement('div');
    modalPanel.id = isGameEnd ? 'game-end-panel' : 'level-transition-panel';
    
    // Estilos del panel
    modalPanel.style.position = 'fixed';
    modalPanel.style.top = '50%';
    modalPanel.style.left = '50%';
    modalPanel.style.transform = 'translate(-50%, -50%)';
    modalPanel.style.color = 'white';
    modalPanel.style.padding = '30px';
    modalPanel.style.borderRadius = '15px';
    modalPanel.style.textAlign = 'center';
    modalPanel.style.zIndex = '3000';
    modalPanel.style.minWidth = '350px';
    modalPanel.style.maxWidth = '90%';
    modalPanel.style.maxHeight = '80%';
    modalPanel.style.overflowY = 'auto';
    
    // Estilos específicos según el contexto
    if (isGameEnd) {
        modalPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        modalPanel.style.boxShadow = '0 0 25px rgba(255, 50, 50, 0.7)';
    } else {
        modalPanel.style.backgroundColor = 'rgba(0, 40, 80, 0.95)';
        modalPanel.style.boxShadow = '0 0 30px rgba(0, 255, 255, 0.6)';
    }
    
    // Determinar tamaños basados en dispositivo
    const isMobile = shootingSystem.isMobile;
    const buttonPadding = isMobile ? '16px 20px' : '12px 20px';
    const buttonMargin = isMobile ? '10px 0' : '5px 0';
    const buttonSize = isMobile ? '20px' : '18px';
    
    // Contenido del panel según el contexto
    let panelContent;
    
    if (isGameEnd) {
        // Contenido para fin de juego
        panelContent = `
            <h2 style="color: rgba(255, 50, 50, 1); margin: 0 0 20px 0; font-size: 28px;">¡Tiempo Finalizado!</h2>
            <p style="font-size: 22px; margin: 15px 0;">Tu puntuación final es:</p>
            <p style="font-size: 42px; margin: 20px 0; color: rgba(0, 255, 255, 1); font-weight: bold;">${levelResult.totalScore} puntos</p>
            
            <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 25px;">
                <button id="end-game-now-button" style="background-color: rgba(50, 205, 50, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">GUARDAR EN RANKING</button>
                <button id="restart-from-level1-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">JUGAR DE NUEVO</button>
            </div>
        `;
        
        // Guardar el contenido original para compatibilidad con funciones existentes
        shootingSystem.originalEndPanel = {
            content: panelContent,
            score: levelResult.totalScore
        };
    } else {
        // Contenido para transición de nivel
        const progressSummary = window.LevelManager.getProgressSummary();
        
        panelContent = `
            <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 20px 0; font-size: 28px;">¡Nivel Completado!</h2>
            
            <div style="margin: 20px 0;">
                <p style="font-size: 20px; margin: 10px 0;">Puntuación del nivel:</p>
                <p style="font-size: 36px; margin: 10px 0; color: rgba(50, 255, 50, 1); font-weight: bold;">${levelResult.levelScore} puntos</p>
            </div>
            
            <div style="margin: 20px 0; padding: 15px; background-color: rgba(255, 255, 255, 0.1); border-radius: 8px;">
                <p style="font-size: 18px; margin: 5px 0;">Puntuación total: <span style="color: rgba(255, 255, 0, 1); font-weight: bold;">${levelResult.totalScore} puntos</span></p>
                <p style="font-size: 16px; margin: 5px 0;">Nivel actual: ${progressSummary.currentLevel} de ${progressSummary.totalLevels}</p>
            </div>
            
            ${hasAdvanced ? `
            <div style="margin: 25px 0;">
                <h3 style="color: rgba(255, 255, 255, 0.9); margin: 15px 0;">Siguiente Nivel:</h3>
                <p style="font-size: 22px; margin: 10px 0; color: rgba(0, 255, 255, 1); font-weight: bold;">${nextLevelInfo.name}</p>
                <p style="font-size: 16px; margin: 10px 0; color: rgba(255, 255, 255, 0.8);">${nextLevelInfo.description}</p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 30px;">
                <button id="continue-next-level-button" style="background-color: rgba(0, 255, 0, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">CONTINUAR SIGUIENTE NIVEL</button>
                <button id="end-game-now-button" style="background-color: rgba(255, 165, 0, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">FINALIZAR Y GUARDAR EN RANKING</button>
                <button id="restart-from-level1-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">EMPEZAR DE NUEVO</button>
            </div>
            ` : `
            <div style="margin: 25px 0;">
                <p style="font-size: 18px; color: rgba(255, 255, 0, 1);">No se pudo avanzar al siguiente nivel.</p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 30px;">
                <button id="end-game-now-button" style="background-color: rgba(255, 165, 0, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">FINALIZAR Y GUARDAR EN RANKING</button>
                <button id="restart-from-level1-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">EMPEZAR DE NUEVO</button>
            </div>
            `}
        `;
    }
    
    modalPanel.innerHTML = panelContent;
    document.body.appendChild(modalPanel);
    
    // Configurar botón de continuar siguiente nivel (solo para transiciones)
    const continueButton = document.getElementById('continue-next-level-button');
    if (continueButton) {
        const handleContinue = function(e) {
            e.preventDefault();
            console.log("🚀 Continuando al siguiente nivel");
            
            // Cerrar panel
            setModalActive(false);
            document.body.removeChild(modalPanel);
            
            // Reiniciar el nivel (pero mantener progreso total)
            restartCurrentLevel();
        };
        
        continueButton.addEventListener('click', handleContinue);
        continueButton.addEventListener('touchend', handleContinue);
        
        // Efectos táctiles para móvil
        if (isMobile) {
            continueButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });
            continueButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            });
            continueButton.addEventListener('touchcancel', function(e) {
                this.style.transform = 'scale(1)';
            });
        }
    }
    
    // Configurar botón de finalizar juego / guardar en ranking
    const endGameButton = document.getElementById('end-game-now-button');
    if (endGameButton) {
        const handleEndGame = function(e) {
            e.preventDefault();
            
            if (isGameEnd) {
                console.log("📝 Guardando puntuación en ranking");
                // Para fin de juego, mostrar directamente el formulario de ranking
                showRankingSubmitForm(modalPanel, levelResult.totalScore);
            } else {
                console.log("🏁 Finalizando juego voluntariamente y guardando puntuación total");
                // Cerrar panel de transición
                setModalActive(false);
                document.body.removeChild(modalPanel);
                
                // Terminar juego voluntariamente con la puntuación total
                endGameVoluntarily(levelResult.totalScore);
            }
        };
        
        endGameButton.addEventListener('click', handleEndGame);
        endGameButton.addEventListener('touchend', handleEndGame);
        
        // Efectos táctiles para móvil
        if (isMobile) {
            endGameButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });
            endGameButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            });
            endGameButton.addEventListener('touchcancel', function(e) {
                this.style.transform = 'scale(1)';
            });
        }
    }
    
    // Configurar botón de empezar de nuevo
    const restartButton = document.getElementById('restart-from-level1-button');
    if (restartButton) {
        const handleRestart = function(e) {
            e.preventDefault();
            console.log("🔄 Empezando de nuevo desde nivel 1");
            
            // Cerrar panel
            setModalActive(false);
            document.body.removeChild(modalPanel);
            
            if (isGameEnd) {
                // Para fin de juego, usar la función completa de reset
                window.completeGameReset();
            } else {
                // Para transición de nivel, resetear completamente el LevelManager
                if (window.LevelManager && typeof window.LevelManager.reset === 'function') {
                    window.LevelManager.reset();
                }
                // Usar la función completa de reset
                window.completeGameReset();
            }
        };
        
        restartButton.addEventListener('click', handleRestart);
        restartButton.addEventListener('touchend', handleRestart);
        
        // Efectos táctiles para móvil
        if (isMobile) {
            restartButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });
            restartButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            });
            restartButton.addEventListener('touchcancel', function(e) {
                this.style.transform = 'scale(1)';
            });
        }
    }
}

// Función legacy para compatibilidad - redirige al modal unificado
function showLevelTransitionScreen(levelResult) {
    console.log("🔄 Redirigiendo showLevelTransitionScreen al modal unificado");
    showUnifiedGameModal(levelResult, false);
}


