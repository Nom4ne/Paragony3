using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Paragony.Models;
using Paragony.Extensions; // Zakładam, że tu masz GetCurrentClientId()

namespace Paragony.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class WeeklyPricingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public WeeklyPricingController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/WeeklyPricing
        // Pobiera ustawienia dla zalogowanego użytkownika
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var clientId = this.GetCurrentClientId();

            var pricing = await _context.WeeklyPricings
                .FirstOrDefaultAsync(wp => wp.ClientId == clientId);

            if (pricing == null)
            {
                // Jeśli nie ma ustawień, zwróć domyślne wartości (wszystko 1.00)
                // Możesz tu opcjonalnie stworzyć rekord w bazie, albo tylko zwrócić DTO
                return Ok(new WeeklyPricingDto
                {
                    MondayPercent = 1.00m,
                    TuesdayPercent = 1.00m,
                    WednesdayPercent = 1.00m,
                    ThursdayPercent = 1.00m,
                    FridayPercent = 1.00m,
                    SaturdayPercent = 1.00m,
                    SundayPercent = 1.00m
                });
            }

            return Ok(WeeklyPricingMapper.ToDto(pricing));
        }

        // PUT: api/WeeklyPricing
        // Aktualizuje lub tworzy ustawienia dla zalogowanego użytkownika
        [HttpPut]
        public async Task<IActionResult> Update([FromBody] WeeklyPricingDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var clientId = this.GetCurrentClientId();

            var pricing = await _context.WeeklyPricings
                .FirstOrDefaultAsync(wp => wp.ClientId == clientId);

            if (pricing == null)
            {
                // Jeśli rekord nie istnieje, tworzymy nowy
                pricing = new ClientWeeklyConfigs { ClientId = clientId };
                _context.WeeklyPricings.Add(pricing);
            }

            // Aktualizujemy pola
            WeeklyPricingMapper.UpdateEntity(pricing, dto);

            await _context.SaveChangesAsync();

            return Ok(WeeklyPricingMapper.ToDto(pricing));
        }
    }
}