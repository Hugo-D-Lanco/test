import os
import requests
import json
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def load_pokemon_names():
    """Fetch Pokémon names from PokéAPI or load from cache with retries."""
    cache_file = "pokemon_names.json"
    name_map = {}

    # Load from cache if it exists
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r") as f:
                name_map = json.load(f)
            print(f"Loaded {len(name_map)} Pokémon names from {cache_file}")
        except Exception as e:
            print(f"Error loading cache: {e}")

    # Set up requests session with retries
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    session.mount("https://", HTTPAdapter(max_retries=retries))

    # Fetch names for dex 1–1010 (Gen I–IX), only for missing entries
    for i in range(1, 1011):
        if str(i) not in name_map:
            try:
                response = session.get(f"https://pokeapi.co/api/v2/pokemon/{i}", timeout=10)
                if response.status_code == 200:
                    name_map[str(i)] = response.json()["name"]
                else:
                    print(f"Warning: Failed to fetch name for dex {i} (Status: {response.status_code})")
                    name_map[str(i)] = str(i)  # Fallback to dex number
            except Exception as e:
                print(f"Error fetching name for dex {i}: {e}")
                name_map[str(i)] = str(i)  # Fallback to dex number

    # Save updated cache
    try:
        with open(cache_file, "w") as f:
            json.dump(name_map, f)
        print(f"Saved {len(name_map)} Pokémon names to {cache_file}")
    except Exception as e:
        print(f"Error saving cache: {e}")

    return name_map

def rename_pokemon_icons(folder_path):
    """Rename Pokémon icon files to use Pokémon names, preserving hyphenated suffixes."""
    # Load Pokémon names
    name_map = load_pokemon_names()
    if not name_map:
        print("Error: No Pokémon names loaded. Exiting.")
        return

    # Iterate through all files in the specified folder
    for filename in os.listdir(folder_path):
        # Check if the file is a .png
        if filename.endswith(".png"):
            try:
                # Remove .png extension for processing
                base_name = filename[:-4]  # Strip .png

                # Handle files in numeric format with hyphen (e.g., 25-alola.png, 150-mega-y.png)
                if base_name[0].isdigit():
                    # Split on first hyphen to preserve suffix
                    parts = base_name.split("-", 1)  # Split only on first hyphen
                    dex_number = parts[0]

                    # Validate dex number
                    try:
                        int(dex_number)  # Ensure it's a valid number
                    except ValueError:
                        print(f"Error: Invalid dex number in {filename}")
                        continue

                    # Get suffix (e.g., "-alola", "-mega-y", or empty)
                    suffix = f"-{parts[1]}" if len(parts) > 1 else ""

                    # Get Pokémon name
                    pokemon_name = name_map.get(dex_number, dex_number)

                    # Create new filename
                    new_filename = f"{pokemon_name}{suffix}.png"

                    # Full paths
                    old_file = os.path.join(folder_path, filename)
                    new_file = os.path.join(folder_path, new_filename)

                    # Check for duplicates
                    if os.path.exists(new_file):
                        print(f"Warning: {new_filename} already exists, skipping {filename}")
                        continue

                    # Rename
                    os.rename(old_file, new_file)
                    print(f"Renamed: {filename} -> {new_filename}")

                else:
                    print(f"Skipped: {filename} (Does not match numeric prefix format)")
            except Exception as e:
                print(f"Error processing {filename}: {e}")
        else:
            print(f"Skipped: {filename} (Not a .png file)")

# Specify the folder containing the icons
folder_path = os.path.join("..", "resources", "sprites")  # Relative path from tools/ to resources/icons
rename_pokemon_icons(folder_path)