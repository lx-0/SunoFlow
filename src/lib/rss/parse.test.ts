import { describe, it, expect } from "vitest";
import {
  extractTagContent,
  extractAllTagContent,
  stripCDATA,
  decodeHtmlEntities,
  stripTags,
  extractAtomLink,
  stripReadMoreMarker,
  hasReadMoreMarker,
} from "./parse";

describe("stripCDATA", () => {
  it("unwraps CDATA sections", () => {
    expect(stripCDATA("<![CDATA[hello world]]>")).toBe("hello world");
  });

  it("passes through text without CDATA", () => {
    expect(stripCDATA("plain text")).toBe("plain text");
  });
});

describe("decodeHtmlEntities", () => {
  it("decodes common named entities", () => {
    expect(decodeHtmlEntities("&amp; &lt; &gt; &quot;")).toBe('& < > "');
  });

  it("decodes numeric entities", () => {
    expect(decodeHtmlEntities("&#65; &#x41;")).toBe("A A");
  });
});

describe("stripTags", () => {
  it("removes HTML tags and normalizes whitespace", () => {
    expect(stripTags("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("handles entity-encoded tags", () => {
    expect(stripTags("&lt;p&gt;text&lt;/p&gt;")).toBe("text");
  });
});

describe("extractTagContent", () => {
  it("extracts content from a simple tag", () => {
    expect(extractTagContent("<title>My Title</title>", "title")).toBe("My Title");
  });

  it("handles CDATA inside tags", () => {
    const xml = "<title><![CDATA[Hello]]></title>";
    expect(extractTagContent(xml, "title")).toBe("Hello");
  });

  it("returns empty string for missing tag", () => {
    expect(extractTagContent("<foo>bar</foo>", "missing")).toBe("");
  });

  it("handles namespaced tags like content:encoded", () => {
    const xml = "<content:encoded>Article body</content:encoded>";
    expect(extractTagContent(xml, "content:encoded")).toBe("Article body");
  });
});

describe("extractAllTagContent", () => {
  it("extracts all occurrences of a tag", () => {
    const xml = "<item>first</item><item>second</item>";
    expect(extractAllTagContent(xml, "item")).toEqual(["first", "second"]);
  });
});

describe("stripReadMoreMarker", () => {
  it("removes the tagesschau '[ mehr ]' marker left after stripping the anchor tag", () => {
    expect(stripReadMoreMarker("Ein Ehepaar soll spioniert haben.[ mehr ]")).toBe(
      "Ein Ehepaar soll spioniert haben."
    );
  });

  it("removes '[mehr]' without inner spaces", () => {
    expect(stripReadMoreMarker("Kurztext.[mehr]")).toBe("Kurztext.");
  });

  it("removes German 'Weiterlesen' read-more markers", () => {
    expect(stripReadMoreMarker("Zusammenfassung. [Weiterlesen]")).toBe("Zusammenfassung.");
  });

  it("removes English read-more markers", () => {
    expect(stripReadMoreMarker("Summary text. [read more]")).toBe("Summary text.");
  });

  it("removes a trailing ellipsis (summary cut mid-thought)", () => {
    expect(stripReadMoreMarker("Die Verhandlungen gehen weiter…")).toBe(
      "Die Verhandlungen gehen weiter"
    );
    expect(stripReadMoreMarker("Die Verhandlungen gehen weiter...")).toBe(
      "Die Verhandlungen gehen weiter"
    );
  });

  it("leaves clean article text untouched", () => {
    expect(stripReadMoreMarker("Full article body without any marker.")).toBe(
      "Full article body without any marker."
    );
  });

  it("does not remove the word 'mehr' in normal prose", () => {
    expect(stripReadMoreMarker("Es gab mehr Festnahmen als erwartet.")).toBe(
      "Es gab mehr Festnahmen als erwartet."
    );
  });
});

describe("hasReadMoreMarker", () => {
  it("detects the '[ mehr ]' marker", () => {
    expect(hasReadMoreMarker("Ein Ehepaar soll spioniert haben.[ mehr ]")).toBe(true);
  });

  it("returns false for clean text", () => {
    expect(hasReadMoreMarker("Full article body without any marker.")).toBe(false);
  });

  it("returns false for the bare word 'mehr'", () => {
    expect(hasReadMoreMarker("Es gab mehr Festnahmen.")).toBe(false);
  });

  it("detects a trailing ellipsis as truncation", () => {
    expect(hasReadMoreMarker("Die Verhandlungen gehen weiter…")).toBe(true);
    expect(hasReadMoreMarker("Die Verhandlungen gehen weiter...")).toBe(true);
  });

  it("does not treat a mid-sentence ellipsis as truncation", () => {
    expect(hasReadMoreMarker("Er zögerte … dann stimmte er zu.")).toBe(false);
  });
});

describe("extractAtomLink", () => {
  it("extracts href from atom link element", () => {
    const xml = '<link href="https://example.com/post" rel="alternate" />';
    expect(extractAtomLink(xml)).toBe("https://example.com/post");
  });

  it("returns empty string when no link found", () => {
    expect(extractAtomLink("<p>no link here</p>")).toBe("");
  });
});
