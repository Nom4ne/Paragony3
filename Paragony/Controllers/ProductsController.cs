using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Paragony.Models;
using Paragony.Extensions;

namespace Paragony.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProductsController(AppDbContext context) => _context = context;

        // GET: api/products
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var clientId = this.GetCurrentClientId();

            var products = await _context.Products
                .AsNoTracking()
                .Where(p => p.ClientId == clientId)
                .OrderByDescending(p => p.Id)
                .ToListAsync();

            return Ok(products.Select(ProductMapper.ToDto));
        }

        // GET: api/products/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var clientId = this.GetCurrentClientId();

            var product = await _context.Products
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) return NotFound();
            if (product.ClientId != clientId) return Forbid();

            return Ok(ProductMapper.ToDto(product));
        }

        // POST: api/products
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var clientId = this.GetCurrentClientId();

            var product = ProductMapper.FromCreateDto(dto);

            // Przypisanie właściciela
            product.ClientId = clientId;

            // Opcjonalnie: Logika biznesowa, np. jeśli IsDynamicPrice, to cena = 0 na start?
            // Tutaj po prostu zapisujemy to co przyszło z frontu:

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(Get), new { id = product.Id }, ProductMapper.ToDto(product));
        }

        // PUT: api/products/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProductDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var clientId = this.GetCurrentClientId();

            var product = await _context.Products.FindAsync(id);

            if (product == null) return NotFound();
            if (product.ClientId != clientId) return Forbid();

            // === AKTUALIZACJA PÓL MODELU ===
            product.Name = dto.Name;
            product.Price = dto.Price;
            product.BasePrice = dto.BasePrice;       // Aktualizacja BasePrice
            product.VatRate = dto.VatRate;
            product.IsDynamicPrice = dto.IsDynamicPrice; // Aktualizacja flagi

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/products/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var clientId = this.GetCurrentClientId();

            var product = await _context.Products.FindAsync(id);

            if (product == null) return NotFound();
            if (product.ClientId != clientId) return Forbid();

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/products/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetMyStats()
        {
            var clientId = this.GetCurrentClientId();

            var stats = await _context.Products
                .Where(p => p.ClientId == clientId)
                .GroupBy(p => 1)
                .Select(g => new
                {
                    totalProducts = g.Count(),
                    // Nie mamy pola Stock, więc nie możemy policzyć fizycznej ilości sztuk
                    // Możemy policzyć sumę cen wszystkich produktów (jako wartość oferty)
                    totalOfferValue = g.Sum(p => p.Price),
                    averagePrice = g.Average(p => p.Price),
                    minPrice = g.Min(p => p.Price),
                    maxPrice = g.Max(p => p.Price),
                    // Statystyka ile produktów ma cenę dynamiczną
                    dynamicPriceCount = g.Count(p => p.IsDynamicPrice)
                })
                .FirstOrDefaultAsync();

            var result = stats ?? new
            {
                totalProducts = 0,
                totalOfferValue = 0m,
                averagePrice = 0.0m, // decimal w C# to 'm'
                minPrice = 0m,
                maxPrice = 0m,
                dynamicPriceCount = 0
            };

            return Ok(result);
        }
    }
}