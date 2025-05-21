// api-client.js - Cliente para comunicarse con el backend de Rejas Espaciales

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
        save: async function(playerName, score) {
            try {
                const data = {
                    nombre: playerName,
                    puntaje: score
                };
                
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
        }
    }
};

// Exponer el cliente API globalmente
window.apiClient = apiClient;

// Registrar el entorno detectado en la consola
console.log(`API Client inicializado en entorno: ${apiClient.config.isLocalEnvironment() ? 'Local' : 'Producción'}`);
console.log(`URL del backend: ${apiClient.config.getBaseUrl()}`); 