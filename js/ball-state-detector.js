// Sistema de detección de estado de la pelota
let ballStateDetector = {
    config: {
        // Configuración de detección matemática
        cellMargin: 15,       // Margen de tolerancia para considerar centro de celda
        intersectionMargin: 15, // Margen para considerar intersección
        ballRadius: 10,       // Radio de la pelota en píxeles
        barWidth: 2,         // Ancho de los barrotes en píxeles
        
        // Configuración de detección por píxeles
        pixelCheckRadius: 8,  // Radio para verificar píxeles alrededor de la pelota
        pixelCheckPoints: 12, // Número de puntos a verificar en el perímetro
        barColor: 'rgba(0, 0, 0, 1)',   // Color de los barrotes

        // Configuración de indicadores visuales
        indicatorSize: 30,    // Tamaño del cuadrado indicador
        indicatorSpacing: 40, // Espacio entre indicadores
        lastMathState: null,  // Último estado detectado por método matemático
        lastPixelState: null  // Último estado detectado por método de píxeles
    },

    // Inicializar el detector
    init: function() {
        console.log("Sistema de detección de estado de pelota inicializado");
    },

    // Método principal para detectar el estado
    detectState: function(ballPosition) {
        // Detectar usando ambos métodos por separado
        const mathState = this.detectStateMathematically(ballPosition);
        const pixelState = this.detectStateByPixels(ballPosition);
        
        // Guardar los resultados para visualización
        this.config.lastMathState = mathState;
        this.config.lastPixelState = pixelState;
        
        // La decisión final prioriza el método matemático si es concluyente
        const finalState = mathState !== 'uncertain' ? mathState : pixelState;
        return finalState;
    },
    
    // Esta función ahora se mantiene para compatibilidad pero será llamada por dibujarBorrador
    drawAllStateIndicators: function(ballPosition) {
        // La lógica del dibujado se mantiene tal cual para ser llamada desde borrador.js
        if (!ctxBorrador) {
            console.error("No se encontró el contexto de borrador");
            return;
        }

        // 🎯 NUEVA POSICIÓN: Debajo de los botones de borrador
        const leftStart = 20; // Alineado con el margen izquierdo de los botones
        const mathCenter = leftStart + 50; // Primer cuadrado 
        const pixelCenter = leftStart + 120; // Segundo cuadrado (separados por 70px)
        const indicatorY = 260; // Bajado para no solaparse con botones reposicionados
        
        // Limpiar áreas donde se dibujarán los indicadores
        // Área para método matemático
        this.clearIndicatorArea(mathCenter, indicatorY, this.config.indicatorSize + 10);
        // Área para método de píxeles
        this.clearIndicatorArea(pixelCenter, indicatorY, this.config.indicatorSize + 10);
        
        // Dibujar solo el indicador activo para el método matemático (lado izquierdo)
        if (this.config.lastMathState === 'covered') {
            // Dibujar indicador de estado "covered"
            this.drawSingleIndicator(
                mathCenter, 
                indicatorY, 
                true, // Siempre activo porque solo dibujamos el que está activo
                'C', 
                'rgba(255, 0, 0, 1)'
            );
        } else if (this.config.lastMathState === 'uncovered') {
            // Dibujar indicador de estado "uncovered"
            this.drawSingleIndicator(
                mathCenter, 
                indicatorY, 
                true, // Siempre activo porque solo dibujamos el que está activo
                'D', 
                'rgba(0, 255, 0, 1)'
            );
        } else {
            // Si el estado es incierto, dibujamos un indicador neutral
            this.drawSingleIndicator(
                mathCenter, 
                indicatorY, 
                true,
                '?', 
                'rgba(136, 136, 136, 1)'
            );
        }
        
        // Dibujar solo el indicador activo para el método de píxeles (lado derecho)
        if (this.config.lastPixelState === 'covered') {
            // Dibujar indicador de estado "covered"
            this.drawSingleIndicator(
                pixelCenter, 
                indicatorY, 
                true, // Siempre activo porque solo dibujamos el que está activo
                'C', 
                'rgba(255, 0, 0, 1)'
            );
        } else if (this.config.lastPixelState === 'uncovered') {
            // Dibujar indicador de estado "uncovered"
            this.drawSingleIndicator(
                pixelCenter, 
                indicatorY, 
                true, // Siempre activo porque solo dibujamos el que está activo
                'D', 
                'rgba(0, 255, 0, 1)'
            );
        } else {
            // Si el estado es incierto, dibujamos un indicador neutral
            this.drawSingleIndicator(
                pixelCenter, 
                indicatorY, 
                true,
                '?', 
                'rgba(136, 136, 136, 1)'
            );
        }
        
        // 🏷️ Etiquetas reposicionadas para la nueva ubicación (debajo de los botones)
        ctxBorrador.font = "bold 10px Arial"; // Fuente más pequeña para mejor ajuste
        ctxBorrador.textAlign = "center";
        ctxBorrador.fillStyle = "rgba(255, 255, 255, 1)";
        ctxBorrador.fillText("Geom", mathCenter, indicatorY - 25); // Texto arriba de los cuadrados
        ctxBorrador.fillText("Pixel", pixelCenter, indicatorY - 25); // Texto arriba de los cuadrados
    },
    
    // Limpiar una pequeña área alrededor de un indicador
    clearIndicatorArea: function(x, y, size = null) {
        const areaSize = size || (this.config.indicatorSize + 4);
        ctxBorrador.fillStyle = 'rgba(0, 0, 0, 1)';
        ctxBorrador.fillRect(
            x - areaSize/2,
            y - areaSize/2,
            areaSize,
            areaSize
        );
    },
    
    // Dibujar un solo indicador
    drawSingleIndicator: function(x, y, isActive, label, activeColor, inactiveColor = null) {
        const size = this.config.indicatorSize;
        
        // Solo usamos el color activo ya que solo dibujamos los indicadores activos
        ctxBorrador.fillStyle = activeColor;
        ctxBorrador.fillRect(
            x - size/2,
            y - size/2,
            size,
            size
        );

        // Agregar borde blanco
        ctxBorrador.strokeStyle = 'rgba(255, 255, 255, 1)';
        ctxBorrador.lineWidth = 2;
        ctxBorrador.strokeRect(
            x - size/2,
            y - size/2,
            size,
            size
        );
        
        // Agregar etiqueta de texto
        ctxBorrador.font = "bold 16px Arial";
        ctxBorrador.textAlign = "center";
        ctxBorrador.textBaseline = "middle";
        ctxBorrador.fillStyle = "rgba(255, 255, 255, 1)";
        ctxBorrador.fillText(label, x, y);
    },

    // Detección matemática del estado usando las listas de coordenadas generadas por el sistema
    detectStateMathematically: function(ballPosition) {
        // 1. Verificar distancia a puntos descubiertos (centros de celdas)
        const puntosDescubiertos = window.obtenerCoordenadasDescubiertas();
        if (puntosDescubiertos && puntosDescubiertos.length > 0) {
            let minDistanciaDescubierto = Infinity;
            
            // Calcular la distancia mínima a algún punto descubierto
            for (const punto of puntosDescubiertos) {
                const distancia = Math.hypot(
                    ballPosition.x - punto.x,
                    ballPosition.y - punto.y
                );
                minDistanciaDescubierto = Math.min(minDistanciaDescubierto, distancia);
            }
            
            // Si está muy cerca de un punto descubierto, está descubierto
            if (minDistanciaDescubierto < this.config.cellMargin) {
                return 'uncovered';
            }
        }
        
        // 2. Verificar distancia a puntos cubiertos (intersecciones)
        const puntosCubiertos = window.obtenerCoordenadasCubiertas();
        if (puntosCubiertos && puntosCubiertos.length > 0) {
            let minDistanciaCubierto = Infinity;
            
            // Calcular la distancia mínima a algún punto cubierto
            for (const punto of puntosCubiertos) {
                const distancia = Math.hypot(
                    ballPosition.x - punto.x,
                    ballPosition.y - punto.y
                );
                minDistanciaCubierto = Math.min(minDistanciaCubierto, distancia);
            }
            
            // Si está muy cerca de un punto cubierto, está cubierto
            if (minDistanciaCubierto < this.config.intersectionMargin) {
                return 'covered';
            }
        }
        
        // 3. No pudo determinar el estado con certeza
        return 'uncertain';
    },

    // Calcular distancia a los barrotes más cercanos
    calculateDistanceToBar: function(ballPosition, cell) {
        // Obtener las coordenadas de los barrotes de la celda
        const bars = window.getBarsFromCell(cell);
        if (!bars) return Infinity;

        let minDistance = Infinity;
        for (const bar of bars) {
            const distance = this.distanceToLineSegment(
                ballPosition,
                bar.start,
                bar.end
            );
            minDistance = Math.min(minDistance, distance);
        }

        return minDistance;
    },

    // Calcular distancia de un punto a un segmento de línea
    distanceToLineSegment: function(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;

        if (len_sq !== 0) {
            param = dot / len_sq;
        }

        let xx, yy;

        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;

        return Math.sqrt(dx * dx + dy * dy);
    },

    // Detección por píxeles del estado
    detectStateByPixels: function(ballPosition) {
        const ctx = window.ctxGrid; // Contexto del canvas de la reja
        if (!ctx) return 'uncertain';

        try {
            // Validar que las coordenadas sean números finitos
            if (!ballPosition || 
                !Number.isFinite(ballPosition.x) || 
                !Number.isFinite(ballPosition.y)) {
                console.warn("Coordenadas de pelota no válidas:", ballPosition);
                return 'uncertain';
            }

            // Validar que las coordenadas estén dentro del canvas
            const canvasWidth = ctx.canvas.width;
            const canvasHeight = ctx.canvas.height;
            
            // Calcular coordenadas para getImageData con límites seguros
            const x = Math.max(0, Math.min(Math.floor(ballPosition.x - this.config.pixelCheckRadius), canvasWidth));
            const y = Math.max(0, Math.min(Math.floor(ballPosition.y - this.config.pixelCheckRadius), canvasHeight));
            const width = Math.min(this.config.pixelCheckRadius * 2, canvasWidth - x);
            const height = Math.min(this.config.pixelCheckRadius * 2, canvasHeight - y);

            // Si el área a analizar es demasiado pequeña, retornar uncertain
            if (width <= 0 || height <= 0) {
                console.warn("Área de análisis inválida:", {x, y, width, height});
                return 'uncertain';
            }

            // Obtener los datos de píxeles
            const imageData = ctx.getImageData(x, y, width, height);

            // Verificar puntos en el perímetro
            let barPixelCount = 0;
            for (let i = 0; i < this.config.pixelCheckPoints; i++) {
                const angle = (i / this.config.pixelCheckPoints) * Math.PI * 2;
                const checkX = Math.round(width/2 + Math.cos(angle) * Math.min(width/2, height/2, this.config.pixelCheckRadius));
                const checkY = Math.round(height/2 + Math.sin(angle) * Math.min(width/2, height/2, this.config.pixelCheckRadius));
                
                if (this.isBarPixel(imageData, checkX, checkY)) {
                    barPixelCount++;
                }
            }

            // Si más del 30% de los puntos verificados son barrotes, está cubierta
            const threshold = this.config.pixelCheckPoints * 0.3;
            return barPixelCount > threshold ? 'covered' : 'uncovered';
        } catch (error) {
            console.error("Error en la detección por píxeles:", error);
            return 'uncertain';
        }
    },

    // Verificar si un píxel es parte de un barrote
    isBarPixel: function(imageData, x, y) {
        try {
            const index = (y * imageData.width + x) * 4;
            
            if (index < 0 || index >= imageData.data.length) {
                return false;
            }
            
            const r = imageData.data[index];
            const g = imageData.data[index + 1];
            const b = imageData.data[index + 2];
            
            // Convertir el color del píxel a formato RGBA
            const pixelColor = `rgba(${r}, ${g}, ${b}, 1)`;
            
            // Comparar con el color de los barrotes (con cierta tolerancia)
            return this.colorsAreSimilar(pixelColor, this.config.barColor);
        } catch (error) {
            console.error("Error al verificar píxel:", error);
            return false;
        }
    },

    // Comparar dos colores con cierta tolerancia
    colorsAreSimilar: function(color1, color2) {
        const tolerance = 30;
        
        // Extraer valores RGB de los strings rgba
        const rgb1 = this.rgbaToRgb(color1);
        const rgb2 = this.rgbaToRgb(color2);
        
        if (!rgb1 || !rgb2) return false;
        
        const diffR = Math.abs(rgb1.r - rgb2.r);
        const diffG = Math.abs(rgb1.g - rgb2.g);
        const diffB = Math.abs(rgb1.b - rgb2.b);
        
        return diffR <= tolerance && diffG <= tolerance && diffB <= tolerance;
    },

    // Convertir color RGBA a objeto RGB
    rgbaToRgb: function(rgba) {
        const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return match ? {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
        } : null;
    }
};

// Exportar al scope global
window.ballStateDetector = ballStateDetector; 