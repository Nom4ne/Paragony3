public interface ITwoFaService
{
    string GenerateSessionToken();
    void SaveCode(int userId, string sessionToken, string code);
    bool Verify(int userId, string sessionToken, string code);
    Task<bool> SendCodeAsync(string phoneNumber, string code);

    void SaveSession(string sessionToken, int userId);
    int? GetUserIdFromSession(string sessionToken);
    void RemoveSession(string sessionToken);
}