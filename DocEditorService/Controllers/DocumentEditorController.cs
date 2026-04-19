using Microsoft.AspNetCore.Mvc;
using Syncfusion.DocIO;
using Syncfusion.DocIO.DLS;
using Newtonsoft.Json;
using System.Linq;
using System.IO;
using System.Threading.Tasks;
using System.Text.RegularExpressions;
using EJ2WordDocument = Syncfusion.EJ2.DocumentEditor.WordDocument;

namespace DocEditorService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentEditorController : ControllerBase
{
    [HttpPost("convert")]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> Convert()
    {
        try
        {
        // Register Syncfusion license if provided. Accept license from header `x-syncfusion-license`
        // (useful for debugging) or fallback to environment variable `SYNCFUSION_LICENSE`.
        string license = null;
        if (Request.Headers.TryGetValue("x-syncfusion-license", out var headerLicense) && !string.IsNullOrWhiteSpace(headerLicense))
        {
            license = headerLicense.ToString();
        }
        if (string.IsNullOrEmpty(license))
        {
            license = Environment.GetEnvironmentVariable("SYNCFUSION_LICENSE");
        }
        if (!string.IsNullOrEmpty(license))
        {
            try
            {
                Syncfusion.Licensing.SyncfusionLicenseProvider.RegisterLicense(license);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Syncfusion license registration failed: " + ex.Message);
            }
        }
        else
        {
            Console.Error.WriteLine("SYNCFUSION_LICENSE not set — service will run without a Syncfusion license (trial warnings may appear in the editor).");
        }

        var file = Request.Form?.Files?.FirstOrDefault();
        if (file == null || file.Length == 0) return BadRequest("file missing");

        using var msIn = new MemoryStream();
        await file.CopyToAsync(msIn);
        msIn.Position = 0;

        // Determine format from extension
        var index = file.FileName.LastIndexOf('.');
        var ext = index > -1 && index < file.FileName.Length - 1 ? file.FileName.Substring(index) : ".docx";
        var format = GetFormatType(ext.ToLower());

        // --- Step 1: Load with DocIO, detect blanks AND replace underscores with markers ---
        using WordDocument docioDoc = new WordDocument(msIn, format);
        var blanks = new List<object>();
        int blankId = 0;

        for (int i = 0; i < docioDoc.Sections.Count; i++)
        {
            var section = docioDoc.Sections[i];
            for (int j = 0; j < section.Body.ChildEntities.Count; j++)
            {
                if (section.Body.ChildEntities[j] is WParagraph paragraph)
                {
                    string paragraphText = paragraph.Text;
                    if (string.IsNullOrEmpty(paragraphText)) continue;

                    var matches = Regex.Matches(paragraphText, @"_{3,}");
                    foreach (Match match in matches)
                    {
                        int pos = match.Index;
                        string ctxBefore = pos > 0 ? paragraphText.Substring(Math.Max(0, pos - 30), Math.Min(30, pos)) : "";
                        string ctxAfter = pos + match.Length < paragraphText.Length
                            ? paragraphText.Substring(pos + match.Length, Math.Min(30, paragraphText.Length - pos - match.Length))
                            : "";

                        blanks.Add(new
                        {
                            id = blankId,
                            text = match.Value,
                            marker = "{{BLANK_" + blankId + "}}",
                            contextBefore = ctxBefore,
                            contextAfter = ctxAfter,
                            placeholder = "Champ " + (blankId + 1)
                        });
                        blankId++;
                    }
                }
            }
        }

        // Replace underscores with markers in the actual DocIO document
        int replaceId = 0;
        for (int i = 0; i < docioDoc.Sections.Count; i++)
        {
            var section = docioDoc.Sections[i];
            for (int j = 0; j < section.Body.ChildEntities.Count; j++)
            {
                if (section.Body.ChildEntities[j] is WParagraph paragraph)
                {
                    for (int k = 0; k < paragraph.ChildEntities.Count; k++)
                    {
                        if (paragraph.ChildEntities[k] is WTextRange textRange)
                        {
                            var text = textRange.Text;
                            if (!string.IsNullOrEmpty(text))
                            {
                                var replaced = Regex.Replace(text, @"_{3,}", m =>
                                {
                                    string marker = "{{BLANK_" + replaceId + "}}";
                                    replaceId++;
                                    return marker;
                                });
                                if (replaced != text)
                                {
                                    textRange.Text = replaced;
                                }
                            }
                        }
                    }
                }
            }
        }

        // --- Step 2: Save modified DocIO document to a new stream ---
        using var modifiedStream = new MemoryStream();
        docioDoc.Save(modifiedStream, FormatType.Docx);
        docioDoc.Close();
        modifiedStream.Position = 0;

        // --- Step 3: Convert modified DOCX to real SFDT using EJ2 WordDocument ---
        var ej2Doc = EJ2WordDocument.Load(modifiedStream, GetEJ2FormatType(ext.ToLower()));
        string sfdtJson = JsonConvert.SerializeObject(ej2Doc);
        ej2Doc.Dispose();

        // DEBUG: log the first 150 chars to verify format (camelCase vs PascalCase)
        Console.WriteLine("SFDT start: " + (sfdtJson.Length > 150 ? sfdtJson.Substring(0, 150) : sfdtJson));

        // --- Step 4: Return sfdt as a JSON string value (not a nested object) ---
        // This way data.sfdt on the client is already the ready-to-use string
        var blanksJson = JsonConvert.SerializeObject(blanks.ToArray());
        var fileNameJson = JsonConvert.SerializeObject(file.FileName);
        // Embed sfdtJson as a JSON string value so client gets data.sfdt as a string
        var finalJson = "{\"sfdt\":" + JsonConvert.SerializeObject(sfdtJson) + ",\"blanks\":" + blanksJson + ",\"fileName\":" + fileNameJson + "}";

        Console.WriteLine("Response generated successfully with " + blanks.Count + " blanks detected");
        return Content(finalJson, "application/json");
        }
        catch (Exception ex)
        {
            // Return detailed error in development to help debugging upstream 500s.
            Console.Error.WriteLine(ex);
            return StatusCode(500, new { error = ex.Message, stack = ex.StackTrace });
        }
    }

    private static FormatType GetFormatType(string format)
    {
        if (string.IsNullOrEmpty(format)) throw new NotSupportedException("EJ2 DocumentEditor does not support this file format.");
        switch (format.ToLower())
        {
            case ".dotx":
            case ".docx":
            case ".docm":
            case ".dotm":
                return FormatType.Docx;
            case ".dot":
            case ".doc":
                return FormatType.Doc;
            case ".rtf":
                return FormatType.Rtf;
            case ".txt":
                return FormatType.Txt;
            case ".xml":
                return FormatType.WordML;
            default:
                throw new NotSupportedException("EJ2 DocumentEditor does not support this file format.");
        }
    }

    private static Syncfusion.EJ2.DocumentEditor.FormatType GetEJ2FormatType(string ext)
    {
        switch (ext)
        {
            case ".dotx":
            case ".docx":
            case ".docm":
            case ".dotm":
                return Syncfusion.EJ2.DocumentEditor.FormatType.Docx;
            case ".dot":
            case ".doc":
                return Syncfusion.EJ2.DocumentEditor.FormatType.Doc;
            case ".rtf":
                return Syncfusion.EJ2.DocumentEditor.FormatType.Rtf;
            case ".txt":
                return Syncfusion.EJ2.DocumentEditor.FormatType.Txt;
            default:
                return Syncfusion.EJ2.DocumentEditor.FormatType.Docx;
        }
    }
}
