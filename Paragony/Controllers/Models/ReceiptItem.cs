using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paragony.Models
{
    [Table("ReceiptItems")]
    public class ReceiptItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ReceiptId { get; set; }

        public int? ProductId { get; set; }

        [Required]
        [MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        [Column(TypeName = "numeric(10,2)")]
        public decimal Quantity { get; set; } = 1;

        [Required]
        [Column(TypeName = "numeric(10,2)")]
        public decimal UnitPrice { get; set; }

        [Column(TypeName = "numeric(5,2)")]
        public decimal? VatRate { get; set; }

        [Required]
        [Column(TypeName = "numeric(10,2)")]
        public decimal TotalPrice { get; set; }

        // Navigation properties
        public virtual Receipt? Receipt { get; set; }
        public virtual Product? Product { get; set; }
       
    }
}