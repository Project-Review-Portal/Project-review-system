Write-Host "=============================================================="
Write-Host "executing git pull..."
git pull

Write-Host "=============================================================="
Write-Host "running npm install in root..."
npm install

Write-Host "=============================================================="
Write-Host "running npm install in backend..."
Set-Location backend
npm install
Set-Location ..

Write-Host "=============================================================="
Write-Host "running npm install in frontend..."
Set-Location frontend
npm install
Set-Location ..

Write-Host "=============================================================="
Write-Host "Done!"
