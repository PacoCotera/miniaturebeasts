"""Round 3: sprite measures and leaf colour for master / SDF fix 7 / round 2 (its report) / round 3 into WORKDIR/measures-all.json (cadvenv python).  python tools/measures_all.py WORKDIR"""
import sys, os, json, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); W = os.path.abspath(sys.argv[1]); R1 = "/home/mb/mb/iwq/results/T-20261101-mesh/loika"
run = lambda script, *a: json.loads(subprocess.run([sys.executable, os.path.join(HERE, script), *a], capture_output=True, text=True, check=True).stdout)
args = [f"master={R1}/img/master-304.png", f"sdf={W}/sdf/sdf-S01-304.png", f"r3={W}/s5/loika-304.png"]
m = run("measure.py", *args)
m["r2"] = json.load(open(f"{R1}/round2/report.json"))["sprite_measures"]["r2"]
m["leaf"] = run("leaf.py", *args)
json.dump(m, open(f"{W}/measures-all.json", "w"), indent=1)
print("ok")
