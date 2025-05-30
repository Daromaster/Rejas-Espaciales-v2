// Sistema de renderizado con canvas virtuales
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

    // Dar tiempo al navegador para que actualice las dimensiones del contenedor
    // después de un cambio de orientación o redimensionamiento
    setTimeout(() => {
        const width = zonaJuego.offsetWidth;
        const height = zonaJuego.offsetHeight;

        // console.log(`Ajustando canvas a: ${width}x${height}`);

        // Asegurar que width y height sean números finitos
        if (!isFinite(width) || !isFinite(height) || width === 0 || height === 0) {
            console.error("Dimensiones inválidas de la zona de juego");
            return;
        }

        // Ajustar tamaño de todos los canvas, incluyendo canvasBorrador
        for (const canvas of [canvasPrincipal, canvasFondo, canvasBall, canvasGrid, canvasEffects, canvasBorrador]) {
            if (canvas) {
                canvas.width = width;
                canvas.height = height;
            }
        }

        // Reinicializar configGrid
        if (typeof calcularConfiguracionGrid === 'function') {
            configGrid = calcularConfiguracionGrid(width, height);
        }

        // Reinicializar el fondo cuando cambia el tamaño
        if (typeof configFondo !== 'undefined') {
            configFondo.isInitialized = false;
        }

        // Inicializar capas
        if (typeof dibujarFondo === 'function') dibujarFondo();
        if (typeof dibujarBall === 'function') dibujarBall();
        if (typeof dibujarGrid === 'function') dibujarGrid();
        if (typeof dibujarEffects === 'function') dibujarEffects();
        // No es necesario redibujar el contenido de borrador aquí, se maneja en game.js
    }, 50); // Pequeño retraso para asegurar que el navegador haya actualizado las dimensiones
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