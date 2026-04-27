export const onRequestPost: PagesFunction = async (context) => {
  return new Response(JSON.stringify({
    error: "Shell execution is not supported on Cloudflare Pages Functions. This feature is only available in the local development sandbox."
  }), {
    headers: { "Content-Type": "application/json" },
    status: 403
  });
};
