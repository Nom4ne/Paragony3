using System.ComponentModel.DataAnnotations;

namespace Paragony.DTOs.ReceiptItem
{
    public record UpdateReceiptItemDto(
        [Required] int ReceiptId,
        [Required] int ProductId,
        decimal Quantity
    );
}