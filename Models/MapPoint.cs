using System;

namespace HigerTrack.Models
{
    public class MapPoint
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? CreatedBy { get; set; }
        public Users? CreatedUser { get; set; }
        public string? Group { get; set; }
        public string? PipeType { get; set; }
        public double? PipeDiameterInch { get; set; }
        public double? PipeThickness { get; set; }
        public string? Vehicle { get; set; }
        public string? ImageUrl { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
