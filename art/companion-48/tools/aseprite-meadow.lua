-- The seamless meadow pass, run headless in Aseprite on the VM:
--   aseprite -b --script-param master=in/grass1.png --script-param tiles=grass2,grass3,... --script-param band=6
--            --script-param indir=in --script-param outdir=out --script aseprite-meadow.lua
-- Every meadow tile takes the same outer band: the master's interior, offset by half a tile so that what meets
-- across a seam is continuous paint, not two edges. At the edge the pixel is that band's; over `band` pixels it
-- blends back to the tile's own, snapped to the colours the tile and the master already use. With one shared,
-- continuous band on every tile, any meadow tile joins any other with no seam. Each tile is laid 3x3 for the check.
local p = app.params
local band = tonumber(p.band or "6")
local function load(path) local s = Sprite{ fromFile = path }; local im = Image(s.cels[1].image); s:close(); return im end
local function colours(im) local set = {}; for it in im:pixels() do local v = it(); if app.pixelColor.rgbaA(v) > 0 then set[v] = true end end; return set end
local function rgba(v) local c = app.pixelColor; return c.rgbaR(v), c.rgbaG(v), c.rgbaB(v) end
local function nearest(r, g, b, set)
  local best, bd = nil, 1e12
  for v, _ in pairs(set) do local vr, vg, vb = rgba(v); local d = (r - vr) ^ 2 * 3 + (g - vg) ^ 2 * 4 + (b - vb) ^ 2 * 2; if d < bd then bd = d; best = v end end
  return best
end
local master0 = load(p.indir .. "/" .. p.master .. ".png")
local w, h = master0.width, master0.height
local mset = colours(master0)
local master = Image(w, h, master0.colorMode)   -- the master offset by half a tile: its seam moves to the centre
for y = 0, h - 1 do for x = 0, w - 1 do master:drawPixel(x, y, master0:getPixel((x + w // 2) % w, (y + h // 2) % h)) end end
local function pass(name)
  local src = load(p.indir .. "/" .. name .. ".png")
  local set = colours(src); for v, _ in pairs(mset) do set[v] = true end
  local out = Image(w, h, src.colorMode)
  for y = 0, h - 1 do for x = 0, w - 1 do
    local d = math.min(x, y, w - 1 - x, h - 1 - y)
    local t = d >= band and 0 or (1 - d / band)        -- 1 at the edge, 0 inside the band
    local sv, mv = src:getPixel(x, y), master:getPixel(x, y)
    local sr, sg, sb = rgba(sv); local mr, mg, mb = rgba(mv)
    local v = t == 0 and sv or nearest(sr + (mr - sr) * t, sg + (mg - sg) * t, sb + (mb - sb) * t, set)
    out:drawPixel(x, y, v)
  end end
  local spr = Sprite(w, h, src.colorMode); spr.cels[1].image = out; spr:saveAs(p.outdir .. "/" .. name .. ".png"); spr:close()
  local t3 = Sprite(w * 3, h * 3, src.colorMode); local img = Image(w * 3, h * 3, src.colorMode)
  for r = 0, 2 do for c = 0, 2 do img:drawImage(out, Point(c * w, r * h)) end end
  t3.cels[1].image = img; t3:saveAs(p.outdir .. "/" .. name .. "-3x3.png"); t3:close()
  print("meadow pass", name)
end
for name in string.gmatch(p.tiles, "[^,]+") do pass(name) end
