using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Paragony.Models;

namespace Paragony.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentMethodsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public PaymentMethodsController(AppDbContext context) => _context = context;

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _context.PaymentMethods.ToListAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var method = await _context.PaymentMethods.FindAsync(id);
            return method == null ? NotFound() : Ok(method);
        }

        [HttpPost]
        public async Task<IActionResult> Create(PaymentMethod method)
        {
            _context.PaymentMethods.Add(method);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(Get), new { id = method.Id }, method);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, PaymentMethod updated)
        {
            if (id != updated.Id) return BadRequest();
            _context.Entry(updated).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var method = await _context.PaymentMethods.FindAsync(id);
            if (method == null) return NotFound();
            _context.PaymentMethods.Remove(method);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
