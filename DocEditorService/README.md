DocEditorService
=================

Minimal ASP.NET Core microservice to convert DOCX -> SFDT (Syncfusion DocumentEditor format).

Prerequisites
- .NET 6 SDK installed (or change target to net7.0 if you prefer)
- A Syncfusion license key (trial or paid). You can set it in an environment variable `SYNCFUSION_LICENSE`.

Install and run

1. From the `DocEditorService` folder:

```bash
cd DocEditorService
dotnet restore
```

2. Start the service:

```bash
# set license in the same terminal (Windows PowerShell)
$env:SYNCFUSION_LICENSE="<your-key-here>"

# run
dotnet run
```

The service listens on the default Kestrel port (usually https://localhost:5001). Endpoint:
- POST `/api/documenteditor/convert` multipart/form-data with `file` field containing a DOCX file.

Example curl:

```bash
curl -X POST "https://localhost:5001/api/documenteditor/convert" -F "file=@/path/to/sample.docx" -k
```

Client usage (Next.js)

From your Next frontend, upload the DOCX to this endpoint and the response body will be the SFDT string. Then call `containerRef.current.documentEditor.open(sfdtString)` to open it in the DocumentEditor.

Notes
- The project references `Syncfusion.DocIO.Net.Core` package. If you prefer to add it manually:
  `dotnet add package Syncfusion.DocIO.Net.Core`
- The server registers the Syncfusion license if `SYNCFUSION_LICENSE` env var is present.
- This avoids using the Syncfusion demo service and should prevent demo banners being injected.
