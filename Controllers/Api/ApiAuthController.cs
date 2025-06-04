using HigerTrack.Data;
using HigerTrack.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace HigerTrack.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ApiAuthController : ControllerBase
    {
        private readonly UserManager<Users> userManager;
        private readonly RoleManager<IdentityRole> roleManager;
        private readonly IConfiguration config;
        private readonly AppDbContext context;

        public ApiAuthController(
            UserManager<Users> userManager,
            RoleManager<IdentityRole> roleManager,
            IConfiguration config,
            AppDbContext context)
        {
            this.userManager = userManager;
            this.roleManager = roleManager;
            this.config = config;
            this.context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginApiRequest model)
        {
            if (!ModelState.IsValid)
                return BadRequest("Invalid input");

            var user = await userManager.FindByEmailAsync(model.Email);
            if (user == null || !await userManager.CheckPasswordAsync(user, model.Password))
                return Unauthorized("Invalid credentials");

            var tokenResult = await GenerateTokensAsync(user);
            return Ok(tokenResult);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterApiRequest model)
        {
            if (!ModelState.IsValid)
                return BadRequest("Invalid input");

            var user = new Users
            {
                Email = model.Email,
                UserName = model.Email,
                FullName = model.FullName
            };

            var result = await userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded)
                return BadRequest(result.Errors);

            if (!await roleManager.RoleExistsAsync("User"))
                await roleManager.CreateAsync(new IdentityRole("User"));

            await userManager.AddToRoleAsync(user, "User");

            var tokenResult = await GenerateTokensAsync(user);
            return Ok(tokenResult);
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] string refreshToken)
        {
            var existing = await context.RefreshTokens
                .Include(r => r.User)
                .FirstOrDefaultAsync(r => r.Token == refreshToken && r.ExpiryDate > DateTime.UtcNow);

            if (existing == null)
                return Unauthorized("Invalid or expired refresh token.");

            context.RefreshTokens.Remove(existing);
            await context.SaveChangesAsync();

            var tokenResult = await GenerateTokensAsync(existing.User);
            return Ok(tokenResult);
        }

        private async Task<AuthApiResponse> GenerateTokensAsync(Users user)
        {
            var roles = await userManager.GetRolesAsync(user);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            foreach (var role in roles)
                claims.Add(new Claim(ClaimTypes.Role, role));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddHours(double.Parse(config["Jwt:ExpiresInHours"]));
            var token = new JwtSecurityToken(
                issuer: config["Jwt:Issuer"],
                audience: config["Jwt:Audience"],
                claims: claims,
                expires: expires,
                signingCredentials: creds
            );

            var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

            var refreshToken = new RefreshToken
            {
                Token = Guid.NewGuid().ToString(),
                ExpiryDate = DateTime.UtcNow.AddDays(7),
                UserId = user.Id
            };

            context.RefreshTokens.Add(refreshToken);
            await context.SaveChangesAsync();

            return new AuthApiResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken.Token,
                Expiration = expires,
                Email = user.Email,
                Role = roles.FirstOrDefault()
            };
        }
    }
}
