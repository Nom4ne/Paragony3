// ===== INTERFACE =====
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;


namespace Paragony.Services
{
    public class TwoFaService : ITwoFaService
    {
        private readonly IMemoryCache _cache;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<TwoFaService> _logger;

        public TwoFaService(
            IMemoryCache cache,
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<TwoFaService> logger)
        {
            _cache = cache;
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public string GenerateSessionToken()
        {
            return Guid.NewGuid().ToString("N");
        }

        public void SaveCode(int userId, string sessionToken, string code)
        {
            var cacheKey = $"2fa_{userId}_{sessionToken}";
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(5));

            _cache.Set(cacheKey, code, cacheOptions);
            _logger.LogInformation($"2FA code saved for user {userId}, session {sessionToken}");
        }

        public bool Verify(int userId, string sessionToken, string code)
        {
            var cacheKey = $"2fa_{userId}_{sessionToken}";

            if (_cache.TryGetValue(cacheKey, out string? storedCode))
            {
                if (storedCode == code)
                {
                    _cache.Remove(cacheKey);
                    _logger.LogInformation($"2FA code verified for user {userId}, session {sessionToken}");
                    return true;
                }
            }

            _logger.LogWarning($"Invalid 2FA code attempt for user {userId}, session {sessionToken}");
            return false;
        }

        public async Task<bool> SendCodeAsync(string phoneNumber, string code)
        {
            try
            {
                var apiUrl = _configuration["SmsSettings:ApiUrl"];

                _logger.LogInformation($"Attempting to send SMS to {phoneNumber}");
                _logger.LogInformation($"SMS API URL: {apiUrl}");

                if (string.IsNullOrEmpty(apiUrl))
                {
                    _logger.LogError("SMS API URL not configured in appsettings.json");
                    return false;
                }

                var formattedPhoneNumber = phoneNumber;
                if (phoneNumber.StartsWith("+48") && !phoneNumber.Contains(" "))
                {
                    formattedPhoneNumber = phoneNumber.Insert(3, " ");
                }
                else if (phoneNumber.StartsWith("48") && !phoneNumber.StartsWith("+"))
                {
                    formattedPhoneNumber = "+" + phoneNumber.Insert(2, " ");
                }

                _logger.LogInformation($"Formatted phone number: {formattedPhoneNumber}");

                var message = $"Twój kod weryfikacyjny: {code}. Kod jest ważny przez 5 minut.";

                var payload = new
                {
                    number = formattedPhoneNumber,
                    message = message
                };

                var jsonContent = JsonSerializer.Serialize(payload);
                _logger.LogInformation($"SMS payload: {jsonContent}");

                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                _logger.LogInformation($"Sending request to: {apiUrl}");
                var response = await _httpClient.PostAsync(apiUrl, content);

                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation($"SMS API Response Status: {response.StatusCode}");
                _logger.LogInformation($"SMS API Response Body: {responseContent}");

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation($"SMS sent successfully to {phoneNumber}");
                    return true;
                }
                else
                {
                    _logger.LogError($"Failed to send SMS. Status: {response.StatusCode}, Response: {responseContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Exception while sending SMS to {phoneNumber}: {ex.Message}");
                return false;
            }
        }

        public void SaveSession(string sessionToken, int userId)
        {
            var cacheKey = $"2fa_session_{sessionToken}";
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(10));

            _cache.Set(cacheKey, userId, cacheOptions);
            _logger.LogInformation($"2FA session saved for token {sessionToken} (userId: {userId})");
        }

        public int? GetUserIdFromSession(string sessionToken)
        {
            var cacheKey = $"2fa_session_{sessionToken}";

            if (_cache.TryGetValue(cacheKey, out int userId))
            {
                _logger.LogInformation($"2FA session found for token {sessionToken} (userId: {userId})");
                return userId;
            }

            _logger.LogWarning($"Invalid or expired 2FA session token: {sessionToken}");
            return null;
        }

        public void RemoveSession(string sessionToken)
        {
            var cacheKey = $"2fa_session_{sessionToken}";
            _cache.Remove(cacheKey);
            _logger.LogInformation($"2FA session removed for token {sessionToken}");
        }
    }
}