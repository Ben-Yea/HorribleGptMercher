import { getItemNameById } from './item_mappings.js'; // Reference to the item mappings

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
        renderMarketData(data); // Render the data in the table
    } catch (error) {
        console.error("Error fetching market data:", error);
    }
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
        const profit = (lowestSellPrice !== "0" && highestBuyPrice !== "0")
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

document.addEventListener("DOMContentLoaded", () => {
    const savedData = localStorage.getItem("marketData");
    const searchBox = document.getElementById("searchBox");

    // Create and append a datalist for suggestions
    const suggestionsDatalist = document.getElementById("suggestions");

    let marketData = [];
    let selectedSuggestionIndex = -1; // Track selected suggestion for navigation

    if (savedData) {
        marketData = JSON.parse(savedData);
        renderMarketData(marketData);
    }

    // Fetch data button
    document.getElementById("fetchData").addEventListener("click", fetchMarketData);

    // Live suggestions as user types
    searchBox.addEventListener("input", (event) => {
        const query = event.target.value.toLowerCase();
        suggestionsDatalist.innerHTML = ""; // Clear previous suggestions
        selectedSuggestionIndex = -1; // Reset selection index

        if (!query) return; // Skip if input is empty

        // Find matching suggestions
        const matches = marketData
            .map(item => getItemNameById(item.itemId)) // Map item IDs to names
            .filter(name => name && name.toLowerCase().includes(query)); // Filter names based on query

        // Populate datalist with matches
        matches.forEach(match => {
            const option = document.createElement("option");
            option.value = match; // Set option value
            suggestionsDatalist.appendChild(option); // Append to datalist
        });
    });

    // Handle navigation and search on key events
    searchBox.addEventListener("keydown", (event) => {
        const options = Array.from(suggestionsDatalist.options);

        if (event.key === "ArrowDown") {
            // Navigate down the suggestions
            selectedSuggestionIndex = (selectedSuggestionIndex + 1) % options.length;
            searchBox.value = options[selectedSuggestionIndex].value; // Autofill the input
            event.preventDefault(); // Prevent cursor movement
        } else if (event.key === "ArrowUp") {
            // Navigate up the suggestions
            selectedSuggestionIndex = (selectedSuggestionIndex - 1 + options.length) % options.length;
            searchBox.value = options[selectedSuggestionIndex].value; // Autofill the input
            event.preventDefault(); // Prevent cursor movement
        } else if (event.key === "Enter") {
            // Automatically trigger the search with the highlighted suggestion
            if (selectedSuggestionIndex >= 0 && options.length > 0) {
                searchBox.value = options[selectedSuggestionIndex].value; // Use the selected suggestion
            }
            document.getElementById("searchButton").click(); // Trigger the search button
            selectedSuggestionIndex = -1; // Reset index after search
            event.preventDefault(); // Prevent default behavior
        }
    });

    // Search button functionality
    document.getElementById("searchButton").addEventListener("click", () => {
        const searchTerm = searchBox.value.toLowerCase();
        if (!searchTerm) {
            alert("Please enter a search term.");
            return;
        }

        // Find matching data
        const filteredData = marketData.filter(item => {
            const itemName = getItemNameById(item.itemId).toLowerCase();
            return itemName.includes(searchTerm);
        });

        // Check for matches
        if (filteredData.length > 0) {
            console.log("Filtered Data:", filteredData);

            // Find remaining data
            const remainingData = marketData.filter(item => {
                const itemName = getItemNameById(item.itemId).toLowerCase();
                return !itemName.includes(searchTerm);
            });

            console.log("Remaining Data:", remainingData);

            // Combine filtered data at the top
            const updatedData = [...filteredData, ...remainingData];
            renderMarketData(updatedData, "itemId", "asc", true); // Pass skipSort as true
        } else {
            alert("No items found matching your search.");
        }
    });
});
