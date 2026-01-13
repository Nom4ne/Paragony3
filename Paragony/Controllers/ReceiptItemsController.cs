using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Paragony.DTOs.ReceiptItem;
using Paragony.Mappings;
using Paragony.Models;
using Paragony.Extensions;


namespace Paragony.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReceiptItemsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IReceiptCalculationService _calculationService; 

        public ReceiptItemsController(AppDbContext context, IReceiptCalculationService calculationService) 
        {
            _context = context;
            _calculationService = calculationService;
        }

        // GET: api/receiptitems - Tylko pozycje ze SWOICH paragonów
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var clientId = this.GetCurrentClientId();

            var items = await _context.ReceiptItems
                .Include(i => i.Product)
                .Include(i => i.Receipt)
                .Where(i => i.Receipt.ClientId == clientId)
                .ToListAsync();

            return Ok(items.Select(ReceiptItemMapper.ToDto));
        }

        // GET: api/receiptitems/{id} - Tylko pozycje ze SWOJEGO paragonu
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var clientId = this.GetCurrentClientId();

            var item = await _context.ReceiptItems
                .Include(i => i.Product)
                .Include(i => i.Receipt)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
                return NotFound();

            if (item.Receipt.ClientId != clientId)
                return Forbid();

            return Ok(ReceiptItemMapper.ToDto(item));
        }

        // GET: api/receiptitems/receipt/{receiptId} - Wszystkie pozycje z konkretnego paragonu
        [HttpGet("receipt/{receiptId}")]
        public async Task<IActionResult> GetByReceipt(int receiptId)
        {
            var clientId = this.GetCurrentClientId();

            var receipt = await _context.Receipts.FindAsync(receiptId);
            if (receipt == null)
                return NotFound(new { message = "Receipt not found" });

            if (receipt.ClientId != clientId)
                return Forbid();

            var items = await _context.ReceiptItems
                .Include(i => i.Product)
                .Where(i => i.ReceiptId == receiptId)
                .ToListAsync();

            return Ok(items.Select(ReceiptItemMapper.ToDto));
        }

        // POST: api/receiptitems - Dodaj pozycję do SWOJEGO paragonu
        [HttpPost]
        public async Task<IActionResult> Create(CreateReceiptItemDto dto)
        {
            var clientId = this.GetCurrentClientId();

            var receipt = await _context.Receipts.FindAsync(dto.ReceiptId);
            if (receipt == null)
                return NotFound(new { message = $"Receipt with ID {dto.ReceiptId} not found" });

            if (receipt.ClientId != clientId)
                return Forbid();

            var product = await _context.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == dto.ProductId);

            if (product == null)
                return BadRequest(new { message = $"Product with ID {dto.ProductId} not found" });

            if (product.ClientId != clientId)
                return Forbid();

            var item = ReceiptItemMapper.FromCreateDto(dto, product);
            _context.ReceiptItems.Add(item);
            await _context.SaveChangesAsync();

            //  Automatyczne przeliczanie sum paragonu
            await _calculationService.RecalculateTotals(dto.ReceiptId);

            await _context.Entry(item).Reference(i => i.Product).LoadAsync();

            return CreatedAtAction(nameof(Get), new { id = item.Id }, ReceiptItemMapper.ToDto(item));
        }

        // PUT: api/receiptitems/{id} - Edytuj pozycję ze SWOJEGO paragonu
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateReceiptItemDto dto)
        {
            var clientId = this.GetCurrentClientId();

            var item = await _context.ReceiptItems
                .Include(i => i.Receipt)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
                return NotFound();

            if (item.Receipt.ClientId != clientId)
                return Forbid();

            var product = await _context.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == dto.ProductId);

            if (product == null)
                return BadRequest(new { message = $"Product with ID {dto.ProductId} not found" });

            if (product.ClientId != clientId)
                return Forbid();

            ReceiptItemMapper.UpdateFromDto(item, dto, product);
            await _context.SaveChangesAsync();

            // Automatyczne przeliczanie sum paragonu
            await _calculationService.RecalculateTotals(item.ReceiptId);

            return NoContent();
        }

        // DELETE: api/receiptitems/{id} - Usuń pozycję ze SWOJEGO paragonu
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var clientId = this.GetCurrentClientId();

            var item = await _context.ReceiptItems
                .Include(i => i.Receipt)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item == null)
                return NotFound();

            if (item.Receipt.ClientId != clientId)
                return Forbid();

            int receiptId = item.ReceiptId; //Zachowaj ID przed usunięciem

            _context.ReceiptItems.Remove(item);
            await _context.SaveChangesAsync();

            // Automatyczne przeliczanie sum paragonu
            await _calculationService.RecalculateTotals(receiptId);

            return NoContent();
        }

        // DODANE - Statystyki pozycji z paragonów użytkownika
        [HttpGet("stats")]
        public async Task<IActionResult> GetMyStats()
        {
            var clientId = this.GetCurrentClientId();

            var stats = await _context.ReceiptItems
                .Include(i => i.Receipt)
                .Where(i => i.Receipt.ClientId == clientId)
                .GroupBy(i => 1)
                .Select(g => new
                {
                    totalItems = g.Count(),
                    totalQuantity = g.Sum(i => i.Quantity),
                    totalValue = g.Sum(i => i.Quantity * i.UnitPrice),
                    averageItemPrice = g.Average(i => i.UnitPrice)
                })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                clientId = clientId,
                stats = stats ?? new
                {
                    totalItems = 0,
                    totalQuantity = 0m,
                    totalValue = 0m,
                    averageItemPrice = 0m
                }
            });
        }
    }
}