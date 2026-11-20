# Vertex Windows voice API client. No browser required. PowerShell 5.1+ on Windows.
# Replace ONLY this placeholder once after Netlify is deployed by the owner.
$VertexUrl = 'https://YOUR-VERTEX-SITE.netlify.app/api/voice'
$ErrorActionPreference = 'Stop'
if ($VertexUrl -like '*YOUR-VERTEX-SITE*') { Write-Host '스크립트의 VertexUrl에 실제 Netlify 주소를 입력해 주세요.'; exit 1 }
$secretDir = Join-Path $env:APPDATA 'Vertex'
$secretFile = Join-Path $secretDir 'voice-device-token.xml'
if (-not (Test-Path $secretFile)) {
    New-Item -ItemType Directory -Force -Path $secretDir | Out-Null
    Write-Host 'Vertex 웹 설정에서 Windows 기기 토큰을 발급하세요. 토큰은 입력 화면에 표시되지 않습니다.'
    $secure = Read-Host '발급받은 토큰' -AsSecureString
    $secure | Export-Clixml -Path $secretFile
}
$secure = Import-Clixml -Path $secretFile
$token = (New-Object System.Net.NetworkCredential('', $secure)).Password
if ($token -notmatch '^dmv1_[a-f0-9]{24}_[A-Za-z0-9_-]{43}$') { throw '기기 토큰이 올바르지 않습니다. 토큰 파일을 지우고 다시 발급하세요.' }
Add-Type -AssemblyName Microsoft.VisualBasic
$question = [Microsoft.VisualBasic.Interaction]::InputBox('질문을 말하거나 입력하세요. Windows 음성 입력은 Win + H', 'Vertex', '오늘 숙제 알려줘')
if ([string]::IsNullOrWhiteSpace($question)) { exit 0 }
$body = @{ action = 'ask'; question = $question } | ConvertTo-Json -Compress
try {
    $result = Invoke-RestMethod -Uri $VertexUrl -Method Post -ContentType 'application/json; charset=utf-8' -Headers @{ Authorization = "Bearer $token" } -Body $body -TimeoutSec 20
} catch {
    Write-Host 'Vertex 요청 실패: 연결·토큰 만료·서버 설정을 확인하세요.'
    exit 1
}
Write-Host "Vertex: $($result.reply)"
try {
    Add-Type -AssemblyName System.Speech
    $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $korean = $speaker.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'ko-KR' } | Select-Object -First 1
    if ($korean) { $speaker.SelectVoice($korean.VoiceInfo.Name); $speaker.Speak([string]$result.reply) }
    else { Write-Host '한국어 시스템 음성이 설치되지 않아 텍스트로 표시했어요.' }
    $speaker.Dispose()
} catch { Write-Host '시스템 TTS가 없어 텍스트로 표시했어요.' }
