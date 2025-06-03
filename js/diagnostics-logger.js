// Sistema de registro de diagnósticos
let diagnosticsLogger = {
    config: {
        // Configuración del buffer circular
        maxEntries: 1000,  // Mantener los últimos 1000 registros
        entries: [],       // Array de registros
        currentIndex: 0,   // Índice actual en el buffer circular
        
        // Configuración de archivo
        logFileName: 'diagnostics.log',
        
        // Métricas acumuladas
        metrics: {
            totalFrames: 0,
            processChanges: 0,
            errorStates: 0,
            lastErrorTime: null
        }
    },

    // Inicializar el logger
    init: function() {
        this.config.entries = new Array(this.config.maxEntries).fill(null);
        console.log("Sistema de registro de diagnósticos inicializado");
        
        // Crear entrada inicial
        this.logSystemStart();
    },

    // Registrar un nuevo evento
    log: function(data) {
        const timestamp = performance.now();
        const entry = {
            timestamp,
            frameCount: this.config.metrics.totalFrames,
            ...data
        };

        // Guardar en buffer circular
        this.config.entries[this.config.currentIndex] = entry;
        this.config.currentIndex = (this.config.currentIndex + 1) % this.config.maxEntries;
        
        // Incrementar contador de frames
        this.config.metrics.totalFrames++;
        
        // Si es un error o cambio de proceso, actualizar métricas
        if (data.type === 'error') {
            this.config.metrics.errorStates++;
            this.config.metrics.lastErrorTime = timestamp;
        } else if (data.type === 'process_change') {
            this.config.metrics.processChanges++;
        }

        // Escribir al archivo
        this.writeToFile(entry);
    },

    // Registrar inicio del sistema
    logSystemStart: function() {
        this.log({
            type: 'system_start',
            message: 'Sistema de diagnósticos iniciado',
            gameVersion: window.GAME_VERSION || 'unknown',
            timestamp: new Date().toISOString()
        });
    },

    // Registrar cambio de proceso
    logProcessChange: function(fromProcess, toProcess, position, target) {
        this.log({
            type: 'process_change',
            fromProcess,
            toProcess,
            position: {...position},
            target: target ? {...target} : null,
            gameState: window.gameState ? {...window.gameState} : null
        });
    },

    // Registrar estado de la pelota
    logBallState: function(position, process, target) {
        // Solo registrar cada 60 frames (aproximadamente 1 segundo) para no llenar el log
        if (this.config.metrics.totalFrames % 60 === 0) {
            this.log({
                type: 'ball_state',
                position: {...position},
                process,
                target: target ? {...target} : null,
                isAtDestination: window.ballMovement ? window.ballMovement.isAtDestination() : null
            });
        }
    },

    // Registrar error o condición anormal
    logError: function(errorType, details) {
        this.log({
            type: 'error',
            errorType,
            details,
            stackTrace: new Error().stack
        });
    },

    // Escribir entrada al archivo
    writeToFile: function(entry) {
        // Formatear entrada como texto
        const formattedEntry = this.formatLogEntry(entry);
        
        // Usar la API del navegador para descargar si el buffer está lleno
        if (this.config.currentIndex === 0) { // Buffer completado una vuelta
            this.downloadLog();
        }
    },

    // Formatear entrada de log
    formatLogEntry: function(entry) {
        const timestamp = new Date(entry.timestamp).toISOString();
        let formattedEntry = `[${timestamp}] [Frame ${entry.frameCount}] `;
        
        switch(entry.type) {
            case 'process_change':
                formattedEntry += `PROCESO: ${entry.fromProcess} -> ${entry.toProcess}\n`;
                formattedEntry += `  Posición: (${entry.position.x.toFixed(2)}, ${entry.position.y.toFixed(2)})\n`;
                if (entry.target) {
                    formattedEntry += `  Target: ${JSON.stringify(entry.target)}\n`;
                }
                break;
                
            case 'ball_state':
                formattedEntry += `ESTADO: ${entry.process}\n`;
                formattedEntry += `  Posición: (${entry.position.x.toFixed(2)}, ${entry.position.y.toFixed(2)})\n`;
                formattedEntry += `  En destino: ${entry.isAtDestination}\n`;
                break;
                
            case 'error':
                formattedEntry += `ERROR: ${entry.errorType}\n`;
                formattedEntry += `  Detalles: ${JSON.stringify(entry.details)}\n`;
                formattedEntry += `  Stack: ${entry.stackTrace}\n`;
                break;
                
            default:
                formattedEntry += JSON.stringify(entry) + '\n';
        }
        
        return formattedEntry;
    },

    // Obtener resumen de diagnóstico
    getDiagnosticsSummary: function() {
        return {
            totalFrames: this.config.metrics.totalFrames,
            processChanges: this.config.metrics.processChanges,
            errorStates: this.config.metrics.errorStates,
            lastErrorTime: this.config.metrics.lastErrorTime,
            bufferUsage: this.config.entries.filter(e => e !== null).length,
            recentErrors: this.getRecentEntries('error', 5),
            recentProcessChanges: this.getRecentEntries('process_change', 5)
        };
    },

    // Obtener entradas recientes de un tipo específico
    getRecentEntries: function(type, count) {
        return this.config.entries
            .filter(e => e && e.type === type)
            .slice(-count);
    },

    // Descargar log actual
    downloadLog: function() {
        const entries = this.config.entries.filter(e => e !== null);
        let logContent = "=== DIAGNÓSTICO DE REJAS ESPACIALES ===\n";
        logContent += `Fecha: ${new Date().toISOString()}\n`;
        logContent += `Versión: ${window.GAME_VERSION || 'unknown'}\n\n`;
        
        entries.forEach(entry => {
            logContent += this.formatLogEntry(entry);
        });
        
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagnostics-${Date.now()}.log`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// Exportar al scope global
window.diagnosticsLogger = diagnosticsLogger; 