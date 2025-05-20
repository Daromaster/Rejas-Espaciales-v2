// Sistema de pelota
let posX = 0, posY = 0;
let angulo = 0;
let radioPelota = 0;
let centroPelotaX = 0;
let centroPelotaY = 0;

// Sistema de colores de la pelota
const ballColorSystem = {
    baseColor: {
        bright: "rgba(255, 170, 170, 1)",  // Color claro para el brillo (rojo)
        mid: "rgb(218, 28, 28)",           // Color intermedio (rojo)
        dark: "rgba(128, 0, 0, 1)"         // Color oscuro para el borde (rojo)
    },
    hitColor: {
        bright: "rgba(255, 170, 255, 1)",  // Color claro para el brillo (violeta)
        mid: "rgb(218, 28, 218)",          // Color intermedio (violeta)
        dark: "rgba(128, 0, 128, 1)"       // Color oscuro para el borde (violeta)
    },
    currentIntensity: 0,                  // 0-100 para mezclar entre el color base y el color de impacto
    maxIntensity: 100,                    // Intensidad máxima
    decayRate: 2,                         // Velocidad de desvanecimiento
    lastHitTime: 0,                       // Último momento en que recibió un impacto
    isHit: false,                         // Indica si la pelota está actualmente impactada
    transitionDuration: 300,              // Duración de la transición en milisegundos
    intensityLevel: 0                     // Nivel de intensidad acumulado (0-3)
};

function dibujarBall() {
    if (!configGrid) return;
    
    ctxBall.clearRect(0, 0, canvasBall.width, canvasBall.height);
    
    const espacioEntreBarrotes = configGrid.tamCuadrado;
    const grosor = configGrid.grosorLinea;
    const diametro = espacioEntreBarrotes - grosor - 6;
    const radio = diametro / 2;
    radioPelota = radio;
    
    // Usar las coordenadas actuales de la pelota en lugar del centro del canvas
    centroPelotaX = posX;
    centroPelotaY = posY;
    
    // Obtener el ángulo actual de rotación
    const anguloActual = ballMovement.updateRotation();
    
    // Guardar el estado actual del contexto
    ctxBall.save();
    
    // Mover a la posición actual de la pelota y rotar
    ctxBall.translate(centroPelotaX, centroPelotaY);
    ctxBall.rotate(anguloActual);
    
    // Definir desplazamiento para el brillo (para dar efecto 3D)
    const gradX = radio * 0.25;
    const gradY = -radio * 0.25;
    
    // Crear un gradiente radial desplazado para efecto de luz/sombra
    const grad = ctxBall.createRadialGradient(
        gradX, gradY, 0,
        gradX, gradY, radio * 2
    );
    
    // Actualizar el sistema de colores
    updateBallColor();
    
    // Calcular colores mezclados basados en la intensidad actual
    const currentColors = calculateCurrentColors();
    
    // Definir colores del gradiente (del centro hacia afuera)
    grad.addColorStop(0, currentColors.bright);
    grad.addColorStop(0.5, currentColors.mid);
    grad.addColorStop(1, currentColors.dark);
    
    ctxBall.fillStyle = grad;
    ctxBall.beginPath();
    ctxBall.arc(0, 0, radio, 0, 2 * Math.PI);
    ctxBall.fill();
    
    // Restaurar el estado del contexto
    ctxBall.restore();
}

// Actualizar el sistema de colores de la pelota
function updateBallColor() {
    const currentTime = performance.now();
    
    // Si la pelota está impactada, reducir gradualmente la intensidad
    if (ballColorSystem.currentIntensity > 0) {
        // Reducir la intensidad basada en el tiempo transcurrido
        const timeSinceLastHit = currentTime - ballColorSystem.lastHitTime;
        
        // Solo comenzar a decaer después de un breve período
        if (timeSinceLastHit > ballColorSystem.transitionDuration) {
            ballColorSystem.currentIntensity -= ballColorSystem.decayRate;
            
            // Asegurar que no sea negativo
            if (ballColorSystem.currentIntensity < 0) {
                ballColorSystem.currentIntensity = 0;
                ballColorSystem.isHit = false;
            }
        }
    }
}

// Calcular los colores actuales basados en la mezcla entre el color base y el color de impacto
function calculateCurrentColors() {
    // La intensidad actual determina cuánto del color de impacto se usa (0-100%)
    const intensity = ballColorSystem.currentIntensity / 100;
    
    // Función para mezclar dos colores RGBA
    function blendColors(color1, color2, amount) {
        // Convertir los colores a objetos RGB
        const parseColor = (colorStr) => {
            if (colorStr.startsWith('rgb(')) {
                const rgb = colorStr.match(/\d+/g).map(Number);
                return { r: rgb[0], g: rgb[1], b: rgb[2], a: 1 };
            } else if (colorStr.startsWith('rgba(')) {
                const rgba = colorStr.match(/\d+(\.\d+)?/g).map(Number);
                return { r: rgba[0], g: rgba[1], b: rgba[2], a: rgba[3] };
            }
            return { r: 0, g: 0, b: 0, a: 1 }; // Fallback
        };
        
        const c1 = parseColor(color1);
        const c2 = parseColor(color2);
        
        // Mezclar los componentes
        const r = Math.round(c1.r * (1 - amount) + c2.r * amount);
        const g = Math.round(c1.g * (1 - amount) + c2.g * amount);
        const b = Math.round(c1.b * (1 - amount) + c2.b * amount);
        const a = c1.a * (1 - amount) + c2.a * amount;
        
        // Devolver como string RGBA
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    // Mezclar cada componente de color
    return {
        bright: blendColors(ballColorSystem.baseColor.bright, ballColorSystem.hitColor.bright, intensity),
        mid: blendColors(ballColorSystem.baseColor.mid, ballColorSystem.hitColor.mid, intensity),
        dark: blendColors(ballColorSystem.baseColor.dark, ballColorSystem.hitColor.dark, intensity)
    };
}

// Función para indicar que la pelota ha sido impactada por un disparo
function ballHit() {
    // Registrar el tiempo del impacto
    ballColorSystem.lastHitTime = performance.now();
    
    // Si ya está impactada, aumentar la intensidad
    if (ballColorSystem.isHit) {
        // Aumentar la intensidad
        ballColorSystem.intensityLevel = Math.min(3, ballColorSystem.intensityLevel + 1);
        ballColorSystem.currentIntensity = Math.min(ballColorSystem.maxIntensity, 
            ballColorSystem.currentIntensity + 30);
    } else {
        // Primer impacto
        ballColorSystem.isHit = true;
        ballColorSystem.intensityLevel = 1;
        ballColorSystem.currentIntensity = 60; // Intensidad inicial al 60%
    }
    
    // Ajustar colores basados en el nivel de intensidad
    const intensityFactor = ballColorSystem.intensityLevel / 3;
    
    // Hacer el color violeta más brillante con cada nivel
    ballColorSystem.hitColor.bright = `rgba(${255}, ${170 + intensityFactor * 50}, ${255}, 1)`;
    ballColorSystem.hitColor.mid = `rgb(${218 + intensityFactor * 37}, ${28}, ${218 + intensityFactor * 37})`;
    ballColorSystem.hitColor.dark = `rgba(${128 + intensityFactor * 40}, ${0}, ${128 + intensityFactor * 40}, 1)`;
}

function actualizarPosicionBall(nuevaX, nuevaY) {
    posX = nuevaX;
    posY = nuevaY;
    dibujarBall();
}

// Función para reiniciar el sistema de colores de la pelota
function resetBallColor() {
    // Reiniciar todas las propiedades del sistema de colores
    ballColorSystem.currentIntensity = 0;
    ballColorSystem.isHit = false;
    ballColorSystem.lastHitTime = 0;
    ballColorSystem.intensityLevel = 0;
    
    // Restaurar los colores de impacto originales
    ballColorSystem.hitColor.bright = "rgba(255, 170, 255, 1)";
    ballColorSystem.hitColor.mid = "rgb(218, 28, 218)";
    ballColorSystem.hitColor.dark = "rgba(128, 0, 128, 1)";
    
    // Forzar un redibujado para aplicar los colores originales
    dibujarBall();
}

// Exportar funciones necesarias
window.actualizarPosicionBall = actualizarPosicionBall;
window.radioPelota = radioPelota;
window.ballHit = ballHit; // Exportar la función de impacto de la pelota
window.resetBallColor = resetBallColor; // Exportar la función de reinicio de color 