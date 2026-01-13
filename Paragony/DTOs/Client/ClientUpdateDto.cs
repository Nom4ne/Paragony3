namespace Paragony.DTOs.Client
{
    public class ClientUpdateDto
    {
        public string? PasswordHash { get; set; }
        public string? Name { get; set; }
        public string? NIP { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? ContactEmail { get; set; }
    }
}
