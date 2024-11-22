import { getItemNameById } from './item_mappings.js'; // Reference to the item mappings

let pinnedItems = JSON.parse(localStorage.getItem("pinnedItems")) || []; // Array to store pinned items, loaded from localStorage if available
let marketData = []; // Store fetched market data

async function fetchMarketData() {
    const apiUrl = "https://query.idleclans.com/api/PlayerMarket/items/prices/latest";
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();

        // Save the fetched data to localStorage
        localStorage.setItem("marketData", JSON.stringify(data));
        marketData = data;
        renderMarketData(data); // Render the data in the table
    } catch (error) {
        console.error("Error fetching market data:", error);
    }
}

function playNotificationSound() {
    const audio = new Audio('https://www.soundjay.com/button/beep-07.wav');
    audio.play();
}

function renderMarketData(data, sortColumn = "itemId", sortOrder = "asc", skipSort = false) {
    const tbody = document.getElementById("marketData");
    tbody.innerHTML = ""; // Clear previous data

    // Log data being rendered for debugging
    console.log("Rendering Data:", data);

    // Sort data if skipSort is false
    if (!skipSort) {
        data = [...data].sort((a, b) => {
            const valueA = sortColumn === "profit"
                ? (typeof a.lowestSellPrice === "number" && typeof a.highestBuyPrice === "number"
                    ? a.lowestSellPrice - a.highestBuyPrice
                    : Number.MAX_VALUE) // Push "N/A" to the bottom
                : a[sortColumn];
            const valueB = sortColumn === "profit"
                ? (typeof b.lowestSellPrice === "number" && typeof b.highestBuyPrice === "number"
                    ? b.lowestSellPrice - b.highestBuyPrice
                    : Number.MAX_VALUE)
                : b[sortColumn];

            if (valueA === undefined || valueB === undefined) return 0; // Handle undefined
            return sortOrder === "asc" ? valueA - valueB : valueB - valueA;
        });
    }

    // Render rows
    data.forEach(item => {
        const itemName = getItemNameById(item.itemId);
        if (!itemName || itemName === "Unknown Item") return; // Skip unmapped or unknown items
        const lowestSellPrice = item.lowestSellPrice ? item.lowestSellPrice.toLocaleString() : "0";
        const lowestPriceVolume = item.lowestPriceVolume ? item.lowestPriceVolume.toLocaleString() : "0";
        const highestBuyPrice = item.highestBuyPrice ? item.highestBuyPrice.toLocaleString() : "0";
        const highestPriceVolume = item.highestPriceVolume ? item.highestPriceVolume.toLocaleString() : "0";
        const profit = (item.lowestSellPrice && item.highestBuyPrice)
            ? item.lowestSellPrice - item.highestBuyPrice
            : 0;

        const row = document.createElement("tr");

        // Create individual cells
        row.innerHTML = `
            <td>${itemName}</td>
            <td style="background-color: #f8d7da;">${highestBuyPrice}</td>
            <td style="background-color: #dbefff;">${lowestSellPrice}</td>
            <td>${highestPriceVolume}</td>
            <td>${lowestPriceVolume}</td>
            <td style="background-color: ${profit > 1 ? "#d4edda" : "#ffffff"};">${profit.toLocaleString()}</td>
        `;

        tbody.appendChild(row);
    });
}

function updatePinnedItems() {
    // Save pinned items to localStorage
    localStorage.setItem("pinnedItems", JSON.stringify(pinnedItems));
    const container = document.getElementById("pinnedItems");
    container.innerHTML = ""; // Clear existing cards

    pinnedItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "pinned-item-card";

        const name = document.createElement("h4");
        name.textContent = getItemNameById(item.itemId);

        const highestBuy = document.createElement("p");
        highestBuy.textContent = `Highest Buy: ${item.highestBuyPrice.toLocaleString()}`;

        const customBuyLabel = document.createElement("label");
        customBuyLabel.textContent = "Custom Buy Offer: ";
        const customBuyInput = document.createElement("input");
        customBuyInput.type = "number";
        customBuyInput.value = item.customBuyOffer || 0;
        customBuyInput.addEventListener("input", (event) => {
            item.customBuyOffer = parseFloat(event.target.value) || 0;
            checkNotificationCondition(item, card);
        });

        const customBuyContainer = document.createElement("div");
        customBuyContainer.appendChild(customBuyLabel);
        customBuyContainer.appendChild(customBuyInput);

        card.appendChild(name);
        card.appendChild(highestBuy);
        card.appendChild(customBuyContainer);

        checkNotificationCondition(item, card);

        container.appendChild(card);
    });

    // Ensure exactly 6 cards (empty placeholders if less than 6)
    while (container.childElementCount < 6) {
        const emptyCard = document.createElement("div");
        emptyCard.className = "pinned-item-card";
        emptyCard.innerHTML = `<h4>Empty</h4><p>Pin an item</p>`;
        container.appendChild(emptyCard);
    }
}

function checkNotificationCondition(item, card) {
    if (item.customBuyOffer && item.highestBuyPrice > item.customBuyOffer) {
        playNotificationSound();
        card.style.backgroundColor = "#ffcccc"; // Highlight card in red
    } else {
        card.style.backgroundColor = ""; // Reset background color
    }
}

function pinItem(itemId) {
    // Save pinned items to localStorage after updating
    // Find the item in the market data
    const item = marketData.find(i => i.itemId === itemId);
    if (!item) return;

    // Avoid duplicate pins
    if (pinnedItems.some(p => p.itemId === itemId)) return;

    // Add the item to pinnedItems (limit to 6)
    if (pinnedItems.length < 6) {
        pinnedItems.push(item);
    } else {
        alert("You can only pin up to 6 items.");
    }

    updatePinnedItems(); // Refresh the cards
}

function handleSearch() {
    const searchBox = document.getElementById("searchBox");
    const query = searchBox.value.toLowerCase();
    const suggestionsDiv = document.getElementById("suggestions");
    suggestionsDiv.innerHTML = ""; // Clear previous suggestions

    if (!query) {
        renderMarketData(marketData); // Reset to full data if search is cleared
        suggestionsDiv.style.display = "none";
        return;
    }

    // Filter suggestions
    const matches = marketData
        .map(item => getItemNameById(item.itemId))
        .filter(name => name && name.toLowerCase().includes(query));

    if (matches.length > 0) {
        matches.forEach((match, index) => {
            const div = document.createElement("div");
            div.className = "suggestion";
            div.textContent = match;
            div.dataset.index = index;

            // Click handler for suggestions
            div.addEventListener("click", () => {
                searchBox.value = match; // Autofill the search box
                suggestionsDiv.style.display = "none";
                bringItemToTop(match); // Bring the selected item to the top
            });

            suggestionsDiv.appendChild(div);
        });
        suggestionsDiv.style.display = "block";
    } else {
        suggestionsDiv.style.display = "none";
    }

    // Adjust suggestions position
    const searchBoxRect = searchBox.getBoundingClientRect();
    suggestionsDiv.style.left = `${searchBoxRect.left}px`;
    suggestionsDiv.style.top = `${searchBoxRect.bottom}px`;
    suggestionsDiv.style.width = `${searchBoxRect.width}px`;
}

function bringItemToTop(itemName) {
    const filteredData = marketData.filter(item => getItemNameById(item.itemId).toLowerCase() === itemName.toLowerCase());
    const remainingData = marketData.filter(item => getItemNameById(item.itemId).toLowerCase() !== itemName.toLowerCase());
    renderMarketData([...filteredData, ...remainingData], "itemId", "asc", true);
}

document.addEventListener("DOMContentLoaded", () => {
    const savedData = localStorage.getItem("marketData");
    const searchBox = document.getElementById("searchBox");
    const suggestionsDiv = document.getElementById("suggestions");
    const pinButton = document.createElement("button");
    pinButton.id = "pinButton";
    pinButton.textContent = "Pin Item";
    pinButton.addEventListener("click", () => {
        const itemName = searchBox.value;
        const item = marketData.find(i => getItemNameById(i.itemId).toLowerCase() === itemName.toLowerCase());
        if (item) {
            pinItem(item.itemId);
        } else {
            alert("Item not found. Please enter a valid item name.");
        }
    });
    searchBox.insertAdjacentElement("afterend", pinButton);

    if (savedData) {
        marketData = JSON.parse(savedData);
        renderMarketData(marketData);
        updatePinnedItems(); // Initialize pinned items
    }

    // Fetch data button
    document.getElementById("fetchData").addEventListener("click", fetchMarketData);

    // Search box functionality
    searchBox.addEventListener("input", handleSearch);

    // Autofill on TAB key and highlight suggestions with Arrow keys
    let selectedSuggestionIndex = -1;
    searchBox.addEventListener("keydown", (event) => {
        const suggestions = Array.from(suggestionsDiv.querySelectorAll(".suggestion"));

        if (event.key === "ArrowDown") {
            // Navigate down the suggestions
            selectedSuggestionIndex = (selectedSuggestionIndex + 1) % suggestions.length;
            suggestions.forEach((el, i) => el.classList.toggle("highlighted", i === selectedSuggestionIndex));
            searchBox.value = suggestions[selectedSuggestionIndex]?.textContent || searchBox.value;
            event.preventDefault();
        } else if (event.key === "ArrowUp") {
            // Navigate up the suggestions
            selectedSuggestionIndex = (selectedSuggestionIndex - 1 + suggestions.length) % suggestions.length;
            suggestions.forEach((el, i) => el.classList.toggle("highlighted", i === selectedSuggestionIndex));
            searchBox.value = suggestions[selectedSuggestionIndex]?.textContent || searchBox.value;
            event.preventDefault();
        } else if (event.key === "Tab" && suggestionsDiv.firstChild) {
            searchBox.value = suggestions[selectedSuggestionIndex]?.textContent || suggestionsDiv.firstChild.textContent;
            suggestionsDiv.style.display = "none";
            bringItemToTop(searchBox.value);
            event.preventDefault();
        } else if (event.key === "Enter") {
            bringItemToTop(searchBox.value);
            suggestionsDiv.style.display = "none";
            event.preventDefault();
        }
    });
});
