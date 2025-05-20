// Sistema de reja
let configGrid;

function calcularConfiguracionGrid(width, height) {
    // Usar la dimensión menor del canvas como referencia
    const dimensionMenor = Math.min(width, height);
    const altoZonaReja = dimensionMenor * 0.6;
    const tamCuadrado = altoZonaReja / 4;
  
    // Calcular cantidad de cuadrados horizontales
    const cantidadCuadradosHoriz = Math.floor((width * 0.6) / tamCuadrado);
    const anchoRejaReal = (cantidadCuadradosHoriz + 1) * tamCuadrado;
  
    // Calcular márgenes para centrar
    const margenX = (width - anchoRejaReal) / 2;
    const margenY = (height - altoZonaReja) / 2;

    // Calcular grosor de línea proporcional
    // Para un canvas de 800px de altura menor, el grosor será 24px (doble del anterior)
    // Entonces la proporción es 24/800 = 0.03 (3% de la dimensión menor)
    const grosorLinea = Math.max(8, Math.floor(dimensionMenor * 0.03));
  
    return {
        baseX: margenX,
        baseY: margenY,
        tamCuadrado: tamCuadrado,
        cantidadHoriz: cantidadCuadradosHoriz,
        cantidadVert: 3,
        grosorLinea: grosorLinea,
        // Mantener compatibilidad con el sistema anterior
        numCeldasX: cantidadCuadradosHoriz,
        numCeldasY: 3,
        cellSize: tamCuadrado,
        gridWidth: anchoRejaReal,
        gridHeight: altoZonaReja,
        offsetX: margenX,
        offsetY: margenY
    };
}

function dibujarGrid() {
    if (!configGrid) {
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
    }

    const {
        baseX,
        baseY,
        tamCuadrado,
        cantidadHoriz,
        cantidadVert,
        grosorLinea
    } = configGrid;
    
    ctxGrid.clearRect(0, 0, canvasGrid.width, canvasGrid.height);
    ctxGrid.lineWidth = grosorLinea;
    
    // Obtener el offset del movimiento
    const offset = gridMovement.update();
    
    // Dibujar líneas horizontales
    for (let i = 0.5; i <= cantidadVert + 0.5; i++) {
        const y = baseY + i * tamCuadrado + offset.y;
        const grad = ctxGrid.createLinearGradient(0, y - grosorLinea/2, 0, y + grosorLinea/2);
        grad.addColorStop(0, "rgba(0, 64, 80, 1)");
        grad.addColorStop(0.5, "rgba(0, 255, 255, 1)");
        grad.addColorStop(1, "rgba(0, 64, 80, 1)");
        ctxGrid.strokeStyle = grad;
        ctxGrid.beginPath();
        ctxGrid.moveTo(baseX + offset.x, y);
        ctxGrid.lineTo(baseX + (cantidadHoriz + 1) * tamCuadrado + offset.x, y);
        ctxGrid.stroke();
    }
    
    // Dibujar líneas verticales
    for (let j = 0.5; j <= cantidadHoriz + 0.5; j++) {
        const x = baseX + j * tamCuadrado + offset.x;
        const grad = ctxGrid.createLinearGradient(x - grosorLinea/2, 0, x + grosorLinea/2, 0);
        grad.addColorStop(0, "rgba(0, 64, 80, 1)");
        grad.addColorStop(0.5, "rgba(0, 255, 255, 1)");
        grad.addColorStop(1, "rgba(0, 64, 80, 1)");
        ctxGrid.strokeStyle = grad;
        ctxGrid.beginPath();
        ctxGrid.moveTo(x, baseY + offset.y);
        ctxGrid.lineTo(x, baseY + 4 * tamCuadrado + offset.y);
        ctxGrid.stroke();
    }
}

// Inicializar el sistema de movimiento
function initGrid() {
    gridMovement.init();
}

// Función para obtener las coordenadas de una celda
function obtenerCelda(x, y) {
    if (!configGrid) {
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
    }

    const { tamCuadrado, baseX, baseY } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    const celdaX = Math.floor((x - baseX - offset.x) / tamCuadrado);
    const celdaY = Math.floor((y - baseY - offset.y) / tamCuadrado);
    
    if (celdaX < 0 || celdaX >= configGrid.cantidadHoriz ||
        celdaY < 0 || celdaY >= configGrid.cantidadVert) {
        return null;
    }
    
    return {
        x: celdaX,
        y: celdaY,
        cxCentro: baseX + (celdaX + 0.5) * tamCuadrado + offset.x,
        cyCentro: baseY + (celdaY + 0.5) * tamCuadrado + offset.y
    };
}

// Exportar funciones necesarias
window.dibujarGrid = dibujarGrid;
window.obtenerCelda = obtenerCelda;
window.initGrid = initGrid;

// === Sistema de coordenadas de reja ===

// Determinar coordenadas de intersecciones (puntos cubiertos)
function obtenerCoordenadasCubiertas() {
    if (!configGrid) {
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
    }

    const {
        baseX,
        baseY,
        tamCuadrado,
        cantidadHoriz,
        cantidadVert
    } = configGrid;

    const offset = gridMovement.getCurrentOffset();
    const coordenadasCubiertas = [];

    // Generar todas las intersecciones de la reja
    // Los índices i_idx y j_idx serán enteros de 0 en adelante para identificar la intersección
    let i_idx = 0;
    for (let i = 0.5; i <= cantidadVert + 0.5; i++, i_idx++) {
        let j_idx = 0;
        for (let j = 0.5; j <= cantidadHoriz + 0.5; j++, j_idx++) {
            coordenadasCubiertas.push({
                x: baseX + j * tamCuadrado + offset.x,
                y: baseY + i * tamCuadrado + offset.y,
                tipo: "interseccion",
                // Usamos los iteradores originales i, j que definen la posición de la línea de la reja
                // o podríamos usar i_idx, j_idx si preferimos índices basados en 0.
                // Por simplicidad y consistencia con cómo se calculan, mantendremos i, j.
                indiceInterseccion: { i_linea: i, j_linea: j } 
            });
        }
    }
    return coordenadasCubiertas;
}

// Determinar coordenadas de centros de celdas (puntos descubiertos)
function obtenerCoordenadasDescubiertas() {
    if (!configGrid) {
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
    }

    const {
        baseX,
        baseY,
        tamCuadrado,
        cantidadHoriz,
        cantidadVert
    } = configGrid;

    const offset = gridMovement.getCurrentOffset();
    const coordenadasDescubiertas = [];

    // Generar centros de todas las celdas
    for (let i = 0; i < cantidadVert; i++) { // i es el índice de fila de la celda (0 a cantidadVert-1)
        for (let j = 0; j < cantidadHoriz; j++) { // j es el índice de columna de la celda (0 a cantidadHoriz-1)
            coordenadasDescubiertas.push({
                x: baseX + (j + 1.0) * tamCuadrado + offset.x, // Revertido a +1.0 para el centro de la celda
                y: baseY + (i + 1.0) * tamCuadrado + offset.y, // Revertido a +1.0 para el centro de la celda
                tipo: "celda",
                indiceCelda: {
                    fila: i,
                    columna: j
                }
            });
        }
    }
    return coordenadasDescubiertas;
}

// Obtener coordenadas actualizadas para el centro de una celda
function getCentroCeldaActualizado(indiceCelda) {
    if (!configGrid || !indiceCelda) return null;
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    return {
        x: baseX + (indiceCelda.columna + 1.0) * tamCuadrado + offset.x, // Revertido a +1.0
        y: baseY + (indiceCelda.fila + 1.0) * tamCuadrado + offset.y    // Revertido a +1.0
    };
}

// Obtener coordenadas actualizadas para una intersección
function getInterseccionActualizada(indiceInterseccion) {
    if (!configGrid || !indiceInterseccion) return null;
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    return {
        // Usa los índices i_linea, j_linea almacenados, que corresponden a los multiplicadores de tamCuadrado
        x: baseX + indiceInterseccion.j_linea * tamCuadrado + offset.x,
        y: baseY + indiceInterseccion.i_linea * tamCuadrado + offset.y
    };
}

// Exportar funciones de coordenadas
window.obtenerCoordenadasCubiertas = obtenerCoordenadasCubiertas;
window.obtenerCoordenadasDescubiertas = obtenerCoordenadasDescubiertas;
window.getCentroCeldaActualizado = getCentroCeldaActualizado;
window.getInterseccionActualizada = getInterseccionActualizada;

// Funciones para el detector de estado de la pelota

// Obtener la celda correspondiente a una posición
function getCeldaFromPosition(position) {
    if (!configGrid || !position) return null;
    
    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    // Calcular índices de celda
    const col = Math.floor((position.x - baseX - offset.x) / tamCuadrado) - 1;
    const row = Math.floor((position.y - baseY - offset.y) / tamCuadrado) - 1;
    
    // Verificar si los índices están dentro de los límites
    if (col < 0 || col >= cantidadHoriz || row < 0 || row >= cantidadVert) {
        return null;
    }
    
    return {
        fila: row,
        columna: col
    };
}

// Obtener el centro de una celda
function getCentroCelda(celda) {
    if (!configGrid || !celda) return null;
    
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    return {
        x: baseX + (celda.columna + 1.0) * tamCuadrado + offset.x,
        y: baseY + (celda.fila + 1.0) * tamCuadrado + offset.y
    };
}

// Obtener los barrotes que rodean una celda
function getBarsFromCell(celda) {
    if (!configGrid || !celda) return null;
    
    const { baseX, baseY, tamCuadrado, grosorLinea } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    // Calcular coordenadas de los barrotes
    const barras = [];
    
    // Barra superior
    barras.push({
        start: {
            x: baseX + (celda.columna + 0.5) * tamCuadrado + offset.x,
            y: baseY + (celda.fila + 0.5) * tamCuadrado + offset.y
        },
        end: {
            x: baseX + (celda.columna + 1.5) * tamCuadrado + offset.x,
            y: baseY + (celda.fila + 0.5) * tamCuadrado + offset.y
        }
    });
    
    // Barra inferior
    barras.push({
        start: {
            x: baseX + (celda.columna + 0.5) * tamCuadrado + offset.x,
            y: baseY + (celda.fila + 1.5) * tamCuadrado + offset.y
        },
        end: {
            x: baseX + (celda.columna + 1.5) * tamCuadrado + offset.x,
            y: baseY + (celda.fila + 1.5) * tamCuadrado + offset.y
        }
    });
    
    // Barra izquierda
    barras.push({
        start: {
            x: baseX + (celda.columna + 0.5) * tamCuadrado + offset.x,
            y: baseY + (celda.fila + 0.5) * tamCuadrado + offset.y
        },
        end: {
            x: baseX + (celda.columna + 0.5) * tamCuadrado + offset.x,
            y: baseY + (celda.fila + 1.5) * tamCuadrado + offset.y
        }
    });
    
    // Barra derecha
    barras.push({
        start: {
            x: baseX + (celda.columna + 1.5) * tamCuadrado + offset.x,
            y: baseY + (celda.fila + 0.5) * tamCuadrado + offset.y
        },
        end: {
            x: baseX + (celda.columna + 1.5) * tamCuadrado + offset.x,
            y: baseY + (celda.fila + 1.5) * tamCuadrado + offset.y
        }
    });
    
    return barras;
}

// Exportar funciones para el detector de estado
window.getCeldaFromPosition = getCeldaFromPosition;
window.getCentroCelda = getCentroCelda;
window.getBarsFromCell = getBarsFromCell; 