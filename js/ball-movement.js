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
        destinationThreshold: 4  // Solo para debugging/verificación
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
        const coordenadas = window.obtenerCoordenadasDescubiertas();
        if (!coordenadas || coordenadas.length === 0) {
            console.error("No hay coordenadas descubiertas disponibles");
            return null;
        }
        
        const indiceAleatorio = Math.floor(Math.random() * coordenadas.length);
        this.config.currentTarget = coordenadas[indiceAleatorio];
        return this.config.currentTarget;
    },

    // Mover la pelota hacia el objetivo descubierto
    moveToUncoveredTarget: function() {
        if (!this.config.currentTarget) {
            console.log("No hay destino descubierto, seleccionando uno nuevo");
            if (!this.selectRandomUncoveredTarget()) {
                return this.config.currentPosition;
            }
            this.config.timeAtDestination = 0;
        }

        // Obtener las coordenadas actualizadas del target
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

        // Incrementar tiempo (ahora basado solo en el estado del movimiento)
        this.config.timeAtDestination += 1/60;

        // Solo para debugging/verificación (no afecta el comportamiento)
        const distancia = Math.hypot(dx, dy);
        this.config.isAtDestination = distancia <= this.config.destinationThreshold;

        return this.config.currentPosition;
    },

    // Mantener la pelota en posición descubierta con pequeños movimientos
    maintainUncoveredPosition: function() {
        if (!this.config.currentTarget) return this.config.currentPosition;
        
        const angle = this.getCurrentAngle();
        const radius = this.config.uncoveredMaintainRadius;
        const target = this.config.currentTarget;
        
        // Movimiento elíptico suave
        const newX = target.x + Math.cos(angle) * radius;
        const newY = target.y + Math.sin(angle * 1.5) * radius; // Multiplicador 1.5 para movimiento más orgánico
        
        this.config.currentPosition = { x: newX, y: newY };
        return this.config.currentPosition;
    },

    // === Algoritmos para estado cubierto ===
    
    // Seleccionar un punto aleatorio de las coordenadas cubiertas
    selectRandomCoveredTarget: function() {
        const coordenadas = window.obtenerCoordenadasCubiertas();
        if (!coordenadas || coordenadas.length === 0) {
            console.error("No hay coordenadas cubiertas disponibles");
            return null;
        }
        
        const indiceAleatorio = Math.floor(Math.random() * coordenadas.length);
        this.config.currentTarget = coordenadas[indiceAleatorio];
        return this.config.currentTarget;
    },

    // Mover la pelota hacia el objetivo cubierto
    moveToCoveredTarget: function() {
        if (!this.config.currentTarget) {
            console.log("No hay destino cubierto, seleccionando uno nuevo");
            if (!this.selectRandomCoveredTarget()) {
                return this.config.currentPosition;
            }
            this.config.timeAtDestination = 0;
        }

        // Obtener las coordenadas actualizadas del target
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

        // Incrementar tiempo (ahora basado solo en el estado del movimiento)
        this.config.timeAtDestination += 1/60;

        // Solo para debugging/verificación (no afecta el comportamiento)
        const distancia = Math.hypot(dx, dy);
        this.config.isAtDestination = distancia <= this.config.destinationThreshold;

        return this.config.currentPosition;
    },

    // Mantener la pelota en posición cubierta con pequeños movimientos
    maintainCoveredPosition: function() {
        if (!this.config.currentTarget) return this.config.currentPosition;
        
        const angle = this.getCurrentAngle();
        const radius = this.config.coveredMaintainRadius;
        const target = this.config.currentTarget;
        
        const newX = target.x + Math.cos(angle) * radius;
        const newY = target.y + Math.sin(angle) * radius;
        
        this.config.currentPosition = { x: newX, y: newY };
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