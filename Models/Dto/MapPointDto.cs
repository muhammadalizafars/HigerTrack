namespace HigerTrack.Models.Dto
{
    public class MapPointDto
    {
        public string? Title { get; set; }
        public string? Latitude { get; set; }
        public string? Longitude { get; set; }
        public string? Group { get; set; }
        public string? PipeType { get; set; }
        public double? PipeDiameterInch { get; set; }
        public double? PipeThickness { get; set; }
        public string? Vehicle { get; set; }
        public string? Description { get; set; }
        public IFormFile? Image { get; set; }
    }
}
