namespace Paragony.DTOs.ReceiptItem
{
    public class ReceiptItemDto
    {
        public int Id { get; set; }
        public int ReceiptId { get; set; }
        public int ProductId { get; set; }
        public string Name { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal VatRate { get; set; }
        public decimal TotalAmount { get; set; }
        public string? ProductName { get; set; } // nazwa produktu z relacji
    }
}