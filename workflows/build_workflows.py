import json, os

KERNEL = ("Moldovan Orthodox monastery architecture, Saharna, Rezina, Republic of Moldova. "
 "Traditional Moldovan church building: whitewashed lime plaster walls, dark grey wood shingle roofs, "
 "pale local limestone, hand-forged iron. Warm desaturated sand palette. Overcast dawn light, low contrast, "
 "no direct sun. Documentary architectural photography, large format, level horizon. Matte chalky weathered surfaces. Sober, traditional, restrained.")

NEG = ("saturated colors, HDR, golden hour glare, blue sky, lens flare, bokeh, tilted horizon, fisheye, "
 "people, tourists, cars, modern signage, text, watermark, logo, oversharpened, plastic, CGI render, neon, "
 "onion domes of Russian style, gilded roofs, baroque excess")

ORTHO = ("Strict orthographic front elevation, dead-on, no perspective convergence. Object isolated on a flat empty "
 "#f4efe4 ground, no horizon, no environment, no cast shadow. Whole object in frame with even margin. Flat ambient light.")

def node(nid, cls, pos, widgets, inputs=None, outputs=None):
    return {"id": nid, "type": cls, "pos": pos, "size": [400, 380], "flags": {}, "order": nid,
            "mode": 0, "inputs": inputs or [], "outputs": outputs or [],
            "properties": {"Node name for S&R": cls}, "widgets_values": widgets}

def qwen(nid, prompt, w, h, seed):
    return node(nid, "QwenImageTextToImageApi", [40, 40 + (nid//2)*460],
        ["qwen-image-3.0-pro", prompt, NEG, w, h, 1, seed, "fixed", False, False],
        inputs=[{"name":n,"type":t,"link":None,"widget":{"name":n}} for n,t in
                [("model.prompt","STRING"),("model.negative_prompt","STRING"),("model.width","INT"),
                 ("model.height","INT"),("n","INT"),("seed","INT")]],
        outputs=[{"name":"IMAGE","type":"IMAGE","links":[nid],"slot_index":0}])

def save(nid, prefix, src):
    return node(nid, "SaveImage", [500, 40 + (src//2)*460], [prefix],
        inputs=[{"name":"images","type":"IMAGE","link":src}], outputs=[])

def build(name, items, title):
    nodes, links, nid = [], [], 1
    for it in items:
        q = qwen(nid, it["prompt"], it["w"], it["h"], it["seed"])
        s = save(nid+1, "saharna/" + it["id"], nid)
        links.append([nid, nid, 0, nid+1, 0, "IMAGE"])
        nodes += [q, s]; nid += 2
    wf = {"id": name, "revision": 0, "last_node_id": nid, "last_link_id": nid,
          "nodes": nodes, "links": links, "groups": [], "config": {},
          "extra": {"ds": {"scale": 0.5, "offset": [0, 0]}, "title": title}, "version": 0.4}
    path = f"workflows/{name}.json"
    os.makedirs("workflows", exist_ok=True)
    json.dump(wf, open(path, "w"), indent=1, ensure_ascii=False)
    return path, len(items)

S = 1776  # founding year as the base seed

p1 = [
 ("ortho_portal", "The stone entrance gate arch of the monastery. Round arch on two squat limestone piers, low shingled pitched roof over the arch, a small iron cross at the apex. Weathered pale limestone with visible lime mortar joints."),
 ("ortho_church_treime", "Moldovan Orthodox church of the Holy Trinity. Single nave, three apses, one slender central drum with a modest cupola, tall narrow arched windows, whitewashed lime plaster walls, dark grey wood shingle roof, simple iron cross."),
 ("ortho_belltower", "Free-standing Moldovan monastery bell tower. Square whitewashed stone base, open arcaded belfry stage with four arches, steep pyramidal shingle roof, iron cross finial, a bronze bell visible in the arcade."),
 ("ortho_cave_mouth", "Rock-cut cave chapel entrance in a limestone cliff face. Rough hewn opening, a small cross carved in the rock above it, stratified sedimentary stone, no vegetation."),
 ("ortho_candlestand", "Orthodox church candle stand, sfesnic. Brass tray on a turned column and tripod foot, a bed of fine sand, thin beeswax candles standing in it, several lit. Tarnished brass, wax runs down the column."),
 ("ortho_cross_stone", "Moldovan stone wayside cross, troita. Carved limestone, eight-pointed Orthodox cross form, shallow relief carving on the shaft, lichen in the carved grooves."),
 ("ortho_well", "Moldovan monastery stone well with a shingled roof canopy on four turned wooden posts, iron crank and chain, wooden bucket. Weathered oak, pale stone kerb."),
 ("ortho_threshold", "A single worn limestone doorstep block, isolated. A deep concave hollow worn in the centre by centuries of feet. Chipped edges, pale stone."),
]
items1 = [{"id": i, "prompt": f"{KERNEL} {p} {ORTHO}", "w": 1536, "h": 1536, "seed": S+k}
          for k, (i, p) in enumerate(p1)]

p2 = [
 ("hero_portal_dawn", 2464, 1056, "The monastery gate seen straight on from outside, the courtyard and the church visible through the open arch. Mist in the valley beyond. Dawn before sunrise. The arch frames the view like a doorway cut into the picture."),
 ("gal_church", 1856, 1392, "The Holy Trinity church, three-quarter view from the courtyard, wet flagstones, low cloud, a plain wooden bench against the wall."),
 ("gal_cascades", 1392, 1856, "The Saharna waterfalls in the wooded limestone gorge, water over stone shelves, bare early-spring branches, overcast."),
 ("gal_cells", 1392, 1856, "A row of monastic cells, whitewashed wall, small deep-set windows, a covered walkway on turned wooden posts, a plain bench."),
 ("gal_nistru", 1856, 1392, "Wide view over the Nistru river valley from the cliff above the monastery, layered ridges fading into haze, ploughed fields, no buildings."),
 ("tex_limestone", 1536, 1536, "Flat-on macro of a weathered pale limestone masonry wall with lime mortar joints. Fills the whole frame, evenly lit, no perspective, tileable."),
 ("tex_plaster", 1536, 1536, "Flat-on macro of old whitewashed lime plaster, hairline cracks, chalky bloom, faint ochre stain. Fills the whole frame, evenly lit, tileable."),
 ("tex_oak", 1536, 1536, "Flat-on macro of a weathered oak plank, deep grain, one old iron nail head, silvered surface. Fills the whole frame, evenly lit, tileable."),
 ("tex_beeswax", 1536, 1536, "Flat-on macro of a bed of fine sand with beeswax drips and candle stubs pressed into it. Fills the whole frame, evenly lit."),
 ("tex_gesso_gold", 1536, 1536, "Flat-on macro of an old gilded icon panel where the gold leaf has worn through to the red-brown clay ground beneath. Craquelure, burnished and matte patches. Fills the whole frame."),
]
items2 = [{"id": i, "prompt": f"{KERNEL} {p}", "w": w, "h": h, "seed": S+100+k}
          for k, (i, w, h, p) in enumerate(p2)]

SPEC = ("Black ink on aged cream paper, flat scan, dead-on, no perspective, no shadow, no ornament around the "
        "letters. The letterforms fill the frame. Crisp edges.")
p5 = [
 ("spec_uncial_caps", "A type specimen sheet. Large Romanian archaic uncial capitals, hand-cut with a broad nib, showing A B C D E F G I L M N O P R S T U V Z and the diacritics A-breve, A-circumflex, I-circumflex, S-comma, T-comma. Heavy vertical stress, sharp wedge serifs."),
 ("spec_uncial_lower", "A type specimen sheet. Lowercase companion to a Romanian archaic uncial, broad nib, showing a b c d e f g i l m n o p r s t u v z and a-breve, a-circumflex, i-circumflex, s-comma, t-comma. Short ascenders, heavy vertical stress."),
 ("spec_word_saharna", "The single word SAHARNA set very large in archaic Romanian uncial capitals, broad-nib carved letterforms, filling the frame."),
 ("spec_phrase_porti", "The Romanian phrase ISI DESCHIDE PORTILE set in two lines of archaic Romanian uncial capitals, filling the frame."),
 ("spec_manastirea", "The Romanian words MANASTIREA SAHARNA set in two lines of archaic uncial capitals with correct Romanian diacritics, A-breve in MANASTIREA. Broad-nib carved letterforms."),
 ("spec_carved_stone", "Romanian uncial capital letters chiselled into a limestone slab, V-cut incision, raking light showing the depth of the cut. The word SAHARNA."),
]
items5 = [{"id": i, "prompt": f"{p} {SPEC}", "w": 1856, "h": 1392, "seed": S+200+k}
          for k, (i, p) in enumerate(p5)]

for n, it, t in [("P1_ortho_plates", items1, "P1 — orthographic plates (feed the 3D)"),
                 ("P2_site_plates", items2, "P2 — hero, gallery, textures"),
                 ("P5_type_specimens", items5, "P5 — archaic type specimens (reference only)")]:
    p, c = build(n, it, t)
    print(f"{p}  {c} nodes-pairs")

# ---- P0: graphic marks. Only what generation genuinely beats construction at. ----
GRAPHIC = ("Pure black shape on pure white background. Absolutely flat solid black, no grey, no gradient, "
 "no shading, no texture, no outline stroke, no drop shadow. Crisp hard edges. The subject is a single "
 "connected silhouette, centred, complete in frame with even margin. High contrast, two tones only.")

NEG_G = ("grey, gradient, shading, soft edges, anti-aliased blur, texture, noise, photograph, photorealistic, "
 "3d render, perspective, drop shadow, glow, color, colored, outline stroke, frame, border, multiple objects, "
 "text, watermark, signature, onion domes, russian orthodox style, gilded roof, baroque")

p0 = [
 ("mark_skyline_complex", 2464, 1056, "Silhouette of the whole Saharna monastery complex on the limestone cliff above the Nistru valley: the church with its slender drum, the bell tower, the lower cell ranges, the cliff edge. Moldovan Orthodox architecture, shingle roofs, no onion domes."),
 ("mark_church", 1536, 1536, "Silhouette of a single Moldovan Orthodox church: three apses, one slender central drum with a modest cupola and cross, steep shingle roof, arched windows cut out of the silhouette."),
 ("mark_belltower", 1056, 2464, "Silhouette of a Moldovan monastery bell tower: square base, open arcaded belfry with four arches cut through, steep pyramidal roof, cross finial."),
 ("mark_chapel_cave", 1536, 1536, "Silhouette of a rock-cut cave chapel in a cliff: the hewn arched opening and the mass of stratified rock around it, a small cross above the opening."),
 ("mark_gate", 1856, 1392, "Silhouette of the monastery entrance gate: round arch on two piers, low pitched shingled roof over it, cross at the apex, the opening cut clean through."),
]
items0 = [{"id": i, "prompt": f"{p} {GRAPHIC}", "w": w, "h": h, "seed": S+300+k, "neg": NEG_G}
          for k, (i, w, h, p) in enumerate(p0)]

def qwen_neg(nid, prompt, w, h, seed, neg):
    n = qwen(nid, prompt, w, h, seed); n["widgets_values"][2] = neg; return n

def build_neg(name, items, title):
    nodes, links, nid = [], [], 1
    for it in items:
        q = qwen_neg(nid, it["prompt"], it["w"], it["h"], it["seed"], it["neg"])
        s = save(nid+1, "saharna/" + it["id"], nid)
        links.append([nid, nid, 0, nid+1, 0, "IMAGE"])
        nodes += [q, s]; nid += 2
    wf = {"id": name, "revision": 0, "last_node_id": nid, "last_link_id": nid,
          "nodes": nodes, "links": links, "groups": [], "config": {},
          "extra": {"ds": {"scale": 0.5, "offset": [0, 0]}, "title": title}, "version": 0.4}
    json.dump(wf, open(f"workflows/{name}.json", "w"), indent=1, ensure_ascii=False)
    return name, len(items)

print(build_neg("P0_graphic_marks", items0, "P0 - black-on-white marks for tracing"))
