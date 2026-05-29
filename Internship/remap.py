from pathlib import Path

mapping = {
    0: 4,  # big bus -> bus
    1: 5,  # big truck -> truck
    2: 4,  # bus-l -> bus
    3: 4,  # bus-s -> bus
    4: 0,  # car -> car
    5: 5,  # mid truck -> truck
    6: 4,  # small bus -> bus
    7: 5,  # small truck -> truck
    8: 5,  # truck-l -> truck
    9: 5,  # truck-m -> truck
    10: 5, # truck-s -> truck
    11: 5  # remaining truck class
}

label_dirs = [
    r"C:\Users\Dhanush\OneDrive\Documents\Internship\resized_datset\train\labels",
    r"C:\Users\Dhanush\OneDrive\Documents\Internship\resized_datset\val\labels"
]

for label_dir in label_dirs:

    for file in Path(label_dir).glob("*.txt"):

        new_lines = []

        with open(file, "r") as f:
            lines = f.readlines()

        for line in lines:

            parts = line.strip().split()

            old_class = int(parts[0])

            if old_class in mapping:

                parts[0] = str(mapping[old_class])

                new_lines.append(" ".join(parts))

        with open(file, "w") as f:
            f.write("\n".join(new_lines))

print("Label remapping completed.")