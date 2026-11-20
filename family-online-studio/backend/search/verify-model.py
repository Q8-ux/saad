"""Verify the vocabulary-only Q8 conversion leaves every other tensor byte unchanged."""
import mmap
from pathlib import Path
import struct
import sys


def metadata(path):
    with open(path, "rb") as f:
        def number(fmt):
            return struct.unpack("<" + fmt, f.read(struct.calcsize(fmt)))[0]
        def string():
            return f.read(number("Q")).decode()
        def skip(kind):
            sizes = {0: 1, 1: 1, 2: 2, 3: 2, 4: 4, 5: 4, 6: 4, 7: 1, 10: 8, 11: 8, 12: 8}
            if kind in sizes:
                f.seek(sizes[kind], 1)
            elif kind == 8:
                f.seek(number("Q"), 1)
            elif kind == 9:
                element, count = number("I"), number("Q")
                if element in sizes:
                    f.seek(sizes[element] * count, 1)
                else:
                    for _ in range(count):
                        skip(element)
            else:
                raise ValueError("Unknown metadata type")
        assert f.read(4) == b"GGUF" and number("I") == 3
        count, keys, alignment = number("Q"), number("Q"), 32
        for _ in range(keys):
            name, kind = string(), number("I")
            if name == "general.alignment":
                assert kind == 4
                alignment = number("I")
            else:
                skip(kind)
        tensors = []
        for _ in range(count):
            name, dimensions = string(), number("I")
            shape = tuple(number("Q") for _ in range(dimensions))
            tensors.append((name, shape, number("I"), number("Q")))
        start = (f.tell() + alignment - 1) // alignment * alignment
    return start, tensors


def main():
    original, reduced = map(Path, sys.argv[1:])
    old_start, old = metadata(original)
    new_start, new = metadata(reduced)
    assert len(old) == len(new)
    count = 0
    with original.open("rb") as a, reduced.open("rb") as b:
        with mmap.mmap(a.fileno(), 0, access=mmap.ACCESS_READ) as left, mmap.mmap(b.fileno(), 0, access=mmap.ACCESS_READ) as right:
            old.sort(key=lambda tensor: tensor[3])
            new.sort(key=lambda tensor: tensor[3])
            positions = {tensor[0]: index for index, tensor in enumerate(new)}
            assert set(positions) == {tensor[0] for tensor in old}
            for index, before in enumerate(old):
                position = positions[before[0]]
                after = new[position]
                name, shape, kind, offset = before
                assert after[:2] == before[:2]
                if name == "token_embd.weight":
                    assert kind == 1 and after[2] == 8  # F16 -> Q8_0
                    continue
                assert after[2] == kind
                end_a = old_start + old[index+1][3] if index+1 < len(old) else len(left)
                end_b = new_start + new[position+1][3] if position+1 < len(new) else len(right)
                assert left[old_start+offset:end_a] == right[new_start+after[3]:end_b], name
                count += 1
    print("Verified", count, "unchanged tensors; only vocabulary storage was converted to Q8_0")


if __name__ == "__main__":
    main()
