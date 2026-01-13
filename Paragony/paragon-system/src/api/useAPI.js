const API_URL = "https://localhost:7228/api";

const useAPI = (token, onUnauthorized) => {

    const getAuthHeaders = () => {
        const headers = {};
        if (token && token !== "null" && token !== "undefined") {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    };

    const handleResponse = async (response) => {
        if (response.status === 401) {
            console.warn("⚠️ Token wygasł (401).");
            if (onUnauthorized) onUnauthorized();
            throw new Error("Token wygasł (401)");
        }

        const text = await response.text();
        let data;
        try {
            data = text ? JSON.parse(text) : null;
        } catch (err) {
            data = text;
        }

        if (!response.ok) {
            console.error("❌ API Error Response:", data);
            const errorMessage = (data && (data.message || data.title)) || `HTTP error ${response.status}`;
            throw new Error(errorMessage);
        }

        return data;
    };

    // --- 1. FUNKCJA DO JSON (Używana do drukowania, płatności, edycji) ---
    // Wymusza nagłówek Application/JSON
    const requestJSON = async (method, url, data, options = {}) => {
        const fullUrl = `${API_URL}${url}`;
        const headers = {
            ...getAuthHeaders(),
            "Content-Type": "application/json", // Sztywno ustawiony typ
            ...options.headers
        };

        const config = {
            method,
            headers,
            // Jeśli data istnieje, zamień na JSON. Jeśli nie (np. pusty POST), wyślij null.
            body: data !== undefined ? JSON.stringify(data) : null,
            ...options
        };

        try {
            const response = await fetch(fullUrl, config);
            return await handleResponse(response);
        } catch (error) {
            console.error(`❌ Network Error [${url}]:`, error);
            throw error;
        }
    };

    // --- 2. FUNKCJA DO PLIKÓW (Używana TYLKO do uploadu zdjęć) ---
    // NIE wysyła Content-Type (przeglądarka zrobi to sama dla FormData)
    const requestFile = async (method, url, formData, options = {}) => {
        const fullUrl = `${API_URL}${url}`;
        const headers = {
            ...getAuthHeaders(),
            ...options.headers
            // WAŻNE: Brak Content-Type
        };

        const config = {
            method,
            headers,
            body: formData,
            ...options
        };

        try {
            const response = await fetch(fullUrl, config);
            return await handleResponse(response);
        } catch (error) {
            console.error(`❌ Upload Error [${url}]:`, error);
            throw error;
        }
    };

    return {
        // Metody standardowe (Zawsze JSON)
        get: (url, options) => requestJSON("GET", url, undefined, options),
        post: (url, data, options) => requestJSON("POST", url, data, options),
        put: (url, data, options) => requestJSON("PUT", url, data, options),
        delete: (url, options) => requestJSON("DELETE", url, undefined, options),

        // Metoda specjalna do plików (Zawsze FormData)
        upload: (url, formData, options) => requestFile("POST", url, formData, options),
    };
};

export default useAPI;