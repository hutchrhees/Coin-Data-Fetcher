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
  if (exchange === "kraken") {
    try {
      const response = await axios.get(
        "https://api.kraken.com/0/public/AssetPairs"
      );
      const pairs = response.data.result;
      const coins = Object.keys(pairs)
        .map((pair) => pair.replace(/USD|USDT/, ""))
        .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
      res.json(coins);
    } catch (error) {
      console.error("Error fetching coin options:", error);
      res.status(500).json({ error: "Failed to fetch coin options" });
    }
  } else {
    res.status(400).json({ error: "Unsupported exchange" });
  }
});

app.get("/fetch-data", async (req, res) => {
  const { exchange, coin, endDate, dataType } = req.query;

  if (exchange === "kraken") {
    try {
      const tradingPair = `${coin}USD`.replace("BTC", "XBT");
      let url;
      let data;
      let filename;

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
        case "candle":
          url = `https://api.kraken.com/0/public/OHLC?pair=${tradingPair}&interval=1`;
          filename = `${coin}_candle_data.csv`;
          break;
        default:
          return res
            .status(400)
            .json({ error: `${dataType} is not supported by the Kraken API` });
      }

      const response = await axios.get(url);
      const resultKey = Object.keys(response.data.result)[0];
      data = response.data.result[resultKey];

      if (dataType === "ohlc" || dataType === "candle") {
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
        data.sort((a, b) => new Date(a.time) - new Date(b.time));
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
      } else if (dataType === "tick") {
        data = data.map((item) => ({
          price: item[0],
          volume: item[1],
          time: new Date(item[2] * 1000).toISOString(),
          side: item[3],
          orderType: item[4],
        }));
      }

      const csvFile = saveCsvFile(data, filename);
      res.json({ csvFile });
    } catch (error) {
      console.error(`Error fetching ${dataType} data:`, error);
      res.status(500).json({ error: `Failed to fetch ${dataType} data` });
    }
  } else {
    res.status(400).json({ error: "Unsupported exchange" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
