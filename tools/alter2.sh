for file in resources/items/*.png; do
  # Get the filename without the path or extension
  filename=$(basename "$file" .png)
  # Resize to 64x64
  magick "$file" -resize 64x64 "resources/items/compressed/$filename.png"
  # Convert to WebP with quality 80
  cwebp -q 80 "resources/items/compressed/$filename.png" -o "resources/items/compressed/$filename.webp"
  # Remove the intermediate PNG
  rm "resources/items/compressed/$filename.png"
done

