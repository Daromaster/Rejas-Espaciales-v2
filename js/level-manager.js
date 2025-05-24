// Gestor central de niveles para Rejas Espaciales
const LevelManager = {
    // Estado actual del sistema de niveles
    current: {
        level: 1,
        subLevel: null,
        totalLevels: 4,
        isLastLevel: false
    },
    
    // Configuración por nivel
    config: {
        1: {
            name: "Básico",
            description: "Nivel básico - Reja estática",
            duration: 60000, // 1 minuto
            subLevels: null
        },
        2: {
            name: "Intermedio", 
            description: "Reja con movimiento",
            duration: 60000,
            subLevels: ['a', 'b']
        },
        3: {
            name: "Avanzado",
            description: "Reja rotatoria",
            duration: 60000,
            subLevels: ['a', 'b']
        },
        4: {
            name: "Experto",
            description: "Múltiples rejas",
            duration: 60000,
            subLevels: null
        }
    },
    
    // Estado del progreso del jugador
    progress: {
        totalScore: 0,
        levelScores: [],
        currentLevelScore: 0,
        startTime: null,
        endTime: null
    },
    
    /**
     * Obtener configuración actual del nivel
     */
    getCurrentConfig() {
        return {
            level: this.current.level,
            subLevel: this.current.subLevel,
            levelConfig: this.config[this.current.level],
            isLastLevel: this.current.isLastLevel
        };
    },
    
    /**
     * Obtener información detallada del nivel actual
     */
    getCurrentLevelInfo() {
        const levelConfig = this.config[this.current.level];
        return {
            level: this.current.level,
            subLevel: this.current.subLevel,
            name: levelConfig ? levelConfig.name : 'Desconocido',
            description: levelConfig ? levelConfig.description : '',
            duration: levelConfig ? levelConfig.duration : 60000,
            totalLevels: this.current.totalLevels
        };
    },
    
    /**
     * Inicializar el gestor de niveles
     */
    initialize() {
        console.log("🎮 Inicializando LevelManager...");
        
        // Resetear a nivel 1
        this.current.level = 1;
        this.current.subLevel = null;
        this.current.isLastLevel = false;
        
        // Resetear progreso
        this.progress.totalScore = 0;
        this.progress.levelScores = [];
        this.progress.currentLevelScore = 0;
        this.progress.startTime = Date.now();
        this.progress.endTime = null;
        
        // Actualizar gameState si existe
        if (window.gameState) {
            window.gameState.currentLevel = this.current.level;
            window.gameState.currentSubLevel = this.current.subLevel;
        }
        
        console.log("✅ LevelManager inicializado:", this.getCurrentConfig());
    },
    
    /**
     * Verificar si el nivel actual es válido
     */
    isValidLevel(level, subLevel = null) {
        if (!this.config[level]) {
            return false;
        }
        
        if (subLevel) {
            const levelConfig = this.config[level];
            if (!levelConfig.subLevels || !levelConfig.subLevels.includes(subLevel)) {
                return false;
            }
        }
        
        return true;
    },
    
    /**
     * Establecer nivel específico (para testing o debug)
     */
    setLevel(level, subLevel = null) {
        if (!this.isValidLevel(level, subLevel)) {
            console.warn(`⚠️ Nivel inválido: ${level}${subLevel ? subLevel : ''}`);
            return false;
        }
        
        console.log(`🔄 Cambiando a nivel ${level}${subLevel ? subLevel : ''}`);
        
        this.current.level = level;
        this.current.subLevel = subLevel;
        this.current.isLastLevel = (level >= this.current.totalLevels);
        
        // Actualizar gameState
        if (window.gameState) {
            window.gameState.currentLevel = this.current.level;
            window.gameState.currentSubLevel = this.current.subLevel;
        }
        
        return true;
    },
    
    /**
     * Avanzar al siguiente nivel o sub-nivel
     */
    advanceLevel() {
        const currentLevel = this.current.level;
        const currentSubLevel = this.current.subLevel;
        const currentConfig = this.config[currentLevel];
        
        console.log(`🚀 Intentando avanzar desde nivel ${currentLevel}${currentSubLevel || ''}`);
        
        // Si estamos en un sub-nivel, avanzar al siguiente sub-nivel
        if (currentConfig && currentConfig.subLevels && currentSubLevel) {
            const subLevelIndex = currentConfig.subLevels.indexOf(currentSubLevel);
            const nextSubLevelIndex = subLevelIndex + 1;
            
            // Si hay más sub-niveles
            if (nextSubLevelIndex < currentConfig.subLevels.length) {
                const nextSubLevel = currentConfig.subLevels[nextSubLevelIndex];
                console.log(`📈 Avanzando a sub-nivel ${currentLevel}${nextSubLevel}`);
                return this.setLevel(currentLevel, nextSubLevel);
            }
        }
        
        // Avanzar al siguiente nivel principal
        const nextLevel = currentLevel + 1;
        
        // Verificar si hay más niveles
        if (nextLevel > this.current.totalLevels) {
            console.log("🏁 ¡Todos los niveles completados!");
            this.current.isLastLevel = true;
            this.progress.endTime = Date.now();
            return false; // No hay más niveles
        }
        
        // Si el siguiente nivel tiene sub-niveles, empezar con el primero
        const nextLevelConfig = this.config[nextLevel];
        const nextSubLevel = (nextLevelConfig && nextLevelConfig.subLevels) 
            ? nextLevelConfig.subLevels[0] 
            : null;
        
        console.log(`📈 Avanzando a nivel ${nextLevel}${nextSubLevel || ''}`);
        return this.setLevel(nextLevel, nextSubLevel);
    },
    
    /**
     * Completar el nivel actual (registrar puntuación)
     */
    completeCurrentLevel(score) {
        console.log(`✅ Nivel ${this.current.level}${this.current.subLevel || ''} completado con ${score} puntos`);
        
        // Registrar puntuación del nivel
        this.progress.levelScores.push({
            level: this.current.level,
            subLevel: this.current.subLevel,
            score: score,
            timestamp: Date.now()
        });
        
        // Actualizar puntuación total
        this.progress.totalScore += score;
        this.progress.currentLevelScore = 0;
        
        // Verificar si es el último nivel
        const isLastLevel = this.current.level >= this.current.totalLevels;
        
        return {
            levelCompleted: true,
            isLastLevel: isLastLevel,
            levelScore: score,
            totalScore: this.progress.totalScore,
            nextLevel: isLastLevel ? null : this.current.level + 1
        };
    },
    
    /**
     * Obtener resumen de progreso
     */
    getProgressSummary() {
        return {
            currentLevel: this.current.level,
            currentSubLevel: this.current.subLevel,
            totalLevels: this.current.totalLevels,
            totalScore: this.progress.totalScore,
            levelScores: [...this.progress.levelScores],
            currentLevelScore: this.progress.currentLevelScore,
            isLastLevel: this.current.isLastLevel,
            timeElapsed: this.progress.endTime 
                ? (this.progress.endTime - this.progress.startTime)
                : (Date.now() - this.progress.startTime)
        };
    },
    
    /**
     * Resetear todo el sistema de niveles
     */
    reset() {
        console.log("🔄 Reseteando LevelManager...");
        this.initialize();
    },
    
    /**
     * Obtener duración del nivel actual
     */
    getCurrentLevelDuration() {
        const levelConfig = this.config[this.current.level];
        return levelConfig ? levelConfig.duration : 60000; // Default: 1 minuto
    },
    
    /**
     * Verificar si todos los niveles están completados
     */
    allLevelsCompleted() {
        return this.current.isLastLevel && this.progress.endTime !== null;
    }
};

// Exportar al scope global
window.LevelManager = LevelManager;

// Inicializar automáticamente cuando se carga el script
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        LevelManager.initialize();
    });
}

console.log("📋 LevelManager cargado correctamente"); 