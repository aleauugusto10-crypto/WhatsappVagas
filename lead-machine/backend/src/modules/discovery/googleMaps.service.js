import { ApifyClient } from "apify-client";

const client = new ApifyClient({
  token: process.env.APIFY_TOKEN,
});

export async function searchGoogleMaps({
  city,
  category,
}) {
  const query = `${category} em ${city}`;

  const input = {
    searchStringsArray: [query],

    maxCrawledPlacesPerSearch: 30,

    language: "pt-BR",
  };

  const run = await client
    .actor("compass/crawler-google-places")
    .call(input);

  const { items } = await client
    .dataset(run.defaultDatasetId)
    .listItems();

  return items || [];
}