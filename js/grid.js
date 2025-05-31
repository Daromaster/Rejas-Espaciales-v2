// Sistema de reja con SELECT CASE interno por función
let configGrid; // ✅ Variable global única para todos los niveles

// 🆕 SISTEMA DE MÚLTIPLES CANVAS
let gridCanvases = []; // Array de contextos de canvas virtuales para grid
let rotationAngle = 0; // Ángulo de rotación para nivel 2
let transformMatrix = null; // Matriz de transformación guardada

// ============================================================================
// 🆕 FUNCIONES DE GESTIÓN DE CANVAS MÚLTIPLES
// ============================================================================

function ensureGridCanvas(index) {
    const needsCreation = !gridCanvases[index] || 
                         !gridCanvases[index].canvas ||
                         gridCanvases[index].canvas.width !== canvasGrid.width ||
                         gridCanvases[index].canvas.height !== canvasGrid.height;
    
    if (needsCreation) {
        const canvas = document.createElement('canvas');
        canvas.width = canvasGrid.width;
        canvas.height = canvasGrid.height;
        gridCanvases[index] = canvas.getContext('2d');
        console.log(`📊 Canvas virtual ${index} ${needsCreation && gridCanvases[index] ? 'redimensionado' : 'creado'} (${canvas.width}x${canvas.height})`);
    }
}

function resizeAllGridCanvases() {
    // Recorrer todos los canvas existentes y redimensionarlos
    gridCanvases.forEach((ctx, index) => {
        if (ctx) {
            const canvas = ctx.canvas;
            if (canvas.width !== canvasGrid.width || canvas.height !== canvasGrid.height) {
                canvas.width = canvasGrid.width;
                canvas.height = canvasGrid.height;
                console.log(`📊 Canvas virtual ${index} redimensionado (${canvas.width}x${canvas.height})`);
            }
        }
    });
}

function resetGridArray() {
    // Limpiar todos los canvas existentes
    gridCanvases.forEach((context, index) => {
        if (context && context.canvas) {
            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
            console.log(`🧹 Canvas virtual ${index} limpiado`);
        }
    });
    
    // Resetear array pero mantener la matriz de transformación
    gridCanvases = [];
    rotationAngle = 0;
    console.log("🔄 Array de canvas reseteado - transformMatrix preservada");
}

function initGridForLevel(newLevel) {
    // 1. Limpiar array existente
    console.log(`🔧 initGridForLevel llamado para nivel ${newLevel}`);
    resetGridArray();
    
    // 2. Asegurar que configGrid esté inicializado
    if (!configGrid) {
        console.log("⚠️ Inicializando configGrid...");
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
        configGrid.currentLevel = newLevel;
    }
    
    // 3. Inicializar matriz de transformación
    transformMatrix = null;
    console.log("🔄 Matriz de transformación reseteada al iniciar nivel");
    
    // 4. Crear y dibujar canvas según el nivel
    switch(newLevel) {
        case 1: {
            // Solo crear gridCanvases[1] para compatibilidad 
            ensureGridCanvas(1);
            console.log("📊 Grid Nivel 1: 1 canvas inicializado");
            break;
        }
        
        case 2: {
            // Crear los canvas necesarios secuencialmente
            ensureGridCanvas(1); // Reja base verde adaptable
            ensureGridCanvas(2); // Composición final + rotación
            
            // NUEVO: Dibujar la reja base en gridCanvases[1]
            const { baseX, baseY, tamCuadrado, cantidadHoriz, cantidadVert, grosorLinea } = configGrid;
            
            gridCanvases[1].clearRect(0, 0, canvasGrid.width, canvasGrid.height);
            gridCanvases[1].lineWidth = grosorLinea;
            
            const gradientColors = {
                dark: "rgba(0, 80, 64, 1)",
                bright: "rgba(0, 255, 180, 1)"
            };
            
            // Dibujar líneas horizontales en canvas virtual (SIN offset)
            for (let i = 0.5; i <= cantidadVert + 0.5; i++) {
                const y = baseY + i * tamCuadrado;
                const grad = gridCanvases[1].createLinearGradient(0, y - grosorLinea/2, 0, y + grosorLinea/2);
                grad.addColorStop(0, gradientColors.dark);
                grad.addColorStop(0.5, gradientColors.bright);
                grad.addColorStop(1, gradientColors.dark);
                gridCanvases[1].strokeStyle = grad;
                gridCanvases[1].beginPath();
                gridCanvases[1].moveTo(baseX, y);
                gridCanvases[1].lineTo(baseX + (cantidadHoriz + 1) * tamCuadrado, y);
                gridCanvases[1].stroke();
            }
            
            // Dibujar líneas verticales en canvas virtual (SIN offset)
            for (let j = 0.5; j <= cantidadHoriz + 0.5; j++) {
                const x = baseX + j * tamCuadrado;
                const grad = gridCanvases[1].createLinearGradient(x - grosorLinea/2, 0, x + grosorLinea/2, 0);
                grad.addColorStop(0, gradientColors.dark);
                grad.addColorStop(0.5, gradientColors.bright);
                grad.addColorStop(1, gradientColors.dark);
                gridCanvases[1].strokeStyle = grad;
                gridCanvases[1].beginPath();
                gridCanvases[1].moveTo(x, baseY);
                gridCanvases[1].lineTo(x, baseY + (cantidadVert + 1) * tamCuadrado);
                gridCanvases[1].stroke();
            }
            
            // 🆕 NUEVO: Inicializar matriz de transformación inmediatamente
            const centerX = canvasGrid.width / 2;
            const centerY = canvasGrid.height / 2;
            
            gridCanvases[2].save();
            gridCanvases[2].translate(centerX, centerY);
            gridCanvases[2].rotate(0); // Empezar en 0 grados
            gridCanvases[2].translate(-centerX, -centerY);
            transformMatrix = gridCanvases[2].getTransform();
            gridCanvases[2].restore();
            
            console.log("✨ Reja base dibujada en gridCanvases[1]");
            console.log("📊 Grid Nivel 2: Canvas 1 y 2 inicializados (rotación habilitada)");
            break;
        }
        
        default: {
            // Fallback: nivel básico
            ensureGridCanvas(1);
            console.log(`⚠️ Grid Nivel ${newLevel}: Fallback a canvas básico`);
            break;
        }
    }
}

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
    
    if (!configGrid || configGrid.currentLevel !== currentLevel) {
        const previousLevel = configGrid ? configGrid.currentLevel : 'undefined';
        configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
        configGrid.currentLevel = currentLevel;
    }

    const {
        baseX,
        baseY,
        tamCuadrado,
        cantidadHoriz,
        cantidadVert,
        grosorLinea
    } = configGrid;
    
    // Limpiar canvas principal
    ctxGrid.clearRect(0, 0, canvasGrid.width, canvasGrid.height);
    
    const offset = gridMovement.update();
    
    // UN SOLO SELECT CASE para verificación y dibujo
    switch(currentLevel) {
        case 1: {
            // Verificar canvas necesario
            if (!gridCanvases[1] || !gridCanvases[1].canvas) {
                console.log("⚠️ Inicializando canvas básico para nivel 1...");
                initGridForLevel(currentLevel);
                return;
            }

            // NIVEL 1: Dibujo directo en canvas principal
            ctxGrid.lineWidth = grosorLinea;
            
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
            // Verificar canvas necesarios
            if (!gridCanvases[1] || !gridCanvases[1].canvas || !gridCanvases[2] || !gridCanvases[2].canvas) {
                console.log("⚠️ Inicializando canvas virtuales para nivel 2...");
                initGridForLevel(currentLevel);
                return;
            }

            // === PASO 1: Limpiar canvas de composición ===
            gridCanvases[2].clearRect(0, 0, canvasGrid.width, canvasGrid.height);
            
            // === PASO 2: Aplicar transformaciones ===
            // Incrementar rotación gradualmente
            rotationAngle += 0.01; // 0.01 radianes por frame (~0.57 grados)
            
            // Centro del canvas para rotación
            const centerX = canvasGrid.width / 2;
            const centerY = canvasGrid.height / 2;
            
            // Aplicar transformaciones
            gridCanvases[2].save();
            gridCanvases[2].translate(centerX, centerY);
            gridCanvases[2].rotate(rotationAngle);
            gridCanvases[2].translate(-centerX, -centerY);
            
            // Guardar matriz de transformación para cálculos posteriores
            transformMatrix = gridCanvases[2].getTransform();
            
            // === PASO 3: Componer imagen final ===
            // Pegar la reja base (ya dibujada en initGridForLevel)
            gridCanvases[2].drawImage(gridCanvases[1].canvas, 0, 0);
            
            gridCanvases[2].restore();
            
            // === PASO 4: Renderizar al canvas principal ===
            ctxGrid.drawImage(gridCanvases[2].canvas, 0, 0);
            
            break;
        }
        
        default: {
            // Verificar canvas básico para fallback
            if (!gridCanvases[1] || !gridCanvases[1].canvas) {
                console.log(`⚠️ Inicializando canvas básico para nivel ${currentLevel} (fallback)...`);
                initGridForLevel(currentLevel);
                return;
            }
            
            console.warn(`⚠️ Nivel ${currentLevel} no implementado para dibujo, usando nivel 1`);
            // Usar lógica del nivel 1 como fallback
            dibujarGrid(); // Llamada recursiva que caerá en case 1
            break;
        }
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
            // NIVEL 2: Solo rotación, SIN flotación (offset = 0)
            let i_idx = 0;
            for (let i = 0.5; i <= cantidadVert + 0.5; i++, i_idx++) {
                let j_idx = 0;
                for (let j = 0.5; j <= cantidadHoriz + 0.5; j++, j_idx++) {
                    // Coordenadas base (sin offset)
                    const basePointX = baseX + j * tamCuadrado;
                    const basePointY = baseY + i * tamCuadrado;
                    
                    // Aplicar solo transformación de rotación
                    const transformedPoint = applyTransformMatrix(basePointX, basePointY);
                    
                    coordenadasCubiertas.push({
                        x: transformedPoint.x, // SIN offset.x
                        y: transformedPoint.y, // SIN offset.y
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
            // NIVEL 1: Coordenadas en centros de celdas con offset (flotación)
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
            // NIVEL 2: Solo rotación, SIN flotación (offset = 0)
            for (let i = 0; i < cantidadVert; i++) {
                for (let j = 0; j < cantidadHoriz; j++) {
                    // Coordenadas base del centro de celda (sin offset)
                    const basePointX = baseX + (j + 1.0) * tamCuadrado;
                    const basePointY = baseY + (i + 1.0) * tamCuadrado;
                    
                    // Aplicar solo transformación de rotación
                    const transformedPoint = applyTransformMatrix(basePointX, basePointY);
                    
                    coordenadasDescubiertas.push({
                        x: transformedPoint.x, // SIN offset.x
                        y: transformedPoint.y, // SIN offset.y
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

// 🆕 NUEVA FUNCIÓN: Aplicar transformación usando la matriz guardada
function applyTransformMatrix(x, y) {
    if (!transformMatrix) {
        console.warn("⚠️ transformMatrix es null, devolviendo coordenadas originales");
        return { x, y };
    }
    
    const transformedX = transformMatrix.a * x + transformMatrix.c * y + transformMatrix.e;
    const transformedY = transformMatrix.b * x + transformMatrix.d * y + transformMatrix.f;
    
    return {
        x: transformedX,
        y: transformedY
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
            // NIVEL 2: Aplicar transformación de rotación igual que en obtenerCoordenadasDescubiertas
            // Coordenadas base del centro de celda (sin offset)
            const basePointX = baseX + (indiceCelda.columna + 1.0) * tamCuadrado;
            const basePointY = baseY + (indiceCelda.fila + 1.0) * tamCuadrado;
            
            // Aplicar transformación de rotación
            const transformedPoint = applyTransformMatrix(basePointX, basePointY);
            
            return {
                x: transformedPoint.x, // SIN offset en nivel 2
                y: transformedPoint.y  // SIN offset en nivel 2
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
            // NIVEL 2: Aplicar transformación de rotación igual que en obtenerCoordenadasCubiertas
            // Coordenadas base (sin offset)
            const basePointX = baseX + indiceInterseccion.j_linea * tamCuadrado;
            const basePointY = baseY + indiceInterseccion.i_linea * tamCuadrado;
            
            // Aplicar transformación de rotación
            const transformedPoint = applyTransformMatrix(basePointX, basePointY);
            
            return {
                x: transformedPoint.x, // SIN offset en nivel 2
                y: transformedPoint.y  // SIN offset en nivel 2
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
    // Inicializar movimiento
    gridMovement.init();
    
    // Obtener nivel actual
    const currentLevel = getCurrentLevel();
    console.log(`🎮 Inicializando grid para nivel ${currentLevel}`);
    
    // Forzar inicialización completa del nivel
    configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
    configGrid.currentLevel = currentLevel;
    
    // Inicializar nivel
    initGridForLevel(currentLevel);
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
    console.log("🧪 TESTING: Cambiando al nivel 2 (rotación habilitada)...");
    
    if (window.LevelManager) {
        window.LevelManager.setLevel(2);
    }
    if (window.gameState) {
        window.gameState.currentLevel = 2;
    }
    
    // Forzar reinicialización completa
    configGrid = null;
    resetGridArray(); // Limpiar canvas existentes
    rotationAngle = 0; // Resetear rotación
    
    console.log("✅ Cambiado a nivel 2 con rotación");
    console.log("🎮 Usa testRotationSpeed() para ajustar velocidad de rotación");
};

window.testLevel1 = function() {
    console.log("🧪 TESTING: Cambiando al nivel 1 (modo clásico)...");
    
    if (window.LevelManager) {
        window.LevelManager.setLevel(1);
    }
    if (window.gameState) {
        window.gameState.currentLevel = 1;
    }
    
    // Forzar reinicialización completa
    configGrid = null;
    resetGridArray(); // Limpiar canvas virtuales
    rotationAngle = 0; // Resetear rotación
    
    console.log("✅ Cambiado a nivel 1 clásico");
};

// 🛠️ FUNCIONES DE DEBUG ADICIONALES
window.testRotationSpeed = function(speed = 0.01) {
    if (getCurrentLevel() !== 2) {
        console.warn("⚠️ Rotación solo funciona en nivel 2");
        return;
    }
    
    // Modificar temporalmente la velocidad de rotación
    const originalSpeed = 0.01;
    const newSpeed = parseFloat(speed);
    
    console.log(`🔄 Velocidad de rotación cambiada de ${originalSpeed} a ${newSpeed} rad/frame`);
    console.log(`💡 Para resetear usa: testRotationSpeed(0.01)`);
    
    // Aquí podrías guardar la velocidad en una variable global si quieres hacerlo dinámico
};

window.showGridInfo = function() {
    const currentLevel = getCurrentLevel();
    console.log("📊 INFORMACIÓN DEL GRID:");
    console.log(`   Nivel actual: ${currentLevel}`);
    console.log(`   Config válido: ${configGrid ? '✅' : '❌'}`);
    
    if (configGrid) {
        console.log(`   Dimensiones: ${configGrid.cantidadHoriz}x${configGrid.cantidadVert} celdas`);
        console.log(`   Tamaño celda: ${configGrid.tamCuadrado.toFixed(1)}px`);
        console.log(`   Grosor línea: ${configGrid.grosorLinea}px`);
    }
    
    console.log(`   Canvas virtuales activos: ${gridCanvases.length}`);
    
    if (currentLevel === 2) {
        console.log(`   Ángulo rotación: ${(rotationAngle * 180 / Math.PI).toFixed(1)}°`);
        console.log(`   Matriz guardada: ${transformMatrix ? '✅' : '❌'}`);
    }
};

window.resetRotation = function() {
    if (getCurrentLevel() !== 2) {
        console.warn("⚠️ Rotación solo funciona en nivel 2");
        return;
    }
    
    rotationAngle = 0;
    transformMatrix = null;
    console.log("🔄 Rotación reseteada a 0°");
};

// ============================================================================
// 🎯 FUNCIONES DE RESPONSIVE
// ============================================================================

function handleResponsive() {
    const currentLevel = getCurrentLevel();
    
    // Recalcular configuración
    configGrid = calcularConfiguracionGrid(canvasGrid.width, canvasGrid.height);
    configGrid.currentLevel = currentLevel;
    
    console.log("📱 Cambio de tamaño detectado - Recalculando grid");
    
    // Redimensionar todos los canvas virtuales existentes
    resizeAllGridCanvases();
    
    // Forzar reinicialización completa del nivel actual
    initGridForLevel(currentLevel);
}

// Exportar función para uso externo (debe ser llamada cuando cambie el tamaño del canvas)
window.handleGridResponsive = handleResponsive;