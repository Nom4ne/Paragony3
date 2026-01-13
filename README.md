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

1. **Frontend Setup:**
   Open your terminal, navigate to the frontend directory, and start the React application:
   ```bash
   cd .\Paragony\paragon-system\
   npm start
