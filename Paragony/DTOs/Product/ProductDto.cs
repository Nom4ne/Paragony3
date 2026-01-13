public class ProductDto
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public string Name { get; set; } = null!;
    public decimal Price { get; set; }
    public decimal VatRate { get; set; }

    public decimal BasePrice { get; set; }

    public bool IsDynamicPrice { get; set; }


}
