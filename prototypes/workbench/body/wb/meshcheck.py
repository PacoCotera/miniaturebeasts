"""python -m wb.meshcheck SPECIES.json: the file's checks (file, cage and coat stages) printed one row a line; exit 1 when any is red. Blender's python or any python with numpy."""
import json
import os
import sys

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BODY not in sys.path:
    sys.path.insert(0, BODY)


def main(argv=None):
    from wb import facade as F
    doc = json.load(open((argv or sys.argv[1:])[0]))
    rows = F.check_rows(doc)
    for r in rows:
        print(f"{r['state']:5} {r['id']:16} {str(r['measure'])[:140]}")
    return 1 if any(r["state"] == "fail" for r in rows) else 0


if __name__ == "__main__":
    sys.exit(main())
