using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Paragony.DTOs.Receipt;
using Paragony.Mappings;
using Paragony.Models;
using Paragony.Extensions;




namespace Paragony.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReceiptsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IReceiptCalculationService _calculationService; 

        public ReceiptsController(AppDbContext context, IReceiptCalculationService calculationService) 
        {
            _context = context;
            _calculationService = calculationService; 
        }

        // GET: api/receipts - Tylko SWOJE paragony
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var clientId = this.GetCurrentClientId();

            var receipts = await _context.Receipts
                .Include(r => r.Client)
                .Include(r => r.Template)
                .Include(r => r.PaymentMethod)
                .Include(r => r.Items)
                    .ThenInclude(ri => ri.Product)
                .Where(r => r.ClientId == clientId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(receipts.Select(ReceiptMapper.ToDto));
        }

        // GET: api/receipts/{id} - Tylko SWÓJ paragon
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var clientId = this.GetCurrentClientId();

            var receipt = await _context.Receipts
                .Include(r => r.Client)
                .Include(r => r.Template)
                .Include(r => r.PaymentMethod)
                .Include(r => r.Items)
                    .ThenInclude(ri => ri.Product)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (receipt == null)
                return NotFound();

            if (receipt.ClientId != clientId)
                return Forbid();

            return Ok(ReceiptMapper.ToDto(receipt));
        }

        // GET: api/receipts/number/{receiptNumber} - Tylko SWÓJ paragon
        [HttpGet("number/{receiptNumber}")]
        public async Task<IActionResult> GetByNumber(string receiptNumber)
        {
            var clientId = this.GetCurrentClientId();

            var receipt = await _context.Receipts
                .Include(r => r.Client)
                .Include(r => r.Template)
                .Include(r => r.PaymentMethod)
                .Include(r => r.Items)
                    .ThenInclude(ri => ri.Product)
                .FirstOrDefaultAsync(r => r.ReceiptNumber == receiptNumber);

            if (receipt == null)
                return NotFound();

            if (receipt.ClientId != clientId)
                return Forbid();

            return Ok(ReceiptMapper.ToDto(receipt));
        }

        // POST: api/receipts - Utwórz paragon (automatycznie przypisany do użytkownika)
        [HttpPost]
        public async Task<IActionResult> Create(CreateReceiptDto dto)
        {
            var clientId = this.GetCurrentClientId();

            // Walidacja TemplateId (opcjonalne)
            if (dto.TemplateId.HasValue)
            {
                var template = await _context.ReceiptTemplates.FindAsync(dto.TemplateId.Value);
                if (template == null)
                    return BadRequest(new { message = $"Template with ID {dto.TemplateId} not found" });

                if (template.ClientId != clientId)
                    return Forbid();
            }

            // Walidacja PaymentMethodId (opcjonalne)
            if (dto.PaymentMethodId.HasValue)
            {
                var paymentMethodExists = await _context.PaymentMethods.AnyAsync(p => p.Id == dto.PaymentMethodId.Value);
                if (!paymentMethodExists)
                    return BadRequest(new { message = $"PaymentMethod with ID {dto.PaymentMethodId} not found" });
            }

            // Generowanie numeru paragonu
            string receiptNumber;
            if (string.IsNullOrEmpty(dto.ReceiptNumber))
            {
                var connection = _context.Database.GetDbConnection();
                var connectionWasOpen = connection.State == System.Data.ConnectionState.Open;

                try
                {
                    if (!connectionWasOpen)
                        await connection.OpenAsync();

                    using (var command = connection.CreateCommand())
                    {
                        command.CommandText = "SELECT generate_receipt_number(@p0)";
                        var parameter = command.CreateParameter();
                        parameter.ParameterName = "@p0";
                        parameter.Value = clientId;
                        command.Parameters.Add(parameter);

                        var result = await command.ExecuteScalarAsync();
                        receiptNumber = result?.ToString() ?? string.Empty;
                    }
                }
                finally
                {
                    if (!connectionWasOpen && connection.State == System.Data.ConnectionState.Open)
                        connection.Close();
                }
            }
            else
            {
                var numberExists = await _context.Receipts
                    .AnyAsync(r => r.ReceiptNumber == dto.ReceiptNumber && r.ClientId == clientId);
                if (numberExists)
                    return BadRequest(new { message = $"Receipt with number {dto.ReceiptNumber} already exists" });

                receiptNumber = dto.ReceiptNumber;
            }

            var receipt = ReceiptMapper.FromCreateDto(dto);
            receipt.ClientId = clientId;
            receipt.ReceiptNumber = receiptNumber;
            receipt.CreatedAt = DateTime.UtcNow; 

            _context.Receipts.Add(receipt);
            await _context.SaveChangesAsync();

            // Załaduj wszystkie relacje do odpowiedzi
            await _context.Entry(receipt).Reference(r => r.Client).LoadAsync();
            if (receipt.TemplateId.HasValue)
                await _context.Entry(receipt).Reference(r => r.Template).LoadAsync();
            if (receipt.PaymentMethodId.HasValue)
                await _context.Entry(receipt).Reference(r => r.PaymentMethod).LoadAsync();
            await _context.Entry(receipt).Collection(r => r.Items).LoadAsync();

            return CreatedAtAction(nameof(Get), new { id = receipt.Id }, ReceiptMapper.ToDto(receipt));
        }

        // PUT: api/receipts/{id} - Edytuj tylko SWÓJ paragon
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateReceiptDto dto)
        {
            var clientId = this.GetCurrentClientId();

            var receipt = await _context.Receipts.FindAsync(id);
            if (receipt == null)
                return NotFound();

            if (receipt.ClientId != clientId)
                return Forbid();

            // Walidacja TemplateId (opcjonalne)
            if (dto.TemplateId.HasValue)
            {
                var template = await _context.ReceiptTemplates.FindAsync(dto.TemplateId.Value);
                if (template == null)
                    return BadRequest(new { message = $"Template with ID {dto.TemplateId} not found" });

                if (template.ClientId != clientId)
                    return Forbid();
            }

            // Walidacja PaymentMethodId (opcjonalne)
            if (dto.PaymentMethodId.HasValue)
            {
                var paymentMethodExists = await _context.PaymentMethods.AnyAsync(p => p.Id == dto.PaymentMethodId.Value);
                if (!paymentMethodExists)
                    return BadRequest(new { message = $"PaymentMethod with ID {dto.PaymentMethodId} not found" });
            }

            // Walidacja unikalności ReceiptNumber (jeśli się zmienia)
            if (receipt.ReceiptNumber != dto.ReceiptNumber)
            {
                var numberExists = await _context.Receipts
                    .AnyAsync(r => r.ReceiptNumber == dto.ReceiptNumber && r.ClientId == clientId);
                if (numberExists)
                    return BadRequest(new { message = $"Receipt with number {dto.ReceiptNumber} already exists" });
            }

            ReceiptMapper.UpdateFromDto(receipt, dto);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/receipts/{id} - Usuń tylko SWÓJ paragon
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var clientId = this.GetCurrentClientId();

            var receipt = await _context.Receipts.FindAsync(id);
            if (receipt == null)
                return NotFound();

            if (receipt.ClientId != clientId)
                return Forbid();

            _context.Receipts.Remove(receipt);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DODANE - Ręczne przeliczanie sum paragonu
        [HttpPost("{id}/recalculate")]
        public async Task<IActionResult> RecalculateTotals(int id)
        {
            var clientId = this.GetCurrentClientId();

            var receipt = await _context.Receipts.FindAsync(id);
            if (receipt == null)
                return NotFound();

            if (receipt.ClientId != clientId)
                return Forbid();

            try
            {
                await _calculationService.RecalculateTotals(id);

                // Odśwież dane po przeliczeniu
                await _context.Entry(receipt).ReloadAsync();

                return Ok(new
                {
                    message = "Receipt totals recalculated successfully",
                    totalAmount = receipt.TotalAmount,
                    totalVat = receipt.TotalVat,
                    changeAmount = receipt.ChangeAmount
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // DODANE - Ustaw rabat na paragon
        [HttpPut("{id}/discount")]
        public async Task<IActionResult> SetDiscount(int id, SetDiscountDto dto)
        {
            var clientId = this.GetCurrentClientId();

            var receipt = await _context.Receipts.FindAsync(id);
            if (receipt == null)
                return NotFound();

            if (receipt.ClientId != clientId)
                return Forbid();

            // Ustaw rabat (albo procent ALBO kwota)
            if (dto.DiscountPercent.HasValue && dto.DiscountPercent > 0)
            {
                receipt.DiscountPercent = dto.DiscountPercent.Value;
                receipt.DiscountAmount = 0; // Resetuj kwotę
            }
            else if (dto.DiscountAmount.HasValue && dto.DiscountAmount > 0)
            {
                receipt.DiscountAmount = dto.DiscountAmount.Value;
                receipt.DiscountPercent = 0; // Resetuj procent
            }
            else
            {
                // Usuń rabat
                receipt.DiscountPercent = 0;
                receipt.DiscountAmount = 0;
            }

            await _context.SaveChangesAsync();

            // Przelicz sumy po zmianie rabatu
            await _calculationService.RecalculateTotals(id);

            // Odśwież dane
            await _context.Entry(receipt).ReloadAsync();

            return Ok(new
            {
                message = "Discount updated successfully",
                discountPercent = receipt.DiscountPercent,
                discountAmount = receipt.DiscountAmount,
                totalAmount = receipt.TotalAmount
            });
        }

        // DODANE - Ustaw kwotę zapłaconą
        [HttpPut("{id}/payment")]
        public async Task<IActionResult> SetPayment(int id, SetPaymentDto dto)
        {
            try
            {
                var clientId = this.GetCurrentClientId();
                var receipt = await _context.Receipts.FindAsync(id);

                if (receipt == null)
                    return NotFound();

                // Zabezpieczenie: czy paragon należy do klienta
                if (receipt.ClientId != clientId)
                    return Forbid();

                // Zabezpieczenie: nie edytujemy wydrukowanych paragonów
                if (receipt.Status == "printed")
                {
                    if (receipt.PaidAmount <= receipt.TotalAmount)
                    {
                        // allow editing — do nothing or add logic here
                        receipt.Status = "draft"; // if you really need to assign it again
                    }
                    
                }

                if (receipt.Status == "printed")
                {
                    return BadRequest(new { message = "Paragon wydrukowany - edycja zablokowana." });
                }

                // Walidacja kwoty
                if (dto.PaidAmount < 0)
                    return BadRequest(new { message = "Kwota płatności nie może być ujemna." });

                // --- AKTUALIZACJA DANYCH ---
                receipt.PaidAmount = dto.PaidAmount;

                // Normalizacja statusu (małe litery) dla bezpiecznego porównania
                string currentStatus = receipt.Status?.ToLower() ?? "draft";

                if (receipt.PaidAmount >= receipt.TotalAmount)
                {
                    // SYTUACJA: Opłacono w całości (lub nadpłata)
                    receipt.ChangeAmount = receipt.PaidAmount - receipt.TotalAmount;

                    // Opcjonalnie: Zaokrąglenie reszty do 2 miejsc po przecinku (dobra praktyka)
                    receipt.ChangeAmount = Math.Round((decimal)receipt.ChangeAmount, 2);

                    // Jeśli był szkic, jest gotowy do druku
                    if (currentStatus == "draft")
                    {
                        receipt.Status = "ready";
                    }
                }
                else
                {
                    // SYTUACJA: Niedopłata
                    receipt.ChangeAmount = 0;

                    // Jeśli był gotowy, cofamy do szkicu (bo brakuje środków)
                    if (currentStatus == "ready")
                    {
                        receipt.Status = "draft";
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Płatność zaktualizowana",
                    paidAmount = receipt.PaidAmount,
                    changeAmount = receipt.ChangeAmount,
                    status = receipt.Status,
                    isFullyPaid = receipt.PaidAmount >= receipt.TotalAmount
                });
            }
            catch (Exception ex)
            {
                // W produkcji warto logować błędy do pliku/systemu (np. Serilog), tutaj zwracamy tylko info
                return StatusCode(500, new { message = "Błąd zapisu płatności", error = ex.Message });
            }
        }

        // DODANE - Zmień status paragonu z walidacją płatności
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, UpdateStatusDto dto)
        {
            var clientId = this.GetCurrentClientId();

            var receipt = await _context.Receipts
                .Include(r => r.Items)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (receipt == null)
                return NotFound();

            if (receipt.ClientId != clientId)
                return Forbid();

            // WALIDACJA - Sprawdź czy płatność jest wystarczająca
            if (dto.Status == "ready" || dto.Status == "printed")
            {
                // Najpierw przelicz sumy (na wypadek zmian w produktach)
                await _calculationService.RecalculateTotals(id);

                // Odśwież dane po przeliczeniu
                await _context.Entry(receipt).ReloadAsync();

                if (receipt.PaidAmount < receipt.TotalAmount)
                {
                    return BadRequest(new
                    {
                        message = "Insufficient payment. Cannot mark receipt as ready/printed.",
                        totalAmount = receipt.TotalAmount,
                        paidAmount = receipt.PaidAmount,
                        amountDue = receipt.TotalAmount - receipt.PaidAmount
                    });
                }

                // Ustaw PrintedAt jeśli status to "printed"
                if (dto.Status == "printed" && receipt.PrintedAt == null)
                {
                    receipt.PrintedAt = DateTime.UtcNow;
                }
            }

            receipt.Status = dto.Status;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Status updated successfully",
                status = receipt.Status,
                printedAt = receipt.PrintedAt
            });
        }

        // DODANE - Statystyki paragonów użytkownika
        [HttpGet("stats")]
        public async Task<IActionResult> GetMyStats()
        {
            var clientId = this.GetCurrentClientId();

            var stats = await _context.Receipts
                .Where(r => r.ClientId == clientId)
                .GroupBy(r => 1)
                .Select(g => new
                {
                    totalReceipts = g.Count(),
                    totalAmount = g.Sum(r => r.TotalAmount),
                    averageAmount = g.Average(r => r.TotalAmount),
                    printedCount = g.Count(r => r.Status == "printed"),
                    draftCount = g.Count(r => r.Status == "draft"),
                    readyCount = g.Count(r => r.Status == "ready")
                })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                clientId = clientId,
                stats = stats ?? new
                {
                    totalReceipts = 0,
                    totalAmount = 0m,
                    averageAmount = 0m,
                    printedCount = 0,
                    draftCount = 0,
                    readyCount = 0
                }
            });
        }

        // Metoda do automatycznego generowania numeru paragonu
        private async Task<string> GenerateReceiptNumber(int clientId)
        {
            var lastReceipt = await _context.Receipts
                .Where(r => r.ClientId == clientId)
                .OrderByDescending(r => r.Id)
                .FirstOrDefaultAsync();

            int nextNumber = 1;

            if (lastReceipt != null && !string.IsNullOrEmpty(lastReceipt.ReceiptNumber))
            {
                var numberPart = lastReceipt.ReceiptNumber.TrimStart('A');
                if (int.TryParse(numberPart, out int lastNumber))
                {
                    nextNumber = lastNumber + 1;
                }
            }

            return $"A{nextNumber:D9}";
        }

        // DODANE - Pobierz następny dostępny numer paragonu
        [HttpGet("next-number")]
        public async Task<IActionResult> GetNextReceiptNumber()
        {
            var clientId = this.GetCurrentClientId();
            var nextNumber = await GenerateReceiptNumber(clientId);

            return Ok(new { receiptNumber = nextNumber });
        }


        // GET: api/receipts/list?page=1&pageSize=10
        [HttpGet("list")]
        public async Task<IActionResult> GetAll(int page = 1, int pageSize = 10)
        {
            var clientId = this.GetCurrentClientId();

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;

            var query = _context.Receipts
                .Include(r => r.Client)
                .Include(r => r.Template)
                .Include(r => r.PaymentMethod)
                .Include(r => r.Items)
                    .ThenInclude(ri => ri.Product)
                .Where(r => r.ClientId == clientId)
                .OrderByDescending(r => r.CreatedAt);

            var totalCount = await query.CountAsync();

            var receipts = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                page,
                pageSize,
                totalCount,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                items = receipts.Select(ReceiptMapper.ToDto)
            });
        }





    }

    // DODANE - DTOs dla nowych endpointów
    public class SetDiscountDto
    {
        public decimal? DiscountPercent { get; set; }
        public decimal? DiscountAmount { get; set; }
    }

    public class SetPaymentDto
    {
        public decimal PaidAmount { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } // "draft", "ready", "printed", "cancelled"
    }
}