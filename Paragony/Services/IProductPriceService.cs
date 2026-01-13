using System.Threading.Tasks;

namespace Paragony.Services
{
    public interface IProductPriceService
    {
        Task UpdateGlobalPricesAsync();
    }
}