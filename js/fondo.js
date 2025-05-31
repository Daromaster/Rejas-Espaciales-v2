// Sistema de fondo estrellado
let configFondo = {
    stars: [],
    lastBlinkTime: 0,
    blinkInterval: 1000, // 1 segundo entre parpadeos
    currentBlinkingStar: 0,
    isInitialized: false
};

function initFondo() {
    // Solo inicializar si no está inicializado
    if (configFondo.isInitialized) return;
    
    // Crear estrellas estáticas
    const numStars = 100;
    configFondo.stars = [];
    
    // Asegurarnos de que el canvas tenga dimensiones
    if (!canvasFondo || !canvasFondo.width || !canvasFondo.height) {
        console.warn("Canvas de fondo no está listo, reintentando en el siguiente frame");
        return;
    }
    
    for (let i = 0; i < numStars; i++) {
        configFondo.stars.push({
            x: Math.random() * canvasFondo.width,
            y: Math.random() * canvasFondo.height,
            size: Math.random() * 2 + 1,
            brightness: 1
        });
    }
    
    configFondo.isInitialized = true;
    // console.log("Fondo inicializado con", numStars, "estrellas");
}

function dibujarFondo() {
    // Si no está inicializado, intentar inicializar
    if (!configFondo.isInitialized) {
        initFondo();
        return;
    }
    
    // Limpiar el canvas
    ctxFondo.clearRect(0, 0, canvasFondo.width, canvasFondo.height);
    
    // Fondo negro
    ctxFondo.fillStyle = "rgba(0, 0, 0, 1)";
    ctxFondo.fillRect(0, 0, canvasFondo.width, canvasFondo.height);
    
    // Actualizar parpadeo de estrellas
    const currentTime = performance.now();
    if (currentTime - configFondo.lastBlinkTime > configFondo.blinkInterval) {
        // Restaurar brillo de la estrella anterior
        if (configFondo.stars[configFondo.currentBlinkingStar]) {
            configFondo.stars[configFondo.currentBlinkingStar].brightness = 1;
        }
        
        // Seleccionar nueva estrella para parpadear
        configFondo.currentBlinkingStar = Math.floor(Math.random() * configFondo.stars.length);
        configFondo.stars[configFondo.currentBlinkingStar].brightness = 0.3;
        
        configFondo.lastBlinkTime = currentTime;
    }
    
    // Dibujar estrellas
    ctxFondo.fillStyle = "rgba(255, 255, 255, 1)";
    for (const star of configFondo.stars) {
        ctxFondo.globalAlpha = star.brightness;
        ctxFondo.beginPath();
        ctxFondo.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctxFondo.fill();
    }
    ctxFondo.globalAlpha = 1;
}

function updateFondo() {
    const currentLevel = fondoConfig.currentLevel;
    
    if (!fondoConfig.isInitialized) {
        console.error("❌ Sistema de fondo no inicializado");
        return;
    }

    switch(currentLevel) {
        case 1: {
            // Actualizar fondo nivel 1
            break;
        }
        
        case 2: {
            // Actualizar fondo nivel 2
            break;
        }
        
        default: {
            console.warn(`⚠️ Nivel ${currentLevel} no implementado para fondo`);
            break;
        }
    }
}

// Exportar al scope global
window.configFondo = configFondo;
window.initFondo = initFondo;
window.dibujarFondo = dibujarFondo; 