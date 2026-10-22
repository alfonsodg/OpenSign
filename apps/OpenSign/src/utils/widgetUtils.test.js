import { describe, it, expect } from "vitest";
import { sanitizeFileName } from "./sanitizeFileName";
import {
  getInitials,
  isValidBase64,
  hasSignatureWidget,
  hasDuplicateWidgetNames,
  applyNumberFormulasToPages
} from "./widgetUtils";

describe("sanitizeFileName", () => {
  it("keeps letters, digits, dots, dashes and underscores", () => {
    expect(sanitizeFileName("contract_v2-final.pdf")).toBe("contract_v2-final.pdf");
  });

  it("removes spaces and path separators", () => {
    expect(sanitizeFileName("../my file.pdf")).toBe("..myfile.pdf");
    expect(sanitizeFileName("a/b\\c.pdf")).toBe("abc.pdf");
  });

  it("keeps only the last dot", () => {
    expect(sanitizeFileName("a.b.c.pdf")).toBe("ab.c.pdf");
  });

  it("tolerates an empty value", () => {
    expect(sanitizeFileName("")).toBe("");
    expect(sanitizeFileName(undefined)).toBeUndefined();
  });
});

describe("getInitials", () => {
  it("uses the first two words", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
  });

  it("uses the first letter of a single word", () => {
    expect(getInitials("Ada")).toBe("A");
  });

  it("tolerates an empty value", () => {
    expect(getInitials("")).toBe("");
  });
});

describe("isValidBase64", () => {
  it("accepts a valid base64 string", () => {
    expect(isValidBase64("SGVsbG8=")).toBe(true);
  });

  it("accepts a data URI", () => {
    expect(isValidBase64("data:image/png;base64,SGVsbG8=")).toBe(true);
  });

  it("rejects plain text and empty values", () => {
    expect(isValidBase64("not base64 !!")).toBe(false);
    expect(isValidBase64("")).toBe(false);
  });
});

describe("hasSignatureWidget", () => {
  const withSignature = {
    placeHolder: [{ pos: [{ type: "signature" }] }]
  };
  const withTextOnly = { placeHolder: [{ pos: [{ type: "text" }] }] };

  it("detects a signature widget in the signer placeholders", () => {
    expect(hasSignatureWidget(withSignature)).toBe(true);
  });

  it("returns false when the signer only has text widgets", () => {
    expect(hasSignatureWidget(withTextOnly)).toBe(false);
  });

  it("returns false for a signer without placeholders", () => {
    expect(hasSignatureWidget({})).toBe(false);
    expect(hasSignatureWidget(undefined)).toBe(false);
  });
});

describe("hasDuplicateWidgetNames", () => {
  it("accepts distinct names", () => {
    const placeholders = [{ pos: [{ options: { name: "a" } }, { options: { name: "b" } }] }];
    expect(hasDuplicateWidgetNames(placeholders)).toBe(false);
  });

  it("detects two widgets sharing a name", () => {
    const placeholders = [{ pos: [{ options: { name: "a" } }, { options: { name: "a" } }] }];
    expect(hasDuplicateWidgetNames(placeholders)).toBe(true);
  });

  it("ignores widgets without a name", () => {
    const placeholders = [{ pos: [{ options: {} }, { options: {} }] }];
    expect(hasDuplicateWidgetNames(placeholders)).toBe(false);
  });
});

describe("applyNumberFormulasToPages", () => {
  it("numbers the placeholders in order across pages", () => {
    const pages = [
      { pos: [{ options: { numberWidget: true } }, { options: {} }] },
      { pos: [{ options: { numberWidget: true } }] }
    ];
    const result = applyNumberFormulasToPages(pages);
    expect(result[0].pos[0].options.response).toBe("1");
    expect(result[1].pos[0].options.response).toBe("2");
  });

  it("leaves the other widgets untouched", () => {
    const pages = [{ pos: [{ options: { response: "keep" } }] }];
    expect(applyNumberFormulasToPages(pages)[0].pos[0].options.response).toBe("keep");
  });
});
