export async function regenerateProfileSeo(profileId) {
  try {
    await fetch(
      `${process.env.APP_BASE_URL}/api/seo/generate-keywords`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile_id: profileId,
        }),
      }
    );
  } catch (err) {
    console.error("Erro regenerando SEO:", err);
  }
}