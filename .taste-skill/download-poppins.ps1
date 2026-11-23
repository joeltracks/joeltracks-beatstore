$ErrorActionPreference = 'Stop'
$requestHeaders = @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' }
$fontResponse = Invoke-WebRequest -Uri 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap' -Headers $requestHeaders
$fontCss = [string]$fontResponse.Content
$fontRules = [regex]::Matches($fontCss, '/\* (latin(?:-ext)?) \*/\s*(@font-face\s*\{[^}]+\})')
if ($fontRules.Count -lt 4) { throw 'Expected Latin font subsets were not returned.' }
$localRules = @()
foreach ($fontRule in $fontRules) {
  $subset = $fontRule.Groups[1].Value
  $ruleText = $fontRule.Groups[2].Value
  $weight = [regex]::Match($ruleText, 'font-weight:\s*(\d+)').Groups[1].Value
  $fontUrl = [regex]::Match($ruleText, 'url\(([^)]+)\)').Groups[1].Value
  if ($fontUrl -notmatch '^https://fonts\.gstatic\.com/.+\.woff2$') { throw 'Unexpected font asset source or format.' }
  $assetName = 'poppins-' + $weight + '-' + $subset + '.woff2'
  Invoke-WebRequest -Uri $fontUrl -OutFile (Join-Path (Get-Location) ('assets/fonts/' + $assetName))
  $localRules += $ruleText.Replace($fontUrl, $assetName)
}
Set-Content -LiteralPath 'assets/fonts/poppins.css' -Value ($localRules -join "`n")
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/OFL.txt' -OutFile (Join-Path (Get-Location) 'assets/fonts/poppins-OFL.txt')
Write-Output ('Saved ' + $fontRules.Count + ' local Poppins faces and OFL license.')
