$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$videos = @(
    "assets/July 2026 website video exports/controller/controller in reach/controller in reach - square.mp4",
    "assets/July 2026 website video exports/controller/controller knobs/controller knobs - horizontal.mp4",
    "assets/July 2026 website video exports/controller/controller location diagram example/controller location diagram example - horizontal.mp4",
    "assets/July 2026 website video exports/controller/controller ports/2 power options/2 power options - usb c power - square.mp4",
    "assets/July 2026 website video exports/controller/controller ports/cable inputs reveal/cable inputs reveal - horizontal.mp4",
    "assets/July 2026 website video exports/controller/exploded view/exploded view - vertical.mp4",
    "assets/July 2026 website video exports/cushion/cushion - exploded view/cushion - exploded view - vertical.mp4",
    "assets/July 2026 website video exports/cushion/haptic speakers inside/haptic speakers inside - vertical.mp4",
    "assets/July 2026 website video exports/cushion/hero 2 cushions/hero 2 cushions - square.mp4",
    "assets/July 2026 website video exports/no bluetooth/full product demo with actor - square.mp4",
    "assets/July 2026 website video exports/sub cultural/amapiano - square.mp4",
    "assets/July 2026 website video exports/sub cultural/hang drum - square.mp4",
    "assets/July 2026 website video exports/sub cultural/phonk - square.mp4"
)

foreach ($v in $videos) {
    $dir = Split-Path $v
    $name = [System.IO.Path]::GetFileNameWithoutExtension($v)
    $poster = "$dir/$name-poster.webp"
    
    if (Test-Path $v) {
        ffmpeg -i $v -vframes 1 -c:v libwebp -quality 35 -y $poster 2>&1 | Out-Null
        $size = [math]::Round((Get-Item $poster).Length / 1024, 1)
        Write-Host "OK  ${size}KB  $poster"
    } else {
        Write-Host "MISSING  $v"
    }
}

Write-Host "`nDone! Total posters:"
Get-ChildItem -Path "assets" -Recurse -Filter "*-poster.webp" | Measure-Object -Property Length -Sum | ForEach-Object {
    Write-Host "$($_.Count) files, $([math]::Round($_.Sum/1024,1))KB total"
}
