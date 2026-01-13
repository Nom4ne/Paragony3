using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Paragony.DTOs.Client;
using Paragony.Models;
using Paragony.Services;
using Paragony.Extensions; 

namespace Paragony.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ClientsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPasswordService _passwordService;

        public ClientsController(AppDbContext context, IPasswordService passwordService)
        {
            _context = context;
            _passwordService = passwordService;
        }

        // GET: api/clients/me - Pobierz swoje dane
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var clientId = this.GetCurrentClientId();

            var client = await _context.Clients.FindAsync(clientId);

            if (client == null)
                return NotFound();

            return Ok(new
            {
                client.Id,
                client.Name,
                client.NIP,
                client.Address,
                client.City,
                client.PostalCode,
                client.Phone,
                client.Email,
                client.CreatedAt,
                client.ContactEmail
            });
        }

        // GET: api/clients - 
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            // Opcja 1: Zwróć tylko swoje dane
            var clientId = this.GetCurrentClientId();
            var client = await _context.Clients.FindAsync(clientId);

            return Ok(new[] { new
            {
                client.Id,
                client.Name,
                client.NIP,
                client.Address,
                client.City,
                client.PostalCode,
                client.Phone,
                client.Email,
                client.CreatedAt,
                client.ContactEmail
            }});

           
        }

        // GET: api/clients/{id} - Tylko swoje dane
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var clientId = this.GetCurrentClientId();

            // Sprawdź czy użytkownik próbuje pobrać swoje dane
            if (id != clientId)
                return Forbid(); // 403 Forbidden

            var client = await _context.Clients.FindAsync(id);

            if (client == null)
                return NotFound();

            return Ok(new
            {
                client.Id,
                client.Name,
                client.NIP,
                client.Address,
                client.City,
                client.PostalCode,
                client.Phone,
                client.Email,
                client.CreatedAt,
                client.ContactEmail
            });
        }

        // PUT: api/clients/{id} - Tylko swoje dane
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, ClientUpdateDto dto)
        {
            var clientId = this.GetCurrentClientId();

            // Sprawdź czy użytkownik próbuje edytować swoje dane
            if (id != clientId)
                return Forbid(); // 403 Forbidden - nie możesz edytować cudzych danych!

            var client = await _context.Clients.FindAsync(id);

            if (client == null)
                return NotFound();

            // Aktualizuj hasło jeśli podane
            if (!string.IsNullOrEmpty(dto.PasswordHash))
            {
                client.PasswordHash = _passwordService.HashPassword(dto.PasswordHash);
            }

            client.Name = dto.Name ?? client.Name;
            client.NIP = dto.NIP ?? client.NIP;
            client.Address = dto.Address ?? client.Address;
            client.City = dto.City ?? client.City;
            client.PostalCode = dto.PostalCode ?? client.PostalCode;
            client.Phone = dto.Phone ?? client.Phone;
            client.Email = dto.Email ?? client.Email;
            client.ContactEmail = dto.ContactEmail ?? client.ContactEmail;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/clients/{id} - Tylko swoje konto
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var clientId = this.GetCurrentClientId();

            // Sprawdź czy użytkownik próbuje usunąć swoje konto
            if (id != clientId)
                return Forbid(); // 403 Forbidden

            var client = await _context.Clients.FindAsync(id);

            if (client == null)
                return NotFound();

            _context.Clients.Remove(client);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}