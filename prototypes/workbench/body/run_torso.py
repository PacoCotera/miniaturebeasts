import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, views
t = time.time()
b = build.make_body(upto="torso")
r = views.render_views(b, "out/c1", views=[views.VIEWS[1], views.VIEWS[2], views.VIEWS[8]], pole_dots=True)
print(r, time.time() - t)
