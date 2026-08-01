import { defineMcp } from "@lovable.dev/mcp-js";
import searchBusinesses from "./tools/search-businesses";
import getBusiness from "./tools/get-business";
import getBusinessMedia from "./tools/get-business-media";
import getBusinessRelations from "./tools/get-business-relations";
import listBusinessesNearPoi from "./tools/list-businesses-near-poi";
import listBlogArticles from "./tools/list-blog-articles";
import getBlogArticle from "./tools/get-blog-article";

export default defineMcp({
  name: "one-world-morocco",
  title: "One World Morocco",
  version: "0.4.0",
  instructions:
    "Public read-only access to the One World Morocco catalog and editorial blog: curated restaurants, hotels, riads, activities and boutiques in Marrakech, Essaouira and across Morocco. Tools: `search_businesses` (free-text search), `get_business` (full details by slug), `get_business_media` (all photos with titles, logo, YouTube videos, virtual tour, menus and documents by slug), `get_business_relations` (linked POIs, destinations, events for a business), `list_businesses_near_poi` (businesses tied to a landmark like Jemaa el-Fna or Jardin Majorelle), `list_blog_articles` (published editorial articles) and `get_blog_article` (full article content by slug, e.g. 'idee-cadeau-marrakech'). All data is public — no personal or member data is exposed.",
  tools: [
    searchBusinesses,
    getBusiness,
    getBusinessMedia,
    getBusinessRelations,
    listBusinessesNearPoi,
    listBlogArticles,
    getBlogArticle,
  ],
});
