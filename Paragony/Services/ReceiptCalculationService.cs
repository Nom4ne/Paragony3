
using Microsoft.EntityFrameworkCore;
using Paragony.Models;

public interface IReceiptCalculationService
{
    Task RecalculateTotals(int receiptId);
}

public class ReceiptCalculationService : IReceiptCalculationService
{
    private readonly AppDbContext _context;

    public ReceiptCalculationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task RecalculateTotals(int receiptId)
    {
        var receipt = await _context.Receipts
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == receiptId);

        if (receipt == null) return;

        // 1. SUMA BRUTTO PRZED RABATEM
        decimal subtotalGross = receipt.Items.Sum(i => i.UnitPrice * i.Quantity);

        // 2. OBLICZ RABAT
        decimal discountAmount = 0;

        if (receipt.DiscountPercent > 0)
        {
            discountAmount = Math.Round(subtotalGross * (receipt.DiscountPercent.Value / 100m), 2);
        }
        else if (receipt.DiscountAmount > 0)
        {
            discountAmount = Math.Round(receipt.DiscountAmount.Value, 2);
        }

        // Zabezpieczenie: rabat nie może być większy niż suma
        if (discountAmount > subtotalGross)
            discountAmount = subtotalGross;

        // 3. PROPORCJONALNY RABAT NA KAŻDĄ POZYCJĘ
        decimal totalVat = 0;
        decimal totalGrossAfterDiscount = 0;

        foreach (var item in receipt.Items)
        {
            decimal itemGross = item.UnitPrice * item.Quantity;

            // Udział procentowy pozycji w sumie
            decimal share = itemGross / subtotalGross;

            // Rabat dla tej pozycji
            decimal itemDiscount = Math.Round(discountAmount * share, 2);

            decimal itemGrossAfterDiscount = itemGross - itemDiscount;

            // Przeliczenie netto i VAT po rabacie
            decimal divisor = (decimal)(1 + item.VatRate / 100);
            decimal itemNet = itemGrossAfterDiscount / divisor;
            decimal itemVat = itemGrossAfterDiscount - itemNet;

            totalVat += itemVat;
            totalGrossAfterDiscount += itemGrossAfterDiscount;
        }

        // 4. ZAPIS DO BAZY
        receipt.DiscountAmount = discountAmount;
        receipt.TotalVat = Math.Round(totalVat, 2);
        receipt.TotalAmount = Math.Round(totalGrossAfterDiscount, 2);

        // 5. RESZTA
        receipt.ChangeAmount = Math.Max(0, Math.Round((decimal)(receipt.PaidAmount - receipt.TotalAmount), 2));

        await _context.SaveChangesAsync();
    }

}