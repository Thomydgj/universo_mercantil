$htmlFiles = Get-ChildItem -Path "frontend" -Recurse -Filter *.html
$imgFindings = @()
$iframeFindings = @()

foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    
    $imgMatches = [regex]::Matches($content, "(?is)<img\s+[^>]*>")
    foreach ($match in $imgMatches) {
        if ($match.Value -notmatch "alt\s*=") {
            $line = ($content.Substring(0, $match.Index).Split("`n").Count)
            $imgFindings += [PSCustomObject]@{File=$file.Name; Line=$line; Content=$match.Value.Replace("`r", "").Replace("`n", " ")}
        }
    }
    
    $iframeMatches = [regex]::Matches($content, "(?is)<iframe\s+[^>]*>")
    foreach ($match in $iframeMatches) {
        if ($match.Value -notmatch "title\s*=") {
            $line = ($content.Substring(0, $match.Index).Split("`n").Count)
            $iframeFindings += [PSCustomObject]@{File=$file.Name; Line=$line; Content=$match.Value.Replace("`r", "").Replace("`n", " ")}
        }
    }
}

Write-Host "Total <img> missing alt: $($imgFindings.Count)"
$imgFindings | Format-Table -AutoSize
Write-Host "---"
Write-Host "Total <iframe> missing title: $($iframeFindings.Count)"
$iframeFindings | Format-Table -AutoSize
