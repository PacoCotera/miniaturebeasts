"""Workbench chunk 3: the cache, the queue and superseding, the store and undo log, the server and the CLI exit codes. The server runs with no workers, so nothing here needs Blender."""
import io, json, os, shutil, sys, threading, time, unittest, urllib.request, contextlib
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from wb import cas as C, jobs as J, store as S, keys as K, cli, server as SV, hashing as H

BODY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRATCH = os.path.join(BODY, "scratch", "t_server")
SPEC = json.load(open(os.path.join(BODY, "species", "S20.json")))


class TestCas(unittest.TestCase):
    def setUp(self):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        self.c = C.Cas(os.path.join(SCRATCH, "cas"))

    tearDown = lambda self: shutil.rmtree(SCRATCH, ignore_errors=True)

    def test_put_get_has_and_layout(self):
        k = H.hash_of("x")
        self.assertFalse(self.c.has(k, "json"))
        p = self.c.put_json(k, {"a": 1})
        self.assertEqual(p, os.path.join(self.c.root, k[:2], k + ".json"))
        self.assertEqual(self.c.get_json(k), {"a": 1})
        self.assertTrue(self.c.has(k, "json"))

    def test_bad_keys_are_refused(self):
        for bad in ("", "../x", "ABC", "zz"):
            with self.assertRaises(ValueError):
                self.c.path(bad, "png")

    def test_no_temp_files_are_left_after_a_put(self):
        self.c.put_bytes(H.hash_of(1), "png", b"x")
        self.assertEqual(os.listdir(os.path.join(self.c.root, ".tmp")), [])

    def test_eviction_removes_the_least_recently_used_first(self):
        keys = [H.hash_of(i) for i in range(4)]
        for i, k in enumerate(keys):
            p = self.c.put_bytes(k, "png", b"x" * 1000)
            os.utime(p, (1000 + i, 1000 + i))
        self.c.has(keys[0], "png")                      # a hit refreshes the oldest file
        self.assertEqual(self.c.evict(2500), 2)
        self.assertTrue(self.c.has(keys[0], "png", touch=False))
        self.assertFalse(self.c.has(keys[1], "png", touch=False))
        self.assertFalse(self.c.has(keys[2], "png", touch=False))
        self.assertTrue(self.c.has(keys[3], "png", touch=False))


def mkjob(q, species, kind, prio, h):
    j = J.Job(q.new_id(), species, kind, {}, h, prio, {}, h, None)
    q.add(j)
    return j


class TestQueue(unittest.TestCase):
    def test_priority_then_age(self):
        q = J.JobQueue()
        a = mkjob(q, "S1", "render", 3, "h"); b = mkjob(q, "S1", "render", 0, "h"); c = mkjob(q, "S1", "render", 0, "h"); d = mkjob(q, "S1", "render", 1, "h")
        self.assertEqual([q.pop(("render",), 0.01).id for _ in range(4)], [b.id, c.id, d.id, a.id])
        self.assertIsNone(q.pop(("render",), 0.01))

    def test_pop_takes_only_its_kinds(self):
        q = J.JobQueue()
        s = mkjob(q, "S1", "sheet", 0, "h")
        self.assertIsNone(q.pop(("render", "build"), 0.01))
        self.assertEqual(q.pop(("sheet",), 0.01).id, s.id)

    def test_superseding_cancels_older_p0_to_p2_and_leaves_the_rest(self):
        q = J.JobQueue()
        old0 = mkjob(q, "S1", "render", 0, "old"); old2 = mkjob(q, "S1", "build", 2, "old"); old3 = mkjob(q, "S1", "sheet", 3, "old")
        other = mkjob(q, "S2", "render", 0, "old"); same = mkjob(q, "S1", "render", 0, "new")
        running = mkjob(q, "S1", "render", 0, "old"); running = q.pop(("render",), 0.01)           # the oldest P0 starts
        gone = q.supersede("S1", "new")
        self.assertEqual({j.id for j in gone}, {old2.id} | ({old0.id} if running.id != old0.id else set()) | ({j.id for j in q.jobs.values() if j.state == "superseded"} - {old2.id}))
        self.assertEqual(old2.state, "superseded")
        self.assertEqual(old3.state, "queued")                         # P3 is pinned to its hash
        self.assertEqual(other.state, "queued")                        # another species
        self.assertEqual(same.state, "queued")                         # the current hash
        self.assertEqual(running.state, "running")                     # a running job finishes
        self.assertTrue(old2.event.is_set())

    def test_the_same_key_is_one_active_job(self):
        q = J.JobQueue()
        j = mkjob(q, "S1", "render", 0, "k")
        self.assertIs(q.find_active("S1", "render", "k"), j)
        q.finish(j, "done", {})
        self.assertIsNone(q.find_active("S1", "render", "k"))


class TestPatch(unittest.TestCase):
    DOC = {"a": {"b": [1, 2, {"name": "x", "v": 1.0}]}, "c": 1}

    def test_replace_test_and_errors(self):
        d = S.apply_patch(self.DOC, [{"op": "test", "path": "/c", "value": 1}, {"op": "replace", "path": "/a/b/2/v", "value": 2.5}])
        self.assertEqual(d["a"]["b"][2]["v"], 2.5)
        self.assertEqual(self.DOC["a"]["b"][2]["v"], 1.0)
        for ops, code in (([{"op": "test", "path": "/c", "value": 2}], 409), ([{"op": "replace", "path": "/zz", "value": 1}], 400), ([{"op": "move", "path": "/c"}], 400)):
            with self.assertRaises(S.ApiError) as cm:
                S.apply_patch(self.DOC, ops)
            self.assertEqual(cm.exception.status, code)

    def test_diff_lists_changed_leaves(self):
        new = S.apply_patch(self.DOC, [{"op": "replace", "path": "/a/b/0", "value": 9}, {"op": "replace", "path": "/c", "value": 2}])
        self.assertEqual(S.diff(self.DOC, new), [("/a/b/0", 1, 9), ("/c", 1, 2)])

    def test_cli_path_resolution_by_name_and_index(self):
        self.assertEqual(cli.resolve_path(self.DOC, "a.b.x.v"), ("/a/b/2/v", 1.0))
        self.assertEqual(cli.resolve_path(self.DOC, "a.b.0"), ("/a/b/0", 1))
        with self.assertRaises(cli.Fail):
            cli.resolve_path(self.DOC, "a.q")


def run_cli(*argv, token="wb-local-maker"):
    out, err = io.StringIO(), io.StringIO()
    os.environ["WB_TOKEN"] = token or ""
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = cli.main(list(argv))
    return code, out.getvalue(), err.getvalue()


class TestServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        shutil.rmtree(SCRATCH, ignore_errors=True)
        cls.sp = os.path.join(SCRATCH, "species")
        os.makedirs(cls.sp)
        cls.file = os.path.join(cls.sp, "S20x.json")
        S.write_spec(cls.file, dict(SPEC, species="S20x"))
        cls.srv = SV.Server(os.path.join(SCRATCH, "home"), [cls.sp], proxy_workers=0)
        cls.srv.start()
        os.environ["WB_URL"] = f"http://127.0.0.1:{cls.srv.port}"

    @classmethod
    def tearDownClass(cls):
        cls.srv.stop()
        os.environ.pop("WB_URL", None); os.environ.pop("WB_TOKEN", None)
        shutil.rmtree(SCRATCH, ignore_errors=True)

    def edit_file(self, ptr_path, value):
        spec = S.read_spec(self.file)
        cur = spec
        for t in ptr_path[:-1]:
            cur = cur[t]
        cur[ptr_path[-1]] = value
        S.write_spec(self.file, spec)

    def test_a_exit_codes(self):
        code, out, _ = run_cli("validate", "S20x", "--json")
        self.assertEqual(code, 0)
        self.assertTrue(json.loads(out)["ok"])
        code, out, err = run_cli("set", "S20x", "parts.tail.joints.t2.len", "0.3")
        self.assertEqual(code, 0)
        self.assertIn("0.21 -> 0.3", out)
        code, _, err = run_cli("set", "S20x", "parts.tail.joints.t99.len", "0.3")
        self.assertEqual(code, 2)
        self.assertIn("t99", err)
        code, out, _ = run_cli("render", "S20x", "--mode", "plush", "--json")
        self.assertEqual(code, 2)
        self.assertEqual(json.loads(out)["field"], "mode")
        code, out, _ = run_cli("build", "S20x", "--genome", "low:nope", "--json")
        self.assertEqual((code, json.loads(out)["field"]), (2, "genome"))
        code, out, _ = run_cli("render", "S20x", "--wait", "--timeout", "0.5", "--json")           # no worker: it stays queued
        self.assertEqual((code, json.loads(out)["exit"]), (3, 3))
        code, _, err = run_cli("set", "S20x", "name", '"x"', token="")
        self.assertEqual(code, 4)
        code, _, _ = run_cli("set", "S20x", "name", '"x"', token="not-a-token")
        self.assertEqual(code, 4)

    def test_b_a_maker_cannot_reach_the_gate(self):
        req = urllib.request.Request(os.environ["WB_URL"] + "/api/species/S20x/gate/1/sign", method="POST", data=b"{}", headers={"Authorization": "Bearer wb-local-maker"})
        with self.assertRaises(urllib.error.HTTPError) as cm:
            urllib.request.urlopen(req)
        self.assertEqual(cm.exception.code, 403)
        code, out, _ = run_cli("validate", "S20x")                       # reads need no token
        self.assertEqual(code, 0)

    def test_c_the_undo_log_has_the_token_and_the_actor(self):
        run_cli("set", "S20x", "parts.tail.joints.t3.len", "0.25", token="wb-local-agent")
        h = S.Species("S20x", self.file).history(50)
        e = [x for x in h if x["path"] == "/parts/tail/joints/3/len"][-1]
        self.assertEqual((e["actor"], e["role"], e["agent"], e["via"], e["old"], e["new"]), ("agent-1", "maker", True, "api", 0.2, 0.25))
        self.assertNotEqual(e["hash_before"], e["hash_after"])

    def test_d_a_direct_file_edit_is_logged_announced_and_starts_a_proxy_job(self):
        q = self.srv.hub.subscribe("S20x")
        self.edit_file(["parts", "tail", "joints", 4, "len"], 0.27)
        sp = self.srv.species["S20x"]
        deadline = time.time() + 3
        types = []
        while time.time() < deadline and "queued" not in types:
            try:
                types.append(q.get(timeout=0.5)["type"])
            except Exception:
                pass
        self.assertEqual(types[0], "edited")                          # (older queued proxy jobs are superseded: failed events may come between)
        self.assertIn("queued", types)
        e = [x for x in sp.history(50) if x["path"] == "/parts/tail/joints/4/len"][-1]
        self.assertEqual((e["via"], e["actor"], e["new"]), ("file", "file", 0.27))

    def test_e_an_edit_supersedes_the_queued_proxy_jobs_of_the_old_file(self):
        j1 = self.srv.submit("S20x", "render", dict(modes=["clay"], az=[0]), None)
        self.assertEqual(j1.state, "queued")
        self.edit_file(["parts", "tail", "joints", 4, "len"], 0.28)
        self.srv.get_species("S20x")                                                 # any read looks at the file first
        self.assertEqual(j1.state, "superseded")
        self.assertIn("changed", j1.error)
        j2 = self.srv.submit("S20x", "sheet", dict(), None)
        self.edit_file(["parts", "tail", "joints", 4, "len"], 0.29)
        self.srv.get_species("S20x")
        self.assertIn(j2.state, ("queued", "running"))                               # P3 is never superseded: it is pinned to its hash
        self.assertNotEqual(j2.state, "superseded")

    def test_f_same_request_is_one_job_and_a_stored_result_is_a_cache_hit(self):
        a = self.srv.submit("S20x", "render", dict(modes=["clay"], az=[32]), None)
        b = self.srv.submit("S20x", "render", dict(modes=["clay"], az=[32]), None)
        self.assertIs(a, b)
        ck = K.cage_key(self.srv.species["S20x"].spec, "type")
        views = [("clay", 32, 304)]
        fk = K.frame_key(ck, "clay", 32, 304)
        self.srv.cas.put_bytes(fk, "png", b"png")
        self.srv.cas.put_json(a.key, dict(cage=dict(key=ck, cached=False), views=[dict(mode="clay", az=32, size=304, key=fk, cached=False, ms=9.0, path="x")]))
        c = self.srv.submit("S20x", "render", dict(modes=["clay"], az=[32]), None, priority=0)
        c2 = self.srv.queue.jobs[c.id]
        self.assertEqual(a.key, c2.key)
        # the queued job `a` is the active one; a stored result answers a new job only once `a` is gone
        self.srv.queue.finish(a, "failed", error="test")
        d = self.srv.submit("S20x", "render", dict(modes=["clay"], az=[32]), None)
        self.assertEqual((d.state, d.cached), ("done", True))
        self.assertTrue(d.result["views"][0]["cached"])
        self.assertEqual(d.result["cache"]["views_hit"], 1)

    def test_g_events_arrive_over_sse(self):
        got = []
        def reader():
            with urllib.request.urlopen(os.environ["WB_URL"] + "/events?species=S20x", timeout=5) as r:
                for raw in r:
                    if raw.startswith(b"event: "):
                        got.append(raw[7:].strip().decode())
                        if "edited" in got:
                            return
        t = threading.Thread(target=reader, daemon=True); t.start()
        time.sleep(0.4)
        run_cli("set", "S20x", "parts.tail.joints.t5.len", "0.21", token="wb-local-agent")
        t.join(5)
        self.assertIn("edited", got)

    def test_h_registries_and_unbuilt_kinds(self):
        for p in ("plans", "families", "styles"):
            self.assertEqual(json.load(urllib.request.urlopen(os.environ["WB_URL"] + "/api/" + p)), [])
        with self.assertRaises(S.ApiError):
            self.srv.submit("S20x", "variety", {}, None)
        with self.assertRaises(S.ApiError):
            self.srv.submit("S20x", "check", {"stage": "extremes"}, None)
        self.assertEqual([m["id"] for m in json.load(urllib.request.urlopen(os.environ["WB_URL"] + "/api/checks"))][:3], ["schema", "ranges", "joins"])


class TestKeys(unittest.TestCase):
    def test_modes_and_sizes_match_the_proxy(self):
        import re
        src = open(os.path.join(BODY, "wb", "proxy.py")).read()
        self.assertIn('MODES = ("clay", "normal", "parts", "wire")', src)
        self.assertIn("AZ = (0, 32, 90, 180)", src)
        self.assertIn("304: (304, 312, 95.0)", src)
        self.assertIn("608: (608, 624, 190.0)", src)
        self.assertEqual(K.MODES, ("clay", "normal", "parts", "wire"))
        self.assertEqual(K.SIZES, (304, 96, 48, 608))
        self.assertIn(f'LOOK = "{K.LOOK}"', src)

    def test_frame_keys_follow_every_part(self):
        k = K.frame_key("ab" * 32, "clay", 32, 304)
        for other in (K.frame_key("cd" * 32, "clay", 32, 304), K.frame_key("ab" * 32, "wire", 32, 304), K.frame_key("ab" * 32, "clay", 90, 304), K.frame_key("ab" * 32, "clay", 32, 96)):
            self.assertNotEqual(k, other)
        self.assertEqual(k, K.frame_key("ab" * 32, "clay", 32, 304))


if __name__ == "__main__":
    unittest.main()
