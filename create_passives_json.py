
import json

# Read mappings2.txt
with open('mappings2.txt', 'r') as f:
    mappings_content = f.readlines()

# Create a mapping from skill identifier to skill name
skill_map = {}
for line in mappings_content:
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    parts = line.split(':', 1)
    if len(parts) == 2:
        skill_id = parts[0].strip()
        skill_name = parts[1].strip()
        skill_map[skill_id] = skill_name

# Write the new mapping to passives.json
with open('static/passives.json', 'w') as f:
    json.dump(skill_map, f, indent=2)
