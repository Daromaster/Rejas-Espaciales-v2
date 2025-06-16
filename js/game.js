// Constante de versión del juego
const GAME_VERSION = "2.1.001";
window.GAME_VERSION = GAME_VERSION;

// Game.js - Controlador principal del juego Rejas Espaciales V2

import { GAME_CONFIG, CanvasManager } from './config.js';
import { relojJuego } from './relojJuego.js';
import { 
    initGrid, 
    renderGrid, 
    getCoordenadasCubiertas, 
    getCoordenadasDescubiertas, 
    updateGridLogic 
} from './grid.js';

// === CONTROLADOR PRINCIPAL DEL JUEGO ===
class RejasEspacialesGame {
    constructor() {
        this.canvasManager = new CanvasManager();
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
        
        console.log(`Inicializando Rejas Espaciales V${GAME_VERSION}`);
    }
    
    // Inicialización del juego
    async initialize() {
        try {
            console.log('Inicializando canvas...');
            this.ctx = this.canvasManager.initialize();
            
            console.log('Configurando elementos del DOM...');
            this.setupDOMElements();
            
            console.log('Configurando controles...');
            this.setupControls();
            
            console.log('Iniciando bucle principal...');
            this.startGameLoop();
            
            // Mostrar mensaje inicial
            this.updateUI();
            this.drawInitialScreen();
            
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
        this.canvasManager.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
        this.gameStarted = true;
        this.gameState = GAME_CONFIG.GAME_STATES.PLAYING;
        
        // Inicializar sistema de grid
        initGrid(this.currentLevel);
        
        // Configurar cronómetro
        relojJuego.configurarTiempo(60000); // 60 segundos
        
        this.updateUI();
        console.log('¡Juego iniciado!');
    }
    
    // Disparar
    shoot() {
        if (!this.gameStarted) {
            this.startGame();
            return;
        }
        
        console.log('¡Disparo realizado!');
        
        // Iniciar cronómetro con primer disparo
        relojJuego.iniciarConPrimerDisparo();
        
        // TODO: Implementar lógica de disparo en P4
        
        // Efecto visual temporal en el botón
        if (this.elements.shootBtn) {
            this.elements.shootBtn.classList.add('active');
            setTimeout(() => {
                this.elements.shootBtn.classList.remove('active');
            }, 300);
        }
    }
    
    // Alternar audio (placeholder)
    toggleAudio() {
        console.log('Toggle audio');
        // TODO: Implementar sistema de audio en próximos pasos
        
        if (this.elements.audioBtn) {
            this.elements.audioBtn.classList.toggle('muted');
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
        if (this.elements.levelScore) {
            this.elements.levelScore.textContent = this.levelScore;
        }
        if (this.elements.totalScore) {
            this.elements.totalScore.textContent = this.totalScore;
        }
        if (this.elements.comment) {
            this.elements.comment.textContent = `Nivel ${this.currentLevel} - ${this.getGameStateText()}`;
        }
        if (this.elements.timer) {
            this.elements.timer.textContent = relojJuego.getTiempoFormateado();
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
    
    // Dibujar pantalla inicial
    drawInitialScreen() {
        // Limpiar canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
        
        // Texto central
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Rejas Espaciales V2', GAME_CONFIG.LOGICAL_WIDTH / 2, GAME_CONFIG.LOGICAL_HEIGHT / 2 - 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Presiona ESPACIO para empezar', GAME_CONFIG.LOGICAL_WIDTH / 2, GAME_CONFIG.LOGICAL_HEIGHT / 2 + 20);
        
        this.ctx.fillStyle = '#ccc';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Sistema preparado - Canvas ${GAME_CONFIG.LOGICAL_WIDTH}x${GAME_CONFIG.LOGICAL_HEIGHT}`, 
                         GAME_CONFIG.LOGICAL_WIDTH / 2, GAME_CONFIG.LOGICAL_HEIGHT / 2 + 60);
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
        if (this.gameState === GAME_CONFIG.GAME_STATES.PLAYING) {
            // Actualizar cronómetro
            relojJuego.actualizar(currentTime);
            
            // Actualizar lógica del grid
            const deltaTime = currentTime - this.lastLogicUpdate;
            updateGridLogic(deltaTime, this.currentLevel);
            
            // Verificar fin de tiempo
            if (relojJuego.estaTerminado()) {
                this.gameState = GAME_CONFIG.GAME_STATES.GAME_OVER;
                console.log('¡Tiempo agotado!');
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
        
        if (this.gameState === GAME_CONFIG.GAME_STATES.MENU) {
            this.drawInitialScreen();
            return;
        }
        
        if (this.gameStarted) {
            // Renderizar grid
            renderGrid(this.ctx, this.currentLevel);
            
            // TODO: Renderizar pelota (P3)
            // TODO: Renderizar efectos (P4)
            
            // Debug: mostrar algunas coordenadas
            this.debugRenderCoords();
        }
    }
    
    // Debug: renderizar algunas coordenadas para verificar funcionamiento
    debugRenderCoords() {
        const cubiertas = getCoordenadasCubiertas(this.currentLevel);
        const descubiertas = getCoordenadasDescubiertas(this.currentLevel);
        
        // Puntos cubiertos en rojo
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        cubiertas.slice(0, 5).forEach(coord => {
            this.ctx.beginPath();
            this.ctx.arc(coord.x, coord.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Puntos descubiertos en verde
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        descubiertas.slice(0, 3).forEach(coord => {
            this.ctx.beginPath();
            this.ctx.arc(coord.x, coord.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}

// === INICIALIZACIÓN GLOBAL ===
let game = null;

// Inicializar cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', async () => {
    try {
        game = new RejasEspacialesGame();
        await game.initialize();
    } catch (error) {
        console.error('Error fatal al inicializar el juego:', error);
    }
});

// Exportar para uso en otros módulos si es necesario
export { game };

