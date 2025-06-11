// Sistema de movimiento de la pelota
let ballMovement = {
    // Variables para el nuevo sistema de movimiento
    viajePelota: null,  // Almacena el estado del viaje actual
    orbitaPelota: null, // Almacena el estado de la órbita actual
    
    config: {
        // Configuración de rotación
        rotationSpeed: 0.005,    // Velocidad de rotación en radianes por frame
        currentAngle: 0,        // Ángulo actual
        lastTime: 0,            // Último tiempo de actualización
        isInitialized: false,
        
        // Configuración de movimiento hacia objetivos
        currentTarget: null,    // Objetivo actual
        moveSpeed: 0.05,        // Velocidad de movimiento (0-1, para interpolación)
        currentPosition: { x: 0, y: 0 }, // Posición actual de la pelota
        maintainRadius: 2,      // Radio base de 2 píxeles
        uncoveredMaintainRadius: 1.5, // Radio específico para estado descubierto
        coveredMaintainRadius: 1.5,    // Radio específico para estado cubierto

        // Control de estado
        isAtDestination: false,  // revisar donde se usa
        destinationThreshold: 4,  
        
        // 🆕 Variables para algoritmo adaptativo
        initialDistance: 0,      // Distancia inicial al seleccionar objetivo
        timeAtCurrentTarget: 0,  // Tiempo transcurrido desde selección del objetivo
        baseSpeed: 0.02,         // Velocidad base
        accelerationFactor: 1.0, // Factor de aceleración acumulativo
        frameCount: 0,           // Contador de frames para crecimiento parabólico
        isInStage1Complete: false, // Bandera para control de etapa 1
        isInStage2Complete: false, // 🆕 Bandera para control de etapa 2

        // 🆕 Control de acercamiento discreto nivel 2
        isInDiscreteApproach: false,  // Bandera para proceso de acercamiento discreto
        currentApproachDistance: 4.0   // Distancia actual para el acercamiento discreto
    },

    // ============================================================================
    // 🎯 FUNCIÓN AUXILIAR PARA OBTENER NIVEL ACTUAL
    // ============================================================================
    getCurrentLevel: function() {
        if (window.LevelManager) {
            return window.LevelManager.getCurrentLevelInfo().level;
        }
        if (window.gameState && window.gameState.currentLevel) {
            return window.gameState.currentLevel;
        }
        return 1; // Fallback seguro
    },

    // Inicializar el sistema
    init: function() {
        this.config.lastTime = performance.now();
        this.config.currentAngle = 0;
        this.config.isInitialized = true;
        console.log("Sistema de movimiento de pelota inicializado");
    },

    // Actualizar la rotación (primer algoritmo de movimiento)
    updateRotation: function() {
        if (!this.config.isInitialized) {
            this.init();
        }

        const currentTime = performance.now();
        const deltaTime = Math.min(currentTime - this.config.lastTime, 100);
        this.config.lastTime = currentTime;

        // Actualizar el ángulo
        this.config.currentAngle += this.config.rotationSpeed * deltaTime;
        
        // Mantener el ángulo entre 0 y 2π
        if (this.config.currentAngle >= Math.PI * 2) {
            this.config.currentAngle -= Math.PI * 2;
        }

        return this.config.currentAngle;
    },

    // Obtener el ángulo actual
    getCurrentAngle: function() {
        if (!this.config.isInitialized) {
            this.init();
        }
        return this.config.currentAngle;
    },

    // === Algoritmos para estado descubierto ===
    
    // Seleccionar un punto aleatorio de las coordenadas descubiertas
    selectRandomUncoveredTarget: function() {
        const currentLevel = this.getCurrentLevel();
        
        const coordenadas = window.obtenerCoordenadasDescubiertas();
        if (!coordenadas || coordenadas.length === 0) {
            console.error("No hay coordenadas descubiertas disponibles");
            return null;
        }
        
        const indiceAleatorio = Math.floor(Math.random() * coordenadas.length);
        this.config.currentTarget = coordenadas[indiceAleatorio];
        
        // 🆕 Reiniciar variables para algoritmo adaptativo
        this.config.timeAtCurrentTarget = 0;
        this.config.initialDistance = 0;
        this.config.frameCount = 0;  // Reiniciar contador de frames
        this.config.accelerationFactor = 1.0;  // Reiniciar factor de aceleración
        this.config.isInStage1Complete = false; // Reiniciar bandera de etapa 1
        this.config.isInStage2Complete = false; // Reiniciar bandera de etapa 2
        this.config.currentApproachDistance = 4.0; // Reiniciar distancia de aproximación
        
        return this.config.currentTarget;
    },

    // 🆕 FUNCIÓN VERIFICADORA DE PUNTOS VÁLIDOS
    verificarPuntoValido: function(target) {
        if (!target) return false;

        // Obtener todas las coordenadas actuales según el tipo
        const coordenadasActuales = target.tipo === "celda" 
            ? window.obtenerCoordenadasDescubiertas()
            : window.obtenerCoordenadasCubiertas();

        if (!coordenadasActuales || coordenadasActuales.length === 0) {
            console.warn("No hay coordenadas actuales disponibles para verificar");
            return false;
        }

        // Buscar si el punto existe en las coordenadas actuales
        const puntoExiste = coordenadasActuales.some(coord => {
            if (target.tipo === "celda") {
                return coord.indiceCelda &&
                    coord.indiceCelda.fila === target.indiceCelda.fila &&
                    coord.indiceCelda.columna === target.indiceCelda.columna;
            } else { // tipo "interseccion"
                return coord.indiceInterseccion &&
                    coord.indiceInterseccion.i_linea === target.indiceInterseccion.i_linea &&
                    coord.indiceInterseccion.j_linea === target.indiceInterseccion.j_linea;
            }
        });

        if (!puntoExiste) {
            console.warn("El punto destino ya no existe en la reja actual");
        }

        return puntoExiste;
    },

    // 🆕 MOVER HACIA OBJETIVO DESCUBIERTO CON SELECT CASE POR NIVEL
    moveToUncoveredTarget: function() {
    

        const currentLevel = this.getCurrentLevel();
        
        if (!this.config.currentTarget) {
            if (!this.selectRandomUncoveredTarget()) {
                return this.config.currentPosition;
            }
            this.config.frameCount = 0;
            this.config.accelerationFactor = 1.0;
        }

        // 🆕 Verificar si el punto actual es válido
        if (!this.verificarPuntoValido(this.config.currentTarget)) {
            console.log("Punto no válido, seleccionando nuevo punto...");
            if (!this.selectRandomUncoveredTarget()) {
                return this.config.currentPosition;
            }
            this.config.frameCount = 0;
            this.config.accelerationFactor = 1.0;
        }

        switch(currentLevel) {
            case 1: {
                const targetActualizado = window.getCentroCeldaActualizado(this.config.currentTarget.indiceCelda);
                if (!targetActualizado) {
                    console.error("No se pudo obtener la posición actualizada del destino descubierto");
                    return this.config.currentPosition;
                }

                // Calcular movimiento circular alrededor del punto actualizado
                const angle = this.getCurrentAngle();
                const radius = this.config.uncoveredMaintainRadius;
                const newPosition = {
                    x: targetActualizado.x + Math.cos(angle) * radius,
                    y: targetActualizado.y + Math.sin(angle) * radius
                };

                // Interpolar suavemente desde la posición actual hacia la nueva posición
                const current = this.config.currentPosition;
                const dx = newPosition.x - current.x;
                const dy = newPosition.y - current.y;
                
                this.config.currentPosition = {
                    x: current.x + dx * this.config.moveSpeed,
                    y: current.y + dy * this.config.moveSpeed
                };

                // Incrementar tiempo (basado solo en el estado del movimiento)
                this.config.timeAtCurrentTarget += 1/60;

                // Solo para debugging/verificación (ORIGINAL: distancia hacia newPosition)
                const distancia = Math.hypot(dx, dy);
                this.config.isAtDestination = distancia <= this.config.destinationThreshold;
                break;
            }
            
            case 2: {
                const targetActualizado = window.getCentroCeldaActualizado(this.config.currentTarget.indiceCelda);
                if (!targetActualizado) {
                    console.warn("No se pudo obtener la posición actualizada del destino");
                    return this.config.currentPosition;
                }

                const current = this.config.currentPosition;
                const dx = targetActualizado.x - current.x;
                const dy = targetActualizado.y - current.y;
                const distanciaActual = Math.hypot(dx, dy);

                // Log general de estado actual
              

                // Actualizar estado
                this.config.timeAtCurrentTarget += 1/60;
                this.config.isAtDestination = distanciaActual <= 2; // Mantenimiento a 2px

                if (distanciaActual > 4 && !this.config.isInStage1Complete) {
                    // ETAPA 1: VIAJE INICIAL CUADRÁTICO (> 4px)
                    const porcentajeBase = 0.02;
                    this.config.frameCount = (this.config.frameCount || 0) + 1;
                    const incremento = 0.00015 * Math.pow(this.config.frameCount, 2.0);
                    this.config.accelerationFactor = (this.config.accelerationFactor || 1.0) + incremento;
                    const porcentajeFinal = porcentajeBase * this.config.accelerationFactor;
                    
                    this.config.currentPosition = {
                        x: current.x + dx * porcentajeFinal,
                        y: current.y + dy * porcentajeFinal
                    };

                    // Si llegamos cerca de los 4px, marcamos la etapa 1 como completa
                    if (distanciaActual <= 4.1) {
                     
                        this.config.isInStage1Complete = true;
                        this.config.currentApproachDistance = 3.9; // Iniciamos en 3.9px para la etapa 2
                    }
                } else if (distanciaActual > 1.8 && !this.config.isInStage2Complete) {
                    // ETAPA 2: ACERCAMIENTO DISCRETO (4px > x > 1.8px)
                  
                    
                    // Calcular vector unitario de dirección
                    const magnitud = Math.hypot(dx, dy);
                    const vectorUnitarioX = dx / magnitud;
                    const vectorUnitarioY = dy / magnitud;
                    
                    // Posicionar la pelota directamente a la distancia actual de aproximación
                    const nuevaPosX = targetActualizado.x - (vectorUnitarioX * this.config.currentApproachDistance);
                    const nuevaPosY = targetActualizado.y - (vectorUnitarioY * this.config.currentApproachDistance);
                    
                    this.config.currentPosition = {
                        x: nuevaPosX,
                        y: nuevaPosY
                    };
                    
                    // Reducir la distancia para el próximo frame
                    const anteriorDistancia = this.config.currentApproachDistance;
                    this.config.currentApproachDistance = Math.max(1.8, this.config.currentApproachDistance - 0.5);
                    
                    // Si llegamos a 1.8px o menos, marcamos la etapa 2 como completa
                    if (this.config.currentApproachDistance <= 1.8) {
                      
                        this.config.isInStage2Complete = true;
                    }
                    
                  
                } else {
                    // ETAPA 3: MANTENIMIENTO CIRCULAR (cuando isInStage2Complete es true)
                  
                    
                    // Resetear banderas solo si volvemos a empezar con un nuevo punto
                    if (distanciaActual > 4) {
                       
                        this.config.isInStage1Complete = false;
                        this.config.isInStage2Complete = false;
                        this.config.currentApproachDistance = 4.0;
                    } else {
                        const angle = this.getCurrentAngle();
                        const radius = this.config.uncoveredMaintainRadius;
                        const newPosition = {
                            x: targetActualizado.x + Math.cos(angle) * radius,
                            y: targetActualizado.y + Math.sin(angle) * radius
                        };

                        this.config.currentPosition = newPosition;
                    }
                }
                
                break;
            }
            
            default: {
                console.warn(`⚠️ Nivel ${currentLevel} no implementado para movimiento descubierto, usando nivel 1`);
                // Fallback a nivel 1
                const targetActualizado = window.getCentroCeldaActualizado(this.config.currentTarget.indiceCelda);
                if (targetActualizado) {
                    const angle = this.getCurrentAngle();
                    const radius = this.config.uncoveredMaintainRadius;
                    const newPosition = {
                        x: targetActualizado.x + Math.cos(angle) * radius,
                        y: targetActualizado.y + Math.sin(angle) * radius
                    };
                    const current = this.config.currentPosition;
                    const dx = newPosition.x - current.x;
                    const dy = newPosition.y - current.y;
                    this.config.currentPosition = {
                        x: current.x + dx * this.config.moveSpeed,
                        y: current.y + dy * this.config.moveSpeed
                    };
                    // Tiempo e isAtDestination
                    this.config.timeAtCurrentTarget += 1/60;
                    const distancia = Math.hypot(dx, dy);
                    this.config.isAtDestination = distancia <= this.config.destinationThreshold;
                }
                break;
            }
        }

        return this.config.currentPosition;
    },

    // 🆕 FUNCIÓN UNIFICADA PARA MANTENER POSICIÓN EN DESTINO
    maintainPositionAtTarget: function() {
      
        if (!this.config.currentTarget) return this.config.currentPosition;

        // Recalcular coordenadas en tiempo real según el tipo de destino
        const coordenadasActuales = this.config.currentTarget.tipo === "celda" 
            ? window.obtenerCoordenadasDescubiertas()
            : window.obtenerCoordenadasCubiertas();

        if (!coordenadasActuales || coordenadasActuales.length === 0) {
            console.warn("No hay coordenadas actuales disponibles");
            return this.config.currentPosition;
        }

        // Buscar la coordenada correspondiente al target actual
        let targetActualizado = null;
        for (const coord of coordenadasActuales) {
            if (this.config.currentTarget.tipo === "celda") {
                if (coord.indiceCelda && 
                    coord.indiceCelda.fila === this.config.currentTarget.indiceCelda.fila &&
                    coord.indiceCelda.columna === this.config.currentTarget.indiceCelda.columna) {
                    targetActualizado = coord;
                    break;
                }
            } else { // tipo "interseccion"
                if (coord.indiceInterseccion && 
                    coord.indiceInterseccion.i_linea === this.config.currentTarget.indiceInterseccion.i_linea &&
                    coord.indiceInterseccion.j_linea === this.config.currentTarget.indiceInterseccion.j_linea) {
                    targetActualizado = coord;
                    break;
                }
            }
        }

        if (!targetActualizado) {
            console.warn("No se encontró el punto destino en las coordenadas actuales");
            return this.config.currentPosition;
        }

        // Obtener el radio según el tipo de destino
        const radius = this.config.currentTarget.tipo === "celda" 
            ? this.config.uncoveredMaintainRadius 
            : this.config.coveredMaintainRadius;

        // Calcular offset de mantenimiento
        const angle = this.getCurrentAngle();
        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle * 1.5) * radius;

        // Aplicar offset directamente a la posición actualizada del target
        const newPosition = {
            x: targetActualizado.x + offsetX,
            y: targetActualizado.y + offsetY
        };

        // Verificar que las coordenadas sean válidas
        if (isNaN(newPosition.x) || isNaN(newPosition.y)) {
            console.error("Error al calcular nueva posición - usando offset fijo de seguridad");
            // Usar offset fijo de 2px en x y 2px en y desde el punto destino
            return {
                x: targetActualizado.x + 2,
                y: targetActualizado.y + 2
            };
        }

        this.config.currentPosition = newPosition;
        return this.config.currentPosition;
    },

    // 🆕 MANTENER POSICIÓN DESCUBIERTA CON SELECT CASE POR NIVEL
    maintainUncoveredPosition: function() {
        const currentLevel = this.getCurrentLevel();
        
        if (!this.config.currentTarget) return this.config.currentPosition;

        switch(currentLevel) {
            case 1:
            case 2:
                return this.maintainPositionAtTarget();
            
            default: {
                console.warn(`⚠️ Nivel ${currentLevel} no implementado para mantener posición descubierta, usando función unificada`);
                return this.maintainPositionAtTarget();
            }
        }
    },

    // === Algoritmos para estado cubierto ===
    
    // Seleccionar un punto aleatorio de las coordenadas cubiertas
    selectRandomCoveredTarget: function() {
        const currentLevel = this.getCurrentLevel();
        
        const coordenadas = window.obtenerCoordenadasCubiertas();
        if (!coordenadas || coordenadas.length === 0) {
            console.error("No hay coordenadas cubiertas disponibles");
            return null;
        }
        
        const indiceAleatorio = Math.floor(Math.random() * coordenadas.length);
        this.config.currentTarget = coordenadas[indiceAleatorio];
        
        // 🆕 Reiniciar variables para algoritmo adaptativo
        this.config.timeAtCurrentTarget = 0;
        this.config.initialDistance = 0;
        this.config.frameCount = 0;  // Reiniciar contador de frames
        this.config.accelerationFactor = 1.0;  // Reiniciar factor de aceleración
        this.config.isInStage1Complete = false; // Reiniciar bandera de etapa 1
        this.config.isInStage2Complete = false; // Reiniciar bandera de etapa 2
        this.config.currentApproachDistance = 4.0; // Reiniciar distancia de aproximación
        
        return this.config.currentTarget;
    },

    // 🆕 MOVER HACIA OBJETIVO CUBIERTO CON SELECT CASE POR NIVEL
    moveToCoveredTarget: function() {
        const currentLevel = this.getCurrentLevel();
        
        if (!this.config.currentTarget) {
            if (!this.selectRandomCoveredTarget()) {
                return this.config.currentPosition;
            }
        }

        // 🆕 Verificar si el punto actual es válido
        if (!this.verificarPuntoValido(this.config.currentTarget)) {
            console.log("Punto no válido, seleccionando nuevo punto...");
            if (!this.selectRandomCoveredTarget()) {
                return this.config.currentPosition;
            }
        }

        // Obtener posición actualizada del destino
        const targetActualizado = window.getInterseccionActualizada(this.config.currentTarget.indiceInterseccion);
        if (!targetActualizado) {
            console.error("❌ No se pudo obtener la posición actualizada del destino cubierto");
            return this.config.currentPosition;
        }

        switch(currentLevel) {
            case 1: {
                // Si hay un viaje en curso, continuarlo
                if (window.viajePelota) {
                    const newPosition = avanzarPelota(window.viajePelota.origen, targetActualizado);
                    // Actualizar isAtDestination basado en si el viaje terminó
                    this.config.isAtDestination = !window.viajePelota;
                    this.config.currentPosition = newPosition;
                    return this.config.currentPosition;
                }
                
                // Si hay una órbita en curso, continuarla
                if (window.orbitaPelota) {
                    const newPosition = orbitarPelota(targetActualizado);
                    this.config.isAtDestination = true;
                    this.config.currentPosition = newPosition;
                    return this.config.currentPosition;
                }
                
                // Si no hay ni viaje ni órbita, iniciar viaje
                iniciarViajePelota(
                    this.config.currentPosition,
                    targetActualizado,
                    500 // Valor temporal hasta que distanciaMaxima esté disponible
                );
                
                const newPosition = avanzarPelota(window.viajePelota.origen, targetActualizado);
                this.config.isAtDestination = false;
                this.config.currentPosition = newPosition;
                return this.config.currentPosition;
            }
            
            case 2: {
                // Por ahora mantener la lógica existente del nivel 2
                const current = this.config.currentPosition;
                const dx = targetActualizado.x - current.x;
                const dy = targetActualizado.y - current.y;
                const distanciaActual = Math.hypot(dx, dy);

                // Actualizar estado
                this.config.timeAtCurrentTarget += 1/60;
                this.config.isAtDestination = distanciaActual <= 2; // Mantenimiento a 2px

                if (distanciaActual > 4 && !this.config.isInStage1Complete) {
                    // ETAPA 1: VIAJE INICIAL CUADRÁTICO (> 4px)
                    const porcentajeBase = 0.02;
                    this.config.frameCount = (this.config.frameCount || 0) + 1;
                    const incremento = 0.00015 * Math.pow(this.config.frameCount, 2.0);
                    this.config.accelerationFactor = (this.config.accelerationFactor || 1.0) + incremento;
                    const porcentajeFinal = porcentajeBase * this.config.accelerationFactor;
                    
                    this.config.currentPosition = {
                        x: current.x + dx * porcentajeFinal,
                        y: current.y + dy * porcentajeFinal
                    };

                    // Si llegamos cerca de los 4px, marcamos la etapa 1 como completa
                    if (distanciaActual <= 4.1) {
                       
                        this.config.isInStage1Complete = true;
                        this.config.currentApproachDistance = 3.9; // Iniciamos en 3.9px para la etapa 2
                    }
                } else if (distanciaActual > 1.8 && !this.config.isInStage2Complete) {
                    // ETAPA 2: ACERCAMIENTO DISCRETO (4px > x > 1.8px)
                   
                    
                    // Calcular vector unitario de dirección
                    const magnitud = Math.hypot(dx, dy);
                    const vectorUnitarioX = dx / magnitud;
                    const vectorUnitarioY = dy / magnitud;
                    
                    // Posicionar la pelota directamente a la distancia actual de aproximación
                    const nuevaPosX = targetActualizado.x - (vectorUnitarioX * this.config.currentApproachDistance);
                    const nuevaPosY = targetActualizado.y - (vectorUnitarioY * this.config.currentApproachDistance);
                    
                    this.config.currentPosition = {
                        x: nuevaPosX,
                        y: nuevaPosY
                    };
                    
                    // Reducir la distancia para el próximo frame
                    const anteriorDistancia = this.config.currentApproachDistance;
                    this.config.currentApproachDistance = Math.max(1.8, this.config.currentApproachDistance - 0.5);
                    
                    // Si llegamos a 1.8px o menos, marcamos la etapa 2 como completa
                    if (this.config.currentApproachDistance <= 1.8) {
                      
                        this.config.isInStage2Complete = true;
                    }
                    
                   
                } else {
                    // ETAPA 3: MANTENIMIENTO CIRCULAR (cuando isInStage2Complete es true)
                 
                    
                    // Resetear banderas solo si volvemos a empezar con un nuevo punto
                    if (distanciaActual > 4) {
                       
                        this.config.isInStage1Complete = false;
                        this.config.isInStage2Complete = false;
                        this.config.currentApproachDistance = 4.0;
                    } else {
                        const angle = this.getCurrentAngle();
                        const radius = this.config.coveredMaintainRadius;
                        const newPosition = {
                            x: targetActualizado.x + Math.cos(angle) * radius,
                            y: targetActualizado.y + Math.sin(angle) * radius
                        };

                        this.config.currentPosition = newPosition;
                    }
                }
                
                break;
            }
            
            default: {
                console.warn(`⚠️ Nivel ${currentLevel} no implementado para movimiento cubierto`);
                // Fallback a nivel 1
                const targetActualizado = window.getInterseccionActualizada(this.config.currentTarget.indiceInterseccion);
                if (targetActualizado) {
                    const angle = this.getCurrentAngle();
                    const radius = this.config.coveredMaintainRadius;
                    const newPosition = {
                        x: targetActualizado.x + Math.cos(angle) * radius,
                        y: targetActualizado.y + Math.sin(angle) * radius
                    };
                    const current = this.config.currentPosition;
                    const dx = newPosition.x - current.x;
                    const dy = newPosition.y - current.y;
                    this.config.currentPosition = {
                        x: current.x + dx * this.config.moveSpeed,
                        y: current.y + dy * this.config.moveSpeed
                    };
                    // Tiempo e isAtDestination
                    this.config.timeAtCurrentTarget += 1/60;
                    const distancia = Math.hypot(dx, dy);
                    this.config.isAtDestination = distancia <= this.config.destinationThreshold;
                }
                break;
            }
        }

        return this.config.currentPosition;
    },

    // 🆕 MANTENER POSICIÓN CUBIERTA CON SELECT CASE POR NIVEL
    maintainCoveredPosition: function() {
        const currentLevel = this.getCurrentLevel();
        
        if (!this.config.currentTarget) return this.config.currentPosition;

        switch(currentLevel) {
            case 1:
            case 2:
                return this.maintainPositionAtTarget();
            
            default: {
                console.warn(`⚠️ Nivel ${currentLevel} no implementado para mantener posición cubierta, usando función unificada`);
                return this.maintainPositionAtTarget();
            }
        }
    },

    // Verificar si la pelota está en el destino
    isAtDestination: function() {
        return this.config.isAtDestination;
    },

    // Resetear estado de destino
    resetTimeAtDestination: function() {
        this.config.isAtDestination = false;
    }
};

// variable Global para que la pelota orbite segun funcion de ChatGpt
let orbitaPelota = null; // se activa cuando la pelota llegó y se queda girando

// funcion algoritmo hecho par viaje Pelota con ChatGpt
// Se llama una vez cuando se establece un nuevo destino
function iniciarViajePelota(origen, destino, distanciaMaxima) {
    // 1. Calcular distancia inicial
    const dx = destino.x - origen.x;
    const dy = destino.y - origen.y;
    const distanciaInicial = Math.hypot(dx, dy);
  
    // 2. Calcular proporción respecto a la distancia máxima
    const proporcion = distanciaInicial / distanciaMaxima;
  
    // 3. Aplicar corrección suave para evitar pasos demasiado pocos
    //    La curva suma un pequeño "impulso extra" si la distancia es corta
    const curvaImpulso = (1 - proporcion) ** 2; // cuadrática: más fuerte si es muy corta
  
    // 4. Determinar cantidad de pasos base
    const pasosBase = 44; // número máximo para distancia máxima
  
    const cantidadPasos = Math.round(pasosBase * proporcion + pasosBase * 0.25 * curvaImpulso);
    const totalPasos = Math.max(cantidadPasos, 6); // al menos 6 pasos
  
    // 5. Guardar estado del viaje
    viajePelota = {
      origen: { x: origen.x, y: origen.y },
      destino: { x: destino.x, y: destino.y },
      totalPasos: totalPasos,
      pasoActual: 0
    };
  }
  
  // funcion algoritmo pra viaje Pelotahecho con ChatGpt
  // Se llama cada frame si el viaje está activo
  function avanzarPelota(origen, destino) {
    if (!origen || !destino) return ballMovement.config.currentPosition;
  
    // Calcular progreso normalizado (entre 0 y 1)
    const t = pasoActual / (totalPasos - 1);
  
    // Aplicar easing elástico
    //const progreso = easeInOutSine(t);
    const progreso = easeInOutSine(easeInOutSine(t));


    // Obtener destino actualizado con transformación
    const destinoActualizado = window.applyTransformMatrix ? 
        window.applyTransformMatrix(destino.x, destino.y) : 
        destino;
  
    // Interpolación usando destino actualizado
    const newPosition = {
        x: origen.x + (destinoActualizado.x - origen.x) * progreso,
        y: origen.y + (destinoActualizado.y - origen.y) * progreso
    };

    // Actualizar la posición en el objeto ballMovement
    ballMovement.config.currentPosition = newPosition;
  
    // Avanzar paso
    pasoActual++;
  
    // Terminar si se llegó al destino
    if (pasoActual >= totalPasos) {
      window.viajePelota = null; // Limpiar estado del viaje
      pasoActual = 0; // reset para próximo viaje
      iniciarOrbita(destinoActualizado);  // inicia el estado orbital
    }

    return ballMovement.config.currentPosition;
  }
  
  // funcion algoritmo hecho con ChatGpt
  // la Elasticidad den el recorrido de la pelota
  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }
 
  


  // funcion algoritmo para Orbitar en destino hecho con ChatGpt
  // Inicia la orbita
  function iniciarOrbita(destinoActual) {
    orbitaPelota = {
      centro: { x: destinoActual.x, y: destinoActual.y }, // punto destino actualizado dinámicamente
      radio: 2,
      fase: "despegue",
      pasoDespegue: 0,
      totalDespegue: 4,
      anguloActual: Math.PI / 4 // 45° para el primer salto diagonal
    };
  }


// funcion algoritmo para Orbitar en destino hecho con ChatGpt
// sostiene la orbita
  function orbitarPelota(puntoDestinoActualizado) {
    if (!orbitaPelota) return ballMovement.config.currentPosition;
  
    // Recalcular el nuevo centro porque la reja se mueve
    orbitaPelota.centro = { x: puntoDestinoActualizado.x, y: puntoDestinoActualizado.y };
  
    const orbita = orbitaPelota;
    let newPosition;
    
    if (orbita.fase === "despegue") {
      // Movimiento recto en dirección 45° (PI/4)
      const fraccion = (orbita.pasoDespegue + 1) / orbita.totalDespegue;
      const offset = orbita.radio * fraccion;
  
      newPosition = {
          x: orbita.centro.x + offset * Math.cos(orbita.anguloActual),
          y: orbita.centro.y + offset * Math.sin(orbita.anguloActual)
      };
  
      orbita.pasoDespegue++;
  
      if (orbita.pasoDespegue >= orbita.totalDespegue) {
        // Cambiar a fase de órbita circular
        orbita.fase = "orbita";
        orbita.anguloActual = orbita.anguloActual; // conservar el ángulo donde quedó
      }
  
    } else if (orbita.fase === "orbita") {
      // Movimiento circular alrededor del centro
      orbita.anguloActual += 0.1; // velocidad angular
  
      newPosition = {
          x: orbita.centro.x + orbita.radio * Math.cos(orbita.anguloActual),
          y: orbita.centro.y + orbita.radio * Math.sin(orbita.anguloActual)
      };
    }

    // Actualizar la posición en el objeto ballMovement
    ballMovement.config.currentPosition = newPosition;
    return ballMovement.config.currentPosition;
  }


// Exportar al scope global
window.ballMovement = ballMovement; 

// Variables globales para control de viaje
let pasoActual = 0;
let totalPasos = 44; // valor base que se ajustará según distancia 