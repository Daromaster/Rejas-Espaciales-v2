// api-client.js - Cliente para comunicarse con el backend de Rejas Espaciales

// Versión actual del juego (constante global)
window.GAME_VERSION = "2.0.0";

// Debug flag para ayudar con el problema del cierre del panel de ranking
window.DEBUG_RANKING_PANEL = true;

// Bandera temporal para deshabilitar localStorage (prueba de solución)
window.DISABLE_LOCAL_STORAGE = false;

// MODO DE PRUEBA: Sin peticiones de red reales (para probar si el problema es la red)
window.MOCK_API_REQUESTS = false;

// Variables para el manejo selectivo de geolocalización
window.MOCK_GEOLOCATION_ON_LOCALHOST = false; // Permitir geolocalización real en localhost

// Sistema de timeouts globales pendientes
window.pendingTimeouts = [];

// Utilidad para manejar timeouts de forma limpia
window.createCleanableTimeout = function(callback, delay) {
    const timeoutId = setTimeout(() => {
        // Remover de la lista cuando se ejecuta
        const index = window.pendingTimeouts.indexOf(timeoutId);
        if (index > -1) {
            window.pendingTimeouts.splice(index, 1);
        }
        callback();
    }, delay);
    
    // Guardar referencia al timeout
    window.pendingTimeouts.push(timeoutId);
    return timeoutId;
};

// Función para limpiar todos los timeouts pendientes
window.clearAllPendingTimeouts = function() {
    console.log(`Limpiando ${window.pendingTimeouts.length} timeouts pendientes`);
    window.pendingTimeouts.forEach(id => {
        clearTimeout(id);
    });
    window.pendingTimeouts = [];
};

// Datos simulados para modo de prueba
window.MOCK_DATA = {
    ranking: [
        {nombre: "Jugador Test 1", puntaje: 120, dispositivo: "desktop", ubicacion: "Ciudad Test", version: "2.0.0"},
        {nombre: "Jugador Test 2", puntaje: 90, dispositivo: "mobile", ubicacion: "Ciudad Test", version: "2.0.0"},
        {nombre: "Jugador Test 3", puntaje: 70, dispositivo: "desktop", ubicacion: "Ciudad Test", version: "2.0.0"}
    ]
};

// Variable global para el control de cancelación de peticiones
window.apiRequestControllers = {
    active: [],
    cancelAll: function() {
        console.log(`Cancelando ${this.active.length} peticiones API pendientes`);
        this.active.forEach(controller => {
            try {
                controller.abort();
            } catch (e) {
                console.warn("Error al cancelar petición:", e);
            }
        });
        this.active = [];
    }
};

// Función para limpiar todos los recursos
window.cleanupAllResources = function() {
    console.log("=== LIMPIEZA GENERAL DE RECURSOS ===");
    // Cancelar todas las peticiones API
    window.apiRequestControllers.cancelAll();
    // Limpiar todos los timeouts
    window.clearAllPendingTimeouts();
    console.log("=== LIMPIEZA COMPLETADA ===");
};

// Detector de recargas de página
window.addEventListener('beforeunload', function(e) {
    console.error('=== RECARGA DE PÁGINA DETECTADA ===');
    console.trace('Stack trace en momento de recarga');
    
    // Intentar limpiar recursos antes de la recarga
    window.cleanupAllResources();
    
    // En desarrollo, podemos intentar prevenir la recarga para investigar
    if (window.IS_LOCAL_ENVIRONMENT) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Objeto principal del cliente API
const apiClient = {
    // Configuración del cliente
    config: {
        // URLs de los entornos
        urls: {
            local: 'http://localhost:3000',
            production: 'https://rejas-espaciales-backend-v2.onrender.com'
        },
        // Determinar el entorno actual
        isLocalEnvironment: function() {
            return window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
        },
        // Obtener la URL base según el entorno
        getBaseUrl: function() {
            return this.isLocalEnvironment() ? this.urls.local : this.urls.production;
        }
    },
    
    // Métodos para interactuar con la API
    ranking: {
        // Obtener todos los puntajes ordenados
        getAll: async function() {
            // Si estamos en modo de prueba, devolver datos simulados
            if (window.MOCK_API_REQUESTS) {
                console.log("MODO PRUEBA: Devolviendo ranking simulado");
                // Simular una pequeña demora para que sea realista
                await new Promise(resolve => setTimeout(resolve, 300));
                return [...window.MOCK_DATA.ranking]; // Devolver copia para evitar modificaciones
            }
            
            // Crear un controller para esta petición
            const controller = new AbortController();
            window.apiRequestControllers.active.push(controller);
            
            try {
                const response = await fetch(`${apiClient.config.getBaseUrl()}/ranking`, {
                    signal: controller.signal
                });
                
                // Eliminar el controller de la lista de activos
                const index = window.apiRequestControllers.active.indexOf(controller);
                if (index > -1) {
                    window.apiRequestControllers.active.splice(index, 1);
                }
                
                if (!response.ok) {
                    throw new Error('Error al obtener ranking');
                }
                return await response.json();
            } catch (error) {
                // No lanzar error si fue cancelada
                if (error.name === 'AbortError') {
                    console.log('Petición de ranking cancelada');
                    return [];
                }
                
                console.error('Error al cargar el ranking:', error);
                throw error;
            }
        },
        
        // Guardar un nuevo puntaje
        save: async function(playerName, score, deviceType, location) {
            // Si estamos en modo de prueba, simular guardar en el ranking
            if (window.MOCK_API_REQUESTS) {
                console.log("MODO PRUEBA: Simulando guardar en ranking");
                // Simular una pequeña demora para que sea realista
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Añadir a los datos simulados
                const newEntry = {
                    nombre: playerName,
                    puntaje: score,
                    dispositivo: deviceType || "unknown",
                    ubicacion: location || "desconocida",
                    version: window.GAME_VERSION
                };
                
                window.MOCK_DATA.ranking.push(newEntry);
                
                // Ordenar por puntuación
                window.MOCK_DATA.ranking.sort((a, b) => b.puntaje - a.puntaje);
                
                return {success: true, message: "Simulación: Puntuación guardada"};
            }
            
            // Crear un controller para esta petición
            const controller = new AbortController();
            window.apiRequestControllers.active.push(controller);
            
            try {
                const data = {
                    nombre: playerName,
                    puntaje: score,
                    version: window.GAME_VERSION,
                    dispositivo: deviceType || "unknown",
                    ubicacion: location || "desconocida"
                };
                
                console.log("Enviando datos al servidor:", data);
                
                const response = await fetch(`${apiClient.config.getBaseUrl()}/ranking`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data),
                    signal: controller.signal
                });
                
                // Eliminar el controller de la lista de activos
                const index = window.apiRequestControllers.active.indexOf(controller);
                if (index > -1) {
                    window.apiRequestControllers.active.splice(index, 1);
                }
                
                if (!response.ok) {
                    throw new Error('Error al guardar puntaje');
                }
                
                // Limpiar recursos después de guardar exitosamente
                window.createCleanableTimeout(() => {
                    console.log("Limpieza programada después de guardar puntuación");
                    window.cleanupAllResources();
                }, 1000);
                
                return await response.json();
            } catch (error) {
                // No lanzar error si fue cancelada
                if (error.name === 'AbortError') {
                    console.log('Petición de guardado cancelada');
                    return { cancelled: true };
                }
                
                console.error('Error al guardar puntaje:', error);
                throw error;
            }
        },
        
        // Obtener ubicación basada en IP para entorno de desarrollo
        getLocationFromIP: async function() {
            // Si estamos en modo de prueba o es localhost con simulación activada
            if (window.MOCK_API_REQUESTS || 
                (window.MOCK_GEOLOCATION_ON_LOCALHOST && apiClient.config.isLocalEnvironment())) {
                console.log("Modo local: Devolviendo ubicación simulada para IP");
                // Simular una pequeña demora para que sea realista
                await new Promise(resolve => setTimeout(resolve, 200));
                return "Ciudad Local";
            }
            
            // Crear un controller para esta petición
            const controller = new AbortController();
            window.apiRequestControllers.active.push(controller);
            
            try {
                console.log("Usando método alternativo de geolocalización (IP)");
                
                // Establecer un timeout para la solicitud
                const timeoutId = window.createCleanableTimeout(() => controller.abort(), 3000);
                
                // Hacer petición HTTP
                const response = await fetch('https://ipinfo.io/json', {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                // Eliminar el controller de la lista de activos y cancelar el timeout
                const index = window.apiRequestControllers.active.indexOf(controller);
                if (index > -1) {
                    window.apiRequestControllers.active.splice(index, 1);
                }
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error('Error al obtener ubicación por IP');
                }
                
                const data = await response.json();
                
                if (data && data.city) {
                    console.log("Ubicación obtenida por IP:", data.city);
                    return data.city;
                } else {
                    return "desconocida";
                }
            } catch (error) {
                // No lanzar error si fue cancelada
                if (error.name === 'AbortError') {
                    console.log('Petición de geolocalización IP cancelada');
                    return "desconocida";
                }
                
                console.error('Error al obtener ubicación por IP:', error);
                // En caso de error, devolvemos "desconocida" para no bloquear el flujo
                return "desconocida";
            }
        },
        
        // Obtener ubicación a partir de coordenadas
        getLocationFromCoords: async function(latitude, longitude) {
            // Si estamos en modo de prueba o es localhost con simulación activada
            if (window.MOCK_API_REQUESTS || 
                (window.MOCK_GEOLOCATION_ON_LOCALHOST && apiClient.config.isLocalEnvironment())) {
                console.log("Modo local: Devolviendo ubicación simulada para coordenadas");
                // Simular una pequeña demora para que sea realista
                await new Promise(resolve => setTimeout(resolve, 300));
                return "Ciudad Local";
            }
            
            // Crear un controller para esta petición
            const controller = new AbortController();
            window.apiRequestControllers.active.push(controller);
            
            try {
                // Usar nuestro sistema de timeouts limpiables
                const timeoutId = window.createCleanableTimeout(() => controller.abort(), 3000);
                
                // Utilizamos el servicio de geocodificación inversa de OpenStreetMap (Nominatim)
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
                    {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'RejasEspacialesGame/2.0.0'
                        }
                    }
                );
                
                // Eliminar el controller de la lista de activos y cancelar el timeout
                const index = window.apiRequestControllers.active.indexOf(controller);
                if (index > -1) {
                    window.apiRequestControllers.active.splice(index, 1);
                }
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error('Error al obtener ubicación');
                }
                
                const data = await response.json();
                
                // Extraer el nombre de la localidad o ciudad
                let location = "desconocida";
                if (data && data.address) {
                    // Intentar obtener la localidad en diferentes niveles
                    location = data.address.city || data.address.town || data.address.village || 
                              data.address.suburb || data.address.neighbourhood || "desconocida";
                }
                
                console.log("Ubicación obtenida:", location);
                return location;
                
            } catch (error) {
                // No lanzar error si fue cancelada
                if (error.name === 'AbortError') {
                    console.log('Petición de geocodificación inversa cancelada');
                    return "desconocida";
                }
                
                console.error('Error al obtener ubicación:', error);
                // En caso de error, devolvemos "desconocida" para no bloquear el flujo
                return "desconocida";
            }
        },
        
        // Limpieza de recursos después de operaciones de ranking
        cleanupAfterRankingOperation: function() {
            console.log("Iniciando limpieza post-ranking");
            // Ejecutar limpieza inmediata
            window.cleanupAllResources();
            
            // También programar una limpieza retrasada (por si hay callbacks tardíos)
            window.createCleanableTimeout(() => {
                console.log("Limpieza retrasada post-ranking (8 segundos)");
                window.cleanupAllResources();
            }, 8000); // Exactamente el tiempo en que ocurre la recarga
        },
        
        // Obtener todos los puntajes ordenados con limpieza automática
        getAllWithCleanup: async function() {
            try {
                const result = await this.getAll();
                // Limpiar recursos al terminar
                this.cleanupAfterRankingOperation();
                return result;
            } catch (error) {
                this.cleanupAfterRankingOperation();
                throw error;
            }
        },
        
        // Guardar puntuación con limpieza automática
        saveWithCleanup: async function(playerName, score, deviceType, location) {
            try {
                const result = await this.save(playerName, score, deviceType, location);
                // Limpiar recursos al terminar
                this.cleanupAfterRankingOperation();
                return result;
            } catch (error) {
                this.cleanupAfterRankingOperation();
                throw error;
            }
        }
    }
};

// Exponer el cliente API globalmente
window.apiClient = apiClient;

// Registrar el entorno detectado en la consola
console.log(`API Client inicializado en entorno: ${apiClient.config.isLocalEnvironment() ? 'Local' : 'Producción'}`);
console.log(`Versión del juego: ${window.GAME_VERSION}`);
console.log(`URL del backend: ${apiClient.config.getBaseUrl()}`);
console.log(`LocalStorage ${window.DISABLE_LOCAL_STORAGE ? 'deshabilitado' : 'habilitado'} para pruebas`);
console.log(`Modo de API: ${window.MOCK_API_REQUESTS ? 'SIMULACIÓN (sin peticiones de red)' : 'REAL'}`);
console.log(`Geolocalización en localhost: ${window.MOCK_GEOLOCATION_ON_LOCALHOST ? 'SIMULADA' : 'REAL'}`);
console.log(`Sistema de limpieza de recursos: ACTIVADO`);