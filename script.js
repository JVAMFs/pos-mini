// POS Mini - script.js
// Pastikan file ini bernama script.js dan ada di folder yang sama dengan index.html

const SELECT = (id) => document.getElementById(id);
const formatIdr = (n) =>
  new Intl.NumberFormat("id-ID").format(Math.round(n || 0));

const CART_KEY = "pos_cart_v1";
const TX_KEY = "pos_transactions_v1";

let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
let lastTotals = {
  subTotal: 0,
  discountAmount: 0,
  taxAmount: 0,
  grandTotal: 0,
};

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function renderCart() {
  const tbody = SELECT("cartBody");
  tbody.innerHTML = "";

  let subTotal = 0;
  cart.forEach((item, idx) => {
    const lineTotal = Number(item.price) * Number(item.qty);
    subTotal += lineTotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td>Rp ${formatIdr(item.price)}</td>
      <td>${item.qty}</td>
      <td>Rp ${formatIdr(lineTotal)}</td>
      <td><button class="remove-btn" data-idx="${idx}">Hapus</button></td>
    `;
    tbody.appendChild(tr);
  });

  // ambil diskon & pajak
  const discountPercent = parseFloat(SELECT("discount").value) || 0;
  const taxPercent = parseFloat(SELECT("tax").value) || 0;

  const discountAmount = Math.round((subTotal * discountPercent) / 100);
  const taxAmount = Math.round(
    ((subTotal - discountAmount) * taxPercent) / 100
  );
  const grandTotal = Math.round(subTotal - discountAmount + taxAmount);

  lastTotals = { subTotal, discountAmount, taxAmount, grandTotal };

  SELECT("subTotal").textContent = formatIdr(subTotal);
  SELECT("discountAmount").textContent = formatIdr(discountAmount);
  SELECT("taxAmount").textContent = formatIdr(taxAmount);
  SELECT("grandTotal").textContent = formatIdr(grandTotal);

  saveCart();
  // attach remove listeners (delegation is another option)
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.idx);
      cart.splice(i, 1);
      renderCart();
    });
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

function addProduct() {
  const name = SELECT("productName").value.trim();
  const price = parseFloat(SELECT("productPrice").value);
  const qty = parseInt(SELECT("productQty").value, 10);

  if (
    !name ||
    !price ||
    isNaN(price) ||
    price <= 0 ||
    !qty ||
    isNaN(qty) ||
    qty <= 0
  ) {
    alert("Isi nama produk, harga (>0), dan jumlah (>0) dengan benar.");
    return;
  }

  // jika nama sama (case-insensitive), gabungkan qty
  const existing = cart.find(
    (it) => it.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    existing.qty = Number(existing.qty) + qty;
    existing.price = price; // update harga ke yang terakhir dimasukkan
  } else {
    cart.push({ name, price, qty });
  }

  // reset form
  SELECT("productName").value = "";
  SELECT("productPrice").value = "";
  SELECT("productQty").value = 1;

  renderCart();
}

function resetCart() {
  if (confirm("Yakin ingin mereset transaksi?")) {
    cart = [];
    renderCart();
  }
}

function saveTransaction(trx) {
  const transactions = JSON.parse(localStorage.getItem(TX_KEY) || "[]");
  transactions.push(trx);
  localStorage.setItem(TX_KEY, JSON.stringify(transactions));
}

function payAndPrint() {
  if (cart.length === 0) {
    alert("Keranjang kosong. Tambahkan produk terlebih dahulu.");
    return;
  }

  // pastikan totals sudah up-to-date
  renderCart();
  const { subTotal, discountAmount, taxAmount, grandTotal } = lastTotals;

  // buat PDF struk
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt" });
    let y = 40;
    doc.setFontSize(14);
    doc.text("POS Mini - Struk Belanja", 40, y);
    y += 18;
    doc.setFontSize(10);
    doc.text(`Tanggal: ${new Date().toLocaleString("id-ID")}`, 40, y);
    y += 10;
    doc.text("----------------------------------------", 40, y);
    y += 12;

    cart.forEach((item) => {
      const line = `${item.name} (${item.qty}x)`;
      const priceStr = `Rp ${formatIdr(item.price * item.qty)}`;
      doc.text(line, 40, y);
      doc.text(priceStr, 480, y, { align: "right" });
      y += 14;
    });

    y += 6;
    doc.text("----------------------------------------", 40, y);
    y += 12;
    doc.text(`Subtotal: Rp ${formatIdr(subTotal)}`, 40, y);
    y += 14;
    doc.text(`Diskon: Rp ${formatIdr(discountAmount)}`, 40, y);
    y += 14;
    doc.text(`Pajak: Rp ${formatIdr(taxAmount)}`, 40, y);
    y += 14;
    doc.setFontSize(12);
    doc.text(`Grand Total: Rp ${formatIdr(grandTotal)}`, 40, y);
    y += 20;
    doc.setFontSize(10);
    doc.text("Terima kasih sudah berbelanja!", 40, y);

    doc.save("struk-pos.pdf");
  } catch (err) {
    console.error("Error membuat PDF:", err);
    alert(
      "Gagal membuat PDF. Cek koneksi CDN jsPDF atau console untuk detail."
    );
  }

  // simpan transaksi ke history
  const trx = {
    id: Date.now(),
    date: new Date().toLocaleString("id-ID"),
    items: JSON.parse(JSON.stringify(cart)),
    subtotal: lastTotals.subTotal,
    discount: lastTotals.discountAmount,
    tax: lastTotals.taxAmount,
    grandTotal: lastTotals.grandTotal,
  };
  saveTransaction(trx);

  // kosongkan cart setelah bayar
  cart = [];
  renderCart();
  alert("Transaksi berhasil disimpan di Riwayat.");
}

// Attach listeners after DOM ready
document.addEventListener("DOMContentLoaded", () => {
  SELECT("addBtn").addEventListener("click", addProduct);
  SELECT("resetBtn").addEventListener("click", resetCart);
  SELECT("payPrintBtn").addEventListener("click", payAndPrint);

  // recalc otomatis saat discount/tax berubah
  SELECT("discount").addEventListener("input", renderCart);
  SELECT("tax").addEventListener("input", renderCart);

  // initial render
  renderCart();
});
