let allGames = [];

async function getJSON() {
    const file = './temp-games.json';
    const response = await fetch(file);

    if(response.ok) {
        const data = await response.json();
        return data.applist.apps;
    }
    else {
        console.error("ERROR FETCHING JSON: ", error);
    }
}

// Run this once on page load.
async function getAllSteamGames() {
    const url = `https://corsproxy.io/?url=https://api.steampowered.com/ISteamApps/GetAppList/v2`;
    return await fetch(url).then((response) => response.json()).then((data) => data.applist.apps);
}

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

async function lookupGames(results) {
    const allGameInfo = [];
    for(const game of results) {
        const gameInfo = await idToGame(game.appid);
 
        // Skip if game doesn't exist, is not out yet, or is free
        if(!gameInfo || gameInfo.release_date.coming_soon || gameInfo.is_free) continue;

        const importantInfo = {
            "name": gameInfo.name,
            "image": gameInfo.capsule_image,
            "initial_price": gameInfo.price_overview.initial / 100.00,
            "final_price": gameInfo.price_overview.final / 100.00,
            "discount": gameInfo.price_overview.discount_percent
        };
        allGameInfo.push(importantInfo);

        // Limit the number of results
        if(allGameInfo.length >= 10) break;
    }

    return allGameInfo;
}

function showResults(results) {
    for(const game of results) {
        const resultItem = document.createElement('li');
        resultItem.classList.add('result-item');
        const text = document.createTextNode(`Name: ${game.name} | Initial: ${game.initial_price} | Final: ${game.final_price} | Discount: ${game.discount}`);
        resultItem.appendChild(text);
        list.appendChild(resultItem);
    }
}
function clearList() {
    list.innerHTML = "";
}
/*
window.onload = async () => {
    allGames = await getAllSteamGames();

    const searchInput = document.getElementsByClassName("input");
    searchInput.addEventListener("input", (e) => {
        const value = e.target.value;

        if(value && value.trim().length > 0) {
            value = value.trim().toLowerCase();
        }
    });
};*/

window.onload = async() => {
    // Fetch all game data in Steam store
    allGames = await getAllSteamGames();

    // Clear input and results when clicking clear button
    const clearBtn = document.querySelector('.clear-results');
    clearBtn.addEventListener('click', () => {
        searchInput.value = "";
        clearList();
    });

    const searchForm = document.querySelector('.form');
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearList();

        const inputField = e.target.elements['search'];
        let value = inputField.value;
        inputField.value = "";

        if(value && value.trim().length > 0) {
            value = value.trim().toLowerCase();

            const searchResults = getSteamGames(value);
            const gameList = await lookupGames(searchResults);
            console.log(gameList);
            showResults(gameList);
        }
    });
};