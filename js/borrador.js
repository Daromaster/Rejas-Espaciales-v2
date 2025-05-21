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
    },
    // Botón de fin de juego
    endGameButton: {
        visible: false,
        position: { x: 20, y: 20 }, // Movido más a la esquina
        width: 150,                 // Más ancho
        height: 50,                 // Más alto
        text: "FINALIZAR JUEGO",    // Todo mayúsculas
        color: "rgba(255, 50, 50, 0.9)", // Más opaco
        hovered: false
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
    borradorElements.endGameButton.visible = window.IS_LOCAL_ENVIRONMENT;
    
    // Inicialización diferida para asegurarnos que canvasBorrador esté disponible
    setTimeout(() => {
        // Crear botón real en HTML en lugar de dibujarlo en el canvas
        createRealEndGameButton();
        
        // Configurar eventos en el canvas para otros elementos de borrador
        setupBorradorEventListeners();
        
        // Forzar redibujado inicial
        dibujarBorrador();
    }, 500);
}

// Configurar event listeners para la capa borrador
function setupBorradorEventListeners() {
    if (window.IS_LOCAL_ENVIRONMENT) {
        if (!canvasBorrador) {
            console.error("Error: canvasBorrador no está disponible para registrar eventos");
            return;
        }
        
        console.log("Configurando event listeners para la capa borrador");
        
        // Remover listeners previos si existieran
        canvasBorrador.removeEventListener('click', handleBorradorClick);
        canvasBorrador.removeEventListener('mousemove', handleBorradorMouseMove);
        document.removeEventListener('click', checkGlobalClick);
        document.removeEventListener('mousemove', checkGlobalMouseMove);
        
        // Añadir nuevos listeners con logging
        canvasBorrador.addEventListener('click', function(e) {
            console.log("Clic detectado en capa borrador");
            handleBorradorClick(e);
        });
        
        canvasBorrador.addEventListener('mousemove', function(e) {
            // Sin log para evitar saturar la consola
            handleBorradorMouseMove(e);
        });
        
        // Agregar listeners globales como respaldo
        document.addEventListener('click', checkGlobalClick);
        document.addEventListener('mousemove', checkGlobalMouseMove);
        
        console.log("Event listeners configurados correctamente");
    }
}

// Función para crear un botón HTML real para finalizar el juego
function createRealEndGameButton() {
    if (!window.IS_LOCAL_ENVIRONMENT) return;
    
    // Eliminar el botón anterior si existe
    const existingButton = document.getElementById('end-game-real-button');
    if (existingButton) {
        existingButton.parentNode.removeChild(existingButton);
    }
    
    // Crear el botón real como elemento HTML
    const button = document.createElement('button');
    button.id = 'end-game-real-button';
    button.textContent = 'FINALIZAR JUEGO';
    
    // Estilos para el botón
    button.style.position = 'absolute';
    button.style.top = '70px'; // Movido más abajo para no tapar el puntaje
    button.style.left = '20px';
    button.style.width = '150px';
    button.style.height = '50px';
    button.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
    button.style.color = 'white';
    button.style.border = '2px solid white';
    button.style.borderRadius = '8px';
    button.style.fontSize = '16px';
    button.style.fontWeight = 'bold';
    button.style.cursor = 'pointer';
    button.style.zIndex = '9999'; // Asegurar que esté por encima de todo
    button.style.boxShadow = '2px 2px 10px rgba(0, 0, 0, 0.5)';
    
    // Efectos de hover
    button.onmouseover = function() {
        this.style.backgroundColor = 'rgba(255, 0, 0, 1)';
        this.style.transform = 'scale(1.05)';
        console.log("Cursor sobre el botón FINALIZAR JUEGO (botón real)");
    };
    
    button.onmouseout = function() {
        this.style.backgroundColor = 'rgba(255, 50, 50, 0.9)';
        this.style.transform = 'scale(1)';
    };
    
    // Manejar el clic
    button.onclick = function() {
        console.log("¡Fin del juego! (botón real clickeado)");
        
        // Si existe la función endGame, llamarla
        if (typeof window.endGame === 'function') {
            console.log("Llamando a la función endGame()");
            window.endGame();
        }
    };
    
    // Añadir el botón al DOM - dentro del mismo contenedor que el canvas
    const canvas = document.getElementById('canvas-juego');
    if (canvas && canvas.parentNode) {
        canvas.parentNode.appendChild(button);
        console.log("Botón real HTML creado y añadido al DOM");
    } else {
        // Si no encuentra el canvas o su padre, añadirlo directamente al body
        document.body.appendChild(button);
        console.log("Botón real HTML añadido al body (no se encontró el contenedor del canvas)");
    }
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
    
    // Ya no dibujamos el botón en el canvas, ahora usamos un elemento HTML real
}

// Función para manejar clics en la capa borrador
function handleBorradorClick(event) {
    if (!window.IS_LOCAL_ENVIRONMENT) return;
    
    // Obtener las coordenadas del clic relativas al canvas
    const rect = canvasBorrador.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log(`Clic en coordenadas: (${x}, ${y})`);
    
    // Verificar si el clic fue sobre el botón de fin de juego
    const btn = borradorElements.endGameButton;
    const btnArea = {
        x1: btn.position.x,
        y1: btn.position.y,
        x2: btn.position.x + btn.width,
        y2: btn.position.y + btn.height
    };
    
    console.log(`Área del botón: (${btnArea.x1}, ${btnArea.y1}) a (${btnArea.x2}, ${btnArea.y2})`);
    
    if (btn.visible && 
        x >= btnArea.x1 && x <= btnArea.x2 && 
        y >= btnArea.y1 && y <= btnArea.y2) {
        
        console.log("¡Fin del juego!");
        
        // Si existe la función endGame, llamarla
        if (typeof window.endGame === 'function') {
            console.log("Llamando a la función endGame()");
            window.endGame();
        }
    }
}

// Función para detectar si el cursor está sobre el botón
function handleBorradorMouseMove(event) {
    if (!window.IS_LOCAL_ENVIRONMENT) return;
    
    // Obtener las coordenadas del ratón relativas al canvas
    const rect = canvasBorrador.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Verificar si el ratón está sobre el botón de fin de juego
    const btn = borradorElements.endGameButton;
    const isHovered = (
        btn.visible && 
        x >= btn.position.x && 
        x <= btn.position.x + btn.width && 
        y >= btn.position.y && 
        y <= btn.position.y + btn.height
    );
    
    // Actualizar el estado del hover y el cursor
    if (isHovered !== btn.hovered) {
        btn.hovered = isHovered;
        canvasBorrador.style.cursor = isHovered ? 'pointer' : 'default';
        
        // Log para debugging cuando cambia el estado hover
        if (isHovered) {
            console.log("Cursor sobre el botón Finalizar Juego");
        }
        
        // Redibujar para actualizar la apariencia del botón
        dibujarBorrador();
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

// Función para verificar clics a nivel global y comprobar si están sobre el botón
function checkGlobalClick(event) {
    if (!window.IS_LOCAL_ENVIRONMENT || !canvasBorrador) return;
    
    // Solo procesar si existe canvasBorrador
    const canvasRect = canvasBorrador.getBoundingClientRect();
    
    // Verificar si el clic ocurrió dentro del área del canvas
    if (
        event.clientX >= canvasRect.left && 
        event.clientX <= canvasRect.right && 
        event.clientY >= canvasRect.top && 
        event.clientY <= canvasRect.bottom
    ) {
        // Convertir coordenadas del documento a coordenadas del canvas
        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;
        
        console.log(`Clic global detectado en canvas en: (${x}, ${y})`);
        
        // Verificar si el clic fue sobre el botón
        checkButtonClick(x, y);
    }
}

// Verificar si un clic en las coordenadas x,y está sobre el botón
function checkButtonClick(x, y) {
    const btn = borradorElements.endGameButton;
    if (!btn.visible) return;
    
    if (
        x >= btn.position.x && 
        x <= btn.position.x + btn.width && 
        y >= btn.position.y && 
        y <= btn.position.y + btn.height
    ) {
        console.log("¡Fin del juego detectado por sistema alternativo!");
        
        // Si existe la función endGame, llamarla
        if (typeof window.endGame === 'function') {
            console.log("Llamando a la función endGame()");
            window.endGame();
        }
    }
}

// Función para verificar movimientos de mouse a nivel global
function checkGlobalMouseMove(event) {
    if (!window.IS_LOCAL_ENVIRONMENT || !canvasBorrador) return;
    
    // Solo procesar si existe canvasBorrador
    const canvasRect = canvasBorrador.getBoundingClientRect();
    
    // Verificar si el mouse está dentro del área del canvas
    if (
        event.clientX >= canvasRect.left && 
        event.clientX <= canvasRect.right && 
        event.clientY >= canvasRect.top && 
        event.clientY <= canvasRect.bottom
    ) {
        // Convertir coordenadas del documento a coordenadas del canvas
        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;
        
        // Actualizar el estado hover del botón
        updateButtonHoverState(x, y);
    } else {
        // Si el mouse está fuera del canvas, asegurar que no haya estado hover
        if (borradorElements.endGameButton.hovered) {
            borradorElements.endGameButton.hovered = false;
            dibujarBorrador();
        }
    }
}

// Actualizar el estado hover del botón
function updateButtonHoverState(x, y) {
    const btn = borradorElements.endGameButton;
    if (!btn.visible) return;
    
    const isHovered = (
        x >= btn.position.x && 
        x <= btn.position.x + btn.width && 
        y >= btn.position.y && 
        y <= btn.position.y + btn.height
    );
    
    // Actualizar el estado del hover y el cursor solo si cambió
    if (isHovered !== btn.hovered) {
        btn.hovered = isHovered;
        if (canvasBorrador) {
            canvasBorrador.style.cursor = isHovered ? 'pointer' : 'default';
        }
        
        // Log para debugging cuando cambia el estado hover
        if (isHovered) {
            console.log("Cursor sobre el botón FINALIZAR JUEGO (sistema alternativo)");
        }
        
        // Redibujar para actualizar la apariencia del botón
        dibujarBorrador();
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

// Exportar funciones al scope global
window.initBorrador = initBorrador;
window.dibujarBorrador = dibujarBorrador;
window.setBorradorTargetPoint = setBorradorTargetPoint;
window.setBorradorStateIndicators = setBorradorStateIndicators; 