namespace Paragony.Models
{
    public static class WeeklyPricingMapper
    {
        public static WeeklyPricingDto ToDto(ClientWeeklyConfigs model)
        {
            return new WeeklyPricingDto
            {
                MondayPercent = model.MondayPercent,
                TuesdayPercent = model.TuesdayPercent,
                WednesdayPercent = model.WednesdayPercent,
                ThursdayPercent = model.ThursdayPercent,
                FridayPercent = model.FridayPercent,
                SaturdayPercent = model.SaturdayPercent,
                SundayPercent = model.SundayPercent
            };
        }

        // Metoda do aktualizacji istniejącego modelu danymi z DTO
        public static void UpdateEntity(ClientWeeklyConfigs entity, WeeklyPricingDto dto)
        {
            entity.MondayPercent = dto.MondayPercent;
            entity.TuesdayPercent = dto.TuesdayPercent;
            entity.WednesdayPercent = dto.WednesdayPercent;
            entity.ThursdayPercent = dto.ThursdayPercent;
            entity.FridayPercent = dto.FridayPercent;
            entity.SaturdayPercent = dto.SaturdayPercent;
            entity.SundayPercent = dto.SundayPercent;
        }
    }
}