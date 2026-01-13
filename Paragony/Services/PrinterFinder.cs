using System;
using System.Management;

namespace ThermalPrinterMTP2P
{
    public static class PrinterFinder
    {
        public static string? FindComPort(string printerName)
        {
            try
            {
                // Zapytanie WMI szukające urządzeń szeregowych
                using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_PnPEntity WHERE Caption LIKE '%(COM%)'"))
                {
                    var portList = searcher.Get();

                    foreach (var port in portList)
                    {
                        string caption = port["Caption"]?.ToString() ?? "";
                        string pnpDeviceId = port["PNPDeviceID"]?.ToString() ?? "";

                        // Sprawdzamy, czy nazwa drukarki znajduje się w opisie urządzenia 
                        // lub czy ID urządzenia wskazuje na Bluetooth
                        if (caption.Contains(printerName) || pnpDeviceId.Contains("BTHENUM"))
                        {
                            // Wyciągamy nazwę portu, np. "COM3" z ciągu "MTP-II (COM3)"
                            int start = caption.LastIndexOf("(COM");
                            if (start != -1)
                            {
                                int end = caption.LastIndexOf(")");
                                return caption.Substring(start + 1, end - start - 1);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Błąd podczas szukania portu: {ex.Message}");
            }

            return null; // Nie znaleziono
        }
    }
}