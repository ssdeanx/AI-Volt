// Generated on 2025-06-03
/**
 * Web Browser Tool (DuckDuckGo + Cheerio)
 * Performs a real DuckDuckGo search and scrapes the selected result page using Cheerio.
 * @see https://duckduckgo.com/ and https://cheerio.js.org/
 */
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { logger } from "../config/logger.js";
import * as cheerio from "cheerio";
import axios from "axios"; // Use axios for HTTP requests

// --- Search Tool ---
const searchSchema = z.object({
  query: z.string().describe("The search query for DuckDuckGo."),
  result: z.number().min(1).max(5).default(1).describe("Which result to scrape (1=first, 2=second, etc)."),
});

type SearchInput = z.infer<typeof searchSchema>;

const webSearchTool = createTool({
  name: "web_search",
  description: "Performs a DuckDuckGo search and returns the top N result URLs and titles.",
  parameters: searchSchema,
  execute: async ({ query, result }: SearchInput) => {
    logger.info("[webSearchTool] Searching DuckDuckGo", { query, result });
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const searchRes = await axios.get(searchUrl, { headers: { "User-Agent": "Mozilla/5.0 (AI-Volt-Agent)" } });
    if (searchRes.status !== 200) throw new Error("DuckDuckGo search failed");
    const searchHtml = searchRes.data as string;
    const $ = cheerio.load(searchHtml);
    const results: { href: string; title: string }[] = [];
    $(".result__a").each((i: number, el: any) => {
      const href = $(el).attr("href");
      const title = $(el).text();
      if (href && title) results.push({ href, title });
    });
    if (results.length === 0) throw new Error("No search results found");
    return { results: results.slice(0, result) };
  }
});

// --- Extract Text Tool ---
const extractTextSchema = z.object({
  url: z.string().describe("URL of the page to extract text from."),
});

type ExtractTextInput = z.infer<typeof extractTextSchema>;

const extractTextTool = createTool({
  name: "extract_text",
  description: "Fetches a web page and extracts the main visible text content.",
  parameters: extractTextSchema,
  execute: async ({ url }: ExtractTextInput) => {
    logger.info("[extractTextTool] Fetching page", { url });
    const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0 (AI-Volt-Agent)" } });
    if (res.status !== 200) throw new Error("Failed to fetch page");
    const html = res.data as string;
    const $ = cheerio.load(html);
    let text = $("body").text().replace(/\s+/g, " ").trim();
    text = text.slice(0, 2000); // Limit for safety
    return { url, text };
  }
});

// --- Extract Links Tool ---
const extractLinksSchema = z.object({
  url: z.string().describe("URL of the page to extract links from."),
});

type ExtractLinksInput = z.infer<typeof extractLinksSchema>;

const extractLinksTool = createTool({
  name: "extract_links",
  description: "Fetches a web page and extracts all anchor links (href + text).",
  parameters: extractLinksSchema,
  execute: async ({ url }: ExtractLinksInput) => {
    logger.info("[extractLinksTool] Fetching page", { url });
    const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0 (AI-Volt-Agent)" } });
    if (res.status !== 200) throw new Error("Failed to fetch page");
    const html = res.data as string;
    const $ = cheerio.load(html);
    const links: { href: string; text: string }[] = [];
    $("a").each((i: number, el: any) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href) links.push({ href, text });
    });
    return { url, links };
  }
});

// --- Extract Metadata Tool ---
const extractMetadataSchema = z.object({
  url: z.string().describe("URL of the page to extract metadata from."),
});

type ExtractMetadataInput = z.infer<typeof extractMetadataSchema>;

const extractMetadataTool = createTool({
  name: "extract_metadata",
  description: "Fetches a web page and extracts meta tags (title, description, og:title, og:description, etc).",
  parameters: extractMetadataSchema,
  execute: async ({ url }: ExtractMetadataInput) => {
    logger.info("[extractMetadataTool] Fetching page", { url });
    const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0 (AI-Volt-Agent)" } });
    if (res.status !== 200) throw new Error("Failed to fetch page");
    const html = res.data as string;
    const $ = cheerio.load(html);
    const meta: Record<string, string> = {};
    meta.title = $("title").text();
    $("meta").each((i: number, el: any) => {
      const name = $(el).attr("name") || $(el).attr("property");
      const content = $(el).attr("content");
      if (name && content) meta[name] = content;
    });
    return { url, meta };
  }
});

// --- Extract Tables Tool ---
const extractTablesSchema = z.object({
  url: z.string().describe("URL of the page to extract tables from."),
});

type ExtractTablesInput = z.infer<typeof extractTablesSchema>;

const extractTablesTool = createTool({
  name: "extract_tables",
  description: "Fetches a web page and extracts all HTML tables as arrays of rows/cells.",
  parameters: extractTablesSchema,
  execute: async ({ url }: ExtractTablesInput) => {
    logger.info("[extractTablesTool] Fetching page", { url });
    const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0 (AI-Volt-Agent)" } });
    if (res.status !== 200) throw new Error("Failed to fetch page");
    const html = res.data as string;
    const $ = cheerio.load(html);
    const tables: string[][][] = [];
    $("table").each((i: number, table: any) => {
      const rows: string[][] = [];
      $(table).find("tr").each((j: number, row: any) => {
        const cells: string[] = [];
        $(row).find("th,td").each((k: number, cell: any) => {
          cells.push($(cell).text().trim());
        });
        if (cells.length) rows.push(cells);
      });
      if (rows.length) tables.push(rows);
    });
    return { url, tables };
  }
});

// --- New: Extract JSON-LD Structured Data Tool ---
const extractJsonLdSchema = z.object({
  url: z.string().describe("URL of the page to extract JSON-LD from."),
});
type ExtractJsonLdInput = z.infer<typeof extractJsonLdSchema>;

const extractJsonLdTool = createTool({
  name: "extract_jsonld",
  description: "Fetches a web page and extracts JSON-LD structured data scripts.",
  parameters: extractJsonLdSchema,
  execute: async ({ url }: ExtractJsonLdInput) => {
    logger.info("[extractJsonLdTool] Fetching page for JSON-LD", { url });
    try {
      const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0 (AI-Volt-Agent)" } });
      if (res.status !== 200) throw new Error("Failed to fetch page");
      const html = res.data as string;
      const $ = cheerio.load(html);
      const jsonLd: any[] = [];
      $("script[type=\"application/ld+json\"]").each((i, el) => {
        try {
          const content = $(el).html() || "";
          jsonLd.push(JSON.parse(content));
        } catch (err) {
          logger.warn("[extractJsonLdTool] JSON-LD parse error", { url, error: (err as Error).message });
        }
      });
      return { url, jsonLd };
    } catch (err) {
      logger.error("[extractJsonLdTool] Error", { url, error: (err as Error).message });
      throw err;
    }
  }
});


// --- Updated Exports ---
export {
  webSearchTool,
  extractTextTool,
  extractLinksTool,
  extractMetadataTool,
  extractTablesTool,
  extractJsonLdTool,
};
