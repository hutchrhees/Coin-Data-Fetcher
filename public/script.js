document.addEventListener("DOMContentLoaded", async function () {
  const coinSelect = document.getElementById("coin");
  const exchangeSelect = document.getElementById("exchange");
  const successMessage = document.getElementById("successMessage");

  async function fetchCoins() {
    try {
      const exchange = exchangeSelect.value;
      const response = await fetch(`/get-coin-options?exchange=${exchange}`);
      let coins = await response.json();

      // Sort coins alphanumerically
      coins.sort();

      coinSelect.innerHTML = "";
      coins.forEach((coin) => {
        const option = document.createElement("option");
        option.value = coin;
        option.textContent = coin;
        coinSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error fetching coin options:", error);
    }
  }

  exchangeSelect.addEventListener("change", fetchCoins);
  await fetchCoins();

  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".data-section")
        .forEach((ds) => ds.classList.remove("active"));

      this.classList.add("active");
      document.getElementById(this.dataset.type).classList.add("active");
    });
  });
});

document
  .getElementById("dataForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const exchange = document.getElementById("exchange").value;
    const coin = document.getElementById("coin").value;
    const endDate = document.getElementById("endDate").value;
    const successMessage = document.getElementById("successMessage");

    successMessage.style.display = "none";

    const dataTypes = [
      "ohlc",
      "orderbook",
      "tick",
      // "candle",
      // "realtime-market",
      // "historical",
    ];

    for (const dataType of dataTypes) {
      const downloadLink = document.getElementById(`${dataType}DownloadLink`);
      const table = document.getElementById(`${dataType}Table`);
      if (downloadLink) downloadLink.style.display = "none";
      if (table) table.style.display = "none";
    }

    let success = true;

    for (const dataType of dataTypes) {
      const response = await fetch(
        `/fetch-data?exchange=${exchange}&coin=${coin}&endDate=${endDate}&dataType=${dataType}`
      );
      const data = await response.json();

      if (data.csvFile) {
        const downloadLink = document.getElementById(`${dataType}DownloadLink`);
        if (downloadLink) {
          downloadLink.href = data.csvFile;
          downloadLink.style.display = "block";
          downloadLink.textContent = `Download ${dataType
            .replace(/-/g, " ")
            .toUpperCase()} CSV`;
        }

        const responseData = await fetch(data.csvFile);
        const csvText = await responseData.text();
        const rows = csvText.split("\n").slice(1); // Skip header row

        const table = document.getElementById(`${dataType}Table`);
        if (table) {
          const tbody = table.querySelector("tbody");
          tbody.innerHTML = ""; // Clear existing rows

          rows.forEach((row) => {
            const columns = row
              .split(",")
              .map((col) => col.trim().replace(/^"|"$/g, "")); // Remove surrounding quotes
            if (columns.length > 1) {
              // Ensure it's not an empty row
              const tr = document.createElement("tr");
              columns.forEach((column) => {
                const td = document.createElement("td");
                td.textContent = column;
                tr.appendChild(td);
              });
              tbody.appendChild(tr);
            }
          });

          table.style.display = "block";
        }

        // Show the tab for this data type if the data is available
        const tab = document.querySelector(`.tab[data-type="${dataType}"]`);
        if (tab) {
          tab.classList.remove("hidden");
        }
      } else {
        console.error(
          `Failed to fetch ${dataType.replace(/-/g, " ")} data: ${data.error}`
        );
        success = false;
      }
    }

    if (success) {
      successMessage.style.display = "block";
    }
  });
