// pelota.js - Sistema de pelota del juego Rejas Espaciales V2

import { CanvasDimensions, GAME_CONFIG } from './config.js';
import { getCoordenadasCubiertas, getCoordenadasDescubiertas, getGridConfig, getTransformMatrix, getTransformMatrices, distanciaMaxima, getGridObj } from './grid.js';
import { relojJuego } from './relojJuego.js';
import { pelotaCambiaDestino } from './pelota-grado-impacto.js';

// === VARIABLES GLOBALES DE PELOTA ===

// === CONTROL DE ALTERNANCIA PARA DIFERENTES NIVELES ===
let destinoAlternar = true; // Para nivel 1: alternar cubierto/descubierto

// === CONTROL DE ALTERNANCIA NIVEL 3 CON REJAS INSTANCIADAS ===
let destinoAlternarNivel3 = 0; // 0: desc.reja1, 1: cub.reja2, 2: desc.reja2, 3: cub.reja1

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
    },

    easeInOutSine:(t) => {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    },

    easeInOutExpo:(t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return t < 0.5
          ? Math.pow(2, 20 * t - 10) / 2
          : (2 - Math.pow(2, -20 * t + 10)) / 2;
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
            
            pelotaState.posX = GAME_CONFIG.LOGICAL_WIDTH  *1.1;
            pelotaState.posY = GAME_CONFIG.LOGICAL_HEIGHT *0.7;
            pelotaState.posXAnterior = pelotaState.posX;
            pelotaState.posYAnterior = pelotaState.posY;
            
            console.log(`Configuración nivel 2: Radio ${pelotaState.radio}px, destinos probabilísticos, 1500ms permanencia, rotación 1 vuelta/2s`);
            
            if (pelotaState.isInicializado && radioCambio2) {
                console.log('📏 Radio cambió, redibujando pelota base');
                dibujarPelotaBase(nivel);
            }
            break;
        }
        
        case 3: {
            // === NIVEL 3: DESTINOS CON REJAS INSTANCIADAS ===
            pelotaState.tiempoPermanenciaDestino = 2000; // Tiempo fijo para testing
            pelotaState.velocidadRotacion = 0.104719755; // 1 vuelta cada 2 segundos
            
            // Radio basado en el promedio de las configuraciones de ambas rejas
            // Como nivel 3 no tiene grid unificado, usar radio base más conservador
            pelotaState.radio = 12; // Radio fijo apropiado para nivel 3
            
            // Posición inicial centrada
            pelotaState.posX = GAME_CONFIG.LOGICAL_WIDTH / 2;
            pelotaState.posY = GAME_CONFIG.LOGICAL_HEIGHT / 2;
            pelotaState.posXAnterior = pelotaState.posX;
            pelotaState.posYAnterior = pelotaState.posY;
            
            // Reiniciar ciclo de alternancia nivel 3
            destinoAlternarNivel3 = 0; // Empezar con descubierto de reja1
            
            console.log(`Configuración nivel 3: Radio ${pelotaState.radio}px, ciclo alternado entre rejas instanciadas, 2000ms permanencia`);
            console.log(`   Patrón: desc.reja1 → cub.reja2 → desc.reja2 → cub.reja1 → (repite)`);
            
            if (pelotaState.isInicializado) {
                console.log('📏 Redibujando pelota base para nivel 3');
                dibujarPelotaBase(nivel);
            }
            break;
        }
        
        default: {
            console.warn(`⚠️ Configuración por defecto para nivel ${nivel}`);
            pelotaState.tiempoPermanenciaDestino = 2000;
            pelotaState.velocidadRotacion = 0.104719755; // 1 vuelta cada 2 segundos
            
            // Radio por defecto basado en CanvasDimensions.uml
            if (!CanvasDimensions.uml || CanvasDimensions.uml <= 0) {
                throw new Error(`❌ CanvasDimensions.uml no disponible en initPelota(). Valor: ${CanvasDimensions.uml}`);
            }
            
            pelotaState.radio = Math.round(CanvasDimensions.uml * 40);
            console.log(`✅ Radio desde CanvasDimensions: ${pelotaState.radio}px (uml: ${CanvasDimensions.uml})`);
            
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

function seleccionarProximoDestino(nivel) {
    // 🎯 GRADO IMPACTO: Decrementar cuando pelota cambia destino
    pelotaCambiaDestino();
    
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
            // Motor de destinos nivel 2: Probabilístico (45% cubierto, 55% descubierto)
            const esCubierto = Math.random() < 0.45;
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
        
        case 3: {
            // === MOTOR DE DESTINOS NIVEL 3: ALTERNANCIA ENTRE REJAS INSTANCIADAS ===
            
            const reja1 = getGridObj('reja1');
            const reja2 = getGridObj('reja2');
            
            if (!reja1 || !reja2) {
                console.warn(`⚠️ GridObj no encontrados para nivel 3: reja1=${!!reja1}, reja2=${!!reja2}`);
                return;
            }
            
            let coordenadas = [];
            let rejaSeleccionada = '';
            let tipoDestino = '';
            
            // Patrón de alternancia específico:
            // 0: destino descubierto de reja1
            // 1: destino cubierto reja2  
            // 2: destino descubierto reja2
            // 3: destino cubierto reja1
            switch (destinoAlternarNivel3) {
                case 0: {
                    coordenadas = reja1.getCoordenadasDescubiertas();
                    rejaSeleccionada = 'reja1';
                    tipoDestino = 'descubierto';
                    break;
                }
                case 1: {
                    coordenadas = reja2.getCoordenadasCubiertas();
                    rejaSeleccionada = 'reja2';
                    tipoDestino = 'cubierto';
                    break;
                }
                case 2: {
                    coordenadas = reja2.getCoordenadasDescubiertas();
                    rejaSeleccionada = 'reja2';
                    tipoDestino = 'descubierto';
                    break;
                }
                case 3: {
                    coordenadas = reja1.getCoordenadasCubiertas();
                    rejaSeleccionada = 'reja1';
                    tipoDestino = 'cubierto';
                    break;
                }
                default: {
                    destinoAlternarNivel3 = 0; // Reset si hay error
                    coordenadas = reja1.getCoordenadasDescubiertas();
                    rejaSeleccionada = 'reja1';
                    tipoDestino = 'descubierto';
                    break;
                }
            }
            
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
                    tipo: tipoDestino,
                    reja: rejaSeleccionada,
                    ciclo: destinoAlternarNivel3
                };
                
               

                console.log(`✅ DESTINO ASIGNADO: ${tipoDestino} de ${rejaSeleccionada} (ciclo ${destinoAlternarNivel3})`);
                
                // Tiempo fijo de permanencia para testing (luego se puede hacer variable)
                pelotaState.tiempoPermanenciaDestino = 2000;
                
                // Destino seleccionado (log mínimo arriba)
                
                // Avanzar al siguiente paso del ciclo
                //destinoAlternarNivel3 = (destinoAlternarNivel3 + 1) % 4;
                destinoAlternarNivel3 = 0;

                // Iniciar viaje hacia el destino
                iniciarViajePelota(pelotaState.destinoActual);
            } else {
                console.warn(`⚠️ No hay coordenadas ${tipoDestino} disponibles en ${rejaSeleccionada}`);
                
                // Intentar con el siguiente paso del ciclo
                //destinoAlternarNivel3 = (destinoAlternarNivel3 + 1) % 4;
                destinoAlternarNivel3 = 0;
                
                seleccionarProximoDestino(nivel); // Reintentar
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
    const proporcion = distanciaInicial / distanciaMaxima;
    console.log("Proporcion",proporcion, distanciaInicial, distanciaMaxima);
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
    
    // Viaje iniciado
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
   // const progreso = PelotaMath.easeInOutSineExtraSoft(t);
   //const progreso = PelotaMath.easeInOutExpo(t);
   const progreso = PelotaMath.easeInOutSine(t);
    
    
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
    
    // === NIVEL 3: USAR MATRIZ ESPECÍFICA DE LA REJA CORRESPONDIENTE ===
    const nivelActual = window.gameInstance ? window.gameInstance.currentLevel : 1;
    

if (nivelActual ==3) {
    debugger;
}

    if (nivelActual === 3 && pelotaState.destinoActual.reja) {
        // Nivel 3: obtener matriz de la reja específica
        const reja = getGridObj(pelotaState.destinoActual.reja);
        console.log(`🔧 MATRIZ ESPECÍFICA: ${pelotaState.destinoActual.reja} - reja:${!!reja} matriz:${!!(reja?.transformMatrix)}`);
        debugger;
        if (reja && reja.transformMatrix) {
            const base = pelotaState.destinoActual.coordenadasBase;
            const coordenadasTransformadas = reja.applyTransformMatrix(base.x, base.y);
            
            // Actualizar coordenadas del destino con matriz específica de la reja
            pelotaState.destinoActual.x = coordenadasTransformadas.x;
            pelotaState.destinoActual.y = coordenadasTransformadas.y;
            
            // Matriz aplicada correctamente (sin log repetitivo)
        } else {
            console.warn(`⚠️ [MATRIZ] No se encontró reja ${pelotaState.destinoActual.reja} o sin matriz de transformación`);
        }
        
    } else {
        // Niveles 1 y 2: usar matriz tradicional unificada
        const transformMatrix = getTransformMatrix(); // Sin parámetro = matriz tradicional
        if (transformMatrix) {
            const base = pelotaState.destinoActual.coordenadasBase;
            const coordenadasTransformadas = PelotaMath.applyTransform(base.x, base.y, transformMatrix);
            
            // Actualizar coordenadas del destino con las transformadas
            pelotaState.destinoActual.x = coordenadasTransformadas.x;
            pelotaState.destinoActual.y = coordenadasTransformadas.y;
        }
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

        case 3: {
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
export function dibujarPelotaBase(nivel) {
    switch (nivel) {
        case 1:
        case 2:
        case 3: {
            // Asegurar que existe el canvas base
            ensurePelotaCanvas(1);
            
            // Verificar que CanvasDimensions.uml esté disponible
            if (!CanvasDimensions.uml || CanvasDimensions.uml <= 0) {
                throw new Error(`❌ CanvasDimensions.uml no disponible en dibujarPelotaBase(). Valor: ${CanvasDimensions.uml}`);
            }
            
            const nuevoRadio = Math.round(CanvasDimensions.uml * 50);
            console.log(`✅ Radio base desde CanvasDimensions: ${nuevoRadio}px (uml: ${CanvasDimensions.uml})`);
            
            // Si cambió el radio, marcar para redibujar
            const radioCambio = pelotaState.radio !== nuevoRadio;
            pelotaState.radio = nuevoRadio;



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
            const gradX = pelotaState.radio * 0.5;  // % hacia la derecha
            const gradY = -pelotaState.radio * 0.5; // % hacia arriba
            
            const gradiente = ctx1.createRadialGradient(
                gradX, gradY, 0,
                gradX, gradY, pelotaState.radio *2
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
    
    // SINCRONIZACIÓN CRÍTICA: Actualizar destino con matriz actual en renderizado
    // Esto asegura que la pelota use la misma matriz interpolada que el grid
    if (pelotaState.destinoActual && pelotaState.destinoActual.coordenadasBase) {
        // === NIVEL 3: USAR MATRIZ ESPECÍFICA DE LA REJA CORRESPONDIENTE ===
        if (nivel === 3 && pelotaState.destinoActual.reja) {
            // Nivel 3: obtener matriz de la reja específica (60 FPS con interpolación)
            const reja = getGridObj(pelotaState.destinoActual.reja);
            console.log(`🎾 RENDER MATRIZ: ${pelotaState.destinoActual.reja} - reja:${!!reja} matriz:${!!(reja?.transformMatrix)}`);
            
            if (reja && reja.transformMatrix) {
                const base = pelotaState.destinoActual.coordenadasBase;
                const coordenadasTransformadas = reja.applyTransformMatrix(base.x, base.y);
                
                // Actualizar coordenadas del destino con matriz específica interpolada
                pelotaState.destinoActual.x = coordenadasTransformadas.x;
                pelotaState.destinoActual.y = coordenadasTransformadas.y;
            }
            
                 } else {
             // Niveles 1 y 2: usar matriz tradicional unificada
             const transformMatrix = getTransformMatrix(); // Sin parámetro = matriz tradicional (60 FPS)
             if (transformMatrix) {
                 const base = pelotaState.destinoActual.coordenadasBase;
                 const coordenadasTransformadas = PelotaMath.applyTransform(base.x, base.y, transformMatrix);
                 
                 // Actualizar coordenadas del destino con matriz de renderizado actual
                 pelotaState.destinoActual.x = coordenadasTransformadas.x;
                 pelotaState.destinoActual.y = coordenadasTransformadas.y;
             }
         }
    }
    
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

// ============================================================================
// 🧪 FUNCIONES DE DEBUG Y CONFIGURACIÓN NIVEL 3
// ============================================================================

// === CONTROL DEL CICLO DE ALTERNANCIA NIVEL 3 ===
window.debugPelotaNivel3 = function() {
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    if (!reja1 || !reja2) {
        console.log("🧪 [DEBUG] Rejas no encontradas para nivel 3");
        return null;
    }
    
    const coordCubReja1 = reja1.getCoordenadasCubiertas().length;
    const coordDescReja1 = reja1.getCoordenadasDescubiertas().length;
    const coordCubReja2 = reja2.getCoordenadasCubiertas().length;
    const coordDescReja2 = reja2.getCoordenadasDescubiertas().length;
    
    const estado = {
        cicloActual: destinoAlternarNivel3,
        proximoDestino: ['desc.reja1', 'cub.reja2', 'desc.reja2', 'cub.reja1'][destinoAlternarNivel3],
        destinoActual: pelotaState.destinoActual,
        tiempoPermanencia: pelotaState.tiempoPermanenciaDestino,
        estadoPelota: {
            viajando: !!pelotaState.viajePelota,
            orbitando: !!pelotaState.orbitaPelota,
            posicion: { x: pelotaState.posX.toFixed(1), y: pelotaState.posY.toFixed(1) }
        },
        coordenadasDisponibles: {
            reja1: { cubiertas: coordCubReja1, descubiertas: coordDescReja1 },
            reja2: { cubiertas: coordCubReja2, descubiertas: coordDescReja2 }
        }
    };
    
    console.log("🧪 [DEBUG] Estado Pelota Nivel 3:");
    console.log(`   🔄 Ciclo actual: ${estado.cicloActual} (${estado.proximoDestino})`);
    console.log(`   🎯 Destino actual: ${estado.destinoActual?.tipo || 'ninguno'} de ${estado.destinoActual?.reja || 'ninguna'}`);
    console.log(`   ⏱️ Tiempo permanencia: ${estado.tiempoPermanencia}ms`);
    console.log(`   🎾 Estado: ${estado.estadoPelota.viajando ? 'viajando' : estado.estadoPelota.orbitando ? 'orbitando' : 'inactiva'}`);
    console.log(`   📍 Posición: (${estado.estadoPelota.posicion.x}, ${estado.estadoPelota.posicion.y})`);
    console.log(`   📊 Coordenadas disponibles:`);
    console.log(`     Reja1: ${estado.coordenadasDisponibles.reja1.cubiertas} cub, ${estado.coordenadasDisponibles.reja1.descubiertas} desc`);
    console.log(`     Reja2: ${estado.coordenadasDisponibles.reja2.cubiertas} cub, ${estado.coordenadasDisponibles.reja2.descubiertas} desc`);
    
    return estado;
};

// === FORZAR PASO DEL CICLO ===
window.debugForzarSiguienteDestino = function() {
    if (!pelotaState.isInicializado) {
        console.log("🧪 [DEBUG] Sistema de pelota no inicializado");
        return;
    }
    
    // Detener viaje y órbita actuales
    pelotaState.viajePelota = null;
    pelotaState.orbitaPelota = null;
    
    // Seleccionar siguiente destino
    seleccionarProximoDestino(3);
    
    console.log("🧪 [DEBUG] Forzado salto al siguiente destino del ciclo");
    return window.debugPelotaNivel3();
};

// === CONFIGURAR CICLO ESPECÍFICO ===
window.debugSetCicloNivel3 = function(ciclo) {
    if (ciclo < 0 || ciclo > 3) {
        console.log("🧪 [DEBUG] Ciclo debe ser 0-3 (0:desc.reja1, 1:cub.reja2, 2:desc.reja2, 3:cub.reja1)");
        return;
    }
    
    destinoAlternarNivel3 = ciclo;
    console.log(`🧪 [DEBUG] Ciclo nivel 3 configurado a: ${ciclo} (${['desc.reja1', 'cub.reja2', 'desc.reja2', 'cub.reja1'][ciclo]})`);
    
    return ciclo;
};

// === CONFIGURAR TIEMPO DE PERMANENCIA ===
window.debugSetTiempoPermanencia = function(milisegundos) {
    if (milisegundos < 100 || milisegundos > 10000) {
        console.log("🧪 [DEBUG] Tiempo debe estar entre 100-10000ms");
        return;
    }
    
    pelotaState.tiempoPermanenciaDestino = milisegundos;
    console.log(`🧪 [DEBUG] Tiempo de permanencia configurado a: ${milisegundos}ms`);
    
    return milisegundos;
};

// === SALTAR INMEDIATAMENTE A DESTINO ESPECÍFICO ===
window.debugIrADestino = function(reja, tipo) {
    if (!['reja1', 'reja2'].includes(reja)) {
        console.log("🧪 [DEBUG] Reja debe ser 'reja1' o 'reja2'");
        return;
    }
    
    if (!['cubierto', 'descubierto'].includes(tipo)) {
        console.log("🧪 [DEBUG] Tipo debe ser 'cubierto' o 'descubierto'");
        return;
    }
    
    const gridObj = getGridObj(reja);
    if (!gridObj) {
        console.log(`🧪 [DEBUG] ${reja} no encontrada`);
        return;
    }
    
    const coordenadas = tipo === 'cubierto' 
        ? gridObj.getCoordenadasCubiertas()
        : gridObj.getCoordenadasDescubiertas();
    
    if (!coordenadas || coordenadas.length === 0) {
        console.log(`🧪 [DEBUG] No hay coordenadas ${tipo} en ${reja}`);
        return;
    }
    
    // Detener movimientos actuales
    pelotaState.viajePelota = null;
    pelotaState.orbitaPelota = null;
    
    // Seleccionar coordenada aleatoria
    const indiceAleatorio = Math.floor(Math.random() * coordenadas.length);
    const coordenadaSeleccionada = coordenadas[indiceAleatorio];
    
    pelotaState.destinoActual = {
        x: coordenadaSeleccionada.x,
        y: coordenadaSeleccionada.y,
        coordenadasBase: {
            x: coordenadaSeleccionada.baseX,
            y: coordenadaSeleccionada.baseY
        },
        tipo: tipo,
        reja: reja,
        ciclo: 'manual'
    };
    
    iniciarViajePelota(pelotaState.destinoActual);
    
    console.log(`🧪 [DEBUG] Forzado viaje a destino ${tipo} de ${reja}`);
    console.log(`   Coord: (${coordenadaSeleccionada.x.toFixed(1)}, ${coordenadaSeleccionada.y.toFixed(1)})`);
    
    return pelotaState.destinoActual;
};

// === MOSTRAR TODAS LAS COORDENADAS DISPONIBLES ===
window.debugMostrarCoordenadasNivel3 = function() {
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    if (!reja1 || !reja2) {
        console.log("🧪 [DEBUG] Rejas no encontradas");
        return null;
    }
    
    const resultado = {
        reja1: {
            cubiertas: reja1.getCoordenadasCubiertas(),
            descubiertas: reja1.getCoordenadasDescubiertas()
        },
        reja2: {
            cubiertas: reja2.getCoordenadasCubiertas(),
            descubiertas: reja2.getCoordenadasDescubiertas()
        }
    };
    
    console.log("🧪 [DEBUG] Coordenadas Nivel 3:");
    console.log("📊 REJA1 (2x3):");
    console.log(`   Cubiertas: ${resultado.reja1.cubiertas.length} coords`);
    resultado.reja1.cubiertas.forEach((coord, i) => {
        console.log(`     ${i}: (${coord.x.toFixed(1)}, ${coord.y.toFixed(1)}) base:(${coord.baseX.toFixed(1)}, ${coord.baseY.toFixed(1)})`);
    });
    console.log(`   Descubiertas: ${resultado.reja1.descubiertas.length} coords`);
    resultado.reja1.descubiertas.forEach((coord, i) => {
        console.log(`     ${i}: (${coord.x.toFixed(1)}, ${coord.y.toFixed(1)}) base:(${coord.baseX.toFixed(1)}, ${coord.baseY.toFixed(1)})`);
    });
    
    console.log("📊 REJA2 (3x4):");
    console.log(`   Cubiertas: ${resultado.reja2.cubiertas.length} coords`);
    resultado.reja2.cubiertas.forEach((coord, i) => {
        console.log(`     ${i}: (${coord.x.toFixed(1)}, ${coord.y.toFixed(1)}) base:(${coord.baseX.toFixed(1)}, ${coord.baseY.toFixed(1)})`);
    });
    console.log(`   Descubiertas: ${resultado.reja2.descubiertas.length} coords`);
    resultado.reja2.descubiertas.forEach((coord, i) => {
        console.log(`     ${i}: (${coord.x.toFixed(1)}, ${coord.y.toFixed(1)}) base:(${coord.baseX.toFixed(1)}, ${coord.baseY.toFixed(1)})`);
    });
    
    return resultado;
};

console.log("🧪 [DEBUG] Funciones de pelota nivel 3 disponibles:");
console.log("   debugPelotaNivel3() - Ver estado completo del sistema");
console.log("   debugForzarSiguienteDestino() - Saltar al siguiente destino del ciclo");
console.log("   debugSetCicloNivel3(0-3) - Configurar ciclo específico");
console.log("   debugSetTiempoPermanencia(ms) - Configurar tiempo de permanencia");
console.log("   debugIrADestino('reja1'|'reja2', 'cubierto'|'descubierto') - Ir a destino específico");
console.log("   debugMostrarCoordenadasNivel3() - Mostrar todas las coordenadas disponibles");
console.log("💡 [EJEMPLOS]:");
console.log("   debugSetCicloNivel3(0) - Empezar por descubierto reja1");
console.log("   debugSetTiempoPermanencia(1500) - Permanecer 1.5 segundos en cada destino");
console.log("   debugIrADestino('reja2', 'cubierto') - Ir inmediatamente a cubierto de reja2");

// ============================================================================
// 🩺 FUNCIONES DE DIAGNÓSTICO AVANZADO PARA TROUBLESHOOTING
// ============================================================================

// === DIAGNÓSTICO COMPLETO DEL CICLO DE ALTERNANCIA ===
window.debugDiagnosticoCicloNivel3 = function() {
    console.log("🩺 [DIAGNÓSTICO] Análisis completo del ciclo de alternancia nivel 3:");
    
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    console.log(`📊 [DIAGNÓSTICO] Estado de GridObj:`);
    console.log(`   reja1: ${reja1 ? '✅ encontrada' : '❌ NO encontrada'}`);
    console.log(`   reja2: ${reja2 ? '✅ encontrada' : '❌ NO encontrada'}`);
    
    if (!reja1 || !reja2) {
        console.log("❌ [DIAGNÓSTICO] No se pueden analizar las rejas - objetos no encontrados");
        return { error: "GridObj no encontrados" };
    }
    
    // Obtener coordenadas de cada reja
    const reja1Cub = reja1.getCoordenadasCubiertas();
    const reja1Desc = reja1.getCoordenadasDescubiertas();
    const reja2Cub = reja2.getCoordenadasCubiertas();
    const reja2Desc = reja2.getCoordenadasDescubiertas();
    
    console.log(`📈 [DIAGNÓSTICO] Coordenadas disponibles:`);
    console.log(`   Reja1 - Cubiertas: ${reja1Cub.length} | Descubiertas: ${reja1Desc.length}`);
    console.log(`   Reja2 - Cubiertas: ${reja2Cub.length} | Descubiertas: ${reja2Desc.length}`);
    
    // Simular cada paso del ciclo para verificar disponibilidad
    const simulacionCiclo = [];
    for (let ciclo = 0; ciclo < 4; ciclo++) {
        let coordenadas = [];
        let rejaSeleccionada = '';
        let tipoDestino = '';
        let error = null;
        
        switch (ciclo) {
            case 0:
                coordenadas = reja1Desc;
                rejaSeleccionada = 'reja1';
                tipoDestino = 'descubierto';
                break;
            case 1:
                coordenadas = reja2Cub;
                rejaSeleccionada = 'reja2';
                tipoDestino = 'cubierto';
                break;
            case 2:
                coordenadas = reja2Desc;
                rejaSeleccionada = 'reja2';
                tipoDestino = 'descubierto';
                break;
            case 3:
                coordenadas = reja1Cub;
                rejaSeleccionada = 'reja1';
                tipoDestino = 'cubierto';
                break;
        }
        
        if (!coordenadas || coordenadas.length === 0) {
            error = `No hay coordenadas ${tipoDestino} en ${rejaSeleccionada}`;
        }
        
        simulacionCiclo.push({
            ciclo,
            descripcion: `${tipoDestino} de ${rejaSeleccionada}`,
            coordenadas: coordenadas.length,
            valido: !error,
            error
        });
        
        const estado = error ? '❌' : '✅';
        console.log(`   ${estado} Ciclo ${ciclo}: ${tipoDestino} de ${rejaSeleccionada} (${coordenadas.length} coords) ${error ? `- ${error}` : ''}`);
    }
    
    // Estado actual del sistema
    console.log(`🎯 [DIAGNÓSTICO] Estado actual:`);
    console.log(`   Ciclo actual: ${destinoAlternarNivel3}`);
    console.log(`   Próximo destino: ${simulacionCiclo[destinoAlternarNivel3]?.descripcion || 'ERROR'}`);
    console.log(`   Destino pelota actual: ${pelotaState.destinoActual?.tipo || 'ninguno'} de ${pelotaState.destinoActual?.reja || 'ninguna'}`);
    
    // Análisis de problemas
    const problemasEncontrados = simulacionCiclo.filter(paso => !paso.valido);
    if (problemasEncontrados.length > 0) {
        console.log(`⚠️ [DIAGNÓSTICO] ${problemasEncontrados.length} problema(s) encontrado(s):`);
        problemasEncontrados.forEach(problema => {
            console.log(`   ❌ Ciclo ${problema.ciclo}: ${problema.error}`);
        });
    } else {
        console.log(`✅ [DIAGNÓSTICO] Todos los pasos del ciclo son válidos`);
    }
    
    return {
        gridObjsEncontrados: { reja1: !!reja1, reja2: !!reja2 },
        coordenadasDisponibles: {
            reja1: { cubiertas: reja1Cub.length, descubiertas: reja1Desc.length },
            reja2: { cubiertas: reja2Cub.length, descubiertas: reja2Desc.length }
        },
        simulacionCiclo,
        cicloActual: destinoAlternarNivel3,
        problemasEncontrados,
        todosLosPassosValidos: problemasEncontrados.length === 0
    };
};

// === FORZAR TEST DE CADA PASO DEL CICLO ===
window.debugTestearCadaPasoCiclo = async function() {
    console.log("🧪 [TEST] Probando cada paso del ciclo de alternancia:");
    
    const resultados = [];
    
    for (let ciclo = 0; ciclo < 4; ciclo++) {
        console.log(`\n🔄 [TEST] Probando ciclo ${ciclo}:`);
        
        // Configurar ciclo específico
        debugSetCicloNivel3(ciclo);
        
        // Intentar ir al siguiente destino
        const estadoAntes = { ...pelotaState.destinoActual };
        debugForzarSiguienteDestino();
        const estadoDespues = { ...pelotaState.destinoActual };
        
        const exitoso = estadoDespues && estadoDespues.reja && estadoDespues.tipo;
        
        resultados.push({
            ciclo,
            exitoso,
            destinoGenerado: estadoDespues,
            cambioDetectado: JSON.stringify(estadoAntes) !== JSON.stringify(estadoDespues)
        });
        
        console.log(`   ${exitoso ? '✅' : '❌'} Resultado: ${estadoDespues?.tipo || 'ERROR'} de ${estadoDespues?.reja || 'ERROR'}`);
        
        // Esperar un poco para que se pueda observar
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 [TEST] Resumen de resultados:`);
    const exitosos = resultados.filter(r => r.exitoso).length;
    console.log(`   ✅ Exitosos: ${exitosos}/4`);
    console.log(`   ❌ Fallidos: ${4 - exitosos}/4`);
    
    if (exitosos === 4) {
        console.log(`🎉 [TEST] ¡Todos los pasos del ciclo funcionan correctamente!`);
    } else {
        console.log(`⚠️ [TEST] Algunos pasos fallan - revisar configuración de rejas`);
    }
    
    return resultados;
};

// === MONITOREO EN TIEMPO REAL ===
window.debugMonitorearCiclo = function(duracionSegundos = 30) {
    console.log(`👁️ [MONITOR] Iniciando monitoreo del ciclo por ${duracionSegundos} segundos...`);
    
    let contadores = {
        'desc.reja1': 0,
        'cub.reja2': 0,
        'desc.reja2': 0,
        'cub.reja1': 0
    };
    
    let ultimoDestino = null;
    
    const intervalo = setInterval(() => {
        const destinoActual = pelotaState.destinoActual;
        
        if (destinoActual && destinoActual.reja && destinoActual.tipo) {
            const clave = `${destinoActual.tipo.substring(0, 3)}.${destinoActual.reja}`;
            
            // Solo contar si cambió el destino
            if (JSON.stringify(destinoActual) !== JSON.stringify(ultimoDestino)) {
                contadores[clave]++;
                console.log(`📍 [MONITOR] Nuevo destino: ${clave} (total: ${contadores[clave]})`);
                ultimoDestino = { ...destinoActual };
            }
        }
    }, 500); // Verificar cada 500ms
    
    // Detener después del tiempo especificado
    setTimeout(() => {
        clearInterval(intervalo);
        
        console.log(`📊 [MONITOR] Resumen después de ${duracionSegundos}s:`);
        Object.entries(contadores).forEach(([tipo, count]) => {
            console.log(`   ${tipo}: ${count} veces`);
        });
        
        const total = Object.values(contadores).reduce((a, b) => a + b, 0);
        const balanceado = Math.max(...Object.values(contadores)) - Math.min(...Object.values(contadores)) <= 1;
        
        console.log(`   Total destinos: ${total}`);
        console.log(`   Distribución: ${balanceado ? '✅ Balanceada' : '⚠️ Desbalanceada'}`);
        
        if (contadores['cub.reja2'] > 0 && contadores['desc.reja1'] === 0) {
            console.log(`🚨 [MONITOR] PROBLEMA DETECTADO: Solo usa reja2, nunca reja1`);
        }
        
    }, duracionSegundos * 1000);
    
    return `Monitoreo iniciado por ${duracionSegundos} segundos`;
};

console.log("🩺 [DIAGNÓSTICO] Funciones de troubleshooting disponibles:");
console.log("   debugDiagnosticoCicloNivel3() - Análisis completo del ciclo");
console.log("   debugTestearCadaPasoCiclo() - Probar cada paso del ciclo individualmente");  
console.log("   debugMonitorearCiclo(segundos) - Monitorear en tiempo real qué destinos se usan");
console.log("💡 [TROUBLESHOOTING]:");
console.log("   Si solo aparece reja2: debugDiagnosticoCicloNivel3() para ver si reja1 tiene coordenadas");
console.log("   Para test sistemático: debugTestearCadaPasoCiclo()");
console.log("   Para observar comportamiento: debugMonitorearCiclo(20)");

// === VERIFICACIÓN DE MATRICES DE TRANSFORMACIÓN ===
window.debugVerificarMatricesTransformacion = function() {
    console.log("🔄 [MATRICES] Verificando matrices de transformación de rejas:");
    
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    if (!reja1 || !reja2) {
        console.log("❌ [MATRICES] GridObj no encontrados");
        return;
    }
    
    console.log("📊 [MATRICES] Estado de transformaciones:");
    
    // Verificar reja1
    const transformReja1 = reja1.getTransformacion ? reja1.getTransformacion() : null;
    console.log(`   Reja1 (2x3):`);
    console.log(`     ✓ Posición: (${reja1.posX?.toFixed(1) || 'N/A'}, ${reja1.posY?.toFixed(1) || 'N/A'})`);
    console.log(`     ✓ Rotación: ${reja1.anguloRotacion?.toFixed(1) || 'N/A'}°`);
    console.log(`     ✓ Flotación: (${reja1.offsetX?.toFixed(1) || 'N/A'}, ${reja1.offsetY?.toFixed(1) || 'N/A'})`);
    if (transformReja1) {
        console.log(`     ✓ Matriz: [${transformReja1.a?.toFixed(3)}, ${transformReja1.b?.toFixed(3)}, ${transformReja1.c?.toFixed(3)}, ${transformReja1.d?.toFixed(3)}, ${transformReja1.e?.toFixed(1)}, ${transformReja1.f?.toFixed(1)}]`);
    }
    
    // Verificar reja2  
    const transformReja2 = reja2.getTransformacion ? reja2.getTransformacion() : null;
    console.log(`   Reja2 (3x4):`);
    console.log(`     ✓ Posición: (${reja2.posX?.toFixed(1) || 'N/A'}, ${reja2.posY?.toFixed(1) || 'N/A'})`);
    console.log(`     ✓ Rotación: ${reja2.anguloRotacion?.toFixed(1) || 'N/A'}°`);
    console.log(`     ✓ Flotación: (${reja2.offsetX?.toFixed(1) || 'N/A'}, ${reja2.offsetY?.toFixed(1) || 'N/A'})`);
    if (transformReja2) {
        console.log(`     ✓ Matriz: [${transformReja2.a?.toFixed(3)}, ${transformReja2.b?.toFixed(3)}, ${transformReja2.c?.toFixed(3)}, ${transformReja2.d?.toFixed(3)}, ${transformReja2.e?.toFixed(1)}, ${transformReja2.f?.toFixed(1)}]`);
    }
    
    // Verificar coordenadas actualizadas
    console.log("🎯 [MATRICES] Coordenadas actuales después de transformación:");
    
    const reja1Desc = reja1.getCoordenadasDescubiertas();
    const reja1Cub = reja1.getCoordenadasCubiertas();
    const reja2Desc = reja2.getCoordenadasDescubiertas();
    const reja2Cub = reja2.getCoordenadasCubiertas();
    
    if (reja1Desc.length > 0) {
        const ejemplo1 = reja1Desc[0];
        console.log(`   Reja1 primera desc: (${ejemplo1.x.toFixed(1)}, ${ejemplo1.y.toFixed(1)}) | base: (${ejemplo1.baseX?.toFixed(1) || 'N/A'}, ${ejemplo1.baseY?.toFixed(1) || 'N/A'})`);
    }
    
    if (reja2Desc.length > 0) {
        const ejemplo2 = reja2Desc[0];
        console.log(`   Reja2 primera desc: (${ejemplo2.x.toFixed(1)}, ${ejemplo2.y.toFixed(1)}) | base: (${ejemplo2.baseX?.toFixed(1) || 'N/A'}, ${ejemplo2.baseY?.toFixed(1) || 'N/A'})`);
    }
    
    return {
        reja1: {
            encontrada: !!reja1,
            posicion: { x: reja1?.posX, y: reja1?.posY },
            rotacion: reja1?.anguloRotacion,
            flotacion: { x: reja1?.offsetX, y: reja1?.offsetY },
            transformacion: transformReja1,
            coordenadas: { descubiertas: reja1Desc.length, cubiertas: reja1Cub.length }
        },
        reja2: {
            encontrada: !!reja2,
            posicion: { x: reja2?.posX, y: reja2?.posY },
            rotacion: reja2?.anguloRotacion,
            flotacion: { x: reja2?.offsetX, y: reja2?.offsetY },
            transformacion: transformReja2,
            coordenadas: { descubiertas: reja2Desc.length, cubiertas: reja2Cub.length }
        }
    };
};

// === COMPARAR COORDENADAS ANTES Y DESPUÉS DE TRANSFORMACIÓN ===
window.debugCompararCoordenadasTransformadas = function() {
    console.log("🔍 [COORDENADAS] Comparando coordenadas base vs transformadas:");
    
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    if (!reja1 || !reja2) {
        console.log("❌ [COORDENADAS] GridObj no encontrados");
        return;
    }
    
    // Función auxiliar para mostrar comparación
    const mostrarComparacion = (reja, nombre) => {
        console.log(`\n📐 [COORDENADAS] ${nombre}:`);
        
        // Obtener coordenadas base si están disponibles
        const coordenadasBase = reja.coordenadasBase || null;
        const descubiertasActuales = reja.getCoordenadasDescubiertas();
        const cubiertasActuales = reja.getCoordenadasCubiertas();
        
        if (coordenadasBase) {
            console.log(`   Base descubiertas: ${coordenadasBase.descubiertas?.length || 0}`);
            console.log(`   Base cubiertas: ${coordenadasBase.cubiertas?.length || 0}`);
        } else {
            console.log(`   ⚠️ No hay coordenadas base disponibles`);
        }
        
        console.log(`   Actuales descubiertas: ${descubiertasActuales.length}`);
        console.log(`   Actuales cubiertas: ${cubiertasActuales.length}`);
        
        // Mostrar ejemplos si hay coordenadas
        if (descubiertasActuales.length > 0) {
            const ejemplo = descubiertasActuales[0];
            if (ejemplo.baseX !== undefined && ejemplo.baseY !== undefined) {
                const deltaX = ejemplo.x - ejemplo.baseX;
                const deltaY = ejemplo.y - ejemplo.baseY;
                console.log(`   Ejemplo transformación: base(${ejemplo.baseX.toFixed(1)}, ${ejemplo.baseY.toFixed(1)}) → actual(${ejemplo.x.toFixed(1)}, ${ejemplo.y.toFixed(1)}) | delta(${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`);
            } else {
                console.log(`   ⚠️ Coordenadas base no disponibles en las coordenadas transformadas`);
            }
        }
    };
    
    mostrarComparacion(reja1, "Reja1 (2x3)");
    mostrarComparacion(reja2, "Reja2 (3x4)");
    
    return {
        reja1: {
            descubiertas: reja1.getCoordenadasDescubiertas().length,
            cubiertas: reja1.getCoordenadasCubiertas().length
        },
        reja2: {
            descubiertas: reja2.getCoordenadasDescubiertas().length,
            cubiertas: reja2.getCoordenadasCubiertas().length
        }
    };
};

console.log("🔄 [MATRICES] Funciones de verificación de transformaciones:");
console.log("   debugVerificarMatricesTransformacion() - Ver estado de matrices y transformaciones");
console.log("   debugCompararCoordenadasTransformadas() - Comparar coordenadas base vs actuales");

// === VERIFICACIÓN DE APLICACIÓN CORRECTA DE MATRICES POR REJA ===
window.debugVerificarMatricesPorReja = function() {
    console.log("🔍 [MATRICES-REJA] Verificando aplicación correcta de matrices por reja:");
    
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    
    if (!reja1 || !reja2) {
        console.log("❌ [MATRICES-REJA] GridObj no encontrados");
        return;
    }
    
    // Obtener ejemplos de coordenadas de cada reja
    const reja1Desc = reja1.getCoordenadasDescubiertas();
    const reja1Cub = reja1.getCoordenadasCubiertas();
    const reja2Desc = reja2.getCoordenadasDescubiertas();
    const reja2Cub = reja2.getCoordenadasCubiertas();
    
    console.log("📊 [MATRICES-REJA] Coordenadas actuales aplicando matriz específica:");
    
    // Verificar reja1
    if (reja1Desc.length > 0) {
        const ejemplo1 = reja1Desc[0];
        console.log(`   ✅ Reja1 desc[0]: (${ejemplo1.x.toFixed(1)}, ${ejemplo1.y.toFixed(1)}) | base: (${ejemplo1.baseX?.toFixed(1)}, ${ejemplo1.baseY?.toFixed(1)})`);
        
        // Verificar que la transformación sea correcta
        if (ejemplo1.baseX !== undefined && ejemplo1.baseY !== undefined) {
            const manualTransform = reja1.applyTransformMatrix(ejemplo1.baseX, ejemplo1.baseY);
            const diferencia = Math.hypot(manualTransform.x - ejemplo1.x, manualTransform.y - ejemplo1.y);
            if (diferencia < 0.1) {
                console.log(`     ✅ Matriz reja1 CORRECTA (dif: ${diferencia.toFixed(3)})`);
            } else {
                console.log(`     ❌ Matriz reja1 INCORRECTA (dif: ${diferencia.toFixed(3)}) - manual: (${manualTransform.x.toFixed(1)}, ${manualTransform.y.toFixed(1)})`);
            }
        }
    }
    
    // Verificar reja2
    if (reja2Desc.length > 0) {
        const ejemplo2 = reja2Desc[0];
        console.log(`   ✅ Reja2 desc[0]: (${ejemplo2.x.toFixed(1)}, ${ejemplo2.y.toFixed(1)}) | base: (${ejemplo2.baseX?.toFixed(1)}, ${ejemplo2.baseY?.toFixed(1)})`);
        
        // Verificar que la transformación sea correcta
        if (ejemplo2.baseX !== undefined && ejemplo2.baseY !== undefined) {
            const manualTransform = reja2.applyTransformMatrix(ejemplo2.baseX, ejemplo2.baseY);
            const diferencia = Math.hypot(manualTransform.x - ejemplo2.x, manualTransform.y - ejemplo2.y);
            if (diferencia < 0.1) {
                console.log(`     ✅ Matriz reja2 CORRECTA (dif: ${diferencia.toFixed(3)})`);
            } else {
                console.log(`     ❌ Matriz reja2 INCORRECTA (dif: ${diferencia.toFixed(3)}) - manual: (${manualTransform.x.toFixed(1)}, ${manualTransform.y.toFixed(1)})`);
            }
        }
    }
    
    // Verificar destino actual de la pelota
    console.log("🎯 [MATRICES-REJA] Estado del destino actual de la pelota:");
    if (pelotaState.destinoActual) {
        const destino = pelotaState.destinoActual;
        console.log(`   Destino: ${destino.tipo} de ${destino.reja || 'sin especificar'}`);
        console.log(`   Posición actual: (${destino.x?.toFixed(1)}, ${destino.y?.toFixed(1)})`);
        console.log(`   Base: (${destino.coordenadasBase?.x?.toFixed(1)}, ${destino.coordenadasBase?.y?.toFixed(1)})`);
        
        // Verificar que se esté usando la matriz correcta
        if (destino.reja && destino.coordenadasBase) {
            const rejaDestino = getGridObj(destino.reja);
            if (rejaDestino) {
                const transformManual = rejaDestino.applyTransformMatrix(destino.coordenadasBase.x, destino.coordenadasBase.y);
                const diferencia = Math.hypot(transformManual.x - destino.x, transformManual.y - destino.y);
                
                if (diferencia < 0.1) {
                    console.log(`   ✅ Destino usa matriz CORRECTA de ${destino.reja} (dif: ${diferencia.toFixed(3)})`);
                } else {
                    console.log(`   ❌ Destino usa matriz INCORRECTA - debería ser: (${transformManual.x.toFixed(1)}, ${transformManual.y.toFixed(1)}) (dif: ${diferencia.toFixed(3)})`);
                }
            }
        }
    } else {
        console.log(`   ⚠️ No hay destino actual establecido`);
    }
    
    return {
        reja1: { 
            descubiertas: reja1Desc.length, 
            cubiertas: reja1Cub.length,
            transformMatrix: !!reja1.transformMatrix
        },
        reja2: { 
            descubiertas: reja2Desc.length, 
            cubiertas: reja2Cub.length,
            transformMatrix: !!reja2.transformMatrix
        },
        destinoActual: pelotaState.destinoActual ? {
            tipo: pelotaState.destinoActual.tipo,
            reja: pelotaState.destinoActual.reja,
            tieneCoordenadasBase: !!pelotaState.destinoActual.coordenadasBase
        } : null
    };
};

// === TEST ESPECÍFICO DE ALTERNANCIA REJA1/REJA2 ===
window.debugTestAlternanciaEspecifica = function() {
    console.log("🔄 [ALTERNANCIA] Test específico de alternancia reja1/reja2:");
    
    // Forzar cada paso y verificar que use la matriz correcta
    const resultados = [];
    
    for (let ciclo = 0; ciclo < 4; ciclo++) {
        console.log(`\n🧪 [TEST] === Ciclo ${ciclo} ===`);
        
        // Configurar ciclo específico
        debugSetCicloNivel3(ciclo);
        
        // Forzar ir al siguiente destino
        debugForzarSiguienteDestino();
        
        // Verificar el destino generado
        const destino = pelotaState.destinoActual;
        if (destino && destino.reja) {
            console.log(`   Destino: ${destino.tipo} de ${destino.reja}`);
            console.log(`   Posición: (${destino.x?.toFixed(1)}, ${destino.y?.toFixed(1)})`);
            
            // Verificar matriz
            const rejaDestino = getGridObj(destino.reja);
            if (rejaDestino && destino.coordenadasBase) {
                const transformManual = rejaDestino.applyTransformMatrix(destino.coordenadasBase.x, destino.coordenadasBase.y);
                const diferencia = Math.hypot(transformManual.x - destino.x, transformManual.y - destino.y);
                
                const correcto = diferencia < 0.1;
                console.log(`   Matriz: ${correcto ? '✅ CORRECTA' : '❌ INCORRECTA'} (dif: ${diferencia.toFixed(3)})`);
                
                resultados.push({
                    ciclo,
                    descripcion: `${destino.tipo} de ${destino.reja}`,
                    matrizCorrecta: correcto,
                    diferencia
                });
            } else {
                console.log(`   ❌ No se pudo verificar matriz`);
                resultados.push({
                    ciclo,
                    descripcion: `${destino.tipo} de ${destino.reja}`,
                    matrizCorrecta: false,
                    diferencia: Infinity
                });
            }
        } else {
            console.log(`   ❌ No se generó destino válido`);
            resultados.push({
                ciclo,
                descripcion: 'ERROR - sin destino',
                matrizCorrecta: false,
                diferencia: Infinity
            });
        }
    }
    
    console.log(`\n📊 [ALTERNANCIA] Resumen de test:`);
    const correctos = resultados.filter(r => r.matrizCorrecta).length;
    console.log(`   ✅ Matrices correctas: ${correctos}/4`);
    console.log(`   ❌ Matrices incorrectas: ${4 - correctos}/4`);
    
    if (correctos === 4) {
        console.log(`🎉 [ALTERNANCIA] ¡Todas las matrices se aplican correctamente!`);
    } else {
        console.log(`⚠️ [ALTERNANCIA] Algunas matrices tienen problemas`);
    }
    
    return resultados;
};

console.log("🔍 [MATRICES-REJA] Funciones específicas de verificación:");
console.log("   debugVerificarMatricesPorReja() - Verificar que cada reja use su matriz correcta");
console.log("   debugTestAlternanciaEspecifica() - Test completo de alternancia con verificación de matrices");
console.log("💡 [USAR PARA TROUBLESHOOTING]:");
console.log("   Si pelota no va a reja1: debugVerificarMatricesPorReja()");
console.log("   Para test completo: debugTestAlternanciaEspecifica()");

// === DEBUG ESPECÍFICO: RASTREADOR DE ALTERNANCIA EN TIEMPO REAL ===
window.debugRastreadorAlternancia = function() {
    console.log("🕵️ [RASTREADOR] Iniciando rastreador de alternancia en tiempo real...");
    
    let contadorCiclos = { 0: 0, 1: 0, 2: 0, 3: 0 };
    let contadorRejas = { reja1: 0, reja2: 0 };
    let ultimoCiclo = -1;
    let ultimaReja = '';
    
    const intervalo = setInterval(() => {
        // Verificar estado actual
        const cicloActual = destinoAlternarNivel3;
        const destinoActual = pelotaState.destinoActual;
        
        // Detectar cambios en el ciclo
        if (cicloActual !== ultimoCiclo) {
            console.log(`🔄 [RASTREADOR] Cambio de ciclo: ${ultimoCiclo} → ${cicloActual}`);
            contadorCiclos[cicloActual]++;
            ultimoCiclo = cicloActual;
        }
        
        // Detectar cambios en la reja del destino
        if (destinoActual && destinoActual.reja && destinoActual.reja !== ultimaReja) {
            console.log(`🎯 [RASTREADOR] Cambio de reja: ${ultimaReja} → ${destinoActual.reja}`);
            contadorRejas[destinoActual.reja]++;
            ultimaReja = destinoActual.reja;
            
            // Mostrar información detallada del destino
            console.log(`   📍 Destino: ${destinoActual.tipo} de ${destinoActual.reja}`);
            console.log(`   📍 Ciclo: ${destinoActual.ciclo}`);
            console.log(`   📍 Coordenadas: (${destinoActual.x?.toFixed(1)}, ${destinoActual.y?.toFixed(1)})`);
            console.log(`   📍 Base: (${destinoActual.coordenadasBase?.x?.toFixed(1)}, ${destinoActual.coordenadasBase?.y?.toFixed(1)})`);
        }
        
    }, 500); // Verificar cada 500ms
    
    // Parar después de 30 segundos y mostrar resumen
    setTimeout(() => {
        clearInterval(intervalo);
        
        console.log(`\n📊 [RASTREADOR] RESUMEN después de 30 segundos:`);
        console.log(`   Ciclos ejecutados:`);
        console.log(`     Ciclo 0 (desc.reja1): ${contadorCiclos[0]} veces`);
        console.log(`     Ciclo 1 (cub.reja2): ${contadorCiclos[1]} veces`);
        console.log(`     Ciclo 2 (desc.reja2): ${contadorCiclos[2]} veces`);
        console.log(`     Ciclo 3 (cub.reja1): ${contadorCiclos[3]} veces`);
        
        console.log(`   Rejas usadas:`);
        console.log(`     reja1: ${contadorRejas.reja1} veces`);
        console.log(`     reja2: ${contadorRejas.reja2} veces`);
        
        const totalCiclos = Object.values(contadorCiclos).reduce((a, b) => a + b, 0);
        const totalRejas = Object.values(contadorRejas).reduce((a, b) => a + b, 0);
        
        console.log(`   Total cambios de ciclo: ${totalCiclos}`);
        console.log(`   Total cambios de reja: ${totalRejas}`);
        
        // Diagnóstico del problema
        if (contadorRejas.reja2 > 0 && contadorRejas.reja1 === 0) {
            console.log(`🚨 [PROBLEMA DETECTADO] Solo usa reja2, nunca reja1`);
            console.log(`   ❌ Posibles causas:`);
            console.log(`     1. Reja1 no tiene coordenadas disponibles`);
            console.log(`     2. Error en la lógica de ciclo 0 y 3`);
            console.log(`     3. Siempre falla al seleccionar reja1 y salta a reja2`);
            console.log(`   💡 Ejecutar: debugDiagnosticoCicloNivel3() para analizar`);
        } else if (contadorRejas.reja1 === 0 && contadorRejas.reja2 === 0) {
            console.log(`⚠️ [PROBLEMA] No detectó cambios de reja - pelota no se mueve o no hay destinos`);
        } else {
            console.log(`✅ [OK] Alternancia funcionando correctamente`);
        }
        
    }, 30000);
    
    return "Rastreador iniciado por 30 segundos...";
};

// === DEBUG INSTANTÁNEO DEL ESTADO ACTUAL ===
window.debugEstadoInstantaneo = function() {
    console.log("📸 [INSTANTÁNEO] Estado actual del sistema:");
    
    console.log(`🔢 Variables de control:`);
    console.log(`   destinoAlternarNivel3: ${destinoAlternarNivel3}`);
    
    console.log(`🎯 Estado del destino actual:`);
    if (pelotaState.destinoActual) {
        const d = pelotaState.destinoActual;
        console.log(`   ✅ Existe destino:`);
        console.log(`     Tipo: ${d.tipo || 'NO ESPECIFICADO'}`);
        console.log(`     Reja: ${d.reja || 'NO ESPECIFICADO'}`);
        console.log(`     Ciclo: ${d.ciclo ?? 'NO ESPECIFICADO'}`);
        console.log(`     Posición: (${d.x?.toFixed(1) || 'N/A'}, ${d.y?.toFixed(1) || 'N/A'})`);
        console.log(`     Base: (${d.coordenadasBase?.x?.toFixed(1) || 'N/A'}, ${d.coordenadasBase?.y?.toFixed(1) || 'N/A'})`);
    } else {
        console.log(`   ❌ NO hay destino actual`);
    }
    
    console.log(`🏗️ Estado de GridObj:`);
    const reja1 = getGridObj('reja1');
    const reja2 = getGridObj('reja2');
    console.log(`   reja1: ${reja1 ? '✅ existe' : '❌ NO existe'}`);
    console.log(`   reja2: ${reja2 ? '✅ existe' : '❌ NO existe'}`);
    
    if (reja1) {
        const r1desc = reja1.getCoordenadasDescubiertas();
        const r1cub = reja1.getCoordenadasCubiertas();
        console.log(`   reja1 coords: ${r1desc.length} desc, ${r1cub.length} cub`);
    }
    
    if (reja2) {
        const r2desc = reja2.getCoordenadasDescubiertas();
        const r2cub = reja2.getCoordenadasCubiertas();
        console.log(`   reja2 coords: ${r2desc.length} desc, ${r2cub.length} cub`);
    }
    
    console.log(`🎾 Estado de la pelota:`);
    console.log(`   Posición: (${pelotaState.posX?.toFixed(1)}, ${pelotaState.posY?.toFixed(1)})`);
    console.log(`   Viaje activo: ${pelotaState.viajePelota ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   Órbita activa: ${pelotaState.orbitaPelota ? '✅ SÍ' : '❌ NO'}`);
    
    return {
        cicloActual: destinoAlternarNivel3,
        destinoActual: pelotaState.destinoActual,
        reja1Existe: !!reja1,
        reja2Existe: !!reja2,
        viajeActivo: !!pelotaState.viajePelota,
        orbitaActiva: !!pelotaState.orbitaPelota
    };
};

console.log("🕵️ [RASTREADOR] Funciones de diagnóstico de alternancia:");
console.log("   debugRastreadorAlternancia() - Monitoreo en tiempo real por 30 segundos");
console.log("   debugEstadoInstantaneo() - Snapshot del estado actual del sistema");
console.log("💡 [PARA DIAGNOSTICAR 'SIEMPRE REJA2']:");
console.log("   1. debugEstadoInstantaneo() - Ver estado actual");
console.log("   2. debugRastreadorAlternancia() - Monitorear 30s");
console.log("   3. Si solo reja2: debugDiagnosticoCicloNivel3() - Ver disponibilidad");

// === VERIFICACIÓN SIMPLE DEL SISTEMA DE MATRICES ===
window.debugVerificarMatricesRapido = function() {
    const nivel = window.gameInstance ? window.gameInstance.currentLevel : 1;
    const destino = pelotaState.destinoActual;
    
    console.log(`🔧 Nivel: ${nivel}, Destino: ${destino?.tipo || 'ninguno'} de ${destino?.reja || 'ninguna'}`);
    
    if (nivel === 3 && destino?.reja) {
        const reja = getGridObj(destino.reja);
        console.log(`   Reja encontrada: ${!!reja}, Matriz: ${!!(reja?.transformMatrix)}`);
    }
};