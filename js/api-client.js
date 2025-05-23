// api-client.js - Cliente para comunicarse con el backend de Rejas Espaciales

// Configuración para geolocalización
window.MOCK_GEOLOCATION_ON_LOCALHOST = false; // Permitir geolocalización real en localhost

// Sistema de respaldo local para cuando falle el backend
const localRanking = {
    // Guardar puntuación en localStorage
    saveLocal: function(playerName, score, deviceType, location) {
        try {
            // Generar fecha y hora actual en formato YYYYMMDD-HHMMSS
            const ahora = new Date();
            const fecha = ahora.getFullYear() +
                String(ahora.getMonth() + 1).padStart(2, '0') +
                String(ahora.getDate()).padStart(2, '0');
            const hora = String(ahora.getHours()).padStart(2, '0') +
                String(ahora.getMinutes()).padStart(2, '0') +
                String(ahora.getSeconds()).padStart(2, '0');
            const fechaHora = `${fecha}-${hora}`;
            
            const newEntry = {
                nombre: playerName,
                puntaje: score,
                version: window.GAME_VERSION,
                dispositivo: deviceType || "unknown",
                ubicacion: location || "desconocida",
                fechaHora: fechaHora,
                local: true // Marcar como entrada local
            };
            
            // Obtener ranking existente
            let localRankingData = this.getLocal();
            
            // Añadir nueva entrada
            localRankingData.push(newEntry);
            
            // Ordenar por puntaje (descendente)
            localRankingData.sort((a, b) => b.puntaje - a.puntaje);
            
            // Limitar a los top 50 para no saturar localStorage
            localRankingData = localRankingData.slice(0, 50);
            
            // Guardar en localStorage
            localStorage.setItem('rejasEspacialesLocalRanking', JSON.stringify(localRankingData));
            
            console.log("Puntuación guardada localmente:", newEntry);
            return { success: true, message: "Guardado localmente", local: true };
            
        } catch (error) {
            console.error("Error al guardar localmente:", error);
            return { success: false, message: "Error al guardar localmente" };
        }
    },
    
    // Obtener ranking local
    getLocal: function() {
        try {
            const data = localStorage.getItem('rejasEspacialesLocalRanking');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error("Error al obtener ranking local:", error);
            return [];
        }
    },
    
    // Limpiar ranking local
    clearLocal: function() {
        try {
            localStorage.removeItem('rejasEspacialesLocalRanking');
            console.log("Ranking local limpiado");
        } catch (error) {
            console.error("Error al limpiar ranking local:", error);
        }
    }
};

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
        // Verificar estado del servidor y obtener información
        healthCheck: async function() {
            try {
                console.log("🔍 Verificando estado del backend...");
                const startTime = performance.now();
                
                // Intentar varias rutas para verificar si el servidor responde
                const testRoutes = [
                    '/health',      // Ruta de health check típica
                    '/status',      // Ruta de status
                    '/info',        // Ruta de información
                    '/ranking',     // Ruta principal
                    '/'             // Ruta raíz
                ];
                
                let serverInfo = {
                    isAlive: false,
                    responseTime: 0,
                    revision: 'desconocida',
                    version: 'desconocida',
                    error: null,
                    workingEndpoint: null
                };
                
                // Probar cada ruta hasta encontrar una que responda
                for (const route of testRoutes) {
                    try {
                        console.log(`   📡 Probando: ${apiClient.config.getBaseUrl()}${route}`);
                        
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);
                        
                        const response = await fetch(`${apiClient.config.getBaseUrl()}${route}`, {
                            method: 'GET',
                            signal: controller.signal,
                            headers: {
                                'Accept': 'application/json',
                                'User-Agent': 'RejasEspacialesGame/HealthCheck'
                            }
                        });
                        
                        clearTimeout(timeoutId);
                        const endTime = performance.now();
                        serverInfo.responseTime = Math.round(endTime - startTime);
                        serverInfo.isAlive = true;
                        serverInfo.workingEndpoint = route;
                        
                        console.log(`   ✅ Respuesta de ${route}: ${response.status} ${response.statusText}`);
                        console.log(`   ⏱️ Tiempo de respuesta: ${serverInfo.responseTime}ms`);
                        
                        // Intentar leer headers para información del servidor
                        const serverHeader = response.headers.get('server') || response.headers.get('x-powered-by');
                        if (serverHeader) {
                            console.log(`   🖥️ Servidor: ${serverHeader}`);
                        }
                        
                        // Intentar leer información del cuerpo de la respuesta
                        try {
                            const contentType = response.headers.get('content-type');
                            let responseData = null;
                            
                            if (contentType && contentType.includes('application/json')) {
                                responseData = await response.json();
                            } else {
                                const textData = await response.text();
                                if (textData.length < 500) { // Solo mostrar textos cortos
                                    responseData = textData;
                                }
                            }
                            
                            if (responseData) {
                                console.log(`   📄 Datos del servidor:`, responseData);
                                
                                // Buscar información de revisión/versión en la respuesta
                                if (typeof responseData === 'object') {
                                    serverInfo.revision = responseData.revision || responseData.build || responseData.commit || 'no encontrada';
                                    serverInfo.version = responseData.version || responseData.v || 'no encontrada';
                                } else if (typeof responseData === 'string') {
                                    // Buscar patrones de versión en texto
                                    const versionMatch = responseData.match(/version[:\s]+([^\s,}]+)/i);
                                    const revisionMatch = responseData.match(/revision[:\s]+([^\s,}]+)/i);
                                    if (versionMatch) serverInfo.version = versionMatch[1];
                                    if (revisionMatch) serverInfo.revision = revisionMatch[1];
                                }
                            }
                        } catch (parseError) {
                            console.log(`   ⚠️ No se pudo parsear la respuesta de ${route}`);
                        }
                        
                        break; // Salir del loop si encontramos una ruta que funcione
                        
                    } catch (routeError) {
                        console.log(`   ❌ Error en ${route}:`, routeError.message);
                        if (routeError.name === 'AbortError') {
                            console.log(`   ⏱️ Timeout en ${route}`);
                        }
                        serverInfo.error = routeError.message;
                    }
                }
                
                // Resumen final
                console.log("📊 RESUMEN DEL HEALTH CHECK:");
                console.log(`   Estado: ${serverInfo.isAlive ? '✅ VIVO' : '❌ NO RESPONDE'}`);
                if (serverInfo.isAlive) {
                    console.log(`   Endpoint funcional: ${serverInfo.workingEndpoint}`);
                    console.log(`   Tiempo de respuesta: ${serverInfo.responseTime}ms`);
                    console.log(`   Revisión del backend: ${serverInfo.revision}`);
                    console.log(`   Versión del backend: ${serverInfo.version}`);
                } else {
                    console.log(`   Último error: ${serverInfo.error}`);
                }
                
                return serverInfo;
                
            } catch (error) {
                console.error("❌ Error crítico en health check:", error);
                return {
                    isAlive: false,
                    responseTime: 0,
                    revision: 'error',
                    version: 'error',
                    error: error.message,
                    workingEndpoint: null
                };
            }
        },

        // Obtener todos los puntajes ordenados (con fallback local)
        getAll: async function() {
            try {
                console.log("Intentando obtener ranking desde el servidor...");
                const response = await fetch(`${apiClient.config.getBaseUrl()}/ranking`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: Error al obtener ranking del servidor`);
                }
                
                const serverData = await response.json();
                console.log("Ranking obtenido del servidor exitosamente");
                return serverData;
                
            } catch (error) {
                console.warn('Error al cargar ranking del servidor:', error);
                console.log("Usando ranking local como respaldo...");
                
                // Respaldo: usar datos locales
                const localData = localRanking.getLocal();
                
                // Añadir información sobre el estado del respaldo
                if (localData.length > 0) {
                    console.log(`Ranking local cargado: ${localData.length} entradas`);
                } else {
                    console.log("No hay datos locales disponibles");
                }
                
                return localData;
            }
        },
        
        // Guardar un nuevo puntaje (con fallback local)
        save: async function(playerName, score, deviceType, location) {
            let serverError = null;
            
            // Intentar guardar en el servidor
            try {
                console.log("Intentando guardar en el servidor...");
                
                // Generar fecha y hora actual en formato YYYYMMDD-HHMMSS
                const ahora = new Date();
                const fecha = ahora.getFullYear() +
                    String(ahora.getMonth() + 1).padStart(2, '0') +
                    String(ahora.getDate()).padStart(2, '0');
                const hora = String(ahora.getHours()).padStart(2, '0') +
                    String(ahora.getMinutes()).padStart(2, '0') +
                    String(ahora.getSeconds()).padStart(2, '0');
                const fechaHora = `${fecha}-${hora}`;
                
                const data = {
                    nombre: playerName,
                    puntaje: score,
                    version: window.GAME_VERSION,
                    dispositivo: deviceType || "unknown",
                    ubicacion: location || "desconocida",
                    fechaHora: fechaHora
                };
                
                console.log("Enviando datos al servidor:", data);
                
                // Crear controlador de abort para timeout manual
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort();
                    console.log("Request abortado por timeout");
                }, 7000); // 7 segundos timeout
                
                const response = await fetch(`${apiClient.config.getBaseUrl()}/ranking`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                // Registrar respuesta para debug
                console.log(`Response status: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    // Intentar obtener el texto del error del servidor
                    let errorText = 'Error del servidor';
                    try {
                        const errorData = await response.text();
                        errorText = errorData || `HTTP ${response.status}`;
                        console.log("Error response body:", errorData);
                    } catch (parseError) {
                        console.log("No se pudo leer el cuerpo de la respuesta de error");
                    }
                    throw new Error(`Error del servidor (${response.status}): ${errorText}`);
                }
                
                const result = await response.json();
                console.log("✅ Puntuación guardada en el servidor exitosamente:", result);
                return { ...result, serverSave: true };
                
            } catch (error) {
                serverError = error;
                
                // Mejorar el logging de errores
                if (error.name === 'AbortError') {
                    console.error('❌ Error del servidor: Timeout al conectar');
                } else if (error.message.includes('Failed to fetch')) {
                    console.error('❌ Error del servidor: Sin conexión de red');
                } else {
                    console.error('❌ Error del servidor:', error.message);
                }
                
                // NUEVO: Ejecutar health check para obtener más información del error
                console.log("🔍 Ejecutando health check para diagnosticar el error...");
                try {
                    const healthInfo = await apiClient.ranking.healthCheck();
                    window.serverHealthInfo = healthInfo;
                    
                    if (healthInfo.isAlive) {
                        console.log("📡 El servidor responde pero hay un error en el endpoint de guardado");
                        console.log(`   Revisión del backend: ${healthInfo.revision}`);
                        console.log(`   Versión del backend: ${healthInfo.version}`);
                    } else {
                        console.log("💀 El servidor no responde en absoluto");
                    }
                } catch (healthError) {
                    console.log("❌ Health check también falló:", healthError.message);
                }
            }
            
            // Si falló el servidor, usar respaldo local
            console.log("🔄 Servidor no disponible, guardando localmente...");
            const localResult = localRanking.saveLocal(playerName, score, deviceType, location);
            
            if (localResult.success) {
                console.log("✅ Puntuación guardada localmente como respaldo");
                return {
                    ...localResult,
                    serverError: serverError?.message || 'Error desconocido del servidor',
                    fallbackUsed: true
                };
            } else {
                // Si tanto el servidor como local fallan
                throw new Error(`Error del servidor: ${serverError?.message || 'Error desconocido'}. También falló el respaldo local.`);
            }
        },
        
        // Obtener ubicación basada en IP para entorno de desarrollo
        getLocationFromIP: async function() {
            // Si es localhost con simulación activada
            if (window.MOCK_GEOLOCATION_ON_LOCALHOST && apiClient.config.isLocalEnvironment()) {
                console.log("Modo local: Devolviendo ubicación simulada para IP");
                // Simular una pequeña demora para que sea realista
                await new Promise(resolve => setTimeout(resolve, 200));
                return "Ciudad Local";
            }
            
            try {
                console.log("Usando método alternativo de geolocalización (IP)");
                
                // Hacer petición HTTP con un timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const response = await fetch('https://ipinfo.io/json', {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
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
                console.error('Error al obtener ubicación por IP:', error);
                // En caso de error, devolvemos "desconocida" para no bloquear el flujo
                return "desconocida";
            }
        },
        
        // Obtener ubicación a partir de coordenadas
        getLocationFromCoords: async function(latitude, longitude) {
            // Si es localhost con simulación activada
            if (window.MOCK_GEOLOCATION_ON_LOCALHOST && apiClient.config.isLocalEnvironment()) {
                console.log("Modo local: Devolviendo ubicación simulada para coordenadas");
                // Simular una pequeña demora para que sea realista
                await new Promise(resolve => setTimeout(resolve, 300));
                return "Ciudad Local";
            }
            
            try {
                // Timeout para evitar bloqueos
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
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
                console.error('Error al obtener ubicación:', error);
                // En caso de error, devolvemos "desconocida" para no bloquear el flujo
                return "desconocida";
            }
        }
    }
};

// Exponer el cliente API y el sistema local globalmente
window.apiClient = apiClient;
window.localRanking = localRanking;

// Registrar el entorno detectado en la consola
console.log(`API Client inicializado en entorno: ${apiClient.config.isLocalEnvironment() ? 'Local' : 'Producción'}`);
console.log(`Versión del juego: ${window.GAME_VERSION}`);
console.log(`URL del backend: ${apiClient.config.getBaseUrl()}`);
console.log(`Geolocalización en localhost: ${window.MOCK_GEOLOCATION_ON_LOCALHOST ? 'SIMULADA' : 'REAL'}`);

// Mostrar estado del ranking local
const localEntries = localRanking.getLocal();
if (localEntries.length > 0) {
    console.log(`📊 Ranking local disponible: ${localEntries.length} entradas`);
} else {
    console.log("📊 No hay ranking local guardado");
}

// Ejecutar health check automático en entorno de producción
if (!apiClient.config.isLocalEnvironment()) {
    console.log("🚀 Ejecutando health check automático del backend...");
    
    // Ejecutar con un pequeño delay para no interferir con la carga inicial
    setTimeout(async () => {
        try {
            const healthInfo = await apiClient.ranking.healthCheck();
            
            // Guardar información del servidor para uso posterior
            window.serverHealthInfo = healthInfo;
            
            if (healthInfo.isAlive) {
                console.log("✅ Backend operacional - Comunicación establecida");
            } else {
                console.log("⚠️ Backend no responde - Se usará modo local");
            }
            
        } catch (error) {
            console.error("❌ Health check falló:", error);
        }
    }, 1000);
}

// Función auxiliar para ejecutar health check manual
window.checkBackendHealth = async function() {
    console.log("🔍 Health check manual solicitado...");
    return await apiClient.ranking.healthCheck();
};

// Función auxiliar para mostrar info del servidor
window.showServerInfo = function() {
    if (window.serverHealthInfo) {
        console.log("📋 INFORMACIÓN DEL SERVIDOR ACTUAL:");
        console.table(window.serverHealthInfo);
    } else {
        console.log("❌ No hay información del servidor disponible. Ejecuta checkBackendHealth() primero.");
    }
};