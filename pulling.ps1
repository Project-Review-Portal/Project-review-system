Write-Host "=============================================================="
Write-Host "executing git pull..."
git pull

Write-Host "=============================================================="
Write-Host "running npm install in root..."
npm install

Write-Host "=============================================================="
Write-Host "running npm install in backend..."
cd backend
npm install
cd ..

Write-Host "=============================================================="
Write-Host "running npm install in frontend..."
cd frontend
npm install
cd ..

Write-Host "=============================================================="
Write-Host "Done!"
