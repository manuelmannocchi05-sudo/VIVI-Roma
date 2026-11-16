"""VIVI Roma — fotografie locali da Wikimedia Commons.

Legge tools/photos/selection.json, per ogni file:
  1. legge da Commons autore, licenza e restrizioni (API ufficiale);
  2. scarta i file senza una licenza che consenta l'uso commerciale (CC0, pubblico dominio, CC BY, CC BY-SA);
  3. scarica una miniatura ufficiale (al massimo 1920 px) e genera WebP ottimizzati in più larghezze;
  4. scrive js/data/photos.js (percorsi, dimensioni, colore medio per il segnaposto, attribuzione)
     e tools/photos/report.json (esito di ogni file).

Uso: python3 tools/photos/build.py   (richiede Pillow; rete verso commons.wikimedia.org e upload.wikimedia.org)
"""
import io, json, os, re, sys, time, html, urllib.parse, urllib.request, urllib.error
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SEL = os.path.join(ROOT, "tools", "photos", "selection.json")
UA = "VIVIRomaPhotoBuild/1.0 (https://github.com/manuelmannocchi05-sudo/VIVI-Roma) python-urllib/3"
OK_LICENSE = re.compile(r"^(CC0|Public domain|PD\b|PD-|CC BY(-SA)? \d(\.\d)?( \w+)?$)", re.I)

# Formati per tipo: larghezze generate, rapporto massimo (larghezza/altezza) e minimo, qualità WebP.
KINDS = {
    "place": {"widths": [480, 800, 1280], "ratio": (16/9, 4/5), "q": 62},
    "cat":   {"widths": [420, 840],       "ratio": (3/4, 3/4),  "q": 68},
    "hero":  {"widths": [960, 1600, 2400], "ratio": (16/9, 3/2), "q": 62},
    "hero-portrait": {"widths": [720, 1080], "ratio": (9/16, 9/16), "q": 62},
}

def get(url, tries=8):
    wait = 10
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504):
                print(f"  {e.code}, riprovo tra {wait}s", flush=True); time.sleep(wait); wait = min(wait * 2, 300); continue
            raise
    raise RuntimeError("download non riuscito: " + url)

def text(v):
    s = re.sub(r"<[^>]+>", " ", v or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()

def metadata(files):
    out = {}
    for i in range(0, len(files), 40):
        batch = files[i:i+40]
        q = {"action": "query", "format": "json", "formatversion": "2", "prop": "imageinfo",
             "titles": "|".join("File:" + f for f in batch), "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "1920",
             "iiextmetadatafilter": "Artist|LicenseShortName|LicenseUrl|AttributionRequired|Restrictions|Copyrighted|UsageTerms|Credit|ImageDescription|ObjectName"}
        j = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q)))
        norm = {n["to"]: n["from"] for n in j["query"].get("normalized", [])}
        for p in j["query"]["pages"]:
            name = p["title"][5:]
            key = norm.get(p["title"], p["title"])[5:]
            out[key] = p if "imageinfo" in p else None
            out.setdefault(name, out[key])
        time.sleep(2)
    return out

def crop_ratio(im, rmax, rmin, focus):
    w, h = im.size; r = w / h
    fx, fy = focus
    if r > rmax:                      # troppo larga: ritaglio orizzontale attorno al punto di interesse
        nw = int(h * rmax); x = min(max(int(fx * w - nw / 2), 0), w - nw)
        im = im.crop((x, 0, x + nw, h))
    elif r < rmin:                    # troppo alta: ritaglio verticale
        nh = int(w / rmin); y = min(max(int(fy * h - nh / 2), 0), h - nh)
        im = im.crop((0, y, w, y + nh))
    return im

def main():
    sel = json.load(open(SEL, encoding="utf-8"))
    entries = sel["photos"]
    meta = metadata(sorted({e["file"] for e in entries}))
    out, report = {}, []
    keep = set()
    for e in entries:
        key, kind, f = e["key"], e["kind"], e["file"]
        rec = {"key": key, "kind": kind, "file": f}
        p = meta.get(f)
        if not p:
            rec["status"] = "file non trovato su Commons"; report.append(rec); print("MANCA", key, f); continue
        ii = p["imageinfo"][0]; m = ii.get("extmetadata", {})
        lic = text(m.get("LicenseShortName", {}).get("value"))
        rec.update({"license": lic, "author": text(m.get("Artist", {}).get("value")) or text(m.get("Credit", {}).get("value")),
                    "licenseUrl": m.get("LicenseUrl", {}).get("value", ""), "restrictions": text(m.get("Restrictions", {}).get("value")),
                    "attributionRequired": m.get("AttributionRequired", {}).get("value", ""), "page": ii.get("descriptionurl"),
                    "orig": [ii["width"], ii["height"]], "description": text(m.get("ImageDescription", {}).get("value"))[:300]})
        if not OK_LICENSE.match(lic or ""):
            rec["status"] = "licenza non ammessa"; report.append(rec); print("LICENZA", key, lic); continue
        big = 3840 if kind in ("cat", "hero", "hero-portrait") else 1920    # copertina e categorie vengono ritagliate: serve più risoluzione
        src = ii["url"] if ii["width"] <= big else ii.get("thumburl", "").replace("/1920px-", f"/{big}px-")
        try:
            im = Image.open(io.BytesIO(get(src))); im = ImageOps.exif_transpose(im).convert("RGB")
        except Exception as ex:
            rec["status"] = "download non riuscito: " + str(ex)[:120]; report.append(rec); print("ERRORE", key, ex, flush=True); continue
        time.sleep(1.5)
        spec = KINDS[kind]
        im = crop_ratio(im, spec["ratio"][0], spec["ratio"][1], e.get("focus", [0.5, 0.5]))
        folder = {"place": "places", "cat": "categories"}.get(kind, "hero")
        os.makedirs(os.path.join(ROOT, "img", folder), exist_ok=True)
        widths = [w for w in spec["widths"] if w <= im.width] or [im.width]
        files = []
        for w in widths:
            h = round(im.height * w / im.width)
            name = f"img/{folder}/{key}-{w}.webp"
            q = spec["q"] + (6 if w <= 480 else 0) - (8 if w >= 1280 else 0)   # più compressione sui file grandi
            im.resize((w, h), Image.LANCZOS).save(os.path.join(ROOT, name), "WEBP", quality=q, method=6)
            files.append(name); keep.add(name)
        avg = im.resize((1, 1), Image.BOX).getpixel((0, 0))
        out[key] = {"kind": kind, "w": widths, "ratio": round(im.width / im.height, 4), "color": "#%02x%02x%02x" % avg,
                    "base": f"img/{folder}/{key}", "author": rec["author"] or "Autore non indicato", "license": lic,
                    "licenseUrl": rec["licenseUrl"], "source": rec["page"], "file": f}
        rec.update({"status": "ok", "output": files, "bytes": sum(os.path.getsize(os.path.join(ROOT, x)) for x in files)})
        report.append(rec); print("ok", key, lic, rec["bytes"], flush=True)
    # rimuove i file generati che non sono più selezionati
    for folder in ("places", "categories", "hero"):
        d = os.path.join(ROOT, "img", folder)
        if os.path.isdir(d):
            for n in os.listdir(d):
                if f"img/{folder}/{n}" not in keep: os.remove(os.path.join(d, n))
    js = ("/* Generato da tools/photos/build.py: non modificare a mano.\n"
          "   Fotografie da Wikimedia Commons, con licenza verificata per l'uso commerciale (CC0, pubblico dominio, CC BY, CC BY-SA).\n"
          "   base + \"-\" + larghezza + \".webp\" = file; author/license/source = attribuzione obbligatoria. */\n"
          "export const PHOTOS=" + json.dumps(out, ensure_ascii=False, indent=0, sort_keys=True) + ";\n")
    open(os.path.join(ROOT, "js", "data", "photos.js"), "w", encoding="utf-8").write(js)
    json.dump(report, open(os.path.join(ROOT, "tools", "photos", "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    bad = [r for r in report if r.get("status") != "ok"]
    print(f"\n{len(report)-len(bad)} foto generate, {len(bad)} scartate o mancanti")

def review():
    """Fogli di confronto per scegliere le foto: tools/photos/review/<gruppo>.jpg (solo per la revisione, non usati dal sito)."""
    sel = json.load(open(SEL, encoding="utf-8"))
    groups = sel.get("review") or {}
    d = os.path.join(ROOT, "tools", "photos", "review")
    if os.path.isdir(d):
        for n in os.listdir(d): os.remove(os.path.join(d, n))
    if not groups: return
    from PIL import ImageDraw
    os.makedirs(d, exist_ok=True)
    for g, fs in list(groups.items()):
        if isinstance(fs, str):          # ricerca su Commons: i primi 12 risultati fotografici
            q = {"action": "query", "format": "json", "formatversion": "2", "list": "search", "srsearch": fs + " filetype:bitmap",
                 "srnamespace": "6", "srlimit": "12"}
            groups[g] = [r["title"][5:] for r in json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q)))["query"]["search"]]
            time.sleep(1)
    meta = metadata(sorted({f for fs in groups.values() for f in fs}))
    lines = []
    for g, files in groups.items():
        if not files:
            lines.append(f"{g}\t-\tnessun risultato\t"); continue
        W, H = 320, 240
        sheet = Image.new("RGB", (W * 4, (H + 30) * ((len(files) + 3) // 4)), "white"); dr = ImageDraw.Draw(sheet)
        for i, f in enumerate(files):
            x, y = (i % 4) * W, (i // 4) * (H + 30)
            p = meta.get(f); lic = ""
            if p:
                ii = p["imageinfo"][0]; lic = text(ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value"))
                try:
                    q = {"action": "query", "format": "json", "formatversion": "2", "prop": "imageinfo", "titles": "File:" + f, "iiprop": "url", "iiurlwidth": "330"}
                    u = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q)))["query"]["pages"][0]["imageinfo"][0]["thumburl"]
                    im = ImageOps.exif_transpose(Image.open(io.BytesIO(get(u)))).convert("RGB"); im.thumbnail((W - 6, H - 6))
                    sheet.paste(im, (x + (W - im.width) // 2, y + (H - im.height) // 2))
                except Exception as e: dr.text((x + 8, y + 100), "errore: " + str(e)[:40], fill="red")
                time.sleep(1)
            dr.text((x + 4, y + H + 2), f"{i+1}. {f[:46]}", fill="black"); dr.text((x + 4, y + H + 15), f"{lic} {ii['width']}x{ii['height']}" if p else "NON TROVATO", fill="black")
            desc = text(p["imageinfo"][0].get("extmetadata", {}).get("ImageDescription", {}).get("value"))[:160] if p else ""
            lines.append(f"{g}\t{i+1}\t{f}\t{lic}\t{desc}")
        sheet.save(os.path.join(d, g + ".jpg"), quality=72)
    open(os.path.join(d, "index.tsv"), "w", encoding="utf-8").write("\n".join(lines) + "\n")

if __name__ == "__main__":
    import traceback
    for step in (main, review):
        try: step()
        except Exception: traceback.print_exc()
