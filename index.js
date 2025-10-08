let allGames = [];  // Store all available steam store games

// Run this once on page load.
// Get all available steam store games
async function getAllSteamGames() {
    const url = `https://corsproxy.io/?url=https://api.steampowered.com/ISteamApps/GetAppList/v2`;
    return await fetch(url).then((response) => response.json()).then((data) => data.applist.apps);
}

// Convert steam app id to listed steam game
async function idToGame(id) {
    const url = `https://corsproxy.io/?url=https://store.steampowered.com/api/appdetails?appids=${id}`
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'x-req-report': 'true'
        }
    });

    if(response.ok) {
        const data = await response.json();
        return data[id].data;
    }
    else {
        console.error("FAILED TO CONVERT STEAM APP ID TO STEAM GAME");
    }
}

// Run when searching. Run only after waiting a bit after user types, incase they type more (.5s?)
function getSteamGames(targetGame) {
    const MATCH_THRESHOLD = 0.6;    // Min matching threshold of two names

    // Filter through all games and find games that meet threshold
    const gamesFound = [];
    for(const game of allGames) {
        const gameSearch = (game.name).toLowerCase();
        const score = stringSimilarity.compareTwoStrings(targetGame.toLowerCase(), gameSearch);
        if(score >= MATCH_THRESHOLD) {
            gamesFound.push({
                "appid": game.appid,
                "name": game.name,
                "rating": score
            });
        }
    }

    // Sort from highest rating to lowest
    gamesFound.sort((a,b) => {
        return b.rating - a.rating;
    });

    return gamesFound;
}

// Look up given list of games on API and collect info
async function lookupGames(results) {
    const allGameInfo = [];
    for(const game of results) {
        const gameInfo = await idToGame(game.appid);
        //console.log(gameInfo);
 
        // Skip if game doesn't exist, is not out yet, or is free
        if(!gameInfo || gameInfo.release_date.coming_soon || gameInfo.is_free || !gameInfo.price_overview) continue;

        const importantInfo = {
            "name": gameInfo.name,
            "image": gameInfo.capsule_image,
            "initial_price": gameInfo.price_overview.initial / 100.00,
            "final_price": gameInfo.price_overview.final / 100.00,
            "discount": gameInfo.price_overview.discount_percent,
            "id": game.appid
        };
        allGameInfo.push(importantInfo);
    }

    return allGameInfo;
}

// Add search results as list under search bar
function showResults(results) {
    // Loop through all game results and add to screen
    for(const game of results) {
        const savedGames = localStorage.getItem("savedGames");
        let checkedStatus = "";
        if(savedGames) {
            const savedGamesInfo = JSON.parse(savedGames);
            if(savedGamesInfo.includes(game.id.toString())) {
                checkedStatus = "checked";
            }
        }

        // Template for list item
        const gameInfoTemplate = `
        <li class="result-item">
            <label class="check-container">
                <img class="game-image" src="${game.image}" alt="${game.name}">
                <span class="game-desc">${game.name} | Initial: ${game.initial_price} USD | Final: ${game.final_price} USD | Discount: ${game.discount}%</span>
                <input type="checkbox" id="${game.id}" ${checkedStatus}>
                <span class="checkmark"></span>
            </label>
        </li>
        `;
        list.insertAdjacentHTML('beforeend', gameInfoTemplate);

        // When box is checked, add to local storage.
        list.lastElementChild.addEventListener('change', (e) => {
            let savedGames = localStorage.getItem("savedGames");
            const checkInput = e.target;
            // Add item to local storage
            if(checkInput.checked) {
                if(savedGames) {
                    savedGames = JSON.parse(savedGames);
                    savedGames.push(checkInput.id);
                } else {
                    savedGames = [checkInput.id];
                }
                localStorage.setItem("savedGames", JSON.stringify(savedGames));
            }
            // Remove item from local storage
            else {
                savedGames = JSON.parse(savedGames);
                savedGames = savedGames.filter(item => item !== checkInput.id);
                localStorage.setItem("savedGames", JSON.stringify(savedGames));
            }
        });
    }
}

// Clear search list
function clearList() {
    list.innerHTML = "";
}

// Load all saved games to show up
async function loadSaves() {
    if(localStorage.getItem("savedGames")) {
        const savedGames = JSON.parse(localStorage.savedGames);
        const fetchedGames = [];
        for(const id of savedGames) {
            const gameInfo = await idToGame(id);

            if(!gameInfo) continue;

            const importantInfo = {
                "name": gameInfo.name,
                "image": gameInfo.capsule_image,
                "initial_price": gameInfo.price_overview.initial / 100.00,
                "final_price": gameInfo.price_overview.final / 100.00,
                "discount": gameInfo.price_overview.discount_percent,
                "id": id
            };
            fetchedGames.push(importantInfo);
        }

        showResults(fetchedGames);
    }
}

window.onload = async() => {
    // Fetch all game data in Steam store
    allGames = await getAllSteamGames();
    /*
    const start = document.getElementById("start");
    start.addEventListener('click', async () => {
        allGames = await getAllSteamGames();
    });
    */
    await loadSaves();

    // Clear input and results when clicking clear button
    const clearBtn = document.querySelector('.clear-results');
    const searchInput = document.querySelector('input');
    clearBtn.addEventListener('click', async () => {
        searchInput.value = "";
        clearList();
        await loadSaves();
    });

    const searchForm = document.querySelector('.form');
    searchForm.addEventListener('submit', async (e) => {
        // Prevent page from reloading and clear previous list
        e.preventDefault();
        clearList();

        // Start of loading
        const subBtn = document.querySelector("#submit");
        const loading = document.querySelector(".svg-loader");
        loading.style.display = "flex";

        // Record search value and clear bar
        const inputField = e.target.elements['search'];
        let value = inputField.value;
        inputField.value = "";

        // Check for input value and search game
        if(value && value.trim().length > 0) {
            value = value.trim().toLowerCase();

            // Look up game matching search
            const searchResults = getSteamGames(value);
            const gameList = await lookupGames(searchResults);

            // End of loading
            loading.style.display = "none";

            // List results under search bar
            showResults(gameList);
        }
    });
};