using Microsoft.EntityFrameworkCore;

namespace Paragony.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Client> Clients { get; set; }
        public DbSet<PaymentMethod> PaymentMethods { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<ReceiptTemplate> ReceiptTemplates { get; set; }
        public DbSet<Receipt> Receipts { get; set; }
        public DbSet<ReceiptItem> ReceiptItems { get; set; }

        public DbSet<ClientWeeklyConfigs> WeeklyPricings { get; set; }
    }
}
