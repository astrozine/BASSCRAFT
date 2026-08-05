import os
import re
import shutil
import zipfile

src_dir = r"C:\Users\User\.gemini\antigravity\scratch\basscraft_v3light"
deploy_dir = r"C:\Users\User\.gemini\antigravity\scratch\basscraft_v3_deploy"

# Clean deploy dir if exists
if os.path.exists(deploy_dir):
    shutil.rmtree(deploy_dir)
os.makedirs(deploy_dir)

files_to_scan = ['index.html', 'styles.css']
core_files = ['index.html', 'styles.css', 'app.js']

# Copy core files
for f in core_files:
    shutil.copy2(os.path.join(src_dir, f), os.path.join(deploy_dir, f))

# Find assets
assets = set()
pattern = re.compile(r'assets/[^"\'\>\)\r\n]+')

for f in files_to_scan:
    with open(os.path.join(src_dir, f), 'r', encoding='utf-8') as file:
        content = file.read()
        matches = pattern.findall(content)
        for m in matches:
            # Clean up trailing chars if any
            m = m.strip()
            if m.endswith(',') or m.endswith('?') or m.endswith('#'):
                m = m[:-1]
            if m.endswith('v=3'): # specifically for styles.css?v=3 which matched incorrectly in regex if not careful
                m = m.split('?')[0]
            # Some paths might be in data-attributes comma separated
            sub_matches = m.split(',')
            for sm in sub_matches:
                sm = sm.strip()
                if sm.startswith('assets/'):
                    assets.add(sm)

print(f"Found {len(assets)} unique assets.")

missing = []
# Copy assets
for asset in assets:
    asset_path = os.path.join(src_dir, asset)
    dest_path = os.path.join(deploy_dir, asset)
    
    if not os.path.exists(asset_path):
        # try unquoting just in case it was url encoded, though html here has spaces
        import urllib.parse
        asset_path_unq = urllib.parse.unquote(asset_path)
        if os.path.exists(asset_path_unq):
            asset_path = asset_path_unq
            dest_path = os.path.join(deploy_dir, urllib.parse.unquote(asset))
        else:
            missing.append(asset)
            continue
            
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    shutil.copy2(asset_path, dest_path)

if missing:
    print("Warning, some assets not found:")
    for m in missing:
        print("  - " + m)

# Create Zip
zip_path = r"C:\Users\User\.gemini\antigravity\scratch\v3_deploy.zip"
print(f"Creating zip at {zip_path}")
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(deploy_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, deploy_dir)
            zipf.write(file_path, arcname)

print("Done!")
