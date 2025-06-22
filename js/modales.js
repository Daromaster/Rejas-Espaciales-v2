// modales.js - Sistema de modales y pantallas para Rejas Espaciales V2
// Adaptado del juego Ensayo para implementar P5

// === CONFIGURACIÓN DEL SISTEMA DE MODALES ===
const modalSystem = {
    active: false,
    currentModal: null,
    infoShown: false,
    debugMode: false,  // Para el botón debug on/off
    playerName: '',    // Nombre del jugador guardado
    isMobile: false    // Detector de dispositivo móvil
};

// === DETECCIÓN DE DISPOSITIVO MÓVIL ===
function detectMobileDevice() {
    modalSystem.isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    return modalSystem.isMobile;
}

// === FUNCIONES DE CONTROL MODAL ===
function setModalActive(active) {
    modalSystem.active = active;
    console.log(`Modal ${active ? 'activado' : 'desactivado'}`);
    
    // Crear/remover overlay para bloquear interacción
    const existingOverlay = document.getElementById('modal-overlay');
    
    if (active && !existingOverlay) {
        const overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.1);
            z-index: 2998;
            pointer-events: auto;
        `;
        document.body.appendChild(overlay);
    } else if (!active && existingOverlay) {
        document.body.removeChild(existingOverlay);
    }
}

// === A) PANTALLA DE INSTRUCCIONES INICIAL ===
function mostrarPantallaInstrucciones() {
    if (modalSystem.infoShown) return;
    
    console.log('📋 Mostrando pantalla de instrucciones inicial');
    
    // Detectar dispositivo móvil
    detectMobileDevice();
    
    // Crear panel de instrucciones
    const infoPanel = document.createElement('div');
    infoPanel.id = 'info-panel';
    
    // Activar modo modal
    setModalActive(true);
    
    // Estilos del panel
    infoPanel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
        text-align: center;
        z-index: 3000;
        min-width: 80%;
        max-width: 600px;
        cursor: pointer;
    `;
    
    // Contenido del panel adaptado para múltiples niveles
    infoPanel.innerHTML = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 15px 0; font-size: 24px;">Instrucciones del Juego</h2>
        <p style="font-size: 18px; margin: 15px 0; line-height: 1.5;">El juego consiste en disparar a la pelota cuando <strong style="color: rgba(0, 255, 255, 1);">no está cubierta</strong> por los barrotes de la reja.</p>
        <p style="font-size: 16px; margin: 15px 0; line-height: 1.5;">Cada nivel tiene <strong>60 segundos</strong> para conseguir la mayor cantidad de puntos posibles.</p>
        <p style="font-size: 16px; margin: 15px 0;">- Aciertos: <strong style="color: #00ff00;">+10 puntos</strong></p>
        <p style="font-size: 16px; margin: 15px 0;">- Fallos: <strong style="color: #ff0000;">Puede restar puntos</strong></p>
        <p style="font-size: 16px; margin: 15px 0; color: rgba(0, 255, 255, 0.8);">Toca en cualquier parte para comenzar</p>
        <button id="start-game-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: 12px 25px; margin-top: 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 18px;">¡COMENZAR!</button>
    `;
    
    // Añadir panel al DOM
    document.body.appendChild(infoPanel);
    
    // Guardar referencia
    modalSystem.currentModal = infoPanel;
    
    // Función para cerrar el panel
    const cerrarPanelInstrucciones = function() {
        modalSystem.infoShown = true;
        setModalActive(false);
        
        if (infoPanel.parentNode) {
            document.body.removeChild(infoPanel);
        }
        
        modalSystem.currentModal = null;
        console.log("📋 Panel de instrucciones cerrado, el juego puede comenzar");
        
        // Notificar al juego que puede iniciar
        if (window.gameInstance && typeof window.gameInstance.startGame === 'function') {
            window.gameInstance.startGame();
        }
    };
    
    // Configurar eventos
    const startButton = document.getElementById('start-game-button');
    if (startButton) {
        startButton.addEventListener('click', function(e) {
            e.stopPropagation();
            cerrarPanelInstrucciones();
        });
    }
    
    // Cerrar al hacer clic en cualquier parte del panel
    infoPanel.addEventListener('click', cerrarPanelInstrucciones);
    
    // Soporte para dispositivos táctiles
    infoPanel.addEventListener('touchend', function(e) {
        e.preventDefault();
        cerrarPanelInstrucciones();
    });
}

// === B1) MODAL ENTRE NIVELES - ANIMACIÓN DE PUNTOS TIPO TRAGAMONEDAS ===
function mostrarAnimacionPuntos(puntajeNivel, puntajeTotal, esFinJuego = false, callback = null) {
    console.log('🎰 Iniciando animación de puntos tipo tragamonedas');
    
    // Activar modo modal
    setModalActive(true);
    
    // Crear panel de animación
    const animationPanel = document.createElement('div');
    animationPanel.id = 'score-animation-panel';
    
    // Determinar orientación para tamaños
    const isMobile = modalSystem.isMobile;
    const esVertical = window.innerHeight > window.innerWidth;
    
    // Estilos del panel
    animationPanel.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 2999;
        color: white;
        text-align: center;
        background-color: ${esFinJuego ? 'rgba(20, 0, 40, 0.95)' : 'rgba(0, 20, 40, 0.95)'};
    `;
    
    // Tamaños adaptados por orientación
    const titleSize = isMobile ? (esVertical ? '20px' : '24px') : '32px';
    const scoreSize = isMobile ? (esVertical ? '48px' : '60px') : '80px';
    const mediumScoreSize = isMobile ? (esVertical ? '32px' : '40px') : '50px';
    
    // Título y color según contexto
    const title = esFinJuego ? '¡Juego Finalizado!' : '¡Nivel Completado!';
    const titleColor = esFinJuego ? 'rgba(255, 100, 100, 1)' : 'rgba(0, 255, 255, 1)';
    
    // Contenido base del panel
    let contenidoHTML = `
        <h1 style="font-size: ${titleSize}; margin: 0 0 30px 0; color: ${titleColor};">${title}</h1>
    `;
    
    // Agregar puntaje total arriba si no es nivel 1 y no es fin de juego
    if (!esFinJuego && puntajeTotal > puntajeNivel) {
        contenidoHTML += `
            <p style="font-size: 16px; margin: 0 0 10px 0; color: rgba(255, 255, 255, 0.6);">Puntaje total acumulado:</p>
            <div id="animated-total-score" style="font-size: ${mediumScoreSize}; font-weight: bold; color: rgba(255, 255, 150, 1); margin: 10px 0; font-family: 'Courier New', monospace;">0</div>
        `;
    }
    
    // Puntaje principal (nivel actual o total si es fin de juego)
    const scoreLabel = esFinJuego ? 'Tu puntuación final:' : 'Puntuación del nivel:';
    contenidoHTML += `
        <p style="font-size: 20px; margin: 20px 0 10px 0; color: rgba(255, 255, 255, 0.8);">${scoreLabel}</p>
        <div id="animated-score" style="font-size: ${scoreSize}; font-weight: bold; color: rgba(50, 255, 50, 1); margin: 20px 0; font-family: 'Courier New', monospace;">0</div>
        <p style="font-size: 18px; margin: 0; color: rgba(255, 255, 255, 0.6);">puntos</p>
    `;
    
    // Espacio para banner futuro según orientación
    const bannerWidth = esVertical ? '90%' : '33%';
    const bannerHeight = esVertical ? '50px' : '60px';
    const bannerFontSize = esVertical ? '12px' : '14px';
    
    contenidoHTML += `
        <div style="width: ${bannerWidth}; height: ${bannerHeight}; margin-top: ${esVertical ? '20px' : '30px'}; border: 2px dashed rgba(255, 255, 255, 0.3); display: flex; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.5); font-size: ${bannerFontSize};">
            Espacio para banner futuro
        </div>
    `;
    
    animationPanel.innerHTML = contenidoHTML;
    document.body.appendChild(animationPanel);
    
    // Configurar animaciones
    const scoreElement = document.getElementById('animated-score');
    const totalScoreElement = document.getElementById('animated-total-score');
    
    // Duración: 3 segundos animación + 1 segundo pausa = 4 segundos total
    const animationDuration = 3000;
    const updateInterval = 50;
    const totalUpdates = animationDuration / updateInterval;
    
    let currentScore = 0;
    let currentTotalScore = 0;
    const scoreTarget = esFinJuego ? puntajeTotal : puntajeNivel;
    const scoreIncrement = scoreTarget / totalUpdates;
    const totalIncrement = totalScoreElement ? (puntajeTotal - puntajeNivel) / totalUpdates : 0;
    
    console.log(`🎰 Animando: Nivel=${puntajeNivel}, Total=${puntajeTotal}, Target=${scoreTarget}`);
    
    // Función de animación
    const animateScore = () => {
        currentScore += scoreIncrement;
        if (totalScoreElement) {
            currentTotalScore += totalIncrement;
            totalScoreElement.textContent = Math.floor(currentTotalScore);
        }
        
        if (currentScore >= scoreTarget) {
            // Completar animación
            currentScore = scoreTarget;
            scoreElement.textContent = Math.floor(currentScore);
            if (totalScoreElement) {
                totalScoreElement.textContent = puntajeTotal - puntajeNivel;
            }
            
            console.log('🎰 Animación completada, esperando 1 segundo...');
            
            // Esperar 1 segundo adicional
            setTimeout(() => {
                setModalActive(false);
                document.body.removeChild(animationPanel);
                
                console.log('🎰 Animación finalizada, ejecutando callback');
                if (callback) callback();
            }, 1000);
            
        } else {
            // Continuar animación
            scoreElement.textContent = Math.floor(currentScore);
            setTimeout(animateScore, updateInterval);
        }
    };
    
    // Iniciar animación después de 200ms
    setTimeout(animateScore, 200);
}

// === B2) MODAL ENTRE NIVELES - OPCIONES Y NAVEGACIÓN ===
function mostrarModalEntreNiveles(resultadoNivel) {
    console.log('🎮 Mostrando modal entre niveles');
    
    // Activar modo modal
    setModalActive(true);
    
    // Crear panel
    const modalPanel = document.createElement('div');
    modalPanel.id = 'level-transition-panel';
    
    // Detectar si es el último nivel
    const esUltimoNivel = resultadoNivel.esUltimoNivel || resultadoNivel.nivel >= 4;
    const isMobile = modalSystem.isMobile;
    
    // Estilos del panel
    modalPanel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 40, 80, 0.95);
        color: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        z-index: 3000;
        min-width: 350px;
        max-width: 90%;
        max-height: 80%;
        overflow-y: auto;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.6);
    `;
    
    // Tamaños de botones
    const buttonPadding = isMobile ? '16px 20px' : '12px 20px';
    const buttonMargin = isMobile ? '10px 0' : '5px 0';
    const buttonSize = isMobile ? '20px' : '18px';
    
    // Contenido del modal
    let contenidoModal = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 20px 0; font-size: 28px;">Nivel ${resultadoNivel.nivel} Completado</h2>
        <p style="font-size: 18px; margin: 15px 0;">Puntaje del nivel: <strong style="color: rgba(50, 255, 50, 1);">${resultadoNivel.puntajeNivel} puntos</strong></p>
        <p style="font-size: 18px; margin: 15px 0;">Puntaje total: <strong style="color: rgba(255, 255, 150, 1);">${resultadoNivel.puntajeTotal} puntos</strong></p>
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 25px;">
            <button id="guardar-ranking-button" style="background-color: rgba(50, 205, 50, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">GUARDAR EN RANKING</button>
    `;
    
    // Agregar botón de siguiente nivel si no es el último
    if (!esUltimoNivel) {
        contenidoModal += `
            <button id="siguiente-nivel-button" style="background-color: rgba(0, 255, 255, 0.8); color: black; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">SIGUIENTE NIVEL</button>
        `;
    } else {
        // Mensaje para último nivel
        contenidoModal += `
            <p style="font-size: 16px; margin: 15px 0; color: rgba(255, 255, 100, 1); line-height: 1.4;">
                <strong>¡Alcanzaste el último nivel actual de este juego!</strong><br>
                Puntaje final: ${resultadoNivel.puntajeTotal} puntos<br>
                <span style="font-size: 14px; color: rgba(255, 255, 255, 0.8);">Pronto se incorporarán nuevos niveles!!!</span>
            </p>
        `;
    }
    
    contenidoModal += `
            <button id="reiniciar-juego-button" style="background-color: rgba(150, 150, 150, 0.8); color: white; border: none; padding: ${buttonPadding}; margin: ${buttonMargin}; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: ${buttonSize};">REINICIAR JUEGO</button>
        </div>
    `;
    
    modalPanel.innerHTML = contenidoModal;
    document.body.appendChild(modalPanel);
    
    // Configurar eventos de botones
    configurarEventosModalEntreNiveles(modalPanel, resultadoNivel, esUltimoNivel);
}

// Configurar eventos para el modal entre niveles
function configurarEventosModalEntreNiveles(modalPanel, resultadoNivel, esUltimoNivel) {
    const isMobile = modalSystem.isMobile;
    
    // Botón guardar ranking
    const guardarButton = document.getElementById('guardar-ranking-button');
    if (guardarButton) {
        const handleGuardar = function(e) {
            e.preventDefault();
            console.log('💾 Guardando en ranking');
            mostrarFormularioRanking(modalPanel, resultadoNivel.puntajeTotal);
        };
        
        guardarButton.addEventListener('click', handleGuardar);
        guardarButton.addEventListener('touchend', handleGuardar);
        
        if (isMobile) {
            guardarButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });
            guardarButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            });
        }
    }
    
    // Botón siguiente nivel (si no es el último)
    if (!esUltimoNivel) {
        const siguienteButton = document.getElementById('siguiente-nivel-button');
        if (siguienteButton) {
            const handleSiguiente = function(e) {
                e.preventDefault();
                console.log('➡️ Avanzando al siguiente nivel');
                
                // Cerrar modal
                setModalActive(false);
                document.body.removeChild(modalPanel);
                
                // Avanzar nivel en el juego
                if (window.gameInstance && typeof window.gameInstance.avanzarNivel === 'function') {
                    window.gameInstance.avanzarNivel();
                }
            };
            
            siguienteButton.addEventListener('click', handleSiguiente);
            siguienteButton.addEventListener('touchend', handleSiguiente);
            
            if (isMobile) {
                siguienteButton.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    this.style.transform = 'scale(0.95)';
                });
                siguienteButton.addEventListener('touchend', function(e) {
                    this.style.transform = 'scale(1)';
                });
            }
        }
    }
    
    // Botón reiniciar juego
    const reiniciarButton = document.getElementById('reiniciar-juego-button');
    if (reiniciarButton) {
        const handleReiniciar = function(e) {
            e.preventDefault();
            console.log('🔄 Reiniciando juego');
            
            // Cerrar modal
            setModalActive(false);
            document.body.removeChild(modalPanel);
            
            // Reiniciar juego
            if (window.gameInstance && typeof window.gameInstance.reiniciarJuego === 'function') {
                window.gameInstance.reiniciarJuego();
            }
        };
        
        reiniciarButton.addEventListener('click', handleReiniciar);
        reiniciarButton.addEventListener('touchend', handleReiniciar);
        
        if (isMobile) {
            reiniciarButton.addEventListener('touchstart', function(e) {
                e.preventDefault();
                this.style.transform = 'scale(0.95)';
            });
            reiniciarButton.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            });
        }
    }
}

// === FUNCIÓN PRINCIPAL PARA MOSTRAR TRANSICIÓN COMPLETA ===
function mostrarTransicionNivel(resultadoNivel) {
    console.log('🎯 Iniciando transición completa de nivel', resultadoNivel);
    
    // Primero mostrar animación de puntos, luego el modal de opciones
    mostrarAnimacionPuntos(
        resultadoNivel.puntajeNivel,
        resultadoNivel.puntajeTotal,
        false, // No es fin de juego
        () => {
            // Callback: mostrar modal de opciones después de la animación
            mostrarModalEntreNiveles(resultadoNivel);
        }
    );
}

// === C) BOTONES DE DEBUG ===
function crearBotonesDebug() {
    // Solo crear en entorno de desarrollo
    if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
        return;
    }
    
    console.log('🐛 Creando botones de debug');
    
    // Contenedor para botones debug
    const debugContainer = document.createElement('div');
    debugContainer.id = 'debug-container';
    debugContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 4000;
        display: flex;
        flex-direction: column;
        gap: 5px;
    `;
    
    // Botón Debug On/Off
    const debugToggleBtn = document.createElement('button');
    debugToggleBtn.id = 'debug-toggle-btn';
    debugToggleBtn.innerHTML = modalSystem.debugMode ? 'Debug: ON' : 'Debug: OFF';
    debugToggleBtn.style.cssText = `
        padding: 8px 12px;
        background-color: ${modalSystem.debugMode ? 'rgba(50, 255, 50, 0.8)' : 'rgba(255, 50, 50, 0.8)'};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
    `;
    
    debugToggleBtn.addEventListener('click', function() {
        modalSystem.debugMode = !modalSystem.debugMode;
        this.innerHTML = modalSystem.debugMode ? 'Debug: ON' : 'Debug: OFF';
        this.style.backgroundColor = modalSystem.debugMode ? 'rgba(50, 255, 50, 0.8)' : 'rgba(255, 50, 50, 0.8)';
        
        console.log(`🐛 Modo debug: ${modalSystem.debugMode ? 'ACTIVADO' : 'DESACTIVADO'}`);
        
        // Notificar cambio de modo debug al juego
        if (window.gameInstance && typeof window.gameInstance.setDebugMode === 'function') {
            window.gameInstance.setDebugMode(modalSystem.debugMode);
        }
        
        // Actualizar visibilidad de otros botones debug
        finalizarNivelBtn.style.display = modalSystem.debugMode ? 'block' : 'none';
    });
    
    // Botón Finalizar Nivel (solo visible si debug está ON)
    const finalizarNivelBtn = document.createElement('button');
    finalizarNivelBtn.id = 'finalizar-nivel-btn';
    finalizarNivelBtn.innerHTML = 'Finalizar Nivel';
    finalizarNivelBtn.style.cssText = `
        padding: 8px 12px;
        background-color: rgba(255, 165, 0, 0.8);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        display: ${modalSystem.debugMode ? 'block' : 'none'};
    `;
    
    finalizarNivelBtn.addEventListener('click', function() {
        console.log('🐛 Finalizando nivel manualmente (debug)');
        
        // Finalizar nivel actual
        if (window.gameInstance && typeof window.gameInstance.finalizarNivelDebug === 'function') {
            window.gameInstance.finalizarNivelDebug();
        }
    });
    
    debugContainer.appendChild(debugToggleBtn);
    debugContainer.appendChild(finalizarNivelBtn);
    document.body.appendChild(debugContainer);
}

// === PLACEHOLDER PARA FORMULARIO DE RANKING (B2) ===
function mostrarFormularioRanking(panel, puntaje) {
    console.log('📝 TODO: Implementar formulario de ranking completo');
    
    // Por ahora, cambiar el contenido del panel para mostrar el formulario básico
    const isMobile = modalSystem.isMobile;
    const buttonPadding = isMobile ? '16px 20px' : '12px 20px';
    const inputPadding = isMobile ? '15px' : '10px';
    const inputFontSize = isMobile ? '18px' : '16px';
    
    // Recuperar nombre guardado
    let savedPlayerName = modalSystem.playerName;
    try {
        savedPlayerName = localStorage.getItem('rejasEspacialesPlayerName') || '';
        modalSystem.playerName = savedPlayerName;
    } catch(error) {
        console.warn('No se pudo recuperar nombre desde localStorage:', error);
    }
    
    panel.innerHTML = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 20px 0; font-size: 24px;">Guardar Puntuación</h2>
        <p style="font-size: 16px; margin: 15px 0;">Ingresa tu nombre para guardar en el ranking:</p>
        <p style="font-size: 28px; margin: 10px 0; color: rgba(0, 255, 255, 1); font-weight: bold;">${puntaje} puntos</p>
        
        <div style="margin: 20px 0;">
            <input type="text" id="player-name-input" placeholder="Tu nombre" 
                   style="padding: ${inputPadding}; width: 80%; font-size: ${inputFontSize}; border-radius: 5px; border: 2px solid rgba(0, 255, 255, 0.5); background-color: rgba(0, 0, 0, 0.7); color: white;" 
                   maxlength="20" value="${savedPlayerName}">
        </div>
        
        <div id="ranking-submit-message" style="min-height: 20px; margin: 10px 0; color: rgba(255, 255, 0, 0.8);"></div>
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
            <button id="save-score-button" style="background-color: rgba(50, 205, 50, 0.8); color: white; border: none; padding: ${buttonPadding}; border-radius: 5px; cursor: pointer; font-weight: bold;">GUARDAR</button>
            <button id="cancel-score-button" style="background-color: rgba(150, 150, 150, 0.8); color: white; border: none; padding: ${buttonPadding}; border-radius: 5px; cursor: pointer; font-weight: bold;">CANCELAR</button>
        </div>
        
        <p style="font-size: 12px; margin-top: 15px; color: rgba(255, 255, 255, 0.6);">
            TODO: Implementar conexión completa con backend y geolocalización
        </p>
    `;
    
    // Configurar eventos básicos (implementación completa pendiente)
    const saveButton = document.getElementById('save-score-button');
    const cancelButton = document.getElementById('cancel-score-button');
    const nameInput = document.getElementById('player-name-input');
    
    if (saveButton && nameInput) {
        saveButton.addEventListener('click', function() {
            const playerName = nameInput.value.trim();
            if (!playerName) {
                document.getElementById('ranking-submit-message').textContent = 'Por favor ingresa tu nombre';
                return;
            }
            
            // Guardar nombre localmente
            try {
                localStorage.setItem('rejasEspacialesPlayerName', playerName);
                modalSystem.playerName = playerName;
            } catch(error) {
                console.warn('No se pudo guardar nombre en localStorage:', error);
            }
            
            console.log(`📝 Guardando puntaje: ${playerName} - ${puntaje} puntos`);
            document.getElementById('ranking-submit-message').textContent = 'TODO: Conectar con backend para guardar';
        });
    }
    
    if (cancelButton) {
        cancelButton.addEventListener('click', function() {
            // Volver al modal anterior
            console.log('❌ Cancelando guardado de ranking');
            // TODO: Implementar navegación de vuelta
        });
    }
}

// === FUNCIONES DE UTILIDAD ===
function cerrarModalActivo() {
    console.log('❌ Cerrando modal activo');
    
    const activeModal = modalSystem.currentModal || 
                       document.getElementById('info-panel') ||
                       document.getElementById('level-transition-panel') ||
                       document.getElementById('score-animation-panel');
    
    if (activeModal && activeModal.parentNode) {
        setModalActive(false);
        document.body.removeChild(activeModal);
        modalSystem.currentModal = null;
    }
}

// === INICIALIZACIÓN ===
function initModales() {
    console.log('🎭 Inicializando sistema de modales');
    
    // Detectar dispositivo móvil
    detectMobileDevice();
    
    // Crear botones de debug en desarrollo
    crearBotonesDebug();
    
    // Configurar eventos de teclado para cerrar modales
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Escape' && modalSystem.active) {
            cerrarModalActivo();
        }
    });
    
    console.log('🎭 Sistema de modales inicializado');
}

// === EXPORTACIONES ===
// Hacer funciones disponibles globalmente para el juego principal
window.modalSystem = modalSystem;
window.mostrarPantallaInstrucciones = mostrarPantallaInstrucciones;
window.mostrarTransicionNivel = mostrarTransicionNivel;
window.mostrarAnimacionPuntos = mostrarAnimacionPuntos;
window.cerrarModalActivo = cerrarModalActivo;
window.initModales = initModales;

export {
    modalSystem,
    mostrarPantallaInstrucciones,
    mostrarTransicionNivel,
    mostrarAnimacionPuntos,
    cerrarModalActivo,
    initModales
}; 