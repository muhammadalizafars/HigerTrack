using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HigerTrack.Data;
using HigerTrack.Models;
using HigerTrack.Models.Dto;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Globalization;

namespace HigerTrack.Controllers.Api
{
    [ApiController]
    [Route("api/[controller]")]
    public class MapPointsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public MapPointsController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        /// <summary>
        /// Membuat titik peta baru. Hanya untuk user yang sudah login.
        /// </summary>
        [HttpPost]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
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
                ImageUrl = imageUrl,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.MapPoints.Add(mapPoint);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Titik berhasil disimpan", id = mapPoint.Id });
        }

        /// Mengambil semua titik peta.
        [HttpGet]
        [AllowAnonymous] // Anonim boleh akses
        public async Task<IActionResult> GetMapPoints()
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            string? userId = null;
            string? userRole = null;

            if (User.Identity != null && User.Identity.IsAuthenticated)
            {
                userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                userRole = User.FindFirstValue(ClaimTypes.Role);
            }

            // Ambil semua data jika: Admin atau Anonim (belum login)
            var query = _context.MapPoints.AsQueryable();

            if (userRole != "Admin" && userId != null)
            {
                // Jika bukan admin dan user login → filter hanya yang dibuat oleh user tsb
                query = query.Where(p => p.CreatedBy == userId);
            }

            var points = await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Description,
                    p.Latitude,
                    p.Longitude,
                    ImageUrl = p.ImageUrl != null ? baseUrl + p.ImageUrl : null,
                    p.CreatedAt,
                    p.CreatedBy
                })
                .ToListAsync();

            return Ok(points);
        }


        /// <summary>
        /// Edit titik peta sesuai role.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> EditMapPoint(int id, [FromForm] MapPointDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);

            var mapPoint = await _context.MapPoints.FindAsync(id);
            if (mapPoint == null)
                return NotFound("Titik tidak ditemukan.");

            if (userRole != "Admin" && mapPoint.CreatedBy != userId)
                return Forbid("Anda tidak memiliki izin untuk mengedit titik ini.");

            if (!double.TryParse(dto.Latitude.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var latitude) ||
                !double.TryParse(dto.Longitude.Replace(',', '.'), NumberStyles.Any, CultureInfo.InvariantCulture, out var longitude))
            {
                return BadRequest("Format Latitude atau Longitude tidak valid.");
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

            return Ok(new { message = "Titik berhasil diperbarui" });
        }

        /// <summary>
        /// Hapus titik peta sesuai role.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
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
