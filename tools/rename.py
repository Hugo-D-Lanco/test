import os

def hyphenate_filenames(root_folder):
    """Recursively rename .png files in all subfolders to replace spaces with hyphens."""
    # Walk through all subfolders in the root folder
    for folder_path, _, filenames in os.walk(root_folder):
        for filename in filenames:
            # Check if the file is a .png
            if filename.endswith(".png"):
                try:
                    # Check if the filename contains spaces
                    if " " in filename:
                        # Replace spaces with hyphens
                        new_filename = filename.replace(" ", "-")
                        
                        # Full paths for old and new files
                        old_file = os.path.join(folder_path, filename)
                        new_file = os.path.join(folder_path, new_filename)
                        
                        # Check for duplicates
                        if os.path.exists(new_file):
                            print(f"Warning: {new_filename} already exists, skipping {filename}")
                            continue
                        
                        # Rename the file
                        os.rename(old_file, new_file)
                        print(f"Renamed: {filename} -> {new_filename} in {folder_path}")
                    else:
                        print(f"Skipped: {filename} (No spaces in filename) in {folder_path}")
                except Exception as e:
                    print(f"Error processing {filename} in {folder_path}: {e}")
            else:
                print(f"Skipped: {filename} (Not a .png file) in {folder_path}")

# Specify the root folder containing the icon subfolders
root_folder = os.path.join("..", "resources")  # Relative path from tools/ to resources/
hyphenate_filenames(root_folder)