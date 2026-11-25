// Classes dos fundos de janela (modais) da app. Usado por components/GestosJanelas.jsx
// (voltar fecha / arrastar fecha) e utils/saidaJanelas.js (animação ao fechar).
// Janela nova: acrescentar a classe do fundo aqui, ou pôr data-janela no fundo.
export const JANELAS = [
  "ab-overlay", "af-overlay", "ag-overlay", "apv-overlay", "cal-overlay", "cc-overlay", "dlg-overlay",
  "en-overlay", "fx-overlay", "gestao-modal-overlay", "gm-overlay", "mk-modal-overlay", "mk-overlay",
  "modal-overlay", "pa-overlay", "pd-overlay", "pf-crop-overlay", "pf-dialog-overlay", "po-overlay",
  "rh-overlay", "ti-confirm-overlay", "ti-detail-overlay", "ti-overlay", "tk-overlay", "pp-overlay",
  "cm-fundo", "bz-theme-overlay", "bz-account-backdrop", "np-backdrop", "fs-backdrop",
  "jn-fundo", "sgm-back", "pdfo-dialog-back", "apv-dialog",
];

export const SELETOR_JANELAS = `${JANELAS.map((c) => `.${c}`).join(",")},[data-janela]`;
