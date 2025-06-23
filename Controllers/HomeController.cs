using System.Diagnostics;
using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HigerTrack.Models;
using HigerTrack.Data;
using HigerTrack.Models.Dto;

namespace HigerTrack.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public HomeController(ILogger<HomeController> logger, AppDbContext context, IWebHostEnvironment env)
        {
            _logger = logger;
            _context = context;
            _env = env;
        }

        public IActionResult Index()
        {
            var mapPoints = _context.MapPoints
                .Include(mp => mp.CreatedUser)
                .ToList();
            return View(mapPoints);
        }

        [Authorize]
        public IActionResult Privacy() => View();

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
            return View("User", mapPoints);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateMapPoint(MapPointDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
                return Json(new { success = false, message = "User tidak terautentikasi." });

            if (!double.TryParse(dto.Latitude.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var latitude) ||
                !double.TryParse(dto.Longitude.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var longitude))
            {
                return Json(new { success = false, message = "Format Latitude atau Longitude tidak valid." });
            }

            string? imageUrl = null;
            if (dto.Image != null && dto.Image.Length > 0)
            {
                var uploadsPath = Path.Combine(_env.WebRootPath, "uploads");
                Directory.CreateDirectory(uploadsPath);

                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(dto.Image.FileName)}";
                var fullPath = Path.Combine(uploadsPath, fileName);

                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await dto.Image.CopyToAsync(stream);
                }

                imageUrl = $"/uploads/{fileName}";
            }

            var mapPoint = new MapPoint
            {
                Title = dto.Title,
                Description = dto.Description,
                Latitude = latitude,
                Longitude = longitude,
                ImageUrl = imageUrl,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.MapPoints.Add(mapPoint);
            await _context.SaveChangesAsync();

            return Json(new { success = true, message = "Marker berhasil ditambahkan." });
        }


        [HttpPost]
        [Authorize]
        public async Task<IActionResult> EditMapPoint(int id, MapPointDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value;

            var mapPoint = await _context.MapPoints.FindAsync(id);
            if (mapPoint == null)
                return Json(new { success = false, message = "Titik tidak ditemukan." });

            if (userRole != "Admin" && mapPoint.CreatedBy != userId)
                return Json(new { success = false, message = "Tidak punya izin mengedit titik ini." });

            if (!double.TryParse(dto.Latitude.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var latitude) ||
                !double.TryParse(dto.Longitude.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var longitude))
            {
                return Json(new { success = false, message = "Format Latitude atau Longitude tidak valid." });
            }

            mapPoint.Title = dto.Title;
            mapPoint.Description = dto.Description;
            mapPoint.Latitude = latitude;
            mapPoint.Longitude = longitude;

            if (dto.Image != null && dto.Image.Length > 0)
            {
                var uploadsPath = Path.Combine(_env.WebRootPath, "uploads");
                Directory.CreateDirectory(uploadsPath);

                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(dto.Image.FileName)}";
                var fullPath = Path.Combine(uploadsPath, fileName);

                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await dto.Image.CopyToAsync(stream);
                }

                mapPoint.ImageUrl = $"/uploads/{fileName}";
            }

            await _context.SaveChangesAsync();
            return Json(new { success = true, message = "Marker berhasil diperbarui." });
        }


        [HttpPost]
        [Authorize]
        public async Task<IActionResult> DeleteMapPoint(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value;

            var mapPoint = await _context.MapPoints.FindAsync(id);
            if (mapPoint == null)
                return Json(new { success = false, message = "Titik tidak ditemukan." });

            if (userRole != "Admin" && mapPoint.CreatedBy != userId)
                return Json(new { success = false, message = "Tidak punya izin menghapus titik ini." });

            _context.MapPoints.Remove(mapPoint);
            await _context.SaveChangesAsync();

            return Json(new { success = true, message = "Titik berhasil dihapus." });
        }


        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetMapPointsJson(string? search = null, int? id = null, int page = 1, int pageSize = 10)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            string? userId = null;
            string? userRole = null;

            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                userRole = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value;
            }

            var query = _context.MapPoints.Include(p => p.CreatedUser).AsQueryable();

            if (userRole != "Admin" && userId != null)
            {
                query = query.Where(p => p.CreatedBy == userId);
            }

            if (id.HasValue)
            {
                query = query.Where(p => p.Id == id.Value);
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(p => p.Title.ToLower().Contains(search.ToLower()));
            }

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var items = await query
                .OrderByDescending(p => p.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Description,
                    p.Latitude,
                    p.Longitude,
                    ImageUrl = p.ImageUrl != null ? baseUrl + p.ImageUrl : null,
                    p.CreatedAt,
                    p.CreatedBy,
                    CreatedUserName = p.CreatedUser.FullName
                })
                .ToListAsync();

            return Json(new
            {
                currentPage = page,
                pageSize,
                totalPages,
                totalItems = totalCount,
                data = items
            });
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error() =>
            View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
