// api/turn-credentials.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const tokenId = process.env.CLOUDFLARE_TURN_TOKEN_ID;
    const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

    if (!tokenId || !apiToken) {
      return res.status(500).json({ error: "TURN credentials are not configured" });
    }

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${tokenId}/credentials/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ttl: 86400,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Cloudflare TURN credential generation failed" });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
}