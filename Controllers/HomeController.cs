using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HigerTrack.Models;
using HigerTrack.Data;
using System.Security.Claims;


namespace HigerTrack.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly AppDbContext _context;

        public HomeController(ILogger<HomeController> logger, AppDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        public IActionResult Index()
        {
            var mapPoints = _context.MapPoints
                .Include(mp => mp.CreatedUser)
                .ToList();
            return View(mapPoints);
        }

        [Authorize]
        public IActionResult Privacy()
        {
            return View();
        }

        [Authorize(Roles = "Admin")]
        public IActionResult Admin()
        {
            var mapPoints = _context.MapPoints
                .Include(mp => mp.CreatedUser)
                .ToList();
            return View(mapPoints);
        }

        [Authorize(Roles = "User")]
        [ActionName("User")]
        public IActionResult UserMapPoints()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var mapPoints = _context.MapPoints
                .Where(mp => mp.CreatedBy == userId)
                .Include(mp => mp.CreatedUser)
                .ToList();

            // Secara eksplisit arahkan ke view 'User.cshtml'
            return View("User", mapPoints);
        }



        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}