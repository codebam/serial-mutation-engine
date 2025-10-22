import json

def parse_harlowe_data(data):
    lines = data.strip().split('\n')
    harlowe_class_mods = []
    for line in lines:
        parts = line.strip().split('\t')
        if len(parts) >= 2 and parts[0].isdigit():
            id = int(parts[0])
            perkType = parts[1]
            description = ""
            if len(parts) > 2:
                description = parts[2]

            harlowe_class_mods.append({
                "id": id,
                "perkType": perkType,
                "description": description,
                "universalPart": f"{{259:{id}}}"
            })
    return {"harlowe_class_mods": harlowe_class_mods}

with open('data', 'r') as f:
    data = f.read()

# Skip the header lines
data_to_parse = '\n'.join(data.split('\n')[3:])

parsed_data = parse_harlowe_data(data_to_parse)

with open('static/harlowe_class_mods.json', 'w') as f:
    json.dump(parsed_data, f, indent=2)

print("Successfully created static/harlowe_class_mods.json")
