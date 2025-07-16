// Sistema de Grado de Impacto de Pelota
// Rejas Espaciales V2

import { updateBallState, incrementBallState, decrementBallState } from './timeline.js';

// === CONFIGURACIÓN ===
const GRADO_IMPACTO_CONFIG = {
    MIN_GRADO: 0,
    MAX_GRADO: 8,
    DECREMENTO_INTERVAL: 350,  // ms entre decrementos automáticos
    BONUS_EXPLOSION: 50,       // Puntos bonus por explosión en grado 8
    NUEVA_PELOTA_POSITION: {   // Posición inicial de nueva pelota después de explosión
        x: 0.9,  // 90% del ancho (margen derecho)
        y: 0.5   // 50% de la altura (centro vertical)
    }
};

// === VARIABLES GLOBALES ===
let pelotaGradoImpacto = 0;
let ultimoDisparoExitoso = 0;  // Timestamp del último disparo exitoso
let timerDecremento = null;    // Timer para decremento automático
let juegoActivo = false;       // Control del sistema

// === INICIALIZACIÓN ===
export function initGradoImpacto() {
    console.log('🎯 Inicializando sistema de Grado de Impacto...');
    
    // Resetear estado
    pelotaGradoImpacto = 0;
    ultimoDisparoExitoso = 0;
    juegoActivo = true;
    
    // Sincronizar con timeline
    updateBallState(pelotaGradoImpacto);
    
    // Iniciar timer de decremento automático
    iniciarTimerDecremento();
    
    console.log('✅ Sistema de Grado de Impacto inicializado');
}

// === CONTROL DEL TIMER DE DECREMENTO ===
function iniciarTimerDecremento() {
    if (timerDecremento) {
        clearInterval(timerDecremento);
    }
    
    timerDecremento = setInterval(() => {
        if (!juegoActivo) return;
        
        const tiempoActual = Date.now();
        const tiempoDesdeUltimoDisparo = tiempoActual - ultimoDisparoExitoso;
        
        // Solo decrementar si han pasado más de 350ms desde último disparo exitoso
        if (tiempoDesdeUltimoDisparo >= GRADO_IMPACTO_CONFIG.DECREMENTO_INTERVAL) {
            decrementarGrado('timer_automatico');
        }
    }, GRADO_IMPACTO_CONFIG.DECREMENTO_INTERVAL);
}

function detenerTimerDecremento() {
    if (timerDecremento) {
        clearInterval(timerDecremento);
        timerDecremento = null;
    }
}

// === FUNCIONES PRINCIPALES ===

// Incrementar grado por disparo exitoso
export function incrementarGradoPorDisparo() {
    if (!juegoActivo) return;
    
    ultimoDisparoExitoso = Date.now();
    
    if (pelotaGradoImpacto < GRADO_IMPACTO_CONFIG.MAX_GRADO) {
        pelotaGradoImpacto++;
        updateBallState(pelotaGradoImpacto);
        
        console.log(`🎯 Grado incrementado por disparo: ${pelotaGradoImpacto}`);
        
        // Verificar si llegó al grado máximo
        if (pelotaGradoImpacto === GRADO_IMPACTO_CONFIG.MAX_GRADO) {
            ejecutarExplosionGrado8();
        }
    }
}

// Decrementar grado (por timer o cambio de destino)
export function decrementarGrado(motivo = 'desconocido') {
    if (!juegoActivo) return;
    
    if (pelotaGradoImpacto > GRADO_IMPACTO_CONFIG.MIN_GRADO) {
        pelotaGradoImpacto--;
        updateBallState(pelotaGradoImpacto);
        
        console.log(`🎯 Grado decrementado (${motivo}): ${pelotaGradoImpacto}`);
    }
}

// Ejecutar evento especial de explosión en grado 8
function ejecutarExplosionGrado8() {
    console.log('💥 ¡EXPLOSIÓN DE PELOTA EN GRADO 8!');
    
    // Mostrar efecto visual de explosión
    mostrarEfectoExplosion();
    
    // Agregar bonus de puntos
    agregarBonusExplosion();
    
    // Posicionar nueva pelota
    setTimeout(() => {
        posicionarNuevaPelota();
        resetearGradoImpacto();
    }, 1000); // Esperar 1 segundo después de la explosión
}

// === EVENTOS DE JUEGO ===

// Llamar cuando la pelota cambia de destino
export function pelotaCambiaDestino() {
    decrementarGrado('cambio_destino');
}

// Resetear grado al inicio de cada nivel
export function resetearGradoImpacto() {
    pelotaGradoImpacto = 0;
    ultimoDisparoExitoso = 0;
    updateBallState(pelotaGradoImpacto);
    
    console.log('🎯 Grado de impacto reseteado para nuevo nivel');
}

// === EFECTOS VISUALES Y AUDIO ===

function mostrarEfectoExplosion() {
    // TODO: Implementar efecto visual de explosión
    // - Partículas
    // - Flash de luz
    // - Sacudida de pantalla
    console.log('💥 Ejecutando efecto visual de explosión...');
}

function agregarBonusExplosion() {
    // TODO: Integrar con sistema de puntuación
    console.log(`🎯 Bonus de ${GRADO_IMPACTO_CONFIG.BONUS_EXPLOSION} puntos agregado`);
    
    // Emitir evento para que el sistema de juego agregue los puntos
    if (window.game && typeof window.game.addBonusScore === 'function') {
        window.game.addBonusScore(GRADO_IMPACTO_CONFIG.BONUS_EXPLOSION, 'explosion_grado_8');
    }
}

function posicionarNuevaPelota() {
    // TODO: Integrar con sistema de pelota
    console.log('🔴 Posicionando nueva pelota en margen derecho...');
    
    // Emitir evento para que el sistema de pelota reposicione
    if (window.game && typeof window.game.respawnPelota === 'function') {
        const pos = GRADO_IMPACTO_CONFIG.NUEVA_PELOTA_POSITION;
        window.game.respawnPelota(pos.x, pos.y);
    }
}

// === CONTROL DEL SISTEMA ===

export function pausarGradoImpacto() {
    juegoActivo = false;
    detenerTimerDecremento();
    console.log('⏸️ Sistema de Grado de Impacto pausado');
}

export function reanudarGradoImpacto() {
    juegoActivo = true;
    iniciarTimerDecremento();
    console.log('▶️ Sistema de Grado de Impacto reanudado');
}

export function destruirGradoImpacto() {
    juegoActivo = false;
    detenerTimerDecremento();
    pelotaGradoImpacto = 0;
    console.log('🔴 Sistema de Grado de Impacto destruido');
}

// === GETTERS ===

export function getGradoImpactoActual() {
    return pelotaGradoImpacto;
}

export function getTiempoDesdeUltimoDisparo() {
    return Date.now() - ultimoDisparoExitoso;
}

export function isGradoMaximo() {
    return pelotaGradoImpacto === GRADO_IMPACTO_CONFIG.MAX_GRADO;
}

// === FUNCIONES DEBUG ===

// Funciones globales para debug en consola
if (typeof window !== 'undefined') {
    window.debugGradoImpacto = {
        incrementar: () => incrementarGradoPorDisparo(),
        decrementar: (motivo) => decrementarGrado(motivo || 'debug'),
        resetear: () => resetearGradoImpacto(),
        getGrado: () => getGradoImpactoActual(),
        forceExplosion: () => {
            pelotaGradoImpacto = GRADO_IMPACTO_CONFIG.MAX_GRADO - 1;
            incrementarGradoPorDisparo();
        }
    };
} 