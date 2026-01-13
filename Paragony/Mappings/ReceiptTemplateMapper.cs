using Paragony.DTOs.Template;

using Paragony.Models;

namespace Paragony.Mappings
{
    public static class ReceiptTemplateMapper
    {
        public static ReceiptTemplateDto ToDto(ReceiptTemplate t)
        {
            return new ReceiptTemplateDto
            {
                Id = t.Id,
                Name = t.Name,
                HeaderText = t.Header,
                FooterText = t.Footer,
                FontStyle = t.FontStyle,
                LogoFile = t.LogoFile,
                LogoOriginalName = t.LogoOriginalName,
            };
        }

        public static ReceiptTemplate FromCreateDto(CreateReceiptTemplateDto dto)
        {
            return new ReceiptTemplate
            {
                Name = dto.Name,
                Header = dto.HeaderText,
                Footer = dto.FooterText,
                FontStyle = dto.FontStyle,
                LogoOriginalName = dto.LogoOriginalName,
            };
        }
    }
}
