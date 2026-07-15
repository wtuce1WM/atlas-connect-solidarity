import { defineMcp } from "@lovable.dev/mcp-js";
import searchBusinesses from "./tools/search-businesses";
import getBusiness from "./tools/get-business";

export default defineMcp({
  name: "one-world-morocco",
  title: "One World Morocco",
  version: "0.1.0",
  instructions:
    "Public read-only access to the One World Morocco catalog: curated restaurants, hotels, riads, activities and boutiques in Marrakech, Essaouira and across Morocco. Use `search_businesses` to find places (by name, cuisine, activity, city, neighborhood) and `get_business` to fetch full details of one place by its slug. All data is public — no personal or member data is exposed.",
  tools: [searchBusinesses, getBusiness],
});
