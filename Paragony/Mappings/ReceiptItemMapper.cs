using Paragony.DTOs.ReceiptItem;
using Paragony.Models;

namespace Paragony.Mappings
{
    public static class ReceiptItemMapper
    {
        public static ReceiptItemDto ToDto(ReceiptItem item)
        {
            return new ReceiptItemDto
            {
                Id = item.Id,
                ReceiptId = item.ReceiptId,
                ProductId = item.ProductId ?? 0,
                Name = item.Name,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                VatRate = item.VatRate ?? 0,
                TotalAmount = item.TotalPrice,
                ProductName = item.Product?.Name
            };
        }

        public static ReceiptItem FromCreateDto(CreateReceiptItemDto dto, Product product)
        {
            return new ReceiptItem
            {
                ReceiptId = dto.ReceiptId,
                ProductId = dto.ProductId,
                Name = product.Name,
                Quantity = dto.Quantity,
                UnitPrice = product.Price,
                VatRate = product.VatRate
            };
        }

        public static void UpdateFromDto(ReceiptItem item, UpdateReceiptItemDto dto, Product product)
        {
            item.ReceiptId = dto.ReceiptId;
            item.ProductId = dto.ProductId;
            item.Name = product.Name;
            item.Quantity = dto.Quantity;
            item.UnitPrice = product.Price;
            item.VatRate = product.VatRate;
        }
    }
}