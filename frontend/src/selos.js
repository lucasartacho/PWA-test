export const SELOS = [
  ["conserva_natureza", "Conserva a natureza"],
  ["policultivo", "Policultivo"],
  ["saberes_no_prato", "Saberes no prato"],
  ["sem_agrotoxico", "Produzido sem Agrotóxico"],
  ["solo_vivo", "Solo vivo"],
  ["cultivando_felicidade", "Cultivando felicidade"],
  ["boniteza", "Boniteza"],
];

export function rotuloSelo(chave) {
  return SELOS.find(([k]) => k === chave)?.[1] ?? chave;
}
