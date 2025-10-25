
import json

# Read passives.json
with open('static/passives.json', 'r') as f:
    passives_data = json.load(f)

# Create the new mapping
new_passives_data = {}
for skill_id, value in passives_data.items():
    if isinstance(value, int):
        new_passives_data[skill_id] = {"id": value}
    else:
        new_passives_data[skill_id] = value

# Write the new mapping to passives.json
with open('static/passives.json', 'w') as f:
    json.dump(new_passives_data, f, indent=2)
