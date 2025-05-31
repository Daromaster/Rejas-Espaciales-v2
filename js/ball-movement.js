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

        // Control de estado y tiempo
        isAtDestination: false,  // Solo para debugging/verificación
        timeAtDestination: 0,    // Tiempo en el estado actual
        destinationThreshold: 4,  // Solo para debugging/verificación
        
        // 🆕 Variables para algoritmo adaptativo
        initialDistance: 0,      // Distancia inicial al seleccionar objetivo
        timeAtCurrentTarget: 0,  // Tiempo transcurrido desde selección del objetivo
        baseSpeed: 0.02,         // Velocidad base
        accelerationFactor: 1.0, // Factor de aceleración acumulativo
        frameCount: 0           // Contador de frames para crecimiento parabólico
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
        
        // 🆕 LOG ESPECÍFICO PARA NIVEL 2
        if (currentLevel === 2) {
            console.log(`🎯 Nivel 2: Nuevo destino DESCUBIERTO seleccionado (${indiceAleatorio}/${coordenadas.length-1}):`, 
                this.config.currentTarget.indiceCelda);
        }
        
        return this.config.currentTarget;
    },

    // 🆕 MOVER HACIA OBJETIVO DESCUBIERTO CON SELECT CASE POR NIVEL
    moveToUncoveredTarget: function() {
        const currentLevel = this.getCurrentLevel();
        
        if (!this.config.currentTarget) {
            console.log("No hay destino descubierto, seleccionando uno nuevo");
            if (!this.selectRandomUncoveredTarget()) {
                return this.config.currentPosition;
            }
            this.config.timeAtDestination = 0;
            // 🆕 Reiniciar factor de aceleración al cambiar de objetivo
            this.config.accelerationFactor = 1.0;
        }

        switch(currentLevel) {
            case 1: {
                // NIVEL 1: Comportamiento original exacto
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
                this.config.timeAtDestination += 1/60;

                // Solo para debugging/verificación (ORIGINAL: distancia hacia newPosition)
                const distancia = Math.hypot(dx, dy);
                this.config.isAtDestination = distancia <= this.config.destinationThreshold;
                break;
            }
            
            case 2: {
                const targetActualizado = window.getCentroCeldaActualizado(this.config.currentTarget.indiceCelda);
                if (!targetActualizado) {
                    console.error("No se pudo obtener la posición actualizada del destino descubierto nivel 2");
                    return this.config.currentPosition;
                }

                // Calcular movimiento circular alrededor del punto actualizado
                const angle = this.getCurrentAngle();
                const radius = this.config.uncoveredMaintainRadius;
                const targetPosition = {
                    x: targetActualizado.x + Math.cos(angle) * radius,
                    y: targetActualizado.y + Math.sin(angle) * radius
                };

                // Calcular distancia actual al objetivo
                const current = this.config.currentPosition;
                const dx = targetPosition.x - current.x;
                const dy = targetPosition.y - current.y;
                const distanciaActual = Math.hypot(dx, dy);

                // 🆕 NUEVO SISTEMA DE PROGRESIÓN PARABÓLICA
                // Porcentaje base de avance (2%)
                const porcentajeBase = 0.02;
                
                // Incrementar contador de frames
                this.config.frameCount = (this.config.frameCount || 0) + 1;
                
                // Calcular incremento parabólico
                const incremento = 0.00015 * Math.pow(this.config.frameCount, 2.0);
                
                // Incrementar factor de aceleración con crecimiento parabólico
                this.config.accelerationFactor = (this.config.accelerationFactor || 1.0) + incremento;
                
                // Calcular porcentaje final de avance (sin límite máximo)
                const porcentajeFinal = porcentajeBase * this.config.accelerationFactor;
                
                // Aplicar movimiento
                this.config.currentPosition = {
                    x: current.x + dx * porcentajeFinal,
                    y: current.y + dy * porcentajeFinal
                };

                // Debug log para ver la progresión
                if (distanciaActual < 10) {
                    console.log(`🔄 Frame=${this.config.frameCount}, Incremento=${incremento.toFixed(5)}, Factor=${this.config.accelerationFactor.toFixed(3)}, Avance=${(porcentajeFinal * 100).toFixed(2)}%`);
                }
                
                // Verificar si ha llegado al destino
                this.config.isAtDestination = distanciaActual <= this.config.destinationThreshold;
                
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
                    this.config.timeAtDestination += 1/60;
                    const distancia = Math.hypot(dx, dy);
                    this.config.isAtDestination = distancia <= this.config.destinationThreshold;
                }
                break;
            }
        }

        return this.config.currentPosition;
    },

    // 🆕 MANTENER POSICIÓN DESCUBIERTA CON SELECT CASE POR NIVEL
    maintainUncoveredPosition: function() {
        const currentLevel = this.getCurrentLevel();
        
        if (!this.config.currentTarget) return this.config.currentPosition;

        switch(currentLevel) {
            case 1: {
                // NIVEL 1: Posición estática con pequeños movimientos
                const angle = this.getCurrentAngle();
                const radius = this.config.uncoveredMaintainRadius;
                const target = this.config.currentTarget;
                
                // Movimiento elíptico suave alrededor del punto estático
                const newX = target.x + Math.cos(angle) * radius;
                const newY = target.y + Math.sin(angle * 1.5) * radius; // Multiplicador 1.5 para movimiento más orgánico
                
                this.config.currentPosition = { x: newX, y: newY };
                break;
            }
            
            case 2: {
                // NIVEL 2: Mantener posición alrededor del punto que rota dinámicamente
                // Recalcular las coordenadas descubiertas EN TIEMPO REAL
                const coordenadasActuales = window.obtenerCoordenadasDescubiertas();
                if (!coordenadasActuales || coordenadasActuales.length === 0) {
                    return this.config.currentPosition;
                }
                
                // Buscar la coordenada correspondiente al target actual
                let targetActualizado = null;
                for (const coord of coordenadasActuales) {
                    if (coord.indiceCelda && 
                        coord.indiceCelda.fila === this.config.currentTarget.indiceCelda.fila &&
                        coord.indiceCelda.columna === this.config.currentTarget.indiceCelda.columna) {
                        targetActualizado = coord;
                        break;
                    }
                }
                
                if (!targetActualizado) {
                    return this.config.currentPosition;
                }

                const angle = this.getCurrentAngle();
                const radius = this.config.uncoveredMaintainRadius;
                
                // Movimiento elíptico suave alrededor del punto que rota
                const newX = targetActualizado.x + Math.cos(angle) * radius;
                const newY = targetActualizado.y + Math.sin(angle * 1.5) * radius; // Multiplicador 1.5 para movimiento más orgánico
                
                this.config.currentPosition = { x: newX, y: newY };
                break;
            }
            
            default: {
                console.warn(`⚠️ Nivel ${currentLevel} no implementado para mantener posición descubierta, usando nivel 1`);
                // Fallback a nivel 1
                const angle = this.getCurrentAngle();
                const radius = this.config.uncoveredMaintainRadius;
                const target = this.config.currentTarget;
                const newX = target.x + Math.cos(angle) * radius;
                const newY = target.y + Math.sin(angle * 1.5) * radius;
                this.config.currentPosition = { x: newX, y: newY };
                break;
            }
        }
        
        return this.config.currentPosition;
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
        
        // 🆕 LOG ESPECÍFICO PARA NIVEL 2
        if (currentLevel === 2) {
            console.log(`🎯 Nivel 2: Nuevo destino CUBIERTO seleccionado (${indiceAleatorio}/${coordenadas.length-1}):`, 
                this.config.currentTarget.indiceInterseccion);
        }
        
        return this.config.currentTarget;
    },

    // 🆕 MOVER HACIA OBJETIVO CUBIERTO CON SELECT CASE POR NIVEL
    moveToCoveredTarget: function() {
        const currentLevel = this.getCurrentLevel();
        
        if (!this.config.currentTarget) {
            console.log("No hay destino cubierto, seleccionando uno nuevo");
            if (!this.selectRandomCoveredTarget()) {
                return this.config.currentPosition;
            }
            this.config.timeAtDestination = 0;
        }

        switch(currentLevel) {
            case 1: {
                // NIVEL 1: Comportamiento original exacto
                const targetActualizado = window.getInterseccionActualizada(this.config.currentTarget.indiceInterseccion);
                if (!targetActualizado) {
                    console.error("No se pudo obtener la posición actualizada del destino cubierto");
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
                this.config.timeAtDestination += 1/60;

                // Solo para debugging/verificación (ORIGINAL: distancia hacia newPosition)
                const distancia = Math.hypot(dx, dy);
                this.config.isAtDestination = distancia <= this.config.destinationThreshold;
                break;
            }
            
            case 2: {
                // NIVEL 2: VERSIÓN MEJORADA CON VELOCIDAD ADAPTATIVA
                const targetActualizado = window.getInterseccionActualizada(this.config.currentTarget.indiceInterseccion);
                if (!targetActualizado) {
                    console.error("No se pudo obtener la posición actualizada del destino cubierto nivel 2");
                    return this.config.currentPosition;
                }

                // Calcular movimiento circular alrededor del punto actualizado
                const angle = this.getCurrentAngle();
                const radius = this.config.coveredMaintainRadius;
                const newPosition = {
                    x: targetActualizado.x + Math.cos(angle) * radius,
                    y: targetActualizado.y + Math.sin(angle) * radius
                };

                // Calcular distancia actual
                const current = this.config.currentPosition;
                const dx = newPosition.x - current.x;
                const dy = newPosition.y - current.y;
                const distanciaActual = Math.hypot(dx, dy);
                
                // 🆕 NUEVO SISTEMA DE PROGRESIÓN PARABÓLICA
                // Porcentaje base de avance (2%)
                const porcentajeBase = 0.02;
                
                // Incrementar contador de frames
                this.config.frameCount = (this.config.frameCount || 0) + 1;
                
                // Calcular incremento parabólico
                const incremento = 0.00015 * Math.pow(this.config.frameCount, 2.0);
                
                // Incrementar factor de aceleración con crecimiento parabólico
                this.config.accelerationFactor = (this.config.accelerationFactor || 1.0) + incremento;
                
                // Calcular porcentaje final de avance (sin límite máximo)
                const porcentajeFinal = porcentajeBase * this.config.accelerationFactor;
                
                // Aplicar movimiento
                this.config.currentPosition = {
                    x: current.x + dx * porcentajeFinal,
                    y: current.y + dy * porcentajeFinal
                };

                // Debug log para ver la progresión
                if (distanciaActual < 10) {
                    console.log(`🔄 Frame=${this.config.frameCount}, Incremento=${incremento.toFixed(5)}, Factor=${this.config.accelerationFactor.toFixed(3)}, Avance=${(porcentajeFinal * 100).toFixed(2)}%`);
                }
                
                // Incrementar tiempo de permanencia en este estado
                this.config.timeAtDestination += 1/60;

                // Verificar si ha llegado al destino
                this.config.isAtDestination = distanciaActual <= this.config.destinationThreshold;
                
                // Log para debug cuando está cerca pero no llega
                if (distanciaActual < 10 && !this.config.isAtDestination) {
                    console.log(`⚠️ Cerca pero no llega: ${distanciaActual.toFixed(2)}px, factor=${this.config.accelerationFactor.toFixed(3)}, avance=${porcentajeFinal.toFixed(3)}`);
                }
                
                break;
            }
            
            default: {
                console.warn(`⚠️ Nivel ${currentLevel} no implementado para movimiento cubierto, usando nivel 1`);
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
                    this.config.timeAtDestination += 1/60;
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
            case 1: {
                // NIVEL 1: Posición estática con pequeños movimientos
                const angle = this.getCurrentAngle();
                const radius = this.config.coveredMaintainRadius;
                const target = this.config.currentTarget;
                
                const newX = target.x + Math.cos(angle) * radius;
                const newY = target.y + Math.sin(angle) * radius;
                
                this.config.currentPosition = { x: newX, y: newY };
                break;
            }
            
            case 2: {
                // NIVEL 2: Mantener posición alrededor del punto que rota dinámicamente
                // Recalcular las coordenadas cubiertas EN TIEMPO REAL
                const coordenadasActuales = window.obtenerCoordenadasCubiertas();
                if (!coordenadasActuales || coordenadasActuales.length === 0) {
                    return this.config.currentPosition;
                }
                
                // Buscar la coordenada correspondiente al target actual
                let targetActualizado = null;
                for (const coord of coordenadasActuales) {
                    if (coord.indiceInterseccion && 
                        coord.indiceInterseccion.i_linea === this.config.currentTarget.indiceInterseccion.i_linea &&
                        coord.indiceInterseccion.j_linea === this.config.currentTarget.indiceInterseccion.j_linea) {
                        targetActualizado = coord;
                        break;
                    }
                }
                
                if (!targetActualizado) {
                    return this.config.currentPosition;
                }

                const angle = this.getCurrentAngle();
                const radius = this.config.coveredMaintainRadius;
                
                const newX = targetActualizado.x + Math.cos(angle) * radius;
                const newY = targetActualizado.y + Math.sin(angle) * radius;
                
                this.config.currentPosition = { x: newX, y: newY };
                break;
            }
            
            default: {
                console.warn(`⚠️ Nivel ${currentLevel} no implementado para mantener posición cubierta, usando nivel 1`);
                // Fallback a nivel 1
                const angle = this.getCurrentAngle();
                const radius = this.config.coveredMaintainRadius;
                const target = this.config.currentTarget;
                const newX = target.x + Math.cos(angle) * radius;
                const newY = target.y + Math.sin(angle) * radius;
                this.config.currentPosition = { x: newX, y: newY };
                break;
            }
        }
        
        return this.config.currentPosition;
    },

    // Obtener el tiempo que la pelota ha estado en el destino actual
    getTimeAtDestination: function() {
        return this.config.timeAtDestination;
    },

    // Verificar si la pelota está en el destino
    isAtDestination: function() {
        return this.config.isAtDestination;
    },

    // Resetear el tiempo en destino
    resetTimeAtDestination: function() {
        this.config.timeAtDestination = 0;
        this.config.isAtDestination = false;
    }
};

// Exportar al scope global
window.ballMovement = ballMovement; 