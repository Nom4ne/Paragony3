using Microsoft.EntityFrameworkCore;
using Paragony.Models; // Namespace twojego DbContextu

namespace Paragony.Services
{
    public class ProductPriceService : IProductPriceService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ProductPriceService> _logger;

        public ProductPriceService(AppDbContext context, ILogger<ProductPriceService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task UpdateGlobalPricesAsync()
        {
            _logger.LogInformation("ProductPriceService: Rozpoczynanie procedury SQL aktualizacji cen...");

            // Wywołanie procedury składowanej
            // CALL public.aktualizuj_ceny_wszystkich_klientow()
            await _context.Database.ExecuteSqlRawAsync("CALL public.aktualizuj_ceny_wszystkich_klientow()");

            _logger.LogInformation("ProductPriceService: Procedura SQL zakończona.");
        }
    }
}