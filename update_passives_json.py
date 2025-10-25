
import json

# Read mappings2.txt
with open('mappings2.txt', 'r') as f:
    mappings_content = f.readlines()

# Create a mapping from skill identifier to skill name
skill_name_map = {}
for line in mappings_content:
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    parts = line.split(':', 1)
    if len(parts) == 2:
        skill_id = parts[0].strip()
        skill_name = parts[1].strip()
        skill_name_map[skill_id] = skill_name

# Read passives.json
with open('static/passives.json', 'r') as f:
    passives_data = json.load(f)

# Create the new mapping
new_passives_data = {}
for skill_id, value in passives_data.items():
    if skill_id in skill_name_map:
        new_passives_data[skill_id] = {"id": value, "name": skill_name_map[skill_id]}
    else:
        new_passives_data[skill_id] = value

# Write the new mapping to passives.json
with open('static/passives.json', 'w') as f:
    json.dump(new_passives_data, f, indent=2)
