using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.IO.Ports;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Threading;
using LibUsbDotNet;
using LibUsbDotNet.Info;
using LibUsbDotNet.Main;

namespace ThermalPrinterMTP2P
{
    // === 1. Klasa konfiguracji ===
    public class PrinterSettings
    {
        
        public int Vid { get; set; } //= 0x0483;
        public int Pid { get; set; } //= 0x5743;
        public int PaperWidthPx { get; set; }
        public int FontSizeNormal { get; set; }
        public int FontSizeHeader { get; set; }
        public int FontSizeSmall { get; set; }
        public int MarginLeft { get; set; } 
        public int MarginRight { get; set; } 
        public int ChunkSize { get; set; }  

        public string PrinterName { get; set; }
    }

    public class ReceiptItem
    {
        public string Name { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string VatRate { get; set; }
    }

    public enum PrinterConnectionType
    {
        USB,
        Bluetooth
    }

    public class ThermalPrinter : IDisposable
    {
        private PrinterSettings _settings;
        private const string CONFIG_FILE = "printer_config.json";

        private PrinterConnectionType _connectionType;
        private UsbDevice _device;
        private UsbEndpointWriter _writer;
        private SerialPort _serialPort;

        public ThermalPrinter( int baudRate = 115200)
        {
            LoadConfiguration();
            AutoConnectPrinter(baudRate);
        }

        public ThermalPrinter(PrinterConnectionType forceConnectionType,
                              string bluetoothPort = "COM5",
                              int baudRate = 115200)
        {
            LoadConfiguration();

            if (forceConnectionType == PrinterConnectionType.USB)
            {
                InitializePrinterUSB();
                _connectionType = PrinterConnectionType.USB;
            }
            else
            {
                InitializePrinterBluetooth(bluetoothPort, baudRate);
                _connectionType = PrinterConnectionType.Bluetooth;
            }
        }

        private void LoadConfiguration()
        {
            try
            {
                string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, CONFIG_FILE);
                if (File.Exists(path))
                {
                    string json = File.ReadAllText(path);
                    _settings = JsonSerializer.Deserialize<PrinterSettings>(json);
                    Console.WriteLine(" Załadowano konfigurację drukarki z pliku.");
                }
                else
                {
                    _settings = new PrinterSettings();
                    string json = JsonSerializer.Serialize(_settings, new JsonSerializerOptions { WriteIndented = true });
                    File.WriteAllText(path, json);
                    Console.WriteLine(" Utworzono domyślny plik konfiguracyjny.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($" Błąd konfiguracji: {ex.Message}. Używam domyślnych.");
                _settings = new PrinterSettings();
            }
        }

        private void AutoConnectPrinter( int baudRate)
        {
            Console.WriteLine(" Wyszukiwanie dostępnych połączeń z drukarką...");

            // PRIORYTET 1: USB
            try
            {
                Console.WriteLine("    Próba połączenia USB...");
                InitializePrinterUSB();
                _connectionType = PrinterConnectionType.USB;
                Console.WriteLine("     Połączono przez USB");
                return; // USB działa - nie sprawdzamy Bluetooth
            }
            catch (Exception ex)
            {
                Console.WriteLine($"     USB niedostępne: {ex.Message}");
            }

            // PRIORYTET 2: Bluetooth (tylko jeśli USB nie działa)
            try
            {
                
                string PrinterComPort = PrinterFinder.FindComPort(_settings.PrinterName);

                Console.WriteLine($"    Próba połączenia Bluetooth ({PrinterComPort})...");
                InitializePrinterBluetooth(PrinterComPort, baudRate);
                _connectionType = PrinterConnectionType.Bluetooth;
                Console.WriteLine("     Połączono przez Bluetooth");
                return; // Bluetooth działa
            }
            catch (Exception ex)
            {
                Console.WriteLine($"     Bluetooth niedostępne: {ex.Message}");
            }

            // Żadne połączenie nie zadziałało
            throw new Exception("Brak Drukarki");
        }

        // === ZMIANA: Implementacja połączenia z Twojego kodu ===
        private void InitializePrinterUSB()
        {
            // 1. Znajdź urządzenie (pobieramy VID/PID z ustawień, ale domyślnie są to teraz 0x0483/0x5743)
            var usbFinder = new UsbDeviceFinder(_settings.Vid, _settings.Pid);
            _device = UsbDevice.OpenUsbDevice(usbFinder);

            if (_device == null)
            {
                throw new Exception($"Nie znaleziono urządzenia USB (VID: {_settings.Vid:X}, PID: {_settings.Pid:X})");
            }

            // 2. Wybierz konfigurację i interfejs
            IUsbDevice wholeUsbDevice = _device as IUsbDevice;
            if (wholeUsbDevice != null)
            {
                wholeUsbDevice.SetConfiguration(1);
                wholeUsbDevice.ClaimInterface(0);
            }

            // 3. Znajdź endpoint typu BULK OUT (Twoja pętla szukająca endpointu < 0x80)
            UsbEndpointWriter foundWriter = null;

            foreach (UsbConfigInfo cfg in _device.Configs)
            {
                foreach (UsbInterfaceInfo iface in cfg.InterfaceInfoList)
                {
                    foreach (UsbEndpointInfo ep in iface.EndpointInfoList)
                    {
                        // sprawdź czy OUT (adres < 0x80)
                        if (ep.Descriptor.EndpointID < 0x80)
                        {
                            foundWriter = _device.OpenEndpointWriter(
                                (WriteEndpointID)ep.Descriptor.EndpointID
                            );
                            break; // Znaleziono, przerywamy wewnętrzną pętlę
                        }
                    }
                    if (foundWriter != null) break;
                }
                if (foundWriter != null) break;
            }

            if (foundWriter == null)
            {
                _device.Close();
                throw new Exception("Nie znaleziono endpointu OUT w urządzeniu USB!");
            }

            _writer = foundWriter;

            // Opcjonalnie: Reset po połączeniu (tak jak w Twoim kodzie "ESC @")
            // byte[] reset = new byte[] { 0x1B, 0x40, 0x0A };
            // _writer.Write(reset, 1000, out int _);
        }

        private void InitializePrinterBluetooth(string portName, int baudRate)
        {
            _serialPort = new SerialPort(portName, baudRate)
            {
                Encoding = Encoding.UTF8,
                NewLine = "\r\n"
            };

            _serialPort.Open();
            _serialPort.Write(new byte[] { 0x1B, 0x40 }, 0, 2);
        }

        private void WriteToDevice(byte[] data, int timeout = 2000)
        {
            if (_connectionType == PrinterConnectionType.USB)
            {
                if (_writer == null) throw new Exception("Brak połączenia z endpointem USB.");
                _writer.Write(data, timeout, out _);
            }
            else if (_connectionType == PrinterConnectionType.Bluetooth)
            {
                int chunkSize = _settings.ChunkSize;
                for (int i = 0; i < data.Length; i += chunkSize)
                {
                    int size = Math.Min(chunkSize, data.Length - i);
                    _serialPort.Write(data, i, size);
                    Thread.Sleep(2);
                }
            }
        }
        public void PrinterBeep()
        {
            // Tworzymy tablicę bajtów odpowiadającą: bytes([0x1b, 66, 4, 1])
            byte[] command = new byte[] { 0x1b, 66, 4, 1 };

            // Wywołujemy istniejącą metodę
            WriteToDevice(command);
        }
        public void PrinterCut()
        {
            // Tworzymy tablicę bajtów odpowiadającą: bytes([0x1d, 0x56, 0x41, 0x10 ])
            byte[] command = new byte[] { 0x1d, 0x56, 0x41, 0x10 };

            // Wywołujemy istniejącą metodę
            WriteToDevice(command);
        }

        // PONIŻEJ KOD BEZ ZMIAN - LOGIKA DRUKOWANIA POZOSTAJE ORYGINALNA


        public PrinterConnectionType GetConnectionType()
        {
            return _connectionType;
        }


    private Bitmap ConvertToMonochrome(Bitmap source)
        {
            // 1. Tworzymy nową bitmapę o formacie 1 bit na piksel (czyli czarno-biała, 0 lub 1)
            var mono = new Bitmap(source.Width, source.Height, PixelFormat.Format1bppIndexed);

            // 2. Ustawiamy paletę: Indeks 0 = Czarny, Indeks 1 = Biały
            var palette = mono.Palette;
            palette.Entries[0] = Color.Black;
            palette.Entries[1] = Color.White;
            mono.Palette = palette;

            // 3. Blokujemy pamięć nowej bitmapy, aby móc pisać bezpośrednio w bajtach
            var bounds = new Rectangle(0, 0, mono.Width, mono.Height);
            var monoData = mono.LockBits(bounds, ImageLockMode.WriteOnly, PixelFormat.Format1bppIndexed);

            // Obliczamy rozmiar bufora. Stride to szerokość wiersza w bajtach (może zawierać padding)
            int stride = monoData.Stride;
            byte[] bytes = new byte[Math.Abs(stride) * monoData.Height];

            // Wypełniamy wszystko bielą (0xFF = 11111111), będziemy "gasić" bity na czarno tam gdzie trzeba
            for (int i = 0; i < bytes.Length; i++)
                bytes[i] = 0xFF;

            // Próg odcięcia (Threshold) - poniżej tego poziomu piksel staje się czarny
            int threshold = 128;

            for (int y = 0; y < source.Height; y++)
            {
                for (int x = 0; x < source.Width; x++)
                {
                    // Pobranie koloru (Uwaga: GetPixel jest wolne przy dużych zdjęciach)
                    Color pixel = source.GetPixel(x, y);

                    // 4. Lepszy wzór na jasność (Luminancja)
                    // Uwzględnia wrażliwość oka: 30% czerwony, 59% zielony, 11% niebieski
                    int brightness = (int)(0.299 * pixel.R + 0.587 * pixel.G + 0.114 * pixel.B);

                    // Jeśli piksel jest ciemny, ustawiamy go na czarny (0)
                    if (brightness < threshold)
                    {
                        int byteIndex = (y * stride) + (x >> 3); // to samo co x / 8
                        int bitIndex = 7 - (x & 7);              // to samo co x % 8

                        // Operacja bitowa: ustawiamy konkretny bit na 0
                        bytes[byteIndex] &= (byte)~(1 << bitIndex);
                    }
                }
            }

            // Kopiujemy zmodyfikowane bajty do bitmapy i odblokowujemy pamięć
            Marshal.Copy(bytes, 0, monoData.Scan0, bytes.Length);
            mono.UnlockBits(monoData);

            return mono;
        }

    private List<string> WrapText(string text, Font font, int maxWidth)
        {
            var lines = new List<string>();
            var textLines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);

            using (var bmp = new Bitmap(1, 1))
            using (var g = Graphics.FromImage(bmp))
            {
                foreach (var textLine in textLines)
                {
                    if (string.IsNullOrEmpty(textLine))
                    {
                        lines.Add("");
                        continue;
                    }

                    var words = textLine.Split(' ');
                    var currentLine = "";

                    foreach (var word in words)
                    {
                        var test = string.IsNullOrEmpty(currentLine) ? word : $"{currentLine} {word}";
                        var size = g.MeasureString(test, font);

                        if (size.Width <= maxWidth)
                        {
                            currentLine = test;
                        }
                        else
                        {
                            if (!string.IsNullOrEmpty(currentLine))
                                lines.Add(currentLine);
                            currentLine = word;
                        }
                    }

                    if (!string.IsNullOrEmpty(currentLine))
                        lines.Add(currentLine);
                }
            }
            return lines;
        }

        private Bitmap RenderTextLine(string text, Font font, TextAlignment align = TextAlignment.Left)
        {
            using (var temp = new Bitmap(1, 1))
            using (var g = Graphics.FromImage(temp))
            {
                // FIX 1: Usunięto "+ 4" - tekst będzie bardziej zwarty
                string textToMeasureHeight = string.IsNullOrWhiteSpace(text) ? "Ag" : text;
                var size = g.MeasureString(textToMeasureHeight, font);
                int height = (int)Math.Ceiling(size.Height); // Bez dodatkowego paddingu

                // Zabezpieczenie, żeby wysokość nie była 0
                if (height < 1) height = 1;

                var bmp = new Bitmap(_settings.PaperWidthPx, height, PixelFormat.Format24bppRgb);
                using (var draw = Graphics.FromImage(bmp))
                {
                    draw.Clear(Color.White);
                    // Opcjonalnie: Lepsze renderowanie tekstu
                    draw.TextRenderingHint = System.Drawing.Text.TextRenderingHint.SingleBitPerPixelGridFit;

                    StringFormat format = new StringFormat();
                    format.FormatFlags = StringFormatFlags.MeasureTrailingSpaces;

                    var textWidth = draw.MeasureString(text, font, int.MaxValue, format).Width;

                    float x = _settings.MarginLeft;
                    int usable = _settings.PaperWidthPx - _settings.MarginLeft - _settings.MarginRight;

                    if (align == TextAlignment.Center)
                        x = _settings.MarginLeft + (usable - textWidth) / 2;
                    else if (align == TextAlignment.Right)
                        x = _settings.PaperWidthPx - _settings.MarginRight - textWidth;

                    draw.DrawString(text, font, Brushes.Black, x, 0, format);
                }

                var monoBmp = ConvertToMonochrome(bmp);
                bmp.Dispose();
                return monoBmp;
            }
        }

        private Bitmap CreateTwoColumnLine(string left, string right, Font font)
        {
            using (var temp = new Bitmap(1, 1))
            using (var g = Graphics.FromImage(temp))
            {
                int usableWidth = _settings.PaperWidthPx - _settings.MarginLeft - _settings.MarginRight;
                var leftSize = g.MeasureString(left, font);
                var rightSize = g.MeasureString(right, font);

                float totalWidth = leftSize.Width + rightSize.Width + 10;

                if (totalWidth > usableWidth)
                {
                    // FIX 2: Zmniejszono padding dla zawijanych linii
                    int height = (int)Math.Ceiling(leftSize.Height + rightSize.Height);
                    var bmp = new Bitmap(_settings.PaperWidthPx, height, PixelFormat.Format24bppRgb);
                    using (var draw = Graphics.FromImage(bmp))
                    {
                        draw.Clear(Color.White);
                        draw.TextRenderingHint = System.Drawing.Text.TextRenderingHint.SingleBitPerPixelGridFit; // Ostrzejszy tekst
                        draw.DrawString(left, font, Brushes.Black, _settings.MarginLeft, 0);

                        float xRight = _settings.PaperWidthPx - _settings.MarginRight - rightSize.Width;
                        draw.DrawString(right, font, Brushes.Black, xRight, leftSize.Height); // Usunięto +4
                    }
                    var monoBmp = ConvertToMonochrome(bmp);
                    bmp.Dispose();
                    return monoBmp;
                }
                else
                {
                    // FIX 3: Usunięto "+ 4" dla zwykłych linii
                    int height = (int)Math.Ceiling(Math.Max(leftSize.Height, rightSize.Height));
                    var bmp = new Bitmap(_settings.PaperWidthPx, height, PixelFormat.Format24bppRgb);
                    using (var draw = Graphics.FromImage(bmp))
                    {
                        draw.Clear(Color.White);
                        draw.TextRenderingHint = System.Drawing.Text.TextRenderingHint.SingleBitPerPixelGridFit;
                        draw.DrawString(left, font, Brushes.Black, _settings.MarginLeft, 0);

                        float xRight = _settings.PaperWidthPx - _settings.MarginRight - rightSize.Width;
                        draw.DrawString(right, font, Brushes.Black, xRight, 0);
                    }
                    var monoBmp = ConvertToMonochrome(bmp);
                    bmp.Dispose();
                    return monoBmp;
                }
            }
        }

        private void PrintBarcodeNative(string barcodeText)
        {
            try
            {
                WriteToDevice(new byte[] { (byte)'\n' });
                WriteToDevice(new byte[] { 0x1B, 0x61, 0x01 });
                WriteToDevice(new byte[] { 0x1d, 0x48, 0x02 });
                WriteToDevice(new byte[] { 0x1d, 0x68, 0x64 });
                WriteToDevice(new byte[] { 0x1d, 0x77, 0x02 });

                var barcodeData = new List<byte> { 0x1d, 0x6b, 0x49, (byte)barcodeText.Length };
                barcodeData.AddRange(Encoding.ASCII.GetBytes(barcodeText));
                WriteToDevice(barcodeData.ToArray());

                WriteToDevice(new byte[] { 0x1B, 0x61, 0x00 });
                WriteToDevice(new byte[] { (byte)'\n' });
            }
            catch (Exception ex)
            {
                Console.WriteLine($" Błąd drukowania kodu kreskowego: {ex.Message}");
            }
        }

        private Bitmap LoadAndScaleLogo(string logoFileName, int maxWidth = 250, int maxHeight = 150)
        {
            try
            {
                if (string.IsNullOrEmpty(logoFileName))
                    return null;

                // 1. Define the possible paths
                string baseDirectory = AppDomain.CurrentDomain.BaseDirectory;

                // Path A: The standard "deployment" path (bin\Debug\Images)
                string standardPath = Path.Combine(baseDirectory, "Images", logoFileName);

                // Path B: Your specific source path (for development on your PC)
                string devPath = Path.Combine(@"C:\Users\Pc\source\repos\Paragony\Paragony\Images", logoFileName);

                string logoPath = string.Empty;

                // 2. Check which one exists
                if (File.Exists(standardPath))
                {
                    logoPath = standardPath;
                }
                else if (File.Exists(devPath))
                {
                    logoPath = devPath;
                }
                else
                {
                    // If neither works, check if the user passed a full absolute path
                    if (File.Exists(logoFileName))
                        logoPath = logoFileName;
                }

                // 3. Final check
                if (string.IsNullOrEmpty(logoPath) || !File.Exists(logoPath))
                {
                    Console.WriteLine($" Nie znaleziono logo. Szukano w:\n 1. {standardPath}\n 2. {devPath}");
                    return null;
                }

                // 4. Load and Process
                using (var original = new Bitmap(logoPath))
                {
                    float ratioX = (float)maxWidth / original.Width;
                    float ratioY = (float)maxHeight / original.Height;
                    float ratio = Math.Min(ratioX, ratioY);

                    int newWidth = (int)(original.Width * ratio);
                    int newHeight = (int)(original.Height * ratio);

                    using (var resized = new Bitmap(newWidth, newHeight))
                    {
                        using (var g = Graphics.FromImage(resized))
                        {
                            g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                            g.DrawImage(original, 0, 0, newWidth, newHeight);
                        }

                        var centered = new Bitmap(_settings.PaperWidthPx, newHeight + 20);
                        using (var g = Graphics.FromImage(centered))
                        {
                            g.Clear(Color.White);
                            int xOffset = (_settings.PaperWidthPx - newWidth) / 2;
                            g.DrawImage(resized, xOffset, 10);
                        }

                        // Ensure the caller disposes of this result
                        return ConvertToMonochrome(centered);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($" Błąd ładowania logo '{logoFileName}': {ex.Message}");
                return null;
            }
        }

        public Bitmap CreateReceipt(
            string fontFamilyName,
            string storeName,
            string storeAddress,
            string nip,
            List<ReceiptItem> items,
            string receiptId,
            string paymentMethod = "GOTÓWKA",
            decimal? paidAmount = null,
            decimal discountPercent = 0,
            string header = null,
            string footer = null,
            string postalCode = null,
            string phone = null,
            string email = null,
            string logoPath = null,
            bool generateBarcode = false)
        {
            LoadConfiguration();

            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            var allImages = new List<Bitmap>();

            int sizeHeader = _settings.FontSizeHeader;
            int sizeNormal = _settings.FontSizeNormal;
            int sizeSmall = _settings.FontSizeSmall;
            int paperWidth = _settings.PaperWidthPx;
            int marginL = _settings.MarginLeft;
            int marginR = _settings.MarginRight;

            using (var fontHeader = new Font(fontFamilyName, sizeHeader, FontStyle.Bold))
            using (var fontNormal = new Font(fontFamilyName, sizeNormal))
            using (var fontSmall = new Font(fontFamilyName, sizeSmall))
            using (var fontMono = new Font("Consolas", sizeSmall))
            {
                int maxWidth = paperWidth - marginL - marginR;

                // LOGO FIRMY
                if (!string.IsNullOrEmpty(logoPath))
                {
                    var logo = LoadAndScaleLogo(logoPath);
                    if (logo != null)
                    {
                        allImages.Add(logo);
                        allImages.Add(RenderTextLine("", fontNormal));
                    }
                }

                // HEADER
                if (!string.IsNullOrEmpty(header))
                {
                    var headerLines = WrapText(header, fontHeader, maxWidth);
                    foreach (var line in headerLines)
                        allImages.Add(RenderTextLine(line, fontHeader, TextAlignment.Center));

                    allImages.Add(RenderTextLine("", fontNormal));
                }

                // DANE SKLEPU
                var storeLines = WrapText(storeName, fontHeader, maxWidth);
                foreach (var line in storeLines)
                    allImages.Add(RenderTextLine(line, fontHeader, TextAlignment.Center));

                // Adres
                if (!string.IsNullOrEmpty(storeAddress))
                {
                    string fullAddress = storeAddress;
                    if (!string.IsNullOrEmpty(postalCode))
                    {
                        if (!fullAddress.EndsWith(" ") && !fullAddress.EndsWith(","))
                            fullAddress += ", ";
                        fullAddress += postalCode;
                    }

                    var addressLines = WrapText(fullAddress, fontSmall, maxWidth);
                    foreach (var line in addressLines)
                        allImages.Add(RenderTextLine(line, fontSmall, TextAlignment.Center));
                }
                else if (!string.IsNullOrEmpty(postalCode))
                {
                    allImages.Add(RenderTextLine(postalCode, fontSmall, TextAlignment.Center));
                }

                // TELEFON
                if (!string.IsNullOrEmpty(phone))
                {
                    var digits = new string(phone.Where(char.IsDigit).ToArray());
                    if (digits.Length == 9) digits = "48" + digits;

                    string formattedPhone = digits.Length == 11
                        ? $"+{digits.Substring(0, 2)} {digits.Substring(2, 3)} {digits.Substring(5, 3)} {digits.Substring(8, 3)}"
                        : $"+{digits}";

                    string phoneText = $"Tel: {formattedPhone}";
                    var phoneLines = WrapText(phoneText, fontSmall, maxWidth);
                    foreach (var line in phoneLines)
                        allImages.Add(RenderTextLine(line, fontSmall, TextAlignment.Center));
                }

                // EMAIL
                if (!string.IsNullOrEmpty(email))
                {
                    string emailText = $"Email: {email}";
                    var emailLines = WrapText(emailText, fontSmall, maxWidth);
                    foreach (var line in emailLines)
                        allImages.Add(RenderTextLine(line, fontSmall, TextAlignment.Center));
                }

                // NIP
                if (!string.IsNullOrEmpty(nip))
                {
                    string nipText = $"NIP: {nip}";
                    var nipLines = WrapText(nipText, fontSmall, maxWidth);
                    foreach (var line in nipLines)
                        allImages.Add(RenderTextLine(line, fontSmall, TextAlignment.Center));
                }

                allImages.Add(RenderTextLine("", fontNormal));
                allImages.Add(RenderTextLine("PARAGON FISKALNY", fontHeader, TextAlignment.Center));
                allImages.Add(RenderTextLine(new string('-', 32), fontNormal, TextAlignment.Center));
                allImages.Add(RenderTextLine("", fontNormal));

                // POZYCJE
                decimal subtotal = 0;
                var vatSummary = new Dictionary<string, decimal[]>();
                var vatRates = new Dictionary<string, decimal>
                {
                    { "A", 0.23m }, { "B", 0.08m }, { "C", 0.05m }, { "D", 0.00m }, { "E", 0.00m }
                };
                var vatNames = new Dictionary<string, string>
                {
                    { "A", "23%" }, { "B", "8%" }, { "C", "5%" }, { "D", "0%" }, { "E", "zw" }
                };

                foreach (var item in items)
                {
                    decimal lineTotal = item.Quantity * item.UnitPrice;
                    subtotal += lineTotal;

                    decimal vatMultiplier = vatRates.ContainsKey(item.VatRate) ? vatRates[item.VatRate] : 0.23m;
                    decimal netto = lineTotal / (1 + vatMultiplier);
                    decimal vatAmount = lineTotal - netto;

                    if (!vatSummary.ContainsKey(item.VatRate))
                        vatSummary[item.VatRate] = new decimal[] { 0, 0, 0 };

                    vatSummary[item.VatRate][0] += netto;
                    vatSummary[item.VatRate][1] += vatAmount;
                    vatSummary[item.VatRate][2] += lineTotal;

                    var nameWithVat = $"{item.Name} {item.VatRate}";
                    var nameLines = WrapText(nameWithVat, fontNormal, maxWidth);
                    foreach (var nameLine in nameLines)
                        allImages.Add(RenderTextLine(nameLine, fontNormal));

                    var leftText = $"{item.Quantity} x {item.UnitPrice:N2}";
                    var rightText = $"{lineTotal:N2}";
                    allImages.Add(CreateTwoColumnLine(leftText, rightText, fontNormal));
                }

                // RABAT
                decimal discountAmount = 0;
                if (discountPercent > 0)
                {
                    allImages.Add(RenderTextLine("", fontNormal));
                    discountAmount = subtotal * (discountPercent / 100);
                    allImages.Add(CreateTwoColumnLine($"Rabat {discountPercent}%", $"-{discountAmount:N2}", fontNormal));
                }

                // SUMA
                decimal total = subtotal - discountAmount;
                allImages.Add(RenderTextLine("", fontNormal));
                allImages.Add(RenderTextLine(new string('=', 32), fontNormal, TextAlignment.Center));
                allImages.Add(CreateTwoColumnLine("SUMA:", $"{total:N2} PLN", fontNormal));
                allImages.Add(RenderTextLine(new string('=', 32), fontNormal, TextAlignment.Center));
                allImages.Add(RenderTextLine("", fontNormal));

                // PODSUMOWANIE VAT
                bool useColumnLayout = true;
                int lineWidth = 32; // Szerokość wydruku

                // Funkcja pomocnicza do centrowania tekstu
                Func<string, string> CenterText = (text) =>
                {
                    if (text.Length >= lineWidth) return text;
                    int paddingLeft = ((lineWidth - text.Length) / 2) + text.Length;
                    return text.PadLeft(paddingLeft);
                };

                // 1. Sprawdzanie długości, aby zdecydować o układzie
                foreach (var vatRate in vatSummary.Keys)
                {
                    decimal brutto = vatSummary[vatRate][2];
                    if (discountAmount > 0 && subtotal > 0)
                        brutto -= (brutto / subtotal) * discountAmount;
                    decimal netto = brutto / (1 + vatRates[vatRate]);
                    decimal vatAmt = brutto - netto;

                    // Jeśli liczby są za duże na tabelę, przełączamy na widok listy
                    if (netto.ToString("N2").Length > 9 || vatAmt.ToString("N2").Length > 8 || brutto.ToString("N2").Length > 9)
                    {
                        useColumnLayout = false;
                        break;
                    }
                }

                // 2. Nagłówek wyrównany DO LEWEJ
                allImages.Add(RenderTextLine("PODSUMOWANIE VAT", fontNormal));

                if (useColumnLayout)
                {
                    // Nagłówki tabeli - WYŚRODKOWANE
                    string Nettoheader = "PTU   NETTO   VAT   BRUTTO";
                    allImages.Add(RenderTextLine(CenterText(Nettoheader), fontMono));

                    allImages.Add(RenderTextLine(new string('-', lineWidth), fontMono));

                    foreach (var vatRate in vatSummary.Keys.OrderBy(k => k))
                    {
                        decimal brutto = vatSummary[vatRate][2];
                        if (discountAmount > 0 && subtotal > 0)
                            brutto -= (brutto / subtotal) * discountAmount;

                        decimal netto = brutto / (1 + vatRates[vatRate]);
                        decimal vatAmt = brutto - netto;

                        string vatName = vatNames[vatRate].PadRight(3);
                        string nettoStr = netto.ToString("N2").PadLeft(6);
                        string vatStr = vatAmt.ToString("N2").PadLeft(6);
                        string bruttoStr = brutto.ToString("N2").PadLeft(6);

                        // Złożenie wiersza i WYŚRODKOWANIE go
                        string line = $"{vatName} {nettoStr} {vatStr} {bruttoStr}";
                        allImages.Add(RenderTextLine(CenterText(line), fontMono));
                    }
                    allImages.Add(RenderTextLine(new string('-', lineWidth), fontMono));
                }
                else
                {
                    // Widok listy (gdy kwoty są zbyt duże na tabelę)
                    allImages.Add(RenderTextLine(new string('-', lineWidth), fontSmall));

                    foreach (var vatRate in vatSummary.Keys.OrderBy(k => k))
                    {
                        decimal brutto = vatSummary[vatRate][2];
                        if (discountAmount > 0 && subtotal > 0)
                            brutto -= (brutto / subtotal) * discountAmount;

                        decimal netto = brutto / (1 + vatRates[vatRate]);
                        decimal vatAmt = brutto - netto;

                        // Wyśrodkowanie nagłówka stawki VAT
                        string rateHeader = $"PTU {vatNames[vatRate]}:";
                        allImages.Add(RenderTextLine(CenterText(rateHeader), fontSmall));

                        allImages.Add(CreateTwoColumnLine("  Netto:", netto.ToString("N2"), fontSmall));
                        allImages.Add(CreateTwoColumnLine("  VAT:", vatAmt.ToString("N2"), fontSmall));
                        allImages.Add(CreateTwoColumnLine("  Brutto:", brutto.ToString("N2"), fontSmall));
                        allImages.Add(RenderTextLine("", fontSmall));
                    }
                    allImages.Add(RenderTextLine(new string('-', lineWidth), fontSmall));
                }
                allImages.Add(RenderTextLine("", fontNormal));

                // PŁATNOŚĆ
                allImages.Add(RenderTextLine("SPOSÓB PŁATNOŚCI:", fontNormal));
                allImages.Add(CreateTwoColumnLine(paymentMethod, total.ToString("N2"), fontNormal));

                if (paymentMethod.ToUpper() == "GOTÓWKA" && paidAmount.HasValue)
                {
                    decimal change = paidAmount.Value - total;
                    allImages.Add(RenderTextLine("", fontNormal));
                    allImages.Add(CreateTwoColumnLine("Otrzymano:", paidAmount.Value.ToString("N2"), fontNormal));
                    allImages.Add(CreateTwoColumnLine("Reszta:", change.ToString("N2"), fontNormal));
                }

                allImages.Add(RenderTextLine("", fontNormal));
                allImages.Add(RenderTextLine(new string('-', 32), fontNormal, TextAlignment.Center));

                // STOPKA
                allImages.Add(RenderTextLine(now, fontSmall, TextAlignment.Center));
                allImages.Add(RenderTextLine($"NR PARAGONU: {receiptId}", fontSmall, TextAlignment.Center));

                if (!string.IsNullOrEmpty(footer))
                {
                    allImages.Add(RenderTextLine("", fontNormal));
                    var footerLines = WrapText(footer, fontSmall, maxWidth);
                    foreach (var line in footerLines)
                        allImages.Add(RenderTextLine(line, fontSmall, TextAlignment.Center));
                }
                else
                {
                    allImages.Add(RenderTextLine("Dziękujemy za zakupy!", fontSmall, TextAlignment.Center));
                }

                allImages.Add(RenderTextLine("", fontNormal));
            }

            // Połączenie obrazków w całość
            int totalHeight = allImages.Sum(img => img.Height);
            var combined = new Bitmap(paperWidth, totalHeight); // Użycie width z configu

            using (var g = Graphics.FromImage(combined))
            {
                g.Clear(Color.White);
                int yOffset = 0;
                foreach (var img in allImages)
                {
                    g.DrawImage(img, 0, yOffset);
                    yOffset += img.Height;
                    img.Dispose();
                }
            }

            return combined;
        }

        public void PrintReceipt(Bitmap bmp, string receiptId, bool generateBarcode = false)
        {
            LoadConfiguration();
            Console.WriteLine($" Drukowanie paragonu {receiptId}...");
            PrintImage(bmp);

            if (generateBarcode && !string.IsNullOrEmpty(receiptId))
            {
                PrintBarcodeNative(receiptId);
            }
            PrinterBeep();
            PrinterCut();
            WriteToDevice(new byte[] { (byte)'\n', (byte)'\n', (byte)'\n' });
            Console.WriteLine(" Paragon wydrukowany pomyślnie!");
        }

        private void PrintImage(Bitmap bitmap)
        {
            // Reset interlinii na wszelki wypadek (ESC 2) - przywraca domyślną, 
            // ale my będziemy sterować posuwem ręcznie
            // WriteToDevice(new byte[] { 0x1B, 0x32 }); 

            for (int y = 0; y < bitmap.Height; y += 24)
            {
                var lineBytes = new List<byte>();

                for (int x = 0; x < bitmap.Width; x++)
                {
                    byte[] slice = { 0x00, 0x00, 0x00 };
                    for (int b = 0; b < 24; b++)
                    {
                        if (y + b < bitmap.Height)
                        {
                            var pixel = bitmap.GetPixel(x, y + b);
                            // Sprawdzamy jasność zamiast idealnej czerni (bezpieczniej po konwersji)
                            bool isDark = pixel.R < 128;
                            if (isDark)
                                slice[b / 8] |= (byte)(1 << (7 - (b % 8)));
                        }
                    }
                    lineBytes.AddRange(slice);
                }

                byte nL = (byte)(bitmap.Width & 0xFF);
                byte nH = (byte)((bitmap.Width >> 8) & 0xFF);

                // ESC * 33 nL nH d1...dk
                var cmd = new List<byte> { 0x1B, 0x2A, 33, nL, nH };
                cmd.AddRange(lineBytes);

                // --- FIX KLUCZOWY ---
                // Zamiast: cmd.Add((byte)'\n');
                // Używamy: ESC J n (Print and feed paper n dots)
                // Przesuwamy papier dokładnie o 24 kropki (wysokość naszego paska)
                // 0x1B = ESC, 0x4A = J, 24 = ilość kropek
                cmd.AddRange(new byte[] { 0x1B, 0x4A, 24 });
                // --------------------

                byte[] cmdArr = cmd.ToArray();

                if (_connectionType == PrinterConnectionType.USB)
                {
                    int chunkSize = _settings.ChunkSize > 0 ? _settings.ChunkSize : 1024;
                    for (int i = 0; i < cmdArr.Length; i += chunkSize)
                    {
                        int len = Math.Min(chunkSize, cmdArr.Length - i);
                        byte[] chunk = new byte[len];
                        Array.Copy(cmdArr, i, chunk, 0, len);

                        if (_writer != null)
                            _writer.Write(chunk, 2000, out _);

                        // Małe opóźnienie dla stabilności przy dużych grafikach
                        // Zmniejszono z 2ms na 0ms lub 1ms, żeby drukowało szybciej
                        // Thread.Sleep(1); 
                    }
                }
                else
                {
                    WriteToDevice(cmdArr);
                    // Bluetooth bywa wolny, tutaj sleep jest czasem potrzebny
                    Thread.Sleep(10);
                }
            }
        }

        public void Dispose()
        {
            if (_connectionType == PrinterConnectionType.USB)
            {
                if (_device != null)
                {
                    if (_device is IUsbDevice wholeUsbDevice)
                    {
                        wholeUsbDevice.ReleaseInterface(0);
                    }
                    _device.Close();
                }
                UsbDevice.Exit();
            }
            else if (_connectionType == PrinterConnectionType.Bluetooth)
            {
                _serialPort?.Close();
                _serialPort?.Dispose();
            }
        }
    }

    public enum TextAlignment
    {
        Left,
        Center,
        Right
    }
}