using Microsoft.AspNetCore.Http;

namespace Paragony.Models
{
    public class CreateReceiptTemplateDto
    {
        public string Name { get; set; }
        public string HeaderText { get; set; }
        public string FooterText { get; set; }
        public string FontStyle { get; set; }

        public string? LogoFile { get; set; }
        public string? LogoOriginalName { get; set; }

        // Plik z frontendu — FormData["File"]
       
    }
}
