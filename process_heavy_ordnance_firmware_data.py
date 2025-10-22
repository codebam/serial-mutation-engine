import json

def parse_heavy_ordnance_firmware_data(data):
    lines = data.strip().split('\n')
    heavy_ordnance_firmware = []
    for line in lines:
        parts = line.strip().split('\t')
        if len(parts) >= 2 and parts[0].isdigit():
            id = int(parts[0])
            name = parts[1]
            screenshot = ""
            if len(parts) > 2:
                screenshot = parts[2]

            heavy_ordnance_firmware.append({
                "id": id,
                "name": name,
                "screenshot": screenshot,
                "universalPart": f"{{244:{id}}}"
            })
    return {"heavy_ordnance_firmware": heavy_ordnance_firmware}

with open('data', 'r') as f:
    data = f.read()

# Skip the header lines
data_to_parse = '\n'.join(data.split('\n')[2:])

parsed_data = parse_heavy_ordnance_firmware_data(data_to_parse)

with open('static/heavy_ordnance_firmware.json', 'w') as f:
    json.dump(parsed_data, f, indent=2)

print("Successfully created static/heavy_ordnance_firmware.json")
