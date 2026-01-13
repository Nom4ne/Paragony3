
namespace Paragony.Models
{
    public class UpdateReceiptTemplateDto
    {
        public string Name { get; set; }
        public string HeaderText { get; set; }
        public string FooterText { get; set; }
        public string FontStyle { get; set; }

        public string? LogoFile { get; set; }
        public string? LogoOriginalName { get; set; }


        // Opcjonalny — wysyłamy tylko jeśli user wybrał nowe logo
        
    }
}
