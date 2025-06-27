// fondo.js - Sistema de fondo para Rejas Espaciales V2
// Capa independiente: fondo estrellado y futuras configuraciones por nivel

import { GAME_CONFIG } from './config.js';

// === VARIABLES PRINCIPALES ===
let fondoCanvas = null;
let fondoGenerado = false;
let estrellas = [];

// === GESTIÓN DEL CANVAS DE FONDO ===
function ensureFondoCanvas() {
    if (!fondoCanvas) {
        const canvas = document.createElement('canvas');
        fondoCanvas = canvas.getContext('2d');
        console.log('🌌 Canvas de fondo creado');
    }
    
    fondoCanvas.canvas.width = GAME_CONFIG.LOGICAL_WIDTH;
    fondoCanvas.canvas.height = GAME_CONFIG.LOGICAL_HEIGHT;
    
    return fondoCanvas;
}

// === GENERACIÓN DE ESTRELLAS ===
function generarEstrellas() {
    estrellas = [];
    const numEstrellas = 200;
    const width = GAME_CONFIG.LOGICAL_WIDTH;
    const height = GAME_CONFIG.LOGICAL_HEIGHT;
    
    for (let i = 0; i < numEstrellas; i++) {
        estrellas.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 0.5, // Tamaño entre 0.5 y 2.5
            brightness: Math.random() * 0.8 + 0.2, // Brillo entre 0.2 y 1.0
            twinkleSpeed: Math.random() * 0.002 + 0.001, // Velocidad de parpadeo
            twinklePhase: Math.random() * Math.PI * 2 // Fase inicial del parpadeo
        });
    }
    
    console.log(`✨ Generadas ${numEstrellas} estrellas para el fondo`);
}

// === DIBUJO DEL FONDO POR NIVEL ===
function dibujarFondo(level) {
    ensureFondoCanvas();
    fondoCanvas.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
    
    switch (level) {
        case 1:
        case 2:
            // NIVELES 1-2: Fondo estrellado espacial
            dibujarFondoEstrellado();
            break;
            
        case 3:
            // NIVEL 3: Futuro - nebulosa o diferentes colores
            dibujarFondoNebulosa();
            break;
            
        default:
            // Fallback: fondo negro simple
            fondoCanvas.fillStyle = 'rgb(0, 0, 0)';
            fondoCanvas.fillRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
            break;
    }
}

// === FONDO ESTRELLADO PARA NIVELES 1-2 ===
function dibujarFondoEstrellado() {
    // Fondo negro base
    fondoCanvas.fillStyle = 'rgb(57, 32, 132)';
    fondoCanvas.fillRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
    
    // Generar estrellas si es necesario
    if (!fondoGenerado) {
        generarEstrellas();
        fondoGenerado = true;
    }
    
    // Dibujar estrellas con parpadeo sutil
    const currentTime = performance.now();
    
    estrellas.forEach(estrella => {
        // Calcular brillo con parpadeo sutil
        const twinkleFactor = Math.sin(currentTime * estrella.twinkleSpeed + estrella.twinklePhase) * 0.3 + 0.7;
        const brightness = estrella.brightness * twinkleFactor;
        
        // Color blanco con variación de alpha para brillo
        fondoCanvas.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        
        fondoCanvas.beginPath();
        fondoCanvas.arc(estrella.x, estrella.y, estrella.size, 0, Math.PI * 2);
        fondoCanvas.fill();
        
        // Efecto adicional para estrellas más grandes: cruz de luz sutil
        if (estrella.size > 1.5) {
            fondoCanvas.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.4})`;
            fondoCanvas.lineWidth = 0.5;
            fondoCanvas.beginPath();
            fondoCanvas.moveTo(estrella.x - estrella.size * 2, estrella.y);
            fondoCanvas.lineTo(estrella.x + estrella.size * 2, estrella.y);
            fondoCanvas.moveTo(estrella.x, estrella.y - estrella.size * 2);
            fondoCanvas.lineTo(estrella.x, estrella.y + estrella.size * 2);
            fondoCanvas.stroke();
        }
    });
}

// === FONDO NEBULOSA PARA NIVEL 3+ (FUTURO) ===
function dibujarFondoNebulosa() {
    // Fondo degradado púrpura/azul
    const gradient = fondoCanvas.createRadialGradient(
        GAME_CONFIG.LOGICAL_WIDTH / 2, GAME_CONFIG.LOGICAL_HEIGHT / 2, 0,
        GAME_CONFIG.LOGICAL_WIDTH / 2, GAME_CONFIG.LOGICAL_HEIGHT / 2, Math.max(GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT) / 2
    );
    
    gradient.addColorStop(0, 'rgba(50, 0, 100, 1)');   // Púrpura central
    gradient.addColorStop(0.5, 'rgba(0, 20, 80, 1)');  // Azul medio
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');      // Negro exterior
    
    fondoCanvas.fillStyle = gradient;
    fondoCanvas.fillRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
    
    // Agregar algunas estrellas también
    if (!fondoGenerado) {
        generarEstrellas();
        fondoGenerado = true;
    }
    
    // Dibujar menos estrellas y más tenues
    const currentTime = performance.now();
    estrellas.slice(0, 100).forEach(estrella => { // Solo la mitad de las estrellas
        const twinkleFactor = Math.sin(currentTime * estrella.twinkleSpeed + estrella.twinklePhase) * 0.2 + 0.6;
        const brightness = estrella.brightness * twinkleFactor * 0.7; // Más tenues
        
        fondoCanvas.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        fondoCanvas.beginPath();
        fondoCanvas.arc(estrella.x, estrella.y, estrella.size * 0.8, 0, Math.PI * 2);
        fondoCanvas.fill();
    });
}

// === INICIALIZACIÓN Y RESETEO ===
export function initFondo(level) {
    console.log(`🌌 Inicializando fondo para nivel ${level}`);
    
    // Dibujar fondo según el nivel
    dibujarFondo(level);
    
    console.log(`✅ Fondo nivel ${level} inicializado`);
}

export function resetFondo() {
    // Limpiar canvas de fondo
    if (fondoCanvas) {
        fondoCanvas.clearRect(0, 0, fondoCanvas.canvas.width, fondoCanvas.canvas.height);
    }
    
    // Resetear estado para regenerar con nuevas dimensiones
    fondoGenerado = false;
    estrellas = [];
    
    console.log('🔄 Fondo reseteado');
}

// === RENDERIZADO (60 FPS) ===
export function renderFondo(ctx, level) {
    // Redibujar fondo cada frame para efectos dinámicos (parpadeo de estrellas)
    dibujarFondo(level);
    
    // Renderizar al canvas principal
    if (fondoCanvas) {
        ctx.drawImage(fondoCanvas.canvas, 0, 0);
    }
}

// === FUNCIONES DE ACCESO ===
export function getFondoState() {
    return {
        generado: fondoGenerado,
        numEstrellas: estrellas.length
    };
}

console.log('🌌 Fondo.js cargado - Sistema de capas de fondo independiente'); 