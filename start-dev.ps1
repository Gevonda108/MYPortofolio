$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host "Starting feedback API on http://localhost:3001 ..."
$apiJob = Start-Job -ScriptBlock {
	Set-Location $using:PSScriptRoot
	& .\npm.bat run dev:api
}

try {
	Write-Host "Starting Vite dev server on http://localhost:5173 ..."
	& .\npm.bat run dev
}
finally {
	if ($apiJob) {
		Stop-Job -Job $apiJob -ErrorAction SilentlyContinue
		Remove-Job -Job $apiJob -ErrorAction SilentlyContinue
	}
}
