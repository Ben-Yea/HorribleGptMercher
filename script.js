import { getItemNameById } from './item_mappings.js'; // Reference to the item mappings

let pinnedItems = JSON.parse(localStorage.getItem("pinnedItems")) || []; // Array to store pinned items, loaded from localStorage if available
let marketData = []; // Store fetched market data

async function fetchMarketData() {
    const pinnedItemsMap = new Map(pinnedItems.map(item => [item.itemId, { ...item }]));
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
        // Update highest buy prices for pinned items
        data.forEach(item => {
            if (pinnedItemsMap.has(item.itemId)) {
                const pinnedItem = pinnedItemsMap.get(item.itemId);
                pinnedItem.highestBuyPrice = item.highestBuyPrice;
                if (typeof item.customBuyOffer !== 'undefined') {
                    pinnedItem.customBuyOffer = item.customBuyOffer;
                }
            }
        });
        pinnedItems = Array.from(pinnedItemsMap.values());
        localStorage.setItem("pinnedItems", JSON.stringify(pinnedItems));
        updatePinnedItems();
        renderMarketData(data); // Render the data in the table
    } catch (error) {
        console.error("Error fetching market data:", error);
    }
}

function playNotificationSound() {
    const audio = new Audio('./sounds/beep-07.wav');
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

            // Handle undefined values
            if (valueA === undefined || valueB === undefined) return 0;

            // Sort based on the current order
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
            <td>${highestBuyPrice}</td>
            <td>${lowestSellPrice}</td>
            <td>${highestPriceVolume}</td>
            <td>${lowestPriceVolume}</td>
            <td>${profit.toLocaleString()}</td>
        `;

        tbody.appendChild(row);
    });
}

function updatePinnedItems() {
    localStorage.setItem("pinnedItems", JSON.stringify(pinnedItems));
    const container = document.getElementById("pinnedItems");
    container.innerHTML = ""; // Clear existing cards

    pinnedItems.forEach((item, index) => {
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
        customBuyInput.addEventListener("change", (event) => {
            item.customBuyOffer = parseFloat(event.target.value) || 0;
            checkNotificationCondition(item, card);
            localStorage.setItem("pinnedItems", JSON.stringify(pinnedItems));
        });

        const customBuyContainer = document.createElement("div");
        customBuyContainer.appendChild(customBuyLabel);
        customBuyContainer.appendChild(customBuyInput);

        // Add a remove button
        const removeButton = document.createElement("button");
        removeButton.className = "remove-button";
        removeButton.textContent = "✖"; // Use an 'X' or similar icon for the button
        removeButton.title = "Remove item"; // Tooltip for accessibility
        removeButton.addEventListener("click", () => {
            pinnedItems.splice(index, 1); // Remove item from pinnedItems
            localStorage.setItem("pinnedItems", JSON.stringify(pinnedItems)); // Update localStorage
            updatePinnedItems(); // Refresh pinned items
        });

        card.appendChild(name);
        card.appendChild(highestBuy);
        card.appendChild(customBuyContainer);
        card.appendChild(removeButton);

        checkNotificationCondition(item, card); // Ensure animation and flashing are handled
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
    if (
        typeof item.customBuyOffer === "number" &&
        typeof item.highestBuyPrice === "number" &&
        item.customBuyOffer < item.highestBuyPrice
    ) {
        if (!card.classList.contains("flashing-red")) {
            playNotificationSound(); // Play sound only when first entering the condition
        }
        card.classList.add("flashing-red");
        // Force animation restart
        card.style.animation = "none";
        setTimeout(() => {
            card.style.animation = "flashRed 1s infinite alternate";
        }, 0);
    } else {
        card.classList.remove("flashing-red");
        card.style.animation = ""; // Remove animation if condition is not met
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

// Assuming the uploaded file is JavaScript and the issue is with the mute functionality for a custom audio play.

// Assuming the uploaded file is JavaScript and the issue is with the mute functionality for a custom audio play.

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded event triggered");
    // Timer display for auto-fetch
    const timerDiv = document.createElement("div");
    timerDiv.id = "fetchTimer";
    timerDiv.style.position = "fixed";
    timerDiv.style.top = "10px";
    timerDiv.style.right = "10px";
    timerDiv.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    timerDiv.style.color = "white";
    timerDiv.style.padding = "5px 10px";
    timerDiv.style.borderRadius = "5px";
    document.body.appendChild(timerDiv);
    console.log("Timer div added to the DOM");

    let timeLeft = 30; // 30 seconds for auto-fetch timer
    function updateTimer() {
        console.log(`Updating timer: ${timeLeft} seconds left`);
        timerDiv.textContent = `Next data fetch in: ${timeLeft} seconds`;
        timeLeft--;
        if (timeLeft < 0) {
            timeLeft = 30; // Reset timer after fetching
            console.log("Timer reset after reaching zero");
        }
    }
    setInterval(updateTimer, 1000); // Update timer every second
    updateTimer();

    // Automatically fetch market data every 30 seconds
    setInterval(() => {
        console.log("Auto-fetching market data");
        fetchMarketData();
        timeLeft = 30; // Reset timer immediately after fetch
    }, 30000);

    // Mute toggle switch
    const toggleContainer = document.createElement("div");
    toggleContainer.style.position = "fixed";
    toggleContainer.style.top = "40px"; // Adjusted positioning above pinned items
    toggleContainer.style.right = "10px";
    toggleContainer.style.display = "flex";
    toggleContainer.style.alignItems = "center";
    toggleContainer.style.gap = "10px";

    const toggleLabel = document.createElement("label");
    toggleLabel.textContent = "Mute Notifications";
    toggleLabel.style.color = "#e0e0e0";

    const toggleSwitch = document.createElement("div");
    toggleSwitch.style.width = "50px";
    toggleSwitch.style.height = "25px";
    toggleSwitch.style.backgroundColor = "#ccc";
    toggleSwitch.style.borderRadius = "15px";
    toggleSwitch.style.position = "relative";
    toggleSwitch.style.cursor = "pointer";

    const toggleCircle = document.createElement("div");
    toggleCircle.style.width = "21px";
    toggleCircle.style.height = "21px";
    toggleCircle.style.backgroundColor = "#fff";
    toggleCircle.style.borderRadius = "50%";
    toggleCircle.style.position = "absolute";
    toggleCircle.style.top = "2px";
    toggleCircle.style.left = "2px";
    toggleCircle.style.transition = "all 0.3s";

    let isMuted = false;

    toggleSwitch.addEventListener("click", () => {
        isMuted = !isMuted;
        toggleCircle.style.left = isMuted ? "26px" : "2px";
        toggleSwitch.style.backgroundColor = isMuted ? "#444" : "#ccc";
        toggleLabel.textContent = isMuted ? "Notifications Muted" : "Mute Notifications";
        console.log(`Mute toggle switched: isMuted = ${isMuted}`);
    });

    toggleSwitch.appendChild(toggleCircle);
    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggleSwitch);
    document.body.appendChild(toggleContainer);
    console.log("Mute toggle switch added to the DOM");

    // Load saved market data
    const savedData = localStorage.getItem("marketData");
    const searchBox = document.getElementById("searchBox");
    const suggestionsDiv = document.getElementById("suggestions");
    const pinButton = document.getElementById("pinButton");

    if (savedData) {
        console.log("Loading saved market data from localStorage");
        marketData = JSON.parse(savedData);
        renderMarketData(marketData);
        updatePinnedItems(); // Initialize pinned items
    }

    // Fetch data button
    document.getElementById("fetchData").addEventListener("click", () => {
        console.log("Fetch data button clicked");
        fetchMarketData();
    });

    // Search box functionality
    searchBox.addEventListener("input", (event) => {
        console.log(`Search box input event: ${event.target.value}`);
        handleSearch(event);
    });

    // Pin button functionality
    pinButton.addEventListener("click", () => {
        const itemName = searchBox.value.trim();
        console.log(`Pin button clicked with item name: ${itemName}`);
        if (itemName) {
            const item = marketData.find(
                i => getItemNameById(i.itemId).toLowerCase() === itemName.toLowerCase()
            );
            if (item) {
                console.log(`Item found: ${itemName}`);
                pinItem(item.itemId);
            } else {
                console.warn("Item not found. Please enter a valid item name.");
                alert("Item not found. Please enter a valid item name.");
            }
        } else {
            console.warn("No item name entered for pinning");
            alert("Please enter an item name to pin.");
        }
    });

    // Autofill on TAB key and highlight suggestions with Arrow keys
    let selectedSuggestionIndex = -1;
    searchBox.addEventListener("keydown", (event) => {
        const suggestions = Array.from(suggestionsDiv.querySelectorAll(".suggestion"));
        console.log(`Keydown event in search box: ${event.key}`);

        if (event.key === "ArrowDown") {
            selectedSuggestionIndex = (selectedSuggestionIndex + 1) % suggestions.length;
            suggestions.forEach((el, i) => el.classList.toggle("highlighted", i === selectedSuggestionIndex));
            searchBox.value = suggestions[selectedSuggestionIndex]?.textContent || searchBox.value;
            event.preventDefault();
            console.log(`ArrowDown pressed: selectedSuggestionIndex = ${selectedSuggestionIndex}`);
        } else if (event.key === "ArrowUp") {
            selectedSuggestionIndex = (selectedSuggestionIndex - 1 + suggestions.length) % suggestions.length;
            suggestions.forEach((el, i) => el.classList.toggle("highlighted", i === selectedSuggestionIndex));
            searchBox.value = suggestions[selectedSuggestionIndex]?.textContent || searchBox.value;
            event.preventDefault();
            console.log(`ArrowUp pressed: selectedSuggestionIndex = ${selectedSuggestionIndex}`);
        } else if (event.key === "Tab" && suggestionsDiv.firstChild) {
            searchBox.value = suggestions[selectedSuggestionIndex]?.textContent || suggestionsDiv.firstChild.textContent;
            suggestionsDiv.style.display = "none";
            bringItemToTop(searchBox.value);
            event.preventDefault();
            console.log(`Tab pressed: autofill with suggestion`);
        } else if (event.key === "Enter") {
            bringItemToTop(searchBox.value);
            suggestionsDiv.style.display = "none";
            event.preventDefault();
            console.log(`Enter pressed: bring item to top with value: ${searchBox.value}`);
        }
    });

    // Sorting functionality for column headers
    const headers = document.querySelectorAll("thead th");
    let currentSortColumn = null;
    let currentSortOrder = "asc";

    headers.forEach((header, index) => {
        header.addEventListener("click", () => {
            const columns = ["itemId", "highestBuyPrice", "lowestSellPrice", "highestPriceVolume", "lowestPriceVolume", "profit"];
            const sortColumn = columns[index];

            currentSortOrder = currentSortColumn === sortColumn && currentSortOrder === "asc" ? "desc" : "asc";
            currentSortColumn = sortColumn;

            console.log(`Sorting column: ${sortColumn}, order: ${currentSortOrder}`);

            if (marketData) {
                renderMarketData(marketData, sortColumn, currentSortOrder);
            }
        });
    });

    // Centralized function to play notification sound
    function playNotificationSound() {
        console.log(`playNotificationSound called: isMuted = ${isMuted}`);
        if (isMuted) {
            console.log("Sound is muted, not playing");
            return;
        }
        const audio = new Audio('./sounds/beep-07.wav');
        audio.play().catch((error) => console.warn("Audio playback failed:", error));
    }

    // Example logic to trigger the sound for pinned items during fetch
    function checkPinnedItemConditions() {
        console.log("Checking pinned item conditions");
        pinnedItems.forEach((item) => {
            if (item.customBuyOffer < item.highestBuyPrice) {
                console.log(`Pinned item condition met for item: ${item.itemId}`);
                playNotificationSound(); // Respect mute state
            }
        });
    }

    // Modified fetchMarketData to include sound check
    function fetchMarketData() {
        console.log("Fetching market data");
        // Assume this fetches data and updates marketData
        // After fetching data, check pinned item conditions
        checkPinnedItemConditions();
    }

    // Assuming there's an audio play function for the custom buy offer event
    function playCustomBuyOfferAudio() {
        console.log(`playCustomBuyOfferAudio called: isMuted = ${isMuted}`);
        if (!isMuted) {
            const audio = new Audio('customBuyOfferSound.mp3');
            audio.play().catch((error) => console.warn("Audio playback failed:", error));
        } else {
            console.log("Sound is muted, not playing custom buy offer audio");
        }
    }

    // Replace or add the playCustomBuyOfferAudio() call accordingly wherever the custom buy offer plays the audio.

    document.getElementById('customBuyOffer').addEventListener('click', function () {
        console.log("Custom buy offer clicked");
        playCustomBuyOfferAudio();
        // Other logic for handling custom buy offer
    });
});
