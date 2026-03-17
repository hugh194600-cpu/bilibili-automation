$lnk = New-Object -ComObject WScript.Shell
$sc = $lnk.CreateShortcut('C:\Users\Administrator.DESKTOP-4BD88EU\Desktop\有声喵.lnk')
Write-Host "Target: $($sc.TargetPath)"
Write-Host "Args: $($sc.Arguments)"
Write-Host "WorkDir: $($sc.WorkingDirectory)"
