using Paragony.Models;

public static class ProductMapper
{
    public static object ToDto(Product p) => new
    {
        p.Id,
        p.Name,
        p.Price,
        p.BasePrice,      // Mapujemy BasePrice
        p.VatRate,
        p.IsDynamicPrice, // Mapujemy flagę
        p.ClientId
    };

    public static Product FromCreateDto(CreateProductDto dto) => new Product
    {
        Name = dto.Name,
        Price = dto.Price,
        BasePrice = dto.BasePrice,
        VatRate = dto.VatRate,
        IsDynamicPrice = dto.IsDynamicPrice
    };
}