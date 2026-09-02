"""
Generate photo backgrounds for this carousel with fal.ai, then point spec.json
at them. Needs FAL_KEY in the environment. Uses the synchronous fal.run
endpoint; swap MODEL for whichever image model your fal account prefers.

    export FAL_KEY=...
    python3 fal_generate.py
    python3 make_carousel.py spec.json slides
"""
import json
import os
import sys
import time

import requests

MODEL = os.environ.get("FAL_MODEL", "fal-ai/flux-pro/v1.1")
KEY = os.environ.get("FAL_KEY")
if not KEY:
    sys.exit("Set FAL_KEY first.")

STYLE = ("Cinematic editorial photograph, moody low-key lighting, deep blacks and "
         "cool greys with a single warm practical light, 35mm, shallow depth of "
         "field, subtle film grain, no text, no logos, no watermark. Subject is a "
         "fit man in his late 40s, short greying beard, dark henley or jacket. ")

PROMPTS = {
    "cover": "Man sitting alone at a two-top table in a dim coffee shop, empty chair across from him, one hand on a cooling cup, looking out the window at night rain, reflective and composed.",
    "01": "Man standing in the doorway of a sparse apartment at night, keys still in hand, single lamp on, the quiet of an empty room.",
    "02": "Man at a kitchen counter holding an old flip phone in one hand and a modern smartphone face-down in the other, half-smile, morning light through blinds.",
    "03": "Man waiting on the front steps of a brick apartment building at dusk, door slightly ajar behind him, checking a watch.",
    "04": "Man alone behind the wheel of a parked truck at night, dashboard glow, looking straight ahead, thinking.",
    "05": "Close on a man's hands resting on a wooden bar next to a glass of bourbon and a wristwatch laid face-up, warm bar light.",
    "06": "Man racking a loaded barbell in a garage gym at night, phone lit up and ignored on the bench behind him.",
    "07": "Man on a rooftop or porch at golden hour, arms resting on the rail, looking out over the city, unbothered.",
    "cta": "Wide shot of the same man walking down a city street at night in a dark jacket, back to camera, streetlights, purposeful stride.",
}

os.makedirs("images", exist_ok=True)
headers = {"Authorization": f"Key {KEY}", "Content-Type": "application/json"}
paths = {}
for key, prompt in PROMPTS.items():
    out = os.path.join("images", f"{key}.jpg")
    if os.path.exists(out):
        paths[key] = out
        print("exists:", out)
        continue
    body = {"prompt": STYLE + prompt, "image_size": "portrait_4_3",
            "num_images": 1, "output_format": "jpeg", "safety_tolerance": "2"}
    r = requests.post(f"https://fal.run/{MODEL}", headers=headers, json=body, timeout=180)
    r.raise_for_status()
    url = r.json()["images"][0]["url"]
    img = requests.get(url, timeout=120)
    img.raise_for_status()
    with open(out, "wb") as f:
        f.write(img.content)
    paths[key] = out
    print("saved:", out)
    time.sleep(1)

spec = json.load(open("spec.json"))
spec["cover_image"] = paths["cover"]
for i, item in enumerate(spec["items"], start=1):
    item["image"] = paths[f"{i:02d}"]
spec["cta"]["image"] = paths["cta"]
json.dump(spec, open("spec.json", "w"), indent=2, ensure_ascii=False)
print("spec.json now points at the images; re-run make_carousel.py")
