// history.js
const TX_KEY = "pos_transactions_v1";
const SELECT = (id) => document.getElementById(id);
const formatIdr = (n) =>
  new Intl.NumberFormat("id-ID").format(Math.round(n || 0));

function renderHistory() {
  const body = SELECT("historyBody");
  body.innerHTML = "";

  const transactions = JSON.parse(localStorage.getItem(TX_KEY) || "[]");
  if (transactions.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" style="text-align:center;color:#666;padding:16px">Belum ada transaksi</td>`;
    body.appendChild(tr);
    return;
  }

  // tampilkan terbalik (terbaru di atas)
  [...transactions].reverse().forEach((trx) => {
    const products = trx.items
      .map((it) => `${it.name} (${it.qty}x)`)
      .join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${trx.date}</td>
      <td style="text-align:left;max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(
        products
      )}</td>
      <td>Rp ${formatIdr(trx.subtotal)}</td>
      <td>Rp ${formatIdr(trx.discount)}</td>
      <td>Rp ${formatIdr(trx.tax)}</td>
      <td><b>Rp ${formatIdr(trx.grandTotal)}</b></td>
    `;
    body.appendChild(tr);
  });
}

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

document.addEventListener("DOMContentLoaded", () => {
  renderHistory();
  SELECT("clearHistoryBtn").addEventListener("click", () => {
    if (confirm("Hapus semua riwayat transaksi?")) {
      localStorage.removeItem(TX_KEY);
      renderHistory();
    }
  });
});
