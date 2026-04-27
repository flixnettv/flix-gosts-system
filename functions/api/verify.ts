interface Env {
  TURNSTILE_SECRET_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { token } = await context.request.json() as { token: string };
  
  if (!token) {
    return new Response(JSON.stringify({ error: "No token provided" }), { status: 400 });
  }

  // Verify the Turnstile token with Cloudflare
  const secretKey = context.env.TURNSTILE_SECRET_KEY; // Set this in Cloudflare dashboard
  
  if (!secretKey) {
    return new Response(JSON.stringify({ error: "Turnstile secret key not configured" }), { status: 500 });
  }

  const formData = new FormData();
  formData.append("secret", secretKey);
  formData.append("response", token);

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(url, {
    body: formData,
    method: "POST",
  });

  const outcome = await result.json();
  return new Response(JSON.stringify(outcome), {
    headers: { "Content-Type": "application/json" }
  });
};
