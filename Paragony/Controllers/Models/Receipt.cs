using Paragony.Models;

public class Receipt
{
    public int Id { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public int ClientId { get; set; }
    public int? TemplateId { get; set; }
    public int? PaymentMethodId { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal? TotalVat { get; set; }
    public decimal? PaidAmount { get; set; }
    public decimal? ChangeAmount { get; set; }
    public decimal? DiscountPercent { get; set; }
    public decimal? DiscountAmount { get; set; }
    public string Status { get; set; } = "generated";
    public DateTime CreatedAt { get; set; }
    public DateTime? PrintedAt { get; set; }

    // Relacje
    public Client? Client { get; set; }
    public ReceiptTemplate? Template { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public ICollection<ReceiptItem> Items { get; set; } = new List<ReceiptItem>();

}
