import customtkinter as ctk
import threading
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, WebDriverException
import pandas as pd
import time
import os
import datetime
from openpyxl import load_workbook
from openpyxl.styles import PatternFill

# --- Setup Modern UI Theme ---
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

# The exact list of countries you provided, formatted for display
VALID_COUNTRIES_DISPLAY = [
    "United States", "China", "Euro Area", "Germany", "Japan", "India", "United Kingdom",
    "France", "Italy", "Canada", "Brazil", "Russia", "South Korea", "Mexico", "Australia",
    "Spain", "Indonesia", "Turkey", "Saudi Arabia", "Netherlands", "Switzerland", "Poland",
    "Taiwan", "Belgium", "Argentina", "Sweden", "Ireland", "Singapore", "Israel",
    "United Arab Emirates", "Thailand", "Austria", "Norway", "Vietnam", "Philippines",
    "Bangladesh", "Iran", "Denmark", "Malaysia", "Colombia", "Hong Kong", "South Africa",
    "Egypt", "Romania", "Pakistan", "Czech Republic", "Chile", "Portugal", "Finland",
    "Peru", "Kazakhstan", "Iraq", "Algeria", "New Zealand", "Greece", "Hungary", "Qatar",
    "Ukraine", "Nigeria", "Kuwait", "Morocco", "Ethiopia", "Slovakia", "Puerto Rico",
    "Kenya", "Ecuador", "Dominican Republic", "Uzbekistan", "Guatemala", "Bulgaria",
    "Venezuela", "Cuba", "Oman", "Sri Lanka", "Costa Rica", "Croatia", "Luxembourg",
    "Serbia", "Ivory Coast", "Panama", "Lithuania", "Ghana", "Uruguay", "Angola",
    "Tanzania", "Belarus", "Azerbaijan", "Myanmar", "Slovenia", "Congo", "Turkmenistan",
    "Uganda", "Tunisia", "Jordan", "Cameroon", "Bolivia", "Macau", "Sudan", "Bahrain",
    "Libya", "Cambodia", "Latvia", "Paraguay", "Zimbabwe", "Nepal", "Estonia", "Honduras",
    "Cyprus", "El Salvador", "Georgia", "Iceland", "Papua New Guinea", "Senegal",
    "Bosnia and Herzegovina", "Albania", "Mali", "Armenia", "Zambia", "Trinidad and Tobago",
    "Guyana", "Haiti", "Guinea", "Malta", "Mongolia", "Burkina Faso", "Mozambique", "Chad",
    "Benin", "Gabon", "Nicaragua", "Niger", "Lebanon", "Jamaica", "Syria", "Yemen",
    "Botswana", "Moldova", "Macedonia", "Madagascar", "Kyrgyzstan", "Laos", "Afghanistan",
    "Bahamas", "Republic of the Congo", "Mauritius", "Brunei", "Rwanda", "Palestine",
    "Tajikistan", "Namibia", "Equatorial Guinea", "Somalia", "South Sudan", "Monaco",
    "Mauritania", "Malawi", "Kosovo", "Togo", "New Caledonia", "Montenegro", "Liechtenstein",
    "Sierra Leone", "Maldives", "Cayman Islands", "Fiji", "Liberia", "Suriname",
    "Swaziland", "Djibouti", "Gambia", "Central African Republic", "Cape Verde", "Bhutan",
    "Burundi", "Comoros", "Guinea Bissau", "East Timor", "Eritrea", "Lesotho", "Seychelles",
    "Sao Tome and Principe"
]

# Sort alphabetically for a better user experience
VALID_COUNTRIES_DISPLAY.sort()

# The 3 Macro Indicators we want to scrape
INDICATORS = {
    "Manufacturing PMI": "manufacturing-pmi",
    "ISM PMI": "non-manufacturing-pmi",
    "Business Confidence": "business-confidence"
    }

class WariScraperApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("WARI Extraction Platform")
        # Increased height slightly to accommodate the new scrollable list
        self.geometry("750x720")
        self.is_extracting = False

        # --- UI Layout ---
        self.title_label = ctk.CTkLabel(self, text="WARI Scraper", font=ctk.CTkFont(size=24, weight="bold"))
        self.title_label.pack(pady=(20, 5), padx=20, anchor="w")

        self.subtitle_label = ctk.CTkLabel(self, text="Trading Economics Forecast Extractor", text_color="gray", font=ctk.CTkFont(size=14))
        self.subtitle_label.pack(pady=(0, 10), padx=20, anchor="w")

        # --- Search & Select Frame ---
        self.input_frame = ctk.CTkFrame(self)
        self.input_frame.pack(pady=5, padx=20, fill="x")

        self.target_label = ctk.CTkLabel(self.input_frame, text="Select Target Countries:", font=ctk.CTkFont(weight="bold"))
        self.target_label.pack(pady=(10, 5), padx=15, anchor="w")

        # Search Bar
        self.search_entry = ctk.CTkEntry(self.input_frame, placeholder_text="🔍 Search for a country...", height=35)
        self.search_entry.pack(pady=(0, 5), padx=15, fill="x")
        # Bind the key release event to the filter function
        self.search_entry.bind("<KeyRelease>", self.filter_countries)

        # Scrollable Checkbox Area
        self.scroll_frame = ctk.CTkScrollableFrame(self.input_frame, height=140)
        self.scroll_frame.pack(pady=(0, 10), padx=15, fill="x")

        # Dictionaries to store the checkbox widgets and their variables
        self.checkbox_vars = {}
        self.checkbox_widgets = {}

        # Populate the scrollable frame
        for country in VALID_COUNTRIES_DISPLAY:
            var = ctk.BooleanVar(value=False)
            chk = ctk.CTkCheckBox(self.scroll_frame, text=country, variable=var)
            chk.pack(anchor="w", pady=3, padx=5)
            self.checkbox_vars[country] = var
            self.checkbox_widgets[country] = chk

            # Pre-select USA and Japan as defaults to mimic previous behavior
            if country in ["United States", "Japan"]:
                var.set(True)

        # --- Options Frame ---
        self.options_frame = ctk.CTkFrame(self.input_frame, fg_color="transparent")
        self.options_frame.pack(pady=(5, 10), padx=15, fill="x")

        self.headless_var = ctk.BooleanVar(value=True)
        self.headless_checkbox = ctk.CTkCheckBox(self.options_frame, text="Stealth Mode (Hidden Browser)", variable=self.headless_var)
        self.headless_checkbox.pack(side="left", padx=(0, 20))

        self.autorun_var = ctk.BooleanVar(value=False)
        self.autorun_switch = ctk.CTkSwitch(self.options_frame, text="Enable Auto-Run (Every 20 Mins)", variable=self.autorun_var, command=self.on_autorun_toggle)
        self.autorun_switch.pack(side="left")

        # --- Log TextBox ---
        self.log_label = ctk.CTkLabel(self, text="Activity Log:", font=ctk.CTkFont(weight="bold"))
        self.log_label.pack(pady=(10, 0), padx=20, anchor="w")

        self.log_box = ctk.CTkTextbox(self, height=150, state="disabled", font=ctk.CTkFont(family="Consolas", size=12))
        self.log_box.pack(pady=(5, 10), padx=20, fill="both", expand=True)

        # --- Action Buttons ---
        self.btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.btn_frame.pack(pady=(0, 15), padx=20, fill="x")

        self.start_btn = ctk.CTkButton(self.btn_frame, text="Run Extraction", height=45, font=ctk.CTkFont(weight="bold"), command=self.start_scraping_thread)
        self.start_btn.pack(side="left", fill="x", expand=True, padx=(0, 10))

        self.clear_btn = ctk.CTkButton(self.btn_frame, text="Clear Logs", height=45, fg_color="#444444", hover_color="#333333", command=self.clear_logs)
        self.clear_btn.pack(side="right", fill="x", expand=True, padx=(10, 0))

    def filter_countries(self, event=None):
        """Filters the checkboxes based on what is typed in the search bar"""
        search_query = self.search_entry.get().lower()
        for country, chk in self.checkbox_widgets.items():
            if search_query in country.lower():
                chk.pack(anchor="w", pady=3, padx=5) # Show it
            else:
                chk.pack_forget() # Hide it

    def log(self, message):
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        formatted_msg = f"[{timestamp}] {message}\n"

        def update_ui():
            self.log_box.configure(state="normal")
            self.log_box.insert("end", formatted_msg)
            self.log_box.see("end")
            self.log_box.configure(state="disabled")

        self.after(0, update_ui)

    def clear_logs(self):
        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.configure(state="disabled")

    def on_autorun_toggle(self):
        if self.autorun_var.get():
            self.start_btn.configure(text="Start Auto-Run Sequence")
            self.log("🔁 Auto-Run activated. The scraper will repeat every 20 minutes.")
        else:
            if not self.is_extracting:
                self.start_btn.configure(text="Run Extraction")
            self.log("🛑 Auto-Run disabled.")

    def start_scraping_thread(self):
        if self.is_extracting:
            self.log("⚠️ Scraper is currently busy.")
            return

        # Gather all checked countries
        selected_display_names = []
        for country, var in self.checkbox_vars.items():
            if var.get():
                selected_display_names.append(country)

        if not selected_display_names:
            self.log("⚠️ Please select at least one country from the list.")
            return

        # Convert display names ("United States") to slugs ("united-states") for the scraper
        countries = [c.lower().replace(" ", "-") for c in selected_display_names]

        self.is_extracting = True
        self.start_btn.configure(state="disabled", text="Extracting...")

        if self.autorun_var.get():
            thread = threading.Thread(target=self.autorun_loop, args=(countries, selected_display_names), daemon=True)
        else:
            thread = threading.Thread(target=self.single_run, args=(countries, selected_display_names), daemon=True)

        thread.start()

    def autorun_loop(self, countries, display_names):
        while self.autorun_var.get():
            self.after(0, lambda: self.start_btn.configure(text="Extracting..."))

            self.run_extraction(countries, display_names)

            if not self.autorun_var.get():
                break

            self.log("⏳ Extraction complete. Waiting for the next cycle...")

            total_seconds = 1200
            for remaining in range(total_seconds, 0, -1):
                if not self.autorun_var.get():
                    self.log("🛑 Auto-Run loop stopped by user.")
                    break

                mins, secs = divmod(remaining, 60)
                timer_format = f"{mins:02d}:{secs:02d}"
                self.after(0, lambda t=timer_format: self.start_btn.configure(text=f"Next run in {t}..."))
                time.sleep(1)

        self.is_extracting = False
        self.after(0, lambda: self.start_btn.configure(state="normal", text="Run Extraction"))

    def single_run(self, countries, display_names):
        self.run_extraction(countries, display_names)
        self.is_extracting = False
        self.after(0, lambda: self.start_btn.configure(state="normal", text="Run Extraction"))

    def run_extraction(self, countries, display_names):
        self.log(f"🚀 Initializing extraction for: {', '.join(display_names)}")

        output_dir = os.path.join(os.getcwd(), "outputs")
        os.makedirs(output_dir, exist_ok=True)

        date_str = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
        name_prefix = "_".join(countries[:3])
        if len(countries) > 3: name_prefix += "_etc"
        filename = f"{name_prefix}_Forecast_{date_str}.xlsx"
        output_filepath = os.path.join(output_dir, filename)

        options = Options()
        if self.headless_var.get(): options.add_argument('--headless')
        options.add_argument('--disable-gpu')
        options.add_argument('--log-level=3')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

        matrices_val = {}

        MAX_RETRIES = 3

        try:
            driver = webdriver.Chrome(options=options)

            for sheet_name, indicator in INDICATORS.items():
                self.log(f"📈 Starting Data Pull: {sheet_name}")
                all_extracted_data = []

                for country in countries:
                    url = f"https://tradingeconomics.com/{country}/{indicator}"
                    success = False

                    for attempt in range(1, MAX_RETRIES + 1):
                        try:
                            if attempt == 1:
                                self.log(f"  -> 🌍 Loading {country.replace('-', ' ').title()}...")
                            else:
                                self.log(f"  -> 🔄 Retry {attempt}/{MAX_RETRIES} for {country.replace('-', ' ').title()}...")
                                # Restart browser on retry to get a fresh connection
                                try:
                                    driver.quit()
                                except Exception:
                                    pass
                                time.sleep(3)
                                driver = webdriver.Chrome(options=options)

                            driver.get(url)
                            time.sleep(4)

                            try:
                                driver.execute_script("document.querySelector('a[href=\"#forecast\"]').click();")
                                time.sleep(3)
                                try:
                                    driver.execute_script("""
                                        var timeButtons = document.querySelectorAll('.range-item, [data-range="5y"], button');
                                        var found = false;
                                        for (var btn of timeButtons) {
                                            if (btn.textContent && btn.textContent.trim() === '5Y') {
                                                btn.click();
                                                found = true;
                                                break;
                                            }
                                        }
                                        if (!found) {
                                            var fiveYLink = document.querySelector('a[href*="5y"], [data-range="5y"], .btn-5y');
                                            if (fiveYLink) fiveYLink.click();
                                        }
                                    """)
                                    time.sleep(3)
                                except Exception as e:
                                    self.log(f"     ℹ️ Could not select 5Y option: {str(e)[:60]}. Continuing with default.")
                            except Exception:
                                self.log(f"     ⚠️ Could not find forecast for {country}. Skipping.")
                                break  # No point retrying if the forecast tab doesn't exist

                            js_code = """
                            try {
                                var charts = Highcharts.charts.filter(c => !!c && c.series && c.series.length > 0);
                                if (charts.length === 0) return { error: "No chart found" };

                                var chart = charts[charts.length - 1];
                                var pts = [];

                                for (var s = 0; s < chart.series.length; s++) {
                                    var series = chart.series[s];
                                    if (!series.data) continue;

                                    for (var i = 0; i < series.data.length; i++) {
                                        var point = series.data[i];
                                        if (point && point.y !== null && point.y !== undefined) {
                                            var xVal = point.category || point.name || point.x;
                                            var dateStr = '';
                                            if (!isNaN(xVal) && parseInt(xVal) > 1000000000000) {
                                                var d = new Date(parseInt(xVal));
                                                var yr = d.getUTCFullYear();
                                                var mo = String(d.getUTCMonth() + 1).padStart(2, '0');
                                                dateStr = yr + '-' + mo + '-01';
                                            } else {
                                                dateStr = String(xVal);
                                            }

                                            var ptColor = String(point.color || series.color || "unknown").toLowerCase();
                                            if (point.graphic && point.graphic.element) {
                                                ptColor = String(point.graphic.element.getAttribute('fill') || ptColor).toLowerCase();
                                            }

                                            var isForecast = (s > 0 || ptColor.includes('205') || ptColor.includes('cdcdcd') || ptColor.includes('ccc') || ptColor.includes('d9d9d9'));
                                            pts.push({ "Timeframe": dateStr, "Value": point.y, "Is_Forecast": isForecast });
                                        }
                                    }
                                }
                                return pts;
                            } catch(err) { return "ERROR: " + err.message; }
                            """

                            chart_data = driver.execute_script(js_code)
                            if isinstance(chart_data, str) and chart_data.startswith("ERROR"):
                                self.log(f"     ⚠️ Chart data error on attempt {attempt}. Retrying...")
                                continue

                            formatted_country_name = country.replace("-", " ").title()
                            for point in chart_data:
                                point["Country"] = formatted_country_name
                                all_extracted_data.append(point)

                            success = True
                            break  # Success — exit retry loop

                        except (TimeoutException, WebDriverException) as e:
                            self.log(f"     ⏳ Attempt {attempt}/{MAX_RETRIES} failed for {country}: {str(e)[:60]}")
                            if attempt < MAX_RETRIES:
                                self.log(f"     🔄 Will restart browser and retry...")
                            else:
                                self.log(f"     ❌ All {MAX_RETRIES} attempts failed for {country}. Skipping.")
                        except Exception as e:
                            self.log(f"     ❌ Unexpected error for {country}: {e}")
                            break  # Don't retry on unexpected errors

                if all_extracted_data:
                    df = pd.DataFrame(all_extracted_data)
                    try:
                        df['Timeframe'] = pd.to_datetime(df['Timeframe'])
                    except Exception:
                        pass

                    df_sorted = df.sort_values(['Country', 'Timeframe', 'Is_Forecast']).copy()
                    df_sorted = df_sorted.drop_duplicates(subset=['Country', 'Timeframe', 'Value'], keep='last')
                    df_sorted['Timeframe'] = df_sorted['Timeframe'].astype(str)
                    matrices_val[sheet_name] = df_sorted[['Country', 'Timeframe', 'Value', 'Is_Forecast']]

        except Exception as e:
            self.log(f"❌ Webdriver Error: {e}")
        finally:
            if 'driver' in locals(): driver.quit()

        if matrices_val:
            self.log("📊 Compiling Excel File with Vertical Format...")

            with pd.ExcelWriter(output_filepath, engine='openpyxl') as writer:
                for sheet_name, df_vertical in matrices_val.items():
                    df_vertical.to_excel(writer, index=False, sheet_name=sheet_name)

            self.log("🎨 Applying grey highlights to forecast rows...")

            wb = load_workbook(output_filepath)
            grey_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")

            for sheet_name, df_vertical in matrices_val.items():
                if sheet_name in wb.sheetnames:
                    ws = wb[sheet_name]
                    for row_idx, is_forecast in enumerate(df_vertical['Is_Forecast'], start=2):
                        if is_forecast == True:
                            ws.cell(row=row_idx, column=3).fill = grey_fill

            wb.save(output_filepath)
            self.log(f"🎉 DONE! Saved to: outputs/{filename}")
        else:
            self.log("⚠️ No data was found for any indicator.")

if __name__ == "__main__":
    app = WariScraperApp()
    app.mainloop()
