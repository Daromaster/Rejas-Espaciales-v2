// Sistema de movimiento flotante para la reja
let gridMovement = {
    // Configuración del movimiento
    config: {
        amplitudeY: 12,      // Amplitud del movimiento vertical en píxeles (valor por defecto)
        amplitudeX: 8,       // Amplitud del movimiento horizontal en píxeles (valor por defecto)
        frequencyY: 0.001,   // Frecuencia del movimiento vertical
        frequencyX: 0.0007,  // Frecuencia del movimiento horizontal
        phaseY: 0,          // Fase inicial vertical
        phaseX: 0,          // Fase inicial horizontal
        speed: 1.2,         // Velocidad general del movimiento (valor por defecto)
        offsetY: 0,         // Offset vertical actual
        offsetX: 0,         // Offset horizontal actual
        lastTime: 0,        // Último tiempo de actualización
        isInitialized: false // Flag para controlar la inicialización
    },

    // Obtener configuración según nivel
    getConfigForLevel: function(level) {
        switch(level) {
            case 1: {
                return {
                    amplitudeY: 12,      // Valores originales para nivel 1
                    amplitudeX: 8,
                    speed: 1.2
                };
            }
            case 2: {
                return {
                    amplitudeY: 20,      // Valores aumentados para nivel 2
                    amplitudeX: 15,
                    speed: 1.8
                };
            }
            default: {
                console.warn(`⚠️ Nivel ${level} no implementado, usando configuración por defecto`);
                return {
                    amplitudeY: 12,
                    amplitudeX: 8,
                    speed: 1.2
                };
            }
        }
    },

    // Inicializar el movimiento
    init: function() {
        this.config.lastTime = performance.now();
        // Fases iniciales aleatorias para que cada reja comience en una posición diferente
        this.config.phaseY = Math.random() * Math.PI * 2;
        this.config.phaseX = Math.random() * Math.PI * 2;
        
        // Obtener configuración según el nivel actual
        const currentLevel = window.getCurrentLevel ? window.getCurrentLevel() : 1;
        const levelConfig = this.getConfigForLevel(currentLevel);
        
        // Aplicar configuración del nivel
        Object.assign(this.config, levelConfig);
        
        this.config.isInitialized = true;
        console.log(`Sistema de movimiento inicializado para nivel ${currentLevel}`);
    },

    // Actualizar la posición
    update: function() {
        if (!this.config.isInitialized) {
            this.init();
        }

        // Verificar si el nivel ha cambiado
        const currentLevel = window.getCurrentLevel ? window.getCurrentLevel() : 1;
        const levelConfig = this.getConfigForLevel(currentLevel);
        
        // Actualizar configuración si es necesario
        if (this.config.amplitudeY !== levelConfig.amplitudeY ||
            this.config.amplitudeX !== levelConfig.amplitudeX ||
            this.config.speed !== levelConfig.speed) {
            Object.assign(this.config, levelConfig);
            console.log(`Configuración de movimiento actualizada para nivel ${currentLevel}`);
        }

        const currentTime = performance.now();
        const deltaTime = Math.min(currentTime - this.config.lastTime, 100); // Limitar deltaTime a 100ms
        this.config.lastTime = currentTime;

        // Calcular nuevas posiciones usando funciones seno con diferentes frecuencias
        this.config.phaseY += this.config.frequencyY * this.config.speed * deltaTime;
        this.config.phaseX += this.config.frequencyX * this.config.speed * deltaTime;
        
        // Asegurar que las fases sean números finitos
        if (!isFinite(this.config.phaseY)) this.config.phaseY = 0;
        if (!isFinite(this.config.phaseX)) this.config.phaseX = 0;

        // Calcular offsets y asegurar que sean finitos
        const newOffsetY = Math.sin(this.config.phaseY) * this.config.amplitudeY;
        const newOffsetX = Math.sin(this.config.phaseX) * this.config.amplitudeX;
        
        this.config.offsetY = isFinite(newOffsetY) ? newOffsetY : 0;
        this.config.offsetX = isFinite(newOffsetX) ? newOffsetX : 0;

        return {
            x: this.config.offsetX,
            y: this.config.offsetY
        };
    },

    // Obtener la posición actual
    getCurrentOffset: function() {
        if (!this.config.isInitialized) {
            this.init();
        }
        return {
            x: this.config.offsetX,
            y: this.config.offsetY
        };
    },

    // Configurar parámetros del movimiento
    setConfig: function(newConfig) {
        // Validar y asegurar que todos los valores sean finitos
        const validConfig = {};
        for (const [key, value] of Object.entries(newConfig)) {
            if (isFinite(value)) {
                validConfig[key] = value;
            }
        }
        Object.assign(this.config, validConfig);
    }
};

// Exportar al scope global
window.gridMovement = gridMovement; 