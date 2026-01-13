using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Paragony.Models
{
    // WAŻNE: Tutaj zmieniamy mapowanie na Twoją istniejącą tabelę
    [Table("ClientWeeklyConfigs")]
    public class ClientWeeklyConfigs
    {
        [Key]
        public int Id { get; set; }

        public int ClientId { get; set; }

        [ForeignKey("ClientId")]
        public Client? Client { get; set; }

        // Upewnij się, że nazwy kolumn w bazie pasują do tych nazw właściwości.
        // Jeśli w bazie masz np. małe litery, musisz dodać atrybut [Column("nazwa_kolumny")]

        [Column(TypeName = "decimal(5,2)")]
        public decimal MondayPercent { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal TuesdayPercent { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal WednesdayPercent { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal ThursdayPercent { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal FridayPercent { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal SaturdayPercent { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal SundayPercent { get; set; }
    }
}