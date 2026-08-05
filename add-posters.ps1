# Maps each video source (from src= or <source src=>) to its poster WebP file
$posterMap = @{
    "assets/July 2026 website video exports/cushion/hero 2 cushions/hero 2 cushions - square.mp4" = "assets/July 2026 website video exports/cushion/hero 2 cushions/hero 2 cushions - square-poster.webp"
    "assets/July 2026 website video exports/controller/controller in reach/controller in reach - square.mp4" = "assets/July 2026 website video exports/controller/controller in reach/controller in reach - square-poster.webp"
    "assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - usb c power - square.mp4" = "assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - usb c power - square-poster.webp"
    "assets/July 2026 website video exports/controller/controller location diagram example/controller location diagram example - horizontal.mp4" = "assets/July 2026 website video exports/controller/controller location diagram example/controller location diagram example - horizontal-poster.webp"
    "assets/July 2026 website video exports/cushion/haptic speakers inside/haptic speakers inside - vertical.mp4" = "assets/July 2026 website video exports/cushion/haptic speakers inside/haptic speakers inside - vertical-poster.webp"
    "assets/July 2026 website video exports/cushion/cushion - exploded view/cushion - exploded view - vertical.mp4" = "assets/July 2026 website video exports/cushion/cushion - exploded view/cushion - exploded view - vertical-poster.webp"
    "assets/July 2026 website video exports/controller/exploded view/exploded view - vertical.mp4" = "assets/July 2026 website video exports/controller/exploded view/exploded view - vertical-poster.webp"
    "assets/July 2026 website video exports/controller/controller knobs/controller knobs - horizontal.mp4" = "assets/July 2026 website video exports/controller/controller knobs/controller knobs - horizontal-poster.webp"
    "assets/July 2026 website video exports/controller/controller ports/cable inputs reveal/cable inputs reveal - horizontal.mp4" = "assets/July 2026 website video exports/controller/controller ports/cable inputs reveal/cable inputs reveal - horizontal-poster.webp"
    "assets/July 2026 website video exports/no bluetooth/full product demo with actor - square.mp4" = "assets/July 2026 website video exports/no bluetooth/full product demo with actor - square-poster.webp"
    "assets/July 2026 website video exports/sub cultural/amapiano - square.mp4" = "assets/July 2026 website video exports/sub cultural/amapiano - square-poster.webp"
    "assets/July 2026 website video exports/sub cultural/hang drum - square.mp4" = "assets/July 2026 website video exports/sub cultural/hang drum - square-poster.webp"
    "assets/July 2026 website video exports/sub cultural/phonk - square.mp4" = "assets/July 2026 website video exports/sub cultural/phonk - square-poster.webp"
}

$file = "C:\Users\User\.gemini\antigravity\scratch\basscraft_v4\index.html"
$content = [System.IO.File]::ReadAllText($file)
$count = 0

foreach ($src in $posterMap.Keys) {
    $poster = $posterMap[$src]
    $escaped = [regex]::Escape($src)
    
    # For videos with <source src="..."> pattern (no poster yet)
    # Match the <video tag that contains this source, add poster if not already there
    $pattern = '(<video\b(?![^>]*poster=)[^>]*>)\s*\n\s*(<source\s+src="' + $escaped + '")'
    if ($content -match $pattern) {
        $content = $content -replace $pattern, ('$1' + "`n" + '              <source src="' + $src + '"')
        # Actually, let me do this differently - add poster to the <video tag itself
    }
    
    # Simpler approach: find <video tags that reference this src (either via src= or <source src=)
    # and add poster= attribute to them
    
    # Case 1: <video ... src="$src" ...> (direct src attribute, no poster yet)
    $pat1 = '(<video\b(?![^>]*poster=)[^>]*)\s+src="' + $escaped + '"'
    if ($content -match $pat1) {
        $content = [regex]::Replace($content, $pat1, '$1 poster="' + $poster + '" src="' + $src + '"')
        $count++
        Write-Host "Added poster for (direct src): $src"
        continue
    }
    
    # Case 2: <video ...>\n  <source src="$src"> (source child, no poster on video yet)
    $pat2 = '(<video\b(?![^>]*poster=)[^>]*>)\s*\n(\s*<source\s+src="' + $escaped + '")'
    if ($content -match $pat2) {
        $content = [regex]::Replace($content, $pat2, '$1 poster="' + $poster + '">' + "`n" + '$2' -replace '>>','>') 
        # That's getting messy, let me just do a simple insertion
    }
}

# Cleaner approach: just process line by line
$lines = [System.IO.File]::ReadAllLines($file)
$result = @()
$count = 0

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # Skip hero video (already has poster)
    if ($line -match 'id="hero-video"') {
        $result += $line
        continue
    }
    
    # Check if this is a <video tag without a poster
    if ($line -match '<video\b' -and $line -notmatch 'poster=') {
        # Look for the src in this line or the next few lines
        $searchBlock = ""
        for ($j = $i; $j -lt [Math]::Min($i + 5, $lines.Count); $j++) {
            $searchBlock += $lines[$j]
        }
        
        foreach ($src in $posterMap.Keys) {
            if ($searchBlock -match [regex]::Escape($src)) {
                $poster = $posterMap[$src]
                # Add poster attribute right after <video
                $line = $line -replace '<video\b', ('<video poster="' + $poster + '"')
                $count++
                Write-Host "Added poster ($count): $(Split-Path $poster -Leaf)"
                break
            }
        }
    }
    
    $result += $line
}

[System.IO.File]::WriteAllLines($file, $result)
Write-Host "`nTotal posters added: $count"
