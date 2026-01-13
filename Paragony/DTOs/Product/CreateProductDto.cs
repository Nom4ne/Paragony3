public class CreateProductDto
{
    // public int ClientId { get; set; } // USUŃ - będzie ustawiony automatycznie
    
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal BasePrice { get; set; } // Dodane
    public decimal VatRate { get; set; } = 23;
    public bool IsDynamicPrice { get; set; } // Dodane

}