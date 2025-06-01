// Sistema de renderizado con canvas virtuales
// Este sistema se inicializa UNA ÚNICA VEZ al cargar la página (no por nivel)
// initRenderer prepara:
// 1. Crea todos los canvas virtuales necesarios para el juego
// 2. Obtiene sus contextos de renderizado
// 3. Llama a las funciones init de cada componente (reja, pelota, efectos, etc.)
//    para que preparen sus renders base y configuraciones iniciales
// 4. Exporta los canvas y contextos al scope global
// 5. Ajusta los tamaños iniciales de todos los canvas

let canvasPrincipal, ctxPrincipal;
let canvasFondo, ctxFondo;
let canvasBall, ctxBall;
let canvasGrid, ctxGrid;
let canvasEffects, ctxEffects;
let canvasBorrador, ctxBorrador; // Nueva capa para depuración

function initRenderer() {
    // Inicialización de canvas principal
    canvasPrincipal = document.getElementById("canvas-juego");
    if (!canvasPrincipal) {
        console.error("No se encontró el canvas principal");
        return;
    }
    ctxPrincipal = canvasPrincipal.getContext("2d");

    // Canvas virtuales
    canvasFondo = document.createElement("canvas");
    ctxFondo = canvasFondo.getContext("2d");

    canvasBall = document.createElement("canvas");
    ctxBall = canvasBall.getContext("2d");

    canvasGrid = document.createElement("canvas");
    ctxGrid = canvasGrid.getContext("2d");

    canvasEffects = document.createElement("canvas");
    ctxEffects = canvasEffects.getContext("2d");

    canvasBorrador = document.createElement("canvas"); // Crear canvasBorrador
    ctxBorrador = canvasBorrador.getContext("2d");    // Obtener su contexto

    // Inicializar capa de efectos
    if (typeof initEffects === 'function') {
        initEffects();
    }

    // Inicializar sistema de movimiento de la reja
    if (typeof initGrid === 'function') {
        initGrid();
    }

    // Inicializar fondo
    if (typeof initFondo === 'function') {
        initFondo();
    }
    
    // Inicializar sistema de borrador
    if (typeof initBorrador === 'function') {
        initBorrador();
    }

    // Exportar variables de canvas al scope global
    window.canvasPrincipal = canvasPrincipal;
    window.ctxPrincipal = ctxPrincipal;
    window.canvasFondo = canvasFondo;
    window.ctxFondo = ctxFondo;
    window.canvasBall = canvasBall;
    window.ctxBall = ctxBall;
    window.canvasGrid = canvasGrid;
    window.ctxGrid = ctxGrid;
    window.canvasEffects = canvasEffects;
    window.ctxEffects = ctxEffects;
    window.canvasBorrador = canvasBorrador; // Exportar canvasBorrador
    window.ctxBorrador = ctxBorrador;       // Exportar ctxBorrador

    ajustarCanvasYCapas();
}

function ajustarCanvasYCapas() {
    const zonaJuego = document.getElementById("zona-juego");
    if (!zonaJuego) {
        console.error("No se encontró la zona de juego");
        return;
    }

    // Pausar el juego antes del resize
    const wasRunning = window.gameState && window.gameState.isRunning;
    if (wasRunning) {
        window.gameState.isRunning = false;
        if (window.gameLoopRequestId) {
            window.cancelAnimationFrame(window.gameLoopRequestId);
            window.gameLoopRequestId = null;
        }
        console.log("🎮 Juego pausado para resize");
    }

    // Dar tiempo al navegador para que actualice las dimensiones del contenedor
    setTimeout(() => {
        const width = zonaJuego.offsetWidth;
        const height = zonaJuego.offsetHeight;

        // Ajustar TODOS los canvas al mismo tamaño
        canvasPrincipal.width = width;
        canvasPrincipal.height = height;
        
        // Ajustar canvas virtuales
        canvasGrid.width = width;
        canvasGrid.height = height;
        canvasBall.width = width;
        canvasBall.height = height;
        canvasFondo.width = width;
        canvasFondo.height = height;
        canvasBorrador.width = width;
        canvasBorrador.height = height;
        canvasEffects.width = width;
        canvasEffects.height = height;

        console.log(`📏 Todos los canvas ajustados a ${width}x${height}`);

        // Secuencia de resize de grid
        dibujarRejaBase(); // Esto incluye resizeAllGridCanvases() y recálculo de configGrid
        dibujarGrid();     // Esto aplica las transformaciones necesarias según el nivel
        
        // Redibujar fondo
        if (typeof initFondo === 'function') {
            initFondo(); // Reinicializar fondo para nuevo tamaño
        }
        
        console.log("✨ Grid y fondo redimensionados y redibujados");

        // Reanudar el juego si estaba corriendo
        if (wasRunning) {
            window.gameState.isRunning = true;
            window.gameLoopRequestId = window.requestAnimationFrame(gameLoop);
            console.log("🎮 Juego reanudado después del resize");
        }
    }, 50); // 50ms de delay para asegurar que el navegador actualice las dimensiones
}

function render() {
    // Limpiar canvas principal
    ctxPrincipal.clearRect(0, 0, canvasPrincipal.width, canvasPrincipal.height);
    ctxPrincipal.globalCompositeOperation = 'source-over';

    // 1. Actualizar y dibujar el Fondo
    if (typeof dibujarFondo === 'function') {
        dibujarFondo(); // Asegura que el fondo (estrellas, etc.) se actualice si es dinámico
    }
    // 2. Actualizar y dibujar la Pelota
    // La posición de la pelota es actualizada por gameLoop -> actualizarPosicionBall -> dibujarBall.
    // dibujarBall() ya se encarga de limpiar y redibujar ctxBall.
    // Si la pelota tuviera animaciones propias independientes del movimiento, se llamarían aquí.

    // 3. Actualizar y dibujar la Reja
    if (typeof dibujarGrid === 'function') {
        dibujarGrid(); // Esto llamará a gridMovement.update() y redibujará la reja en canvasGrid
    }

    // 4. Actualizar y dibujar Efectos
    if (typeof dibujarEffects === 'function') {
        dibujarEffects(); // Para cualquier efecto visual adicional
    }

    // 5. Dibujar la capa de Borrador
    if (typeof dibujarBorrador === 'function') {
        dibujarBorrador(); // Maneja los elementos de depuración
    }

    // Copiar capas al canvas principal en el orden deseado
    ctxPrincipal.drawImage(canvasFondo, 0, 0, canvasPrincipal.width, canvasPrincipal.height);    // Capa 1: Fondo
    ctxPrincipal.drawImage(canvasBall, 0, 0, canvasPrincipal.width, canvasPrincipal.height);     // Capa 2: Pelota
    ctxPrincipal.drawImage(canvasGrid, 0, 0, canvasPrincipal.width, canvasPrincipal.height);     // Capa 3: Reja
    ctxPrincipal.drawImage(canvasEffects, 0, 0, canvasPrincipal.width, canvasPrincipal.height);  // Capa 4: Efectos
    ctxPrincipal.drawImage(canvasBorrador, 0, 0, canvasPrincipal.width, canvasPrincipal.height); // Capa 5: Borrador

    // NO solicitar siguiente frame aquí. Será llamado por gameLoop en game.js.
    // requestAnimationFrame(render);
}

// Event listeners
window.addEventListener("DOMContentLoaded", () => {
    initRenderer();
    // La llamada inicial a render() o gameLoop() debe hacerse desde game.js o un punto central
    // después de que todas las inicializaciones estén completas.
    // Ya se comentó la llamada a render() aquí en un paso anterior, lo cual es correcto.
});

window.addEventListener("resize", () => {
    ajustarCanvasYCapas();
    // console.log("Redibujado por resize.");
}); 