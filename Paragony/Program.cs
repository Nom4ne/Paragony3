using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Paragony.Jobs;
using Paragony.Models;
using Paragony.Services;
using Quartz;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IReceiptCalculationService, ReceiptCalculationService>();
// Dodaj DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Zarejestruj serwisy
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IPasswordService, PasswordService>();

//Zegar do Procedury Aktualizacji Cen
builder.Services.AddScoped<IProductPriceService, ProductPriceService>();

// =================================================================
// KONFIGURACJA QUARTZ.NET (HARMONOGRAM ZADAŃ)
// =================================================================
builder.Services.AddQuartz(q =>
{
    // Rejestracja Joba
    var jobKey = new JobKey("PriceUpdateJob");
    q.AddJob<PriceUpdateJob>(opts => opts.WithIdentity(jobKey));

    // Rejestracja Triggera (wyzwalacza)
    q.AddTrigger(opts => opts
        .ForJob(jobKey)
        .WithIdentity("PriceUpdateTrigger")
        // Ustawienie CRON: 0 sekunda, 1 minuta, 0 godzina (00:01:00) każdego dnia
        .WithCronSchedule("0 01 00 * * ?"));
});

// Dodanie serwisu hostowanego Quartz, który zarządza cyklem życia zadań
builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);
// =================================================================

// Dodaj kontrolery
builder.Services.AddControllers();

// Konfiguracja JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secret = jwtSettings["Secret"];

// Walidacja konfiguracji
if (string.IsNullOrEmpty(secret))
{
    throw new InvalidOperationException("JWT Secret is not configured in appsettings.json");
}

if (secret.Length < 32)
{
    throw new InvalidOperationException("JWT Secret must be at least 32 characters long");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret!)),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});


// Dodaj Memory Cache
builder.Services.AddMemoryCache();

// Zarejestruj serwis 2FA
builder.Services.AddHttpClient<ITwoFaService, TwoFaService>();

builder.Services.AddAuthorization();

// Swagger/OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});



var app = builder.Build();

app.UseCors(policy => policy
    .WithOrigins("http://localhost:3000")
    .AllowAnyMethod()
    .AllowAnyHeader()
    .AllowCredentials());

// 1. Domyślne pliki statyczne (z folderu wwwroot - jeśli używasz)
app.UseStaticFiles();

// 2. KONFIGURACJA FOLDERU IMAGES

string imagesPath = Path.Combine(builder.Environment.ContentRootPath, "Images");

if (!Directory.Exists(imagesPath))
    Directory.CreateDirectory(imagesPath);

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(imagesPath),
    RequestPath = "/Images"
});


// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Ważna kolejność: Authentication przed Authorization!
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.UseCors("AllowAll");

app.Run();
