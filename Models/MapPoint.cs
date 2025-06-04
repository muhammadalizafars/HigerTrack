using System;

namespace HigerTrack.Models
{
    public class MapPoint
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Description { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string? ImageUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? CreatedBy { get; set; }    // GUID string dari AspNetUsers.Id
        public Users? CreatedUser { get; set; }   // Navigation property
    }
}
