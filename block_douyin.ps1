$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$domains = @(
    "www.douyin.com","douyin.com","v.douyin.com","aweme.snssdk.com",
    "api.amemv.com","log.amemv.com","mon.amemv.com","ib.snssdk.com",
    "is.snssdk.com","i.snssdk.com","lf.snssdk.com","p1.douyinpic.com",
    "p3.douyinpic.com","p9.douyinpic.com","p26.douyinpic.com",
    "s.pstatp.com","v19-web.douyinvod.com","v26-web.douyinvod.com",
    "live.douyin.com","creator.douyin.com"
)
$existing = Get-Content $hostsPath -Raw
$toAdd = "# Block TikTok/Douyin`r`n"
foreach ($d in $domains) {
    if ($existing -notmatch [regex]::Escape($d)) {
        $toAdd += "0.0.0.0 $d`r`n"
    }
}
if ($toAdd -ne "# Block TikTok/Douyin`r`n") {
    Add-Content -Path $hostsPath -Value ("`r`n" + $toAdd) -Encoding ASCII
}
ipconfig /flushdns | Out-Null
