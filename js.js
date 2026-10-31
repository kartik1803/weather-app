
// ==================== DOM ELEMENTS ====================

const userTab = document.querySelector("[data-userWeather]");
const searchTab = document.querySelector("[data-searchWeather]");

const grantAccessContainer = document.querySelector(".grant-location-container");
const searchForm = document.querySelector("[data-searchForm]");
const searchInput = document.querySelector("[data-searchInput]");
const loadingScreen = document.querySelector(".loading-container");
const userInfoContainer = document.querySelector(".user-info-container");
const grantAccessButton = document.querySelector("[data-grantAccess]");
const errorMessage = document.querySelector("[data-errorMessage]");

// Replace this with your NEW OpenWeatherMap API key.
// Never publish a real API key in a public repository.
const API_KEY = "ebe5faeb9930a7acf1fcfb2cfcafa28e";

// ==================== INITIAL STATE ====================

let currentTab = userTab;

// Start on the Your Weather tab.
userTab.classList.add("current-tab");
searchForm.classList.remove("active");
userInfoContainer.classList.remove("active");
loadingScreen.classList.remove("active");
grantAccessContainer.classList.remove("active");


// ==================== TAB SWITCHING ====================

userTab.addEventListener("click", () => {
    switchTab(userTab);
});

searchTab.addEventListener("click", () => {
    switchTab(searchTab);
});

function switchTab(clickedTab) {
    if (clickedTab === currentTab) return;

    currentTab.classList.remove("current-tab");
    currentTab = clickedTab;
    currentTab.classList.add("current-tab");

    hideWeatherUI();
    clearError();

    if (clickedTab === searchTab) {
        searchForm.classList.add("active");
        searchInput.focus();
    } else {
        searchForm.classList.remove("active");
        getFromSessionStorage();
    }
}


// ==================== UI HELPERS ====================

function hideWeatherUI() {
    userInfoContainer.classList.remove("active");
    grantAccessContainer.classList.remove("active");
    loadingScreen.classList.remove("active");
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.classList.remove("active");
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add("active");
}


// ==================== SESSION STORAGE ====================

function getFromSessionStorage() {
    const savedCoordinates = sessionStorage.getItem("user-coordinates");

    if (!savedCoordinates) {
        grantAccessContainer.classList.add("active");
        return;
    }

    try {
        const coordinates = JSON.parse(savedCoordinates);

        if (
            typeof coordinates.lat !== "number" ||
            typeof coordinates.lon !== "number"
        ) {
            throw new Error("Invalid saved coordinates");
        }

        fetchUserWeatherInfo(coordinates);
    } catch (error) {
        sessionStorage.removeItem("user-coordinates");
        grantAccessContainer.classList.add("active");
    }
}


// ==================== FETCH WEATHER BY LOCATION ====================

async function fetchUserWeatherInfo(coordinates) {
    const { lat, lon } = coordinates;

    hideWeatherUI();
    clearError();
    loadingScreen.classList.add("active");

    try {
        const url =
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                response.status === 401
                    ? "Invalid API key. Check your OpenWeatherMap key."
                    : "Unable to fetch weather for your location."
            );
        }

        const data = await response.json();

        renderWeatherinfo(data);
        userInfoContainer.classList.add("active");
    } catch (error) {
        showError(error.message || "Something went wrong.");
        grantAccessContainer.classList.add("active");
    } finally {
        loadingScreen.classList.remove("active");
    }
}


// ==================== RENDER WEATHER ====================

function renderWeatherinfo(weatherdata) {
    const cityName = document.querySelector("[data-cityName]");
    const countryIcon = document.querySelector("[data-countryIcon]");
    const desc = document.querySelector("[data-weatherDesc]");
    const weatherIcon = document.querySelector("[data-weatherIcon]");
    const temp = document.querySelector("[data-temp]");
    const windspeed = document.querySelector("[data-windspeed]");
    const humidity = document.querySelector("[data-humidity]");
    const cloudiness = document.querySelector("[data-cloudiness]");

    cityName.textContent = weatherdata.name ?? "Unknown city";

    const country = weatherdata.sys?.country;

    if (country) {
        countryIcon.src =
            `https://flagcdn.com/144x108/${country.toLowerCase()}.png`;
        countryIcon.alt = `${country} flag`;
    } else {
        countryIcon.removeAttribute("src");
    }

    desc.textContent =
        weatherdata.weather?.[0]?.description ?? "Unavailable";

    const iconCode = weatherdata.weather?.[0]?.icon;

    if (iconCode) {
        weatherIcon.src =
            `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        weatherIcon.alt = desc.textContent;
    } else {
        weatherIcon.removeAttribute("src");
    }

    temp.textContent =
        weatherdata.main?.temp != null
            ? `${Math.round(weatherdata.main.temp)} °C`
            : "-- °C";

    windspeed.textContent =
        weatherdata.wind?.speed != null
            ? `${weatherdata.wind.speed} m/s`
            : "--";

    humidity.textContent =
        weatherdata.main?.humidity != null
            ? `${weatherdata.main.humidity}%`
            : "--";

    cloudiness.textContent =
        weatherdata.clouds?.all != null
            ? `${weatherdata.clouds.all}%`
            : "--";
}


// ==================== GET USER LOCATION ====================

function getLocation() {
    clearError();

    if (!navigator.geolocation) {
        showError("Geolocation is not supported by this browser.");
        return;
    }

    hideWeatherUI();
    loadingScreen.classList.add("active");

    navigator.geolocation.getCurrentPosition(
        showPosition,
        handleLocationError,
        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

function showPosition(position) {
    const userCoordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
    };

    sessionStorage.setItem(
        "user-coordinates",
        JSON.stringify(userCoordinates)
    );

    fetchUserWeatherInfo(userCoordinates);
}

function handleLocationError(error) {
    loadingScreen.classList.remove("active");
    grantAccessContainer.classList.add("active");

    let message;

    switch (error.code) {
        case error.PERMISSION_DENIED:
            message = "Location permission denied. Allow location access in your browser settings.";
            break;
        case error.POSITION_UNAVAILABLE:
            message = "Your location is currently unavailable.";
            break;
        case error.TIMEOUT:
            message = "Location request timed out. Please try again.";
            break;
        default:
            message = "Unable to retrieve your location.";
    }

    showError(message);
}

grantAccessButton.addEventListener("click", getLocation);


// ==================== SEARCH WEATHER BY CITY ====================

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const city = searchInput.value.trim();

    if (!city) {
        showError("Please enter a city name.");
        return;
    }

    fetchSearchWeatherInfo(city);
});

async function fetchSearchWeatherInfo(city) {
    hideWeatherUI();
    clearError();
    loadingScreen.classList.add("active");

    try {
        const url =
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("City not found. Please check the spelling.");
            }

            if (response.status === 401) {
                throw new Error("Invalid API key. Check your OpenWeatherMap key.");
            }

            throw new Error("Unable to fetch weather. Please try again.");
        }

        const data = await response.json();

        renderWeatherinfo(data);
        userInfoContainer.classList.add("active");
    } catch (error) {
        showError(error.message || "Unable to fetch weather information.");
    } finally {
        loadingScreen.classList.remove("active");
    }
}



getFromSessionStorage();
