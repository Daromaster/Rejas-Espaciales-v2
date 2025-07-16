// sat.js - Implementación básica del Separating Axis Theorem
// Para detección de colisiones entre polígonos convexos y círculos
// Basado en SAT.js de Jim Riecken

/**
 * Clase Vector para representar puntos y vectores 2D
 */
class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * Copia los valores de otro vector
     */
    copy(other) {
        this.x = other.x;
        this.y = other.y;
        return this;
    }

    /**
     * Clona este vector
     */
    clone() {
        return new Vector(this.x, this.y);
    }

    /**
     * Hace este vector perpendicular
     */
    perp() {
        const x = this.x;
        this.x = this.y;
        this.y = -x;
        return this;
    }

    /**
     * Normaliza el vector (longitud unitaria)
     */
    normalize() {
        const d = this.len();
        if (d > 0) {
            this.x = this.x / d;
            this.y = this.y / d;
        }
        return this;
    }

    /**
     * Suma otro vector
     */
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }

    /**
     * Resta otro vector
     */
    sub(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }

    /**
     * Escala el vector
     */
    scale(x, y = x) {
        this.x *= x;
        this.y *= y;
        return this;
    }

    /**
     * Producto punto con otro vector
     */
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }

    /**
     * Longitud cuadrada del vector
     */
    len2() {
        return this.dot(this);
    }

    /**
     * Longitud del vector
     */
    len() {
        return Math.sqrt(this.len2());
    }
}

/**
 * Clase Circle para representar círculos
 */
class Circle {
    constructor(pos, radius) {
        this.pos = pos || new Vector();
        this.r = radius || 0;
        this.offset = new Vector();
    }

    /**
     * Calcula la posición real del círculo (pos + offset)
     */
    getPos() {
        return this.pos.clone().add(this.offset);
    }
}

/**
 * Clase Polygon para representar polígonos convexos
 */
class Polygon {
    constructor(pos, points) {
        this.pos = pos || new Vector();
        this.angle = 0;
        this.offset = new Vector();
        this.setPoints(points || []);
    }

    /**
     * Establece los puntos del polígono
     */
    setPoints(points) {
        this.points = points;
        this.recalc();
        return this;
    }

    /**
     * Establece la rotación del polígono
     */
    setAngle(angle) {
        this.angle = angle;
        this.recalc();
        return this;
    }

    /**
     * Establece el offset del polígono
     */
    setOffset(offset) {
        this.offset = offset;
        this.recalc();
        return this;
    }

    /**
     * Recalcula los puntos y normales transformados
     */
    recalc() {
        let i;
        const calcPoints = this.calcPoints = [];
        const edges = this.edges = [];
        const normals = this.normals = [];

        // Aplicar transformaciones (rotación + offset + posición)
        for (i = 0; i < this.points.length; i++) {
            const calcPoint = this.points[i].clone();
            
            // Aplicar rotación si es necesario
            if (this.angle !== 0) {
                const cos = Math.cos(this.angle);
                const sin = Math.sin(this.angle);
                const x = calcPoint.x * cos - calcPoint.y * sin;
                const y = calcPoint.x * sin + calcPoint.y * cos;
                calcPoint.x = x;
                calcPoint.y = y;
            }
            
            // Aplicar offset y posición
            calcPoint.add(this.offset).add(this.pos);
            calcPoints.push(calcPoint);
        }

        // Calcular aristas y normales
        for (i = 0; i < calcPoints.length; i++) {
            const p1 = calcPoints[i];
            const p2 = i < calcPoints.length - 1 ? calcPoints[i + 1] : calcPoints[0];
            const edge = p2.clone().sub(p1);
            edges.push(edge);
            normals.push(edge.clone().perp().normalize());
        }

        return this;
    }
}

/**
 * Clase Response para almacenar información de colisión
 */
class Response {
    constructor() {
        this.clear();
    }

    /**
     * Limpia la respuesta
     */
    clear() {
        this.a = null;
        this.b = null;
        this.overlapN = new Vector();
        this.overlapV = new Vector();
        this.overlap = Number.MAX_VALUE;
        this.aInB = true;
        this.bInA = true;
        return this;
    }
}

// === FUNCIONES DE UTILIDAD ===

/**
 * Proyecta un polígono sobre un eje
 */
function flattenPointsOn(points, normal, result) {
    let min = Number.MAX_VALUE;
    let max = -Number.MAX_VALUE;
    
    for (let i = 0; i < points.length; i++) {
        const dot = points[i].dot(normal);
        if (dot < min) min = dot;
        if (dot > max) max = dot;
    }
    
    result[0] = min;
    result[1] = max;
}

/**
 * Verifica si dos proyecciones se superponen
 */
function isSeparatingAxis(aPos, bPos, aPoints, bPoints, axis, response) {
    const rangeA = T_ARRAYS.pop();
    const rangeB = T_ARRAYS.pop();
    
    // Obtener rangos de proyección
    flattenPointsOn(aPoints, axis, rangeA);
    flattenPointsOn(bPoints, axis, rangeB);
    
    // Verificar superposición
    if (rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1]) {
        T_ARRAYS.push(rangeA);
        T_ARRAYS.push(rangeB);
        return true;
    }
    
    // Calcular superposición si se requiere respuesta
    if (response) {
        let overlap = 0;
        
        if (rangeA[0] < rangeB[0]) {
            response.aInB = false;
            if (rangeA[1] < rangeB[1]) {
                overlap = rangeA[1] - rangeB[0];
                response.bInA = false;
            } else {
                overlap = rangeA[1] - rangeB[0];
            }
        } else {
            response.bInA = false;
            if (rangeA[1] > rangeB[1]) {
                overlap = rangeB[1] - rangeA[0];
                response.aInB = false;
            } else {
                overlap = rangeB[1] - rangeA[0];
            }
        }
        
        const absOverlap = Math.abs(overlap);
        if (absOverlap < response.overlap) {
            response.overlap = absOverlap;
            response.overlapN.copy(axis);
            if (overlap < 0) {
                response.overlapN.scale(-1);
            }
        }
    }
    
    T_ARRAYS.push(rangeA);
    T_ARRAYS.push(rangeB);
    return false;
}

// Pool de arrays temporales para evitar garbage collection
const T_ARRAYS = [];
for (let i = 0; i < 10; i++) T_ARRAYS.push([]);

// === FUNCIONES DE DETECCIÓN DE COLISIÓN ===

/**
 * Detecta colisión entre dos polígonos
 */
function testPolygonPolygon(a, b, response) {
    const aPoints = a.calcPoints;
    const bPoints = b.calcPoints;
    const aNormals = a.normals;
    const bNormals = b.normals;
    
    if (response) response.clear();
    
    // Probar ejes de A
    for (let i = 0; i < aNormals.length; i++) {
        if (isSeparatingAxis(a.pos, b.pos, aPoints, bPoints, aNormals[i], response)) {
            return false;
        }
    }
    
    // Probar ejes de B
    for (let i = 0; i < bNormals.length; i++) {
        if (isSeparatingAxis(a.pos, b.pos, aPoints, bPoints, bNormals[i], response)) {
            return false;
        }
    }
    
    // Configurar respuesta final
    if (response) {
        response.a = a;
        response.b = b;
        response.overlapV.copy(response.overlapN).scale(response.overlap);
    }
    
    return true;
}

/**
 * Detecta colisión entre un polígono y un círculo
 */
function testPolygonCircle(polygon, circle, response) {
    const circlePos = circle.getPos();
    const radius = circle.r;
    const points = polygon.calcPoints;
    const len = points.length;
    const edge = T_VECTORS.pop();
    const point = T_VECTORS.pop();
    
    if (response) response.clear();
    
    // Para cada arista del polígono
    for (let i = 0; i < len; i++) {
        const next = i === len - 1 ? 0 : i + 1;
        const prev = i === 0 ? len - 1 : i - 1;
        let overlap = 0;
        let overlapN = null;
        
        // Obtener arista
        edge.copy(polygon.edges[i]);
        
        // Obtener punto en el círculo
        point.copy(circlePos).sub(points[i]);
        
        // Si la magnitud del punto es mayor que el radio, no hay colisión en esta arista
        if (response && point.len2() > radius * radius) {
            // Obtener el eje perpendicular a la arista hacia el centro del círculo
            edge.perp().normalize();
            
            // Verificar si es eje separador
            const dist = point.dot(edge);
            const distAbs = Math.abs(dist);
            
            if (dist > 0 && distAbs > radius) {
                T_VECTORS.push(edge);
                T_VECTORS.push(point);
                return false;
            }
            
            if (distAbs < response.overlap) {
                response.overlap = distAbs;
                overlapN = edge.clone();
                if (dist < 0) overlapN.scale(-1);
                response.overlapN.copy(overlapN);
            }
        }
    }
    
    // Configurar respuesta final
    if (response) {
        response.a = polygon;
        response.b = circle;
        response.overlapV.copy(response.overlapN).scale(response.overlap);
        
        // El círculo está siempre completamente en el polígono para simplificar
        response.aInB = false;
        response.bInA = false;
    }
    
    T_VECTORS.push(edge);
    T_VECTORS.push(point);
    return true;
}

/**
 * Detecta colisión entre círculo y polígono (invierte orden)
 */
function testCirclePolygon(circle, polygon, response) {
    const result = testPolygonCircle(polygon, circle, response);
    if (result && response) {
        // Invertir respuesta
        const a = response.a;
        response.a = response.b;
        response.b = a;
        response.overlapN.scale(-1);
        response.overlapV.scale(-1);
    }
    return result;
}

/**
 * Detecta colisión entre dos círculos
 */
function testCircleCircle(a, b, response) {
    const differenceV = T_VECTORS.pop().copy(b.getPos()).sub(a.getPos());
    const totalRadius = a.r + b.r;
    const totalRadiusSq = totalRadius * totalRadius;
    const distanceSq = differenceV.len2();
    
    // Si la distancia es mayor que la suma de radios, no hay colisión
    if (distanceSq > totalRadiusSq) {
        T_VECTORS.push(differenceV);
        return false;
    }
    
    // Configurar respuesta
    if (response) {
        response.clear();
        const dist = Math.sqrt(distanceSq);
        response.a = a;
        response.b = b;
        response.overlap = totalRadius - dist;
        response.overlapN.copy(differenceV.normalize());
        response.overlapV.copy(response.overlapN).scale(response.overlap);
        response.aInB = a.r <= b.r && dist <= b.r - a.r;
        response.bInA = b.r <= a.r && dist <= a.r - b.r;
    }
    
    T_VECTORS.push(differenceV);
    return true;
}

// Pool de vectores temporales
const T_VECTORS = [];
for (let i = 0; i < 10; i++) T_VECTORS.push(new Vector());

// === EXPORTACIONES ===

export const SAT = {
    Vector: Vector,
    Circle: Circle,
    Polygon: Polygon,
    Response: Response,
    testPolygonPolygon: testPolygonPolygon,
    testPolygonCircle: testPolygonCircle,
    testCirclePolygon: testCirclePolygon,
    testCircleCircle: testCircleCircle
};

// Exportar clases individuales también
export { Vector, Circle, Polygon, Response };

// Exportar funciones de test
export { testPolygonPolygon, testPolygonCircle, testCirclePolygon, testCircleCircle };

console.log("📦 Librería SAT.js cargada (versión simplificada)"); 