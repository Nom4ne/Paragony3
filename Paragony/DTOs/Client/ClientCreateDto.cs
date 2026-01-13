// DTOs/ClientCreateDto.cs
namespace Paragony.DTOs.Client
{
    public class ClientCreateDto
    {
        public string PasswordHash { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? NIP { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }

        public string ContactEmail { get; set; }
    }
}
