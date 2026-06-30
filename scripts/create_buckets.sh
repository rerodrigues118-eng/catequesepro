#!/usr/bin/env bash
set -euo pipefail

# Create Supabase buckets (requires supabase CLI v1+ and authenticated session)
# Usage: SUPABASE_PROJECT_REF=<project-ref> ./scripts/create_buckets.sh

BUCKETS_PUBLIC=(avatars catequizandos)
BUCKETS_PRIVATE=(catequizandos-backups uploads)

echo "Creating public buckets..."
for b in "${BUCKETS_PUBLIC[@]}"; do
  echo "Creating public bucket: $b"
  supabase storage create "$b" --public || true
done

echo "Creating private buckets..."
for b in "${BUCKETS_PRIVATE[@]}"; do
  echo "Creating private bucket: $b"
  supabase storage create "$b" || true
done

echo "Done. Review buckets in Supabase Dashboard or with 'supabase storage list'."
