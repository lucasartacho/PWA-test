import { formatCNPJ, formatCPF, onlyDigits } from "./format.js";

describe("onlyDigits", () => {
  it("strips everything that isn't a digit", () => {
    expect(onlyDigits("68.887.522/0001-90")).toBe("68887522000190");
  });
});

describe("formatCNPJ", () => {
  it("masks progressively as digits are typed", () => {
    expect(formatCNPJ("68")).toBe("68");
    expect(formatCNPJ("688875")).toBe("68.887.5");
    expect(formatCNPJ("68887522000190")).toBe("68.887.522/0001-90");
  });

  it("re-masks pasted input that already has punctuation", () => {
    expect(formatCNPJ("68.887.522/0001-90")).toBe("68.887.522/0001-90");
  });

  it("ignores digits beyond the 14th", () => {
    expect(formatCNPJ("688875220001900000")).toBe("68.887.522/0001-90");
  });
});

describe("formatCPF", () => {
  it("masks progressively as digits are typed", () => {
    expect(formatCPF("123")).toBe("123");
    expect(formatCPF("123456")).toBe("123.456");
    expect(formatCPF("12345678900")).toBe("123.456.789-00");
  });

  it("re-masks pasted input that already has punctuation", () => {
    expect(formatCPF("123.456.789-00")).toBe("123.456.789-00");
  });
});
