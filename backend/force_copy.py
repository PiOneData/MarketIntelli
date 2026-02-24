
import shutil
import os

src = r"c:\Users\dhara\Downloads\windlocal\backend\enriched_datacenters.json"
dst = r"c:\Users\dhara\Downloads\windlocal\frontend\public\datacenters.geojson"

if os.path.exists(src):
    shutil.copy2(src, dst)
    print(f"Successfully copied {src} to {dst}")
else:
    print(f"Source file not found: {src}")
