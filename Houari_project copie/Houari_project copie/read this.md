# 📊 WARI Extraction Platform (TradingEconomics Forecast Scraper)

> **Complete Technical Documentation & User Guide**  
> *Project Name:* **WARI Scraper / Houari Project**  
> *Domain:* Macroeconomic Intelligence, Forex Fundamental Analysis, Quantitative Trading Data  
> *Target Source:* [TradingEconomics.com](https://tradingeconomics.com)  

---

## 📑 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Project Directory & File Structure](#3-project-directory--file-structure)
4. [Macroeconomic Indicators Monitored](#4-macroeconomic-indicators-monitored)
5. [Core Features & UI Capabilities](#5-core-features--ui-capabilities)
6. [Deep-Dive: The Extraction Engine](#6-deep-dive-the-extraction-engine)
7. [Data Output & Excel Formatting](#7-data-output--excel-formatting)
8. [Windows vs. macOS Implementation Details](#8-windows-vs-macos-implementation-details)
9. [Installation & Setup Guide](#9-installation--setup-guide)
10. [How to Run the Application](#10-how-to-run-the-application)
11. [Troubleshooting & Common Issues](#11-troubleshooting--common-issues)
12. [Configuration & Customization Guide](#12-configuration--customization-guide)
13. [Technical Specifications & Dependencies](#13-technical-specifications--dependencies)

---

## 1. Executive Summary

The **WARI Extraction Platform** is an automated desktop intelligence application engineered for Forex traders, macro analysts, and quantitative researchers. Its primary mission is to extract, normalize, structure, and export historical and forecast macroeconomic indicators directly from **TradingEconomics**.

Traditional web scrapers struggle with TradingEconomics because its forecast data is dynamically generated inside interactive **Highcharts** SVG/Canvas graphs rather than standard HTML tables. The WARI Scraper overcomes this challenge by using **Selenium WebDriver** in tandem with **in-memory JavaScript extraction**: it intercepts the underlying Highcharts data model straight from browser memory, differentiates historical readings from forward-looking forecast points via series classification and SVG fill colors, and compiles the time series into structured, professionally styled Excel (`.xlsx`) workbooks with shaded forecast projections.

---

## 2. High-Level Architecture

The platform combines a non-blocking GUI frontend with a headless browser scraping engine and an Excel formatting pipeline:

```
┌────────────────────────────────────────────────────────────────────────┐
│                         WARI Desktop GUI (CustomTkinter)                │
│  - Country Search & Multi-Selection (163 Sovereign Economies)          │
│  - Stealth Mode Toggle (Headless / Headed Chrome)                      │
│  - Auto-Run Scheduler (Periodic 20-Minute Recurring Extractions)       │
│  - Real-Time Timestamped Event Log Console                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Spawns Background Worker Thread
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Selenium Chrome WebDriver                       │
│  - Navigates to TradingEconomics endpoints: /{country}/{indicator}     │
│  - Triggers Forecast tab click event via DOM injection                 │
│  - Optionally triggers 5Y chart timeframe button                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Executes In-Memory JavaScript
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Highcharts Data Extraction Engine                  │
│  - Inspects `window.Highcharts.charts` global memory array             │
│  - Extracts X-values (ISO Date strings) and Y-values (Indicator numbers│
│  - Inspects Series index (s > 0) & Point Fill colors (grey shades)     │
│  - Flags datapoints: Is_Forecast = True / False                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Returns JSON Array to Python
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Pandas Data Structuring Pipeline                   │
│  - Windows: Horizontal Matrix / Pivot Table (Rows: Country, Cols: Time)│
│  - Mac: Vertical Time Series Table (Country | Timeframe | Value | ...) │
│  - Deduplicates and chronologically orders historical & forecast series│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Compiles Multi-Tab Workbook
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      OpenPyXL Workbook Styling Engine                  │
│  - Generates multi-sheet .xlsx file (One sheet per Macro Indicator)    │
│  - Identifies Forecast data cells                                      │
│  - Applies solid grey background fill (`#D9D9D9`) to forecast prints   │
│  - Saves output with timestamp: outputs/{prefix}_Forecast_{date}.xlsx  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Project Directory & File Structure

```text
Houari_project copie/
│
├── requirements.txt             # Python package dependencies
├── read this.md                 # Complete project documentation (this file)
│
├── outputs/                     # Root-level output and sample folder
│   └── sample_of_output.xlsx    # Sample Excel output demonstrating structure
│
├── For Win/                     # Dedicated Windows distribution
│   ├── Run_WARI.bat             # 1-Click Windows batch launcher (checks Python & installs deps)
│   ├── wari_scraper_app.py      # Main Windows application script
│   └── outputs/                 # Target folder for generated Windows Excel files
│       └── australia_japan_kuwait_etc_Forecast_2026-04-18_20-07.xlsx
│
└── ForMac/                      # Dedicated macOS distribution
    ├── Run_WARI.command         # 1-Click macOS executable bash script
    ├── wari_scraper_app copy.py # macOS Python application script
    ├── dont_open.py             # Advanced macOS version with 5Y button auto-clicker
    └── outputs/                 # Target folder for generated macOS Excel files
        ├── australia_Forecast_2026-05-14_19-45.xlsx
        ├── japan_united-states_Forecast_2026-05-25_18-19.xlsx
        └── ... (historical extraction logs)
```

---

## 4. Macroeconomic Indicators Monitored

The system is configured to track two complementary sets of macroeconomic indicators across the Windows and Mac distributions:

### A. Windows Version (`For Win/wari_scraper_app.py`)
Focuses on **Core Macro Fundamentals**:
1. **GDP Growth (Annual)**:
   - *TradingEconomics Slug:* `gdp-growth-annual`
   - *URL Pattern:* `https://tradingeconomics.com/{country}/gdp-growth-annual`
   - *Importance:* Measures annualized economic expansion/contraction; foundational for currency valuation.
2. **Inflation Rate (CPI)**:
   - *TradingEconomics Slug:* `inflation-cpi`
   - *URL Pattern:* `https://tradingeconomics.com/{country}/inflation-cpi`
   - *Importance:* Consumer Price Index inflation; primary driver of central bank interest rate decisions.
3. **Interest Rate**:
   - *TradingEconomics Slug:* `interest-rate`
   - *URL Pattern:* `https://tradingeconomics.com/{country}/interest-rate`
   - *Importance:* Benchmark central bank policy rate; directly impacts carry trades and sovereign yields.

### B. macOS Version (`ForMac/wari_scraper_app copy.py` & `dont_open.py`)
Focuses on **Leading Business Cycle & Sentiment Indicators**:
1. **Manufacturing PMI**:
   - *TradingEconomics Slug:* `manufacturing-pmi`
   - *URL Pattern:* `https://tradingeconomics.com/{country}/manufacturing-pmi`
   - *Importance:* Purchasing Managers' Index for manufacturing; leading indicator of economic momentum (threshold: 50.0).
2. **ISM PMI / Non-Manufacturing PMI**:
   - *TradingEconomics Slug:* `non-manufacturing-pmi`
   - *URL Pattern:* `https://tradingeconomics.com/{country}/non-manufacturing-pmi`
   - *Importance:* Services sector health and economic expansion indicators.
3. **Business Confidence**:
   - *TradingEconomics Slug:* `business-confidence`
   - *URL Pattern:* `https://tradingeconomics.com/{country}/business-confidence`
   - *Importance:* Corporate sentiment, future capital expenditure expectations, and hiring sentiment.

---

## 5. Core Features & UI Capabilities

The user interface is built on **CustomTkinter**, delivering a modern dark-mode desktop GUI with fluid responsiveness:

1. **Alphabetical Country Registry (163 Nations)**:
   - Contains 163 countries ranging from major G10/G20 powers to emerging economies.
   - Pre-selects **United States** and **Japan** by default upon launch.
2. **Real-Time Interactive Search Filter**:
   - As you type in the search bar (e.g., `"uni"` or `"jap"`), the scrollable list dynamically hides non-matching checkboxes and displays matching countries instantly.
3. **Stealth Mode (Headless Browser)**:
   - Checkbox enabled by default: Chrome runs invisibly in the background.
   - Unchecking the box runs Chrome visibly, allowing you to watch the browser load pages, click forecast tabs, and extract data in real time.
4. **Auto-Run Scheduler (20-Minute Recurring Interval)**:
   - Activating the switch launches an autonomous background loop.
   - Once an extraction finishes, a countdown timer starts (1200 seconds / 20 minutes) and updates the main button label every second (`Next run in 19:42...`).
   - The user can toggle off Auto-Run at any moment to cancel the timer.
5. **Multi-Threaded Non-Blocking Architecture**:
   - All network calls and browser tasks run in background daemon threads (`threading.Thread`).
   - The GUI remains 100% responsive, never freezes, and continuously displays real-time activity logs.
6. **Activity Log Terminal**:
   - Embedded Consolas-font console with timestamped entries:
     ```text
     [20:07:12] 🚀 Initializing extraction for: Australia, Japan, Kuwait
     [20:07:13] 📈 Starting Data Pull: GDP Growth
     [20:07:13]   -> 🌍 Loading Australia...
     [20:07:22] 📊 Compiling Excel File with Multiple Sheets...
     [20:07:23] 🎨 Applying grey highlights to forecast cells...
     [20:07:24] 🎉 DONE! Saved to: outputs/australia_japan_kuwait_etc_Forecast_...
     ```

---

## 6. Deep-Dive: The Extraction Engine

### Why Traditional Scraping Fails on TradingEconomics
TradingEconomics protects and plots forecast figures using interactive **Highcharts** elements. The numbers are rendered dynamically in SVG `<path>` and `<circle>` tags via client-side JavaScript calculations. Scraping the raw HTML `<table>` elements frequently yields incomplete historical points or misses future quarterly forecasts.

### How WARI Solves This
1. **Automated Forecast Tab Activation**:
   The scraper triggers the forecast view using JavaScript:
   ```javascript
   document.querySelector('a[href="#forecast"]').click();
   ```
2. **Timeframe Selection (Present in `dont_open.py`)**:
   In the experimental Mac build, the scraper automatically locates and clicks the `5Y` chart range button to maximize historical data density:
   ```javascript
   var timeButtons = document.querySelectorAll('.range-item, [data-range="5y"], button');
   for (var btn of timeButtons) {
       if (btn.textContent && btn.textContent.trim() === '5Y') {
           btn.click();
           break;
       }
   }
   ```
3. **In-Memory JavaScript Interception**:
   Selenium executes an injected JavaScript routine directly inside Chrome's V8 engine:
   - Queries `window.Highcharts.charts` (focusing on `#trading_chart`).
   - Cycles through every series (`chart.series[s]`) and every datapoint (`series.data[i]`).
   - Decodes millisecond epoch timestamps (`> 1,000,000,000,000`) into standardized ISO dates (`YYYY-MM-DD`).
   - **Forecast Identification Algorithm**:
     A point is flagged as `Is_Forecast = true` if:
     - It belongs to a secondary series (`s > 0`), OR
     - The SVG fill color or point color contains grey identifiers (`'205'`, `'cdcdcd'`, `'ccc'`, or `'d9d9d9'`).
4. **Data Normalization**:
   The extracted points are returned as a Python dictionary list:
   `[{"Timeframe": "2024-06-01", "Value": 3.1, "Is_Forecast": false, "Country": "United States"}, ...]`

---

## 7. Data Output & Excel Formatting

Every execution generates a timestamped Excel workbook in the `outputs/` folder:
- Filename format: `{country1}_{country2}_{country3}_[etc]_Forecast_{YYYY-MM-DD_HH-MM}.xlsx`

### Layout Comparison: Windows vs. Mac

#### 1. Windows Layout: Horizontal Matrix (Pivot Table)
Ideal for cross-sectional comparison across multiple nations on a shared timeline:
- **Sheet Names:** One tab per indicator (`GDP Growth`, `Inflation`, `Interest Rate`).
- **Rows:** Countries.
- **Columns:** Chronological time periods (`2023-03-01`, `2023-06-01`, ..., `2026-09-01`).
- **Forecast Highlighting:** Cells representing forecast periods are filled with **solid light grey (`#D9D9D9`)**.

*Illustration of Windows Matrix Sheet:*
| Country | 2023-03-01 | 2023-06-01 | 2023-09-01 | 2023-12-01 | 2024-03-01 | 2025-06-01 (Forecast) | 2025-09-01 (Forecast) |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **Australia** | 2.8 | 2.3 | 2.2 | 1.3 | 1.1 | <mark style="background-color:#d9d9d9">1.4</mark> | <mark style="background-color:#d9d9d9">1.6</mark> |
| **Japan** | 1.8 | 1.0 | 0.0 | 0.0 | -1.3 | <mark style="background-color:#d9d9d9">0.8</mark> | <mark style="background-color:#d9d9d9">0.9</mark> |
| **United States** | 2.3 | 2.8 | 3.2 | 3.4 | 2.9 | <mark style="background-color:#d9d9d9">2.1</mark> | <mark style="background-color:#d9d9d9">2.0</mark> |

#### 2. macOS Layout: Vertical Time Series
Ideal for tabular data analysis, algorithmic backtesting, and relational database ingestion:
- **Sheet Names:** One tab per indicator (`Manufacturing PMI`, `ISM PMI`, `Business Confidence`).
- **Columns:** `Country`, `Timeframe`, `Value`, `Is_Forecast`.
- **Forecast Highlighting:** Any row where `Is_Forecast == True` has its `Value` column cell highlighted in **grey (`#D9D9D9`)**.

*Illustration of macOS Vertical Sheet:*
| Country | Timeframe | Value | Is_Forecast |
| :--- | :--- | :--- | :--- |
| Australia | 2025-07-01 | 51.3 | False |
| Australia | 2025-08-01 | 53.0 | False |
| Australia | 2025-09-01 | 51.4 | False |
| Australia | 2026-06-01 | <mark style="background-color:#d9d9d9">52.1</mark> | True |

---

## 8. Windows vs. macOS Implementation Details

| Feature / Property | Windows (`For Win/`) | macOS (`ForMac/`) |
| :--- | :--- | :--- |
| **Main Python Script** | `wari_scraper_app.py` | `wari_scraper_app copy.py` (or `dont_open.py`) |
| **Launcher Script** | `Run_WARI.bat` (Batch Script) | `Run_WARI.command` (Bash Shell Script) |
| **Tracked Indicators** | GDP Growth, Inflation Rate, Interest Rate | Manufacturing PMI, ISM PMI, Business Confidence |
| **Excel Structure** | Horizontal Pivot Matrix (Country x Date) | Vertical Record Table (Country, Date, Value) |
| **Retry Mechanism** | Single attempt per country | `MAX_RETRIES = 3` with browser restart on failure |
| **Chart Range Auto-Click** | Default view | Attempts 5Y button click (in `dont_open.py`) |
| **Python Execution Command**| `python wari_scraper_app.py` | `python3 wari_scraper_app.py` |

> [!WARNING]
> **Important Note for macOS Users:**  
> The file inside `ForMac/` is currently named `wari_scraper_app copy.py`. However, the launcher `Run_WARI.command` executes `python3 wari_scraper_app.py`.  
> If running on Mac, ensure you rename `wari_scraper_app copy.py` to `wari_scraper_app.py` (or duplicate it with that name) so the launcher finds it without errors.

---

## 9. Installation & Setup Guide

### System Prerequisites
1. **Python 3.9+** installed on your system:
   - Windows: Download from [python.org](https://www.python.org/downloads/) (Make sure to check **"Add Python to PATH"** during installation).
   - macOS: Install via [python.org](https://www.python.org/downloads/) or via Homebrew (`brew install python3`).
2. **Google Chrome Browser**:
   - Ensure standard Google Chrome is installed.
   - Selenium 4.x automatically manages the matching ChromeDriver binary via `selenium-manager`.

### Automated Installation
Both distribution folders contain scripts that automatically detect missing packages and install them on first launch:
- On Windows: Run `For Win/Run_WARI.bat`
- On Mac: Run `ForMac/Run_WARI.command`

### Manual Installation (Virtual Environment Recommended)
If you prefer running directly from terminal:
```bash
# 1. Open terminal in the project root directory
cd "Houari_project copie"

# 2. Create a virtual environment
python -m venv venv

# 3. Activate the environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt
```

---

## 10. How to Run the Application

### Method A: Running on Windows
1. Double-click `For Win/Run_WARI.bat`.
2. A command prompt will open, verifying Python and checking packages (`customtkinter`, `selenium`, `pandas`, `openpyxl`).
3. The **WARI Scraper** GUI will open.
4. **Select Countries**:
   - Use the search bar to find countries, or browse the scrollable list.
   - Check the boxes for the countries you wish to extract.
5. **Configure Options**:
   - Leave **Stealth Mode** checked for silent operation, or uncheck to observe Chrome.
   - Toggle **Enable Auto-Run** if you want automated scrapes every 20 minutes.
6. Click **Run Extraction**.
7. Observe the **Activity Log**. When finished, a success message will indicate the filename in `For Win/outputs/`.

### Method B: Running on macOS
1. Open Terminal and navigate to the `ForMac` directory:
   ```bash
   cd "ForMac"
   ```
2. If `wari_scraper_app.py` is not present, create it from the copy:
   ```bash
   cp "wari_scraper_app copy.py" "wari_scraper_app.py"
   ```
3. Make the `.command` script executable:
   ```bash
   chmod +x Run_WARI.command
   ```
4. Double-click `Run_WARI.command` in Finder (or run `python3 wari_scraper_app.py`).

---

## 11. Troubleshooting & Common Issues

### 1. "Could not find forecast for [Country]. Skipping."
- **Cause:** Certain smaller frontier economies do not have forecast models published on TradingEconomics for specific indicators (e.g., Business Confidence in low-density reporting countries).
- **Resolution:** This is normal behavior. The scraper will log the message, gracefully skip the unavailable indicator, and continue processing the remaining countries.

### 2. Chrome Crashes or WebDriver Error
- **Cause:** Chrome updated in the background, or an older orphaned ChromeDriver instance is locked in memory.
- **Resolution:**
  - Close any background Chrome processes via Task Manager (Windows) or Activity Monitor (Mac).
  - Run `pip install --upgrade selenium` to update Selenium Manager.

### 3. macOS: "Run_WARI.command cannot be opened because it is from an unidentified developer"
- **Cause:** macOS Gatekeeper security restriction.
- **Resolution:** Right-click `Run_WARI.command` -> Select **Open** -> Click **Open** in the dialog.

### 4. Excel File is Locked or Won't Save
- **Cause:** The previous output file is currently open in Microsoft Excel.
- **Resolution:** Close Microsoft Excel before running an extraction so openpyxl can write the file.

---

## 12. Configuration & Customization Guide

All scraper settings are modular and can be customized directly in `wari_scraper_app.py`:

### Changing or Adding Indicators
In `wari_scraper_app.py`, update the `INDICATORS` dictionary:
```python
INDICATORS = {
    "GDP Growth": "gdp-growth-annual",
    "Inflation": "inflation-cpi",
    "Interest Rate": "interest-rate",
    "Unemployment Rate": "unemployment-rate",      # Added
    "Government Debt to GDP": "government-debt-to-gdp" # Added
}
```
*Make sure the slug matches the URL suffix on tradingeconomics.com.*

### Adjusting the Auto-Run Frequency
In `autorun_loop()`, adjust `total_seconds`:
```python
# Default is 1200 seconds (20 minutes)
total_seconds = 1800  # Change to 30 minutes
```

### Changing Default Pre-Selected Countries
In `__init__()`, modify the pre-selection logic:
```python
# Pre-select desired default countries
if country in ["United States", "Euro Area", "United Kingdom", "Japan"]:
    var.set(True)
```

### Switching Between Matrix and Vertical Formats
To use the horizontal pivot format on Mac or the vertical format on Windows, simply copy the DataFrame formatting block:
- **Horizontal Pivot Block** (Lines 324–333 in `For Win/wari_scraper_app.py`).
- **Vertical Sorting Block** (Lines 373–384 in `ForMac/wari_scraper_app copy.py`).

---

## 13. Technical Specifications & Dependencies

| Library | Min Version | Role in Project |
| :--- | :--- | :--- |
| **`customtkinter`** | `>= 5.2.2` | Dark-mode graphical user interface, event loops, responsive UI elements |
| **`selenium`** | `>= 4.15.2`| Automated browser control, DOM interaction, JavaScript execution |
| **`pandas`** | `>= 2.1.4` | Data aggregation, time series ordering, pivot tables, deduplication |
| **`openpyxl`** | `>= 3.1.2` | Low-level Excel workbook generation and cell pattern styling |
| **`Python`** | `>= 3.9` | Core runtime environment |
| **`Google Chrome`** | Latest | Browser engine executing Highcharts rendering |

---

*Documentation compiled and maintained for the WARI Extraction Project.*
