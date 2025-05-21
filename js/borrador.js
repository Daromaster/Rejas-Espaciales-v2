// Sistema para manejar la capa de borrador (depuración)
let borradorElements = {
    targetPoint: {
        visible: false,
        position: { x: 0, y: 0 },
        color: "rgba(255, 255, 0, 1)",
        tipo: null // "covered" o "uncovered"
    },
    stateIndicators: {
        visible: false,
        lastMathState: null,
        lastPixelState: null
    }
};

// Inicializar sistema de borrador
function initBorrador() {
    console.log("Sistema de borrador inicializado");
    // Inicialmente verificar si estamos en entorno local
    const isLocalEnv = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
    window.IS_LOCAL_ENVIRONMENT = isLocalEnv; // Asegurar que esté correctamente establecido
    
    console.log("IS_LOCAL_ENVIRONMENT =", window.IS_LOCAL_ENVIRONMENT);
    
    borradorElements.targetPoint.visible = window.IS_LOCAL_ENVIRONMENT;
    borradorElements.stateIndicators.visible = window.IS_LOCAL_ENVIRONMENT;
}

// Función principal para dibujar todos los elementos de la capa borrador
function dibujarBorrador() {
    // Si no estamos en entorno local, no dibujar nada
    if (!window.IS_LOCAL_ENVIRONMENT) {
        if (ctxBorrador) ctxBorrador.clearRect(0, 0, canvasBorrador.width, canvasBorrador.height);
        return;
    }

    // Limpiar primero todo el canvas
    if (ctxBorrador) {
        ctxBorrador.clearRect(0, 0, canvasBorrador.width, canvasBorrador.height);
    } else {
        console.error("No se encontró el contexto de borrador");
        return;
    }

    // Dibujar el punto de destino si está visible
    if (borradorElements.targetPoint.visible) {
        dibujarPuntoDestino();
    }

    // Dibujar los indicadores de estado si están visibles
    if (borradorElements.stateIndicators.visible && window.ballStateDetector) {
        // Obtener la posición actual de la pelota (asumiendo que está disponible globalmente)
        const ballPosition = ballMovement?.config?.currentPosition;
        if (ballPosition) {
            window.ballStateDetector.drawAllStateIndicators(ballPosition);
        }
    }
}

// Función para configurar el punto de destino
function setBorradorTargetPoint(targetInfo, color) {
    if (!targetInfo) {
        borradorElements.targetPoint.visible = false;
        return;
    }

    borradorElements.targetPoint.visible = true;
    borradorElements.targetPoint.tipo = targetInfo.tipo;
    
    let puntoActualizado = null;
    if (targetInfo.tipo === "celda" && typeof window.getCentroCeldaActualizado === 'function') {
        puntoActualizado = window.getCentroCeldaActualizado(targetInfo.indiceCelda);
        borradorElements.targetPoint.color = "rgba(255, 0, 0, 1)";
    } else if (targetInfo.tipo === "interseccion" && typeof window.getInterseccionActualizada === 'function') {
        puntoActualizado = window.getInterseccionActualizada(targetInfo.indiceInterseccion);
        borradorElements.targetPoint.color = "rgba(255, 255, 0, 1)";
    }

    if (puntoActualizado) {
        borradorElements.targetPoint.position = puntoActualizado;
    }
}

// Función para dibujar el punto de destino
function dibujarPuntoDestino() {
    if (!borradorElements.targetPoint.visible) return;
    
    const position = borradorElements.targetPoint.position;
    const color = borradorElements.targetPoint.color;
    
    if (position) {
        ctxBorrador.beginPath();
        ctxBorrador.arc(position.x, position.y, 5, 0, 2 * Math.PI);
        ctxBorrador.fillStyle = color;
        ctxBorrador.fill();
    }
}

// Función para configurar los indicadores de estado
function setBorradorStateIndicators(mathState, pixelState) {
    borradorElements.stateIndicators.visible = true;
    borradorElements.stateIndicators.lastMathState = mathState;
    borradorElements.stateIndicators.lastPixelState = pixelState;
}

// Exportar funciones al scope global
window.initBorrador = initBorrador;
window.dibujarBorrador = dibujarBorrador;
window.setBorradorTargetPoint = setBorradorTargetPoint;
window.setBorradorStateIndicators = setBorradorStateIndicators; 