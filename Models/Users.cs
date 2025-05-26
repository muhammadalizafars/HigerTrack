using Microsoft.AspNetCore.Identity;  
namespace HigerTrack.Models
{
    public class Users : IdentityUser
    {
        public string? FullName { get; set; }
    }
}
