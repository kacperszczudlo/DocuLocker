Add-Type -AssemblyName System.Drawing

function Generate-DocuLockerGraphic {
    param(
        [System.Drawing.Graphics]$g,
        [int]$Size,
        [bool]$IsRound = $false,
        [bool]$IsTransparentBg = $false,
        [string]$BgHex = "#0F172A"
    )

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $navyBg = [System.Drawing.ColorTranslator]::FromHtml($BgHex)
    $navyDark = [System.Drawing.ColorTranslator]::FromHtml("#061226")
    $docWhite = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
    $docFold = [System.Drawing.ColorTranslator]::FromHtml("#CBD5E1")
    $docFoldDark = [System.Drawing.ColorTranslator]::FromHtml("#94A3B8")
    $electricBlue = [System.Drawing.ColorTranslator]::FromHtml("#007BFF")
    $electricBlueDark = [System.Drawing.ColorTranslator]::FromHtml("#0056B3")
    $shadowColor = [System.Drawing.Color]::FromArgb(60, 4, 12, 28)

    if ($IsRound) {
        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddEllipse(0, 0, $Size, $Size)
        $g.SetClip($path)
        $bgBrush = [System.Drawing.SolidBrush]::new($navyBg)
        $g.FillEllipse($bgBrush, 0, 0, $Size, $Size)
        $bgBrush.Dispose()
    } elseif ($IsTransparentBg) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } else {
        $bgBrush = [System.Drawing.SolidBrush]::new($navyBg)
        $g.FillRectangle($bgBrush, 0, 0, $Size, $Size)
        $bgBrush.Dispose()
    }

    $scale = $Size / 1024.0

    # 1. Rysowanie dokumentu
    $docX = [float](250.0 * $scale)
    $docY = [float](190.0 * $scale)
    $docW = [float](420.0 * $scale)
    $docH = [float](570.0 * $scale)
    $foldSize = [float](120.0 * $scale)
    $docRadius = [float](32.0 * $scale)

    # Cien za dokumentem
    $shadowOffset = [float](20.0 * $scale)
    $shadowBrush = [System.Drawing.SolidBrush]::new($shadowColor)
    [System.Drawing.PointF[]]$shadowPoints = @(
        [System.Drawing.PointF]::new($docX + $shadowOffset, $docY + $shadowOffset),
        [System.Drawing.PointF]::new($docX + $docW - $foldSize + $shadowOffset, $docY + $shadowOffset),
        [System.Drawing.PointF]::new($docX + $docW + $shadowOffset, $docY + $foldSize + $shadowOffset),
        [System.Drawing.PointF]::new($docX + $docW + $shadowOffset, $docY + $docH + $shadowOffset),
        [System.Drawing.PointF]::new($docX + $shadowOffset, $docY + $docH + $shadowOffset)
    )
    $g.FillPolygon($shadowBrush, $shadowPoints)
    $shadowBrush.Dispose()

    # Cialo dokumentu
    $docPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $docPath.AddLine($docX + $docRadius, $docY, $docX + $docW - $foldSize, $docY)
    $docPath.AddLine($docX + $docW - $foldSize, $docY, $docX + $docW, $docY + $foldSize)
    $docPath.AddLine($docX + $docW, $docY + $foldSize, $docX + $docW, $docY + $docH - $docRadius)
    $docPath.AddArc($docX + $docW - $docRadius * 2, $docY + $docH - $docRadius * 2, $docRadius * 2, $docRadius * 2, 0, 90)
    $docPath.AddLine($docX + $docW - $docRadius, $docY + $docH, $docX + $docRadius, $docY + $docH)
    $docPath.AddArc($docX, $docY + $docH - $docRadius * 2, $docRadius * 2, $docRadius * 2, 90, 90)
    $docPath.AddLine($docX, $docY + $docH - $docRadius, $docX, $docY + $docRadius)
    $docPath.AddArc($docX, $docY, $docRadius * 2, $docRadius * 2, 180, 90)
    $docPath.CloseFigure()

    $docBrush = [System.Drawing.SolidBrush]::new($docWhite)
    $g.FillPath($docBrush, $docPath)
    $docBrush.Dispose()

    # Zagiecie rogu
    [System.Drawing.PointF[]]$foldPoints = @(
        [System.Drawing.PointF]::new($docX + $docW - $foldSize, $docY),
        [System.Drawing.PointF]::new($docX + $docW, $docY + $foldSize),
        [System.Drawing.PointF]::new($docX + $docW - $foldSize, $docY + $foldSize)
    )
    $foldBrush = [System.Drawing.SolidBrush]::new($docFold)
    $g.FillPolygon($foldBrush, $foldPoints)
    $foldBrush.Dispose()

    # Linia zgiecia
    $foldPen = [System.Drawing.Pen]::new($docFoldDark, [float](3.0 * $scale))
    $g.DrawLine($foldPen, [float]($docX + $docW - $foldSize), [float]$docY, [float]($docX + $docW - $foldSize), [float]($docY + $foldSize))
    $g.DrawLine($foldPen, [float]($docX + $docW - $foldSize), [float]($docY + $foldSize), [float]($docX + $docW), [float]($docY + $foldSize))
    $foldPen.Dispose()

    # Linie tekstu na dokumencie
    $lineColor = [System.Drawing.ColorTranslator]::FromHtml("#E2E8F0")
    $lineBrush = [System.Drawing.SolidBrush]::new($lineColor)
    $g.FillRectangle($lineBrush, [float]($docX + 50.0 * $scale), [float]($docY + 90.0 * $scale), [float](220.0 * $scale), [float](20.0 * $scale))
    $g.FillRectangle($lineBrush, [float]($docX + 50.0 * $scale), [float]($docY + 140.0 * $scale), [float](280.0 * $scale), [float](20.0 * $scale))
    $g.FillRectangle($lineBrush, [float]($docX + 50.0 * $scale), [float]($docY + 190.0 * $scale), [float](250.0 * $scale), [float](20.0 * $scale))
    $g.FillRectangle($lineBrush, [float]($docX + 50.0 * $scale), [float]($docY + 240.0 * $scale), [float](180.0 * $scale), [float](20.0 * $scale))
    $lineBrush.Dispose()

    # 2. Klodka (Padlock)
    $lockX = [float](490.0 * $scale)
    $lockY = [float](500.0 * $scale)
    $lockW = [float](280.0 * $scale)
    $lockH = [float](240.0 * $scale)
    $lockRadius = [float](36.0 * $scale)

    # Cien klodki
    $lockShadowBrush = [System.Drawing.SolidBrush]::new($shadowColor)
    $g.FillRectangle($lockShadowBrush, [float]($lockX + 14.0 * $scale), [float]($lockY + 14.0 * $scale), $lockW, $lockH)
    $lockShadowBrush.Dispose()

    # Palak klodki (Shackle)
    $shackleW = [float](160.0 * $scale)
    $shackleH = [float](150.0 * $scale)
    $shackleX = [float]($lockX + ($lockW - $shackleW) / 2.0)
    $shackleY = [float]($lockY - $shackleH + (30.0 * $scale))
    $shackleThick = [float](38.0 * $scale)

    $shacklePen = [System.Drawing.Pen]::new($electricBlueDark, $shackleThick)
    $shacklePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $shacklePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    
    $shacklePath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $shacklePath.AddArc($shackleX, $shackleY, $shackleW, $shackleH, 180, 180)
    $g.DrawPath($shacklePen, $shacklePath)
    $shacklePen.Dispose()

    # Cialo klodki
    $lockBodyPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $lockBodyPath.AddArc($lockX, $lockY, $lockRadius * 2, $lockRadius * 2, 180, 90)
    $lockBodyPath.AddArc($lockX + $lockW - $lockRadius * 2, $lockY, $lockRadius * 2, $lockRadius * 2, 270, 90)
    $lockBodyPath.AddArc($lockX + $lockW - $lockRadius * 2, $lockY + $lockH - $lockRadius * 2, $lockRadius * 2, $lockRadius * 2, 0, 90)
    $lockBodyPath.AddArc($lockX, $lockY + $lockH - $lockRadius * 2, $lockRadius * 2, $lockRadius * 2, 90, 90)
    $lockBodyPath.CloseFigure()

    $lockBrush = [System.Drawing.SolidBrush]::new($electricBlue)
    $g.FillPath($lockBrush, $lockBodyPath)
    $lockBrush.Dispose()

    # Dziurka od klucza
    $keyholeBrush = [System.Drawing.SolidBrush]::new($navyDark)
    $keyCenterX = [float]($lockX + $lockW / 2.0)
    $keyCenterY = [float]($lockY + $lockH * 0.44)
    $keyRadius = [float](22.0 * $scale)

    $g.FillEllipse($keyholeBrush, [float]($keyCenterX - $keyRadius), [float]($keyCenterY - $keyRadius), [float]($keyRadius * 2), [float]($keyRadius * 2))

    [System.Drawing.PointF[]]$trapPoints = @(
        [System.Drawing.PointF]::new($keyCenterX - 12.0 * $scale, $keyCenterY),
        [System.Drawing.PointF]::new($keyCenterX + 12.0 * $scale, $keyCenterY),
        [System.Drawing.PointF]::new($keyCenterX + 18.0 * $scale, $keyCenterY + 44.0 * $scale),
        [System.Drawing.PointF]::new($keyCenterX - 18.0 * $scale, $keyCenterY + 44.0 * $scale)
    )
    $g.FillPolygon($keyholeBrush, $trapPoints)
    $keyholeBrush.Dispose()
}

function Save-ImageToFile {
    param(
        [string]$Path,
        [int]$Width,
        [int]$Height,
        [bool]$IsRound = $false,
        [bool]$IsTransparent = $false,
        [string]$BgHex = "#0F172A"
    )
    $dir = Split-Path -Parent $Path
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $bmp = [System.Drawing.Bitmap]::new($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    Generate-DocuLockerGraphic -g $g -Size $Width -IsRound $IsRound -IsTransparentBg $IsTransparent -BgHex $BgHex
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $Path ($Width x $Height)"
}

$rootDir = "c:\Users\kacpe\Documents\GitHub\DocuLocker"

# 1. Assets Expo
Save-ImageToFile -Path "$rootDir\assets\icon.png" -Width 1024 -Height 1024 -IsRound $false -IsTransparent $false
Save-ImageToFile -Path "$rootDir\assets\adaptive-icon.png" -Width 1024 -Height 1024 -IsRound $false -IsTransparent $true
Save-ImageToFile -Path "$rootDir\assets\splash-icon.png" -Width 1024 -Height 1024 -IsRound $false -IsTransparent $true

# 2. Android Mipmaps
$densities = @{
    "mipmap-mdpi"    = @{ Icon = 48;  Fg = 108 }
    "mipmap-hdpi"    = @{ Icon = 72;  Fg = 162 }
    "mipmap-xhdpi"   = @{ Icon = 96;  Fg = 216 }
    "mipmap-xxhdpi"  = @{ Icon = 144; Fg = 324 }
    "mipmap-xxxhdpi" = @{ Icon = 192; Fg = 432 }
}

foreach ($d in $densities.Keys) {
    $folder = "$rootDir\android\app\src\main\res\$d"
    $iconSize = $densities[$d].Icon
    $fgSize = $densities[$d].Fg

    # Usun stare stubs .webp aby nie kolidowaly z nowymi .png
    Get-ChildItem -Path $folder -Filter "*.webp" -ErrorAction SilentlyContinue | Remove-Item -Force

    Save-ImageToFile -Path "$folder\ic_launcher.png" -Width $iconSize -Height $iconSize -IsRound $false -IsTransparent $false
    Save-ImageToFile -Path "$folder\ic_launcher_round.png" -Width $iconSize -Height $iconSize -IsRound $true -IsTransparent $false
    Save-ImageToFile -Path "$folder\ic_launcher_foreground.png" -Width $fgSize -Height $fgSize -IsRound $false -IsTransparent $true
}

# 3. Android Splashscreen Drawables
$splashDensities = @{
    "drawable-mdpi"    = 128
    "drawable-hdpi"    = 192
    "drawable-xhdpi"   = 256
    "drawable-xxhdpi"  = 384
    "drawable-xxxhdpi" = 512
}

foreach ($d in $splashDensities.Keys) {
    $folder = "$rootDir\android\app\src\main\res\$d"
    $splashSize = $splashDensities[$d]
    Save-ImageToFile -Path "$folder\splashscreen_logo.png" -Width $splashSize -Height $splashSize -IsRound $false -IsTransparent $true
}

Write-Host "All Android icons and splash images successfully generated!"
