$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$domains = @(
    "www.douyin.com","douyin.com","v.douyin.com","aweme.snssdk.com",
    "api.amemv.com","log.amemv.com","mon.amemv.com","ib.snssdk.com",
    "is.snssdk.com","i.snssdk.com","lf.snssdk.com","p1.douyinpic.com",
    "p3.douyinpic.com","p9.douyinpic.com","p26.douyinpic.com",
    "s.pstatp.com","v19-web.douyinvod.com","v26-web.douyinvod.com",
    "live.douyin.com","creator.douyin.com"
)
$lines = Get-Content $hostsPath
$filtered = $lines | Where-Object {
    $line = $_.Trim()
    if ($line -match "^#\s*Block TikTok") { return $false }
    foreach ($d in $domains) {
        if ($line -match [regex]::Escape($d)) { return $false }
    }
    return $true
}
$result = ($filtered -join "`r`n").TrimEnd()
[System.IO.File]::WriteAllText($hostsPath, $result + "`r`n", [System.Text.Encoding]::ASCII)
ipconfig /flushdns | Out-Null
