import fetch from "node-fetch";

export default async function handler(req, res) {
  const body = req.body;

  // Call OpenAI API
  const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: body.message }],
    }),
  });

  const data = await aiRes.json();
  res.status(200).json(data);
}