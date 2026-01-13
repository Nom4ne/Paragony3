using Swashbuckle.AspNetCore.Annotations;

namespace Paragony.DTOs.Receipt
{
    public class CreateReceiptDto
    {
        [SwaggerIgnore]
        public string ReceiptNumber { get; set; } = string.Empty;

        //public int ClientId { get; set; }
        public int? TemplateId { get; set; }
        public int? PaymentMethodId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal? TotalVat { get; set; }
        public decimal? PaidAmount { get; set; }
        public decimal? ChangeAmount { get; set; }
        public decimal? DiscountPercent { get; set; }
        public decimal? DiscountAmount { get; set; }
        public string? Status { get; set; }
        public DateTime? PrintedAt { get; set; }
    }
}
