for file in resources/icons/*.png; do
  # Get the filename without the path or extension
  filename=$(basename "$file" .png)
  # Resize to 96x96
  magick "$file" -resize 96x96 "resources/icons/compressed/$filename.png"
  # Convert to WebP with quality 80
  cwebp -q 80 "resources/icons/compressed/$filename.png" -o "resources/icons/compressed/$filename.webp"
  # Remove the intermediate PNG
  rm "resources/icons/compressed/$filename.png"
done

