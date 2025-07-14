// relojJuego.js - Sistema de cronómetro del juego

// === CONTROL DE TIEMPO DEL JUEGO ===
export class RelojJuego {
    constructor() {
        this.tiempoTotal = 60000; // 60 segundos por defecto
        this.tiempoRestante = this.tiempoTotal;
        this.iniciado = false;
        this.pausado = false;
        this.primerDisparo = false;
        this.ultimoTiempo = 0;
        this.tiempoInicio = 0; // Tiempo cuando se inició el cronómetro
        
        // Estados: 'previo' (antes del primer disparo), 'jugando', 'pausado', 'terminado'
        this.estado = 'previo';
        
        // Control de frecuencia de actualización visual (30 FPS máximo)
        this.ultimaActualizacionVisual = 0;
        this.intervaloActualizacionVisual = 33; // ~30 FPS (1000ms / 30 = 33ms)
        this.ultimoTextoFormateado = 'Tiempo: 01:00.00';
    }
    
    // Configurar tiempo para el nivel
    configurarTiempo(tiempoEnMs) {
        this.tiempoTotal = tiempoEnMs;
        this.tiempoRestante = tiempoEnMs;
        
        // Actualizar texto inicial con el nuevo tiempo
        const tiempoEnSegundos = tiempoEnMs / 1000;
        const minutos = Math.floor(tiempoEnSegundos / 60);
        const segundos = Math.floor(tiempoEnSegundos % 60);
        const minutosStr = minutos.toString().padStart(2, '0');
        const segundosStr = segundos.toString().padStart(2, '0');
        this.ultimoTextoFormateado = `Tiempo: ${minutosStr}:${segundosStr}.00`;
    }
    
    // Iniciar cronómetro con el primer disparo
    iniciarConPrimerDisparo() {
        if (!this.primerDisparo) {
            this.primerDisparo = true;
            this.iniciado = true;
            this.estado = 'jugando';
            this.ultimoTiempo = performance.now();
            this.tiempoInicio = this.ultimoTiempo;
            console.log('Cronómetro iniciado con primer disparo');
        }
    }
    
    // Iniciar cronómetro directamente (para uso del sistema de disparos)
    iniciar() {
        if (!this.iniciado) {
            this.iniciado = true;
            this.estado = 'jugando';
            this.ultimoTiempo = performance.now();
            this.tiempoInicio = this.ultimoTiempo;
            console.log('Cronómetro iniciado');
        }
    }
    
    // Obtener tiempo de inicio del cronómetro
    getTiempoInicio() {
        return this.tiempoInicio;
    }
    
    // Actualizar cronómetro
    actualizar(tiempoActual) {
        if (!this.iniciado || this.pausado || this.estado === 'terminado') {
            return;
        }
        
        const deltaTime = tiempoActual - this.ultimoTiempo;
        this.ultimoTiempo = tiempoActual;
        
        this.tiempoRestante -= deltaTime;
        
        if (this.tiempoRestante <= 0) {
            this.tiempoRestante = 0;
            this.estado = 'terminado';
        }
    }
    
    // Obtener tiempo restante en milisegundos
    getTiempoRestante() {
        return Math.max(0, this.tiempoRestante);
    }
    
    // Obtener tiempo formateado para mostrar (limitado a 30 FPS)
    getTiempoFormateado() {
        const tiempoActual = performance.now();
        
        // Solo actualizar el texto visual cada 33ms (~30 FPS) para aligerar la animación
        if (tiempoActual - this.ultimaActualizacionVisual >= this.intervaloActualizacionVisual) {
            const tiempoEnSegundos = this.getTiempoRestante() / 1000;
            
            // Calcular minutos, segundos y centésimas
            const minutos = Math.floor(tiempoEnSegundos / 60);
            const segundosRestantes = tiempoEnSegundos % 60;
            const segundosEnteros = Math.floor(segundosRestantes);
            const centesimas = Math.floor((segundosRestantes - segundosEnteros) * 100);
            
            // Formatear con ceros a la izquierda
            const minutosStr = minutos.toString().padStart(2, '0');
            const segundosStr = segundosEnteros.toString().padStart(2, '0');
            const centesimasStr = centesimas.toString().padStart(2, '0');
            
            // Actualizar el texto formateado y el tiempo de última actualización
            this.ultimoTextoFormateado = `Tiempo: ${minutosStr}:${segundosStr}.${centesimasStr}`;
            this.ultimaActualizacionVisual = tiempoActual;
        }
        
        // Devolver el último texto formateado (puede ser el mismo por varios frames)
        return this.ultimoTextoFormateado;
    }
    
    // Pausar cronómetro
    pausar() {
        if (this.iniciado && !this.pausado) {
            this.pausado = true;
            this.estado = 'pausado';
        }
    }
    
    // Reanudar cronómetro
    reanudar() {
        if (this.pausado) {
            this.pausado = false;
            this.estado = 'jugando';
            this.ultimoTiempo = performance.now();
        }
    }
    
    // Reiniciar cronómetro
    reiniciar() {
        this.tiempoRestante = this.tiempoTotal;
        this.iniciado = false;
        this.pausado = false;
        this.primerDisparo = false;
        this.tiempoInicio = 0;
        this.estado = 'previo';
        
        // Reiniciar control de actualización visual
        this.ultimaActualizacionVisual = 0;
        this.ultimoTextoFormateado = 'Tiempo: 01:00.00';
    }
    
    // Verificar si el tiempo se agotó
    estaTerminado() {
        return this.estado === 'terminado';
    }
    
    // Obtener estado actual
    getEstado() {
        return this.estado;
    }
}

// Instancia global del reloj
export const relojJuego = new RelojJuego();

console.log('RelojJuego cargado'); 