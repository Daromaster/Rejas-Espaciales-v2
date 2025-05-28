// Sistema de reja con SELECT CASE por nivel
let configGrid; // ✅ Variable global única para todos los niveles

// 🎯 FUNCIÓN PRINCIPAL: Inicializar sistema de reja según nivel
function initGridForLevel(level = null) {
    // Obtener nivel actual si no se especifica
    if (level === null) {
        level = 1; // Default
        if (window.LevelManager) {
            const levelInfo = window.LevelManager.getCurrentLevelInfo();
            level = levelInfo.level;
        } else if (window.gameState && window.gameState.currentLevel) {
            level = window.gameState.currentLevel;
        }
    }
    
    // 🔥 SELECT CASE PRINCIPAL - TODO EL COMPORTAMIENTO POR NIVEL
    switch(level) {
        case 1:
            return initLevel1Grid();
        case 2:
            return initLevel2Grid();
        default:
            console.warn(`⚠️ Nivel ${level} no implementado, usando nivel 1`);
            return initLevel1Grid();
    }
}

// ============================================================================
// 🎯 NIVEL 1: IMPLEMENTACIÓN BÁSICA (CÓDIGO ACTUAL)
// ============================================================================

function initLevel1Grid() {
    return {
        calculateConfig: calcularConfiguracionGridNivel1,
        drawGrid: dibujarGridNivel1,
        getColors: getGridColorsNivel1,
        getCoveredCoords: obtenerCoordenadasCubiertasNivel1,
        getUncoveredCoords: obtenerCoordenadasDescubiertasNivel1,
        getCellFromPosition: getCeldaFromPositionNivel1,
        getCellCenter: getCentroCeldaNivel1,
        getCellBars: getBarsFromCellNivel1,
        getCellUpdated: getCentroCeldaActualizadoNivel1,
        getIntersectionUpdated: getInterseccionActualizadaNivel1,
        getCell: obtenerCeldaNivel1
    };
}

function calcularConfiguracionGridNivel1(width, height) {
    // NIVEL 1: Configuración básica idéntica al original
    const dimensionMenor = Math.min(width, height);
    const altoZonaReja = dimensionMenor * 0.6;
    const tamCuadrado = altoZonaReja / 4;
  
    const cantidadCuadradosHoriz = Math.floor((width * 0.6) / tamCuadrado);
    const anchoRejaReal = (cantidadCuadradosHoriz + 1) * tamCuadrado;
  
    const margenX = (width - anchoRejaReal) / 2;
    const margenY = (height - altoZonaReja) / 2;

    const grosorLinea = Math.max(8, Math.floor(dimensionMenor * 0.03));
  
    return {
        baseX: margenX,
        baseY: margenY,
        tamCuadrado: tamCuadrado,
        cantidadHoriz: cantidadCuadradosHoriz,
        cantidadVert: 3,
        grosorLinea: grosorLinea,
        numCeldasX: cantidadCuadradosHoriz,
        numCeldasY: 3,
        cellSize: tamCuadrado,
        gridWidth: anchoRejaReal,
        gridHeight: altoZonaReja,
        offsetX: margenX,
        offsetY: margenY
    };
}

function dibujarGridNivel1() {
    if (!configGrid) {
        configGrid = calcularConfiguracionGridNivel1(canvasGrid.width, canvasGrid.height);
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
    
    const offset = gridMovement.update();
    const gradientColors = getGridColorsNivel1();
    
    // Dibujar líneas horizontales
    for (let i = 0.5; i <= cantidadVert + 0.5; i++) {
        const y = baseY + i * tamCuadrado + offset.y;
        const grad = ctxGrid.createLinearGradient(0, y - grosorLinea/2, 0, y + grosorLinea/2);
        grad.addColorStop(0, gradientColors.dark);
        grad.addColorStop(0.5, gradientColors.bright);
        grad.addColorStop(1, gradientColors.dark);
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
        grad.addColorStop(0, gradientColors.dark);
        grad.addColorStop(0.5, gradientColors.bright);
        grad.addColorStop(1, gradientColors.dark);
        ctxGrid.strokeStyle = grad;
        ctxGrid.beginPath();
        ctxGrid.moveTo(x, baseY + offset.y);
        ctxGrid.lineTo(x, baseY + 4 * tamCuadrado + offset.y);
        ctxGrid.stroke();
    }
}

function getGridColorsNivel1() {
    return {
        dark: "rgba(0, 64, 80, 1)",
        bright: "rgba(0, 255, 255, 1)"
    };
}

function obtenerCoordenadasCubiertasNivel1() {
    if (!configGrid) {
        configGrid = calcularConfiguracionGridNivel1(canvasGrid.width, canvasGrid.height);
    }

    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    const coordenadasCubiertas = [];

    let i_idx = 0;
    for (let i = 0.5; i <= cantidadVert + 0.5; i++, i_idx++) {
        let j_idx = 0;
        for (let j = 0.5; j <= cantidadHoriz + 0.5; j++, j_idx++) {
            coordenadasCubiertas.push({
                x: baseX + j * tamCuadrado + offset.x,
                y: baseY + i * tamCuadrado + offset.y,
                tipo: "interseccion",
                indiceInterseccion: { i_linea: i, j_linea: j } 
            });
        }
    }
    return coordenadasCubiertas;
}

function obtenerCoordenadasDescubiertasNivel1() {
    if (!configGrid) {
        configGrid = calcularConfiguracionGridNivel1(canvasGrid.width, canvasGrid.height);
    }

    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    const coordenadasDescubiertas = [];

    for (let i = 0; i < cantidadVert; i++) {
        for (let j = 0; j < cantidadHoriz; j++) {
            coordenadasDescubiertas.push({
                x: baseX + (j + 1.0) * tamCuadrado + offset.x,
                y: baseY + (i + 1.0) * tamCuadrado + offset.y,
                tipo: "celda",
                indiceCelda: { fila: i, columna: j }
            });
        }
    }
    return coordenadasDescubiertas;
}

function getCeldaFromPositionNivel1(position) {
    if (!configGrid || !position) return null;
    
    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    const col = Math.floor((position.x - baseX - offset.x) / tamCuadrado) - 1;
    const row = Math.floor((position.y - baseY - offset.y) / tamCuadrado) - 1;
    
    if (col < 0 || col >= cantidadHoriz || row < 0 || row >= cantidadVert) {
        return null;
    }
    
    return { fila: row, columna: col };
}

function getCentroCeldaNivel1(celda) {
    if (!configGrid || !celda) return null;
    
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    return {
        x: baseX + (celda.columna + 1.0) * tamCuadrado + offset.x,
        y: baseY + (celda.fila + 1.0) * tamCuadrado + offset.y
    };
}

function getBarsFromCellNivel1(celda) {
    if (!configGrid || !celda) return null;
    
    const { baseX, baseY, tamCuadrado, grosorLinea } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
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

function getCentroCeldaActualizadoNivel1(indiceCelda) {
    if (!configGrid || !indiceCelda) return null;
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    return {
        x: baseX + (indiceCelda.columna + 1.0) * tamCuadrado + offset.x,
        y: baseY + (indiceCelda.fila + 1.0) * tamCuadrado + offset.y
    };
}

function getInterseccionActualizadaNivel1(indiceInterseccion) {
    if (!configGrid || !indiceInterseccion) return null;
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    return {
        x: baseX + indiceInterseccion.j_linea * tamCuadrado + offset.x,
        y: baseY + indiceInterseccion.i_linea * tamCuadrado + offset.y
    };
}

function obtenerCeldaNivel1(x, y) {
    if (!configGrid) {
        configGrid = calcularConfiguracionGridNivel1(canvasGrid.width, canvasGrid.height);
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

// ============================================================================
// 🎯 NIVEL 2: IMPLEMENTACIÓN INTERMEDIA (INICIALMENTE IDÉNTICA A NIVEL 1)
// ============================================================================

function initLevel2Grid() {
    return {
        calculateConfig: calcularConfiguracionGridNivel2,
        drawGrid: dibujarGridNivel2,
        getColors: getGridColorsNivel2,
        getCoveredCoords: obtenerCoordenadasCubiertasNivel2,
        getUncoveredCoords: obtenerCoordenadasDescubiertasNivel2,
        getCellFromPosition: getCeldaFromPositionNivel2,
        getCellCenter: getCentroCeldaNivel2,
        getCellBars: getBarsFromCellNivel2,
        getCellUpdated: getCentroCeldaActualizadoNivel2,
        getIntersectionUpdated: getInterseccionActualizadaNivel2,
        getCell: obtenerCeldaNivel2
    };
}

// NIVEL 2: Por ahora duplicaciones exactas (luego modificaremos paulatinamente)
function calcularConfiguracionGridNivel2(width, height) {
    // TODO: Aquí modificaremos progresivamente la configuración del nivel 2
    const dimensionMenor = Math.min(width, height);
    const altoZonaReja = dimensionMenor * 0.6;
    const tamCuadrado = altoZonaReja / 4;
  
    const cantidadCuadradosHoriz = Math.floor((width * 0.6) / tamCuadrado);
    const anchoRejaReal = (cantidadCuadradosHoriz + 1) * tamCuadrado;
  
    const margenX = (width - anchoRejaReal) / 2;
    const margenY = (height - altoZonaReja) / 2;

    const grosorLinea = Math.max(8, Math.floor(dimensionMenor * 0.03));
  
    return {
        baseX: margenX,
        baseY: margenY,
        tamCuadrado: tamCuadrado,
        cantidadHoriz: cantidadCuadradosHoriz,
        cantidadVert: 3,
        grosorLinea: grosorLinea,
        numCeldasX: cantidadCuadradosHoriz,
        numCeldasY: 3,
        cellSize: tamCuadrado,
        gridWidth: anchoRejaReal,
        gridHeight: altoZonaReja,
        offsetX: margenX,
        offsetY: margenY
    };
}

function dibujarGridNivel2() {
    if (!configGrid) {
        configGrid = calcularConfiguracionGridNivel2(canvasGrid.width, canvasGrid.height);
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
    
    const offset = gridMovement.update();
    const gradientColors = getGridColorsNivel2();
    
    // Dibujar líneas horizontales
    for (let i = 0.5; i <= cantidadVert + 0.5; i++) {
        const y = baseY + i * tamCuadrado + offset.y;
        const grad = ctxGrid.createLinearGradient(0, y - grosorLinea/2, 0, y + grosorLinea/2);
        grad.addColorStop(0, gradientColors.dark);
        grad.addColorStop(0.5, gradientColors.bright);
        grad.addColorStop(1, gradientColors.dark);
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
        grad.addColorStop(0, gradientColors.dark);
        grad.addColorStop(0.5, gradientColors.bright);
        grad.addColorStop(1, gradientColors.dark);
        ctxGrid.strokeStyle = grad;
        ctxGrid.beginPath();
        ctxGrid.moveTo(x, baseY + offset.y);
        ctxGrid.lineTo(x, baseY + 4 * tamCuadrado + offset.y);
        ctxGrid.stroke();
    }
}

function getGridColorsNivel2() {
    // PRIMERA DIFERENCIA: Colores verdes para nivel 2
    return {
        dark: "rgba(0, 80, 64, 1)",
        bright: "rgba(0, 255, 180, 1)"
    };
}

// Resto de funciones nivel 2 (duplicadas por ahora)
function obtenerCoordenadasCubiertasNivel2() {
    if (!configGrid) {
        configGrid = calcularConfiguracionGridNivel2(canvasGrid.width, canvasGrid.height);
    }

    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    const coordenadasCubiertas = [];

    let i_idx = 0;
    for (let i = 0.5; i <= cantidadVert + 0.5; i++, i_idx++) {
        let j_idx = 0;
        for (let j = 0.5; j <= cantidadHoriz + 0.5; j++, j_idx++) {
            coordenadasCubiertas.push({
                x: baseX + j * tamCuadrado + offset.x,
                y: baseY + i * tamCuadrado + offset.y,
                tipo: "interseccion",
                indiceInterseccion: { i_linea: i, j_linea: j } 
            });
        }
    }
    return coordenadasCubiertas;
}

function obtenerCoordenadasDescubiertasNivel2() {
    if (!configGrid) {
        configGrid = calcularConfiguracionGridNivel2(canvasGrid.width, canvasGrid.height);
    }

    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    const coordenadasDescubiertas = [];

    for (let i = 0; i < cantidadVert; i++) {
        for (let j = 0; j < cantidadHoriz; j++) {
            coordenadasDescubiertas.push({
                x: baseX + (j + 1.0) * tamCuadrado + offset.x,
                y: baseY + (i + 1.0) * tamCuadrado + offset.y,
                tipo: "celda",
                indiceCelda: { fila: i, columna: j }
            });
        }
    }
    return coordenadasDescubiertas;
}

function getCeldaFromPositionNivel2(position) {
    if (!configGrid || !position) return null;
    
    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    const col = Math.floor((position.x - baseX - offset.x) / tamCuadrado) - 1;
    const row = Math.floor((position.y - baseY - offset.y) / tamCuadrado) - 1;
    
    if (col < 0 || col >= cantidadHoriz || row < 0 || row >= cantidadVert) {
        return null;
    }
    
    return { fila: row, columna: col };
}

function getCentroCeldaNivel2(celda) {
    if (!configGrid || !celda) return null;
    
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    return {
        x: baseX + (celda.columna + 1.0) * tamCuadrado + offset.x,
        y: baseY + (celda.fila + 1.0) * tamCuadrado + offset.y
    };
}

function getBarsFromCellNivel2(celda) {
    if (!configGrid || !celda) return null;
    
    const { baseX, baseY, tamCuadrado, grosorLinea } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
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

function getCentroCeldaActualizadoNivel2(indiceCelda) {
    if (!configGrid || !indiceCelda) return null;
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    return {
        x: baseX + (indiceCelda.columna + 1.0) * tamCuadrado + offset.x,
        y: baseY + (indiceCelda.fila + 1.0) * tamCuadrado + offset.y
    };
}

function getInterseccionActualizadaNivel2(indiceInterseccion) {
    if (!configGrid || !indiceInterseccion) return null;
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    return {
        x: baseX + indiceInterseccion.j_linea * tamCuadrado + offset.x,
        y: baseY + indiceInterseccion.i_linea * tamCuadrado + offset.y
    };
}

function obtenerCeldaNivel2(x, y) {
    if (!configGrid) {
        configGrid = calcularConfiguracionGridNivel2(canvasGrid.width, canvasGrid.height);
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

// ============================================================================
// 🎯 INTERFAZ PÚBLICA - FUNCIONES QUE LLAMAN AL SELECT CASE
// ============================================================================

// Obtener el sistema de grid actual
function getCurrentGridSystem() {
    return initGridForLevel();
}

// Funciones principales que delegan al sistema actual
function calcularConfiguracionGrid(width, height) {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.calculateConfig(width, height);
}

function dibujarGrid() {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.drawGrid();
}

function getGridColorsForLevel() {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.getColors();
}

function obtenerCoordenadasCubiertas() {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.getCoveredCoords();
}

function obtenerCoordenadasDescubiertas() {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.getUncoveredCoords();
}

function getCeldaFromPosition(position) {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.getCellFromPosition(position);
}

function getCentroCelda(celda) {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.getCellCenter(celda);
}

function getBarsFromCell(celda) {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.getCellBars(celda);
}

function getCentroCeldaActualizado(indiceCelda) {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.getCellUpdated(indiceCelda);
}

function getInterseccionActualizada(indiceInterseccion) {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.getIntersectionUpdated(indiceInterseccion);
}

function obtenerCelda(x, y) {
    const gridSystem = getCurrentGridSystem();
    return gridSystem.getCell(x, y);
}

// Función de inicialización
function initGrid() {
    gridMovement.init();
}

// Exportar funciones al scope global
window.dibujarGrid = dibujarGrid;
window.obtenerCelda = obtenerCelda;
window.initGrid = initGrid;
window.getGridColorsForLevel = getGridColorsForLevel;
window.obtenerCoordenadasCubiertas = obtenerCoordenadasCubiertas;
window.obtenerCoordenadasDescubiertas = obtenerCoordenadasDescubiertas;
window.getCentroCeldaActualizado = getCentroCeldaActualizado;
window.getInterseccionActualizada = getInterseccionActualizada;
window.getCeldaFromPosition = getCeldaFromPosition;
window.getCentroCelda = getCentroCelda;
window.getBarsFromCell = getBarsFromCell; 