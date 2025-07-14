// disparos.js - Sistema de disparos del juego Rejas Espaciales V2 - P4

import { GAME_CONFIG } from './config.js';
import { getCoordenadasCubiertas, getCoordenadasDescubiertas, getGridObj } from './grid.js';
import { getPelotaPosition, getPelotaState } from './pelota.js';
import { relojJuego } from './relojJuego.js';

// === VARIABLES GLOBALES DEL SISTEMA DE DISPAROS ===
let disparosState = {
    // Estado general
    activo: false,
    inicializado: false,
    primerDisparoRealizado: false,
    
    // Configuración de disparos
    duracion: 200,              // Duración visual del disparo en ms
    cooldown: 250,              // Tiempo entre disparos en ms (equilibrado para todos los dispositivos)
    ultimoTiempoDisparo: 0,     // Último momento de disparo
    disparosActivos: [],        // Array de disparos en curso
    
    // Control de entrada equilibrado (teclado/touch)
    teclaDisparoPresionada: false,  // Evita repetición automática de teclas
    inputEnCooldown: false,         // Estado de cooldown unificado
    cooldownTeclado: 300,           // Cooldown mayor para teclado (vs 250ms touch)
    cooldownTouch: 250,             // Cooldown base para touch/click
    
    // Configuración visual
    colorInicio: 'rgba(255, 136, 0, 1)',    // Naranja en origen
    colorFin: 'rgba(225, 0, 255, 0.7)',     // Violeta en destino
    anchoInicio: 10,            // Ancho en píxeles en origen
    anchoFin: 2,                // Ancho en píxeles en destino
    
    // Puntuación
    puntaje: 0,
    
    // Partículas de fallo
    particulasActivas: [],
    
    // Audio
    audioInicializado: false,
    audioMuteado: false,
    sonidos: {}
};

// Canvas virtuales para disparos
let disparosCanvases = {};

// === INICIALIZACIÓN ===
export function initDisparos(nivel) {
    console.log(`🎯 Inicializando sistema de disparos - Nivel ${nivel}`);
    
    // Resetear estado para nuevo nivel
    disparosState.activo = false;
    disparosState.primerDisparoRealizado = false; // Permitir wake-up en cada nuevo nivel
    console.log(`🔄 [CRONÓMETRO] Sistema resetado para nivel ${nivel} - primerDisparoRealizado: ${disparosState.primerDisparoRealizado}`);
    disparosState.disparosActivos = [];
    disparosState.particulasActivas = [];
    disparosState.puntaje = 0;
    
    // Resetear estado de entrada equilibrado
    resetInputState();
    
    // Crear canvas virtuales
    ensureDisparosCanvas(1); // Canvas base para disparos
    ensureDisparosCanvas(2); // Canvas composición
    // Preparado para más canvas: 3 (partículas), 4 (efectos especiales), etc.
    
    // Inicializar audio
    if (!disparosState.audioInicializado) {
        initAudioDisparos();
    }
    
    // Configuración por nivel
    switch (nivel) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5: {
            // Por ahora todos los niveles usan la misma configuración del Ensayo
            disparosState.duracion = 200;
            disparosState.cooldown = 250;
            disparosState.anchoInicio = 10;
            disparosState.anchoFin = 2;
            
            console.log(`Configuración nivel ${nivel}: disparos estilo Ensayo original`);
            break;
        }
        
        default: {
            console.warn(`⚠️ Configuración por defecto para nivel ${nivel}`);
            break;
        }
    }
    
    disparosState.inicializado = true;
    console.log('✅ Sistema de disparos inicializado');
}

// === GESTIÓN DE CANVAS VIRTUALES ===
function ensureDisparosCanvas(index) {
    if (!disparosCanvases[index]) {
        disparosCanvases[index] = document.createElement('canvas');
        disparosCanvases[index].width = GAME_CONFIG.LOGICAL_WIDTH;
        disparosCanvases[index].height = GAME_CONFIG.LOGICAL_HEIGHT;
        console.log(`📁 Canvas disparos ${index} creado`);
    }
}

// === SISTEMA DE AUDIO ===
function initAudioDisparos() {
    console.log("🔊 Inicializando sistema de audio de disparos con Howler...");
    
    // Verificar que Howler esté disponible
    if (typeof Howl === 'undefined') {
        console.error('❌ Howler.js no está disponible');
        return;
    }
    
    // Cargar estado de mute desde localStorage
    const muteState = localStorage.getItem('rejasEspaciales_audioMuted');
    disparosState.audioMuteado = muteState === 'true';
    
    disparosState.sonidos = {
        // Sonido de disparo
        disparo: new Howl({
            src: ['assets/audio/Disparo Sinte 1.wav'],
            volume: 0.7,
            preload: true,
            pool: 3
        }),
        // Sonido de acierto (ganar puntos)
        acierto: new Howl({
            src: ['assets/audio/Acierto Sinte 1.wav'],
            volume: 0.8,
            preload: true,
            pool: 2
        }),
        // Sonido de fallo (golpe en reja)
        fallo: new Howl({
            src: ['assets/audio/Metal 1.wav'],
            volume: 0.6,
            preload: true,
            pool: 2
        })
    };
    
    disparosState.audioInicializado = true;
    console.log('✅ Audio de disparos inicializado');
}

function reproducirSonido(tipo) {
    if (!disparosState.audioInicializado || !disparosState.sonidos[tipo] || disparosState.audioMuteado) {
        return;
    }
    
    disparosState.sonidos[tipo].play();
}

// === FUNCIONES DE CONTROL DE AUDIO ===
export function toggleMuteAudio() {
    disparosState.audioMuteado = !disparosState.audioMuteado;
    
    // Guardar estado en localStorage
    localStorage.setItem('rejasEspaciales_audioMuted', disparosState.audioMuteado.toString());
    
    console.log(`🔊 Audio ${disparosState.audioMuteado ? 'silenciado' : 'activado'}`);
    return disparosState.audioMuteado;
}

export function isAudioMuted() {
    return disparosState.audioMuteado;
}

// === FUNCIÓN DE INTENTO DE DISPARO EQUILIBRADO ===
function intentarDisparoConCooldown(cooldownEspecifico) {
    const tiempoActual = performance.now();
    
    // Verificar cooldown específico según tipo de entrada
    if (tiempoActual - disparosState.ultimoTiempoDisparo >= cooldownEspecifico) {
        const resultado = realizarDisparo();
        if (resultado) {
            disparosState.ultimoTiempoDisparo = tiempoActual;
            disparosState.inputEnCooldown = true;
            
            // Resetear cooldown después del tiempo configurado
            setTimeout(() => {
                disparosState.inputEnCooldown = false;
            }, cooldownEspecifico);
        }
        return resultado;
    }
    
    return false; // En cooldown
}

// Función legacy mantenida para compatibilidad
export function intentarDisparo() {
    return intentarDisparoConCooldown(disparosState.cooldown);
}

// === FUNCIÓN PRINCIPAL DE DISPARO ===
export function realizarDisparo() {
    console.log(`🎯 [CRONÓMETRO] realizarDisparo() llamado - Nivel: ${window.gameInstance?.currentLevel || 'undefined'}, primerDisparo: ${disparosState.primerDisparoRealizado}`);
    
    if (!disparosState.inicializado) {
        console.warn('⚠️ Sistema de disparos no inicializado');
        return false;
    }
    
    const tiempoActual = performance.now();
    
    // Verificar cooldown
    if (tiempoActual - disparosState.ultimoTiempoDisparo < disparosState.cooldown) {
        return false; // Aún en cooldown
    }
    
    // Marcar primer disparo para iniciar cronómetro
    if (!disparosState.primerDisparoRealizado) {
        console.log(`🔥 [CRONÓMETRO] PRIMER DISPARO DETECTADO - Nivel: ${window.gameInstance?.currentLevel || 'undefined'}`);
        disparosState.primerDisparoRealizado = true;
        iniciarCronometroJuego();
        console.log(`⏰ [CRONÓMETRO] Estado relojJuego después de iniciar: ${relojJuego.getEstado()}`);
    }
    
    // Reproducir sonido de disparo
    reproducirSonido('disparo');
    
    // Crear disparo visual
    crearDisparoVisual();
    
    // Verificar impacto y asignar puntos
    verificarImpactoYPuntos();
    
    // Actualizar estado
    disparosState.ultimoTiempoDisparo = tiempoActual;
    disparosState.activo = true;
    
    console.log('🎯 Disparo realizado');
    return true;
}

// === CREACIÓN DE DISPARO VISUAL ===
function crearDisparoVisual() {
    // Obtener dimensiones del canvas
    const canvasWidth = GAME_CONFIG.LOGICAL_WIDTH;
    const canvasHeight = GAME_CONFIG.LOGICAL_HEIGHT;
    
    // Puntos de origen (esquinas inferiores)
    const yInicio = canvasHeight - canvasHeight * 0.1; // 10% desde abajo
    const xIzquierda = canvasWidth * 0.1;  // 10% desde izquierda
    const xDerecha = canvasWidth * 0.9;    // 90% desde izquierda
    
    // Obtener posición de la pelota como destino
    const posicionPelota = getPelotaPosition();
    const destinoX = posicionPelota.x;
    const destinoY = posicionPelota.y;
    
    // Crear dos disparos (izquierda y derecha) con pequeño offset en destino
    const offset = 5;
    const disparos = [
        {
            inicioX: xIzquierda,
            inicioY: yInicio,
            finX: destinoX - offset,
            finY: destinoY,
            tiempoCreacion: performance.now()
        },
        {
            inicioX: xDerecha,
            inicioY: yInicio,
            finX: destinoX + offset,
            finY: destinoY,
            tiempoCreacion: performance.now()
        }
    ];
    
    // Agregar disparos al array activo
    disparosState.disparosActivos.push(...disparos);
}

// === DETECCIÓN DE PELOTA DESCUBIERTA/CUBIERTA ===
function detectarEstadoPelota() {
    const posicionPelota = getPelotaPosition();
    
    // Obtener nivel actual del game engine
    const nivelActual = window.gameInstance ? window.gameInstance.currentLevel : 1;
    
    // Método geométrico principal (del Ensayo)
    const margenCelda = 15;        // Tolerancia para centros de celdas
    const margenInterseccion = 15; // Tolerancia para intersecciones
    
    let puntosDescubiertos = [];
    let puntosCubiertos = [];
    
    // === OBTENER COORDENADAS SEGÚN EL NIVEL ===
    if (nivelActual <= 2) {
        // Niveles 1 y 2: Grid unificado tradicional
        puntosDescubiertos = getCoordenadasDescubiertas(nivelActual) || [];
        puntosCubiertos = getCoordenadasCubiertas(nivelActual) || [];
        
    } else if (nivelActual === 3) {
        // Nivel 3: Rejas instanciadas - obtener coordenadas de ambas rejas
        const reja1 = getGridObj('reja1');
        const reja2 = getGridObj('reja2');
        
        if (reja1 && reja2) {
            // Combinar coordenadas de ambas rejas
            const desc1 = reja1.getCoordenadasDescubiertas() || [];
            const desc2 = reja2.getCoordenadasDescubiertas() || [];
            const cub1 = reja1.getCoordenadasCubiertas() || [];
            const cub2 = reja2.getCoordenadasCubiertas() || [];
            
            puntosDescubiertos = [...desc1, ...desc2];
            puntosCubiertos = [...cub1, ...cub2];
            
            console.log(`🎯 [DEBUG] Nivel 3 detección: ${desc1.length}+${desc2.length}=${puntosDescubiertos.length} desc, ${cub1.length}+${cub2.length}=${puntosCubiertos.length} cub`);
        } else {
            console.warn(`⚠️ GridObj no encontrados para detección: reja1=${!!reja1}, reja2=${!!reja2}`);
            return 'cubierta'; // Fallback
        }
        
    } else {
        // Niveles futuros: usar grid tradicional como fallback
        puntosDescubiertos = getCoordenadasDescubiertas(nivelActual) || [];
        puntosCubiertos = getCoordenadasCubiertas(nivelActual) || [];
    }
    
    // 1. Verificar distancia a puntos descubiertos (centros de celdas)
    if (puntosDescubiertos.length > 0) {
        let distanciaMinima = Infinity;
        let puntoMasCercano = null;
        
        for (const punto of puntosDescubiertos) {
            const distancia = Math.hypot(
                posicionPelota.x - punto.x,
                posicionPelota.y - punto.y
            );
            if (distancia < distanciaMinima) {
                distanciaMinima = distancia;
                puntoMasCercano = punto;
            }
        }
        
        if (distanciaMinima < margenCelda) {
            console.log(`✅ [DISPARO] Pelota DESCUBIERTA - dist: ${distanciaMinima.toFixed(1)}px a (${puntoMasCercano.x.toFixed(1)}, ${puntoMasCercano.y.toFixed(1)})`);
            return 'descubierta';
        }
    }
    
    // 2. Verificar distancia a puntos cubiertos (intersecciones)
    if (puntosCubiertos.length > 0) {
        let distanciaMinima = Infinity;
        let puntoMasCercano = null;
        
        for (const punto of puntosCubiertos) {
            const distancia = Math.hypot(
                posicionPelota.x - punto.x,
                posicionPelota.y - punto.y
            );
            if (distancia < distanciaMinima) {
                distanciaMinima = distancia;
                puntoMasCercano = punto;
            }
        }
        
        if (distanciaMinima < margenInterseccion) {
            console.log(`❌ [DISPARO] Pelota CUBIERTA - dist: ${distanciaMinima.toFixed(1)}px a (${puntoMasCercano.x.toFixed(1)}, ${puntoMasCercano.y.toFixed(1)})`);
            return 'cubierta';
        }
    }
    
    // Si no está cerca de ningún punto específico, asumir cubierta
    console.log(`❓ [DISPARO] Pelota en zona indefinida - asumiendo CUBIERTA`);
    console.log(`   Posición pelota: (${posicionPelota.x.toFixed(1)}, ${posicionPelota.y.toFixed(1)})`);
    console.log(`   Puntos disponibles: ${puntosDescubiertos.length} desc, ${puntosCubiertos.length} cub`);
    
    return 'cubierta';
}

// === VERIFICACIÓN DE IMPACTO Y PUNTOS ===
function verificarImpactoYPuntos() {
    const estadoPelota = detectarEstadoPelota();
    const posicionPelota = getPelotaPosition();
    
    if (estadoPelota === 'descubierta') {
        // ✅ ACIERTO: Pelota descubierta
        reproducirSonido('acierto');
        
        // Sumar 10 puntos
        disparosState.puntaje += 10;
        
        // Mostrar animación flotante de puntos ganados
        mostrarAnimacionPuntos(posicionPelota, 10, false);
        
        // Agregar efecto de pulso al puntaje (como en juego Ensayo)
        agregarEfectoPulsoPuntaje(false);
        
        // Activar efecto en pelota (cambio de color)
        if (typeof window.pelotaImpacto === 'function') {
            window.pelotaImpacto();
        }
        
        console.log(`✅ ¡Acierto! +10 puntos. Total: ${disparosState.puntaje}`);
        
    } else {
        // ❌ FALLO: Pelota cubierta
        reproducirSonido('fallo');
        
        // Crear efecto de partículas
        crearEfectoParticulas(posicionPelota);
        
        // Determinar penalización según reglas del Ensayo
        let penalizacion = 0;
        
        if (disparosState.puntaje > 20) {
            // Determinar si estamos en primera o segunda mitad del nivel
            const tiempoTranscurrido = performance.now() - relojJuego.getTiempoInicio();
            penalizacion = tiempoTranscurrido > 30000 ? 10 : 5; // 30 segundos = primera mitad
            
            disparosState.puntaje -= penalizacion;
            
            // Mostrar animación flotante de puntos perdidos
            mostrarAnimacionPuntos(posicionPelota, -penalizacion, true);
            
            // Agregar efecto de pulso al puntaje (color rojo para penalización)
            agregarEfectoPulsoPuntaje(true);
            
            console.log(`❌ Fallo: -${penalizacion} puntos. Total: ${disparosState.puntaje}`);
        } else {
            console.log('❌ Fallo: Sin penalización (puntos ≤ 20)');
        }
    }
}

// === ANIMACIONES FLOTANTES DE PUNTOS ===
function mostrarAnimacionPuntos(posicion, puntos, esPenalizacion = false) {
    // Crear elemento DOM flotante
    const elemento = document.createElement('div');
    
    // Configurar texto y colores
    if (esPenalizacion) {
        elemento.textContent = puntos; // Ya incluye el signo negativo
        elemento.style.color = 'rgba(255, 50, 50, 1)';
        elemento.style.textShadow = '0 0 10px #ff0000, 0 0 20px #ff0000';
    } else {
        elemento.textContent = '+' + puntos;
        elemento.style.color = 'rgba(0, 255, 0, 1)';
        elemento.style.textShadow = '0 0 10px #00ff00, 0 0 20px #00ff00';
    }
    
    // Obtener el canvas correcto por ID
    const canvas = document.getElementById('canvas-principal');
    if (!canvas) {
        console.warn('⚠️ Canvas principal no encontrado para animación de puntos');
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    
    // === CÁLCULO CORRECTO DE COORDENADAS CON SCALING ===
    // El canvas lógico es 900x600, pero el canvas real puede ser de cualquier tamaño
    const logicalWidth = GAME_CONFIG.LOGICAL_WIDTH;  // 900
    const logicalHeight = GAME_CONFIG.LOGICAL_HEIGHT; // 600
    
    // Calcular factores de escala
    const scaleX = rect.width / logicalWidth;   // Factor de escala horizontal
    const scaleY = rect.height / logicalHeight; // Factor de escala vertical
    
    // Convertir coordenadas lógicas a coordenadas reales en pantalla
    const xReal = posicion.x * scaleX;
    const yReal = posicion.y * scaleY;
    
    // Obtener el radio actual de la pelota del estado
    const pelotaState = getPelotaState();
    const radioPelota = (pelotaState.radio || 8) * Math.min(scaleX, scaleY); // Escalar también el radio
    
    // Posicionar el texto DIRECTAMENTE cerca del perímetro de la pelota
    const offsetDesdePerimetro = 5 * Math.min(scaleX, scaleY); // Escalar también el offset
    
    // Posición final en pantalla (coordenadas absolutas)
    const x = rect.left + xReal;
    const y = rect.top + yReal - radioPelota - offsetDesdePerimetro;
    
    // Estilos de posicionamiento y animación
    elemento.style.position = 'fixed';
    elemento.style.left = x + 'px';
    elemento.style.top = y + 'px';
    elemento.style.fontWeight = 'bold';
    elemento.style.fontSize = Math.max(16, 28 * Math.min(scaleX, scaleY)) + 'px'; // Escalar fuente también
    elemento.style.zIndex = '1001';
    elemento.style.pointerEvents = 'none';
    elemento.style.transition = 'all 1.5s ease-out';
    elemento.style.transform = 'translateX(-50%)'; // Centrar horizontalmente
    
    // Agregar al DOM
    document.body.appendChild(elemento);
    
    // Animar
    setTimeout(() => {
        elemento.style.opacity = '0';
        elemento.style.transform = 'translateX(-50%) translateY(-30px) scale(1.3)'; // Mantener centrado
    }, 10);
    
    // Eliminar después de la animación
    setTimeout(() => {
        if (elemento.parentNode) {
            document.body.removeChild(elemento);
        }
    }, 1500);
}

// === SISTEMA DE PARTÍCULAS DE FALLO ===
function crearEfectoParticulas(posicion) {
    const tiempoActual = performance.now();
    const cantidadParticulas = 20; // Cantidad moderada para rendimiento
    
    for (let i = 0; i < cantidadParticulas; i++) {
        const particula = {
            x: posicion.x,
            y: posicion.y,
            velocidadX: (Math.random() - 0.5) * 6,     // Velocidad horizontal aleatoria
            velocidadY: (Math.random() - 0.5) * 6,     // Velocidad vertical aleatoria
            vida: 1.0,                                  // Vida inicial (1.0 = 100%)
            decaimiento: 0.02 + Math.random() * 0.02,   // Velocidad de desvanecimiento
            tamaño: 2 + Math.random() * 3,              // Tamaño aleatorio
            color: Math.random() < 0.7 ? 'chispa' : 'metal', // 70% chispas, 30% metal
            tiempoCreacion: tiempoActual,
            // Para interpolación
            xAnterior: posicion.x,
            yAnterior: posicion.y
        };
        
        disparosState.particulasActivas.push(particula);
    }
}

// === INICIO DE CRONÓMETRO ===
function iniciarCronometroJuego() {
    console.log(`🔥 [CRONÓMETRO] Intentando iniciar cronómetro - relojJuego disponible: ${typeof relojJuego.iniciar === 'function'}`);
    if (typeof relojJuego.iniciar === 'function') {
        const estadoAntes = relojJuego.getEstado ? relojJuego.getEstado() : 'sin getEstado()';
        relojJuego.iniciar();
        const estadoDespues = relojJuego.getEstado ? relojJuego.getEstado() : 'sin getEstado()';
        console.log(`⏰ Cronómetro del juego iniciado con primer disparo - Estado: ${estadoAntes} → ${estadoDespues}`);
        
        // Verificar que realmente se inició
        if (estadoDespues === 'jugando') {
            console.log(`✅ [CRONÓMETRO] CONFIRMADO: Cronómetro iniciado correctamente`);
        } else {
            console.warn(`❌ [CRONÓMETRO] PROBLEMA: Cronómetro NO se inició - Estado: ${estadoDespues}`);
        }
        
        // 🚀 WAKE-UP CRÍTICO: Despertar backend al iniciar nivel con primer disparo
        if (window.apiClient && typeof window.apiClient.wakeUpForLevel === 'function') {
            // Obtener nivel actual
            const nivelActual = window.gameInstance ? window.gameInstance.currentLevel : 1;
            
            console.log(`🚀 [WAKE-UP] Iniciando wake-up del backend para nivel ${nivelActual}`);
            console.log(`🚀 [WAKE-UP] gameInstance.currentLevel: ${window.gameInstance?.currentLevel || 'undefined'}`);
            
            // Wake-up asíncrono para no bloquear el juego
            window.apiClient.wakeUpForLevel(nivelActual)
                .then(success => {
                    if (success) {
                        console.log(`✅ [WAKE-UP] Backend preparado para nivel ${nivelActual} - Respuesta exitosa`);
                    } else {
                        console.log(`⚠️ [WAKE-UP] Backend no responde para nivel ${nivelActual} - Se usará respaldo local`);
                    }
                })
                .catch(error => {
                    console.log(`❌ [WAKE-UP] Error para nivel ${nivelActual}: ${error.message}`);
                });
        } else {
            console.log(`❌ [WAKE-UP] Sistema no disponible:`);
            console.log(`   - window.apiClient: ${window.apiClient ? 'disponible' : 'NO disponible'}`);
            console.log(`   - wakeUpForLevel: ${typeof window.apiClient?.wakeUpForLevel}`);
        }
    }
}

// === LÓGICA DE ACTUALIZACIÓN (30 FPS) ===
export function updateDisparosLogic(deltaTime, nivel) {
    if (!disparosState.inicializado) return;
    
    const tiempoActual = performance.now();
    
    // Actualizar disparos activos
    disparosState.disparosActivos = disparosState.disparosActivos.filter(disparo => {
        const edad = tiempoActual - disparo.tiempoCreacion;
        return edad <= disparosState.duracion;
    });
    
    // Actualizar partículas activas
    for (let i = disparosState.particulasActivas.length - 1; i >= 0; i--) {
        const particula = disparosState.particulasActivas[i];
        
        // Guardar posición anterior para interpolación
        particula.xAnterior = particula.x;
        particula.yAnterior = particula.y;
        
        // Actualizar posición
        particula.x += particula.velocidadX;
        particula.y += particula.velocidadY;
        
        // Aplicar gravedad
        particula.velocidadY += 0.2;
        
        // Reducir vida
        particula.vida -= particula.decaimiento;
        
        // Eliminar si está muerta
        if (particula.vida <= 0) {
            disparosState.particulasActivas.splice(i, 1);
        }
    }
    
    // Actualizar estado general
    disparosState.activo = disparosState.disparosActivos.length > 0 || 
                          disparosState.particulasActivas.length > 0;
}

// === COMPOSICIÓN DE DISPAROS (SELECT CASE) ===
function composeDisparos(nivel) {
    ensureDisparosCanvas(2);
    const ctxDisparos = disparosCanvases[2].getContext('2d');
    
    // Limpiar canvas de composición
    ctxDisparos.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
    
    switch (nivel) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5: {
            // Todos los niveles usan el estilo del Ensayo por ahora
            
            // Dibujar disparos activos
            for (const disparo of disparosState.disparosActivos) {
                dibujarDisparoEnsayo(ctxDisparos, disparo);
            }
            
            // Dibujar partículas activas
            for (const particula of disparosState.particulasActivas) {
                dibujarParticulaEnsayo(ctxDisparos, particula);
            }
            
            return 2; // Canvas final
        }
        
        default: {
            console.warn(`⚠️ Composición de disparos no implementada para nivel ${nivel}`);
            return 1;
        }
    }
}

// === DIBUJO DE DISPARO ESTILO ENSAYO ===
function dibujarDisparoEnsayo(ctx, disparo) {
    // Crear gradiente lineal del Ensayo
    const gradiente = ctx.createLinearGradient(
        disparo.inicioX, disparo.inicioY,
        disparo.finX, disparo.finY
    );
    
    gradiente.addColorStop(0, disparosState.colorInicio);
    gradiente.addColorStop(1, disparosState.colorFin);
    
    ctx.fillStyle = gradiente;
    
    // Calcular ángulo del disparo
    const dx = disparo.finX - disparo.inicioX;
    const dy = disparo.finY - disparo.inicioY;
    const angulo = Math.atan2(dy, dx);
    
    // Ángulos perpendiculares para forma cónica
    const anguloPerp1 = angulo + Math.PI / 2;
    const anguloPerp2 = angulo - Math.PI / 2;
    
    // Mitades de ancho
    const mitadInicio = disparosState.anchoInicio / 2;
    const mitadFin = disparosState.anchoFin / 2;
    
    // Calcular 4 puntos del cono
    const p1 = {
        x: disparo.inicioX + Math.cos(anguloPerp1) * mitadInicio,
        y: disparo.inicioY + Math.sin(anguloPerp1) * mitadInicio
    };
    const p2 = {
        x: disparo.inicioX + Math.cos(anguloPerp2) * mitadInicio,
        y: disparo.inicioY + Math.sin(anguloPerp2) * mitadInicio
    };
    const p3 = {
        x: disparo.finX + Math.cos(anguloPerp1) * mitadFin,
        y: disparo.finY + Math.sin(anguloPerp1) * mitadFin
    };
    const p4 = {
        x: disparo.finX + Math.cos(anguloPerp2) * mitadFin,
        y: disparo.finY + Math.sin(anguloPerp2) * mitadFin
    };
    
    // Dibujar polígono cónico
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.fill();
}

// === DIBUJO DE PARTÍCULA ESTILO ENSAYO ===
function dibujarParticulaEnsayo(ctx, particula) {
    const alpha = Math.max(0, particula.vida);
    
    ctx.save();
    ctx.globalAlpha = alpha;
    
    if (particula.color === 'chispa') {
        // Chispa amarilla/naranja
        ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
    } else {
        // Fragmento metálico gris
        ctx.fillStyle = `rgba(150, 150, 150, ${alpha})`;
    }
    
    ctx.beginPath();
    ctx.arc(particula.x, particula.y, particula.tamaño, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// === RENDERIZADO FINAL (60 FPS CON INTERPOLACIÓN) ===
export function renderDisparos(ctx, nivel, alpha = 1) {
    if (!disparosState.inicializado || !disparosState.activo) return;
    
    // SINCRONIZACIÓN CRÍTICA: Actualizar destinos de disparos activos con posición actual de la pelota
    // Esto asegura que los disparos sigan a la pelota durante rotaciones rápidas (nivel 2+)
    const posicionPelotaActual = getPelotaPosition();
    const offset = 5; // Mismo offset que en crearDisparoVisual
    
    const disparosActualizados = disparosState.disparosActivos.map((disparo, index) => ({
        ...disparo,
        // Actualizar destino con posición actual de la pelota
        finX: posicionPelotaActual.x + (index === 0 ? -offset : offset), // Izquierdo/Derecho
        finY: posicionPelotaActual.y
    }));
    
    // Para partículas, aplicar interpolación de posición
    const particulasInterpoladas = disparosState.particulasActivas.map(particula => ({
        ...particula,
        x: particula.xAnterior + (particula.x - particula.xAnterior) * alpha,
        y: particula.yAnterior + (particula.y - particula.yAnterior) * alpha
    }));
    
    // Temporalmente reemplazar para renderizado
    const disparosOriginales = disparosState.disparosActivos;
    const particulasOriginales = disparosState.particulasActivas;
    
    disparosState.disparosActivos = disparosActualizados;
    disparosState.particulasActivas = particulasInterpoladas;
    
    // Componer disparos y efectos
    const canvasFinal = composeDisparos(nivel);
    
    // Restaurar arrays originales
    disparosState.disparosActivos = disparosOriginales;
    disparosState.particulasActivas = particulasOriginales;
    
    // Renderizar resultado final
    if (disparosCanvases[canvasFinal]) {
        ctx.drawImage(disparosCanvases[canvasFinal], 0, 0);
    }
}

// === FUNCIONES DE ACCESO ===
export function getDisparosState() {
    return {
        activo: disparosState.activo,
        puntaje: disparosState.puntaje,
        primerDisparoRealizado: disparosState.primerDisparoRealizado,
        disparosActivos: disparosState.disparosActivos.length,
        particulasActivas: disparosState.particulasActivas.length
    };
}

export function resetPuntaje() {
    disparosState.puntaje = 0;
    console.log('🔄 Puntaje de disparos reiniciado');
}

// === FUNCIONES DE CONTROL DE ENTRADA EQUILIBRADO ===

// Control de teclado con anti-repetición y cooldown equilibrado
export function handleKeyboardShootDown(keyCode) {
    // Solo aceptar Space o KeyZ
    if (keyCode !== 'Space' && keyCode !== 'KeyZ') return false;
    
    // Evitar repetición automática de teclas
    if (!disparosState.teclaDisparoPresionada) {
        disparosState.teclaDisparoPresionada = true;
        // Usar cooldown específico para teclado (ligeramente mayor)
        return intentarDisparoConCooldown(disparosState.cooldownTeclado);
    }
    
    return false;
}

export function handleKeyboardShootUp(keyCode) {
    // Solo resetear si es la tecla correcta
    if (keyCode === 'Space' || keyCode === 'KeyZ') {
        disparosState.teclaDisparoPresionada = false;
    }
}

// Control de touch/click equilibrado (cooldown optimizado)
export function handleTouchShoot() {
    // No verificar estado de tecla para touch, usar cooldown específico más corto
    return intentarDisparoConCooldown(disparosState.cooldownTouch);
}

// Resetear estado de entrada al inicializar nivel
export function resetInputState() {
    disparosState.teclaDisparoPresionada = false;
    disparosState.inputEnCooldown = false;
    disparosState.ultimoTiempoDisparo = 0;
    console.log(`🎮 Estado de entrada reseteado - Cooldowns: teclado=${disparosState.cooldownTeclado}ms, touch=${disparosState.cooldownTouch}ms`);
}

// === FUNCIÓN DE LIMPIEZA ===
export function clearDisparosCanvases() {
    Object.keys(disparosCanvases).forEach(key => {
        const canvas = disparosCanvases[key];
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
        }
    });
    console.log('🧹 Canvas de disparos limpiados');
}

// === EFECTO DE PULSO EN PUNTAJES (Solo texto, sutil y rápido) ===
function agregarEfectoPulsoPuntaje(esPenalizacion = false) {
    // Encontrar elemento de puntaje del nivel
    const elementoPuntajeNivel = document.getElementById('puntaje-nivel');
    const elementoPuntajeTotal = document.getElementById('puntaje-total');
    
    // Efecto en puntaje del nivel actual
    if (elementoPuntajeNivel) {
        // Configurar transición más rápida y solo escala + color de texto
        elementoPuntajeNivel.style.transition = 'all 0.1s ease-in-out';
        elementoPuntajeNivel.style.transform = 'scale(1.15)'; // Pulso más sutil
        
        if (esPenalizacion) {
            // Cambiar solo el color del texto, no el fondo
            elementoPuntajeNivel.style.color = 'rgba(255, 100, 100, 1)'; // Rojo para penalización
        } else {
            // Cambiar solo el color del texto, no el fondo
            elementoPuntajeNivel.style.color = 'rgba(100, 255, 100, 1)'; // Verde brillante para acierto
        }
        
        // Volver al estado normal después de 100ms (más rápido)
        setTimeout(() => {
            elementoPuntajeNivel.style.transform = 'scale(1)';
            elementoPuntajeNivel.style.color = 'rgba(0, 255, 255, 1)'; // Color original cyan
        }, 100);
    }
    
    // Efecto en puntaje total (si está visible y es nivel 2+)
    if (elementoPuntajeTotal && elementoPuntajeTotal.style.display !== 'none') {
        // Configurar transición más rápida y solo escala + color de texto
        elementoPuntajeTotal.style.transition = 'all 0.1s ease-in-out';
        elementoPuntajeTotal.style.transform = 'scale(1.15)'; // Pulso más sutil
        
        if (esPenalizacion) {
            // Cambiar solo el color del texto, no el fondo
            elementoPuntajeTotal.style.color = 'rgba(255, 100, 100, 1)'; // Rojo para penalización
        } else {
            // Cambiar solo el color del texto, no el fondo
            elementoPuntajeTotal.style.color = 'rgba(150, 255, 255, 1)'; // Cian más brillante para acierto
        }
        
        // Volver al estado normal después de 100ms (más rápido)
        setTimeout(() => {
            elementoPuntajeTotal.style.transform = 'scale(1)';
            elementoPuntajeTotal.style.color = 'rgba(0, 255, 255, 1)'; // Color original CIAN del CSS
        }, 100);
    }
}

// === FUNCIONES DE DEBUG Y CONFIGURACIÓN EQUILIBRADO ===
window.debugSistemaDisparos = function() {
    console.log(`🎮 [DEBUG] Estado del sistema de disparos equilibrado:`);
    console.log(`   Cooldown teclado: ${disparosState.cooldownTeclado}ms`);
    console.log(`   Cooldown touch: ${disparosState.cooldownTouch}ms`);
    console.log(`   Cooldown base: ${disparosState.cooldown}ms`);
    console.log(`   Último disparo: ${performance.now() - disparosState.ultimoTiempoDisparo}ms atrás`);
    console.log(`   Tecla presionada: ${disparosState.teclaDisparoPresionada}`);
    console.log(`   Input en cooldown: ${disparosState.inputEnCooldown}`);
    console.log(`   Sistema inicializado: ${disparosState.inicializado}`);
    
    return {
        cooldownTeclado: disparosState.cooldownTeclado,
        cooldownTouch: disparosState.cooldownTouch,
        cooldownBase: disparosState.cooldown,
        ultimoDisparo: performance.now() - disparosState.ultimoTiempoDisparo,
        teclaPresionada: disparosState.teclaDisparoPresionada,
        inputEnCooldown: disparosState.inputEnCooldown,
        inicializado: disparosState.inicializado
    };
};

window.configurarCooldownDisparos = function(nuevoValor) {
    if (typeof nuevoValor === 'number' && nuevoValor >= 100 && nuevoValor <= 1000) {
        disparosState.cooldown = nuevoValor;
        console.log(`🎮 [CONFIG] Cooldown base actualizado a ${nuevoValor}ms`);
        return true;
    } else {
        console.warn(`❌ [CONFIG] Valor inválido. Usar entre 100-1000ms. Actual: ${disparosState.cooldown}ms`);
        return false;
    }
};

window.configurarCooldownEquilibrado = function(teclado, touch) {
    let cambios = [];
    
    if (typeof teclado === 'number' && teclado >= 100 && teclado <= 1000) {
        disparosState.cooldownTeclado = teclado;
        cambios.push(`teclado: ${teclado}ms`);
    }
    
    if (typeof touch === 'number' && touch >= 100 && touch <= 1000) {
        disparosState.cooldownTouch = touch;
        cambios.push(`touch: ${touch}ms`);
    }
    
    if (cambios.length > 0) {
        console.log(`🎮 [CONFIG] Cooldowns actualizados - ${cambios.join(', ')}`);
        console.log(`   Diferencia: ${disparosState.cooldownTeclado - disparosState.cooldownTouch}ms a favor de touch`);
        return true;
    } else {
        console.warn(`❌ [CONFIG] Valores inválidos. Usar entre 100-1000ms.`);
        console.log(`   Actuales: teclado=${disparosState.cooldownTeclado}ms, touch=${disparosState.cooldownTouch}ms`);
        return false;
    }
};

// === FUNCIONES DE DEBUG DEL CRONÓMETRO ===
window.debugCronometroEstado = function() {
    const nivel = window.gameInstance ? window.gameInstance.currentLevel : 'undefined';
    const estadoCronometro = relojJuego.getEstado ? relojJuego.getEstado() : 'sin getEstado()';
    const primerDisparo = disparosState.primerDisparoRealizado;
    const inicializado = disparosState.inicializado;
    
    console.log(`🔍 [DEBUG] Estado del sistema de cronómetro:`);
    console.log(`   Nivel actual: ${nivel}`);
    console.log(`   Estado cronómetro: ${estadoCronometro}`);
    console.log(`   Primer disparo realizado: ${primerDisparo}`);
    console.log(`   Sistema disparos inicializado: ${inicializado}`);
    console.log(`   relojJuego disponible: ${typeof relojJuego}`);
    console.log(`   relojJuego.iniciar disponible: ${typeof relojJuego.iniciar === 'function'}`);
    
    return {
        nivel,
        estadoCronometro,
        primerDisparo,
        inicializado,
        relojJuegoDisponible: typeof relojJuego !== 'undefined',
        iniciarDisponible: typeof relojJuego.iniciar === 'function'
    };
};

window.debugForzarIniciarCronometro = function() {
    console.log(`🔧 [DEBUG] Forzando inicio de cronómetro manualmente...`);
    
    if (typeof relojJuego.iniciar === 'function') {
        const estadoAntes = relojJuego.getEstado ? relojJuego.getEstado() : 'sin getEstado()';
        relojJuego.iniciar();
        const estadoDespues = relojJuego.getEstado ? relojJuego.getEstado() : 'sin getEstado()';
        
        console.log(`🔧 Estado: ${estadoAntes} → ${estadoDespues}`);
        return estadoDespues;
    } else {
        console.warn(`❌ relojJuego.iniciar no está disponible`);
        return null;
    }
};

console.log('🎯 Disparos.js cargado - Sistema P4 con control equilibrado diferenciado iniciado...');
console.log('🔧 Funciones debug disponibles:');
console.log('   debugSistemaDisparos() - Ver estado del sistema equilibrado');
console.log('   configurarCooldownDisparos(ms) - Ajustar cooldown base (100-1000ms)');
console.log('   configurarCooldownEquilibrado(teclado, touch) - Ajustar cooldowns específicos');
console.log('   debugCronometroEstado() - Ver estado del cronómetro');
console.log('   debugForzarIniciarCronometro() - Forzar inicio manual del cronómetro');
console.log('   debugViewport() - Debug de viewport para móviles (solo si hay problemas)');
console.log('⚖️ Configuración actual: Teclado 300ms / Touch 250ms (50ms ventaja para touch)');
console.log('📱 Layout móvil horizontal optimizado con dvh/vh dinámico'); 