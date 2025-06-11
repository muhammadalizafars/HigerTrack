namespace HigerTrack.Models.Dto
{
    public class MapPointDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }
        public IFormFile? Image { get; set; }
    }
}
