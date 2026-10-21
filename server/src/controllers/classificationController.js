const categories = ['Phones & tablets', 'Computers', 'Accessories', 'Home electronics', 'Other']
const hazardLevels = ['low', 'moderate', 'high', 'unknown']
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']

export async function classifyItemPhoto(req, res) {
  const { imageData, mimeType } = req.body || {}
  if (typeof imageData !== 'string' || imageData.length > 7_000_000
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageData)
    || !allowedImageTypes.includes(mimeType)) {
    return res.status(400).json({ message: 'Upload a JPEG, PNG, or WebP image smaller than 5 MB.' })
  }

  const { VISION_API_URL, VISION_API_KEY, VISION_MODEL } = process.env
  if (!VISION_API_URL || !VISION_API_KEY || !VISION_MODEL) {
    return res.status(503).json({ message: 'Photo classification is not configured. Set VISION_API_URL, VISION_API_KEY, and VISION_MODEL on the server.' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const providerResponse = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VISION_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Classify the visible electronic item in the image. Return only a JSON object with category (one of Phones & tablets, Computers, Accessories, Home electronics, Other), hazardLevel (low, moderate, high, unknown), materials (array of visible or likely materials), confidence (number from 0 to 1), and safetyNote (short string). Hazard level is only a visual triage estimate; never claim a photo proves material safety or the absence of hazardous substances.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identify the visible e-waste item and provide a cautious intake estimate.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageData}`, detail: 'low' } },
            ],
          },
        ],
      }),
    })
    if (!providerResponse.ok) {
      console.error(`Vision provider returned HTTP ${providerResponse.status}.`)
      return res.status(502).json({ message: 'The vision provider could not classify this photo. Please try again later.' })
    }

    const providerResult = await providerResponse.json()
    const content = providerResult.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      console.error('Vision provider returned an unsupported response shape.')
      return res.status(502).json({ message: 'The vision provider returned an unsupported response. Please try again later.' })
    }

    let result
    try {
      result = JSON.parse(content)
    } catch {
      console.error('Vision provider returned invalid classification JSON.')
      return res.status(502).json({ message: 'The vision provider returned an unreadable classification. Please try again later.' })
    }
    if (!categories.includes(result.category)
      || !hazardLevels.includes(result.hazardLevel)
      || !Array.isArray(result.materials)
      || !result.materials.every((material) => typeof material === 'string' && material.length <= 60)
      || typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1
      || typeof result.safetyNote !== 'string' || result.safetyNote.length > 300) {
      console.error('Vision provider returned classification fields outside the expected format.')
      return res.status(502).json({ message: 'The vision provider returned an invalid classification. Please try again later.' })
    }

    return res.json({
      category: result.category,
      hazardLevel: result.hazardLevel,
      materials: result.materials.slice(0, 8),
      confidence: result.confidence,
      safetyNote: result.safetyNote,
      disclaimer: 'Visual estimate only. This is not a materials test or safety certification.',
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ message: 'Photo classification took too long. Please try again.' })
    }
    console.error('Vision provider request failed:', error)
    return res.status(502).json({ message: 'The vision provider could not classify this photo. Please check the server connection and try again.' })
  } finally {
    clearTimeout(timeout)
  }
}
