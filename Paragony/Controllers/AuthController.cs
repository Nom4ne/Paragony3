using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Paragony.DTOs.Auth;
using Paragony.Models;
using Paragony.Services;

namespace Paragony.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IJwtService _jwtService;
        private readonly IPasswordService _passwordService;
        private readonly IConfiguration _configuration;
        private readonly ITwoFaService _twoFaService;

        public AuthController(
            AppDbContext context,
            IJwtService jwtService,
            IPasswordService passwordService,
            IConfiguration configuration,
            ITwoFaService twoFaService)
        {
            _context = context;
            _jwtService = jwtService;
            _passwordService = passwordService;
            _configuration = configuration;
            _twoFaService = twoFaService;
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            if (await _context.Clients.AnyAsync(c => c.Email == dto.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            var passwordHash = _passwordService.HashPassword(dto.Password);

            var client = new Client
            {
                Email = dto.Email,
                PasswordHash = passwordHash,
                Name = dto.Name,
                NIP = dto.NIP,
                Address = dto.Address,
                City = dto.City,
                PostalCode = dto.PostalCode,
                Phone = dto.Phone,
                ContactEmail = dto.ContactEmail,
                TwoFactorEnabled = false
            };

            _context.Clients.Add(client);
            await _context.SaveChangesAsync();

            var token = _jwtService.GenerateToken(client.Id, client.Email!);
            var expiryMinutes = int.Parse(_configuration["JwtSettings:ExpiryMinutes"] ?? "60");

            return Ok(new AuthResponseDto
            {
                Token = token,
                ClientId = client.Id,
                Email = client.Email!,
                ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes)
            });
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var client = await _context.Clients
                .FirstOrDefaultAsync(c => c.Email == dto.Email);

            if (client == null)
                return Unauthorized(new { message = "Invalid email or password" });

            if (!_passwordService.VerifyPassword(dto.Password, client.PasswordHash))
                return Unauthorized(new { message = "Invalid email or password" });

            // SPRAWDŹ CZY KLIENT MA WŁĄCZONE 2FA
            if (client.TwoFactorEnabled)
            {
                if (string.IsNullOrEmpty(client.Phone))
                    return BadRequest(new { message = "Phone number is required for 2FA" });

                // GENERUJ KOD 2FA
                var code = new Random().Next(100000, 999999).ToString();

                // GENERUJ UNIKALNY TOKEN SESYJNY
                var sessionToken = _twoFaService.GenerateSessionToken();

                //  POPRAWIONE: Zapisz kod z sessionToken (3 parametry!)
                _twoFaService.SaveCode(client.Id, sessionToken, code);

                // Zapisz powiązanie sesji z użytkownikiem
                _twoFaService.SaveSession(sessionToken, client.Id);

                // Wyślij SMS
                var smsSent = await _twoFaService.SendCodeAsync(client.Phone, code);

                if (!smsSent)
                    return StatusCode(500, new { message = "Failed to send verification code" });

                return Ok(new
                {
                    TwoFactorRequired = true,
                    SessionToken = sessionToken,
                    Message = "Verification code sent to your phone"
                });
            }

            // Jeśli 2FA wyłączone, od razu zwróć token
            var token = _jwtService.GenerateToken(client.Id, client.Email!);
            var expiryMinutes = int.Parse(_configuration["JwtSettings:ExpiryMinutes"] ?? "60");

            return Ok(new AuthResponseDto
            {
                Token = token,
                ClientId = client.Id,
                Email = client.Email!,
                ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes)
            });
        }

        // POST: api/auth/verify-2fa
        [HttpPost("verify-2fa")]
        public async Task<IActionResult> Verify2fa(Verify2faDto dto)
        {
            if (!Request.Headers.TryGetValue("X-2FA-Session", out var sessionToken) || string.IsNullOrEmpty(sessionToken))
            {
                return Unauthorized(new { message = "Session token is required" });
            }

            var userId = _twoFaService.GetUserIdFromSession(sessionToken!);

            if (userId == null)
                return Unauthorized(new { message = "Invalid or expired session" });

            // Weryfikuj kod z sessionToken (3 parametry!)
            if (!_twoFaService.Verify(userId.Value, sessionToken!, dto.Code))
                return Unauthorized(new { message = "Invalid or expired code" });

            // Usuń sesję po użyciu (jednorazowa)
            _twoFaService.RemoveSession(sessionToken!);

            var client = await _context.Clients.FindAsync(userId.Value);

            if (client == null)
                return NotFound(new { message = "User not found" });

            var token = _jwtService.GenerateToken(client.Id, client.Email!);
            var expiryMinutes = int.Parse(_configuration["JwtSettings:ExpiryMinutes"] ?? "60");

            return Ok(new AuthResponseDto
            {
                Token = token,
                ClientId = client.Id,
                Email = client.Email!,
                ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes)
            });
        }

        // POST: api/auth/2fa/enable
        [HttpPost("2fa/enable")]
        [Authorize]
        public async Task<IActionResult> Enable2FA()
        {
            var clientIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (clientIdClaim == null || !int.TryParse(clientIdClaim, out int clientId))
                return Unauthorized();

            var client = await _context.Clients.FindAsync(clientId);

            if (client == null)
                return NotFound();

            if (client.TwoFactorEnabled)
                return BadRequest(new { message = "2FA is already enabled" });

            if (string.IsNullOrEmpty(client.Phone))
                return BadRequest(new { message = "Phone number is required for 2FA" });

            client.TwoFactorEnabled = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "2FA enabled successfully" });
        }

        // POST: api/auth/2fa/disable
        [HttpPost("2fa/disable")]
        [Authorize]
        public async Task<IActionResult> Disable2FA()
        {
            var clientIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (clientIdClaim == null || !int.TryParse(clientIdClaim, out int clientId))
                return Unauthorized();

            var client = await _context.Clients.FindAsync(clientId);

            if (client == null)
                return NotFound();

            if (!client.TwoFactorEnabled)
                return BadRequest(new { message = "2FA is not enabled" });

            client.TwoFactorEnabled = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "2FA disabled successfully" });
        }

        // POST: api/auth/resend-code
        [HttpPost("resend-code")]
        public async Task<IActionResult> ResendCode()
        {
            if (!Request.Headers.TryGetValue("X-2FA-Session", out var sessionToken) || string.IsNullOrEmpty(sessionToken))
            {
                return Unauthorized(new { message = "Session token is required" });
            }

            var userId = _twoFaService.GetUserIdFromSession(sessionToken!);

            if (userId == null)
                return Unauthorized(new { message = "Invalid or expired session" });

            var client = await _context.Clients.FindAsync(userId.Value);

            if (client == null)
                return NotFound(new { message = "User not found" });

            if (!client.TwoFactorEnabled)
                return BadRequest(new { message = "2FA is not enabled for this account" });

            if (string.IsNullOrEmpty(client.Phone))
                return BadRequest(new { message = "Phone number not found" });

            // Wygeneruj nowy kod
            var code = new Random().Next(100000, 999999).ToString();

            //  POPRAWIONE: Zapisz kod z sessionToken (3 parametry!)
            _twoFaService.SaveCode(client.Id, sessionToken!, code);

            // Wyślij SMS
            var smsSent = await _twoFaService.SendCodeAsync(client.Phone, code);

            if (!smsSent)
                return StatusCode(500, new { message = "Failed to send verification code" });

            return Ok(new { message = "New verification code sent" });
        }

        // GET: api/auth/me
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            var clientIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (clientIdClaim == null || !int.TryParse(clientIdClaim, out int clientId))
                return Unauthorized();

            var client = await _context.Clients.FindAsync(clientId);

            if (client == null)
                return NotFound();

            return Ok(new
            {
                client.Id,
                client.Email,
                client.Name,
                client.NIP,
                client.Address,
                client.City,
                client.PostalCode,
                client.Phone,
                client.CreatedAt,
                client.ContactEmail,
                client.TwoFactorEnabled
            });
        }
    }
}