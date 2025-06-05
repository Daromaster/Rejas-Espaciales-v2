// Sistema de movimiento de la pelota
let ballMovement = {
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
        console.log("usando moveTuUncoveredTarget");
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
                console.log(`[UNCOVERED] Estado actual - Distancia: ${distanciaActual.toFixed(2)}px, Etapa1Completa: ${this.config.isInStage1Complete}`);

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
                        console.log(`[UNCOVERED] 🚩 ETAPA 1 COMPLETA - Distancia: ${distanciaActual.toFixed(2)}px`);
                        this.config.isInStage1Complete = true;
                        this.config.currentApproachDistance = 3.9; // Iniciamos en 3.9px para la etapa 2
                    }
                } else if (distanciaActual > 1.8 && !this.config.isInStage2Complete) {
                    // ETAPA 2: ACERCAMIENTO DISCRETO (4px > x > 1.8px)
                    console.log(`[UNCOVERED] 📏 ETAPA 2 - Distancia actual: ${distanciaActual.toFixed(2)}px, Próxima distancia objetivo: ${this.config.currentApproachDistance.toFixed(2)}px`);
                    
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
                    this.config.currentApproachDistance = Math.max(1.8, this.config.currentApproachDistance - 0.1);
                    
                    // Si llegamos a 1.8px o menos, marcamos la etapa 2 como completa
                    if (this.config.currentApproachDistance <= 1.8) {
                        console.log(`[UNCOVERED] 🏁 ETAPA 2 COMPLETA - Distancia final: ${this.config.currentApproachDistance.toFixed(2)}px`);
                        this.config.isInStage2Complete = true;
                    }
                    
                    console.log(`[UNCOVERED] ⬇️ Reducción: ${anteriorDistancia.toFixed(2)}px -> ${this.config.currentApproachDistance.toFixed(2)}px`);
                } else {
                    // ETAPA 3: MANTENIMIENTO CIRCULAR (cuando isInStage2Complete es true)
                    console.log(`[UNCOVERED] 🎉 ETAPA 3 - Distancia: ${distanciaActual.toFixed(2)}px`);
                    
                    // Resetear banderas solo si volvemos a empezar con un nuevo punto
                    if (distanciaActual > 4) {
                        console.log(`[UNCOVERED] 🔄 Reseteando banderas para nuevo ciclo`);
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
        console.log ("usando maintainPositionAtTarget");
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
            this.config.frameCount = 0;
            this.config.accelerationFactor = 1.0;
        }

        // 🆕 Verificar si el punto actual es válido
        if (!this.verificarPuntoValido(this.config.currentTarget)) {
            console.log("Punto no válido, seleccionando nuevo punto...");
            if (!this.selectRandomCoveredTarget()) {
                return this.config.currentPosition;
            }
            this.config.frameCount = 0;
            this.config.accelerationFactor = 1.0;
        }

        switch(currentLevel) {
            case 1: {
                const targetActualizado = window.getInterseccionActualizada(this.config.currentTarget.indiceInterseccion);
                if (!targetActualizado) {
                    console.error("❌ No se pudo obtener la posición actualizada del destino cubierto");
                    return this.config.currentPosition;
                }

                // Calcular movimiento circular alrededor del punto actualizado
                const angle = this.getCurrentAngle();
                const radius = this.config.coveredMaintainRadius;
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
                const targetActualizado = window.getInterseccionActualizada(this.config.currentTarget.indiceInterseccion);
                if (!targetActualizado) {
                    console.warn("No se pudo obtener la posición actualizada del destino");
                    return this.config.currentPosition;
                }

                const current = this.config.currentPosition;
                const dx = targetActualizado.x - current.x;
                const dy = targetActualizado.y - current.y;
                const distanciaActual = Math.hypot(dx, dy);

                // Log general de estado actual
                console.log(`[COVERED] Estado actual - Distancia: ${distanciaActual.toFixed(2)}px, Etapa1Completa: ${this.config.isInStage1Complete}`);

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
                        console.log(`[COVERED] 🚩 ETAPA 1 COMPLETA - Distancia: ${distanciaActual.toFixed(2)}px`);
                        this.config.isInStage1Complete = true;
                        this.config.currentApproachDistance = 3.9; // Iniciamos en 3.9px para la etapa 2
                    }
                } else if (distanciaActual > 1.8 && !this.config.isInStage2Complete) {
                    // ETAPA 2: ACERCAMIENTO DISCRETO (4px > x > 1.8px)
                    console.log(`[COVERED] 📏 ETAPA 2 - Distancia actual: ${distanciaActual.toFixed(2)}px, Próxima distancia objetivo: ${this.config.currentApproachDistance.toFixed(2)}px`);
                    
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
                    this.config.currentApproachDistance = Math.max(1.8, this.config.currentApproachDistance - 0.1);
                    
                    // Si llegamos a 1.8px o menos, marcamos la etapa 2 como completa
                    if (this.config.currentApproachDistance <= 1.8) {
                        console.log(`[COVERED] 🏁 ETAPA 2 COMPLETA - Distancia final: ${this.config.currentApproachDistance.toFixed(2)}px`);
                        this.config.isInStage2Complete = true;
                    }
                    
                    console.log(`[COVERED] ⬇️ Reducción: ${anteriorDistancia.toFixed(2)}px -> ${this.config.currentApproachDistance.toFixed(2)}px`);
                } else {
                    // ETAPA 3: MANTENIMIENTO CIRCULAR (cuando isInStage2Complete es true)
                    console.log(`[COVERED] 🎉 ETAPA 3 - Distancia: ${distanciaActual.toFixed(2)}px`);
                    
                    // Resetear banderas solo si volvemos a empezar con un nuevo punto
                    if (distanciaActual > 4) {
                        console.log(`[COVERED] 🔄 Reseteando banderas para nuevo ciclo`);
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

// Exportar al scope global
window.ballMovement = ballMovement; 