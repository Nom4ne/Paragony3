using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Paragony.Mappings;
using Paragony.Models;
using Paragony.Extensions;


namespace Paragony.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReceiptTemplatesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _hostEnvironment; // Wstrzykujemy, aby uzyskać ścieżki

        public ReceiptTemplatesController(AppDbContext context, IWebHostEnvironment hostEnvironment)
        {
            _context = context;
            _hostEnvironment = hostEnvironment;
        }

        // --- 1. ENDPOINT DO PRZESYŁANIA PLIKU (UPLOAD) ---
        // Klient najpierw wywołuje ten endpoint, aby zapisać plik i otrzymać unikalne nazwy.
        [HttpPost("uploadLogo")] // POST api/receipttemplates/uploadLogo
        [DisableRequestSizeLimit]
        public async Task<IActionResult> UploadLogo(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "Nie wybrano pliku." });
            }

            // Ustalenie ścieżki docelowej na serwerze:
            // Oczekiwana ścieżka to C:\Users\Pc\source\repos\Paragony\Paragony\Images
            string uploadPath = Path.Combine(_hostEnvironment.ContentRootPath, "Images");

            // 1. Sprawdzenie/Utworzenie folderu
            if (!Directory.Exists(uploadPath))
            {
                Directory.CreateDirectory(uploadPath);
            }

            // 2. Generowanie unikalnej nazwy pliku
            string originalFileName = Path.GetFileName(file.FileName);
            string fileExtension = Path.GetExtension(originalFileName);
            // Użycie GUID zapewnia unikalność nazwy pliku na serwerze (LogoFile)
            string uniqueFileName = Guid.NewGuid().ToString() + fileExtension;
            string filePath = Path.Combine(uploadPath, uniqueFileName);

            // 3. Zapisanie pliku na dysku
            try
            {
                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(fileStream);
                }
            }
            catch (Exception ex)
            {
                // Zwrócenie błędu w przypadku problemów z zapisem na dysku
                return StatusCode(500, new { message = "Błąd zapisu pliku na serwerze.", error = ex.Message });
            }

            // 4. Zwrócenie wygenerowanej nazwy (LogoFile) i oryginalnej nazwy (LogoOriginalName)
            return Ok(new
            {
                logoFile = uniqueFileName,
                logoOriginalName = originalFileName
            });
        }

        // --------------------------------------------------

        // --- 2. GET (Pobieranie) ---
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var clientId = this.GetCurrentClientId();
            var templates = await _context.ReceiptTemplates
                .Where(t => t.ClientId == clientId)
                .ToListAsync();

            return Ok(templates.Select(ReceiptTemplateMapper.ToDto));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            var clientId = this.GetCurrentClientId();

            var template = await _context.ReceiptTemplates
                .FirstOrDefaultAsync(r => r.Id == id);

            if (template == null)
                return NotFound();

            if (template.ClientId != clientId)
                return Forbid();

            return Ok(ReceiptTemplateMapper.ToDto(template));
        }

        // --- 3. POST (Tworzenie) ---
        // Oczekuje, że LogoFile i LogoOriginalName są już przekazane w DTO po udanym Uploadzie.
        [HttpPost]
        public async Task<IActionResult> Create(CreateReceiptTemplateDto dto)
        {
            var clientId = this.GetCurrentClientId();

            var model = ReceiptTemplateMapper.FromCreateDto(dto);

            // Zapis unikalnej i oryginalnej nazwy pliku z DTO do modelu bazy danych
            model.LogoFile = dto.LogoFile;
            model.LogoOriginalName = dto.LogoOriginalName;

            model.ClientId = clientId;

            _context.ReceiptTemplates.Add(model);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(Get), new { id = model.Id }, ReceiptTemplateMapper.ToDto(model));
        }

        // --- 4. PUT (Aktualizacja) ---
        // Oczekuje, że LogoFile i LogoOriginalName są już przekazane w DTO po udanym Uploadzie/zachowaniu starej wartości.
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateReceiptTemplateDto dto)
        {
            var clientId = this.GetCurrentClientId();

            var template = await _context.ReceiptTemplates.FindAsync(id);

            if (template == null)
                return NotFound();

            if (template.ClientId != clientId)
                return Forbid();

            // Aktualizacja pól ogólnych:
            template.Name = dto.Name;
            template.Header = dto.HeaderText; // Poprawiono: HeaderText w DTO -> Header w modelu
            template.Footer = dto.FooterText; // Poprawiono: FooterText w DTO -> Footer w modelu
            template.FontStyle = dto.FontStyle;

            // Aktualizacja nazw logo
            template.LogoFile = dto.LogoFile;
            template.LogoOriginalName = dto.LogoOriginalName;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.ReceiptTemplates.Any(e => e.Id == id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // --- 5. DELETE (Usuwanie) ---
        // W idealnym scenariuszu, powinieneś tutaj również usunąć plik z serwera, jeśli istnieje.
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var clientId = this.GetCurrentClientId();

            var template = await _context.ReceiptTemplates.FindAsync(id);

            if (template == null)
                return NotFound();

            if (template.ClientId != clientId)
                return Forbid();

            // --- DODATKOWA LOGIKA: Usuń plik z serwera ---
            if (!string.IsNullOrEmpty(template.LogoFile))
            {
                string uploadPath = Path.Combine(_hostEnvironment.ContentRootPath, "Images");
                string filePath = Path.Combine(uploadPath, template.LogoFile);

                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }
            // ---------------------------------------------

            _context.ReceiptTemplates.Remove(template);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}