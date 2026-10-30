# Physics facts shown on screen

Same format as FACTS.md: one row per on-screen number or claim, with its source. Source booklet:
`IB Physics Formula Booklet SL & HL.pdf` (Downloads), the physics counterpart of the chemistry data booklet.

| Page | Claim | Checked against |
|---|---|---|
| Data booklet panel (Physics) | §1 fundamental constants (g 9.8 m s⁻², G 6.67 × 10⁻¹¹, N_A, R, k_B, σ, k, ε₀, μ₀, c, h, e, m_e, m_p, m_n, u, S, R₀), §2 unit conversions, §3 metric prefixes | Page 1 of the booklet PDF; copied by `tools/extract_physics_booklet.py` (re-runnable). Superscripts and subscripts are restored by the script, so compare the rendered panel with the PDF once if a value looks odd |
| Data booklet panel (Physics) | §4–§10 (geometry, uncertainty, Themes A–E) are listed but "not reproduced here" | Each batch adds the equations its pages cite, by hand, in `js/data-booklet-physics-extra.js` |
