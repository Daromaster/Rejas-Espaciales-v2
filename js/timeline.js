// Timeline Display - Línea de tiempo con 8 estados de pelota
// Rejas Espaciales V2

import { CanvasDimensions } from './config.js';

// === CONFIGURACIÓN DEL TIMELINE ===
const TIMELINE_CONFIG = {
    // 9 estados de grado de impacto (0 a 8)
    TOTAL_STATES: 9,
    MIN_STATE: 0,
    MAX_STATE: 8,
    
    // Colores
    LINE_COLOR: '#00ffff',        // Cyan para la línea
    BALL_COLOR: '#ffff00',        // Amarillo para la pelota
    MARKER_COLOR: '#ffffff',      // Blanco para marcadores
    EXPLOSION_COLOR: '#ff4444',   // Rojo para estado máximo (8)
    
    // Dimensiones
    LINE_THICKNESS: 2,
    BALL_RADIUS: 8,
    MARKER_RADIUS: 4,
    
    // Posición inicial de la pelota (estado 0 - inicio)
    INITIAL_STATE: 0
};

// === VARIABLES GLOBALES ===
let timelineCanvas = null;
let timelineCtx = null;
let currentBallState = TIMELINE_CONFIG.INITIAL_STATE;
let isHorizontal = false; // true si es modo horizontal (landscape)

// === INICIALIZACIÓN ===
export function initTimeline() {
    console.log('🕐 Inicializando Timeline Display...');
    
    // Obtener canvas timeline
    timelineCanvas = document.getElementById('canvas-timeline');
    if (!timelineCanvas) {
        console.error('❌ Canvas timeline no encontrado');
        return false;
    }
    
    timelineCtx = timelineCanvas.getContext('2d');
    
    // Configurar canvas transparente
    timelineCtx.globalAlpha = 1.0;
    
    // Detectar orientación inicial
    detectOrientation();
    
    // Configurar canvas timeline
    setupTimelineCanvas();
    
    // Dibujar timeline inicial
    drawTimeline();
    
    console.log('✅ Timeline Display inicializado correctamente');
    return true;
}

// === CONFIGURACIÓN DEL CANVAS ===
function setupTimelineCanvas() {
    if (!timelineCanvas) return;
    
    // Obtener dimensiones del canvas desde CSS
    const rect = timelineCanvas.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;
    
    // Usar DPR para alta resolución
    const dpr = window.devicePixelRatio || 1;
    
    // Configurar buffer interno
    timelineCanvas.width = cssWidth * dpr;
    timelineCanvas.height = cssHeight * dpr;
    
    // Escalar contexto
    timelineCtx.scale(dpr, dpr);
    
    // Configurar canvas para trabajar con coordenadas CSS
    timelineCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    console.log(`🕐 Canvas timeline configurado: ${cssWidth}x${cssHeight} (CSS), ${timelineCanvas.width}x${timelineCanvas.height} (buffer)`);
}

// === DETECCIÓN DE ORIENTACIÓN ===
function detectOrientation() {
    const wasHorizontal = isHorizontal;
    isHorizontal = window.innerWidth > window.innerHeight;
    
    if (wasHorizontal !== isHorizontal) {
        console.log(`🕐 Orientación detectada: ${isHorizontal ? 'Horizontal' : 'Vertical'}`);
    }
}

// === DIBUJO PRINCIPAL ===
function drawTimeline() {
    if (!timelineCtx) return;
    
    // Limpiar canvas
    const rect = timelineCanvas.getBoundingClientRect();
    timelineCtx.clearRect(0, 0, rect.width, rect.height);
    
    // Dibujar línea base
    drawTimelineLine();
    
    // Dibujar marcadores de estado
    drawStateMarkers();
    
    // Dibujar pelota en posición actual
    drawTimelineBall();
    
    // Dibujar números de estado (opcional)
    drawStateNumbers();
}

// === DIBUJAR LÍNEA BASE ===
function drawTimelineLine() {
    const rect = timelineCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    timelineCtx.strokeStyle = TIMELINE_CONFIG.LINE_COLOR;
    timelineCtx.lineWidth = TIMELINE_CONFIG.LINE_THICKNESS;
    timelineCtx.beginPath();
    
    if (isHorizontal) {
        // Línea vertical en modo horizontal
        const x = width / 2;
        const startY = height * 0.1;
        const endY = height * 0.9;
        
        timelineCtx.moveTo(x, startY);
        timelineCtx.lineTo(x, endY);
    } else {
        // Línea horizontal en modo vertical
        const y = height / 2;
        const startX = width * 0.1;
        const endX = width * 0.9;
        
        timelineCtx.moveTo(startX, y);
        timelineCtx.lineTo(endX, y);
    }
    
    timelineCtx.stroke();
}

// === DIBUJAR MARCADORES DE ESTADO ===
function drawStateMarkers() {
    const rect = timelineCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    timelineCtx.fillStyle = TIMELINE_CONFIG.MARKER_COLOR;
    
    for (let i = TIMELINE_CONFIG.MIN_STATE; i <= TIMELINE_CONFIG.MAX_STATE; i++) {
        const pos = getStatePosition(i, width, height);
        
        timelineCtx.beginPath();
        timelineCtx.arc(pos.x, pos.y, TIMELINE_CONFIG.MARKER_RADIUS, 0, Math.PI * 2);
        timelineCtx.fill();
    }
}

// === DIBUJAR PELOTA EN TIMELINE ===
function drawTimelineBall() {
    const rect = timelineCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const pos = getStatePosition(currentBallState, width, height);
    
    // Color especial para grado máximo (estado de explosión)
    const isMaxState = currentBallState === TIMELINE_CONFIG.MAX_STATE;
    timelineCtx.fillStyle = isMaxState ? TIMELINE_CONFIG.EXPLOSION_COLOR : TIMELINE_CONFIG.BALL_COLOR;
    
    timelineCtx.beginPath();
    timelineCtx.arc(pos.x, pos.y, TIMELINE_CONFIG.BALL_RADIUS, 0, Math.PI * 2);
    timelineCtx.fill();
    
    // Borde de la pelota
    timelineCtx.strokeStyle = isMaxState ? TIMELINE_CONFIG.EXPLOSION_COLOR : TIMELINE_CONFIG.LINE_COLOR;
    timelineCtx.lineWidth = isMaxState ? 2 : 1;
    timelineCtx.stroke();
    
    // Efecto de pulsación en estado máximo
    if (isMaxState) {
        const pulseRadius = TIMELINE_CONFIG.BALL_RADIUS + 3 + Math.sin(Date.now() * 0.01) * 2;
        timelineCtx.strokeStyle = TIMELINE_CONFIG.EXPLOSION_COLOR;
        timelineCtx.lineWidth = 1;
        timelineCtx.globalAlpha = 0.5;
        timelineCtx.beginPath();
        timelineCtx.arc(pos.x, pos.y, pulseRadius, 0, Math.PI * 2);
        timelineCtx.stroke();
        timelineCtx.globalAlpha = 1.0;
    }
}

// === DIBUJAR NÚMEROS DE ESTADO ===
function drawStateNumbers() {
    const rect = timelineCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    timelineCtx.fillStyle = TIMELINE_CONFIG.MARKER_COLOR;
    timelineCtx.font = '10px Arial';
    timelineCtx.textAlign = 'center';
    timelineCtx.textBaseline = 'middle';
    
    for (let i = TIMELINE_CONFIG.MIN_STATE; i <= TIMELINE_CONFIG.MAX_STATE; i++) {
        const pos = getStatePosition(i, width, height);
        
        // Offset para no solapar con los marcadores
        const offsetX = isHorizontal ? 15 : 0;
        const offsetY = isHorizontal ? 0 : 15;
        
        timelineCtx.fillText(i.toString(), pos.x + offsetX, pos.y + offsetY);
    }
}

// === CALCULAR POSICIÓN DE UN ESTADO ===
function getStatePosition(state, width, height) {
    // Normalizar estado a rango 0-1 (estados van de 0 a 8)
    const normalizedPos = state / TIMELINE_CONFIG.MAX_STATE;
    
    if (isHorizontal) {
        // Modo horizontal: línea vertical - estados van de abajo hacia arriba (0 abajo, 8 arriba)
        const startY = height * 0.9;  // Abajo
        const endY = height * 0.1;    // Arriba
        return {
            x: width / 2,
            y: startY + (endY - startY) * normalizedPos
        };
    } else {
        // Modo vertical: línea horizontal - estados van de izquierda a derecha (0 izquierda, 8 derecha)
        const startX = width * 0.1;   // Izquierda
        const endX = width * 0.9;     // Derecha
        return {
            x: startX + (endX - startX) * normalizedPos,
            y: height / 2
        };
    }
}

// === FUNCIONES PÚBLICAS ===

// Actualizar estado de la pelota (grado de impacto 0-8)
export function updateBallState(newState) {
    if (newState < TIMELINE_CONFIG.MIN_STATE || newState > TIMELINE_CONFIG.MAX_STATE) {
        console.warn(`🕐 Estado inválido: ${newState}. Debe estar entre ${TIMELINE_CONFIG.MIN_STATE} y ${TIMELINE_CONFIG.MAX_STATE}`);
        return;
    }
    
    const oldState = currentBallState;
    currentBallState = newState;
    
    // Redibujar timeline
    drawTimeline();
    
    console.log(`🕐 Grado de impacto actualizado: ${oldState} → ${newState}`);
}

// Incrementar grado de impacto
export function incrementBallState() {
    const newState = Math.min(currentBallState + 1, TIMELINE_CONFIG.MAX_STATE);
    updateBallState(newState);
    return newState;
}

// Decrementar grado de impacto
export function decrementBallState() {
    const newState = Math.max(currentBallState - 1, TIMELINE_CONFIG.MIN_STATE);
    updateBallState(newState);
    return newState;
}

// Obtener estado actual
export function getCurrentBallState() {
    return currentBallState;
}

// Resetear pelota al estado inicial
export function resetBallState() {
    updateBallState(TIMELINE_CONFIG.INITIAL_STATE);
    console.log('🕐 Estado de pelota reseteado al inicial');
}

// === RESIZE DEL TIMELINE ===
export function resizeTimeline() {
    console.log('🕐 Redimensionando Timeline...');
    
    // Detectar nueva orientación
    detectOrientation();
    
    // Reconfigurar canvas
    setupTimelineCanvas();
    
    // Redibujar
    drawTimeline();
    
    console.log('✅ Timeline redimensionado');
}

// === FUNCIONES DE DEBUG ===
export function debugTimeline() {
    console.log('🎯 DEBUG Timeline - GRADO DE IMPACTO:');
    console.log(`   Canvas: ${timelineCanvas?.width}x${timelineCanvas?.height}`);
    console.log(`   Orientación: ${isHorizontal ? 'Horizontal (vertical abajo→arriba)' : 'Vertical (horizontal izquierda→derecha)'}`);
    console.log(`   Grado actual: ${currentBallState} (rango: ${TIMELINE_CONFIG.MIN_STATE}-${TIMELINE_CONFIG.MAX_STATE})`);
    console.log(`   Estados totales: ${TIMELINE_CONFIG.TOTAL_STATES}`);
    console.log('   Comandos disponibles en window.debugGradoImpacto');
}

// Función para probar todos los estados (0-8)
export function debugTestAllStates() {
    console.log('🎯 Probando todos los grados de impacto (0-8)...');
    
    let grado = TIMELINE_CONFIG.MIN_STATE;
    const interval = setInterval(() => {
        updateBallState(grado);
        console.log(`Grado: ${grado} ${grado === TIMELINE_CONFIG.MAX_STATE ? '💥 (EXPLOSIÓN)' : ''}`);
        grado++;
        
        if (grado > TIMELINE_CONFIG.MAX_STATE) {
            clearInterval(interval);
            console.log('✅ Prueba de grados completada');
            
            // Volver al estado inicial
            setTimeout(() => {
                resetBallState();
            }, 1000);
        }
    }, 800);
} 