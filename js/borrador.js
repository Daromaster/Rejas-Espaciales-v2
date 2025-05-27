// ===== BOTÓN TOGGLE BORRADOR (SIEMPRE VISIBLE) =====
// Este botón controla la visibilidad de todos los demás elementos de debug
let borradorToggleState = {
    enabled: localStorage.getItem('borrador-enabled') === 'true' || false
    // Ya no necesitamos las propiedades del botón canvas porque ahora es HTML
};

// ===== BOTÓN TOGGLE MÓVIL SIMULADO (SOLO PARA DEBUG) =====
let debugMobileState = {
    enabled: false, // Siempre empieza en modo desktop
    // Ya no necesitamos las propiedades del botón canvas porque será HTML
};

// ===== RESTO DE ELEMENTOS BORRADOR (CONTROLADOS POR TOGGLE) =====
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
        position: { x: 20, y: 70 }, // Movido más abajo para dejar espacio al toggle
        width: 150,                 
        height: 50,                 
        text: "FINALIZAR JUEGO",    
        color: "rgba(255, 50, 50, 0.9)", 
        hovered: false
    },
    // Botón de ver ranking (solo para admin en Live Server)
    viewRankingButton: {
        visible: false,
        position: { x: 20, y: 130 }, // Movido más abajo 
        width: 150,                 
        height: 50,                 
        text: "VER RANKING",        
        color: "rgba(50, 255, 50, 0.9)", 
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
    console.log("Borrador toggle enabled =", borradorToggleState.enabled);
    
    // Inicialización diferida para asegurarnos que canvasBorrador esté disponible
    setTimeout(() => {
        // SIEMPRE crear el botón toggle HTML (igual que los otros botones que funcionan)
        createRealToggleButton();
        
        // SIEMPRE configurar event listeners para canvas (para otros elementos de debug)
        setupBorradorEventListeners();
        
        // ===== SOLO SI ESTÁ HABILITADO EL TOGGLE =====
        if (borradorToggleState.enabled) {
            borradorElements.targetPoint.visible = true;
            borradorElements.stateIndicators.visible = true;
            borradorElements.endGameButton.visible = true;
            borradorElements.viewRankingButton.visible = true;
            
            // Crear botón real en HTML en lugar de dibujarlo en el canvas
            createRealEndGameButton();
            
            // Crear botón de ver ranking para admin
            createRealViewRankingButton();
        } else {
            // Si no está habilitado, asegurar que todo esté oculto
            borradorElements.targetPoint.visible = false;
            borradorElements.stateIndicators.visible = false;
            borradorElements.endGameButton.visible = false;
            borradorElements.viewRankingButton.visible = false;
        }
        
        // Forzar redibujado inicial (solo para elementos de canvas, no botones HTML)
        dibujarBorrador();
    }, 500);
}

// ===== FUNCIÓN PARA MANEJAR EL TOGGLE =====
function toggleBorradorMode() {
    borradorToggleState.enabled = !borradorToggleState.enabled;
    localStorage.setItem('borrador-enabled', borradorToggleState.enabled.toString());
    
    console.log("🔧 Toggle borrador:", borradorToggleState.enabled ? "ACTIVADO" : "DESACTIVADO");
    
    if (borradorToggleState.enabled) {
        // Activar modo debug
        borradorElements.targetPoint.visible = true;
        borradorElements.stateIndicators.visible = true;
        borradorElements.endGameButton.visible = true;
        borradorElements.viewRankingButton.visible = true;
        
        // Crear botones HTML
        createRealEndGameButton();
        createRealViewRankingButton();
        createRealDebugMobileButton();
    } else {
        // Desactivar modo debug
        borradorElements.targetPoint.visible = false;
        borradorElements.stateIndicators.visible = false;
        borradorElements.endGameButton.visible = false;
        borradorElements.viewRankingButton.visible = false;
        
        // Remover botones HTML
        removeRealButtons();
    }
    
    // Forzar redibujado para elementos del canvas
    dibujarBorrador();
}

// ===== FUNCIÓN PARA CREAR BOTÓN TOGGLE COMO HTML REAL =====
function createRealToggleButton() {
    if (!window.IS_LOCAL_ENVIRONMENT) return;
    
    // Eliminar el botón anterior si existe
    const existingButton = document.getElementById('toggle-debug-real-button');
    if (existingButton) {
        existingButton.parentNode.removeChild(existingButton);
    }
    
    // Crear el botón real como elemento HTML
    const button = document.createElement('button');
    button.id = 'toggle-debug-real-button';
    
    // Texto según estado actual
    const statusText = borradorToggleState.enabled ? "ON" : "OFF";
    button.textContent = `🔧 DEBUG ${statusText}`;
    
    // Estilos para el botón
    button.style.position = 'absolute';
    button.style.top = '80px'; // Bajado para no tapar puntaje
    button.style.left = '20px';
    button.style.width = '120px';
    button.style.height = '35px';
    
    // Color según estado
    const bgColor = borradorToggleState.enabled ? 
        'rgba(100, 255, 100, 0.9)' : // Verde si activo
        'rgba(100, 100, 255, 0.9)';  // Azul si inactivo
    
    button.style.backgroundColor = bgColor;
    button.style.color = 'white';
    button.style.border = '2px solid white';
    button.style.borderRadius = '8px';
    button.style.fontSize = '11px';
    button.style.fontWeight = 'bold';
    button.style.cursor = 'pointer';
    button.style.zIndex = '9999'; // Asegurar que esté por encima de todo
    button.style.boxShadow = '2px 2px 10px rgba(0, 0, 0, 0.5)';
    
    // Efectos de hover
    button.onmouseover = function() {
        const hoverColor = borradorToggleState.enabled ? 
            'rgba(100, 255, 100, 1)' : 
            'rgba(100, 100, 255, 1)';
        this.style.backgroundColor = hoverColor;
        this.style.transform = 'scale(1.05)';
        console.log("Cursor sobre el botón TOGGLE DEBUG (botón real)");
    };
    
    button.onmouseout = function() {
        this.style.backgroundColor = bgColor;
        this.style.transform = 'scale(1)';
    };
    
    // Manejar el clic - ESTA ES LA PARTE CLAVE QUE FUNCIONA
    button.onclick = function() {
        console.log("¡Clic en botón toggle! (botón real HTML)");
        toggleBorradorMode();
        
        // Actualizar el texto del botón inmediatamente
        const newStatusText = borradorToggleState.enabled ? "ON" : "OFF";
        this.textContent = `🔧 DEBUG ${newStatusText}`;
        
        // Actualizar color del botón
        const newBgColor = borradorToggleState.enabled ? 
            'rgba(100, 255, 100, 0.9)' : 
            'rgba(100, 100, 255, 0.9)';
        this.style.backgroundColor = newBgColor;
    };
    
    // Añadir el botón al DOM - dentro del mismo contenedor que el canvas
    const canvas = document.getElementById('canvas-juego');
    if (canvas && canvas.parentNode) {
        canvas.parentNode.appendChild(button);
        console.log("Botón TOGGLE DEBUG real HTML creado y añadido al DOM");
    } else {
        // Si no encuentra el canvas o su padre, añadirlo directamente al body
        document.body.appendChild(button);
        console.log("Botón TOGGLE DEBUG real HTML añadido al body (no se encontró el contenedor del canvas)");
    }
}

// ===== FUNCIÓN PARA REMOVER BOTONES HTML =====
function removeRealButtons() {
    const endGameButton = document.getElementById('end-game-real-button');
    const viewRankingButton = document.getElementById('view-ranking-real-button');
    const debugMobileButton = document.getElementById('debug-mobile-real-button');
    
    if (endGameButton) {
        endGameButton.parentNode.removeChild(endGameButton);
        console.log("Botón FINALIZAR JUEGO removido");
    }
    
    if (viewRankingButton) {
        viewRankingButton.parentNode.removeChild(viewRankingButton);
        console.log("Botón VER RANKING removido");
    }
    
    if (debugMobileButton) {
        debugMobileButton.parentNode.removeChild(debugMobileButton);
        console.log("Botón DEBUG MÓVIL removido");
    }
}

// Configurar event listeners para la capa borrador
function setupBorradorEventListeners() {
    // SIEMPRE configurar event listeners para que el toggle button funcione
    if (!window.IS_LOCAL_ENVIRONMENT) return;
    
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

// Función para crear un botón HTML real para finalizar el juego
function createRealEndGameButton() {
    if (!borradorToggleState.enabled || !window.IS_LOCAL_ENVIRONMENT) return;
    
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
    button.style.top = '130px'; // Bajado por reposición del toggle
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
        // No permitir finalizar el juego si hay un panel modal activo
        if (window.shootingSystem && window.shootingSystem.modalActive) {
            console.log("No se puede finalizar el juego mientras hay un panel abierto");
            return;
        }
        
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

// Función para crear un botón HTML real para ver ranking
function createRealViewRankingButton() {
    if (!borradorToggleState.enabled || !window.IS_LOCAL_ENVIRONMENT) return;
    
    // Eliminar el botón anterior si existe
    const existingButton = document.getElementById('view-ranking-real-button');
    if (existingButton) {
        existingButton.parentNode.removeChild(existingButton);
    }
    
    // Crear el botón real como elemento HTML
    const button = document.createElement('button');
    button.id = 'view-ranking-real-button';
    button.textContent = 'VER RANKING';
    
    // Estilos para el botón
    button.style.position = 'absolute';
    button.style.top = '190px'; // Bajado por reposición del toggle
    button.style.left = '20px';
    button.style.width = '150px';
    button.style.height = '50px';
    button.style.backgroundColor = 'rgba(50, 255, 50, 0.9)';
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
        this.style.backgroundColor = 'rgba(0, 255, 0, 1)';
        this.style.transform = 'scale(1.05)';
        console.log("Cursor sobre el botón VER RANKING (botón real)");
    };
    
    button.onmouseout = function() {
        this.style.backgroundColor = 'rgba(50, 255, 50, 0.9)';
        this.style.transform = 'scale(1)';
    };
    
    // Manejar el clic
    button.onclick = function() {
        console.log("¡Ver Ranking clickeado! (botón real)");
        
        // Llamar a la función viewRanking
        if (typeof viewRanking === 'function') {
            console.log("Llamando a la función viewRanking()");
            viewRanking();
        } else {
            console.error("La función viewRanking no está disponible");
        }
    };
    
    // Añadir el botón al DOM - dentro del mismo contenedor que el canvas
    const canvas = document.getElementById('canvas-juego');
    if (canvas && canvas.parentNode) {
        canvas.parentNode.appendChild(button);
        console.log("Botón VIEW RANKING real HTML creado y añadido al DOM");
    } else {
        // Si no encuentra el canvas o su padre, añadirlo directamente al body
        document.body.appendChild(button);
        console.log("Botón VIEW RANKING real HTML añadido al body (no se encontró el contenedor del canvas)");
    }
}

// Función para crear un botón HTML real para debug móvil
function createRealDebugMobileButton() {
    if (!borradorToggleState.enabled || !window.IS_LOCAL_ENVIRONMENT) return;
    
    // Eliminar el botón anterior si existe
    const existingButton = document.getElementById('debug-mobile-real-button');
    if (existingButton) {
        existingButton.parentNode.removeChild(existingButton);
    }
    
    // Crear el botón real como elemento HTML
    const button = document.createElement('button');
    button.id = 'debug-mobile-real-button';
    
    // Establecer texto inicial según estado actual
    const statusText = debugMobileState.enabled ? "ON" : "OFF";
    button.textContent = `📱 MÓVIL ${statusText}`;
    
    // Estilos para el botón
    button.style.position = 'absolute';
    button.style.top = '250px'; // Posicionado debajo de VER RANKING
    button.style.left = '20px';
    button.style.width = '150px';
    button.style.height = '50px';
    
    // Color inicial según estado
    const initialColor = debugMobileState.enabled ? 
        'rgba(255, 100, 150, 1)' : 
        'rgba(255, 100, 150, 0.6)';
    button.style.backgroundColor = initialColor;
    
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
        const hoverColor = debugMobileState.enabled ? 
            'rgba(255, 120, 170, 1)' : 
            'rgba(255, 120, 170, 0.8)';
        this.style.backgroundColor = hoverColor;
        this.style.transform = 'scale(1.05)';
        console.log("Cursor sobre el botón DEBUG MÓVIL (botón real)");
    };
    
    button.onmouseout = function() {
        const normalColor = debugMobileState.enabled ? 
            'rgba(255, 100, 150, 1)' : 
            'rgba(255, 100, 150, 0.6)';
        this.style.backgroundColor = normalColor;
        this.style.transform = 'scale(1)';
    };
    
    // Manejar el clic
    button.onclick = function() {
        console.log("¡Clic en botón debug móvil! (botón real HTML)");
        toggleDebugMobile();
    };
    
    // Añadir el botón al DOM - dentro del mismo contenedor que el canvas
    const canvas = document.getElementById('canvas-juego');
    if (canvas && canvas.parentNode) {
        canvas.parentNode.appendChild(button);
        console.log("Botón DEBUG MÓVIL real HTML creado y añadido al DOM");
    } else {
        // Si no encuentra el canvas o su padre, añadirlo directamente al body
        document.body.appendChild(button);
        console.log("Botón DEBUG MÓVIL real HTML añadido al body (no se encontró el contenedor del canvas)");
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

    // Ya no dibujamos el botón toggle aquí porque ahora es HTML

    // ===== DIBUJAR ELEMENTOS DE CANVAS (SOLO SI TOGGLE ESTÁ ACTIVO) =====
    if (borradorToggleState.enabled) {
        // Ya no dibujamos el botón debug móvil aquí porque ahora es HTML
        
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
}

// ===== FUNCIÓN PARA ALTERNAR DEBUG MÓVIL =====
function toggleDebugMobile() {
    debugMobileState.enabled = !debugMobileState.enabled;
    
    console.log(`Debug móvil ${debugMobileState.enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
    
    // Actualizar el texto del botón HTML
    const debugMobileButton = document.getElementById('debug-mobile-real-button');
    if (debugMobileButton) {
        const statusText = debugMobileState.enabled ? "ON" : "OFF";
        debugMobileButton.textContent = `📱 MÓVIL ${statusText}`;
        
        // Actualizar color del botón según estado
        if (debugMobileState.enabled) {
            debugMobileButton.style.backgroundColor = 'rgba(255, 100, 150, 1)';
        } else {
            debugMobileButton.style.backgroundColor = 'rgba(255, 100, 150, 0.6)';
        }
    }
    
    // Actualizar la detección de móvil en shootingSystem si existe
    if (window.shootingSystem) {
        // Forzar recalculo de isMobile con la nueva función
        window.shootingSystem.isMobile = window.checkIfMobileWithDebug();
        console.log(`shootingSystem.isMobile actualizado a: ${window.shootingSystem.isMobile}`);
        
        // Forzar actualización de elementos de interfaz
        if (typeof window.updateInstructions === 'function') {
            window.updateInstructions();
        }
        
        // Forzar actualización de la UI para móvil
        if (typeof window.adjustUIForMobile === 'function') {
            window.adjustUIForMobile();
        }
    }
    
    // Ya no necesitamos redibujar el borrador porque el botón es HTML
}

// Función para manejar clics en la capa borrador
function handleBorradorClick(event) {
    if (!window.IS_LOCAL_ENVIRONMENT) return;
    
    // No procesar clics si hay un panel modal activo
    if (window.shootingSystem && window.shootingSystem.modalActive) {
        console.log("No se procesan clics en el canvas de borrador mientras hay un panel abierto");
        return;
    }
    
    // Obtener las coordenadas del clic relativas al canvas
    const rect = canvasBorrador.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    console.log(`Clic en coordenadas: (${x}, ${y})`);
    
    // Ya no verificamos clics en botón toggle porque ahora es HTML
    
    // ===== VERIFICAR CLICS EN OTROS ELEMENTOS (SOLO SI TOGGLE ACTIVO) =====
    if (!borradorToggleState.enabled) return;
    
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
    
    // No procesar movimientos de ratón si hay un panel modal activo
    if (window.shootingSystem && window.shootingSystem.modalActive) {
        // Asegurar que el cursor no muestre interacción
        canvasBorrador.style.cursor = 'default';
        return;
    }
    
    // Obtener las coordenadas del ratón relativas al canvas
    const rect = canvasBorrador.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    let isAnyButtonHovered = false;
    let needsRedraw = false;
    
    // Ya no verificamos hover en botón toggle porque ahora es HTML
    
    // ===== VERIFICAR HOVER EN OTROS ELEMENTOS (SOLO SI TOGGLE ACTIVO) =====
    if (borradorToggleState.enabled) {
        // Verificar si el ratón está sobre el botón de fin de juego
        const btn = borradorElements.endGameButton;
        const isHovered = (
            btn.visible && 
            x >= btn.position.x && 
            x <= btn.position.x + btn.width && 
            y >= btn.position.y && 
            y <= btn.position.y + btn.height
        );
        
        // Actualizar el estado del hover del botón de fin de juego
        if (isHovered !== btn.hovered) {
            btn.hovered = isHovered;
            needsRedraw = true;
            
            // Log para debugging cuando cambia el estado hover
            if (isHovered) {
                console.log("Cursor sobre el botón Finalizar Juego");
            }
        }
        
        if (isHovered) {
            isAnyButtonHovered = true;
        }
    }
    
    // Actualizar cursor
    canvasBorrador.style.cursor = isAnyButtonHovered ? 'pointer' : 'default';
    
    // Redibujar si es necesario
    if (needsRedraw) {
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
    // Ya no verificamos clics en botón toggle porque ahora es HTML
    
    // ===== VERIFICAR CLICS EN OTROS ELEMENTOS (SOLO SI TOGGLE ACTIVO) =====
    if (!borradorToggleState.enabled) return;
    
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
    let isAnyButtonHovered = false;
    let needsRedraw = false;
    
    // Ya no verificamos hover en botón toggle porque ahora es HTML
    
    // ===== VERIFICAR HOVER EN OTROS ELEMENTOS (SOLO SI TOGGLE ACTIVO) =====
    if (borradorToggleState.enabled) {
        const btn = borradorElements.endGameButton;
        if (btn.visible) {
            const isHovered = (
                x >= btn.position.x && 
                x <= btn.position.x + btn.width && 
                y >= btn.position.y && 
                y <= btn.position.y + btn.height
            );
            
            // Actualizar el estado del hover y el cursor solo si cambió
            if (isHovered !== btn.hovered) {
                btn.hovered = isHovered;
                needsRedraw = true;
                
                // Log para debugging cuando cambia el estado hover
                if (isHovered) {
                    console.log("Cursor sobre el botón FINALIZAR JUEGO (sistema alternativo)");
                }
            }
            
            if (isHovered) {
                isAnyButtonHovered = true;
            }
        }
    }
    
    // Actualizar cursor
    if (canvasBorrador) {
        canvasBorrador.style.cursor = isAnyButtonHovered ? 'pointer' : 'default';
    }
    
    // Redibujar si es necesario
    if (needsRedraw) {
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

// ===== FUNCIÓN PARA SIMULAR MÓVIL EN DEBUG =====
function isDebugMobileEnabled() {
    // Solo está disponible en entorno local Y si la capa borrador está activa
    return window.IS_LOCAL_ENVIRONMENT && borradorToggleState.enabled && debugMobileState.enabled;
}

// Función global que modifica la detección de móvil original
window.checkIfMobileWithDebug = function() {
    // Detectar móvil real usando la función original
    const realMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
    
    // Si estamos en debug móvil, devolver true
    if (isDebugMobileEnabled()) {
        return true;
    }
    
    // Si no, devolver la detección real
    return realMobile;
};

// Exportar funciones al scope global (FUNCIONES DEL SISTEMA DE BORRADOR - NO CONFUNDIR CON DEBUGGING)
window.initBorrador = initBorrador;
window.dibujarBorrador = dibujarBorrador;
window.setBorradorTargetPoint = setBorradorTargetPoint;
window.setBorradorStateIndicators = setBorradorStateIndicators;

// NUEVA FUNCIÓN DE ADMIN: Ver ranking de debugging (solo en Live Server)
async function viewRanking() {
    if (!window.IS_LOCAL_ENVIRONMENT) {
        console.log("Función viewRanking solo disponible en entorno local");
        return;
    }
    
    console.log("🔍 Abriendo panel de ranking de admin...");
    
    // Crear panel modal
    const adminPanel = createAdminRankingPanel();
    document.body.appendChild(adminPanel);
    
    // Activar modo modal
    setModalActive(true);
    
    // Cargar datos del ranking directo desde Render
    await loadAdminRankingData(adminPanel);
}

// Función para crear el panel de ranking de admin
function createAdminRankingPanel() {
    const panel = document.createElement('div');
    panel.id = 'admin-ranking-panel';
    panel.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 20, 0.95);
        color: white;
        padding: 30px;
        border-radius: 15px;
        border: 2px solid rgba(0, 255, 255, 0.8);
        box-shadow: 0 0 50px rgba(0, 255, 255, 0.3);
        z-index: 10000;
        max-width: 80vw;
        max-height: 80vh;
        overflow-y: auto;
        font-family: Arial, sans-serif;
    `;
    
    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: rgba(50, 255, 50, 1); margin: 0; font-size: 24px;">🔧 Admin - Ranking Real</h2>
            <button id="admin-close-btn" style="background: rgba(255, 50, 50, 0.8); color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; font-weight: bold;">✕ CERRAR</button>
        </div>
        <div id="admin-loading" style="margin: 20px 0; text-align: center;">
            <div style="color: rgba(255, 255, 0, 0.9);">🔄 Conectando al backend de Render...</div>
            <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 5px;">URL: https://rejas-espaciales-backend-v2.onrender.com</div>
        </div>
        <div id="admin-ranking-content" style="display: none;">
            <div id="admin-server-info" style="margin-bottom: 15px; padding: 10px; background: rgba(0, 100, 255, 0.1); border-radius: 5px; font-size: 12px;"></div>
            <div id="admin-ranking-table" style="max-height: 400px; overflow-y: auto;"></div>
        </div>
        <div id="admin-error" style="display: none; color: rgba(255, 100, 100, 0.9); margin: 20px 0;"></div>
        <div style="margin-top: 20px; text-align: center;">
            <button id="admin-refresh-btn" style="background: rgba(0, 255, 255, 0.8); color: black; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-right: 10px;">🔄 ACTUALIZAR</button>
        </div>
    `;
    
    // Configurar botón de cerrar
    const closeBtn = panel.querySelector('#admin-close-btn');
    closeBtn.onclick = () => {
        panel.remove();
        setModalActive(false);
    };
    
    // Configurar botón de actualizar
    const refreshBtn = panel.querySelector('#admin-refresh-btn');
    refreshBtn.onclick = () => {
        loadAdminRankingData(panel);
    };
    
    return panel;
}

// Función para cargar datos usando el mismo sistema que el panel de fin de juego
async function loadAdminRankingData(panel) {
    const loadingDiv = panel.querySelector('#admin-loading');
    const contentDiv = panel.querySelector('#admin-ranking-content');
    const errorDiv = panel.querySelector('#admin-error');
    const serverInfoDiv = panel.querySelector('#admin-server-info');
    const tableDiv = panel.querySelector('#admin-ranking-table');
    
    // Mostrar loading
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    
    try {
        console.log("🌐 [ADMIN DEBUG] Obteniendo datos del ranking desde PRODUCCIÓN...");
        
        let rankingData = [];
        let isLocalData = false;
        let serverInfo = {
            version: 'N/A',
            revision: 'N/A',
            totalScores: 0,
            lastUpdate: Date.now()
        };
        
        // IMPORTANTE: Para admin, SIEMPRE usar la URL de producción
        // No usar apiClient.ranking.getAll() porque eso usa URL local desde localhost
        const PRODUCTION_URL = 'https://rejas-espaciales-backend-v2.onrender.com';
        
        // Aplicar timeout para prevenir bloqueos
        const fetchPromise = fetch(`${PRODUCTION_URL}/ranking`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'RejasEspacialesGame/AdminDebug'
            }
        });
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout obteniendo ranking')), 6000);
        });
        
        try {
            console.log(`🌐 [ADMIN DEBUG] Conectando a: ${PRODUCTION_URL}/ranking`);
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            rankingData = await response.json();
            console.log(`✅ [ADMIN DEBUG] Datos obtenidos exitosamente: ${rankingData.length} entradas`);
            
            // Verificar si son datos locales (no deberían serlo desde producción)
            isLocalData = rankingData.length > 0 && rankingData[0].local === true;
            
            // Intentar obtener info del servidor
            try {
                const infoResponse = await fetch(`${PRODUCTION_URL}/info`);
                if (infoResponse.ok) {
                    serverInfo = await infoResponse.json();
                }
            } catch (infoError) {
                console.warn("No se pudo obtener info del servidor:", infoError);
            }
            
            serverInfo.totalScores = rankingData.length;
            
        } catch (fetchError) {
            console.error("❌ [ADMIN DEBUG] Error al obtener ranking:", fetchError);
            
            // Para admin debug, NO usar fallback local, mostrar el error real
            throw new Error(`Error de conexión a producción: ${fetchError.message}`);
        }
        
        console.log("✅ [ADMIN DEBUG] Datos obtenidos:", {
            totalEntries: rankingData.length,
            isLocal: isLocalData,
            serverInfo: serverInfo,
            source: 'PRODUCCIÓN'
        });
        
        // Ocultar loading y mostrar contenido
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        
        // Mostrar info del servidor/local
        const dataSource = "🌐 Servidor Render (PRODUCCIÓN)";
        const urlDisplay = PRODUCTION_URL;
        
        serverInfoDiv.innerHTML = `
            <strong>📊 Información del Ranking:</strong><br>
            🔄 Fuente: ${dataSource}<br>
            🌐 URL: ${urlDisplay}<br>
            📦 Versión: ${serverInfo.version}<br>
            🔧 Revisión: ${serverInfo.revision}<br>
            📈 Total de scores: ${serverInfo.totalScores}<br>
            🕒 Última actualización: ${new Date(serverInfo.lastUpdate).toLocaleString()}<br>
            ⚠️ <strong style="color: rgba(255, 165, 0, 0.9);">MODO DEBUG - SOLO LECTURA</strong>
        `;
        
        // Usar la misma función que el panel de fin de juego real
        if (rankingData && rankingData.length > 0) {
            // IMPORTANTE: No cambiar el ID, usar la función directamente con el contenedor actual
            
            // Usar la función updateRankingTable de effects.js si está disponible
            if (typeof window.updateRankingTable === 'function') {
                // Parámetros similares a los del panel de fin de juego
                const tableCellPadding = '8px';
                const tableHeaderSize = '14px';
                const isMobile = false; // Admin siempre en desktop
                
                // Temporalmente cambiar el ID para que updateRankingTable funcione
                const originalId = tableDiv.id;
                tableDiv.id = 'ranking-list';
                
                window.updateRankingTable(rankingData, null, null, tableCellPadding, tableHeaderSize, isMobile);
                
                // Restaurar el ID original
                tableDiv.id = originalId;
            } else {
                // Fallback si la función no está disponible
                createAdminRankingTable(tableDiv, rankingData);
            }
        } else {
            tableDiv.innerHTML = `
                <div style="text-align: center; color: rgba(255, 255, 255, 0.6);">
                    <h3>No hay datos en el ranking de producción</h3>
                    <p>El servidor responde pero el ranking está vacío</p>
                    <p style="font-size: 12px;">URL verificada: ${PRODUCTION_URL}/ranking</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error("❌ [ADMIN DEBUG] Error al obtener datos:", error);
        
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.innerHTML = `
            <strong>❌ Error de conexión:</strong><br>
            ${error.message}<br><br>
            <strong>URL intentada:</strong> https://rejas-espaciales-backend-v2.onrender.com/ranking<br>
            <em>Verifica que el servidor de producción esté funcionando</em><br><br>
            <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6);">
                <strong>Nota:</strong> Esta función solo lee datos del servidor de producción.<br>
                No usa datos locales de simulación.
            </div>
        `;
    }
}

// Función para crear la tabla de ranking
function createAdminRankingTable(container, data) {
    if (!data || data.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(255, 255, 255, 0.6);">No hay datos en el ranking</div>';
        return;
    }
    
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
                <tr style="background: rgba(0, 255, 255, 0.2);">
                    <th style="padding: 8px; border: 1px solid rgba(255,255,255,0.3); text-align: left;">#</th>
                    <th style="padding: 8px; border: 1px solid rgba(255,255,255,0.3); text-align: left;">Nombre</th>
                    <th style="padding: 8px; border: 1px solid rgba(255,255,255,0.3); text-align: right;">Puntaje</th>
                    <th style="padding: 8px; border: 1px solid rgba(255,255,255,0.3); text-align: left;">Dispositivo</th>
                    <th style="padding: 8px; border: 1px solid rgba(255,255,255,0.3); text-align: left;">Ubicación</th>
                    <th style="padding: 8px; border: 1px solid rgba(255,255,255,0.3); text-align: left;">Fecha</th>
                    <th style="padding: 8px; border: 1px solid rgba(255,255,255,0.3); text-align: left;">Versión</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach((entry, index) => {
        const rowColor = index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)';
        const fechaDisplay = entry.fechaHora || entry.fecha || 'N/A';
        
        tableHTML += `
            <tr style="background: ${rowColor};">
                <td style="padding: 6px; border: 1px solid rgba(255,255,255,0.2);">${index + 1}</td>
                <td style="padding: 6px; border: 1px solid rgba(255,255,255,0.2);">${entry.nombre || 'N/A'}</td>
                <td style="padding: 6px; border: 1px solid rgba(255,255,255,0.2); text-align: right; font-weight: bold;">${entry.puntaje || 0}</td>
                <td style="padding: 6px; border: 1px solid rgba(255,255,255,0.2);">${entry.dispositivo || 'N/A'}</td>
                <td style="padding: 6px; border: 1px solid rgba(255,255,255,0.2);">${entry.ubicacion || 'N/A'}</td>
                <td style="padding: 6px; border: 1px solid rgba(255,255,255,0.2);">${fechaDisplay}</td>
                <td style="padding: 6px; border: 1px solid rgba(255,255,255,0.2);">${entry.version || 'N/A'}</td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

// Función auxiliar para activar/desactivar modo modal (si no existe)
function setModalActive(active) {
    // Verificar si existe una función setModalActive diferente en window
    // que no sea esta misma función para evitar recursión
    if (window.setModalActive && window.setModalActive !== setModalActive) {
        window.setModalActive(active);
    } else {
        // Fallback simple - usar nuestra propia implementación
        if (active) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// Exportar funciones al scope global
window.viewRanking = viewRanking; 