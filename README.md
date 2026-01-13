# Sales Management & Receipt Printing System

**Author:** Karol Bogdan
**Date:** December 4, 2025

##  Overview

This is a fully implemented IT system designed to manage the sales process and generate printouts on thermal printers. The application interfaces with mobile devices compliant with the **ESC/POS** standard, specifically **MPT-II** and **YHD8390** models.

Key characteristics of the application include a modern user interface with Dark Mode support, high security via two-factor authentication (2FA SMS), and high performance achieved by moving computational logic to the PostgreSQL database layer.

##  Tech Stack

### Backend
* **.NET 8** & **C# 12.0**
* **ASP.NET Core Web API**
* **Database:** PostgreSQL + Entity Framework Core (leveraging PL/pgSQL stored procedures)

### Frontend
* **React**
* **Tailwind CSS**
* **Lucide-React** (icons)
* **HTTP Communication:** Custom Hook based on Native Fetch API (handling headers and tokens)

### Hardware Integration
* **Protocol:** ESC/POS
* **Supported Devices:** MPT-II, YHD8390
* **Communication:** Full communication with thermal printers via the ESC/POS protocol.

##  Getting Started

### Prerequisites
* **Node.js** is required to run the frontend environment.

### Installation & Startup

**Note:** The whole frontend code is located in the `paragon-system` folder.

**Method 1: General Setup**
1. Create a user (e.g., `system_paragonow`) with the `CREATEDB` privilege.
2. Log in as this user and create a database (e.g., named `Paragony`).
3. Import the database dump file.
4. **Important:** Update the `appsettings.json` file in the backend project with the correct database connection string and credentials.
   
2. **Frontend Setup:**
   Open your terminal, navigate to the frontend directory, and start the React application:
   ```bash
   cd .\Paragony\paragon-system\
   npm start
##  Printer Setup and Connection

To ensure proper communication with the thermal printers, follow the steps below depending on your connection method.

### 1. USB-C Connection (Driver Configuration)
For USB communication, the system requires the **WinUSB** driver to be assigned to the device using the **Zadig** tool.

1. **Download Zadig:** Visit [zadig.akeo.ie](https://zadig.akeo.ie/) and download the application.
2. **Enable Device Discovery:**
   * Open Zadig.
   * Go to the `Options` menu and select **List All Devices**.
3. **Select Device:**
   * From the dropdown list, find and select **Microprinter**.
4. **Install Driver:**
   * Ensure **WinUSB** is selected in the target driver box.
   * Click **Replace Driver** (or **Install Driver**).
5. **Configuration:**
   * Note the **Vendor ID** and **Product ID** displayed in Zadig.
   * Update these values in your configuration file to match your specific device.

### 2. Bluetooth Connection
1. **Pairing:** Pair the thermal printer with your operating system's Bluetooth settings.
2. **COM Port Mapping:**
   * Identify the assigned COM port in the System Device Manager.
   * Update the COM port in the printer class constructor.
   * *Note: If printing fails, try alternative COM ports assigned to the device, as some printers create multiple interfaces.*
