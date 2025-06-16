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
        
        // Estados: 'previo' (antes del primer disparo), 'jugando', 'pausado', 'terminado'
        this.estado = 'previo';
    }
    
    // Configurar tiempo para el nivel
    configurarTiempo(tiempoEnMs) {
        this.tiempoTotal = tiempoEnMs;
        this.tiempoRestante = tiempoEnMs;
    }
    
    // Iniciar cronómetro con el primer disparo
    iniciarConPrimerDisparo() {
        if (!this.primerDisparo) {
            this.primerDisparo = true;
            this.iniciado = true;
            this.estado = 'jugando';
            this.ultimoTiempo = performance.now();
            console.log('Cronómetro iniciado con primer disparo');
        }
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
    
    // Obtener tiempo formateado para mostrar
    getTiempoFormateado() {
        const segundos = this.getTiempoRestante() / 1000;
        return segundos.toFixed(1);
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
        this.estado = 'previo';
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