# Commissioner IT Help Desk - Requester Home (ServiceDesk Plus Cloud)

Branded replacement for the stock "requester dashboard" widget on the self-service portal.
Navy #1B365D, gold #C99700, white #FFFFFF. One card only: "I need something New" / "Request a Service".
The Issue and Solutions cards are removed.

## Install

1. In ServiceDesk Plus Cloud go to **Setup > Customization > Self-Service Portal > Home Page**
   (the screen where the stock template you started from lives).
2. Replace the HTML block with the contents of `requester-home.html`.
3. Paste `requester-home.css` into the CSS panel on the same screen. If there is no CSS panel,
   wrap the CSS in `<style> ... </style>` and put it at the top of the HTML block.
4. Save, then open the portal as a requester to check it.

## The two logo URLs

Both image URLs in the request were the same (`_images/88004`). The CSS uses that URL in two places:

- `.cm-wordmark` is the white **name logo** shown at the top of the navy band.
- `.cm-watermark` is the gold **star logo** faded into the background on the right.

If the star has a different image ID, change the `url(...)` inside `.cm-watermark` only.
The star reads best as a transparent PNG. If it has a solid white background, you will see a faint
white block behind it; re-upload it as a transparent PNG under Setup > Customization > Background Images.

## Tweaks you might want

- Tagline under the wordmark: edit the text inside `<p class="cm-tagline">` (it is plain text, not a translation key).
- Watermark strength: `opacity` in `.cm-watermark` (0.11 desktop, 0.08 mobile).
- Button colours: `.cm-btn` (navy at rest, gold on hover).

`preview-desktop.png` and `preview-mobile.png` were rendered with stand-in artwork because the SDP
image URLs only resolve inside your tenant. Layout and colours are exact; the logo artwork is a placeholder.
