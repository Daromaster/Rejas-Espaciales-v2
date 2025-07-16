// marching-squares.js - Implementación básica del algoritmo Marching Squares
// Para detectar contornos de píxeles activos en el sistema de detección por polígonos

/**
 * Tabla de configuraciones del Marching Squares
 * Cada entrada define los segmentos de línea para una configuración específica
 * Formato: [x1, y1, x2, y2] para cada segmento
 */
const MARCHING_SQUARES_CONFIG = {
    0: [], // Sin píxeles activos
    1: [[0, 0.5, 0.5, 1]], // Solo esquina inferior izquierda
    2: [[0.5, 1, 1, 0.5]], // Solo esquina inferior derecha
    3: [[0, 0.5, 1, 0.5]], // Ambas esquinas inferiores
    4: [[0.5, 0, 1, 0.5]], // Solo esquina superior derecha
    5: [[0, 0.5, 0.5, 0], [0.5, 1, 1, 0.5]], // Esquinas opuestas (caso ambiguo)
    6: [[0.5, 0, 0.5, 1]], // Ambas esquinas derechas
    7: [[0, 0.5, 0.5, 0]], // Tres esquinas (menos superior izquierda)
    8: [[0, 0.5, 0.5, 0]], // Solo esquina superior izquierda
    9: [[0.5, 0, 0.5, 1]], // Ambas esquinas izquierdas
    10: [[0, 0.5, 0.5, 1], [0.5, 0, 1, 0.5]], // Esquinas opuestas (caso ambiguo)
    11: [[0.5, 0, 1, 0.5]], // Tres esquinas (menos superior derecha)
    12: [[0, 0.5, 1, 0.5]], // Ambas esquinas superiores
    13: [[0.5, 1, 1, 0.5]], // Tres esquinas (menos inferior izquierda)
    14: [[0, 0.5, 0.5, 1]], // Tres esquinas (menos inferior derecha)
    15: [] // Todas las esquinas activas
};

/**
 * Calcula el valor de configuración para una celda del marching squares
 * @param {Array<Array<number>>} grid - Matriz binaria
 * @param {number} x - Coordenada X de la celda
 * @param {number} y - Coordenada Y de la celda
 * @returns {number} Valor de configuración (0-15)
 */
function getCellConfiguration(grid, x, y) {
    const height = grid.length;
    const width = grid[0].length;
    
    // Obtener valores de las 4 esquinas de la celda
    const topLeft = (y >= 0 && x >= 0) ? grid[y][x] : 0;
    const topRight = (y >= 0 && x + 1 < width) ? grid[y][x + 1] : 0;
    const bottomLeft = (y + 1 < height && x >= 0) ? grid[y + 1][x] : 0;
    const bottomRight = (y + 1 < height && x + 1 < width) ? grid[y + 1][x + 1] : 0;
    
    // Calcular configuración binaria
    return topLeft * 8 + topRight * 4 + bottomRight * 2 + bottomLeft * 1;
}

/**
 * Convierte un segmento relativo de celda en coordenadas absolutas
 * @param {Array<number>} segment - Segmento [x1, y1, x2, y2] en coordenadas relativas (0-1)
 * @param {number} cellX - Coordenada X de la celda
 * @param {number} cellY - Coordenada Y de la celda
 * @returns {Array<Object>} Array de puntos absolutos [{x, y}, {x, y}]
 */
function segmentToAbsolute(segment, cellX, cellY) {
    return [
        { x: cellX + segment[0], y: cellY + segment[1] },
        { x: cellX + segment[2], y: cellY + segment[3] }
    ];
}

/**
 * Traza los contornos usando marching squares
 * @param {Array<Array<number>>} binaryGrid - Matriz binaria: 1 = píxel activo, 0 = vacío
 * @param {Object} options - Opciones {threshold: number}
 * @returns {Array<Array<Object>>} Array de contornos, cada contorno es un array de puntos {x, y}
 */
export function isoLines(binaryGrid, threshold = 0.5, options = {}) {
    if (!binaryGrid || binaryGrid.length === 0 || binaryGrid[0].length === 0) {
        return [];
    }
    
    const height = binaryGrid.length;
    const width = binaryGrid[0].length;
    const segments = [];
    
    // Recorrer cada celda del grid
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const config = getCellConfiguration(binaryGrid, x, y);
            const cellSegments = MARCHING_SQUARES_CONFIG[config];
            
            // Convertir segmentos relativos a coordenadas absolutas
            for (const segment of cellSegments) {
                const absoluteSegment = segmentToAbsolute(segment, x, y);
                segments.push(absoluteSegment);
            }
        }
    }
    
    // Conectar segmentos en contornos cerrados
    const contours = connectSegments(segments);
    
    return contours;
}

/**
 * Conecta segmentos individuales en contornos cerrados
 * @param {Array<Array<Object>>} segments - Array de segmentos, cada segmento es [{x, y}, {x, y}]
 * @returns {Array<Array<Object>>} Array de contornos conectados
 */
function connectSegments(segments) {
    if (segments.length === 0) return [];
    
    const contours = [];
    const usedSegments = new Set();
    const tolerance = 0.01; // Tolerancia para considerar puntos como iguales
    
    /**
     * Verifica si dos puntos son iguales dentro de la tolerancia
     */
    function pointsEqual(p1, p2) {
        return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
    }
    
    /**
     * Busca el siguiente segmento que conecte con el punto dado
     */
    function findConnectingSegment(point, excludeIndex) {
        for (let i = 0; i < segments.length; i++) {
            if (usedSegments.has(i) || i === excludeIndex) continue;
            
            const segment = segments[i];
            if (pointsEqual(point, segment[0])) {
                return { index: i, startFromFirst: true };
            }
            if (pointsEqual(point, segment[1])) {
                return { index: i, startFromFirst: false };
            }
        }
        return null;
    }
    
    // Construir contornos conectando segmentos
    for (let i = 0; i < segments.length; i++) {
        if (usedSegments.has(i)) continue;
        
        const contour = [];
        let currentSegment = segments[i];
        let currentIndex = i;
        
        usedSegments.add(i);
        contour.push({...currentSegment[0]});
        contour.push({...currentSegment[1]});
        
        let lastPoint = currentSegment[1];
        
        // Intentar conectar más segmentos
        let maxIterations = segments.length; // Prevenir bucles infinitos
        while (maxIterations-- > 0) {
            const connection = findConnectingSegment(lastPoint, currentIndex);
            
            if (!connection) break;
            
            usedSegments.add(connection.index);
            currentSegment = segments[connection.index];
            currentIndex = connection.index;
            
            if (connection.startFromFirst) {
                lastPoint = currentSegment[1];
                contour.push({...lastPoint});
            } else {
                lastPoint = currentSegment[0];
                contour.push({...lastPoint});
            }
            
            // Verificar si el contorno se ha cerrado
            if (pointsEqual(lastPoint, contour[0])) {
                break;
            }
        }
        
        // Solo agregar contornos con al menos 3 puntos
        if (contour.length >= 3) {
            contours.push(contour);
        }
    }
    
    return contours;
}

/**
 * Función simple para crear contornos básicos (fallback)
 * @param {Array<Array<number>>} binaryGrid - Matriz binaria
 * @returns {Array<Array<Object>>} Array de contornos rectangulares simples
 */
export function createSimpleContours(binaryGrid) {
    if (!binaryGrid || binaryGrid.length === 0) return [];
    
    const contours = [];
    const height = binaryGrid.length;
    const width = binaryGrid[0].length;
    
    // Buscar regiones rectangulares de píxeles activos (algoritmo muy básico)
    const visited = Array(height).fill().map(() => Array(width).fill(false));
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (binaryGrid[y][x] === 1 && !visited[y][x]) {
                // Encontrar región rectangular básica
                let minX = x, maxX = x, minY = y, maxY = y;
                
                // Expandir hacia la derecha
                while (maxX + 1 < width && binaryGrid[y][maxX + 1] === 1) {
                    maxX++;
                }
                
                // Expandir hacia abajo
                while (maxY + 1 < height && binaryGrid[maxY + 1][x] === 1) {
                    maxY++;
                }
                
                // Marcar región como visitada
                for (let py = minY; py <= maxY; py++) {
                    for (let px = minX; px <= maxX; px++) {
                        visited[py][px] = true;
                    }
                }
                
                // Crear contorno rectangular
                const contour = [
                    { x: minX, y: minY },
                    { x: maxX + 1, y: minY },
                    { x: maxX + 1, y: maxY + 1 },
                    { x: minX, y: maxY + 1 },
                    { x: minX, y: minY } // Cerrar contorno
                ];
                
                contours.push(contour);
            }
        }
    }
    
    return contours;
}

// Alias para compatibilidad con otras librerías
export const isoContours = isoLines;

// Exportar también como objeto compatible con MarchingSquaresJS
export const MarchingSquaresJS = {
    isoLines: isoLines,
    isoContours: isoLines
};

console.log("📦 Librería marching-squares.js cargada (versión simplificada)"); 