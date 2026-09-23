#!/bin/bash
echo "Starting WARI Extraction Platform..."

# Check if Python is installed (Mac uses python3 by default)
if ! command -v python3 &> /dev/null
then
    echo "[ERROR] Python 3 is not installed!"
    echo "Please install it from python.org"
    read -p "Press [Enter] to close..."
    exit
fi

# FAST CHECK: See if libraries are already installed
python3 -c "import customtkinter, selenium, pandas, openpyxl" &> /dev/null
if [ $? -ne 0 ]; then
    echo "Setting up WARI Scraper for the first time... Please wait."
    pip3 install customtkinter selenium pandas openpyxl -q
fi

# Navigate to the folder where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Launch the App
python3 wari_scraper_app.py
