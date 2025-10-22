import json

def parse_weapon_elemental_data(data):
    lines = data.strip().split('\n')
    weapon_elemental = []
    for line in lines:
        parts = line.strip().split('\t')
        if len(parts) >= 2 and parts[0].isdigit():
            id = int(parts[0])
            effect = parts[1]
            screenshot = ""
            if len(parts) > 2:
                screenshot = parts[2]

            weapon_elemental.append({
                "id": id,
                "effect": effect,
                "screenshot": screenshot,
                "universalPart": f"{{1:{id}}}"
            })
    return {"weapon_elemental": weapon_elemental}

with open('data', 'r') as f:
    data = f.read()

# Skip the header lines
data_to_parse = '\n'.join(data.split('\n')[2:])

parsed_data = parse_weapon_elemental_data(data_to_parse)

with open('static/weapon_elemental.json', 'w') as f:
    json.dump(parsed_data, f, indent=2)

print("Successfully created static/weapon_elemental.json")
