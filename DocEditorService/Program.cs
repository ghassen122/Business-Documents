using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configure CORS to allow requests from the Next.js frontend during development
var frontendOrigin = "http://localhost:3000";
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(frontendOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    // Swagger not required for this minimal service; install Swashbuckle if you want swagger UI.
}

app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthorization();

app.MapControllers();

app.Run();
