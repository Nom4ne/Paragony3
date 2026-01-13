using Paragony.DTOs.Client;
using Paragony.DTOs.PaymentMethod;
using Paragony.DTOs.Receipt;
using Paragony.DTOs.ReceiptItem;
using Paragony.DTOs.Template;

namespace Paragony.Mappings
{
    public static class ReceiptMapper
    {
        public static ReceiptDto ToDto(Receipt receipt)
        {
            if (receipt == null) return null!;

            return new ReceiptDto
            {
                Id = receipt.Id,
                ReceiptNumber = receipt.ReceiptNumber,
                ClientId = receipt.ClientId,
                Client = receipt.Client != null ? new ClientDto
                {
                    Id = receipt.Client.Id,
                    Name = receipt.Client.Name ?? string.Empty,
                    NIP = receipt.Client.NIP,
                    Address = receipt.Client.Address,
                    City = receipt.Client.City,
                    PostalCode = receipt.Client.PostalCode,
                    Phone = receipt.Client.Phone,
                    Email = receipt.Client.Email,
                    CreatedAt = receipt.Client.CreatedAt
                } : null,
                TemplateId = receipt.TemplateId,
                Template = receipt.Template != null ? new ReceiptTemplateDto
                {
                    Id = receipt.Template.Id,
                    ClientId = receipt.Template.ClientId,
                    Name = receipt.Template.Name,
                    HeaderText = receipt.Template.Header ?? string.Empty,
                    FooterText = receipt.Template.Footer ?? string.Empty,
                    LogoFile = receipt.Template.LogoFile,
                    FontStyle = receipt.Template.FontStyle ?? string.Empty,
                    CreatedAt = receipt.Template.CreatedAt
                } : null,
                PaymentMethodId = receipt.PaymentMethodId,
                PaymentMethod = receipt.PaymentMethod != null ? new PaymentMethodDto
                {
                    Id = receipt.PaymentMethod.Id,
                    Name = receipt.PaymentMethod.Name,
                    DisplayName = receipt.PaymentMethod.DisplayName,
                    IsActive = receipt.PaymentMethod.IsActive
                } : null,
                TotalAmount = receipt.TotalAmount,
                TotalVat = receipt.TotalVat,
                PaidAmount = receipt.PaidAmount,
                ChangeAmount = receipt.ChangeAmount,
                DiscountPercent = receipt.DiscountPercent,
                DiscountAmount = receipt.DiscountAmount,
                Status = receipt.Status,
                CreatedAt = receipt.CreatedAt,
                PrintedAt = receipt.PrintedAt,
                Items = receipt.Items?.Select(item => new ReceiptItemDto
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
                }).ToList() ?? new List<ReceiptItemDto>()
            };
        }

        //  Nie pobieraj ClientId i ReceiptNumber z DTO (ustawiane w kontrolerze)
        public static Receipt FromCreateDto(CreateReceiptDto dto)
        {
            return new Receipt
            {
                // ReceiptNumber będzie ustawiony w kontrolerze (automatyczne generowanie)
                // ClientId będzie ustawiony w kontrolerze (z tokenu JWT)
                TemplateId = dto.TemplateId,
                PaymentMethodId = dto.PaymentMethodId,
                TotalAmount = dto.TotalAmount,
                TotalVat = dto.TotalVat ?? 0,
                PaidAmount = dto.PaidAmount,
                ChangeAmount = dto.ChangeAmount,
                DiscountPercent = dto.DiscountPercent ?? 0,
                DiscountAmount = dto.DiscountAmount ?? 0,
                Status = dto.Status ?? "generated",
                PrintedAt = dto.PrintedAt
            };
        }

        // Nie aktualizuj ClientId (dla bezpieczeństwa)
        public static void UpdateFromDto(Receipt receipt, UpdateReceiptDto dto)
        {
            receipt.ReceiptNumber = dto.ReceiptNumber;
            // receipt.ClientId = dto.ClientId; // USUNIĘTE - nie można zmieniać właściciela!
            receipt.TemplateId = dto.TemplateId;
            receipt.PaymentMethodId = dto.PaymentMethodId;
            receipt.TotalAmount = dto.TotalAmount;
            receipt.TotalVat = dto.TotalVat;
            receipt.PaidAmount = dto.PaidAmount;
            receipt.ChangeAmount = dto.ChangeAmount;
            receipt.DiscountPercent = dto.DiscountPercent;
            receipt.DiscountAmount = dto.DiscountAmount;
            receipt.Status = dto.Status;
            receipt.PrintedAt = dto.PrintedAt;
        }
    }
}