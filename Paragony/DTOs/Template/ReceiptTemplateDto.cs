namespace Paragony.DTOs.Template
{
    public class ReceiptTemplateDto
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public string Name { get; set; } = null!;
        public string? HeaderText { get; set; }
        public string? FooterText { get; set; }
        public string? LogoFile { get; set; }
        public string FontStyle { get; set; } = "default";
        public DateTime CreatedAt { get; set; }        
        public string? LogoOriginalName { get; set; }
    }
}
