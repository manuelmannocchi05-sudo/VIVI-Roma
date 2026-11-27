"""Ritaglio fotografico del riquadro «La tua Roma, su misura» (img/home/su-misura-*.webp/avif).

Fonte: «ColosseumAtEvening.jpg», Andreas Tille, CC BY-SA 4.0 (licenza verificata su Wikimedia Commons).
https://commons.wikimedia.org/wiki/File:ColosseumAtEvening.jpg

Modifiche (dichiarate anche in crediti.html, come richiede CC BY-SA):
  1. scontorno con rembg (modello u2net), bordi induriti;
  2. il cielo visibile dentro gli archi diventa trasparente;
  3. bordo inferiore sfumato nel fondo rosa;
  4. composizione con percorso tratteggiato e segnaposto (in Chrome, tools/photos/su-misura.html).
L'immagine risultante è distribuita con la stessa licenza CC BY-SA 4.0.

Uso: python3 tools/photos/su-misura.py <1920px-ColosseumAtEvening.jpg> <cutout.png>
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session

src, dst = sys.argv[1], sys.argv[2]
im = np.array(remove(Image.open(src).convert("RGB"), session=new_session("u2net"))).astype(float)
r, b = im[..., 0], im[..., 2]
a = np.clip((im[..., 3] / 255 - 0.35) / 0.45, 0, 1)
blue = np.clip(((b - r) + 10) / 30, 0, 1)
blue = np.array(Image.fromarray((blue * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))) / 255
a = a * (1 - blue)
ys = np.arange(a.shape[0])[:, None]
a = a * np.clip((900 - ys) / (900 - 760), 0, 1) ** 1.3
im[..., 3] = a * 255
out = Image.fromarray(im.astype(np.uint8))
out.crop(out.getbbox()).save(dst)
