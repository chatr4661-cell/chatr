// api/turn-credentials.js

export default async function handler(req, res) {
  try {
    const tokenId = process.env.CLOUDFLARE_TURN_TOKEN_ID;
    const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

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

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
}