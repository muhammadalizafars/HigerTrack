namespace HigerTrack.Models.Dto
{
    public class MapPointDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public IFormFile? Image { get; set; }
    }
}
