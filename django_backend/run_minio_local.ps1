# Check if Docker daemon is running
Write-Host "Checking if Docker is running..." -ForegroundColor Cyan
& docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "------------------------------------------------------------------" -ForegroundColor Red
    Write-Host "❌ Error: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please open the 'Docker Desktop' application on your computer first." -ForegroundColor Yellow
    Write-Host "Wait for it to fully load (the whale icon turns green), then run this script again." -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------------" -ForegroundColor Red
    exit 1
}

# Create data folder if not exists
if (!(Test-Path -Path "minio_data")) {
    New-Item -ItemType Directory -Path "minio_data" | Out-Null
    Write-Host "Created 'minio_data' directory." -ForegroundColor Green
}

# Stop and remove existing container if it exists
Write-Host "Stopping and cleaning up any existing MinIO container..." -ForegroundColor Yellow
docker stop minio 2>$null | Out-Null
docker rm minio 2>$null | Out-Null

Write-Host "Starting local MinIO container via Docker..." -ForegroundColor Cyan

$dockerCmd = docker run -d --name minio `
  -p 9000:9000 `
  -p 9001:9001 `
  -e "MINIO_ROOT_USER=minioadmin" `
  -e "MINIO_ROOT_PASSWORD=minioadmin" `
  -v "${PWD}\minio_data:/data" `
  minio/minio server /data --console-address ":9001" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✨ MinIO started successfully! ✨" -ForegroundColor Green
    Write-Host "👉 API Port (Django): http://localhost:9000" -ForegroundColor Yellow
    Write-Host "👉 Web Console (Admin): http://localhost:9001" -ForegroundColor Yellow
    Write-Host "👉 Credentials: minioadmin / minioadmin" -ForegroundColor Yellow
    Write-Host "`nImportant Next Steps:" -ForegroundColor Green
    Write-Host "1. Go to http://localhost:9001 in your browser." -ForegroundColor Green
    Write-Host "2. Login and create a bucket named 'hyrind-files'." -ForegroundColor Green
    Write-Host "3. Ensure USE_LOCAL_STORAGE=false is set in your .env file." -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start MinIO Docker container!" -ForegroundColor Red
    Write-Host "Error details: $dockerCmd" -ForegroundColor Red
}
