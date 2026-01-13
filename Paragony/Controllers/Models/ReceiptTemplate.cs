using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paragony.Models
{
    [Table("ReceiptTemplates")]
    public class ReceiptTemplate
    {
        [Key]
        public int Id { get; set; }

        //  Relacja do klienta (opcjonalna)
        public int ClientId { get; set; }
        public Client? Client { get; set; }

        //  Nazwa szablonu
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = "Standard";

        //  Nagłówek drukowany nad paragonem
        [Column("HeaderText")]
        [MaxLength(255)]
        public string? Header { get; set; }

        //  Stopka drukowana pod paragonem
        [Column("FooterText")]
        [MaxLength(255)]
        public string? Footer { get; set; }

        //  Ścieżka do logo
        [Column("LogoFile")]
        [MaxLength(512)]
        public string? LogoFile { get; set; }

        //  Styl czcionki (np. mono, serif)
        [MaxLength(50)]
        public string? FontStyle { get; set; }

        //  Data utworzenia
        [Column("LogoOriginalName")]
        [MaxLength(512)]
        public string? LogoOriginalName { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
