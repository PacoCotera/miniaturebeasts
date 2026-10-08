-- The pawn assembled in Aseprite, headless on the VM: the 28 frames (4 facings x walk 3, creep 3, react) as the frames of one
-- 48 x 48 sprite, tagged by facing and state, saved as pawn.aseprite, each frame exported back to a PNG (the exact palette
-- colours round-trip). Parameters: indir, outdir.
--   aseprite -b --script-param indir=in --script-param outdir=out --script aseprite-pawn.lua
local p = app.params
local facings = { "down", "up", "left", "right" }
local states = { "walk1", "walk2", "walk3", "creep1", "creep2", "creep3", "react" }
local spr = Sprite(48, 48, ColorMode.RGB)
spr.filename = "pawn"
local n = 0
for fi, f in ipairs(facings) do
  for si, s in ipairs(states) do
    n = n + 1
    if n > 1 then spr:newEmptyFrame() end
    local src = Sprite{ fromFile = p.indir .. "/pawn-" .. f .. "-" .. s .. ".png" }
    local im = Image(src.cels[1].image); src:close()
    if n == 1 then spr.cels[1].image = im else spr:newCel(spr.layers[1], n, im, Point(0, 0)) end
  end
  local t = spr:newTag((fi - 1) * 7 + 1, (fi - 1) * 7 + 3); t.name = f .. "-walk"
  t = spr:newTag((fi - 1) * 7 + 4, (fi - 1) * 7 + 6); t.name = f .. "-creep"
  t = spr:newTag((fi - 1) * 7 + 7, (fi - 1) * 7 + 7); t.name = f .. "-react"
end
spr:saveAs(p.outdir .. "/pawn.aseprite")
n = 0
for fi, f in ipairs(facings) do for si, s in ipairs(states) do
  n = n + 1
  local out = Sprite(48, 48, ColorMode.RGB); out.cels[1].image = Image(spr.cels[n].image)
  out:saveAs(p.outdir .. "/pawn-" .. f .. "-" .. s .. ".png"); out:close()
end end
print("pawn frames", n)
