namespace Paragony.DTOs.Auth
{
    public class Verify2faDto
    {
        public string SessionToken { get; set; } = string.Empty; // Zamiast UserId
        public string Code { get; set; } = string.Empty;
    }

    public class ResendCodeDto
    {
        public string SessionToken { get; set; } = string.Empty;
    }
}
