using System.ComponentModel.DataAnnotations.Schema;

namespace Paragony.Models
{
    public class Product
    {
        public int Id { get; set; }

        public int ClientId { get; set; }
        [ForeignKey("ClientId")] public Client? Client { get; set; }

        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal VatRate { get; set; } = 23;

        public decimal BasePrice { get; set; }

        public bool IsDynamicPrice { get; set; }
    }
}
