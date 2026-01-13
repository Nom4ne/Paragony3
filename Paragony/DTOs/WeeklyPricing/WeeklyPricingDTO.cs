namespace Paragony.Models // lub Paragony.DTOs
{
    public class WeeklyPricingDto
    {
        public decimal MondayPercent { get; set; }
        public decimal TuesdayPercent { get; set; }
        public decimal WednesdayPercent { get; set; }
        public decimal ThursdayPercent { get; set; }
        public decimal FridayPercent { get; set; }
        public decimal SaturdayPercent { get; set; }
        public decimal SundayPercent { get; set; }
    }
}