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
using Microsoft.AspNetCore.Authentication.JwtBearer; // Tambahkan ini

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
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                ImageUrl = imageUrl,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.MapPoints.Add(mapPoint);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Titik berhasil disimpan", id = mapPoint.Id });
        }

        /// <summary>
        /// Mengambil semua titik peta.
        /// </summary>
        [HttpGet]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)] // Tambahkan ini jika GET juga harus pakai JWT
        public async Task<IActionResult> GetMapPoints()
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            var points = await _context.MapPoints
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
    }
}