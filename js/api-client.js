// api-client.js - Cliente para comunicarse con el backend de Rejas Espaciales

// Configuración para geolocalización
window.MOCK_GEOLOCATION_ON_LOCALHOST = false; // Permitir geolocalización real en localhost

// === SISTEMA DE GEOLOCALIZACIÓN SIMPLIFICADO ===
const geoLocationSystem = {
    // Obtener ubicación con sistema simplificado de timeouts
    getLocationSimplified: async function() {
        console.log('🌍 Iniciando sistema de geolocalización simplificado');
        
        // PASO 1: Intentar GPS/navegador (15 segundos máximo)
        try {
            const gpsLocation = await this.tryGPSLocation(15000);
            if (gpsLocation) {
                console.log('✅ Ubicación obtenida por GPS:', gpsLocation);
                return gpsLocation;
            }
        } catch (error) {
            console.log('⚠️ GPS falló:', error.message);
        }
        
        // PASO 2: Intentar ubicación por IP (15 segundos máximo)
        try {
            const ipLocation = await this.tryIPLocation(15000);
            if (ipLocation) {
                console.log('✅ Ubicación obtenida por IP:', ipLocation);
                return ipLocation;
            }
        } catch (error) {
            console.log('⚠️ IP falló:', error.message);
        }
        
        // PASO 3: Sin ubicación
        console.log('📍 No se pudo obtener ubicación, continuando sin ella');
        return "desconocida";
    },
    
    // Intentar geolocalización GPS con timeout
    tryGPSLocation: function(timeoutMs) {
        return new Promise((resolve, reject) => {
            // Verificar si la geolocalización está disponible
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no disponible en el navegador'));
                return;
            }
            
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout GPS después de ${timeoutMs}ms`));
            }, timeoutMs);
            
            const options = {
                timeout: timeoutMs - 1000, // 1 segundo menos para dar margen
                enableHighAccuracy: true,
                maximumAge: 60000 // Usar ubicación cachada si tiene menos de 1 minuto
            };
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    clearTimeout(timeout);
                    try {
                        // Convertir coordenadas a nombre de ubicación
                        const locationName = await apiClient.ranking.getLocationFromCoords(
                            position.coords.latitude, 
                            position.coords.longitude
                        );
                        resolve(locationName);
                    } catch (geoError) {
                        console.warn('Error en geocodificación inversa:', geoError);
                        resolve("desconocida");
                    }
                },
                (error) => {
                    clearTimeout(timeout);
                    reject(new Error(`Error GPS: ${error.message}`));
                },
                options
            );
        });
    },
    
    // Intentar geolocalización por IP con timeout
    tryIPLocation: function(timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout IP después de ${timeoutMs}ms`));
            }, timeoutMs);
            
            apiClient.ranking.getLocationFromIP()
                .then(location => {
                    clearTimeout(timeout);
                    resolve(location);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(new Error(`Error IP: ${error.message}`));
                });
        });
    }
};

// Sistema de respaldo local para cuando falle el backend
const localRanking = {
    // Guardar puntuación en localStorage
    saveLocal: function(playerName, score, deviceType, location, nivel) {
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
                nivel: nivel || "1",  // Campo nivel con fallback a "1"
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
            // CONFIGURACIÓN ACTUAL: Frontend localhost → Backend Render (NECESITA WAKE-UP)
            // local: 'http://localhost:3000',  // Descomenta SOLO si tienes backend local
            local: 'https://rejas-espaciales-backend-v2.onrender.com',  // Live Server → Backend Render
            production: 'https://rejas-espaciales-backend-v2.onrender.com'
        },
        // Determinar el entorno actual
        isLocalEnvironment: function() {
            return window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
        },
        // Verificar si el BACKEND es realmente local
        isBackendLocal: function() {
            const backendUrl = this.getBaseUrl();
            return backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1');
        },
        // Obtener la URL base según el entorno
        getBaseUrl: function() {
            return this.isLocalEnvironment() ? this.urls.local : this.urls.production;
        }
    },
    
    // Métodos para interactuar con la API
    ranking: {
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
        
        // Guardar nueva puntuación con geolocalización opcional y fallback local
        save: async function(playerName, score, deviceType, ubicacion, nivel) {
            // Limpiar y validar parámetros
            playerName = String(playerName || "").trim();
            score = parseInt(score) || 0;
            deviceType = String(deviceType || "desktop").trim();
            ubicacion = String(ubicacion || "desconocida").trim();
            nivel = String(nivel || "1").trim();
            
            if (!playerName) {
                return { success: false, message: "Nombre del jugador es requerido" };
            }
            
            if (score <= 0) {
                return { success: false, message: "Puntaje debe ser mayor a 0" };
            }
            
            console.log(`Guardando puntuación: ${playerName} - ${score} puntos - Nivel ${nivel} - ${deviceType} - ${ubicacion}`);
            
            // Preparar datos a enviar
            const data = {
                nombre: playerName,
                puntaje: score,
                version: window.GAME_VERSION || "desconocida",
                dispositivo: deviceType,
                ubicacion: ubicacion,
                nivel: nivel  // Campo nivel
            };
            
            try {
                console.log("Intentando guardar en el servidor...");
                console.log("URL:", `${apiClient.config.getBaseUrl()}/ranking`);
                console.log("Datos a enviar:", data);
                
                // Configurar timeout para evitar bloqueos
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log("⏰ Timeout alcanzado, abortando petición al servidor");
                    controller.abort();
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
                console.error("❌ Error al guardar en el servidor:", error);
                
                if (error.name === 'AbortError') {
                    console.log("🚫 Petición al servidor abortada por timeout");
                } else {
                    console.log("📝 Detalles del error:", error.message);
                }
                
                // Respaldo: guardar localmente
                console.log("💾 Usando respaldo local...");
                const localResult = localRanking.saveLocal(playerName, score, deviceType, ubicacion, nivel);
                
                return {
                    ...localResult,
                    fallbackUsed: true,
                    originalError: error.message
                };
            }
        },
        
        // Obtener ubicación basada en IP
        getLocationFromIP: async function() {
            try {
                console.log("🌍 Obteniendo ubicación por IP...");
                
                // Hacer petición HTTP con un timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
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
                    console.log("✅ Ubicación obtenida por IP:", data.city);
                    return data.city;
                } else {
                    return "desconocida";
                }
            } catch (error) {
                console.error('❌ Error al obtener ubicación por IP:', error);
                return "desconocida";
            }
        },
        
        // Obtener ubicación a partir de coordenadas
        getLocationFromCoords: async function(latitude, longitude) {
            try {
                console.log(`🗺️ Obteniendo ubicación por coordenadas: ${latitude}, ${longitude}`);
                
                // Timeout para evitar bloqueos
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                // Utilizamos el servicio de geocodificación inversa de OpenStreetMap (Nominatim)
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
                    {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'RejasEspacialesGame/2.1.0'
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
                
                console.log("✅ Ubicación obtenida por coordenadas:", location);
                return location;
                
            } catch (error) {
                console.error('❌ Error al obtener ubicación por coordenadas:', error);
                return "desconocida";
            }
        }
    }
};

// Función auxiliar para detectar geolocalización con timeout
function getCurrentPositionWithTimeout(options = {}) {
    const timeout = options.timeout || 10000; // Default 10 segundos
    
    return new Promise((resolve, reject) => {
        // Verificar soporte de geolocalización
        if (!navigator.geolocation) {
            reject(new Error('Geolocalización no soportada'));
            return;
        }
        
        // Configurar timeout
        const timeoutId = setTimeout(() => {
            reject(new Error('Timeout de geolocalización'));
        }, timeout);
        
        // Intentar obtener posición
        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timeoutId);
                resolve(position);
            },
            (error) => {
                clearTimeout(timeoutId);
                reject(error);
            },
            {
                enableHighAccuracy: false,
                timeout: timeout - 1000, // Dejar margen de 1 segundo
                maximumAge: 60000 // Cache por 1 minuto
            }
        );
    });
}

// Añadir función de health check
apiClient.ranking.healthCheck = async function() {
    try {
        console.log("🔍 Verificando estado del backend...");
        const startTime = performance.now();
        
        // Intentar varias rutas para verificar si el servidor responde
        const testRoutes = ['/health', '/status', '/info', '/ranking', '/'];
        
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
                
                break; // Salir del loop si encontramos una ruta que funcione
                
            } catch (routeError) {
                console.log(`   ❌ Error en ${route}:`, routeError.message);
                serverInfo.error = routeError.message;
            }
        }
        
        console.log("📊 RESUMEN DEL HEALTH CHECK:");
        console.log(`   Estado: ${serverInfo.isAlive ? '✅ VIVO' : '❌ NO RESPONDE'}`);
        if (serverInfo.isAlive) {
            console.log(`   Endpoint funcional: ${serverInfo.workingEndpoint}`);
            console.log(`   Tiempo de respuesta: ${serverInfo.responseTime}ms`);
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
};

// Función para wake-up del backend en inicio de nivel
apiClient.wakeUpForLevel = async function(level) {
    if (apiClient.config.isBackendLocal()) {
        console.log("🏠 Backend local detectado - No se necesita wake-up");
        console.log(`   Backend URL: ${apiClient.config.getBaseUrl()}`);
        return true;
    }
    
    console.log(`🌐 Backend remoto detectado - Wake-up necesario`);
    console.log(`   Backend URL: ${apiClient.config.getBaseUrl()}`);
    
    console.log(`🚀 WAKE-UP CRÍTICO: Despertar backend para nivel ${level}...`);
    
    try {
        const startTime = performance.now();
        const response = await fetch(`${apiClient.config.getBaseUrl()}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(15000), // 15 segundos timeout
            headers: {
                'Accept': 'application/json',
                'User-Agent': `RejasEspacialesGame/Level${level}Start`
            }
        });
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (response.ok) {
            console.log(`✅ Backend despertado exitosamente para nivel ${level} en ${responseTime}ms`);
            
            // Actualizar indicador si existe
            const statusDiv = document.getElementById('backend-status');
            if (statusDiv) {
                statusDiv.style.display = 'block';
                statusDiv.innerHTML = `
                    <div style="color: rgba(100, 255, 100, 0.9);">
                        ✅ Backend listo (nivel ${level})
                    </div>
                    <div style="font-size: 10px; margin-top: 2px;">
                        Respuesta: ${responseTime}ms
                    </div>
                `;
                
                // Ocultar después de 3 segundos
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 3000);
            }
            
            return true;
        } else {
            console.warn(`⚠️ Backend respondió con status ${response.status} para nivel ${level}`);
            return false;
        }
    } catch (error) {
        console.log(`⚠️ Error al despertar backend para nivel ${level}: ${error.message}`);
        return false;
    }
};

// === FUNCIÓN DE DIAGNÓSTICO COMPLETO ===
window.debugRankingSystem = function() {
    console.log('🔧 [DIAGNÓSTICO] Iniciando diagnóstico completo del sistema de ranking...');
    
    // 1. Verificar disponibilidad de componentes
    console.log('📋 [COMPONENTES] Verificando disponibilidad...');
    console.log(`   - window.apiClient: ${window.apiClient ? '✅ Disponible' : '❌ NO disponible'}`);
    console.log(`   - window.geoLocationSystem: ${window.geoLocationSystem ? '✅ Disponible' : '❌ NO disponible'}`);
    console.log(`   - apiClient.ranking: ${window.apiClient?.ranking ? '✅ Disponible' : '❌ NO disponible'}`);
    console.log(`   - wakeUpForLevel: ${typeof window.apiClient?.wakeUpForLevel}`);
    
    // 2. Verificar estado del backend
    console.log('🌐 [BACKEND] Verificando estado...');
    console.log(`   - Frontend en: ${window.location.hostname}`);
    console.log(`   - Backend URL: ${window.apiClient?.config.getBaseUrl()}`);
    console.log(`   - Frontend local: ${window.apiClient?.config.isLocalEnvironment()}`);
    console.log(`   - Backend local: ${window.apiClient?.config.isBackendLocal()}`);
    console.log(`   - Wake-up necesario: ${!window.apiClient?.config.isBackendLocal()}`);
    
    // 3. Probar wake-up manualmente
    if (window.apiClient?.wakeUpForLevel) {
        console.log('🚀 [WAKE-UP] Ejecutando prueba de wake-up...');
        window.apiClient.wakeUpForLevel(1)
            .then(success => {
                console.log(`🚀 [WAKE-UP] Resultado: ${success ? '✅ Exitoso' : '❌ Falló'}`);
            })
            .catch(error => {
                console.log(`🚀 [WAKE-UP] Error: ${error.message}`);
            });
    }
    
    // 4. Probar sistema de geolocalización
    if (window.geoLocationSystem?.getLocationSimplified) {
        console.log('🌍 [GEOLOC] Ejecutando prueba de geolocalización...');
        window.geoLocationSystem.getLocationSimplified()
            .then(location => {
                console.log(`🌍 [GEOLOC] Resultado: "${location}"`);
            })
            .catch(error => {
                console.log(`🌍 [GEOLOC] Error: ${error.message}`);
            });
    }
    
    // 5. Verificar localStorage
    console.log('💾 [STORAGE] Verificando localStorage...');
    try {
        const testKey = 'rejas-test-' + Date.now();
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        console.log('💾 [STORAGE] LocalStorage: ✅ Funcionando');
    } catch (error) {
        console.log('💾 [STORAGE] LocalStorage: ❌ Error:', error.message);
    }
    
    // 6. Verificar ranking local
    const localData = window.localRanking?.getLocal();
    console.log(`💾 [RANKING] Ranking local: ${localData ? `${localData.length} entradas` : 'No disponible'}`);
    
    console.log('🔧 [DIAGNÓSTICO] Diagnóstico completado. Revisa los resultados arriba.');
};

// Hacer el cliente disponible globalmente
window.apiClient = apiClient;
window.localRanking = localRanking;
window.geoLocationSystem = geoLocationSystem;

console.log("✅ API Client inicializado");
console.log(`🌐 Backend URL: ${apiClient.config.getBaseUrl()}`);

// Mostrar estado del ranking local
const localEntries = localRanking.getLocal();
if (localEntries.length > 0) {
    console.log(`📊 Ranking local disponible: ${localEntries.length} entradas`);
} else {
    console.log("📊 No hay ranking local guardado");
}

// Mensaje de ayuda para diagnóstico
console.log("🔧 [AYUDA] Para diagnosticar problemas del ranking, ejecuta: debugRankingSystem()");

// Ejecutar health check automático solo si el backend es remoto
if (!apiClient.config.isBackendLocal()) {
    console.log("🚀 Iniciando sistema de wake-up del backend...");
    console.log(`🌐 Frontend: ${window.location.hostname} | Backend: ${apiClient.config.getBaseUrl()}`);
    
    // Sistema mejorado de wake-up para Render
    const wakeUpBackend = async () => {
        let wakeUpAttempts = 0;
        const maxAttempts = 3;
        
        // Función para actualizar el indicador visual
        const updateBackendStatus = (text, detail = '', isSuccess = false, isError = false) => {
            // Crear indicador si no existe
            let statusDiv = document.getElementById('backend-status');
            if (!statusDiv) {
                statusDiv = document.createElement('div');
                statusDiv.id = 'backend-status';
                statusDiv.style.cssText = `
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background-color: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 5px;
                    font-size: 12px;
                    z-index: 9999;
                    max-width: 200px;
                    display: none;
                `;
                document.body.appendChild(statusDiv);
            }
            
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = `
                <div style="font-weight: bold;">${text}</div>
                ${detail ? `<div style="margin-top: 2px; opacity: 0.8;">${detail}</div>` : ''}
            `;
            
            if (isSuccess) {
                statusDiv.style.borderLeft = '3px solid #00ff00';
            } else if (isError) {
                statusDiv.style.borderLeft = '3px solid #ff0000';
            } else {
                statusDiv.style.borderLeft = '3px solid #ffff00';
            }
        };
        
        const attemptWakeUp = async () => {
            wakeUpAttempts++;
            console.log(`🔄 Intento ${wakeUpAttempts}/${maxAttempts} de wake-up del backend...`);
            updateBackendStatus(`🔄 Despertando backend...`, `Intento ${wakeUpAttempts}/${maxAttempts}`);
            
            try {
                const startTime = performance.now();
                const response = await fetch(`${apiClient.config.getBaseUrl()}/health`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(30000), // 30 segundos timeout para cold start
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'RejasEspacialesGame/WakeUp'
                    }
                });
                
                const endTime = performance.now();
                const responseTime = Math.round(endTime - startTime);
                
                if (response.ok) {
                    console.log(`✅ Backend despierto en ${responseTime}ms`);
                    if (responseTime > 10000) {
                        console.log("⏰ Cold start detectado - Backend estaba dormido");
                        updateBackendStatus('✅ Backend despierto', `Era un cold start (${responseTime}ms)`, true);
                    } else {
                        updateBackendStatus('✅ Backend listo', `Respuesta rápida (${responseTime}ms)`, true);
                    }
                    
                    // Health check completo ahora que sabemos que está despierto
                    try {
                        const healthInfo = await apiClient.ranking.healthCheck();
                        window.serverHealthInfo = healthInfo;
                        
                        if (healthInfo.isAlive) {
                            console.log("✅ Backend completamente operacional");
                            console.log(`   📋 Revisión: ${healthInfo.revision}`);
                            console.log(`   🔢 Versión: ${healthInfo.version}`);
                            updateBackendStatus('✅ Backend operacional', `v${healthInfo.version} - ${healthInfo.revision}`, true);
                        }
                    } catch (healthError) {
                        console.log("⚠️ Health check detallado falló, pero el backend responde");
                        updateBackendStatus('✅ Backend básico OK', 'Health check limitado', true);
                    }
                    
                    return true; // Wake-up exitoso
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
                
            } catch (error) {
                if (error.name === 'TimeoutError') {
                    console.log(`⏱️ Timeout en intento ${wakeUpAttempts} (normal en cold start)`);
                    updateBackendStatus('⏱️ Timeout de conexión', 'Normal en cold start, reintentando...');
                } else {
                    console.log(`❌ Error en intento ${wakeUpAttempts}: ${error.message}`);
                    updateBackendStatus('❌ Error de conexión', error.message);
                }
                
                // Si no es el último intento, esperar y reintentar
                if (wakeUpAttempts < maxAttempts) {
                    console.log(`⏳ Esperando 5 segundos antes del siguiente intento...`);
                    updateBackendStatus('⏳ Esperando...', `Próximo intento en 5 segundos`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    return await attemptWakeUp();
                } else {
                    console.log("❌ Wake-up falló después de todos los intentos");
                    console.log("🔄 Se usará modo local como respaldo");
                    updateBackendStatus('❌ Backend no disponible', 'Usando modo local como respaldo', false, true);
                    return false;
                }
            }
        };
        
        return await attemptWakeUp();
    };
    
    // Ejecutar wake-up con un pequeño delay para no interferir con la carga inicial
    setTimeout(async () => {
        const wakeUpSuccess = await wakeUpBackend();
        
        if (wakeUpSuccess) {
            // Hacer un segundo ping después de 30 segundos para mantenerlo activo
            setTimeout(async () => {
                try {
                    console.log("🔄 Ping de mantenimiento...");
                    await fetch(`${apiClient.config.getBaseUrl()}/health`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(5000),
                        headers: { 'User-Agent': 'RejasEspacialesGame/KeepAlive' }
                    });
                    console.log("✅ Backend mantenido activo");
                } catch (error) {
                    console.log("⚠️ Ping de mantenimiento falló:", error.message);
                }
            }, 30000); // 30 segundos después
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