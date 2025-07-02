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
    
    // Si es fin de juego, solo mostrar total final
    if (esFinJuego) {
        contenidoHTML += `
            <p style="font-size: 20px; margin: 20px 0 10px 0; color: rgba(255, 255, 255, 0.8);">Tu puntuación final:</p>
            <div id="animated-score" style="font-size: ${scoreSize}; font-weight: bold; color: rgba(255, 255, 150, 1); margin: 20px 0; font-family: 'Courier New', monospace;">0</div>
            <p style="font-size: 18px; margin: 0; color: rgba(255, 255, 255, 0.6);">puntos</p>
        `;
    } else {
        // Entre niveles: Mostrar total acumulado ARRIBA (si existe) y puntaje del nivel ABAJO (grande)
        
        // Solo mostrar total acumulado si hay puntaje acumulado (nivel 2+) - ARRIBA
        if (puntajeTotal > puntajeNivel) {
            contenidoHTML += `
                <p style="font-size: 16px; margin: 10px 0 5px 0; color: rgba(255, 255, 255, 0.6);">Puntaje total acumulado:</p>
                <div id="animated-total-score" style="font-size: ${mediumScoreSize}; font-weight: bold; color: rgba(255, 255, 150, 1); margin: 5px 0 20px 0; font-family: 'Courier New', monospace;">0</div>
            `;
        }
        
        // Puntaje del nivel ABAJO (grande y verde)
        contenidoHTML += `
            <p style="font-size: 20px; margin: 20px 0 10px 0; color: rgba(255, 255, 255, 0.8);">Puntuación del nivel:</p>
            <div id="animated-score" style="font-size: ${scoreSize}; font-weight: bold; color: rgba(50, 255, 50, 1); margin: 20px 0; font-family: 'Courier New', monospace;">0</div>
            <p style="font-size: 18px; margin: 0; color: rgba(255, 255, 255, 0.6);">puntos</p>
        `;
    }
    
    // Espacio para banner futuro según orientación
    const bannerWidth = esVertical ? '90%' : '33%';
    const bannerHeight = esVertical ? '150px' : '150px';
    const bannerFontSize = esVertical ? '12px' : '14px';
    
    contenidoHTML += `
        <div style="width: ${bannerWidth}; height: ${bannerHeight}; margin-top: ${esVertical ? '20px' : '30px'}; border: 2px dashed rgba(255, 255, 255, 0.3); display: flex; align-items: center; justify-content: center; color: rgba(255, 255, 255, 0.5); font-size: ${bannerFontSize};">
            ...
        </div>
    `;
    
    animationPanel.innerHTML = contenidoHTML;
    document.body.appendChild(animationPanel);
    
    // Configurar animaciones
    const scoreElement = document.getElementById('animated-score');
    const totalScoreElement = document.getElementById('animated-total-score');
    
    // Duración según el tipo: fin de juego (6s + 2s) vs entre niveles (3s + 1s)
    const animationDuration = esFinJuego ? 6000 : 3000;
    const pauseDuration = esFinJuego ? 2000 : 1000;
    const updateInterval = 50;
    const totalUpdates = animationDuration / updateInterval;
    
    let currentScore = 0;
    let currentTotalScore = 0;
    
    // Para fin de juego: animar desde 0 hasta el total final
    // Para entre niveles: animar desde 0 hasta el puntaje del nivel
    const scoreTarget = esFinJuego ? puntajeTotal : puntajeNivel;
    const scoreIncrement = scoreTarget / totalUpdates;
    
    // Para el total acumulado (solo entre niveles): animar desde 0 hasta el total acumulado previo
    const totalTarget = totalScoreElement ? (puntajeTotal - puntajeNivel) : 0;
    const totalIncrement = totalScoreElement ? totalTarget / totalUpdates : 0;
    
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
                totalScoreElement.textContent = totalTarget;
            }
            
            console.log(`🎰 Animación completada, esperando ${pauseDuration}ms...`);
            
            // Esperar según el tipo (1s entre niveles, 2s fin de juego)
            setTimeout(() => {
                setModalActive(false);
                document.body.removeChild(animationPanel);
                
                console.log('🎰 Animación finalizada, ejecutando callback');
                if (callback) callback();
            }, pauseDuration);
            
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
    
    // Detectar si es el último nivel y orientación
    const esUltimoNivel = resultadoNivel.esUltimoNivel;
    const isMobile = modalSystem.isMobile;
    const esVertical = window.innerHeight > window.innerWidth;
    
    // Estilos del panel adaptados a orientación
    const panelWidth = esVertical ? '95vw' : '85vw';
    const panelMaxWidth = esVertical ? '400px' : '500px';
    const panelPadding = esVertical ? '20px' : '30px';
    
    modalPanel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(145deg, rgba(10, 25, 50, 0.98), rgba(25, 10, 80, 0.98));
        color: white;
        padding: ${panelPadding};
        border-radius: 20px;
        text-align: center;
        z-index: 3000;
        width: ${panelWidth};
        max-width: ${panelMaxWidth};
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 0 40px rgba(0, 255, 255, 0.7), inset 0 0 20px rgba(0, 100, 255, 0.2);
        border: 2px solid rgba(0, 255, 255, 0.5);
        backdrop-filter: blur(10px);
    `;
    
    // Tamaños adaptados a orientación
    const titleSize = esVertical ? '22px' : '28px';
    const textSize = esVertical ? '16px' : '18px';
    const buttonPadding = esVertical ? '18px 25px' : '16px 30px';
    const buttonSize = esVertical ? '18px' : '20px';
    const buttonMargin = esVertical ? '12px 0' : '10px 0';
    
    // Contenido del modal con estética gaming
    let contenidoModal = `
        <div style="position: relative;">
            <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 20px 0; font-size: ${titleSize}; text-shadow: 0 0 10px rgba(0, 255, 255, 0.8); font-family: 'Arial Black', Arial, sans-serif;">🎯 Nivel ${resultadoNivel.nivel} Completado! 🎯</h2>
            
            <div style="background: rgba(0, 0, 0, 0.4); padding: 15px; border-radius: 10px; margin: 15px 0; border: 1px solid rgba(0, 255, 255, 0.3);">
                <p style="font-size: ${textSize}; margin: 8px 0; text-shadow: 0 0 5px rgba(50, 255, 50, 0.8);">🏆 Puntaje del nivel: <strong style="color: rgba(50, 255, 50, 1);">${resultadoNivel.puntajeNivel} puntos</strong></p>
                <p style="font-size: ${textSize}; margin: 8px 0; text-shadow: 0 0 5px rgba(255, 255, 0, 0.8);">⭐ Puntaje total: <strong style="color: rgba(255, 255, 0, 1);">${resultadoNivel.puntajeTotal} puntos</strong></p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: ${buttonMargin}; margin-top: 25px;">
    `;
    
    // PRIMER BOTÓN: Siguiente nivel o Finalizar (más prominente)
    if (!esUltimoNivel) {
        contenidoModal += `
            <button id="siguiente-nivel-button" class="game-button-primary" style="
                background: linear-gradient(145deg, rgba(0, 255, 255, 0.9), rgba(0, 200, 255, 1));
                color: black;
                border: none;
                padding: ${buttonPadding};
                margin: ${buttonMargin};
                border-radius: 15px;
                cursor: pointer;
                font-weight: bold;
                font-size: ${buttonSize};
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
                box-shadow: 0 6px 15px rgba(0, 255, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            ">🚀 SIGUIENTE NIVEL 🚀</button>
        `;
    } else {
        // Botón especial para finalizar el último nivel
        contenidoModal += `
            <button id="finalizar-juego-button" class="game-button-primary" style="
                background: linear-gradient(145deg, rgba(255, 215, 0, 0.9), rgba(255, 180, 0, 1));
                color: black;
                border: none;
                padding: ${buttonPadding};
                margin: ${buttonMargin};
                border-radius: 15px;
                cursor: pointer;
                font-weight: bold;
                font-size: ${buttonSize};
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
                box-shadow: 0 6px 15px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            ">🏆 FINALIZAR JUEGO 🏆</button>
        `;
    }
    
    // SEGUNDO BOTÓN: Ranking
    contenidoModal += `
        <button id="guardar-ranking-button" class="game-button-secondary" style="
            background: linear-gradient(145deg, rgba(50, 205, 50, 0.8), rgba(34, 180, 34, 1));
            color: white;
            border: none;
            padding: ${buttonPadding};
            margin: ${buttonMargin};
            border-radius: 12px;
            cursor: pointer;
            font-weight: bold;
            font-size: ${buttonSize};
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
            box-shadow: 0 4px 12px rgba(50, 205, 50, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            transition: all 0.2s ease;
            border: 2px solid rgba(50, 255, 50, 0.4);
        ">📊 GUARDAR EN RANKING 📊</button>
    `;
    
    // TERCER BOTÓN: Reiniciar (abajo)
    contenidoModal += `
        <button id="reiniciar-juego-button" class="game-button-tertiary" style="
            background: linear-gradient(145deg, rgba(120, 120, 120, 0.8), rgba(80, 80, 80, 1));
            color: white;
            border: none;
            padding: ${buttonPadding};
            margin: ${buttonMargin};
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            font-size: ${buttonSize};
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            transition: all 0.2s ease;
            border: 1px solid rgba(150, 150, 150, 0.3);
            margin-top: 15px;
        ">🔄 REINICIAR JUEGO</button>
            </div>
        </div>
    `;
    
    modalPanel.innerHTML = contenidoModal;
    document.body.appendChild(modalPanel);
    
    // Agregar efectos hover CSS dinámicos
    agregarEstilosInteractivos();
    
    // Configurar eventos de botones
    configurarEventosModalEntreNiveles(modalPanel, resultadoNivel, esUltimoNivel);
}

// Función para agregar estilos interactivos dinámicos
function agregarEstilosInteractivos() {
    // Crear stylesheet temporal si no existe
    let gameStyleSheet = document.getElementById('game-modal-styles');
    if (!gameStyleSheet) {
        gameStyleSheet = document.createElement('style');
        gameStyleSheet.id = 'game-modal-styles';
        document.head.appendChild(gameStyleSheet);
    }
    
    gameStyleSheet.textContent = `
        .game-button-primary:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 8px 20px rgba(0, 255, 255, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4);
        }
        .game-button-primary:active {
            transform: translateY(0) scale(0.98);
            box-shadow: 0 2px 8px rgba(0, 255, 255, 0.4), inset 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        .game-button-secondary:hover {
            transform: translateY(-1px) scale(1.01);
            box-shadow: 0 6px 16px rgba(50, 205, 50, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        .game-button-secondary:active {
            transform: translateY(0) scale(0.98);
            box-shadow: 0 2px 6px rgba(50, 205, 50, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .game-button-tertiary:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        .game-button-tertiary:active {
            transform: translateY(0) scale(0.97);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        @media (orientation: portrait) {
            .game-button-primary, .game-button-secondary, .game-button-tertiary {
                font-size: 16px !important;
                padding: 16px 20px !important;
            }
        }
    `;
}

// Configurar eventos para el modal entre niveles
function configurarEventosModalEntreNiveles(modalPanel, resultadoNivel, esUltimoNivel) {
    const isMobile = modalSystem.isMobile;
    
    // Botón guardar ranking (SEGUNDO en orden)
    const guardarButton = document.getElementById('guardar-ranking-button');
    if (guardarButton) {
        const handleGuardar = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('💾 Guardando en ranking');
            mostrarFormularioRanking(modalPanel, resultadoNivel.puntajeTotal, resultadoNivel.nivel);
        };
        
        guardarButton.addEventListener('click', handleGuardar);
        if (isMobile) {
            guardarButton.addEventListener('touchend', handleGuardar);
        }
    }
    
    // Botón siguiente nivel (PRIMERO - si no es el último)
    if (!esUltimoNivel) {
        const siguienteButton = document.getElementById('siguiente-nivel-button');
        if (siguienteButton) {
            const handleSiguiente = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚀 Avanzando al siguiente nivel');
                
                // Cerrar modal
                setModalActive(false);
                document.body.removeChild(modalPanel);
                
                // Avanzar nivel en el juego
                if (window.gameInstance && typeof window.gameInstance.avanzarNivel === 'function') {
                    window.gameInstance.avanzarNivel();
                }
            };
            
            siguienteButton.addEventListener('click', handleSiguiente);
            if (isMobile) {
                siguienteButton.addEventListener('touchend', handleSiguiente);
            }
        }
    } else {
        // Botón finalizar juego (PRIMERO - si es el último nivel)
        const finalizarButton = document.getElementById('finalizar-juego-button');
        if (finalizarButton) {
            const handleFinalizar = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🏁 Finalizando juego - mostrar tragamonedas final');
                
                // Cerrar modal actual
                setModalActive(false);
                document.body.removeChild(modalPanel);
                
                // Mostrar tragamonedas final (6 segundos + 2 segundos pausa)
                mostrarAnimacionPuntos(
                    resultadoNivel.puntajeNivel,
                    resultadoNivel.puntajeTotal,
                    true, // ES fin de juego
                    () => {
                        // Callback: mostrar modal de fin de juego
                        if (window.gameInstance && typeof window.gameInstance.mostrarModalFinDeJuego === 'function') {
                            window.gameInstance.mostrarModalFinDeJuego();
                        }
                    }
                );
            };
            
            finalizarButton.addEventListener('click', handleFinalizar);
            if (isMobile) {
                finalizarButton.addEventListener('touchend', handleFinalizar);
            }
        }
    }
    
    // Botón reiniciar juego (TERCERO - abajo)
    const reiniciarButton = document.getElementById('reiniciar-juego-button');
    if (reiniciarButton) {
        const handleReiniciar = function(e) {
            e.preventDefault();
            e.stopPropagation();
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
        if (isMobile) {
            reiniciarButton.addEventListener('touchend', handleReiniciar);
        }
    }
}

// === FUNCIÓN PRINCIPAL PARA MOSTRAR TRANSICIÓN COMPLETA ===
function mostrarTransicionNivel(resultadoNivel) {
    console.log('🎯 Iniciando transición completa de nivel', resultadoNivel);
    
    // Si es el último nivel, mostrar primero tragamonedas del nivel, después el final
    if (resultadoNivel.esUltimoNivel) {
        console.log('🏁 Es el último nivel - flujo: tragamonedas nivel → tragamonedas final');
        
        // 1. Primero: tragamonedas del nivel (como cualquier nivel)
        mostrarAnimacionPuntos(
            resultadoNivel.puntajeNivel,
            resultadoNivel.puntajeTotal,
            false, // No es fin de juego AÚN
            () => {
                // 2. Después: modal entre niveles normal
                mostrarModalEntreNiveles(resultadoNivel);
            }
        );
    } else {
        // Nivel normal: solo tragamonedas del nivel y modal
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
        top: 50%;
        left: 10px;
        transform: translateY(-50%);
        z-index: 4000;
        display: flex;
        flex-direction: column;
        gap: 5px;
    `;
    
    // Botón Debug On/Off
    const debugToggleBtn = document.createElement('button');
    debugToggleBtn.id = 'debug-toggle-btn';
    debugToggleBtn.innerHTML = modalSystem.debugMode ? 'Debug: OFF' : 'Debug: ON';
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
        this.innerHTML = modalSystem.debugMode ? 'Debug: OFF' : 'Debug: ON';
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

// Formulario completo de ranking con backend (P5-B2)
function mostrarFormularioRanking(panel, puntajeTotal, nivel) {
    console.log('📝 Mostrando formulario de ranking');
    
    const isMobile = modalSystem.isMobile;
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
        <p style="font-size: 28px; margin: 10px 0; color: rgba(0, 255, 255, 1); font-weight: bold;">${puntajeTotal} puntos</p>
        
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
    const cancelButton = document.getElementById('cancel-score-button');
    
    if (saveButton && nameInput && messageDiv && cancelButton) {
        // NO aplicar foco automático para evitar apertura del teclado en móviles
        // El usuario puede tocar el campo si necesita editarlo
        console.log('📱 Formulario listo - sin foco automático para mejor experiencia móvil');
        
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
            
            const deviceType = isMobile ? 'mobile' : 'desktop';
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
                        // En desarrollo local, usar IP
                        try {
                            ubicacion = await window.apiClient.ranking.getLocationFromIP();
                            console.log("📍 Ubicación obtenida por IP (desarrollo):", ubicacion);
                        } catch (geoError) {
                            console.warn("⚠️ Error en geolocalización IP:", geoError);
                            ubicacion = "desconocida";
                        }
                    } else {
                        // En producción, usar la API de geolocalización del navegador
                        console.log("🌍 Entorno de producción, usando geolocalización del navegador");
                        
                        if (navigator.geolocation) {
                            try {
                                // Envolver la geolocalización en una promesa para manejarla mejor
                                const getPosition = () => {
                                    return new Promise((resolve, reject) => {
                                        // Timeouts diferenciados por dispositivo
                                        const timeoutMs = isMobile ? 3000 : 8000; // Móvil: 3s, Desktop: 8s
                                        
                                        console.log(`🎯 Dispositivo: ${isMobile ? 'móvil' : 'desktop'}, timeout: ${timeoutMs}ms`);
                                        
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
                                    messageDiv.textContent = "Solicitando ubicación GPS...";
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
                                                setTimeout(() => reject(new Error('Reverse geocoding timeout')), 3000);
                                            });
                                            
                                            // Race entre la obtención de ubicación y el timeout
                                            ubicacion = await Promise.race([locationPromise, timeoutPromise])
                                                .catch(error => {
                                                    console.warn("⚠️ Error o timeout en geocodificación inversa:", error);
                                                    return "desconocida";
                                                });
                                        }
                                    } catch (reverseGeoError) {
                                        console.warn("⚠️ Error en geocodificación inversa:", reverseGeoError);
                                        ubicacion = "desconocida";
                                    }
                                } catch (positionError) {
                                    console.error("⚠️ Error de geolocalización:", positionError.message);
                                    messageDiv.textContent = "GPS no disponible, probando método alternativo...";
                                    
                                    // Intentar geolocalización por IP como respaldo
                                    try {
                                        console.log("🔄 Intentando geolocalización por IP como respaldo...");
                                        if (window.apiClient && window.apiClient.ranking) {
                                            ubicacion = await window.apiClient.ranking.getLocationFromIP();
                                            console.log("✅ Ubicación obtenida por IP como respaldo:", ubicacion);
                                        }
                                    } catch (ipGeoError) {
                                        console.warn("⚠️ Error en geolocalización por IP:", ipGeoError);
                                        ubicacion = "desconocida";
                                    }
                                }
                            } catch (geoWrapperError) {
                                console.warn("⚠️ Error en wrapper de geolocalización:", geoWrapperError);
                                ubicacion = "desconocida";
                            }
                        } else {
                            // Si no hay navigator.geolocation, intentar por IP directamente
                            console.log("📍 Geolocalización no disponible, usando método por IP...");
                            try {
                                if (window.apiClient && window.apiClient.ranking) {
                                    ubicacion = await window.apiClient.ranking.getLocationFromIP();
                                    console.log("✅ Ubicación obtenida por IP (navegador sin GPS):", ubicacion);
                                }
                            } catch (ipGeoError) {
                                console.warn("⚠️ Error en geolocalización por IP:", ipGeoError);
                                ubicacion = "desconocida";
                            }
                        }
                    }
                } else {
                    // En modo reintento, saltamos la geolocalización
                    console.log("🔄 Modo reintento: Saltando geolocalización");
                    ubicacion = "desconocida";
                }
            } catch (outerGeoError) {
                console.warn("⚠️ Error general al obtener ubicación:", outerGeoError);
                ubicacion = "desconocida";
            }
            
            messageDiv.textContent = "Guardando puntuación...";
            
            try {
                // Usar el cliente API para guardar la puntuación
                if (window.apiClient && window.apiClient.ranking) {
                    // Usar el nivel proporcionado
                    const currentLevel = nivel ? `${nivel}` : "1";
                    
                    console.log(`🎯 Guardando ranking con nivel: ${currentLevel}`);
                    
                    // Guardar la puntuación
                    const savePromise = window.apiClient.ranking.save(playerName, puntajeTotal, deviceType, ubicacion, currentLevel);
                    
                    // Aplicar un timeout para evitar bloqueos
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Timeout al guardar")), 8000)
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
                    mostrarRankingList(panel, puntajeTotal, playerName);
                } else {
                    throw new Error("API Client no disponible");
                }
            } catch (saveError) {
                console.error("❌ Error al guardar puntuación:", saveError);
                
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
        
        // Handler para cancelar
        const handleCancel = function(e) {
            e.preventDefault();
            console.log('📝 Cancelando formulario de ranking');
            cerrarModalActivo();
        };
        
        // Configurar eventos
        saveButton.addEventListener('click', handleSave);
        cancelButton.addEventListener('click', handleCancel);
        
        // Enter en input
        nameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSave(e);
            }
        });
    }
}

// Mostrar ranking completo (P5-B2)
async function mostrarRankingList(panel, playerScore, playerName) {
    console.log('📊 Mostrando ranking completo');
    
    const isMobile = modalSystem.isMobile;
    const tableCellPadding = isMobile ? '8px 4px' : '6px 8px';
    const tableHeaderSize = isMobile ? '14px' : '16px';
    
    // Variable para controlar si el panel fue cerrado
    let panelClosed = false;
    
    // Crear HTML inicial con loading
    panel.innerHTML = `
        <h2 style="color: rgba(0, 255, 255, 1); margin: 0 0 20px 0; font-size: 24px;">🏆 Ranking Global</h2>
        
        <div style="margin: 15px 0; font-size: 18px; color: rgba(0, 255, 255, 1);">
            Tu puntuación: <strong>${playerScore} puntos</strong>
        </div>
        
        <div id="ranking-status" style="font-size: 12px; margin: 10px 0; color: rgba(255, 255, 0, 0.8); display: none;"></div>
        
        <div id="ranking-loading" style="text-align: center; margin: 20px 0; color: rgba(255, 255, 255, 0.8);">
            🔄 Cargando ranking...
        </div>
        
        <div id="ranking-list" style="display: none; max-height: 300px; overflow-y: auto; margin: 15px 0;"></div>
        
        <div id="retry-server-container" style="display: none; margin: 10px 0;">
            <button id="retry-server-button" style="background-color: rgba(255, 165, 0, 0.8); color: black; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">🔄 Reintentar servidor</button>
        </div>
        
        <div style="margin-top: 20px;">
            <button id="close-ranking-button" style="background-color: rgba(100, 100, 100, 0.8); color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 16px; width: 100%;">CONTINUAR</button>
        </div>
    `;
    
    // Obtener referencias a elementos
    const rankingListDiv = document.getElementById('ranking-list');
    const loadingDiv = document.getElementById('ranking-loading');
    const rankingStatusDiv = document.getElementById('ranking-status');
    const retryServerContainer = document.getElementById('retry-server-container');
    const retryServerButton = document.getElementById('retry-server-button');
    const closeButton = document.getElementById('close-ranking-button');
    
    // Configurar botón de cerrar
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            panelClosed = true;
            cerrarModalActivo();
        });
    }
    
    // Configurar botón de reintentar servidor
    if (retryServerButton) {
        retryServerButton.addEventListener('click', async function() {
            // Recargar datos del servidor
            retryServerButton.disabled = true;
            retryServerButton.textContent = "Cargando...";
            
            // Mostrar loading nuevamente
            if (loadingDiv) loadingDiv.style.display = 'block';
            if (rankingListDiv) rankingListDiv.style.display = 'none';
            
            // Recargar datos
            await cargarRankingData();
            
            retryServerButton.disabled = false;
            retryServerButton.textContent = "🔄 Reintentar servidor";
        });
    }
    
    // Función para cargar datos del ranking
    const cargarRankingData = async function() {
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
                    actualizarTablaRanking(rankingData, playerScore, playerName, tableCellPadding, tableHeaderSize, isMobile);
                } else {
                    rankingListDiv.innerHTML = '<p style="text-align: center;">No hay puntuaciones registradas todavía.</p>';
                }
                
            } catch (generalError) {
                console.error("Error general al cargar ranking:", generalError);
                
                // Si el panel fue cerrado, no mostrar error
                if (panelClosed) return;
                
                if (loadingDiv) {
                    loadingDiv.innerHTML = '<p style="color: rgba(255, 100, 100, 0.9);">❌ Error al cargar el ranking</p>';
                }
            }
        }
    };
    
    // Cargar el ranking
    await cargarRankingData();
}

// Función auxiliar para actualizar la tabla de ranking
function actualizarTablaRanking(rankingData, playerScore, playerName, tableCellPadding, tableHeaderSize, isMobile) {
    const rankingListDiv = document.getElementById('ranking-list');
    if (!rankingListDiv) return;
    
    // Construir tabla de ranking
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <tr style="border-bottom: 1px solid rgba(0, 255, 255, 0.5);">
                <th style="padding: ${tableCellPadding}; text-align: center; font-size: ${tableHeaderSize};">#</th>
                <th style="padding: ${tableCellPadding}; font-size: ${tableHeaderSize};">Jugador</th>
                <th style="padding: ${tableCellPadding}; text-align: right; font-size: ${tableHeaderSize};">Puntos</th>
                <th style="padding: ${tableCellPadding}; text-align: center; font-size: ${tableHeaderSize};">Dispositivo</th>
                <th style="padding: ${tableCellPadding}; font-size: ${tableHeaderSize};">Ubicación</th>
                <th style="padding: ${tableCellPadding}; text-align: center; font-size: ${tableHeaderSize};">Nivel</th>
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
        
        // Formatear ubicación (mostrar "desconocida" si no está disponible)
        const location = entry.ubicacion || "desconocida";
        
        // Formatear nivel (mostrar "1" si no está disponible)
        const nivel = entry.nivel || "1";
        
        // Formatear fecha/hora (mostrar "--" si no está disponible)
        const fechaHora = entry.fechaHora || "--";
        
        // Añadir indicador visual para entradas locales
        const localIndicator = entry.local ? ' 📱' : '';
        
        tableHTML += `
            <tr style="${rowStyle}">
                <td style="padding: ${tableCellPadding}; text-align: center;">${index + 1}</td>
                <td style="padding: ${tableCellPadding}; font-size: ${isMobile ? '12px' : '14px'};">${entry.nombre}${localIndicator}</td>
                <td style="padding: ${tableCellPadding}; text-align: right; font-weight: bold;">${entry.puntaje}</td>
                <td style="padding: ${tableCellPadding}; text-align: center;">${deviceIcon}</td>
                <td style="padding: ${tableCellPadding}; font-size: ${isMobile ? '10px' : '12px'};">${location}</td>
                <td style="padding: ${tableCellPadding}; text-align: center; font-weight: bold;">${nivel}</td>
                <td style="padding: ${tableCellPadding}; text-align: center; font-size: ${isMobile ? '10px' : '12px'};">${fechaHora}</td>
            </tr>
        `;
    });
    
    tableHTML += '</table>';
    rankingListDiv.innerHTML = tableHTML;
}

// === FUNCIONES DE UTILIDAD ===
function cerrarModal() {
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

function cerrarModalActivo() {
    cerrarModal();
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
window.mostrarFormularioRanking = mostrarFormularioRanking;
window.mostrarRankingList = mostrarRankingList;
window.cerrarModal = cerrarModal;
window.cerrarModalActivo = cerrarModalActivo;
window.initModales = initModales;

export {
    modalSystem,
    mostrarPantallaInstrucciones,
    mostrarTransicionNivel,
    mostrarAnimacionPuntos,
    mostrarFormularioRanking,
    mostrarRankingList,
    cerrarModal,
    cerrarModalActivo,
    initModales
}; 