using HigerTrack.Data;
using HigerTrack.Models;
using Microsoft.AspNetCore.Identity;

namespace HigerTrack.Services
{
    public class SeedService
    {
        public static async Task SeedDatabase(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<Users>>();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<SeedService>>();

            try
            {
                // Ensure the database is ready
                logger.LogInformation("Ensuring the database is created.");
                await context.Database.EnsureCreatedAsync();

                // Seed roles
                logger.LogInformation("Seeding roles.");
                await AddRoleAsync(roleManager, "Admin");
                await AddRoleAsync(roleManager, "User");

                // Seed admin user
                logger.LogInformation("Seeding admin user.");
                var adminEmail = "a@a.com";
                var adminUser = await userManager.FindByEmailAsync(adminEmail);

                if (adminUser == null)
                {
                    adminUser = new Users
                    {
                        FullName = "MUHAMMAD ALI ZAFAR SIDIQ",
                        UserName = adminEmail,
                        NormalizedUserName = adminEmail.ToUpper(),
                        Email = adminEmail,
                        NormalizedEmail = adminEmail.ToUpper(),
                        EmailConfirmed = true,
                        SecurityStamp = Guid.NewGuid().ToString()
                    };

                    var result = await userManager.CreateAsync(adminUser, "Admin@123");
                    if (result.Succeeded)
                    {
                        logger.LogInformation("Assigning Admin role to the admin user.");
                        await userManager.AddToRoleAsync(adminUser, "Admin");
                    }
                    else
                    {
                        var errorMessages = string.Join(", ", result.Errors.Select(e => e.Description));
                        logger.LogError("Failed to create admin user: {Errors}", errorMessages);
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "An error occurred while seeding the database.");
            }
        }

        private static async Task AddRoleAsync(RoleManager<IdentityRole> roleManager, string roleName)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var result = await roleManager.CreateAsync(new IdentityRole(roleName));
                if (!result.Succeeded)
                {
                    var errorMessages = string.Join(", ", result.Errors.Select(e => e.Description));
                    throw new Exception($"Failed to create role '{roleName}': {errorMessages}");
                }
            }
        }
    }
}