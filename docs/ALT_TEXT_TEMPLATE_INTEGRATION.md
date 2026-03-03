# ALT-TEXT TEMPLATE INTEGRATION

Replace AI-generated alt-text (Claude Vision API calls) with instant
template-based alt-text generation. This eliminates API costs and load
from photo processing while producing equally good SEO results.

## STEP 1: Add the new module

Create the file lib/generate-alt-text-templates.js using the code from
the attached generate-alt-text-templates.js file that Scott will provide.

This module exports three functions:

1. generateAltText({ brand, partNumber, viewType, condition, productType, photoIndex })
   Returns a single alt-text string for one photo.

2. generateAllAltTexts({ brand, partNumber, condition, productType, photos })
   Takes an array of photo objects, returns them with altText added.

3. mapPhotosToSureDoneFields({ brand, partNumber, condition, productType, photos })
   Returns a flat object like { media1: url, media1alttext: alt, media2: url, ... }

## STEP 2: Update Photo Station (pages/photos.js)

Find where photos.js calls the /api/photos/generate-alt-text endpoint.
This is the Claude Vision API call that we are replacing.

It probably looks something like:

  const altResponse = await fetch('/api/photos/generate-alt-text', {
    method: 'POST',
    body: JSON.stringify({ imageData, brand, partNumber, viewType })
  });
  const altData = await altResponse.json();
  const altText = altData.altText;

Replace the API call with a local function call:

  import { generateAltText } from '../lib/generate-alt-text-templates';

  const altText = generateAltText({
    brand: currentItem.brand,
    partNumber: currentItem.partNumber,
    viewType: currentStep.id,
    condition: currentItem.condition,
    productType: currentItem.productCategory || currentItem.title || '',
    photoIndex: photoOrder,
  });

This runs instantly on the client with zero API calls.

If the product type is not available yet (AI research has not run), the
template gracefully omits it and still produces good alt-text.

## STEP 3: Update Photo Station completion flow

When Photo Station completes a session and writes the photos array to
Firebase, each photo object should include the template-generated altText:

  import { generateAllAltTexts } from '../lib/generate-alt-text-templates';

  const photosWithAlt = generateAllAltTexts({
    brand: currentItem.brand,
    partNumber: currentItem.partNumber,
    condition: currentItem.condition,
    productType: currentItem.productCategory || '',
    photos: capturedPhotos,
  });

  // Write photosWithAlt to Firebase instead of capturedPhotos

## STEP 4: Update Pro Builder photo upload from computer

When photos are uploaded directly through Pro Builder, generate alt-text
immediately instead of calling the API:

  import { generateAltText } from '../lib/generate-alt-text-templates';

  const altText = generateAltText({
    brand: currentItem?.brand || brandName,
    partNumber: currentItem?.partNumber || partNumber,
    viewType: 'extra_' + photoIndex,
    condition: currentItem?.condition || condition,
    productType: currentItem?.productCategory || currentItem?.title || '',
    photoIndex: photoIndex,
  });

## STEP 5: Update SureDone listing creation

In pages/api/suredone-create-listing.js, when photos are mapped to
media1-media12 fields, use the template mapper if alt-text is missing:

  const { mapPhotosToSureDoneFields } = require('../../lib/generate-alt-text-templates');

  const photosNeedAlt = photos.some(p => !p.altText);

  if (photosNeedAlt) {
    const mediaFields = mapPhotosToSureDoneFields({
      brand, partNumber, condition,
      productType: title || productCategory || '',
      photos,
    });
    Object.assign(payload, mediaFields);
  } else {
    photos.forEach((photo, i) => {
      if (i >= 12) return;
      payload['media' + (i + 1)] = photo.url;
      payload['media' + (i + 1) + 'alttext'] = photo.altText;
    });
  }

## STEP 6: Keep the AI endpoint (do NOT delete)

Do NOT delete pages/api/photos/generate-alt-text.js.
It can serve as an optional premium alt-text option later.
Just stop calling it by default from Photo Station and Pro Builder.

## STEP 7: Verify with example output

After integration the system should produce alt-text like this for
Allen-Bradley 1756-L72 ControlLogix PLC Processor, Used Good Condition:

  media1alttext: Allen-Bradley 1756-L72 ControlLogix PLC Processor - Front View - Used Good Condition
  media2alttext: Allen-Bradley 1756-L72 ControlLogix PLC Processor Left Side View Used Good Condition
  media3alttext: Right Side Allen-Bradley 1756-L72 ControlLogix PLC Processor - Used Good Condition
  media4alttext: Allen-Bradley 1756-L72 Nameplate Showing Model Number and Specifications
  media5alttext: Allen-Bradley 1756-L72 ControlLogix PLC Processor Close-Up Detail View - Used Good Condition

Each line has different word order but targets the same keywords.

Build and deploy.
