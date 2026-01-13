using Paragony.DTOs.Client;
using Paragony.DTOs.PaymentMethod;
using Paragony.DTOs.ReceiptItem;
using Paragony.DTOs.Template;

namespace Paragony.DTOs.Receipt
{
    public class ReceiptDto
    {
        public int Id { get; set; }
        public string ReceiptNumber { get; set; } = string.Empty;

        // Client Info
        public int ClientId { get; set; }
        public ClientDto? Client { get; set; }

        // Template Info
        public int? TemplateId { get; set; }
        public ReceiptTemplateDto? Template { get; set; }

        // Payment Method Info
        public int? PaymentMethodId { get; set; }
        public PaymentMethodDto? PaymentMethod { get; set; }

        // Financial Data
        public decimal TotalAmount { get; set; }
        public decimal? TotalVat { get; set; }
        public decimal? PaidAmount { get; set; }
        public decimal? ChangeAmount { get; set; }
        public decimal? DiscountPercent { get; set; }
        public decimal? DiscountAmount { get; set; }

        // Status & Dates
        public string Status { get; set; } = "generated";
        public DateTime CreatedAt { get; set; }
        public DateTime? PrintedAt { get; set; }

        // Receipt Items
        public List<ReceiptItemDto> Items { get; set; } = new();
    }
}