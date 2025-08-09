// API Configuration
const API_CONFIG = {
    weather: {
        base: 'https://api.openweathermap.org/data/2.5/weather',
        key: 'YOUR_OPENWEATHER_API_KEY' // Replace if you have one
    },
    news: {
        base: 'https://newsapi.org/v2/top-headlines',
        key: 'YOUR_NEWS_API_KEY' // Replace if you have one
    },
    quotes: {
        base: 'https://type.fit/api/quotes',
        fallback: 'https://api.quotable.io/random'
    },
    activity: {
        base: 'https://www.boredapi.com/api/activity'
    },
    fallback: {
        weather: 'https://api.open-meteo.com/v1/forecast',
        news: 'https://jsonplaceholder.typicode.com/posts'
    }
};

// Application State
const appState = {
    currentLocation: { lat: 40.7128, lon: -74.0060 }, // Default to NYC
    retryCount: 0,
    maxRetries: 3
};

// DOM Elements
const elements = {
    weatherContent: document.getElementById('weather-content'),
    newsContent: document.getElementById('news-content'),
    quoteContent: document.getElementById('quote-content'),
    activityContent: document.getElementById('activity-content'),
    newsCategory: document.getElementById('news-category'),
    errorModal: document.getElementById('error-modal'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    closeModal: document.querySelector('.close')
};

// Utility Functions
class APIHandler {
   static async fetchWithTimeout(url, options = {}, timeout = 8000) { // Reduced timeout to 8s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            // Handle specific status codes
            if (response.status === 401) {
                throw new Error('Unauthorized - Check API key');
            }
            if (response.status === 404) {
                throw new Error('Resource not found');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Network error. Please check your internet connection.');
        }
        throw error;
    }
}
    static handleError(error, context) {
        console.error(`Error in ${context}:`, error);
        
        let errorMessage = 'An unexpected error occurred';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('timed out')) {
            errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('HTTP 401')) {
            errorMessage = 'Invalid API key. Please check your configuration.';
        } else if (error.message.includes('HTTP 429')) {
            errorMessage = 'Rate limit exceeded. Please try again later.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return errorMessage;
    }

    static showError(message, container) {
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Reload Page
                </button>
            </div>
        `;
    }
}

// Weather API Functions
class WeatherService {
    static async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn('Geolocation failed:', error);
                    resolve(appState.currentLocation); // Use default location
                },
                { timeout: 5000 }
            );
        });
    }

    // static async fetchWeather() {
    //     try {
    //         const location = await this.getCurrentLocation();
    //         appState.currentLocation = location;
            
    //         // Try primary API first
    //         if (API_CONFIG.weather.key !== 'YOUR_OPENWEATHER_API_KEY') {
    //             const url = `${API_CONFIG.weather.base}?lat=${location.lat}&lon=${location.lon}&appid=${API_CONFIG.weather.key}&units=metric`;
    //             const data = await APIHandler.fetchWithTimeout(url);
    //             return this.formatWeatherData(data);
    //         } else {
    //             // Use fallback Open-Meteo API (no key required)
    //             const url = `${API_CONFIG.fallback.weather}?latitude=${location.lat}&longitude=${location.lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`;
    //             const data = await APIHandler.fetchWithTimeout(url);
    //             return this.formatFallbackWeatherData(data);
    //         }
    //     } catch (error) {
    //         throw new Error(APIHandler.handleError(error, 'Weather Service'));
    //     }
    // }

    static async fetchWeather() {
    try {
        // First try primary API
        if (API_CONFIG.weather.key !== 'YOUR_OPENWEATHER_API_KEY') {
            const url = `${API_CONFIG.weather.base}?lat=${location.lat}&lon=${location.lon}&appid=${API_CONFIG.weather.key}&units=metric`;
            const data = await APIHandler.fetchWithTimeout(url);
            return this.formatWeatherData(data);
        }
        
        // Then try fallback
        const fallbackUrl = `${API_CONFIG.fallback.weather}?latitude=${location.lat}&longitude=${location.lon}&current_weather=true`;
        const fallbackData = await APIHandler.fetchWithTimeout(fallbackUrl);
        return this.formatFallbackWeatherData(fallbackData);
    } catch (error) {
        console.warn('Failed to fetch weather, using fallback:', error);
        return this.getFallbackWeather();
    }
}

static getFallbackWeather() {
    return {
        temperature: Math.round(20 + Math.random() * 10), // Random temp between 20-30°C
        description: ["Sunny", "Partly Cloudy", "Cloudy"][Math.floor(Math.random() * 3)],
        humidity: Math.round(40 + Math.random() * 40),
        windSpeed: (Math.random() * 10).toFixed(1),
        pressure: 1010 + Math.round(Math.random() * 10),
        feelsLike: Math.round(20 + Math.random() * 10),
        location: "Your Location",
        icon: "fas fa-cloud-sun"
    };
}

    static formatWeatherData(data) {
        return {
            temperature: Math.round(data.main.temp),
            description: data.weather[0].description,
            humidity: data.main.humidity,
            windSpeed: data.wind.speed,
            pressure: data.main.pressure,
            feelsLike: Math.round(data.main.feels_like),
            location: data.name,
            icon: this.getWeatherIcon(data.weather[0].main)
        };
    }

    static formatFallbackWeatherData(data) {
        const current = data.current_weather;
        return {
            temperature: Math.round(current.temperature),
            description: this.getWeatherDescription(current.weathercode),
            humidity: data.hourly.relative_humidity_2m[0] || 'N/A',
            windSpeed: current.windspeed,
            pressure: 'N/A',
            feelsLike: Math.round(current.temperature - 2), // Rough estimate
            location: 'Current Location',
            icon: this.getWeatherIconFromCode(current.weathercode)
        };
    }

    static getWeatherIcon(main) {
        const icons = {
            'Clear': 'fas fa-sun',
            'Clouds': 'fas fa-cloud',
            'Rain': 'fas fa-cloud-rain',
            'Snow': 'fas fa-snowflake',
            'Thunderstorm': 'fas fa-bolt',
            'Drizzle': 'fas fa-cloud-drizzle',
            'Mist': 'fas fa-smog',
            'Fog': 'fas fa-smog'
        };
        return icons[main] || 'fas fa-cloud';
    }

    static getWeatherIconFromCode(code) {
        if (code <= 3) return 'fas fa-sun';
        if (code <= 48) return 'fas fa-cloud';
        if (code <= 67) return 'fas fa-cloud-rain';
        if (code <= 77) return 'fas fa-snowflake';
        if (code <= 82) return 'fas fa-cloud-rain';
        return 'fas fa-cloud';
    }

    static getWeatherDescription(code) {
        const descriptions = {
            0: 'clear sky',
            1: 'mainly clear',
            2: 'partly cloudy',
            3: 'overcast',
            45: 'fog',
            48: 'depositing rime fog',
            51: 'light drizzle',
            61: 'slight rain',
            71: 'slight snow',
            95: 'thunderstorm'
        };
        return descriptions[code] || 'unknown';
    }

    static renderWeather(data) {
        elements.weatherContent.innerHTML = `
            <div class="weather-card">
                <div class="weather-icon">
                    <i class="${data.icon}"></i>
                </div>
                <div class="temperature">${data.temperature}°C</div>
                <div class="weather-description">${data.description}</div>
                <div class="location"><i class="fas fa-map-marker-alt"></i> ${data.location}</div>
                <div class="weather-details">
                    <div class="weather-detail">
                        <i class="fas fa-eye"></i>
                        <div>Feels like</div>
                        <div>${data.feelsLike}°C</div>
                    </div>
                    <div class="weather-detail">
                        <i class="fas fa-tint"></i>
                        <div>Humidity</div>
                        <div>${data.humidity}%</div>
                    </div>
                    <div class="weather-detail">
                        <i class="fas fa-wind"></i>
                        <div>Wind Speed</div>
                        <div>${data.windSpeed} m/s</div>
                    </div>
                    <div class="weather-detail">
                        <i class="fas fa-thermometer-half"></i>
                        <div>Pressure</div>
                        <div>${data.pressure} hPa</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// News API Functions
class NewsService {
    static async fetchNews(category = 'general') {
        try {
            // Check if we have a valid API key
            if (API_CONFIG.news.key !== 'YOUR_NEWS_API_KEY') {
                const url = `${API_CONFIG.news.base}?category=${category}&country=us&apiKey=${API_CONFIG.news.key}&pageSize=6`;
                const data = await APIHandler.fetchWithTimeout(url);
                return data.articles.slice(0, 6);
            } else {
                // Use JSONPlaceholder as fallback
                const data = await APIHandler.fetchWithTimeout(`${API_CONFIG.fallback.news}?_limit=6`);
                return this.formatFallbackNews(data);
            }
        } catch (error) {
            throw new Error(APIHandler.handleError(error, 'News Service'));
        }
    }

    static formatFallbackNews(posts) {
        return posts.map(post => ({
            title: post.title,
            description: post.body.substring(0, 120) + '...',
            url: `https://jsonplaceholder.typicode.com/posts/${post.id}`,
            source: { name: 'Sample News' },
            publishedAt: new Date().toISOString()
        }));
    }

    static renderNews(articles) {
        elements.newsContent.innerHTML = articles.map(article => `
            <div class="news-card">
                <h3 class="news-title">${this.truncateText(article.title, 80)}</h3>
                <p class="news-description">${this.truncateText(article.description || 'No description available', 150)}</p>
                <div class="news-meta">
                    <span><i class="fas fa-newspaper"></i> ${article.source?.name || 'Unknown Source'}</span>
                    <span><i class="fas fa-clock"></i> ${this.formatDate(article.publishedAt)}</span>
                </div>
                <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-link">
                    <i class="fas fa-external-link-alt"></i> Read More
                </a>
            </div>
        `).join('');
    }

    static truncateText(text, maxLength) {
        if (!text) return 'No content available';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Quote API Functions
class QuoteService {


// static async fetchQuote() {
//     try {
//         const data = await APIHandler.fetchWithTimeout(API_CONFIG.quotes.base);
//         // Pick a random quote
//         const randomIndex = Math.floor(Math.random() * data.length);
//         const quote = data[randomIndex];
//         return {
//             content: quote.text,
//             author: quote.author || 'Unknown'
//         };
//     } catch (error) {
//         throw new Error(APIHandler.handleError(error, 'Quote Service'));
//     }
// }

static async fetchQuote() {
    try {
        // Try the primary API with shorter timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('https://api.quotable.io/random', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return {
            content: data.content,
            author: data.author || 'Unknown'
        };
    } catch (error) {
        console.warn('Failed to fetch quote, using fallback:', error);
        return this.getFallbackQuote();
    }
}

static getFallbackQuote() {
    const fallbackQuotes = [
        { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { content: "Life is what happens when you're busy making other plans.", author: "John Lennon" }
    ];
    return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
}
static renderQuote(quote) {
    elements.quoteContent.innerHTML = `
        <div class="quote-card">
            <p class="quote-text">${quote.content}</p>
            <p class="quote-author">— ${quote.author}</p>
        </div>
    `;
}

}

// Activity API Functions
class ActivityService {

// static async fetchActivity() {
//     try {
//         const proxiedUrl = `https://thingproxy.freeboard.io/fetch/${API_CONFIG.activity.base}`;
//         const data = await APIHandler.fetchWithTimeout(proxiedUrl);
//         return data;
//     } catch (error) {
//         throw new Error(APIHandler.handleError(error, 'Activity Service'));
//     }
// }

static async fetchActivity() {
    try {
        // First try direct API call
        const response = await fetch('https://www.boredapi.com/api/activity', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.warn('Failed to fetch activity, using fallback:', error);
        return this.getFallbackActivity();
    }
}

static getFallbackActivity() {
    const fallbackActivities = [
        {
            activity: "Read a book you've been meaning to read",
            type: "education",
            participants: 1,
            price: 0,
            key: "9999999"
        },
        {
            activity: "Go for a 30-minute walk",
            type: "recreational",
            participants: 1,
            price: 0,
            key: "9999998"
        }
    ];
    return fallbackActivities[Math.floor(Math.random() * fallbackActivities.length)];
}






    static renderActivity(activity) {
        elements.activityContent.innerHTML = `
            <div class="activity-card">
                <h3 class="activity-title">${activity.activity}</h3>
                <span class="activity-type">${activity.type}</span>
                <p class="activity-participants">
                    <i class="fas fa-users"></i> 
                    ${activity.participants} participant${activity.participants > 1 ? 's' : ''}
                </p>
                ${activity.price > 0 ? `<p><i class="fas fa-dollar-sign"></i> Cost: ${this.formatPrice(activity.price)}</p>` : ''}
                ${activity.link ? `<p><a href="${activity.link}" target="_blank" rel="noopener noreferrer" class="news-link">Learn More</a></p>` : ''}
            </div>
        `;
    }

    static formatPrice(price) {
        if (price === 0) return 'Free';
        if (price <= 0.3) return '$';
        if (price <= 0.6) return '$$';
        return '$$$';
    }
}

// Main Application Functions
class Dashboard {
    static async init() {
        this.setupEventListeners();
        await this.loadAllData();
    }

    static setupEventListeners() {
        // Refresh buttons
        document.getElementById('refresh-weather')?.addEventListener('click', () => this.loadWeather());
        document.getElementById('refresh-quote')?.addEventListener('click', () => this.loadQuote());
        document.getElementById('refresh-activity')?.addEventListener('click', () => this.loadActivity());
        
        // News category change
        elements.newsCategory?.addEventListener('change', (e) => {
            this.loadNews(e.target.value);
        });
        
        // Modal event listeners
        elements.closeModal?.addEventListener('click', () => this.hideModal());
        elements.retryBtn?.addEventListener('click', () => {
            this.hideModal();
            this.loadAllData();
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === elements.errorModal) {
                this.hideModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.loadAllData();
            }
        });
    }

    static async loadAllData() {
        const promises = [
            this.loadWeather(),
            this.loadNews(),
            this.loadQuote(),
            this.loadActivity()
        ];
        
        // Load all data concurrently
        await Promise.allSettled(promises);
    }

    static async loadWeather() {
        try {
            elements.weatherContent.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading weather data...</p>
                </div>
            `;
            
            const weatherData = await WeatherService.fetchWeather();
            WeatherService.renderWeather(weatherData);
        } catch (error) {
            APIHandler.showError(error.message, elements.weatherContent);
        }
    }

    static async loadNews(category = 'general') {
        try {
            elements.newsContent.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading latest news...</p>
                </div>
            `;
            
            const newsData = await NewsService.fetchNews(category);
            NewsService.renderNews(newsData);
        } catch (error) {
            APIHandler.showError(error.message, elements.newsContent);
        }
    }

    static async loadQuote() {
        try {
            elements.quoteContent.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading inspiration...</p>
                </div>
            `;
            
            const quoteData = await QuoteService.fetchQuote();
            QuoteService.renderQuote(quoteData);
        } catch (error) {
            APIHandler.showError(error.message, elements.quoteContent);
        }
    }

    static async loadActivity() {
        try {
            elements.activityContent.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Finding activities...</p>
                </div>
            `;
            
            const activityData = await ActivityService.fetchActivity();
            ActivityService.renderActivity(activityData);
        } catch (error) {
            APIHandler.showError(error.message, elements.activityContent);
        }
    }

    static showModal(message) {
        elements.errorMessage.textContent = message;
        elements.errorModal.style.display = 'block';
    }

    static hideModal() {
        elements.errorModal.style.display = 'none';
    }

    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Performance monitoring
class PerformanceMonitor {
    static startTiming(label) {
        performance.mark(`${label}-start`);
    }
    
    static endTiming(label) {
        performance.mark(`${label}-end`);
        performance.measure(label, `${label}-start`, `${label}-end`);
        
        const measure = performance.getEntriesByName(label)[0];
        console.log(`${label}: ${measure.duration.toFixed(2)}ms`);
    }
}

// Service Worker registration for offline functionality
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//         navigator.serviceWorker.register('/sw.js')
//             .then(registration => {
//                 console.log('SW registered: ', registration);
//             })
//             .catch(registrationError => {
//                 console.log('SW registration failed: ', registrationError);
//             });
//     });
// }

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    PerformanceMonitor.startTiming('App Initialization');
    
    Dashboard.init().then(() => {
        PerformanceMonitor.endTiming('App Initialization');
        console.log('Dashboard initialized successfully');
    }).catch(error => {
        console.error('Failed to initialize dashboard:', error);
        Dashboard.showModal('Failed to initialize the dashboard. Please refresh the page.');
    });
});

// Handle network connectivity changes
window.addEventListener('online', () => {
    Dashboard.showNotification('Back online! Refreshing data...', 'success');
    Dashboard.loadAllData();
});

window.addEventListener('offline', () => {
    Dashboard.showNotification('You are offline. Some features may not work.', 'warning');
});

// Auto-refresh data every 10 minutes
setInterval(() => {
    if (navigator.onLine) {
        Dashboard.loadAllData();
        console.log('Auto-refreshed data');
    }
}, 600000); // 10 minutes

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Dashboard,
        WeatherService,
        NewsService,
        QuoteService,
        ActivityService,
        APIHandler
    };
}