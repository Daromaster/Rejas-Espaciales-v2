// pelota.js - Sistema de pelota del juego Rejas Espaciales V2

import { GAME_CONFIG } from './config.js';
import { getCoordenadasCubiertas, getCoordenadasDescubiertas, getGridConfig, getTransformMatrix } from './grid.js';
import { relojJuego } from './relojJuego.js';

// === VARIABLES GLOBALES DE PELOTA ===
let pelotaState = {
    // Posición actual e interpolación
    posX: 0,
    posY: 0,
    posXAnterior: 0,
    posYAnterior: 0,
    
    // Estado del destino
    destinoActual: null,
    tiempoInicioDestino: 0,
    tiempoEnDestino: 0,
    tiempoPermanenciaDestino: 2000, // Default 2000ms por especificación P3
    
    // Estados de movimiento
    viajePelota: null,     // Estado del viaje actual
    orbitaPelota: null,    // Estado de la órbita actual
    
    // Rotación permanente de la pelota
    anguloRotacion: 0,
    velocidadRotacion: 0.104719755, // ~π/30 radianes por frame = 1 vuelta cada 2 segundos a 30fps
    
    // Configuración visual
    radio: 8,
    color: {
        // Colores base normales (del Ensayo original)
        normal: {
            bright: "rgba(255, 170, 170, 1)",  // Color claro para el brillo (rojo)
            mid: "rgb(218, 28, 28)",           // Color intermedio (rojo)
            dark: "rgba(128, 0, 0, 1)"         // Color oscuro para el borde (rojo)
        },
        // Colores bajo disparo (del Ensayo original)
        hit: {
            bright: "rgba(255, 170, 255, 1)",  // Color claro para el brillo (violeta)
            mid: "rgb(218, 28, 218)",          // Color intermedio (violeta)
            dark: "rgba(128, 0, 128, 1)"       // Color oscuro para el borde (violeta)
        }
    },
    
    // Sistema de intensidad de impacto (preparado para P4)
    impacto: {
        activo: false,
        intensidad: 0,           // 0-100 para mezclar entre normal y hit
        tiempoInicio: 0,
        duracion: 300,           // Duración de la transición en milisegundos
        decaimiento: 2           // Velocidad de desvanecimiento
    },
    
    // Estado del sistema
    isInicializado: false
};

// Canvas virtuales para composición de pelota
let pelotaCanvases = {};

// === UTILIDADES MATEMÁTICAS ===
const PelotaMath = {
    // Interpolación lineal
    lerp: (a, b, t) => a + (b - a) * t,
    
    // Distancia entre dos puntos
    distancia: (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2),
    
    // Normalizar ángulo
    normalizarAngulo: (angulo) => {
        while (angulo < 0) angulo += Math.PI * 2;
        while (angulo >= Math.PI * 2) angulo -= Math.PI * 2;
        return angulo;
    },
    
    // Aplicar matriz de transformación a un punto
    applyTransform: (x, y, matrix) => {
        if (!matrix) return { x, y };
        return {
            x: matrix.a * x + matrix.c * y + matrix.e,
            y: matrix.b * x + matrix.d * y + matrix.f
        };
    },
    
    // Easing suave (del Ensayo original)
    easeInOutSineExtraSoft: (t) => {
        // Aplicar sine ease-in-out múltiples veces para suavidad extra
        let smoothed = t;
        smoothed = 0.5 * (1 - Math.cos(smoothed * Math.PI)); // Primera aplicación
        smoothed = 0.5 * (1 - Math.cos(smoothed * Math.PI)); // Segunda aplicación
        return smoothed;
    }
};

// === INICIALIZACIÓN DEL SISTEMA ===
export function initPelota(nivel) {
    console.log(`🎾 Inicializando sistema de pelota - Nivel ${nivel}`);
    
    // Crear canvas virtuales si no existen
    ensurePelotaCanvas(1); // Canvas base
    ensurePelotaCanvas(2); // Canvas composición
    // Preparado para más canvas virtuales en futuro: 3, 4, etc.
    
    // Configurar estado inicial por nivel
    switch (nivel) {
        case 1: {
            // Nivel 1: Destinos alternados, tiempo fijo 2000ms
            pelotaState.tiempoPermanenciaDestino = 2000;
            pelotaState.velocidadRotacion = 0.104719755; // 1 vuelta cada 2 segundos
            
            // Radio = 70% del tamaño de celda (diámetro 70%, radio 35%)
            const gridConfig = getGridConfig(nivel);
            const nuevoRadio = Math.round(gridConfig.tamCuadrado * 0.35);
            
            // Si cambió el radio, marcar para redibujar
            const radioCambio = pelotaState.radio !== nuevoRadio;
            pelotaState.radio = nuevoRadio;
            
            // Posición inicial en centro del canvas
            pelotaState.posX = GAME_CONFIG.LOGICAL_WIDTH / 2;
            pelotaState.posY = GAME_CONFIG.LOGICAL_HEIGHT / 2;
            pelotaState.posXAnterior = pelotaState.posX;
            pelotaState.posYAnterior = pelotaState.posY;
            
            console.log(`Configuración nivel 1: Radio ${pelotaState.radio}px, destinos alternados, 2000ms permanencia, rotación 1 vuelta/2s`);
            
            // Si ya estaba inicializado y cambió el radio, redibujar
            if (pelotaState.isInicializado && radioCambio) {
                console.log('📏 Radio cambió, redibujando pelota base');
                dibujarPelotaBase(nivel);
            }
            break;
        }
        
        case 2: {
            // Nivel 2: Destinos probabilísticos (preparado para futuro)
            pelotaState.tiempoPermanenciaDestino = 1500; // Más dinámico
            pelotaState.velocidadRotacion = 0.104719755; // 1 vuelta cada 2 segundos
            
            // Radio = 70% del tamaño de celda (diámetro 70%, radio 35%)
            const gridConfig2 = getGridConfig(nivel);
            const nuevoRadio2 = Math.round(gridConfig2.tamCuadrado * 0.35);
            
            const radioCambio2 = pelotaState.radio !== nuevoRadio2;
            pelotaState.radio = nuevoRadio2;
            
            pelotaState.posX = GAME_CONFIG.LOGICAL_WIDTH / 2;
            pelotaState.posY = GAME_CONFIG.LOGICAL_HEIGHT / 2;
            pelotaState.posXAnterior = pelotaState.posX;
            pelotaState.posYAnterior = pelotaState.posY;
            
            console.log(`Configuración nivel 2: Radio ${pelotaState.radio}px, destinos probabilísticos, 1500ms permanencia, rotación 1 vuelta/2s`);
            
            if (pelotaState.isInicializado && radioCambio2) {
                console.log('📏 Radio cambió, redibujando pelota base');
                dibujarPelotaBase(nivel);
            }
            break;
        }
        
        default: {
            console.warn(`⚠️ Configuración por defecto para nivel ${nivel}`);
            pelotaState.tiempoPermanenciaDestino = 2000;
            pelotaState.velocidadRotacion = 0.104719755; // 1 vuelta cada 2 segundos
            
            // Radio por defecto = 70% del tamaño de celda (diámetro 70%, radio 35%)
            const gridConfigDefault = getGridConfig(nivel);
            pelotaState.radio = Math.round(gridConfigDefault.tamCuadrado * 0.35);
            pelotaState.posX = GAME_CONFIG.LOGICAL_WIDTH / 2;
            pelotaState.posY = GAME_CONFIG.LOGICAL_HEIGHT / 2;
            break;
        }
    }
    
    // Dibujar pelota base UNA VEZ (como en grid)
    dibujarPelotaBase(nivel);
    
    // Inicializar primer destino
    seleccionarProximoDestino(nivel);
    
    pelotaState.isInicializado = true;
    console.log('✅ Sistema de pelota inicializado');
}

// === GESTIÓN DE CANVAS VIRTUALES ===
function ensurePelotaCanvas(index) {
    if (!pelotaCanvases[index]) {
        pelotaCanvases[index] = document.createElement('canvas');
        pelotaCanvases[index].width = GAME_CONFIG.LOGICAL_WIDTH;
        pelotaCanvases[index].height = GAME_CONFIG.LOGICAL_HEIGHT;
        console.log(`📁 Canvas pelota ${index} creado`);
    }
}

// === LÓGICA DE DESTINOS POR NIVEL ===
let destinoAlternar = true; // Para nivel 1: alternar cubierto/descubierto

function seleccionarProximoDestino(nivel) {
    switch (nivel) {
        case 1: {
            // Motor de destinos nivel 1: Alternado cubierto/descubierto
            const coordenadas = destinoAlternar 
                ? getCoordenadasCubiertas(nivel)
                : getCoordenadasDescubiertas(nivel);
            
            if (coordenadas && coordenadas.length > 0) {
                const indiceAleatorio = Math.floor(Math.random() * coordenadas.length);
                const coordenadaSeleccionada = coordenadas[indiceAleatorio];
                
                // Guardar coordenadas (ahora vienen con baseX/baseY del grid)
                pelotaState.destinoActual = {
                    x: coordenadaSeleccionada.x, // Coordenadas transformadas actuales
                    y: coordenadaSeleccionada.y,
                    coordenadasBase: {         // Coordenadas base para transformar
                        x: coordenadaSeleccionada.baseX,
                        y: coordenadaSeleccionada.baseY
                    },
                    tipo: destinoAlternar ? 'cubierto' : 'descubierto'
                };
                
                // Alternar para próximo destino
                destinoAlternar = !destinoAlternar;
                
                console.log(`🎯 Nuevo destino nivel 1: ${pelotaState.destinoActual.tipo} (${pelotaState.destinoActual.x}, ${pelotaState.destinoActual.y})`);
                
                // Iniciar viaje hacia el destino
                iniciarViajePelota(pelotaState.destinoActual);
            }
            break;
        }
        
        case 2: {
            // Motor de destinos nivel 2: Probabilístico (60% cubierto, 40% descubierto)
            const esCubierto = Math.random() < 0.6;
            const coordenadas = esCubierto 
                ? getCoordenadasCubiertas(nivel)
                : getCoordenadasDescubiertas(nivel);
            
            if (coordenadas && coordenadas.length > 0) {
                const indiceAleatorio = Math.floor(Math.random() * coordenadas.length);
                const coordenadaSeleccionada = coordenadas[indiceAleatorio];
                
                pelotaState.destinoActual = {
                    x: coordenadaSeleccionada.x,
                    y: coordenadaSeleccionada.y,
                    coordenadasBase: {
                        x: coordenadaSeleccionada.baseX,
                        y: coordenadaSeleccionada.baseY
                    },
                    tipo: esCubierto ? 'cubierto' : 'descubierto'
                };
                
                // Tiempo variable de permanencia (1000-2500ms)
                pelotaState.tiempoPermanenciaDestino = 1000 + Math.random() * 1500;
                
                console.log(`🎯 Nuevo destino nivel 2: ${pelotaState.destinoActual.tipo} - ${pelotaState.tiempoPermanenciaDestino}ms`);
                
                iniciarViajePelota(pelotaState.destinoActual);
            }
            break;
        }
        
        default: {
            console.warn(`⚠️ Algoritmo de destinos no implementado para nivel ${nivel}`);
            break;
        }
    }
}

// === SISTEMA DE VIAJE (Basado en Ensayo Original) ===
function iniciarViajePelota(destino) {
    if (!destino) return;
    
    // Calcular distancia inicial
    const dx = destino.x - pelotaState.posX;
    const dy = destino.y - pelotaState.posY;
    const distanciaInicial = Math.sqrt(dx * dx + dy * dy);
    
    // Algoritmo del Ensayo: calcular pasos según distancia máxima
    const distanciaMaxima = 500; // Valor de referencia del Ensayo
    const proporcion = distanciaInicial / distanciaMaxima;
    
    // Aplicar corrección suave para evitar pasos demasiado pocos
    const curvaImpulso = (1 - proporcion) ** 2; // cuadrática: más fuerte si es muy corta
    
    // Determinar cantidad de pasos base
    const pasosBase = 44; // número máximo para distancia máxima (del Ensayo)
    const cantidadPasos = Math.round(pasosBase * proporcion + pasosBase * 0.25 * curvaImpulso);
    const totalPasos = Math.max(cantidadPasos, 6); // al menos 6 pasos
    
    pelotaState.viajePelota = {
        origenX: pelotaState.posX,
        origenY: pelotaState.posY,
        destinoX: destino.x,
        destinoY: destino.y,
        pasoActual: 0,
        totalPasos: totalPasos,
        distanciaTotal: distanciaInicial,
        activo: true
    };
    
    // Detener órbita si está activa
    pelotaState.orbitaPelota = null;
    
    console.log(`🚀 Iniciando viaje: distancia ${distanciaInicial.toFixed(1)}px, ${totalPasos} pasos`);
}

function avanzarPelota() {
    if (!pelotaState.viajePelota || !pelotaState.viajePelota.activo) return;
    
    const viaje = pelotaState.viajePelota;
    
    // Guardar posición anterior para interpolación
    pelotaState.posXAnterior = pelotaState.posX;
    pelotaState.posYAnterior = pelotaState.posY;
    
    // Calcular progreso normalizado (entre 0 y 1)
    const t = viaje.pasoActual / (viaje.totalPasos - 1);
    
    // Aplicar easing suave del Ensayo original
    const progreso = PelotaMath.easeInOutSineExtraSoft(t);
    
    // Obtener destino actualizado con transformación (las coordenadas ya están actualizadas)
    const destinoActualizado = {
        x: pelotaState.destinoActual.x,
        y: pelotaState.destinoActual.y
    };
    
    // Interpolación usando destino actualizado y easing suave
    pelotaState.posX = viaje.origenX + (destinoActualizado.x - viaje.origenX) * progreso;
    pelotaState.posY = viaje.origenY + (destinoActualizado.y - viaje.origenY) * progreso;
    
    // Avanzar paso
    viaje.pasoActual++;
    
    // Terminar si se llegó al destino
    if (viaje.pasoActual >= viaje.totalPasos) {
        // Limpiar estado del viaje
        pelotaState.viajePelota = null;
        
        // Registrar tiempo de llegada
        pelotaState.tiempoInicioDestino = performance.now();
        
        // Iniciar órbita
        iniciarOrbita();
        
        console.log(`🎯 Llegada al destino: (${pelotaState.posX.toFixed(1)}, ${pelotaState.posY.toFixed(1)})`);
    }
}

// === SISTEMA DE ÓRBITA (Basado en Ensayo Original) ===
function iniciarOrbita() {
    if (!pelotaState.destinoActual) return;
    
    pelotaState.orbitaPelota = {
        centroX: pelotaState.destinoActual.x,
        centroY: pelotaState.destinoActual.y,
        radio: 2, // Radio del Ensayo original
        fase: "despegue", // Fase inicial como en el Ensayo
        pasoDespegue: 0,
        totalDespegue: 4, // 4 pasos de despegue como en el Ensayo
        anguloActual: Math.PI / 4, // 45° para el primer salto diagonal
        velocidadAngular: 0.1, // Velocidad del Ensayo
        activa: true
    };
    
    console.log(`🌀 Iniciando órbita en destino: (${pelotaState.orbitaPelota.centroX.toFixed(1)}, ${pelotaState.orbitaPelota.centroY.toFixed(1)})`);
}

function orbitarPelota() {
    if (!pelotaState.orbitaPelota || !pelotaState.orbitaPelota.activa) return;
    
    const orbita = pelotaState.orbitaPelota;
    
    // Actualizar centro de órbita con las coordenadas transformadas del destino
    if (pelotaState.destinoActual) {
        orbita.centroX = pelotaState.destinoActual.x;
        orbita.centroY = pelotaState.destinoActual.y;
    }
    
    pelotaState.posXAnterior = pelotaState.posX;
    pelotaState.posYAnterior = pelotaState.posY;
    
    let newPosition;
    
    if (orbita.fase === "despegue") {
        // FASE DE DESPEGUE: Movimiento recto en dirección 45° (como en el Ensayo)
        const fraccion = (orbita.pasoDespegue + 1) / orbita.totalDespegue;
        const offset = orbita.radio * fraccion;
        
        newPosition = {
            x: orbita.centroX + offset * Math.cos(orbita.anguloActual),
            y: orbita.centroY + offset * Math.sin(orbita.anguloActual)
        };
        
        orbita.pasoDespegue++;
        
        if (orbita.pasoDespegue >= orbita.totalDespegue) {
            // Cambiar a fase de órbita circular
            orbita.fase = "orbita";
            // conservar el ángulo donde quedó
        }
        
    } else if (orbita.fase === "orbita") {
        // FASE DE ÓRBITA: Movimiento circular alrededor del centro
        orbita.anguloActual += orbita.velocidadAngular;
        orbita.anguloActual = PelotaMath.normalizarAngulo(orbita.anguloActual);
        
        newPosition = {
            x: orbita.centroX + orbita.radio * Math.cos(orbita.anguloActual),
            y: orbita.centroY + orbita.radio * Math.sin(orbita.anguloActual)
        };
    }
    
    if (newPosition) {
        pelotaState.posX = newPosition.x;
        pelotaState.posY = newPosition.y;
    }
}

// === ACTUALIZACIÓN DE COORDENADAS TRANSFORMADAS ===
function actualizarDestinoTransformado() {
    if (!pelotaState.destinoActual || !pelotaState.destinoActual.coordenadasBase) return;
    
    const transformMatrix = getTransformMatrix();
    if (transformMatrix) {
        const base = pelotaState.destinoActual.coordenadasBase;
        const coordenadasTransformadas = PelotaMath.applyTransform(base.x, base.y, transformMatrix);
        
        // Actualizar coordenadas del destino con las transformadas
        pelotaState.destinoActual.x = coordenadasTransformadas.x;
        pelotaState.destinoActual.y = coordenadasTransformadas.y;
    }
}

// === LÓGICA PRINCIPAL (30 FPS) ===
export function updatePelotaLogic(deltaTime, nivel) {
    if (!pelotaState.isInicializado) return;
    
    // Actualizar rotación permanente de la pelota
    pelotaState.anguloRotacion += pelotaState.velocidadRotacion;
    pelotaState.anguloRotacion = PelotaMath.normalizarAngulo(pelotaState.anguloRotacion);
    
    // Actualizar coordenadas del destino con matriz de transformación
    actualizarDestinoTransformado();
    
    switch (nivel) {
        case 1: {
            // Motor de pelota nivel 1: Alternado simple
            if (pelotaState.viajePelota) {
                avanzarPelota();
            } else if (pelotaState.orbitaPelota) {
                orbitarPelota();
                
                // Verificar tiempo de permanencia
                const tiempoActual = performance.now();
                const tiempoEnDestino = tiempoActual - pelotaState.tiempoInicioDestino;
                
                if (tiempoEnDestino >= pelotaState.tiempoPermanenciaDestino) {
                    // Tiempo cumplido, seleccionar nuevo destino
                    pelotaState.orbitaPelota = null;
                    seleccionarProximoDestino(nivel);
                }
            }
            break;
        }
        
        case 2: {
            // Motor de pelota nivel 2: Probabilístico con tiempo variable
            if (pelotaState.viajePelota) {
                avanzarPelota();
            } else if (pelotaState.orbitaPelota) {
                orbitarPelota();
                
                const tiempoActual = performance.now();
                const tiempoEnDestino = tiempoActual - pelotaState.tiempoInicioDestino;
                
                if (tiempoEnDestino >= pelotaState.tiempoPermanenciaDestino) {
                    pelotaState.orbitaPelota = null;
                    seleccionarProximoDestino(nivel);
                }
            }
            break;
        }
        
        default: {
            console.warn(`⚠️ Lógica de pelota no implementada para nivel ${nivel}`);
            break;
        }
    }
}

// === DIBUJO BASE (UNA VEZ AL INICIO) ===
function dibujarPelotaBase(nivel) {
    switch (nivel) {
        case 1:
        case 2: {
            // Asegurar que existe el canvas base
            ensurePelotaCanvas(1);
            const ctx1 = pelotaCanvases[1].getContext('2d');
            
            // Limpiar canvas base
            ctx1.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
            
            // Dibujar pelota en el CENTRO del canvas virtual
            ctx1.save();
            ctx1.translate(GAME_CONFIG.LOGICAL_WIDTH / 2, GAME_CONFIG.LOGICAL_HEIGHT / 2);
            
            // Dibujo de la pelota centrada en (0,0)
            ctx1.beginPath();
            ctx1.arc(0, 0, pelotaState.radio, 0, Math.PI * 2);
            
            // Gradiente radial estilo Ensayo (desplazado para efecto 3D)
            const gradX = pelotaState.radio * 0.25;  // 25% hacia la derecha
            const gradY = -pelotaState.radio * 0.25; // 25% hacia arriba
            
            const gradiente = ctx1.createRadialGradient(
                gradX, gradY, 0,
                gradX, gradY, pelotaState.radio * 2
            );
            
            // Usar colores normales del sistema (por ahora sin impacto)
            gradiente.addColorStop(0, pelotaState.color.normal.bright);    // Centro brillante
            gradiente.addColorStop(0.5, pelotaState.color.normal.mid);     // Intermedio
            gradiente.addColorStop(1, pelotaState.color.normal.dark);      // Borde oscuro
            
            ctx1.fillStyle = gradiente;
            ctx1.fill();
            
            ctx1.restore();
            
            console.log(`🎨 Pelota base dibujada para nivel ${nivel}`);
            break;
        }
        
        default: {
            console.warn(`⚠️ Dibujo de pelota base no implementado para nivel ${nivel}`);
            break;
        }
    }
}

// === COMPOSICIÓN CON TRANSFORMACIONES ===
function composePelota(nivel, posX, posY, anguloRotacion = 0) {
    // Asegurar canvas de composición pelota
    ensurePelotaCanvas(2);
    const ctxPelota = pelotaCanvases[2].getContext('2d');
    
    // Limpiar canvas de composición
    ctxPelota.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
    
    switch (nivel) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5: {
            // Todos los niveles: Posición + rotación permanente
            // (Por ahora pelota igual en todos los niveles hasta nuevo aviso)
            
            // Aplicar posición y rotación
            ctxPelota.save();
            ctxPelota.translate(posX, posY);
            ctxPelota.rotate(anguloRotacion);
            ctxPelota.drawImage(pelotaCanvases[1], 
                -GAME_CONFIG.LOGICAL_WIDTH / 2, 
                -GAME_CONFIG.LOGICAL_HEIGHT / 2
            );
            ctxPelota.restore();
            
            return 2; // Canvas final para todos los niveles
        }
        
        default: {
            console.warn(`⚠️ Composición de pelota no implementada para nivel ${nivel}`);
            return 1; // Fallback al canvas base
        }
    }
}

// === RENDERIZADO FINAL (CADA FRAME) ===
export function renderPelota(ctx, nivel, alpha = 1) {
    if (!pelotaState.isInicializado) return;
    
    // Interpolación de posición para renderizado suave
    const posXInterpolada = PelotaMath.lerp(pelotaState.posXAnterior, pelotaState.posX, alpha);
    const posYInterpolada = PelotaMath.lerp(pelotaState.posYAnterior, pelotaState.posY, alpha);
    
    // Usar rotación actual de la pelota (sin interpolación por simplicidad)
    const anguloRotacionActual = pelotaState.anguloRotacion;
    
    // Componer pelota con posición y transformaciones interpoladas
    const canvasFinal = composePelota(nivel, posXInterpolada, posYInterpolada, anguloRotacionActual);
    
    // Pegar resultado final en canvas principal
    if (pelotaCanvases[canvasFinal]) {
        ctx.drawImage(pelotaCanvases[canvasFinal], 0, 0);
    }
}

// === FUNCIONES DE GESTIÓN ===
// Redibujar pelota base (cuando cambia radio, colores, etc.)
export function redrawPelotaBase(nivel) {
    if (!pelotaState.isInicializado) return;
    dibujarPelotaBase(nivel);
    console.log('🔄 Pelota base redibujada');
}

// Limpiar todos los canvas de pelota (útil para resize)
export function clearAllPelotaCanvases() {
    Object.keys(pelotaCanvases).forEach(key => {
        const canvas = pelotaCanvases[key];
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, GAME_CONFIG.LOGICAL_WIDTH, GAME_CONFIG.LOGICAL_HEIGHT);
        }
    });
    console.log('🧹 Todos los canvas de pelota limpiados');
}

// === FUNCIONES DE ACCESO ===
export function getPelotaPosition() {
    return { 
        x: pelotaState.posX, 
        y: pelotaState.posY,
        radio: pelotaState.radio
    };
}

export function getPelotaState() {
    return {
        ...pelotaState,
        viajando: !!pelotaState.viajePelota,
        orbitando: !!pelotaState.orbitaPelota
    };
}

// === SISTEMA DE IMPACTO (PREPARADO PARA P4) ===
// Función para impacto de pelota (preparada para P4)
export function pelotaImpacto() {
    console.log('🎯 ¡Pelota impactada!');
    
    // Activar sistema de impacto
    pelotaState.impacto.activo = true;
    pelotaState.impacto.tiempoInicio = performance.now();
    pelotaState.impacto.intensidad = Math.min(100, pelotaState.impacto.intensidad + 60);
    
    // TODO P4: Implementar efectos visuales de impacto
    // TODO P4: Redibujar base con colores mezclados
    // TODO P4: Crear efectos de partículas en canvas virtual adicional
    // TODO P4: Sonidos de impacto
}

// Función para actualizar sistema de colores (preparada para P4)
function updatePelotaColor() {
    if (!pelotaState.impacto.activo) return;
    
    const tiempoActual = performance.now();
    const tiempoTranscurrido = tiempoActual - pelotaState.impacto.tiempoInicio;
    
    // Comenzar decaimiento después de la duración inicial
    if (tiempoTranscurrido > pelotaState.impacto.duracion) {
        pelotaState.impacto.intensidad -= pelotaState.impacto.decaimiento;
        
        if (pelotaState.impacto.intensidad <= 0) {
            pelotaState.impacto.intensidad = 0;
            pelotaState.impacto.activo = false;
            // TODO P4: Redibujar base con colores normales
        }
    }
}

// Función para mezclar colores (preparada para P4)
function blendColors(color1, color2, amount) {
    // TODO P4: Implementar mezcla de colores RGBA entre normal y hit
    // Por ahora devolver color normal
    return color1;
}

console.log('🎾 Pelota.js cargado - Sistema P3 implementado');