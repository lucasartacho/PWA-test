import { extractErrorMessage } from "./api.js";

describe("extractErrorMessage", () => {
  it("junta as mensagens de todos os campos com erro", () => {
    const data = {
      cnpj: ["CNPJ deve conter exatamente 14 dígitos numéricos."],
      password: ["Ensure this field has at least 8 characters."],
    };
    const message = extractErrorMessage(data, "fallback");
    expect(message).toContain("CNPJ deve conter exatamente 14 dígitos numéricos.");
    expect(message).toContain("Ensure this field has at least 8 characters.");
  });

  it("retorna o fallback quando não há mensagens de erro utilizáveis", () => {
    expect(extractErrorMessage({}, "fallback")).toBe("fallback");
    expect(extractErrorMessage(null, "fallback")).toBe("fallback");
    expect(extractErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("ignora valores não textuais e usa apenas mensagens de string", () => {
    const data = { non_field_errors: ["Erro geral."], detail: { nested: "ignorado" } };
    expect(extractErrorMessage(data, "fallback")).toBe("Erro geral.");
  });
});
