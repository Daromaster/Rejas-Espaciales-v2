// fondo.js - Sistema de fondo optimizado para Rejas Espaciales V2
// Capa independiente: fondo estrellado con matriz de canvas como grid.js

import { GAME_CONFIG } from './config.js';

// === VARIABLES PRINCIPALES ===
let canvasFondo = {}; // Matriz de canvas por nivel: canvasFondo[1], canvasFondo[2], etc.
let fondoCanvas = null; // Canvas de composición final
let fondoGenerado = false;
let estrellas = [];
let stepCounter = 0; // Contador para optimización de dibujado

// === GESTIÓN DE CANVAS MATRIZ (como grid.js) ===
function ensureCanvasFondo(nivel) {
    if (!canvasFondo[nivel]) {
        const canvas = document.createElement('canvas');
        canvasFondo[nivel] = canvas.getContext('2d');
        console.log(`🌌 Canvas de fondo [${nivel}] creado`);
    }
    
    canvasFondo[nivel].canvas.width = GAME_CONFIG.LOGICAL_WIDTH;
    canvasFondo[nivel].canvas.height = GAME_CONFIG.LOGICAL_HEIGHT;
    
    return canvasFondo[nivel];
}

function ensureFondoCanvas() {
    if (!fondoCanvas) {
        const canvas = document.createElement('canvas');
        fondoCanvas = canvas.getContext('2d');
        console.log('🌌 Canvas de composición de fondo creado');
    }
    
    fondoCanvas.canvas.width = GAME_CONFIG.LOGICAL_WIDTH;
    fondoCanvas.canvas.height = GAME_CONFIG.LOGICAL_HEIGHT;
    
    return fondoCanvas;
}

// === GENERACIÓN DE ESTRELLAS (solo en resize) ===
export function generarEstrellas() {
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

// === DIBUJO BASE DE ESTRELLAS (solo en resize) ===
function dibujarEstrellasBase(ctx) {
    // Fondo negro base
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
    
    // Dibujar todas las estrellas con tamaño estándar
    estrellas.forEach(estrella => {
        // Color blanco estándar
        ctx.fillStyle = `rgba(255, 255, 255, ${estrella.brightness})`;
        
        ctx.beginPath();
        ctx.arc(estrella.x, estrella.y, estrella.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Efecto adicional para estrellas más grandes: cruz de luz sutil
        if (estrella.size > 1.5) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${estrella.brightness * 0.4})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(estrella.x - estrella.size * 2, estrella.y);
            ctx.lineTo(estrella.x + estrella.size * 2, estrella.y);
            ctx.moveTo(estrella.x, estrella.y - estrella.size * 2);
            ctx.lineTo(estrella.x, estrella.y + estrella.size * 2);
            ctx.stroke();
        }
    });
}

// === DIBUJO OPTIMIZADO DE ESTRELLAS (cada 30 steps, solo 5 estrellas) ===
function dibujarEstrellasAnimadas(ctx) {
    stepCounter++;
    
    // Solo actualizar cada 30 steps
    if (stepCounter % 30 !== 0) {
        return;
    }
    
    // Seleccionar 5 estrellas al azar
    const estrellasAAnimar = [];
    for (let i = 0; i < 5; i++) {
        const indiceAleatorio = Math.floor(Math.random() * estrellas.length);
        estrellasAAnimar.push(estrellas[indiceAleatorio]);
    }
    
    // Dibujar cada estrella seleccionada con variante aleatoria
    estrellasAAnimar.forEach(estrella => {
        const variante = Math.floor(Math.random() * 3); // 0, 1, o 2
        
        switch (variante) {
            case 0:
                // Variante 1: Tamaño estándar (redibujar normal)
                ctx.fillStyle = `rgba(255, 255, 255, ${estrella.brightness})`;
                ctx.beginPath();
                ctx.arc(estrella.x, estrella.y, estrella.size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 1:
                // Variante 2: Más grande (parpadeo)
                ctx.fillStyle = `rgba(255, 255, 255, ${estrella.brightness * 1.2})`;
                ctx.beginPath();
                ctx.arc(estrella.x, estrella.y, estrella.size * 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 2:
                // Variante 3: Color del fondo (desaparece)
                ctx.fillStyle = 'rgb(0, 0, 0)'; // Negro como el fondo
                ctx.beginPath();
                ctx.arc(estrella.x, estrella.y, estrella.size * 1.2, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    });
}

// === DIBUJO DEL FONDO POR NIVEL EN CANVAS MATRIZ ===
function dibujarFondoNivel(nivel) {
    const ctx = ensureCanvasFondo(nivel);
    ctx.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
    
    switch (nivel) {
        case 1:
        case 2:
            // NIVELES 1-2: Fondo estrellado espacial
            dibujarFondoEstrellado(ctx);
            break;
            
        case 3:
            // NIVEL 3: Futuro - nebulosa o diferentes colores
            dibujarFondoNebulosa(ctx);
            break;
            
        default:
            // Fallback: fondo negro simple
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.fillRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
            break;
    }
}

// === FONDO ESTRELLADO PARA NIVELES 1-2 ===
function dibujarFondoEstrellado(ctx) {
    // Generar estrellas si es necesario
    if (!fondoGenerado) {
        generarEstrellas();
        fondoGenerado = true;
    }
    
    // Dibujar fondo base con todas las estrellas (solo en resize)
    dibujarEstrellasBase(ctx);
}

// === FONDO NEBULOSA PARA NIVEL 3+ (FUTURO) ===
function dibujarFondoNebulosa(ctx) {
    // Fondo degradado púrpura/azul
    const gradient = ctx.createRadialGradient(
        GAME_CONFIG.LOGICAL_WIDTH / 2, GAME_CONFIG.LOGICAL_HEIGHT / 2, 0,
        GAME_CONFIG.LOGICAL_WIDTH / 2, GAME_CONFIG.LOGICAL_HEIGHT / 2, Math.max(GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT) / 2
    );
    
    gradient.addColorStop(0, 'rgba(50, 0, 100, 1)');   // Púrpura central
    gradient.addColorStop(0.5, 'rgba(0, 20, 80, 1)');  // Azul medio
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');      // Negro exterior
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
    
    // Agregar algunas estrellas también
    if (!fondoGenerado) {
        generarEstrellas();
        fondoGenerado = true;
    }
    
    // Dibujar menos estrellas y más tenues
    estrellas.slice(0, 100).forEach(estrella => { // Solo la mitad de las estrellas
        const brightness = estrella.brightness * 0.7; // Más tenues
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.beginPath();
        ctx.arc(estrella.x, estrella.y, estrella.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
    });
}

// === COMPOSICIÓN DE FONDO (como grid.js) ===
function componerFondo(nivel) {
    const ctx = ensureFondoCanvas();
    ctx.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
    
    // Por ahora solo composición simple con canvasFondo[1]
    // En el futuro se podrán componer múltiples capas
    switch (nivel) {
        case 1:
        case 2:
        case 3:
        default:
            // Componer solo canvasFondo[1] por ahora
            if (canvasFondo[1]) {
                ctx.drawImage(canvasFondo[1].canvas, 0, 0);
                
                // Si es nivel 1 o 2, aplicar animación de estrellas
                if (nivel === 1 || nivel === 2) {
                    dibujarEstrellasAnimadas(ctx);
                }
            }
            break;
    }
}

// === INICIALIZACIÓN Y RESETEO ===
export function initFondo(nivel) {
    console.log(`🌌 Inicializando fondo para nivel ${nivel}`);
    
    // Dibujar fondo base en canvasFondo[1] (equivale a dibujarEstrellasBase)
    dibujarFondoNivel(1); // Por ahora siempre usamos canvasFondo[1]
    
    // Componer resultado final
    componerFondo(nivel);
    
    console.log(`✅ Fondo nivel ${nivel} inicializado`);
}

export function resetFondo() {
    // Limpiar todos los canvas
    Object.values(canvasFondo).forEach(ctx => {
        if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    });
    
    if (fondoCanvas) {
        fondoCanvas.clearRect(0, 0, fondoCanvas.canvas.width, fondoCanvas.canvas.height);
    }
    
    // Resetear estado para regenerar con nuevas dimensiones
    fondoGenerado = false;
    estrellas = [];
    stepCounter = 0;
    
    console.log('🔄 Fondo reseteado');
}

// === RENDERIZADO OPTIMIZADO (60 FPS) ===
export function renderFondo(ctx, nivel) {
    // Componer fondo con animaciones optimizadas
    componerFondo(nivel);
    
    // Renderizar al canvas principal
    if (fondoCanvas) {
        ctx.drawImage(fondoCanvas.canvas, 0, 0);
    }
}

// === FUNCIONES DE ACCESO ===
export function getFondoState() {
    return {
        generado: fondoGenerado,
        numEstrellas: estrellas.length,
        stepCounter: stepCounter
    };
}

// === FUNCIÓN DE RESIZE ===
export function resizeFondo(nivel) {
    console.log(`🌌 Redimensionando fondo para nivel ${nivel}`);
    
    // Resetear el fondo para regenerar con nuevas dimensiones
    fondoGenerado = false;
    estrellas = [];
    stepCounter = 0;
    
    // Reinicializar con las nuevas dimensiones
    initFondo(nivel);
    
    console.log(`✅ Fondo redimensionado para nivel ${nivel}`);
}

console.log('🌌 Fondo.js cargado - Sistema de capas de fondo independiente'); 
