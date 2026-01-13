using Quartz;
using Paragony.Services;

namespace Paragony.Jobs
{
    [DisallowConcurrentExecution]
    public class PriceUpdateJob : IJob
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PriceUpdateJob> _logger;

        public PriceUpdateJob(IServiceScopeFactory scopeFactory, ILogger<PriceUpdateJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        public async Task Execute(IJobExecutionContext context)
        {
            _logger.LogInformation("[Quartz] Uruchamianie PriceUpdateJob...");

            try
            {
                // Tworzymy scope, aby pobrać serwis (który korzysta z DbContext)
                using (var scope = _scopeFactory.CreateScope())
                {
                    // Pobieramy nasz nowy serwis z kontenera DI
                    var priceService = scope.ServiceProvider.GetRequiredService<IProductPriceService>();

                    // Delegujemy zadanie do serwisu
                    await priceService.UpdateGlobalPricesAsync();
                }

                _logger.LogInformation("[Quartz] PriceUpdateJob zakończony sukcesem.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Quartz] BŁĄD w PriceUpdateJob.");

                // Rzucenie wyjątku informuje Quartz, że zadanie się nie powiodło (może spróbować ponowić)
                throw new JobExecutionException(ex);
            }
        }
    }
}