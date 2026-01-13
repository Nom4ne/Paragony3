using System.ComponentModel.DataAnnotations;

namespace Paragony.DTOs.ReceiptItem
{
    public record CreateReceiptItemDto(
        [Required] int ReceiptId,
        [Required] int ProductId,
        decimal Quantity
    );
}