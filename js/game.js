// Constante de versión del juego
const GAME_VERSION = "2.1.001";
window.GAME_VERSION = GAME_VERSION;

// Control de niveles máximos implementados
const MAX_NIVELES_IMPLEMENTADOS = 2; // Actualizar a medida que se programen más niveles

// Game.js - Controlador principal del juego Rejas Espaciales V2

import { GAME_CONFIG } from './config.js';
import { relojJuego } from './relojJuego.js';
import { renderFondo, initFondo } from './fondo.js';
import { 
    initGrid, 
    renderGrid, 
    getCoordenadasCubiertas, 
    getCoordenadasDescubiertas, 
    updateGridLogic,
    getTransformMatrix 
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
    isAudioMuted
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
        
        // Sistema de tiempo para lógica e interpolación
        this.logicTimer = 0;
        this.lastLogicUpdate = 0;
        this.logicInterval = 1000 / GAME_CONFIG.LOGIC_FPS; // 33.33ms para 30 FPS
        
        // Variables de puntuación
        this.levelScore = 0;
        this.totalScore = 0;
        
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
            shootBtn: document.getElementById('btn-disparo')
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
        // Controles de teclado
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Botón de audio
        if (this.elements.audioBtn) {
            this.elements.audioBtn.addEventListener('click', () => this.toggleAudio());
        }
        
        // Botón de disparo
        if (this.elements.shootBtn) {
            this.elements.shootBtn.addEventListener('click', () => this.shoot());
        }
        
        // Prevenir menú contextual en el canvas
        // this.canvasManager.canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // DESACTIVADO
        const canvas = document.getElementById(GAME_CONFIG.CANVAS_ID);
        if (canvas) {
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }
    
    // Manejar teclas presionadas
    handleKeyDown(event) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                if (!this.gameStarted) {
                    this.startGame();
                } else {
                    this.shoot();
                }
                break;
            case 'KeyM':
                this.toggleAudio();
                break;
            case 'KeyP':
                this.togglePause();
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
    
    // Disparar
    shoot() {
        if (!this.gameStarted) {
            this.startGame();
            return;
        }
        
        // Realizar disparo usando el sistema P4
        const disparoExitoso = realizarDisparo();
        
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
                
                // Solo sumar al total si no se ha sumado ya
                this.totalScore += this.levelScore;
                
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
            // Aplicar matriz de transformación para obtener coordenadas actuales
            const transformMatrix = getTransformMatrix();
            let destinoTransformado = pelotaState.destinoActual;
            
            if (transformMatrix && pelotaState.destinoActual.coordenadasBase) {
                // Aplicar transformación a las coordenadas base
                const base = pelotaState.destinoActual.coordenadasBase;
                const transformedX = transformMatrix.a * base.x + transformMatrix.c * base.y + transformMatrix.e;
                const transformedY = transformMatrix.b * base.x + transformMatrix.d * base.y + transformMatrix.f;
                
                destinoTransformado = {
                    ...pelotaState.destinoActual,
                    x: transformedX,
                    y: transformedY
                };
            }
            
            // Color según tipo: rojo=descubierto, amarillo=cubierto
            const esDescubierto = pelotaState.destinoActual.tipo === 'descubierto';
            this.ctx.fillStyle = esDescubierto ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 255, 0, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(destinoTransformado.x, destinoTransformado.y, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Indicador de estado
            if (1==0) {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText(
                        `${pelotaState.viajando ? '🚀' : '🌀'} ${pelotaState.destinoActual.tipo}`,
                        destinoTransformado.x + 12,
                        destinoTransformado.y - 12
                    );
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
        this.totalScore += this.levelScore;
        
        // Mostrar transición de nivel
        this.mostrarTransicionEntreNiveles();
    }
    
    // Función para avanzar al siguiente nivel
    avanzarNivel() {
        console.log(`➡️ Avanzando del nivel ${this.currentLevel} al ${this.currentLevel + 1}`);
        
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
        const resultadoNivel = {
            nivel: this.currentLevel,
            puntajeNivel: this.levelScore,
            puntajeTotal: this.totalScore,
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
            this.totalScore,
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
            puntajeTotal: this.totalScore,
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
        
        // === 2. MANEJAR PUNTAJES ===
        this.levelScore = 0; // Siempre resetear puntaje del nivel
        
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

// Exportar para uso en otros módulos si es necesario
export { game };

