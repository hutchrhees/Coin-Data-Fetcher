# Crypto Data Fetcher

This project is a simple web application that fetches cryptocurrency data from multiple exchanges (currently only Kraken, Coinbase, and Binace.US). It supports fetching OHLC, Order Book, and Tick data. The fetched data can be downloaded as CSV files and viewed in a tabular format on the front end.

## Features

- Fetch OHLC, Order Book, and Tick data from multiple exchanges.
- View data in a tabular format.
- Download data as CSV files.

## Prerequisites

- [Node.js](https://nodejs.org/) (v12 or later)
- [npm](https://www.npmjs.com/) (Node package manager)

## Getting Started

### Clone the Repository

```sh
git clone https://github.com/hutchrhees/crypto-data-fetcher.git
cd crypto-data-fetcher
```

### Install Dependencies

```sh
npm install
```

### Create Necessary Directories

Ensure that the `csvs` directory exists for storing CSV files:

```sh
mkdir csvs
```

### Start the Server

```sh
node server.js
```

The server will start running at `http://localhost:3000`.

### Usage

1. **Open your browser and navigate to `http://localhost:3000`.**
2. **Select the exchange.**
3. **Select the cryptocurrency coin from the dropdown.**
4. **Optionally, specify an end date.**
5. **Click the "Fetch Data" button to retrieve the data.**
6. **Click on different tabs to view different data sets (OHLC, Order Book, Tick).**
7. **Download the respective CSV files by clicking on the "Download CSV" links.**

## Project Structure

- `server.js`: The main server file that handles API requests and serves the static files.
- `public/`: Contains the static files (HTML, CSS, JS).
  - `index.html`: The main HTML file for the web application.
  - `script.js`: The JavaScript file that handles the front-end logic.
  - `style.css`: The CSS file for styling the web application.
- `csvs/`: Directory for storing the generated CSV files.
