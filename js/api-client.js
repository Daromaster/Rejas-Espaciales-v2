// api-client.js - Cliente para comunicarse con el backend de Rejas Espaciales

// Versión actual del juego (constante global)
window.GAME_VERSION = "2.0.0";

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
            try {
                const response = await fetch(`${apiClient.config.getBaseUrl()}/ranking`);
                if (!response.ok) {
                    throw new Error('Error al obtener ranking');
                }
                return await response.json();
            } catch (error) {
                console.error('Error al cargar el ranking:', error);
                throw error;
            }
        },
        
        // Guardar un nuevo puntaje
        save: async function(playerName, score, deviceType, location) {
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
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    throw new Error('Error al guardar puntaje');
                }
                
                return await response.json();
            } catch (error) {
                console.error('Error al guardar puntaje:', error);
                throw error;
            }
        },
        
        // Obtener ubicación basada en IP para entorno de desarrollo
        getLocationFromIP: async function() {
            try {
                console.log("Usando método alternativo de geolocalización (IP)");
                // Usamos ip-api.com que no requiere API key para uso básico
                const response = await fetch('http://ip-api.com/json/?fields=status,city,regionName');
                
                if (!response.ok) {
                    throw new Error('Error al obtener ubicación por IP');
                }
                
                const data = await response.json();
                
                if (data.status === "success" && data.city) {
                    console.log("Ubicación obtenida por IP:", data.city);
                    return data.city;
                } else {
                    return "desconocida";
                }
            } catch (error) {
                console.error('Error al obtener ubicación por IP:', error);
                return "desconocida";
            }
        },
        
        // Obtener ubicación a partir de coordenadas
        getLocationFromCoords: async function(latitude, longitude) {
            try {
                // Utilizamos el servicio de geocodificación inversa de OpenStreetMap (Nominatim)
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
                
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
                console.error('Error al obtener ubicación:', error);
                return "desconocida";
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