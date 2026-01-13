using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Paragony.Extensions
{
    public static class ControllerBaseExtensions
    {
        public static int GetCurrentClientId(this ControllerBase controller)
        {
            var clientIdClaim = controller.User.FindFirst("clientId")?.Value;

            if (string.IsNullOrEmpty(clientIdClaim))
                throw new UnauthorizedAccessException("Client ID not found in token");

            return int.Parse(clientIdClaim);
        }

        public static string GetCurrentUserEmail(this ControllerBase controller)
        {
            return controller.User.FindFirst(ClaimTypes.Email)?.Value
                ?? controller.User.FindFirst("email")?.Value
                ?? throw new UnauthorizedAccessException("Email not found in token");
        }
    }
}