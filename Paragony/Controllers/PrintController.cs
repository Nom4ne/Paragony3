using System.Drawing.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Paragony.Extensions; 
using Paragony.Models;
using TP = ThermalPrinterMTP2P;

namespace Paragony.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PrintController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PrintController(AppDbContext context)
        {
            _context = context;
        }

       
        public class PrintReceiptDto
        {
            public string StoreName { get; set; } 
            public string StoreAddress { get; set; }
            public string StoreCity { get; set; }
            public string PostalCode { get; set; }
            public string Phone { get; set; } 
            public string ContactEmail { get; set; }
            public string NIP { get; set; }
            public string ReceiptNumber { get; set; }
            public string PaymentMethod { get; set; }
            public decimal PaidAmount { get; set; }
            public decimal DiscountPercent { get; set; } = 0;
            public string Header { get; set; } 
            public string Footer { get; set; }

            public required string FontStyle { get; set; }
       
            public string? LogoFileName { get; set; }
            public bool GenerateBarcode { get; set; } = true;
            public List<PrintReceiptItemDto> Items { get; set; } = new();
        }

        public class PrintReceiptItemDto
        {
            public string Name { get; set; } = "";
            public int Quantity { get; set; } = 1;
            public decimal UnitPrice { get; set; } = 0;
            public int VatRate { get; set; } = 23;
        }

        //  NOWY ENDPOINT - Drukowanie z JSON (bez sprawdzania właściciela - tworzy nowy paragon)
        [HttpPost("receipt/json")]
        public IActionResult PrintReceiptFromJson([FromBody] PrintReceiptDto data)
        {
            if (data == null || data.Items == null || data.Items.Count == 0)
                return BadRequest("❌ Brak danych lub pozycji paragonu.");

            // DODANE - Pobierz clientId z tokenu
            var clientId = this.GetCurrentClientId();

            try
            {
                //  Konwersja pozycji z JSON -> format drukarki
                var printerItems = data.Items.Select(i => new TP.ReceiptItem
                {
                    Name = i.Name,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    VatRate = i.VatRate switch
                    {
                        23 => "A",
                        8 => "B",
                        5 => "C",
                        0 => "D",
                        _ => "A"
                    }
                }).ToList();

                using var printer = new TP.ThermalPrinter();

                //  Stworzenie bitmapy paragonu z rozszerzonymi danymi
                var receiptBitmap = printer.CreateReceipt(
                    fontFamilyName: data.FontStyle,
                    storeName: data.StoreName,
                    storeAddress: $"{data.StoreAddress}, {data.StoreCity}",
                    postalCode: data.PostalCode,
                    phone: data.Phone,
                    email: data.ContactEmail,
                    nip: data.NIP,
                    items: printerItems,
                    receiptId: data.ReceiptNumber,
                    paymentMethod: data.PaymentMethod,
                    paidAmount: data.PaidAmount,
                    discountPercent: data.DiscountPercent,
                    header: data.Header,
                    footer: data.Footer,
                    logoPath: data.LogoFileName
                );

                //  Drukowanie (z kodem kreskowym jeśli włączony)
                if (data.GenerateBarcode)
                {
                    printer.PrintReceipt(receiptBitmap, data.ReceiptNumber, true);
                }
                else
                {
                    printer.PrintReceipt(receiptBitmap, data.ReceiptNumber, false);
                }
                receiptBitmap.Dispose();

                return Ok(new
                {
                    message = " Paragon wydrukowany pomyślnie z JSON.",
                    clientId = clientId, 
                    receiptNumber = data.ReceiptNumber,
                    storeName = data.StoreName,
                    itemCount = data.Items.Count,
                    barcodeGenerated = data.GenerateBarcode,
                    logoUsed = !string.IsNullOrEmpty(data.LogoFileName)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // POST: api/Print/receipt/{id}
        [HttpPost("receipt/{id}")]
        public async Task<IActionResult> PrintReceipt(int id, [FromQuery] bool generateBarcode = true)
        {
            // 1. Pobierz ID zalogowanego klienta (z tokenu JWT)
            var clientId = this.GetCurrentClientId();

            // 2. Pobierz paragon z bazy wraz z relacjami
            var receipt = await _context.Receipts
                .Include(r => r.Client)
                .Include(r => r.Template) // Ważne: pobieramy szablon z fontem
                .Include(r => r.PaymentMethod)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (receipt == null)
                return NotFound($" Nie znaleziono paragonu o ID {id}.");

            // 3. Sprawdź uprawnienia (czy paragon należy do użytkownika)
            if (receipt.ClientId != clientId)
            {
                return Forbid();
            }

            // 4. Pobierz pozycje paragonu
            var items = await _context.ReceiptItems
                .Where(i => i.ReceiptId == id)
                .Include(i => i.Product)
                .ToListAsync();

            if (items.Count == 0)
                return BadRequest("❌ Paragon nie zawiera pozycji.");

            // =========================================================
            // 5. WALIDACJA CZCIONKI (The Fix)
            // =========================================================
            string fontToUse = "Arial"; // Domyślna bezpieczna czcionka
            string? dbFontName = receipt.Template?.FontStyle;

            if (!string.IsNullOrWhiteSpace(dbFontName))
            {
                dbFontName = dbFontName.Trim();

                // Sprawdzamy, czy system posiada taką czcionkę
                using (var fontsCollection = new InstalledFontCollection())
                {
                    bool fontExists = fontsCollection.Families
                        .Any(f => f.Name.Equals(dbFontName, StringComparison.InvariantCultureIgnoreCase));

                    if (fontExists)
                    {
                        fontToUse = dbFontName;
                        Console.WriteLine($" [PRINT] Używam czcionki z bazy: '{fontToUse}'");
                    }
                    else
                    {
                        Console.WriteLine($" [PRINT] Czcionka '{dbFontName}' z bazy NIE ISTNIEJE w systemie! Podmieniam na 'Arial'.");
                        // Tutaj system po cichu podmieniałby font, teraz masz kontrolę
                    }
                }
            }
            else
            {
                Console.WriteLine(" [PRINT] Brak zdefiniowanej czcionki w szablonie. Używam domyślnej.");
            }
            // =========================================================

            // 6. Mapowanie pozycji z bazy na format drukarki
            var printerItems = items.Select(i => new TP.ReceiptItem
            {
                Name = i.Name ?? i.Product?.Name ?? "Produkt",
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                VatRate = i.VatRate switch
                {
                    23m => "A",
                    8m => "B",
                    5m => "C",
                    0m => "D",
                    _ => "A"
                }
            }).ToList();

            try
            {
                // Inicjalizacja drukarki (upewnij się, że klasa ThermalPrinter ładuje config w konstruktorze lub metodach)
                using var printer = new TP.ThermalPrinter();

                // Budowanie adresu
                string fullAddress = receipt.Client?.Address ?? "";
                if (!string.IsNullOrWhiteSpace(receipt.Client?.PostalCode))
                    fullAddress += $", {receipt.Client.PostalCode}";
                if (!string.IsNullOrWhiteSpace(receipt.Client?.City))
                    fullAddress += $" {receipt.Client.City}";

                // 7. Generowanie bitmapy paragonu
                var receiptBitmap = printer.CreateReceipt(
                    fontFamilyName: fontToUse, // <--- Przekazujemy zweryfikowaną nazwę
                    storeName: receipt.Client?.Name ?? "SKLEP BEZ NAZWY",
                    storeAddress: fullAddress,
                    postalCode: receipt.Client?.PostalCode,
                    phone: receipt.Client?.Phone,
                    email: receipt.Client?.ContactEmail,
                    nip: receipt.Client?.NIP,
                    items: printerItems,
                    receiptId: receipt.ReceiptNumber ?? id.ToString(),
                    paymentMethod: receipt.PaymentMethod?.DisplayName ?? "GOTÓWKA",
                    paidAmount: receipt.PaidAmount ?? receipt.TotalAmount,
                    discountPercent: receipt.DiscountPercent ?? 0,
                    header: receipt.Template?.Header ?? "Paragon Fiskalny",
                    footer: receipt.Template?.Footer ?? "Dziękujemy za zakupy!",
                    logoPath: receipt.Template?.LogoFile,
                    generateBarcode: generateBarcode
                );

                // 8. Wysłanie do drukarki
                // ID paragonu jest używane jako treść kodu kreskowego
                printer.PrintReceipt(receiptBitmap, receipt.ReceiptNumber ?? id.ToString(), generateBarcode);

                // Zwolnienie zasobów graficznych
                receiptBitmap.Dispose();

                // 9. Aktualizacja statusu w bazie
                receipt.Status = "printed";
                receipt.PrintedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = " Paragon wydrukowany pomyślnie.",
                    usedFont = fontToUse, // Zwracamy użytą czcionkę w odpowiedzi dla pewności
                    receiptNumber = receipt.ReceiptNumber,
                    totalAmount = receipt.TotalAmount,
                    printerType = printer.GetConnectionType().ToString()
                });
            }
            catch (Exception ex)
            {
                // Logowanie pełnego błędu na serwerze
                Console.WriteLine($" BŁĄD DRUKOWANIA: {ex}");
                return StatusCode(500, new { error = "Błąd drukowania", details = ex.Message });
            }
        }

        // DODANE - Endpoint do sprawdzenia swoich paragonów
        [HttpGet("my-receipts")]
        public async Task<IActionResult> GetMyReceipts()
        {
            var clientId = this.GetCurrentClientId();

            var receipts = await _context.Receipts
                .Where(r => r.ClientId == clientId)
                .Select(r => new
                {
                    r.Id,
                    r.ReceiptNumber,
                    r.TotalAmount,
                    r.Status,
                    r.CreatedAt,
                    r.PrintedAt
                })
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(new
            {
                clientId = clientId,
                count = receipts.Count,
                receipts = receipts
            });
        }
        [HttpGet("available-fonts")]
        public IActionResult GetAvailableFonts()
        {
            try
            {
                using (var fonts = new System.Drawing.Text.InstalledFontCollection())
                {
                    var fontNames = fonts.Families.Select(f => f.Name).OrderBy(n => n).ToList();
                    return Ok(new
                    {
                        count = fontNames.Count,
                        fonts = fontNames
                    });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Błąd pobierania czcionek serwera", details = ex.Message });
            }
        }
    }
}