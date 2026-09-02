# fal.ai image kit for this carousel

fal.ai could not be reached from the session that built this carousel (the
sandbox's network policy blocks fal.run and fal.ai, and no FAL_KEY was
available), so the slides shipped on the flat brand background. Use this kit
to add photo backgrounds yourself.

## Run it

    export FAL_KEY="your-key"
    pip install pillow requests
    python3 fal_generate.py            # writes images/*.jpg
    python3 make_carousel.py spec.json slides   # re-renders with the images

`fal_generate.py` writes the images and patches `spec.json` so the cover and
each rule slide point at their photo. Delete the `image` / `cover_image` keys
from `spec.json` to go back to flat backgrounds. The renderer pulls every
photo 62% of the way toward the brand black so the white headlines still
read; change `darken` in `new_canvas()` if you want more or less photo.

## Style base (prepended to every prompt)

Cinematic editorial photograph, moody low-key lighting, deep blacks and cool
greys with a single warm practical light, 35mm, shallow depth of field,
subtle film grain, no text, no logos, no watermark. Subject is a fit man in
his late 40s, short greying beard, dark henley or jacket.

## Prompts

cover: Man sitting alone at a two-top table in a dim coffee shop, empty chair
across from him, one hand on a cooling cup, looking out the window at night
rain, reflective and composed.

01 (wanted vs needed): Man standing in the doorway of a sparse apartment at
night, keys still in hand, single lamp on, the quiet of an empty room.

02 (dial-up in a broadband world): Man at a kitchen counter holding an old
flip phone in one hand and a modern smartphone face-down in the other,
half-smile, morning light through blinds.

03 (attention is not commitment): Man waiting on the front steps of a brick
apartment building at dusk, door slightly ajar behind him, checking a watch.

04 (do I like her): Man alone behind the wheel of a parked truck at night,
dashboard glow, looking straight ahead, thinking.

05 (slow the clock): Close on a man's hands resting on a wooden bar next to a
glass of bourbon and a wristwatch laid face-up, warm bar light.

06 (don't cancel your life): Man racking a loaded barbell in a garage gym at
night, phone lit up and ignored on the bench behind him.

07 (can't fake options): Man on a rooftop or porch at golden hour, arms
resting on the rail, looking out over the city, unbothered.

cta: Wide shot of the same man walking down a city street at night in a dark
jacket, back to camera, streetlights, purposeful stride.
