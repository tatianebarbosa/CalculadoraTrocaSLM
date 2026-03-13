$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8123
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
$rootResolved = (Resolve-Path $root).Path

while ($listener.IsListening) {
  $context = $null

  try {
    $context = $listener.GetContext()
    $relativePath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))

    if ([string]::IsNullOrWhiteSpace($relativePath)) {
      $relativePath = 'index.html'
    }

    $fullPath = Join-Path $rootResolved $relativePath

    if ((Test-Path $fullPath -PathType Leaf) -and ((Resolve-Path $fullPath).Path.StartsWith($rootResolved, [System.StringComparison]::OrdinalIgnoreCase))) {
      $resolvedFile = (Resolve-Path $fullPath).Path
      $bytes = [System.IO.File]::ReadAllBytes($resolvedFile)

      switch ([System.IO.Path]::GetExtension($resolvedFile).ToLowerInvariant()) {
        '.html' { $contentType = 'text/html; charset=utf-8'; break }
        '.css' { $contentType = 'text/css; charset=utf-8'; break }
        '.js' { $contentType = 'application/javascript; charset=utf-8'; break }
        '.png' { $contentType = 'image/png'; break }
        default { $contentType = 'application/octet-stream' }
      }

      $context.Response.StatusCode = 200
      $context.Response.ContentType = $contentType
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $context.Response.StatusCode = 404
    }
  } catch {
    if ($context) {
      $context.Response.StatusCode = 500
    }
  } finally {
    if ($context) {
      $context.Response.OutputStream.Close()
      $context.Response.Close()
    }
  }
}
