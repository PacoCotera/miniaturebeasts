-- The hut options assembled in Aseprite, headless: each hut (A to D, and the hand-pixelled Ch and Dh) as one 64 x 64 sprite of
-- three frames (lit, dark, dark2), every piece set at the bottom centre of its frame, tagged lit/dark/dark2, saved as hut-X.aseprite, and each
-- frame exported back to a PNG (trimmed to its pixels afterwards). Parameters: indir, outdir, huts (comma list).
--   aseprite -b --script-param indir=in --script-param outdir=out --script-param huts=A,B,C,D,Ch,Dh --script aseprite-huts.lua
local p = app.params
local CW = tonumber(p.cw or "64"); local CH = tonumber(p.ch or "64")   -- the canvas (round 11: 160 x 160 for the hut at the explorer's scale)
local states = { "lit", "dark", "dark2" }
for hut in string.gmatch(p.huts, "[^,]+") do
  local spr = Sprite(CW, CH, ColorMode.RGB); spr.filename = "hut-" .. hut
  for si, s in ipairs(states) do
    if si > 1 then spr:newEmptyFrame() end
    local src = Sprite{ fromFile = p.indir .. "/hut-" .. hut .. "-" .. s .. ".png" }
    local im = Image(src.cels[1].image); local w, h = src.width, src.height; src:close()
    local img = Image(CW, CH, ColorMode.RGB); img:drawImage(im, Point((CW - w) // 2, CH - h))
    if si == 1 then spr.cels[1].image = img else spr:newCel(spr.layers[1], si, img, Point(0, 0)) end
    local t = spr:newTag(si, si); t.name = s
  end
  spr:saveAs(p.outdir .. "/hut-" .. hut .. ".aseprite")
  for si, s in ipairs(states) do
    local out = Sprite(CW, CH, ColorMode.RGB); out.cels[1].image = Image(spr.cels[si].image)
    out:saveAs(p.outdir .. "/hut-" .. hut .. "-" .. s .. ".png"); out:close()
  end
  spr:close(); print("hut", hut)
end
