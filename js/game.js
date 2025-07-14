// Constante de versión del juego
const GAME_VERSION = "2.1.004";
window.GAME_VERSION = GAME_VERSION;

// Control de niveles máximos implementados
const MAX_NIVELES_IMPLEMENTADOS = 3; // Actualizar a medida que se programen más niveles

// Game.js - Controlador principal del juego Rejas Espaciales V2

import { GAME_CONFIG, GameLevel, CanvasDimensions } from './config.js';
import { relojJuego } from './relojJuego.js';
import { renderFondo, initFondo } from './fondo.js';
import { 
    initGrid, 
    renderGrid, 
    getCoordenadasCubiertas, 
    getCoordenadasDescubiertas, 
    updateGridLogic,
    getTransformMatrix,
    getGridObj
} from './grid.js';
import { 
    initPelota, 
    updatePelotaLogic, 
    renderPelota, 
    getPelotaPosition, 
    getPelotaState 
} from './pelota.js';
import { 
    initDisparos, 
    updateDisparosLogic, 
    renderDisparos, 
    realizarDisparo, 
    getDisparosState,
    toggleMuteAudio,
    isAudioMuted,
    handleKeyboardShootDown,
    handleKeyboardShootUp,
    handleTouchShoot
} from './disparos.js';
import { 
    initModales, 
    mostrarPantallaInstrucciones, 
    mostrarTransicionNivel, 
    mostrarAnimacionPuntos,
    modalSystem 
} from './modales.js';

// === CONTROLADOR PRINCIPAL DEL JUEGO ===
class RejasEspacialesGame {
    constructor() {
        // this.canvasManager = new CanvasManager(); // DESACTIVADO - Nuevo sistema de canvas
        this.ctx = null;
        this.gameState = GAME_CONFIG.GAME_STATES.MENU;
        this.currentLevel = 1;
        
        // ⚠️ IMPORTANTE: Sincronizar nivel inicial con GameLevel global
        GameLevel.setLevel(1);
        
        // Sistema de tiempo para lógica e interpolación
        this.logicTimer = 0;
        this.lastLogicUpdate = 0;
        this.logicInterval = 1000 / GAME_CONFIG.LOGIC_FPS; // 33.33ms para 30 FPS
        
        // Variables de puntuación
        this.levelScore = 0;
        this.totalScore = 0;
        this.scoreAlreadyAdded = false; // 🔄 Bandera para evitar suma duplicada
        
        // Referencias a elementos del DOM
        this.elements = {};
        
        // Estado del juego iniciado
        this.gameStarted = false;
        
        // Modo debug para P5
        this.debugMode = false;
        
        console.log(`Inicializando Rejas Espaciales V${GAME_VERSION}`);
    }
    
    // Inicialización del juego
    async initialize() {
        try {
            console.log('Inicializando canvas...');
            // this.ctx = this.canvasManager.initialize(); // DESACTIVADO - Nuevo sistema de canvas
            // El canvas se inicializa en resizeGame(), aquí solo obtenemos el contexto
            const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
            if (!canvas) {
                throw new Error('Canvas no encontrado');
            }
            this.ctx = canvas.getContext('2d');
            
            console.log('Configurando elementos del DOM...');
            this.setupDOMElements();
            
            console.log('Configurando controles...');
            this.setupControls();
            
            // === INICIALIZAR CANVASDIMENSIONS ANTES DE CUALQUIER SISTEMA ===
            console.log('Inicializando CanvasDimensions...');
            
            // Verificar que el canvas esté disponible antes de medir
            if (!canvas) {
                throw new Error('❌ CRÍTICO: Canvas no está disponible para inicializar CanvasDimensions');
            }
            
            // Forzar recálculo del layout antes de medir
            canvas.offsetHeight; // Trigger reflow
            
            const dimensions = await CanvasDimensions.getCanvasDimensions();
            if (!dimensions || !dimensions.uml || dimensions.uml <= 0) {
                throw new Error(`❌ CRÍTICO: CanvasDimensions no se pudo inicializar correctamente. Valor: ${dimensions?.uml || 'undefined'}`);
            }
            
            console.log('✅ CanvasDimensions inicializado correctamente');
            console.log(`   uml: ${dimensions.uml} (${dimensions.LogicW}x${dimensions.LogicH})`);
            
            // Configurar canvas con las dimensiones obtenidas
            console.log('Configurando canvas con dimensiones iniciales...');
            canvas.width = Math.round(dimensions.LogicW * dimensions.dpr);
            canvas.height = Math.round(dimensions.LogicH * dimensions.dpr);
            this.ctx.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0);
            
            // Actualizar GAME_CONFIG con las dimensiones
            GAME_CONFIG.setLogicalDimensions(dimensions.LogicW, dimensions.LogicH);
            console.log(`✅ Canvas configurado: ${canvas.width}x${canvas.height}px buffer interno`);
            console.log(`   Dimensiones lógicas: ${GAME_CONFIG.LOGICAL_WIDTH}x${GAME_CONFIG.LOGICAL_HEIGHT}px`);
            
            console.log('Inicializando sistema de audio...');
            // Inicializar sistema de disparos y audio para cargar configuración
            initDisparos(1); // Temporal, se reinicializará con el nivel correcto
            
            console.log('Inicializando sistema de modales P5...');
            initModales();
            
            // Inicializar sistemas para mostrar en pantalla de instrucciones
            console.log('Inicializando sistemas para pantalla de instrucciones...');
            initFondo(1); // Inicializar fondo nivel 1
            initGrid(1); // Inicializar grid nivel 1 para que se vea por detrás del modal
            
            console.log('Iniciando bucle principal...');
            this.startGameLoop();
            
            // Mostrar mensaje inicial
            this.updateUI();
            this.updateAudioButtonState(); // Inicializar estado del botón de audio
            this.updateFullscreenButtonState(); // Inicializar estado del botón de pantalla completa
            
            // Ocultar puntaje total al inicio (solo se muestra desde nivel 2)
            const totalContainer = document.getElementById('puntaje-total');
            if (totalContainer) totalContainer.style.display = 'none';
            
            // Mostrar pantalla de instrucciones inicial (P5-A)
            setTimeout(() => {
                mostrarPantallaInstrucciones();
            }, 500); // Pequeño delay para que cargue todo
            
            console.log('¡Juego inicializado correctamente!');
            
        } catch (error) {
            console.error('Error al inicializar el juego:', error);
        }
    }
    
    // Configurar referencias a elementos del DOM
    setupDOMElements() {
        this.elements = {
            levelScore: document.getElementById('puntaje-nivel-valor'),
            totalScore: document.getElementById('puntaje-total-valor'),
            timer: document.getElementById('cronometro'),
            comment: document.getElementById('comentario-juego'),
            audioBtn: document.getElementById('btn-audio'),
            shootBtn: document.getElementById('btn-disparo'),
            fullscreenBtn: document.getElementById('btn-fullscreen')
        };
        
        // Verificar que todos los elementos existen
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                console.warn(`Elemento DOM no encontrado: ${key}`);
            }
        }
    }
    
    // Configurar controles del juego
    setupControls() {
        // Controles de teclado equilibrados
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Botón de audio
        if (this.elements.audioBtn) {
            this.elements.audioBtn.addEventListener('click', () => this.toggleAudio());
        }
        
        // Botón de pantalla completa
        if (this.elements.fullscreenBtn) {
            this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        
        // Botón de disparo (equilibrado con teclado)
        if (this.elements.shootBtn) {
            this.elements.shootBtn.addEventListener('click', () => this.shootTouch());
        }
        
        // Prevenir menú contextual en el canvas
        // this.canvasManager.canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // DESACTIVADO
        const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
        if (canvas) {
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        // Event listeners para cambios de pantalla completa (F11, ESC, etc.)
        this.setupFullscreenListeners();
    }
    
    // Manejar teclas presionadas (con control equilibrado)
    handleKeyDown(event) {
        switch (event.code) {
            case 'Space':
            case 'KeyZ':
                event.preventDefault();
                if (!this.gameStarted) {
                    this.startGame();
                } else {
                    // Usar sistema equilibrado que evita repetición automática
                    const disparoExitoso = handleKeyboardShootDown(event.code);
                    this.mostrarEfectoDisparo(disparoExitoso);
                }
                break;
            case 'KeyM':
                this.toggleAudio();
                break;
            case 'KeyP':
                this.togglePause();
                break;
            case 'F11':
                event.preventDefault();
                this.toggleFullscreen();
                break;
            case 'Escape':
                // Solo manejar Escape para salir de pantalla completa si estamos en pantalla completa
                // No preventDefault para no interferir con otros usos de Escape
                if (this.isFullscreen()) {
                    this.exitFullscreen();
                }
                break;
            default:
                break;
        }
    }
    
    // Manejar teclas liberadas (para resetear estado anti-repetición)
    handleKeyUp(event) {
        switch (event.code) {
            case 'Space':
            case 'KeyZ':
                handleKeyboardShootUp(event.code);
                break;
            default:
                break;
        }
    }
    
    // Iniciar el juego
    startGame() {
        console.log('🎮 Iniciando juego...');
        
        // Usar función centralizada de inicialización
        this.initializeLevel(this.currentLevel, { resetTotalScore: false });
        
        // Actualizar estado visual del botón de audio
        this.updateAudioButtonState();
        
        console.log('¡Juego iniciado!');
    }
    
    // Disparar con touch/click (equilibrado)
    shootTouch() {
        if (!this.gameStarted) {
            this.startGame();
            return;
        }
        
        // Usar sistema equilibrado para touch
        const disparoExitoso = handleTouchShoot();
        this.mostrarEfectoDisparo(disparoExitoso);
    }
    
    // Método auxiliar para mostrar efectos visuales de disparo
    mostrarEfectoDisparo(disparoExitoso) {
        if (disparoExitoso) {
            console.log('🎯 Disparo realizado con éxito');
        } else {
            console.log('⏱️ Disparo en cooldown');
        }
        
        // Efecto visual temporal en el botón
        if (this.elements.shootBtn) {
            this.elements.shootBtn.classList.add('active');
            setTimeout(() => {
                this.elements.shootBtn.classList.remove('active');
            }, 300);
        }
    }
    
    // Mantener método original para compatibilidad (usa sistema equilibrado)
    shoot() {
        this.shootTouch();
    }
    
    // Alternar audio
    toggleAudio() {
        const isMuted = toggleMuteAudio();
        
        // Actualizar el botón visual
        if (this.elements.audioBtn) {
            if (isMuted) {
                this.elements.audioBtn.classList.add('muted');
                this.elements.audioBtn.querySelector('.audio-icon').textContent = '🔇';
            } else {
                this.elements.audioBtn.classList.remove('muted');
                this.elements.audioBtn.querySelector('.audio-icon').textContent = '🔊';
            }
        }
        
        console.log(`🔊 Audio ${isMuted ? 'silenciado' : 'activado'}`);
    }
    
    // Actualizar estado visual del botón de audio
    updateAudioButtonState() {
        if (this.elements.audioBtn) {
            const isMuted = isAudioMuted();
            if (isMuted) {
                this.elements.audioBtn.classList.add('muted');
                this.elements.audioBtn.querySelector('.audio-icon').textContent = '🔇';
            } else {
                this.elements.audioBtn.classList.remove('muted');
                this.elements.audioBtn.querySelector('.audio-icon').textContent = '🔊';
            }
        }
    }

    // Alternar pantalla completa
    toggleFullscreen() {
        try {
            // Detectar iOS donde pantalla completa tiene limitaciones
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            if (isIOS) {
                console.warn('🖥️ iOS detectado - Pantalla completa limitada. Use los controles del navegador para mejor experiencia.');
                // En iOS, intentar de todas formas pero puede no funcionar
            }

            if (!this.isFullscreenSupported()) {
                console.warn('🖥️ Pantalla completa no soportada en este navegador/dispositivo');
                
                // Mostrar mensaje al usuario sobre alternativas
                this.showFullscreenFallbackMessage();
                return;
            }

            if (this.isFullscreen()) {
                console.log('🖥️ Saliendo de pantalla completa...');
                this.exitFullscreen();
            } else {
                console.log('🖥️ Entrando a pantalla completa...');
                this.requestFullscreen();
            }
        } catch (error) {
            console.error('🖥️ Error al alternar pantalla completa:', error);
            this.showFullscreenFallbackMessage();
        }
    }

    // Mostrar mensaje cuando pantalla completa no está disponible
    showFullscreenFallbackMessage() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        let message = '';
        if (isIOS) {
            message = 'En iOS: Toque el ícono de compartir (📤) → "Añadir a pantalla de inicio" para experiencia completa';
        } else if (isMobile) {
            message = 'En móviles: Use el menú del navegador para acceder a pantalla completa';
        } else {
            message = 'Pantalla completa no disponible. Intente presionar F11 o use el menú del navegador';
        }
        
        console.log(`💡 ${message}`);
        
        // Opcional: Mostrar mensaje temporal en la interfaz
        this.showTemporaryMessage(message);
    }

    // Mostrar mensaje temporal en la interfaz (opcional)
    showTemporaryMessage(message) {
        // Solo mostrar en consola por ahora para no interrumpir el juego
        // En el futuro se podría mostrar un pequeño toast o notification
        console.log(`📱 Consejo: ${message}`);
    }

    // Verificar si pantalla completa está soportada
    isFullscreenSupported() {
        return !!(
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled
        );
    }

    // Verificar si está en pantalla completa
    isFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }

    // Solicitar pantalla completa
    requestFullscreen() {
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }

    // Salir de pantalla completa
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }

    // Actualizar estado visual del botón de pantalla completa
    updateFullscreenButtonState() {
        if (this.elements.fullscreenBtn) {
            const isFs = this.isFullscreen();
            const iconElement = this.elements.fullscreenBtn.querySelector('.fullscreen-icon');
            
            if (isFs) {
                this.elements.fullscreenBtn.classList.add('fullscreen-active');
                if (iconElement) iconElement.textContent = '⧉'; // Icono para salir de pantalla completa (ventana más pequeña)
            } else {
                this.elements.fullscreenBtn.classList.remove('fullscreen-active');
                if (iconElement) iconElement.textContent = '⛶'; // Icono para entrar a pantalla completa (expansión)
            }
        }
    }

    // Configurar listeners para eventos automáticos de pantalla completa
    setupFullscreenListeners() {
        // Event listeners para todos los navegadores
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange', 
            'mozfullscreenchange',
            'msfullscreenchange'
        ];

        fullscreenEvents.forEach(eventName => {
            document.addEventListener(eventName, () => {
                this.onFullscreenChange();
            });
        });

        console.log('🖥️ Event listeners de pantalla completa configurados');
    }

    // Manejar cambios automáticos de pantalla completa (F11, ESC, etc.)
    onFullscreenChange() {
        const isFs = this.isFullscreen();
        
        // Actualizar estado visual del botón
        this.updateFullscreenButtonState();
        
        // Log para debugging
        console.log(`🖥️ Pantalla completa ${isFs ? 'activada' : 'desactivada'}`);
        
        // Optimizaciones específicas para móviles en pantalla completa
        this.handleMobileFullscreenOptimizations(isFs);
        
        // Forzar resize del canvas cuando cambia pantalla completa
        setTimeout(() => {
            // Dispatch resize event para que el canvas se reajuste
            window.dispatchEvent(new Event('resize'));
        }, 150); // Slightly longer timeout for mobile browsers
    }

    // Optimizaciones específicas para móviles en pantalla completa
    handleMobileFullscreenOptimizations(isFullscreen) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isMobile) return;
        
        if (isFullscreen) {
            // Ocultar la barra de direcciones en móviles si es posible
            setTimeout(() => {
                window.scrollTo(0, 1);
            }, 100);
            
            console.log('📱 Optimizaciones móvil aplicadas para pantalla completa');
        } else {
            console.log('📱 Saliendo de optimizaciones móvil');
        }
    }
    
    // Alternar pausa
    togglePause() {
        if (this.gameState === GAME_CONFIG.GAME_STATES.PLAYING) {
            this.gameState = GAME_CONFIG.GAME_STATES.PAUSED;
            relojJuego.pausar();
        } else if (this.gameState === GAME_CONFIG.GAME_STATES.PAUSED) {
            this.gameState = GAME_CONFIG.GAME_STATES.PLAYING;
            relojJuego.reanudar();
        }
        console.log('Juego pausado/reanudado:', this.gameState);
    }
    
    // Actualizar interfaz de usuario
    updateUI() {
        // Obtener puntaje de disparos si el sistema está activo
        const disparosState = getDisparosState();
        
        // Puntaje del nivel actual
        const currentLevelScore = disparosState.puntaje || 0;
        
        if (this.elements.levelScore) {
            this.elements.levelScore.textContent = currentLevelScore;
        }
        if (this.elements.totalScore) {
            // Mostrar puntaje total solo desde el nivel 2
            if (this.currentLevel === 1) {
                // Ocultar todo el contenedor del puntaje total en nivel 1
                const totalContainer = document.getElementById('puntaje-total');
                if (totalContainer) totalContainer.style.display = 'none';
            } else {
                // Mostrar el contenedor del puntaje total desde nivel 2
                const totalContainer = document.getElementById('puntaje-total');
                if (totalContainer) totalContainer.style.display = 'block';
                
                // Total = puntaje acumulado de niveles anteriores + puntaje del nivel actual
                this.elements.totalScore.textContent = this.totalScore + currentLevelScore;
            }
        }
        if (this.elements.comment) {
            this.elements.comment.textContent = `Nivel ${this.currentLevel} - ${this.getGameStateText()}`;
        }
        if (this.elements.timer) {
            this.elements.timer.textContent = relojJuego.getTiempoFormateado();
            
            // Cambiar color cuando quedan menos de 10 segundos
            const tiempoRestante = relojJuego.getTiempoRestante();
            if (tiempoRestante <= 10000) {
                this.elements.timer.classList.add('warning');
                
                // Parpadeo en los últimos 5 segundos
                if (tiempoRestante <= 5000) {
                    const blinkState = Math.floor(Date.now() / 500) % 2 === 0;
                    this.elements.timer.style.opacity = blinkState ? '1' : '0.5';
                }
            } else {
                this.elements.timer.classList.remove('warning');
                this.elements.timer.style.opacity = '1';
            }
        }
    }
    
    // Obtener texto del estado del juego
    getGameStateText() {
        switch (this.gameState) {
            case GAME_CONFIG.GAME_STATES.MENU:
                return 'Preparado';
            case GAME_CONFIG.GAME_STATES.PLAYING:
                return 'Jugando';
            case GAME_CONFIG.GAME_STATES.PAUSED:
                return 'Pausado';
            case GAME_CONFIG.GAME_STATES.GAME_OVER:
                return 'Fin del juego';
            default:
                return 'Desconocido';
        }
    }
    

    
    // Bucle principal del juego
    startGameLoop() {
        const gameLoop = (currentTime) => {
            // Actualizar lógica a 30 FPS
            if (currentTime - this.lastLogicUpdate >= this.logicInterval) {
                this.updateGameLogic(currentTime);
                this.lastLogicUpdate = currentTime;
            }
            
            // Renderizar a 60 FPS (o la velocidad que permita el navegador)
            this.render(currentTime);
            
            // Continuar el bucle
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
    
    // Actualizar lógica del juego (30 FPS)
    updateGameLogic(currentTime) {
        const deltaTime = currentTime - this.lastLogicUpdate;
        
        // Actualizar lógica del grid SIEMPRE (para que se vea en pantalla de instrucciones)
        updateGridLogic(deltaTime, this.gameState === GAME_CONFIG.GAME_STATES.MENU ? 1 : this.currentLevel);
        
        if (this.gameState === GAME_CONFIG.GAME_STATES.PLAYING) {
            // Actualizar cronómetro
            relojJuego.actualizar(currentTime);
            
            // Actualizar lógica de la pelota
            updatePelotaLogic(deltaTime, this.currentLevel);
            
            // Actualizar lógica de disparos (P4)
            updateDisparosLogic(deltaTime, this.currentLevel);
            
            // Verificar fin de tiempo
            if (relojJuego.estaTerminado()) {
                console.log('¡Tiempo agotado!');
                
                // Obtener puntaje final del nivel
                const disparosState = getDisparosState();
                this.levelScore = disparosState.puntaje || 0;
                
                // 🧪 TESTING: Temporalmente DESACTIVANDO la suma para verificar si aquí está la duplicación
                // La suma debería hacerse SOLO cuando se avanza al próximo nivel, no aquí
                console.log(`🧪 [TESTING] Fin de nivel - NO sumando aquí (testing duplicación)`);
                console.log(`📊 Puntaje nivel: ${this.levelScore}, Total actual: ${this.totalScore}`);
                
                // SIEMPRE mostrar transición entre niveles primero
                // El sistema determinará si es fin de juego en el modal
                this.mostrarTransicionEntreNiveles();
            }
            
            // Actualizar UI
            this.updateUI();
        }
    }
    
    // Renderizar frame (60 FPS con interpolación)
    render(currentTime) {
        // Limpiar canvas principal
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
        
        // === RENDERIZADO GENERAL SIEMPRE ===
        // Se ejecuta tanto en menú como durante el juego para que se vea funcionando bajo los modales
        
        // Determinar nivel a renderizar: nivel actual o nivel 1 si está en menú
        const nivelARenderizar = this.gameState === GAME_CONFIG.GAME_STATES.MENU ? 1 : this.currentLevel;
        
        // === ORDEN CORRECTO DE CAPAS (abajo hacia arriba) ===
        
        // 1. FONDO (estrellado)
        renderFondo(this.ctx, nivelARenderizar);
        
        // 2. PELOTA (debajo de la reja)
        if (this.gameStarted || this.gameState === GAME_CONFIG.GAME_STATES.MENU) {
            const timeSinceLastLogic = currentTime - this.lastLogicUpdate;
            const alpha = Math.min(timeSinceLastLogic / this.logicInterval, 1);
            renderPelota(this.ctx, nivelARenderizar, alpha);
        }
        
        // 3. GRID (encima de la pelota)
        renderGrid(this.ctx, nivelARenderizar);
        
        // 4. EFECTOS, DISPAROS, ETC. (solo durante el juego)
        if (this.gameStarted && this.gameState === GAME_CONFIG.GAME_STATES.PLAYING) {
            const timeSinceLastLogic = currentTime - this.lastLogicUpdate;
            const alpha = Math.min(timeSinceLastLogic / this.logicInterval, 1);
            renderDisparos(this.ctx, nivelARenderizar, alpha);
        }
        
        // 5. BORRADOR / DEBUG (siempre al final)
        this.debugRenderCoords();
    }
    
    // Debug: renderizar destino actual (solo en desarrollo)
    debugRenderCoords() {
        // Solo renderizar debug en desarrollo (live server)
        if (!this.isDevEnvironment()) return;
        
        // Debug pelota: mostrar destino actual con coordenadas transformadas
        const pelotaState = getPelotaState();
        if (pelotaState.destinoActual) {
            let destinoTransformado = pelotaState.destinoActual;
            
            // === SISTEMA ADAPTADO PARA NIVELES 1-2 VS NIVEL 3 ===
            if (pelotaState.destinoActual.coordenadasBase) {
                const base = pelotaState.destinoActual.coordenadasBase;
                
                if (this.currentLevel === 3 && pelotaState.destinoActual.reja) {
                    // === NIVEL 3: USAR MATRIZ ESPECÍFICA DE LA REJA ===
                    const reja = getGridObj(pelotaState.destinoActual.reja);
                    
                    if (reja && reja.transformMatrix) {
                        const coordenadasTransformadas = reja.applyTransformMatrix(base.x, base.y);
                        destinoTransformado = {
                            ...pelotaState.destinoActual,
                            x: coordenadasTransformadas.x,
                            y: coordenadasTransformadas.y
                        };
                    }
                    
                } else {
                    // === NIVELES 1-2: USAR MATRIZ GLOBAL TRADICIONAL ===
                    const transformMatrix = getTransformMatrix(); // Sin parámetro = matriz global
                    
                    if (transformMatrix) {
                        const transformedX = transformMatrix.a * base.x + transformMatrix.c * base.y + transformMatrix.e;
                        const transformedY = transformMatrix.b * base.x + transformMatrix.d * base.y + transformMatrix.f;
                        
                        destinoTransformado = {
                            ...pelotaState.destinoActual,
                            x: transformedX,
                            y: transformedY
                        };
                    }
                }
            }
            
            // === RENDERIZADO CON COLORES ESPECÍFICOS POR NIVEL ===
            let color, etiqueta;
            const esDescubierto = pelotaState.destinoActual.tipo === 'descubierto';
            
            if (this.currentLevel === 3) {
                // Nivel 3: Color según reja + tipo
                const esReja1 = pelotaState.destinoActual.reja === 'reja1';
                if (esDescubierto) {
                    color = esReja1 ? 'rgba(255, 100, 100, 0.9)' : 'rgba(255, 0, 0, 0.9)'; // Rojo claro/oscuro
                    etiqueta = esReja1 ? 'DESC R1' : 'DESC R2';
                } else {
                    color = esReja1 ? 'rgba(255, 255, 100, 0.9)' : 'rgba(255, 200, 0, 0.9)'; // Amarillo claro/oscuro
                    etiqueta = esReja1 ? 'CUB R1' : 'CUB R2';
                }
            } else {
                // Niveles 1-2: Color tradicional
                color = esDescubierto ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 255, 0, 0.8)';
                etiqueta = esDescubierto ? 'DESC' : 'CUB';
            }
            

            // Dibujar círculo principal
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(destinoTransformado.x, destinoTransformado.y, 8, 0, Math.PI * 2);
            this.ctx.fill();


            if (1==0) {
            // Dibujar círculo principal
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(destinoTransformado.x, destinoTransformado.y, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Dibujar borde negro para mayor visibilidad
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Etiqueta informativa
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            this.ctx.font = 'bold 11px Arial';
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(etiqueta, destinoTransformado.x + 12, destinoTransformado.y - 8);
            this.ctx.fillText(etiqueta, destinoTransformado.x + 12, destinoTransformado.y - 8);
            }
        }
    }
    
    // Detectar si estamos en entorno de desarrollo
    isDevEnvironment() {
        // Detectar live server o localhost
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || hostname.includes('local');
    }
    
    // === FUNCIONES PARA P5 - SISTEMA DE MODALES ===
    
    // Función para establecer modo debug (llamada desde modales.js)
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🐛 Modo debug ${enabled ? 'activado' : 'desactivado'} en game.js`);
    }
    
    // Función para finalizar nivel manualmente (debug)
    finalizarNivelDebug() {
        if (!this.debugMode) {
            console.warn('🐛 Finalizar nivel debug solo disponible en modo debug');
            return;
        }
        
        console.log('🐛 Finalizando nivel manualmente para testing');
        
        // Simular fin de nivel con puntaje actual
        const disparosState = getDisparosState();
        this.levelScore = disparosState.puntaje || 0;
        
        // 🧪 NO sumar aquí - la suma se hará en avanzarNivel() cuando se presione el botón
        console.log(`🐛 [DEBUG] Fin manual - NO sumando aquí, se sumará al avanzar nivel`);
        console.log(`📊 Puntaje nivel: ${this.levelScore}, Total actual: ${this.totalScore}`);
        
        // Mostrar transición de nivel
        this.mostrarTransicionEntreNiveles();
    }
    
    // Función para avanzar al siguiente nivel
    avanzarNivel() {
        console.log(`➡️ Avanzando del nivel ${this.currentLevel} al ${this.currentLevel + 1}`);
        
        // 🔄 IMPORTANTE: Sumar el puntaje del nivel completado ANTES de avanzar
        if (!this.scoreAlreadyAdded && this.levelScore > 0) {
            this.totalScore += this.levelScore;
            this.scoreAlreadyAdded = true;
            console.log(`📊 Puntaje sumado al avanzar - Nivel: ${this.levelScore}, Total: ${this.totalScore}`);
        }
        
        const nextLevel = this.currentLevel + 1;
        
        // Usar función centralizada de inicialización
        this.initializeLevel(nextLevel, { resetTotalScore: false });
        
        console.log(`✅ Nivel ${nextLevel} iniciado`);
    }
    
    // Función para reiniciar el juego completo
    reiniciarJuego() {
        console.log('🔄 Reiniciando juego completo');
        
        // Usar función centralizada de inicialización
        this.initializeLevel(1, { resetTotalScore: true, isGameRestart: true });
        
        console.log('✅ Juego reiniciado');
    }
    
    // Función para mostrar transición entre niveles
    mostrarTransicionEntreNiveles() {
        console.log('🎯 Preparando transición entre niveles');
        
        // Pausar el juego
        this.gameState = GAME_CONFIG.GAME_STATES.PAUSED;
        
        // Preparar datos para el modal
        // El modal espera el puntaje total INCLUYENDO el nivel actual
        const resultadoNivel = {
            nivel: this.currentLevel,
            puntajeNivel: this.levelScore,
            puntajeTotal: this.totalScore + this.levelScore, // Total con nivel actual incluido
            esUltimoNivel: this.currentLevel >= MAX_NIVELES_IMPLEMENTADOS
        };
        
        // Mostrar transición usando el sistema de modales P5
        mostrarTransicionNivel(resultadoNivel);
    }
    
    // Función para mostrar fin de juego
    mostrarFinDeJuego() {
        console.log('🏁 Preparando pantalla de fin de juego');
        
        // Cambiar estado
        this.gameState = GAME_CONFIG.GAME_STATES.GAME_OVER;
        
        // Mostrar animación de puntos final
        mostrarAnimacionPuntos(
            this.levelScore,
            this.totalScore + this.levelScore, // Total con nivel actual incluido
            true, // Es fin de juego
            () => {
                // Callback: mostrar modal de fin de juego después de la animación
                this.mostrarModalFinDeJuego();
            }
        );
    }
    
    // Modal específico para fin de juego
    mostrarModalFinDeJuego() {
        // Por ahora usar la misma lógica que transición entre niveles
        // pero marcando que es el último nivel
        const resultadoNivel = {
            nivel: this.currentLevel,
            puntajeNivel: this.levelScore,
            puntajeTotal: this.totalScore + this.levelScore, // Total con nivel actual incluido
            esUltimoNivel: true
        };
        
        mostrarTransicionNivel(resultadoNivel);
    }

    // === FUNCIÓN CENTRALIZADA DE INICIALIZACIÓN DE NIVELES ===
    // Esta función maneja TODA la inicialización/reinicialización de niveles
    initializeLevel(level, options = {}) {
        console.log(`🚀 INICIALIZANDO NIVEL ${level} - Función centralizada`);
        
        const {
            resetTotalScore = false,  // ¿Resetear puntaje total? (solo para reinicio completo)
            isGameRestart = false     // ¿Es reinicio de juego desde el principio?
        } = options;
        
        // === 1. CONFIGURAR ESTADO DEL JUEGO ===
        this.currentLevel = level;
        this.gameStarted = true;
        this.gameState = GAME_CONFIG.GAME_STATES.PLAYING;
        
        // ⚠️ CRÍTICO: Actualizar también el nivel global para que resizeGame() lo tome correctamente
        GameLevel.setLevel(level);
        console.log(`🎯 Nivel actualizado en GameLevel global: ${level}`);
        
        // === 2. MANEJAR PUNTAJES ===
        this.levelScore = 0; // Siempre resetear puntaje del nivel
        this.scoreAlreadyAdded = false; // 🔄 Resetear bandera para permitir nueva suma
        
        if (resetTotalScore || isGameRestart) {
            this.totalScore = 0; // Resetear total solo si se especifica
            console.log('🔄 Puntaje total reseteado');
        }
        
        // === 3. REINICIALIZAR CRONÓMETRO ===
        relojJuego.reiniciar();
        relojJuego.configurarTiempo(60000); // 60 segundos
        console.log('⏰ Cronómetro reinicializado');
        
        // === 4. REINICIALIZAR SISTEMAS DE JUEGO ===
        try {
            // Sistema de Fondo
            console.log('🌌 Reinicializando sistema Fondo...');
            initFondo(level);
            
            // Sistema de Grid
            console.log('📊 Reinicializando sistema Grid...');
            initGrid(level);
            
            // Sistema de Pelota
            console.log('⚽ Reinicializando sistema Pelota...');
            initPelota(level);
            
            // Sistema de Disparos
            console.log('🎯 Reinicializando sistema Disparos...');
            initDisparos(level);
            
            console.log('✅ Todos los sistemas reinicializados exitosamente');
            
        } catch (systemError) {
            console.error('❌ Error al reinicializar sistemas:', systemError);
            // Intentar inicialización básica de emergencia
            this.emergencyInitialization(level);
        }
        
        // === 5. ACTUALIZAR INTERFAZ ===
        this.updateUI();
        
        // === 6. LOG FINAL ===
        console.log(`✅ NIVEL ${level} INICIALIZADO CORRECTAMENTE`);
        console.log(`   📊 Puntaje nivel: ${this.levelScore}`);
        console.log(`   🏆 Puntaje total: ${this.totalScore}`);
        console.log(`   🎮 Estado: ${this.getGameStateText()}`);
    }
    
    // Inicialización de emergencia si falla la normal
    emergencyInitialization(level) {
        console.warn('⚠️ Iniciando reinicialización de emergencia...');
        
        try {
            // Intentar al menos inicializar el grid básico
            if (typeof initGrid === 'function') {
                initGrid(1); // Fallback al nivel 1
            }
            
            // Resetear estados básicos
            this.levelScore = 0;
            this.gameState = GAME_CONFIG.GAME_STATES.PLAYING;
            
            console.log('🆘 Inicialización de emergencia completada');
        } catch (emergencyError) {
            console.error('💥 Fallo crítico en inicialización de emergencia:', emergencyError);
        }
    }
}

// === INICIALIZACIÓN GLOBAL ===
let game = null;

// Inicializar cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', async () => {
    try {
        game = new RejasEspacialesGame();
        window.gameInstance = game; // Hacer disponible globalmente para modales P5
        await game.initialize();
    } catch (error) {
        console.error('Error fatal al inicializar el juego:', error);
    }
});

// === FUNCIONES DE DEBUG/TESTING ===

// Función para verificar estado de puntajes (para debuggear duplicación)
window.debugPuntajes = function() {
    if (window.gameInstance) {
        const game = window.gameInstance;
        const disparosState = getDisparosState();
        
        console.log('🔍 === ESTADO DE PUNTAJES ===');
        console.log(`🎯 Nivel actual: ${game.currentLevel}`);
        console.log(`📊 Puntaje nivel (game): ${game.levelScore}`);
        console.log(`📊 Puntaje disparos: ${disparosState.puntaje || 0}`);
        console.log(`🏆 Puntaje total: ${game.totalScore}`);
        console.log(`🔄 Score ya sumado: ${game.scoreAlreadyAdded}`);
        console.log(`🎮 Estado juego: ${game.gameState}`);
        console.log('========================');
        
        return {
            nivel: game.currentLevel,
            puntajeNivel: game.levelScore,
            puntajeDisparos: disparosState.puntaje || 0,
            puntajeTotal: game.totalScore,
            scoreYaSumado: game.scoreAlreadyAdded,
            estadoJuego: game.gameState
        };
    }
    console.warn('❌ gameInstance no disponible');
};

// Función para simular el escenario del bug reportado
window.debugSimularEscenarioBug = function() {
    if (!window.gameInstance) {
        console.warn('❌ gameInstance no disponible');
        return;
    }
    
    console.log('🐛 === SIMULANDO ESCENARIO NUEVA LÓGICA ===');
    console.log('Nivel 1: 300 puntos, Nivel 2: 150 puntos');
    console.log('Total esperado en UI: 450 (300 + 150)');
    console.log('Total esperado en totalScore: 300 (solo completados)');
    console.log('===============================================');
    
    const game = window.gameInstance;
    
    // Simular nivel 1 completado
    console.log('🎯 Simulando nivel 1 completado con 300 puntos...');
    game.initializeLevel(1, { resetTotalScore: true });
    game.levelScore = 300;
    
    // Simular avance a nivel 2 (suma los 300)
    setTimeout(() => {
        console.log('🎯 Avanzando a nivel 2 (simulando suma)...');
        game.avanzarNivel(); // Esto debería sumar 300 a totalScore
        
        // Simular puntaje en nivel 2
        setTimeout(() => {
            console.log('🎯 Simulando nivel 2 con 150 puntos actuales...');
            game.levelScore = 150;
            
            console.log('🔍 === RESULTADO FINAL ===');
            console.log(`📊 Puntaje nivel actual: ${game.levelScore}`);
            console.log(`📊 Puntaje base (completados): ${game.totalScore}`);
            console.log(`📊 Total mostrado en UI: ${game.totalScore + game.levelScore}`);
            console.log(`✅ UI esperado: 450 - ${(game.totalScore + game.levelScore) === 450 ? 'CORRECTO' : 'ERROR'}`);
            
            // Mostrar en pantalla
            game.updateUI();
            debugPuntajes();
            
        }, 1000);
    }, 1000);
};

// Función para testing rápido del puntaje
window.debugTestPuntaje = function(puntajeNivel1, puntajeNivel2) {
    if (!window.gameInstance) {
        console.warn('❌ gameInstance no disponible');
        return;
    }
    
    const game = window.gameInstance;
    
    console.log(`🧪 === TEST PUNTAJE DIRECTO ===`);
    console.log(`Simulando: Nivel 1 = ${puntajeNivel1}, Nivel 2 = ${puntajeNivel2}`);
    
    // Reset completo
    game.initializeLevel(1, { resetTotalScore: true });
    
    // Simular nivel 1 completado y avance
    game.levelScore = puntajeNivel1;
    game.avanzarNivel();
    
    // Simular nivel 2 en progreso
    game.levelScore = puntajeNivel2;
    
    console.log(`📊 Resultado:`);
    console.log(`   Puntaje base (completados): ${game.totalScore}`);
    console.log(`   Puntaje nivel actual: ${game.levelScore}`);
    console.log(`   Total mostrado: ${game.totalScore + game.levelScore}`);
    
    game.updateUI();
    return { base: game.totalScore, actual: game.levelScore, total: game.totalScore + game.levelScore };
};

// Función global para testing de niveles
window.debugChangeLevel = function(level) {
    if (!window.gameInstance) {
        console.error('❌ Game instance no encontrada');
        return;
    }
    
    console.log(`🧪 [DEBUG] Cambiando manualmente a nivel ${level}`);
    
    // Verificar que el nivel sea válido
    if (level < 1 || level > MAX_NIVELES_IMPLEMENTADOS) {
        console.error(`❌ Nivel ${level} no válido. Rango: 1-${MAX_NIVELES_IMPLEMENTADOS}`);
        return;
    }
    
    // Cambiar nivel usando la función centralizada
    window.gameInstance.initializeLevel(level, { resetTotalScore: false });
    
    // Verificar sincronización
    const gameInstanceLevel = window.gameInstance.currentLevel;
    const gameLevelGlobal = GameLevel.getCurrentLevel();
    
    console.log(`🔍 [DEBUG] Verificación de sincronización:`);
    console.log(`   gameInstance.currentLevel: ${gameInstanceLevel}`);
    console.log(`   GameLevel.getCurrentLevel(): ${gameLevelGlobal}`);
    console.log(`   ¿Sincronizado?: ${gameInstanceLevel === gameLevelGlobal ? '✅ SÍ' : '❌ NO'}`);
    
    return {
        gameInstanceLevel,
        gameLevelGlobal,
        synchronized: gameInstanceLevel === gameLevelGlobal
    };
};

// Función para testing de resize con nivel específico
window.debugTestResize = function() {
    console.log(`🧪 [DEBUG] Testing resize con nivel actual...`);
    
    const beforeLevel = GameLevel.getCurrentLevel();
    console.log(`   Nivel antes del resize: ${beforeLevel}`);
    
    // Importar y ejecutar resizeGame
    import('./setupCanvas.js').then(({ resizeGame }) => {
        return resizeGame();
    }).then(() => {
        const afterLevel = GameLevel.getCurrentLevel();
        console.log(`   Nivel después del resize: ${afterLevel}`);
        console.log(`   ¿Nivel conservado?: ${beforeLevel === afterLevel ? '✅ SÍ' : '❌ NO'}`);
    }).catch(error => {
        console.error('❌ Error en resize testing:', error);
    });
};

// Función para mostrar estado actual del sistema
window.debugStatus = function() {
    if (!window.gameInstance) {
        console.error('❌ Game instance no encontrada');
        return;
    }
    
    const instance = window.gameInstance;
    const globalLevel = GameLevel.getCurrentLevel();
    
    console.log(`🔍 [DEBUG] Estado actual del sistema:`);
    console.log(`   📊 Game Instance:`);
    console.log(`      currentLevel: ${instance.currentLevel}`);
    console.log(`      gameStarted: ${instance.gameStarted}`);
    console.log(`      gameState: ${instance.gameState}`);
    console.log(`      levelScore: ${instance.levelScore}`);
    console.log(`      totalScore: ${instance.totalScore}`);
    console.log(`   🌐 GameLevel Global:`);
    console.log(`      getCurrentLevel(): ${globalLevel}`);
    console.log(`   📐 CanvasDimensions:`);
    console.log(`      uml: ${CanvasDimensions.uml || 'NO DISPONIBLE'}`);
    console.log(`      LogicW: ${CanvasDimensions.LogicW || 'NO DISPONIBLE'}`);
    console.log(`      LogicH: ${CanvasDimensions.LogicH || 'NO DISPONIBLE'}`);
    console.log(`   🔄 Sincronización:`);
    console.log(`      ¿Niveles sincronizados?: ${instance.currentLevel === globalLevel ? '✅ SÍ' : '❌ NO'}`);
    console.log(`      ¿CanvasDimensions disponible?: ${!!(CanvasDimensions.uml && CanvasDimensions.uml > 0) ? '✅ SÍ' : '❌ NO'}`);
    
        return {
        instance: {
            currentLevel: instance.currentLevel,
            gameStarted: instance.gameStarted,
            gameState: instance.gameState,
            levelScore: instance.levelScore,
            totalScore: instance.totalScore
        },
        globalLevel: globalLevel,
        canvasDimensions: {
            uml: CanvasDimensions.uml || null,
            LogicW: CanvasDimensions.LogicW || null,
            LogicH: CanvasDimensions.LogicH || null,
            available: !!(CanvasDimensions.uml && CanvasDimensions.uml > 0)
        },
        synchronized: instance.currentLevel === globalLevel
    };
};

// Función para debuggear problemas de inicialización de CanvasDimensions
window.debugCanvasDimensionsInit = async function() {
    console.log('🔬 [DEBUG] Probando inicialización de CanvasDimensions...');
    
    const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
    if (!canvas) {
        console.error('❌ Canvas no encontrado');
        return;
    }
    
    console.log('📐 Canvas encontrado, obteniendo dimensiones...');
    console.log(`   offsetWidth: ${canvas.offsetWidth}px`);
    console.log(`   offsetHeight: ${canvas.offsetHeight}px`);
    console.log(`   clientWidth: ${canvas.clientWidth}px`);
    console.log(`   clientHeight: ${canvas.clientHeight}px`);
    
    // Forzar recálculo del layout
    canvas.offsetHeight;
    
    try {
        const dimensions = await CanvasDimensions.getCanvasDimensions();
        console.log('✅ CanvasDimensions obtenido:', dimensions);
        
        if (!dimensions || !dimensions.uml || dimensions.uml <= 0) {
            console.error('❌ CanvasDimensions inválido');
            return false;
        }
        
        console.log('✅ CanvasDimensions válido');
        console.log(`   CanvasDimensions.uml: ${CanvasDimensions.uml}`);
        console.log(`   dimensions.uml: ${dimensions.uml}`);
        console.log(`   ¿Coinciden?: ${CanvasDimensions.uml === dimensions.uml ? '✅ SÍ' : '❌ NO'}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error obteniendo CanvasDimensions:', error);
        return false;
    }
};

// Función para forzar re-inicialización del sistema
window.debugForceReInit = async function() {
    console.log('🔄 [DEBUG] Forzando re-inicialización del sistema...');
    
    try {
        // Probar inicialización de CanvasDimensions
        const canvasOK = await window.debugCanvasDimensionsInit();
        if (!canvasOK) {
            console.error('❌ No se pudo inicializar CanvasDimensions');
            return;
        }
        
        // Si está disponible, intentar re-inicializar pelota
        if (window.gameInstance) {
            console.log('🎾 Intentando re-inicializar pelota...');
            const { initPelota } = await import('./pelota.js');
            initPelota(window.gameInstance.currentLevel);
            console.log('✅ Pelota re-inicializada correctamente');
        }
        
    } catch (error) {
        console.error('❌ Error en re-inicialización:', error);
    }
};

// Mensaje de ayuda para el debug
console.log(`🧪 [DEBUG] Funciones de testing disponibles:`);
console.log(`   debugPuntajes() - Mostrar estado de puntajes`);
console.log(`   debugTestPuntaje(p1, p2) - Test rápido: debugTestPuntaje(300, 150)`);
console.log(`   debugSimularEscenarioBug() - Simular escenario del bug reportado`);
console.log(`   debugChangeLevel(nivel) - Cambiar a nivel específico`);
console.log(`   debugTestResize() - Probar resize conservando nivel`);
console.log(`   debugStatus() - Mostrar estado actual del sistema`);
console.log(`   debugCanvasDimensionsInit() - Probar inicialización de CanvasDimensions`);
console.log(`   debugForceReInit() - Forzar re-inicialización del sistema`);

// Exportar para uso en otros módulos si es necesario
export { game };

