using Microsoft.AspNetCore.Mvc;
using HigerTrack.Models;
using HigerTrack.Models.Dto;
using HigerTrack.Data;
using Microsoft.EntityFrameworkCore;

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

        [HttpPost]
        public async Task<IActionResult> CreateMapPoint([FromForm] MapPointDto dto)
        {
            string? imageUrl = null;

            if (dto.Image != null && dto.Image.Length > 0)
            {
                var uploadsPath = Path.Combine(_env.WebRootPath, "uploads");
                Directory.CreateDirectory(uploadsPath);

                var fileName = Guid.NewGuid() + Path.GetExtension(dto.Image.FileName);
                var fullPath = Path.Combine(uploadsPath, fileName);

                using var stream = new FileStream(fullPath, FileMode.Create);
                await dto.Image.CopyToAsync(stream);

                imageUrl = "/uploads/" + fileName;
            }

            var mapPoint = new MapPoint
            {
                Title = dto.Title,
                Description = dto.Description,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                ImageUrl = imageUrl,
                CreatedBy = dto.CreatedBy,
                CreatedAt = DateTime.UtcNow
            };

            _context.MapPoints.Add(mapPoint);
            await _context.SaveChangesAsync();

            return Ok(mapPoint);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var allPoints = await _context.MapPoints.ToListAsync();
            return Ok(allPoints);
        }
    }
}
