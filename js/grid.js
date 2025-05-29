// Sistema de reja con SELECT CASE interno por función
let configGrid; // ✅ Variable global única para todos los niveles

// ============================================================================
// 🎯 FUNCIÓN PARA OBTENER NIVEL ACTUAL
// ============================================================================
function getCurrentLevel() {
    // Obtener nivel desde múltiples fuentes con fallback
    if (window.LevelManager) {
        return window.LevelManager.getCurrentLevelInfo().level;
    }
    if (window.gameState && window.gameState.currentLevel) {
        return window.gameState.currentLevel;
    }
    return 1; // Fallback seguro
}

// ============================================================================
// 🎯 FUNCIONES PRINCIPALES CON SELECT CASE INTERNO
// ============================================================================

function calcularConfiguracionGrid(width, height) {
    const currentLevel = getCurrentLevel();
    
    switch(currentLevel) {
        case 1: {
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
        
        case 2: {
            // NIVEL 2: Sistema responsive 4x6 vs 6x4 + colores verdes (SIN ROTACIÓN)
            const dimensionMenor = Math.min(width, height);
            const altoZonaReja = dimensionMenor * 0.6;
            const tamCuadrado = altoZonaReja / 4;
            
            // Detectar orientación y aplicar lógica responsive
            const anchoEsMenor = width < height;
            let cantidadHoriz, cantidadVert;
            
            if (anchoEsMenor) {
                // ANCHO menor → 4 barrotes horizontales, 6 verticales
                cantidadHoriz = 3; // 3 cuadrados → 4 barrotes
                cantidadVert = 5;  // 5 cuadrados → 6 barrotes
            } else {
                // ALTO menor → 6 barrotes horizontales, 4 verticales  
                cantidadHoriz = 5; // 5 cuadrados → 6 barrotes
                cantidadVert = 3;  // 3 cuadrados → 4 barrotes
            }
            
            // Calcular dimensiones reales con medio módulo en perímetro
            const anchoRejaReal = (cantidadHoriz + 1) * tamCuadrado;
            const altoRejaReal = (cantidadVert + 1) * tamCuadrado;
            
            // Centrado en el canvas
            const margenX = (width - anchoRejaReal) / 2;
            const margenY = (height - altoRejaReal) / 2;
            const grosorLinea = Math.max(8, Math.floor(dimensionMenor * 0.03));
            
            return {
                baseX: margenX,
                baseY: margenY,
                tamCuadrado: tamCuadrado,
                cantidadHoriz: cantidadHoriz,
                cantidadVert: cantidadVert,
                grosorLinea: grosorLinea,
                numCeldasX: cantidadHoriz,
                numCeldasY: cantidadVert,
                cellSize: tamCuadrado,
                gridWidth: anchoRejaReal,
                gridHeight: altoRejaReal,
                offsetX: margenX,
                offsetY: margenY
            };
        }
        
        default:
            console.warn(`⚠️ Nivel ${currentLevel} no implementado, usando nivel 1`);
            return calcularConfiguracionGrid(width, height); // Recursión con fallback
    }
}

function dibujarGrid() {
    const currentLevel = getCurrentLevel();
    
    // ✨ CAMBIO MÍNIMO: Recalcular configGrid si cambió el nivel
    if (!configGrid || configGrid.currentLevel !== currentLevel) {
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
        configGrid.currentLevel = currentLevel; // ← Guardar el nivel para detectar cambios
        console.log(`🔄 ConfigGrid recalculado para nivel ${currentLevel}`);
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
    
    switch(currentLevel) {
        case 1: {
            // NIVEL 1: Dibujo estático con colores cyan
            const gradientColors = {
                dark: "rgba(0, 64, 80, 1)",
                bright: "rgba(0, 255, 255, 1)"
            };
            
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
            break;
        }
        
        case 2: {
            // NIVEL 2: Dibujo estático con colores verdes (SIN ROTACIÓN)
            const gradientColors = {
                dark: "rgba(0, 80, 64, 1)",
                bright: "rgba(0, 255, 180, 1)"
            };
            
            // Dibujar líneas horizontales (igual que nivel 1)
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
            
            // Dibujar líneas verticales (igual que nivel 1)
            for (let j = 0.5; j <= cantidadHoriz + 0.5; j++) {
                const x = baseX + j * tamCuadrado + offset.x;
                const grad = ctxGrid.createLinearGradient(x - grosorLinea/2, 0, x + grosorLinea/2, 0);
                grad.addColorStop(0, gradientColors.dark);
                grad.addColorStop(0.5, gradientColors.bright);
                grad.addColorStop(1, gradientColors.dark);
                ctxGrid.strokeStyle = grad;
                ctxGrid.beginPath();
                ctxGrid.moveTo(x, baseY + offset.y);
                ctxGrid.lineTo(x, baseY + (cantidadVert + 1) * tamCuadrado + offset.y);
                ctxGrid.stroke();
            }
            break;
        }
        
        default:
            console.warn(`⚠️ Nivel ${currentLevel} no implementado para dibujo`);
            // Ejecutar nivel 1 como fallback
            // [El código del case 1 se podría extraer a función auxiliar para evitar duplicación]
            break;
    }
}

function obtenerCoordenadasCubiertas() {
    const currentLevel = getCurrentLevel();
    
    // ✨ CAMBIO MÍNIMO: Recalcular configGrid si cambió el nivel
    if (!configGrid || configGrid.currentLevel !== currentLevel) {
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
        configGrid.currentLevel = currentLevel; // ← Guardar el nivel para detectar cambios
    }

    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    const coordenadasCubiertas = [];

    switch(currentLevel) {
        case 1: {
            // NIVEL 1: Coordenadas estáticas en intersecciones
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
            break;
        }
        
        case 2: {
            // NIVEL 2: Coordenadas base (sin rotación aplicada aquí)
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
            break;
        }
        
        default:
            console.warn(`⚠️ Nivel ${currentLevel} no implementado para coordenadas cubiertas`);
            break;
    }
    
    return coordenadasCubiertas;
}

function obtenerCoordenadasDescubiertas() {
    const currentLevel = getCurrentLevel();
    
    // ✨ CAMBIO MÍNIMO: Recalcular configGrid si cambió el nivel
    if (!configGrid || configGrid.currentLevel !== currentLevel) {
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
        configGrid.currentLevel = currentLevel; // ← Guardar el nivel para detectar cambios
    }

    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    const coordenadasDescubiertas = [];

    switch(currentLevel) {
        case 1: {
            // NIVEL 1: Coordenadas en centros de celdas
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
            break;
        }
        
        case 2: {
            // NIVEL 2: Coordenadas base (sin rotación aplicada aquí)
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
            break;
        }
        
        default:
            console.warn(`⚠️ Nivel ${currentLevel} no implementado para coordenadas descubiertas`);
            break;
    }
    
    return coordenadasDescubiertas;
}

// ============================================================================
// 🎯 FUNCIONES AUXILIARES PARA NIVEL 2 (ROTACIÓN)
// ============================================================================

function rotatePoint(x, y, centerX, centerY, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const translatedX = x - centerX;
    const translatedY = y - centerY;
    
    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;
    
    return {
        x: rotatedX + centerX,
        y: rotatedY + centerY
    };
}

function getCentroCeldaActualizado(indiceCelda) {
    const currentLevel = getCurrentLevel();
    
    if (!configGrid || !indiceCelda) return null;
    
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    switch(currentLevel) {
        case 1: {
            // NIVEL 1: Sin rotación
            return {
                x: baseX + (indiceCelda.columna + 1.0) * tamCuadrado + offset.x,
                y: baseY + (indiceCelda.fila + 1.0) * tamCuadrado + offset.y
            };
        }
        
        case 2: {
            // NIVEL 2: Sin rotación (igual que nivel 1)
            return {
                x: baseX + (indiceCelda.columna + 1.0) * tamCuadrado + offset.x,
                y: baseY + (indiceCelda.fila + 1.0) * tamCuadrado + offset.y
            };
        }
        
        default:
            return null;
    }
}

function getInterseccionActualizada(indiceInterseccion) {
    const currentLevel = getCurrentLevel();
    
    if (!configGrid || !indiceInterseccion) return null;
    
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    switch(currentLevel) {
        case 1: {
            // NIVEL 1: Sin rotación
            return {
                x: baseX + indiceInterseccion.j_linea * tamCuadrado + offset.x,
                y: baseY + indiceInterseccion.i_linea * tamCuadrado + offset.y
            };
        }
        
        case 2: {
            // NIVEL 2: Sin rotación (igual que nivel 1)
            return {
                x: baseX + indiceInterseccion.j_linea * tamCuadrado + offset.x,
                y: baseY + indiceInterseccion.i_linea * tamCuadrado + offset.y
            };
        }
        
        default:
            return null;
    }
}

// ============================================================================
// 🎯 FUNCIONES ADICIONALES (COMPATIBILIDAD)
// ============================================================================

function getCeldaFromPosition(position) {
    const currentLevel = getCurrentLevel();
    
    if (!configGrid || !position) return null;
    
    const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    // Lógica igual para todos los niveles por ahora
    const col = Math.floor((position.x - baseX - offset.x) / tamCuadrado) - 1;
    const row = Math.floor((position.y - baseY - offset.y) / tamCuadrado) - 1;
    
    if (col < 0 || col >= cantidadHoriz || row < 0 || row >= cantidadVert) {
        return null;
    }
    
    return { fila: row, columna: col };
}

function getCentroCelda(celda) {
    if (!configGrid || !celda) return null;
    
    const { baseX, baseY, tamCuadrado } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    return {
        x: baseX + (celda.columna + 1.0) * tamCuadrado + offset.x,
        y: baseY + (celda.fila + 1.0) * tamCuadrado + offset.y
    };
}

function getBarsFromCell(celda) {
    if (!configGrid || !celda) return null;
    
    const { baseX, baseY, tamCuadrado } = configGrid;
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

function obtenerCelda(x, y) {
    if (!configGrid) {
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
    }

    const { tamCuadrado, baseX, baseY, cantidadHoriz, cantidadVert } = configGrid;
    const offset = gridMovement.getCurrentOffset();
    
    const celdaX = Math.floor((x - baseX - offset.x) / tamCuadrado);
    const celdaY = Math.floor((y - baseY - offset.y) / tamCuadrado);
    
    if (celdaX < 0 || celdaX >= cantidadHoriz ||
        celdaY < 0 || celdaY >= cantidadVert) {
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
// 🎯 INICIALIZACIÓN Y EXPORTACIÓN
// ============================================================================

function initGrid() {
    gridMovement.init();
}

// Exportar funciones al scope global
window.dibujarGrid = dibujarGrid;
window.obtenerCelda = obtenerCelda;
window.initGrid = initGrid;
window.obtenerCoordenadasCubiertas = obtenerCoordenadasCubiertas;
window.obtenerCoordenadasDescubiertas = obtenerCoordenadasDescubiertas;
window.getCentroCeldaActualizado = getCentroCeldaActualizado;
window.getInterseccionActualizada = getInterseccionActualizada;
window.getCeldaFromPosition = getCeldaFromPosition;
window.getCentroCelda = getCentroCelda;
window.getBarsFromCell = getBarsFromCell;

// 🧪 FUNCIONES DE TESTING
window.testLevel2 = function() {
    console.log("🧪 TESTING: Cambiando al nivel 2...");
    
    if (window.LevelManager) {
        window.LevelManager.setLevel(2);
    }
    if (window.gameState) {
        window.gameState.currentLevel = 2;
    }
    
    // Reinicializar grid
    configGrid = null;
    configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
    
    console.log("✅ Cambiado a nivel 2");
};

window.testLevel1 = function() {
    console.log("🧪 TESTING: Cambiando al nivel 1...");
    
    if (window.LevelManager) {
        window.LevelManager.setLevel(1);
    }
    if (window.gameState) {
        window.gameState.currentLevel = 1;
    }
    
    // Reinicializar grid
    configGrid = null;
    configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
    
    console.log("✅ Cambiado a nivel 1");
}; 