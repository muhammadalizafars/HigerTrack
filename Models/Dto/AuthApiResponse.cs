public class AuthApiResponse
{
    public string AccessToken { get; set; }
    public string RefreshToken { get; set; }
    public DateTime Expiration { get; set; }
    public string Email { get; set; }
    public string Role { get; set; }
    public string FullName { get; set; } // Tambahkan ini
}