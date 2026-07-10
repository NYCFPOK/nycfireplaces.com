# Flame-rect calibration

The motion layer overlays living fire on real photos. Each flame overlay is
positioned with `data-flame-rect="x%,y%,w%,h%"` (percent of the image box).
I estimated these by examining each image file directly. They render well, but
fine-tuning by eye against the live animation will make them perfect.

To adjust: edit the `data-flame-rect` on the image, or its entry in
`src/pages/index.astro`. Values are percentages of the image's own box.

| Page / selector | Image | fx | Current rect (x,y,w,h) | Confidence | Notes |
|---|---|---|---|---|---|
| Home · decision path "Fireplaces" | `Kozy-Heat-fireplace-1.jpg` | flames embers | `22,40,56,42` | High | Firebox fills most of frame; verified visually |
| Home · "Add a fireplace" | `nyc-fireplaces-custom-install.jpg` | flames embers | `3,62,52,7` | Med | Linear fireplace low-left; thin band, tune height |
| Home · projects "Fire feature" | `American-Fyre-Design-Fire-Table.jpg` | flames embers | `30,40,40,18` | Med | Fire-table ring; center flames |
| Home · projects "Custom fireplace install" | `nyc-fireplaces-custom-install.jpg` | flames | `3,62,52,7` | Med | Same as above (4:5 crop shifts it; recheck) |
| (future) Pizza oven pages | `Gozney-Pizza-Oven-1.jpg` | flames (arch, low) | `33,52,34,18` | Low | Oven unlit in stock photo; glow-only recommended |

## Images intentionally NOT given flames
- `stoll-custom-bbq-island.jpg` — no visible flame → `kenburns`
- `Twin-Eagles-Grill.jpg` — closed-lid product shot → `reveal`

Adding flames to non-fire photos looks fake, so these use motion (Ken Burns /
reveal) without a fire overlay.
