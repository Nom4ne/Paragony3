using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Linq;

namespace Paragony.Controllers
{
    // --- KLASA POMOCNICZA DLA SWAGGERA ---
    // Swagger potrzebuje tego obiektu, żeby poprawnie wygenerować formularz uploadu
    public class FileUploadModel
    {
        public IFormFile File { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class ImagesController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;

        public ImagesController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }


       
        [HttpPost("upload")]
        public async Task<IActionResult> UploadImage([FromForm] FileUploadModel model)
        {
            // Pobieramy plik z modelu
            var file = model.File;

            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Nie przesłano pliku." });

            var ext = Path.GetExtension(file.FileName).ToLower();
            string[] allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".bmp" };

            if (!allowedExtensions.Contains(ext))
            {
                return BadRequest(new { message = "Niedozwolony format pliku. Dozwolone: jpg, png, gif, bmp." });
            }

            var uniqueFileName = $"{Guid.NewGuid()}{ext}";
            var uploadsFolder = Path.Combine(_environment.ContentRootPath, "Images");

            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            try
            {
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Błąd zapisu na dysku: {ex.Message}" });
            }

            return Ok(new
            {
                InternalName = uniqueFileName,
                OriginalName = file.FileName,
                Url = $"/api/images/{uniqueFileName}"
            });
        }

        // 1. GET
        [HttpGet("{fileName}")]
        [AllowAnonymous]
        public IActionResult GetImage(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName))
                return BadRequest("Brak nazwy pliku.");

            var safeFileName = Path.GetFileName(fileName);
            var directory = Path.Combine(_environment.ContentRootPath, "Images");
            var path = Path.Combine(directory, safeFileName);

            var fullPath = Path.GetFullPath(path);
            if (!fullPath.StartsWith(directory, StringComparison.OrdinalIgnoreCase))
                return BadRequest("Nieprawidłowa ścieżka.");

            if (!System.IO.File.Exists(fullPath))
                return NotFound("Nie znaleziono pliku.");

            var ext = Path.GetExtension(safeFileName).ToLower();
            var mime = ext switch
            {
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                ".gif" => "image/gif",
                ".bmp" => "image/bmp",
                _ => "application/octet-stream"
            };

            var bytes = System.IO.File.ReadAllBytes(fullPath);
            return File(bytes, mime);
        }
    }
}