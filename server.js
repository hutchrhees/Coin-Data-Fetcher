const express = require("express");
const axios = require("axios");
const { Parser } = require("json2csv");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// Serve the csvs directory as a static directory
app.use("/csvs", express.static(path.join(__dirname, "csvs")));

const saveCsvFile = (data, filename) => {
  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(data);
  const csvDir = path.join(__dirname, "csvs"); // Directory for CSV files
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir); // Create the directory if it doesn't exist
  }
  const csvFilePath = path.join(csvDir, filename);
  fs.writeFileSync(csvFilePath, csv);
  return `/csvs/${filename}`; // Return the relative path for the client
};

app.get("/get-coin-options", async (req, res) => {
  const { exchange } = req.query;
  try {
    if (exchange === "kraken") {
      const response = await axios.get(
        "https://api.kraken.com/0/public/AssetPairs"
      );
      const pairs = response.data.result;
      const coins = Object.keys(pairs)
        .map((pair) => pair.replace(/USD|USDT/, ""))
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
      res.json(coins);
    } else if (exchange === "coinbase") {
      const response = await axios.get(
        "https://api.exchange.coinbase.com/products"
      );
      const coins = response.data
        .map((product) => product.base_currency)
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
      res.json(coins);
    } else {
      res.status(400).json({ error: "Unsupported exchange" });
    }
  } catch (error) {
    console.error("Error fetching coin options:", error);
    res.status(500).json({ error: "Failed to fetch coin options" });
  }
});

app.get("/get-available-data-types", async (req, res) => {
  const { exchange, coin } = req.query;

  try {
    let availableDataTypes = [];

    if (exchange === "kraken") {
      // Check for available data types for Kraken
      availableDataTypes = ["ohlc", "orderbook", "tick"];
    } else if (exchange === "coinbase") {
      // Check for available data types for Coinbase
      availableDataTypes = [
        "ohlc",
        "orderbook",
        "tick",
        "realtime-market",
        "historical",
      ];
    }

    res.json(availableDataTypes);
  } catch (error) {
    console.error("Error fetching available data types:", error);
    res.status(500).json({ error: "Failed to fetch available data types" });
  }
});

app.get("/fetch-data", async (req, res) => {
  const { exchange, coin, endDate, dataType } = req.query;

  try {
    let url;
    let data;
    let filename;

    if (exchange === "kraken") {
      const tradingPair = `${coin}USD`.replace("BTC", "XBT");

      switch (dataType) {
        case "ohlc":
          url = `https://api.kraken.com/0/public/OHLC?pair=${tradingPair}&interval=1440`;
          filename = `${coin}_ohlc_data.csv`;
          break;
        case "orderbook":
          url = `https://api.kraken.com/0/public/Depth?pair=${tradingPair}`;
          filename = `${coin}_orderbook_data.csv`;
          break;
        case "tick":
          url = `https://api.kraken.com/0/public/Trades?pair=${tradingPair}`;
          filename = `${coin}_tick_data.csv`;
          break;
        default:
          return res
            .status(400)
            .json({ error: `${dataType} is not supported by the Kraken API` });
      }
    } else if (exchange === "coinbase") {
      const tradingPair = `${coin}-USD`;

      switch (dataType) {
        case "ohlc":
          url = `https://api.exchange.coinbase.com/products/${tradingPair}/candles?granularity=86400`;
          filename = `${coin}_ohlc_data.csv`;
          break;
        case "orderbook":
          url = `https://api.exchange.coinbase.com/products/${tradingPair}/book?level=2`;
          filename = `${coin}_orderbook_data.csv`;
          break;
        case "tick":
          url = `https://api.exchange.coinbase.com/products/${tradingPair}/trades`;
          filename = `${coin}_tick_data.csv`;
          break;
        case "realtime-market":
          url = `https://api.exchange.coinbase.com/products/${tradingPair}/ticker`;
          filename = `${coin}_realtime_market_data.csv`;
          break;
        case "historical":
          url = `https://api.exchange.coinbase.com/products/${tradingPair}/candles?granularity=86400`;
          filename = `${coin}_historical_data.csv`;
          break;
        default:
          return res.status(400).json({
            error: `${dataType} is not supported by the Coinbase API`,
          });
      }
    } else {
      return res.status(400).json({ error: "Unsupported exchange" });
    }

    const response = await axios.get(url);
    data = response.data;

    if (exchange === "kraken") {
      const resultKey = Object.keys(data.result)[0];
      data = data.result[resultKey];

      if (dataType === "ohlc") {
        data = data.map((item) => ({
          time: new Date(item[0] * 1000).toISOString(),
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[6],
        }));
        if (endDate) {
          const endDateTime = new Date(endDate).getTime();
          data = data.filter(
            (item) => new Date(item.time).getTime() <= endDateTime
          );
        }
        data.sort((a, b) => new Date(b.time) - new Date(a.time)); // Sort by time, newest to oldest
      } else if (dataType === "orderbook") {
        const asks = data.asks.map((item) => ({
          price: item[0],
          volume: item[1],
          timestamp: new Date(item[2] * 1000).toISOString(),
          type: "ask",
        }));
        const bids = data.bids.map((item) => ({
          price: item[0],
          volume: item[1],
          timestamp: new Date(item[2] * 1000).toISOString(),
          type: "bid",
        }));
        data = asks.concat(bids);
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by timestamp, newest to oldest
      } else if (dataType === "tick") {
        data = data.map((item) => ({
          price: item[0],
          volume: item[1],
          time: new Date(item[2] * 1000).toISOString(),
          side: item[3],
          orderType: item[4] === "m" ? "taker" : "maker", // Correct mapping for Kraken
        }));
        data.sort((a, b) => new Date(b.time) - new Date(a.time)); // Sort by time, newest to oldest
      }
    } else if (exchange === "coinbase") {
      if (dataType === "ohlc") {
        data = data.map((item) => ({
          time: new Date(item[0] * 1000).toISOString(),
          low: item[1],
          high: item[2],
          open: item[3],
          close: item[4],
          volume: item[5],
        }));
        if (endDate) {
          const endDateTime = new Date(endDate).getTime();
          data = data.filter(
            (item) => new Date(item.time).getTime() <= endDateTime
          );
        }
        data.sort((a, b) => new Date(b.time) - new Date(a.time)); // Sort by time, newest to oldest
      } else if (dataType === "orderbook") {
        const asks = data.asks.map((item) => ({
          price: item[0],
          volume: item[1],
          timestamp: new Date().toISOString(),
          type: "ask",
        }));
        const bids = data.bids.map((item) => ({
          price: item[0],
          volume: item[1],
          timestamp: new Date().toISOString(),
          type: "bid",
        }));
        data = asks.concat(bids);
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by timestamp, newest to oldest
      } else if (dataType === "tick") {
        data = data.map((item) => ({
          price: item.price,
          volume: item.size,
          time: new Date(item.time).toISOString(),
          side: item.side,
          orderType: item.liquidity === "T" ? "taker" : "maker", // Correct mapping for Coinbase
        }));
        data.sort((a, b) => new Date(b.time) - new Date(a.time)); // Sort by time, newest to oldest
      } else if (dataType === "realtime-market") {
        data = [
          {
            price: data.price,
            volume: data.volume_24h,
            time: new Date(data.time).toISOString(),
          },
        ];
      } else if (dataType === "historical") {
        data = data.map((item) => ({
          time: new Date(item[0] * 1000).toISOString(),
          low: item[1],
          high: item[2],
          open: item[3],
          close: item[4],
          volume: item[5],
        }));
        data.sort((a, b) => new Date(b.time) - new Date(a.time)); // Sort by time, newest to oldest
      }
    }

    const csvFile = saveCsvFile(data, filename);
    res.json({ csvFile });
  } catch (error) {
    console.error(`Error fetching ${dataType} data:`, error);
    res.status(500).json({ error: `Failed to fetch ${dataType} data` });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
