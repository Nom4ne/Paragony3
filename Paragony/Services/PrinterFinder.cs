using System;
using System.Management;
using System.Text.RegularExpressions;

namespace ThermalPrinterMTP2P
{
    public static class PrinterFinder
    {
        public static string? FindComPortByNameAndMac(string printerName)
        {
            try
            {
                // 1. Znajdź adres MAC na podstawie nazwy drukarki
                string? macAddress = GetMacAddressByName(printerName);

                if (string.IsNullOrEmpty(macAddress))
                {
                    Console.WriteLine($"Nie znaleziono adresu MAC dla urządzenia: {printerName}");
                    return null;
                }

                Console.WriteLine($"Znaleziony MAC dla {printerName}: {macAddress}");

                // 2. Znajdź port COM przypisany do tego adresu MAC
                return FindComPortByMac(macAddress);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Błąd: {ex.Message}");
                return null;
            }
        }

        private static string? GetMacAddressByName(string printerName)
        {
            // Szukamy w encjach PnP urządzenia, które pasuje do nazwy
            using (var searcher = new ManagementObjectSearcher($"SELECT * FROM Win32_PnPEntity WHERE Caption LIKE '%{printerName}%'"))
            {
                foreach (var device in searcher.Get())
                {
                    string pnpId = device["PNPDeviceID"]?.ToString() ?? "";

                    // W identyfikatorach Bluetooth MAC to zazwyczaj 12 znaków HEX po znaku '&' lub '_'
                    // Przykładowy ID: BTHENUM\DEV_001122334455\7&23...
                    var match = Regex.Match(pnpId, @"([0-9A-Fa-f]{12})");
                    if (match.Success)
                    {
                        return match.Value.ToLower();
                    }
                }
            }
            return null;
        }

        private static string? FindComPortByMac(string macAddress)
        {
            // Szukamy wszystkich portów COM
            using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_PnPEntity WHERE Caption LIKE '%(COM%)'"))
            {
                foreach (var port in searcher.Get())
                {
                    string caption = port["Caption"]?.ToString() ?? "";
                    string pnpId = port["PNPDeviceID"]?.ToString()?.ToLower() ?? "";

                    // Sprawdzamy, czy identyfikator portu zawiera nasz adres MAC
                    if (pnpId.Contains(macAddress))
                    {
                        int start = caption.LastIndexOf("(COM");
                        if (start != -1)
                        {
                            int end = caption.LastIndexOf(")");
                            return caption.Substring(start + 1, end - start - 1);
                        }
                    }
                }
            }
            return null;
        }
    }
}