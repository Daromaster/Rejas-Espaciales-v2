// simplify.js - Implementación simplificada del algoritmo Douglas-Peucker
// Basado en simplify.js de Vladimir Agafonkin
// Para uso en el sistema de detección por polígonos de Rejas Espaciales V2

/**
 * Calcula la distancia perpendicular cuadrada de un punto a una línea
 * @param {Object} p - Punto {x, y}
 * @param {Object} p1 - Primer punto de la línea {x, y}
 * @param {Object} p2 - Segundo punto de la línea {x, y}
 * @returns {number} Distancia perpendicular cuadrada
 */
function getSquareDistance(p, p1, p2) {
    let x = p1.x;
    let y = p1.y;
    let dx = p2.x - x;
    let dy = p2.y - y;

    if (dx !== 0 || dy !== 0) {
        const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);

        if (t > 1) {
            x = p2.x;
            y = p2.y;
        } else if (t > 0) {
            x += dx * t;
            y += dy * t;
        }
    }

    dx = p.x - x;
    dy = p.y - y;

    return dx * dx + dy * dy;
}

/**
 * Distancia euclidiana cuadrada básica entre dos puntos
 * @param {Object} a - Punto {x, y}
 * @param {Object} b - Punto {x, y}
 * @returns {number} Distancia cuadrada
 */
function getSquareDistanceToPoint(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

/**
 * Simplificación radial de puntos (pre-procesamiento)
 * @param {Array} points - Array de puntos {x, y}
 * @param {number} sqTolerance - Tolerancia cuadrada
 * @returns {Array} Puntos simplificados
 */
function simplifyRadialDist(points, sqTolerance) {
    let prevPoint = points[0];
    const newPoints = [prevPoint];

    for (let i = 1; i < points.length; i++) {
        const point = points[i];

        if (getSquareDistanceToPoint(point, prevPoint) > sqTolerance) {
            newPoints.push(point);
            prevPoint = point;
        }
    }

    if (prevPoint !== points[points.length - 1]) {
        newPoints.push(points[points.length - 1]);
    }

    return newPoints;
}

/**
 * Simplificación usando Douglas-Peucker
 * @param {Array} points - Array de puntos {x, y}
 * @param {number} sqTolerance - Tolerancia cuadrada
 * @returns {Array} Puntos simplificados
 */
function simplifyDouglasPeucker(points, sqTolerance) {
    const len = points.length;
    const markers = new Array(len);

    let first = 0;
    let last = len - 1;
    let stack = [];
    let newPoints = [];

    markers[first] = markers[last] = 1;

    while (last) {
        let maxSqDist = 0;
        let index = 0;

        for (let i = first + 1; i < last; i++) {
            const sqDist = getSquareDistance(points[i], points[first], points[last]);

            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            markers[index] = 1;
            stack.push(first, index, index, last);
        }

        if (stack.length) {
            last = stack.pop();
            first = stack.pop();
        } else {
            last = 0;
        }
    }

    for (let i = 0; i < len; i++) {
        if (markers[i]) {
            newPoints.push(points[i]);
        }
    }

    return newPoints;
}

/**
 * Función principal de simplificación
 * @param {Array} points - Array de puntos en formato {x: Number, y: Number}
 * @param {number} tolerance - Tolerancia de simplificación (por defecto 1)
 * @param {boolean} highQuality - Si usar solo Douglas-Peucker (más lento pero mejor calidad)
 * @returns {Array} Array de puntos simplificados
 */
export function simplify(points, tolerance = 1, highQuality = false) {
    if (points.length <= 2) return points;

    const sqTolerance = tolerance * tolerance;

    points = highQuality ? points : simplifyRadialDist(points, sqTolerance);
    points = simplifyDouglasPeucker(points, sqTolerance);

    return points;
}

// Exportar como default también para compatibilidad
export default simplify;

console.log("📦 Librería simplify.js cargada (versión simplificada)"); 