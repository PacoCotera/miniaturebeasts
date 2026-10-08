-- The hut options assembled in Aseprite, headless on the VM: each hut (A to D, and the hand-pixelled Ch and Dh) as one 64 x 64 sprite of
-- three frames (lit, dark, dark2), every piece set at the bottom centre of its frame, tagged lit/dark/dark2, saved as hut-X.aseprite, and each
-- frame exported back to a PNG (trimmed to its pixels afterwards). Parameters: indir, outdir, huts (comma list).
--   aseprite -b --script-param indir=in --script-param outdir=out --script-param huts=A,B,C,D,Ch,Dh --script aseprite-huts.lua
local p = app.params
local states = { "lit", "dark", "dark2" }
for hut in string.gmatch(p.huts, "[^,]+") do
  local spr = Sprite(64, 64, ColorMode.RGB); spr.filename = "hut-" .. hut
  for si, s in ipairs(states) do
    if si > 1 then spr:newEmptyFrame() end
    local src = Sprite{ fromFile = p.indir .. "/hut-" .. hut .. "-" .. s .. ".png" }
    local im = Image(src.cels[1].image); local w, h = src.width, src.height; src:close()
    local img = Image(64, 64, ColorMode.RGB); img:drawImage(im, Point((64 - w) // 2, 64 - h))
    if si == 1 then spr.cels[1].image = img else spr:newCel(spr.layers[1], si, img, Point(0, 0)) end
    local t = spr:newTag(si, si); t.name = s
  end
  spr:saveAs(p.outdir .. "/hut-" .. hut .. ".aseprite")
  for si, s in ipairs(states) do
    local out = Sprite(64, 64, ColorMode.RGB); out.cels[1].image = Image(spr.cels[si].image)
    out:saveAs(p.outdir .. "/hut-" .. hut .. "-" .. s .. ".png"); out:close()
  end
  spr:close(); print("hut", hut)
end
