export const onRequestPost: PagesFunction<{ AI: any }> = async (context) => {
  const { prompt } = await context.request.json() as { prompt: string };
  
  if (!prompt) {
    return new Response(JSON.stringify({ error: "No prompt provided" }), { status: 400 });
  }

  try {
    // This uses Cloudflare Workers AI
    // You must bind the AI service to your Pages project in the dashboard
    const response = await context.env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [{ role: "user", content: prompt }]
    });

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
