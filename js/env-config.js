// Determina si el juego se está ejecutando en un entorno local
const IS_LOCAL_ENVIRONMENT = (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
);

// Hacerla accesible globalmente
window.IS_LOCAL_ENVIRONMENT = IS_LOCAL_ENVIRONMENT;

if (IS_LOCAL_ENVIRONMENT) {
    console.log("Entorno local detectado. Puntos de depuración ACTIVOS.");
} else {
    console.log("Entorno de producción detectado. Puntos de depuración INACTIVOS.");
} 