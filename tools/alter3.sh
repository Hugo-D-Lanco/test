for file in resources/types/*.png; do
  # Get the filename without the path or extension
  filename=$(basename "$file" .png)
  
  # Ensure the compressed directory exists
  mkdir -p resources/types/compressed
  
  # Copy the original PNG to the compressed directory
  cp "$file" "resources/types/compressed/$filename.png"
  
  # Convert to WebP with quality 80
  cwebp -q 80 "resources/types/compressed/$filename.png" -o "resources/types/compressed/$filename.webp"
  
  # Remove the intermediate PNG if it exists
  if [ -f "resources/types/compressed/$filename.png" ]; then
    rm "resources/types/compressed/$filename.png"
  fi
done