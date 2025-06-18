using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HigerTrack.Data;
using HigerTrack.Models;
using HigerTrack.Models.Dto;
using System.Globalization;

namespace HigerTrack.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]

    public class WebMapPointsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public WebMapPointsController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        /// <summary>
        /// Membuat titik peta baru. Hanya untuk user yang sudah login.
        /// </summary>
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateMapPoint([FromForm] MapPointDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null)
                return Unauthorized("User tidak terautentikasi.");

            if (!double.TryParse(dto.Latitude.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var latitude) ||
                !double.TryParse(dto.Longitude.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var longitude))
            {
                return BadRequest("Format Latitude atau Longitude tidak valid.");
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
                Group = dto.Group,
                PipeType = dto.PipeType,
                PipeDiameterInch = dto.PipeDiameterInch,
                PipeThickness = dto.PipeThickness,
                Vehicle = dto.Vehicle,
                ImageUrl = imageUrl,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.MapPoints.Add(mapPoint);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Titik berhasil disimpan", id = mapPoint.Id });
        }


        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetMapPoints(
            string? search = null,
            int? id = null,
            int page = 1,
            int pageSize = 10)
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            string? userId = null;
            string? userRole = null;

            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                userRole = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value;
            }

            var query = _context.MapPoints.AsQueryable();

            if (userRole != "Admin" && userId != null)
            {
                query = query.Where(p => p.CreatedBy == userId);
            }

            // 🔍 Filter by id if specified
            if (id.HasValue)
            {
                query = query.Where(p => p.Id == id.Value);
            }

            // 🔍 Search by title (case-insensitive)
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
                    p.Group,
                    p.PipeType,
                    p.PipeDiameterInch,
                    p.PipeThickness,
                    p.Vehicle,
                    ImageUrl = p.ImageUrl != null ? baseUrl + p.ImageUrl : null,
                    p.CreatedAt,
                    p.UpdatedAt,
                    p.CreatedBy,
                    CreatedUserName = p.CreatedUser.FullName
                })


                .ToListAsync();

            return Ok(new
            {
                currentPage = page,
                pageSize,
                totalPages,
                totalItems = totalCount,
                data = items
            });
        }
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> EditMapPoint(int id, [FromForm] MapPointDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.Claims.FirstOrDefault(c => c.Type.Contains("role"))?.Value;

            var mapPoint = await _context.MapPoints.FindAsync(id);
            if (mapPoint == null)
                return NotFound("Titik tidak ditemukan.");

            if (userRole != "Admin" && mapPoint.CreatedBy != userId)
                return Forbid("Anda tidak memiliki izin untuk mengedit titik ini.");

            if (!double.TryParse(dto.Latitude.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var latitude) ||
                !double.TryParse(dto.Longitude.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var longitude))
            {
                return BadRequest("Format Latitude atau Longitude tidak valid.");
            }

            mapPoint.Title = dto.Title;
            mapPoint.Description = dto.Description;
            mapPoint.Latitude = latitude;
            mapPoint.Longitude = longitude;
            mapPoint.Group = dto.Group;
            mapPoint.PipeType = dto.PipeType;
            mapPoint.PipeDiameterInch = dto.PipeDiameterInch;
            mapPoint.PipeThickness = dto.PipeThickness;
            mapPoint.Vehicle = dto.Vehicle;

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

            mapPoint.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Titik berhasil diperbarui" });
        }


        [HttpDelete("{id}")]
        [Authorize]

        public async Task<IActionResult> DeleteMapPoint(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);

            var mapPoint = await _context.MapPoints.FindAsync(id);
            if (mapPoint == null)
                return NotFound("Titik tidak ditemukan.");

            if (userRole != "Admin" && mapPoint.CreatedBy != userId)
                return Forbid("Anda tidak memiliki izin untuk menghapus titik ini.");

            _context.MapPoints.Remove(mapPoint);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Titik berhasil dihapus" });
        }
    }
}
