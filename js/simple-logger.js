// Logger simple para seguimiento de la pelota
let simpleLogger = {
    // Buffer para almacenar los registros
    logBuffer: [],
    
    // Registrar inicio de movimiento a destino
    logStartMoving: function(position, target) {
        const log = `[${Date.now()}] INICIO MOVIMIENTO A DESTINO\n` +
                   `  Posición: (${position.x}, ${position.y})\n` +
                   `  Target: ${JSON.stringify(target)}\n`;
        this.logBuffer.push(log);
    },

    // Registrar inicio de mantenimiento
    logStartMaintaining: function(position, target) {
        const log = `[${Date.now()}] INICIO MANTENIMIENTO EN DESTINO\n` +
                   `  Posición: (${position.x}, ${position.y})\n` +
                   `  Target: ${JSON.stringify(target)}\n`;
        this.logBuffer.push(log);
    },

    // Registrar coordenadas
    logPosition: function(position) {
        const log = `[${Date.now()}] POSICIÓN: (${position.x}, ${position.y})\n`;
        this.logBuffer.push(log);
    },

    // Descargar todo el log acumulado
    downloadLog: function() {
        const allLogs = this.logBuffer.join('');
        const blob = new Blob([allLogs], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ball-log.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    },

    // Limpiar el buffer de logs
    clearLog: function() {
        this.logBuffer = [];
        console.log("Log limpiado");
    }
};

// Exportar al scope global
window.simpleLogger = simpleLogger; 