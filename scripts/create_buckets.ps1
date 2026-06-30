Param()
Write-Host "Creating Supabase buckets using supabase CLI (PowerShell)"

$public = @("avatars","catequizandos")
$private = @("catequizandos-backups","uploads")

foreach ($b in $public) {
  Write-Host "Creating public bucket: $b"
  supabase storage create $b --public || Write-Host "Bucket $b may already exist"
}

foreach ($b in $private) {
  Write-Host "Creating private bucket: $b"
  supabase storage create $b || Write-Host "Bucket $b may already exist"
}

Write-Host "Buckets creation script finished."
