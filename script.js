// Application State
const state = {
  customers: [
    { id: 1, name: "Thabo Molefe", phone: "+27 82 123 4567", email: "thabo@example.com" },
    { id: 2, name: "Sipho Ndlovu", phone: "+27 71 987 6543", email: "sipho@example.com" }
  ],
  stock: [
    { id: 1, name: "Chocolate Croissant", qty: 45, price: 35.00, min: 10 },
    { id: 2, name: "Strawberry Tart", qty: 12, price: 120.00, min: 5 },
    { id: 3, name: "Artisanal Sourdough", qty: 4, price: 45.00, min: 8 }
  ],
  sales: [],
  banking: [
    { id: 1, date: "2026-03-28", ref: "Opening Balance Deposit", type: "Deposit", method: "EFT", status: "Cleared", amount: 12500.00 }
  ]
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  renderCustomers();
  renderStock();
  renderSales();
  renderBanking();
  updateDropdowns();
  updateDashboard();

  // Event Listeners for Forms
  document.getElementById("customerForm").addEventListener("submit", handleAddCustomer);
  document.getElementById("stockForm").addEventListener("submit", handleAddStock);
  document.getElementById("salesForm").addEventListener("submit", handleProcessSale);
  document.getElementById("bankingForm").addEventListener("submit", handleAddBanking);
  document.getElementById("searchReceipt").addEventListener("input", handleSearchReceipt);
});

// Helper: Format Currency to South African Rand (R)
function formatMoney(amount) {
  return 'R ' + parseFloat(amount).toFixed(2);
}

// Update Dashboard KPIs
function updateDashboard() {
  const totalSales = state.sales.reduce((sum, item) => sum + item.total, 0);
  const totalStockQty = state.stock.reduce((sum, item) => sum + item.qty, 0);
  const lowStockCount = state.stock.filter(item => item.qty <= item.min).length;

  document.getElementById("kpi-sales").innerText = formatMoney(totalSales);
  document.getElementById("kpi-stock").innerText = `${totalStockQty} items`;
  document.getElementById("kpi-customers").innerText = state.customers.length;
  
  const lowStockElem = document.getElementById("kpi-low-stock");
  const lowSubElem = document.getElementById("kpi-low-sub");

  lowStockElem.innerText = `${lowStockCount} items`;
  if (lowStockCount > 0) {
    lowStockElem.style.color = "#e53e3e";
    lowSubElem.className = "kpi-sub warning";
    lowSubElem.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Action needed`;
  } else {
    lowStockElem.style.color = "inherit";
    lowSubElem.className = "kpi-sub positive";
    lowSubElem.innerHTML = `<i class="fa-solid fa-circle-check"></i> Stock levels healthy`;
  }
}

// Sync Select Dropdowns
function updateDropdowns() {
  const custSelect = document.getElementById("saleCustomer");
  const prodSelect = document.getElementById("saleProduct");

  custSelect.innerHTML = '<option value="">-- Choose Customer --</option>';
  state.customers.forEach(c => {
    custSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
  });

  prodSelect.innerHTML = '<option value="">-- Choose Product --</option>';
  state.stock.forEach(p => {
    prodSelect.innerHTML += `<option value="${p.id}">${p.name} (${formatMoney(p.price)} - ${p.qty} in stock)</option>`;
  });
}

// Customers Handlers
function handleAddCustomer(e) {
  e.preventDefault();
  const name = document.getElementById("custName").value;
  const phone = document.getElementById("custPhone").value;
  const email = document.getElementById("custEmail").value;

  state.customers.push({ id: Date.now(), name, phone, email });
  renderCustomers();
  updateDropdowns();
  updateDashboard();
  e.target.reset();
}

function renderCustomers() {
  const tbody = document.getElementById("customerTableBody");
  tbody.innerHTML = state.customers.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
    </tr>
  `).join("");
}

// Stock Handlers
function handleAddStock(e) {
  e.preventDefault();
  const name = document.getElementById("productName").value;
  const qty = parseInt(document.getElementById("stockQty").value);
  const price = parseFloat(document.getElementById("unitPrice").value);
  const min = parseInt(document.getElementById("minStock").value);

  state.stock.push({ id: Date.now(), name, qty, price, min });
  renderStock();
  updateDropdowns();
  updateDashboard();
  e.target.reset();
}

function renderStock() {
  const tbody = document.getElementById("stockTableBody");
  tbody.innerHTML = state.stock.map(item => {
    const isLow = item.qty <= item.min;
    return `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td>${item.qty} units</td>
        <td>${formatMoney(item.price)}</td>
        <td>
          <span class="badge ${isLow ? 'badge-danger' : 'badge-success'}">
            ${isLow ? 'Low Stock' : 'In Stock'}
          </span>
        </td>
        <td>
          <button class="action-btn btn-add" onclick="adjustStock(${item.id}, 5)">+5</button>
          <button class="action-btn btn-delete" onclick="deleteStock(${item.id})">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

function adjustStock(id, amount) {
  const item = state.stock.find(s => s.id === id);
  if (item) {
    item.qty += amount;
    renderStock();
    updateDropdowns();
    updateDashboard();
  }
}

function deleteStock(id) {
  state.stock = state.stock.filter(s => s.id !== id);
  renderStock();
  updateDropdowns();
  updateDashboard();
}

// Sales Handlers
function handleProcessSale(e) {
  e.preventDefault();
  const customerName = document.getElementById("saleCustomer").value;
  const productId = parseInt(document.getElementById("saleProduct").value);
  const qty = parseInt(document.getElementById("saleQty").value);
  const method = document.getElementById("paymentMethod").value;

  const product = state.stock.find(p => p.id === productId);
  if (!product) return alert("Please select a valid product.");
  if (product.qty < qty) return alert(`Not enough stock! Only ${product.qty} remaining.`);

  // Deduct Stock
  product.qty -= qty;

  const total = product.price * qty;
  const receiptId = 'REC-' + Math.floor(100000 + Math.random() * 900000);
  const dateStr = new Date().toISOString().split('T')[0];

  const newSale = {
    receiptId,
    date: dateStr,
    customer: customerName,
    product: product.name,
    unitPrice: product.price,
    qty,
    total,
    method
  };

  state.sales.unshift(newSale);

  // Automatically record to Banking
  state.banking.unshift({
    id: Date.now(),
    date: dateStr,
    ref: `Sale ${receiptId} (${customerName})`,
    type: "Deposit",
    method: method,
    status: "Cleared",
    amount: total
  });

  renderStock();
  renderSales();
  renderBanking();
  updateDropdowns();
  updateDashboard();
  showReceipt(receiptId);
  e.target.reset();
}

function renderSales() {
  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = state.sales.map(s => `
    <tr>
      <td><strong>${s.receiptId}</strong></td>
      <td>${s.date}</td>
      <td>${s.customer}</td>
      <td>${s.product}</td>
      <td>${s.qty}</td>
      <td><strong>${formatMoney(s.total)}</strong></td>
      <td>
        <button class="action-btn btn-view" onclick="showReceipt('${s.receiptId}')">View Receipt</button>
      </td>
    </tr>
  `).join("");
}

// Receipt Rendering
function showReceipt(receiptId) {
  const sale = state.sales.find(s => s.receiptId === receiptId);
  if (!sale) return;

  const html = `
    <div class="receipt-card">
      <div class="receipt-header">
        <h3>Lindiwe's Bakery</h3>
        <p>123 Fresh Bakery Way, Cape Town</p>
        <p><strong>Receipt #:</strong> ${sale.receiptId}</p>
        <p><strong>Date:</strong> ${sale.date}</p>
      </div>
      <div class="receipt-row">
        <span>Customer:</span>
        <strong>${sale.customer}</strong>
      </div>
      <div class="receipt-row">
        <span>Payment Method:</span>
        <span>${sale.method}</span>
      </div>
      <hr style="margin:12px 0; border:none; border-top:1px dashed var(--border-color);" />
      <div class="receipt-row">
        <span>${sale.product} (x${sale.qty})</span>
        <span>${formatMoney(sale.total)}</span>
      </div>
      <div class="receipt-row receipt-total">
        <span>Total Paid:</span>
        <span>${formatMoney(sale.total)}</span>
      </div>
      <p style="text-align:center; margin-top:16px; font-size:12px; color:var(--text-light);">Thank you for baking with us!</p>
    </div>
  `;

  document.getElementById("receiptContent").innerHTML = html;
  document.getElementById("modalReceiptContent").innerHTML = html;
  document.getElementById("receiptModal").classList.add("active");
}

function closeModal() {
  document.getElementById("receiptModal").classList.remove("active");
}

function handleSearchReceipt(e) {
  const query = e.target.value.toLowerCase();
  const filtered = state.sales.filter(s => 
    s.receiptId.toLowerCase().includes(query) ||
    s.customer.toLowerCase().includes(query) ||
    s.product.toLowerCase().includes(query)
  );

  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td><strong>${s.receiptId}</strong></td>
      <td>${s.date}</td>
      <td>${s.customer}</td>
      <td>${s.product}</td>
      <td>${s.qty}</td>
      <td><strong>${formatMoney(s.total)}</strong></td>
      <td>
        <button class="action-btn btn-view" onclick="showReceipt('${s.receiptId}')">View Receipt</button>
      </td>
    </tr>
  `).join("");
}

// Banking Handlers
function handleAddBanking(e) {
  e.preventDefault();
  const bank = document.getElementById("bankAccount").value;
  const type = document.getElementById("transactionType").value;
  const amount = parseFloat(document.getElementById("bankAmount").value);
  const ref = document.getElementById("bankRef").value;

  state.banking.unshift({
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    ref: `${ref} (${bank})`,
    type: type,
    method: "Manual Entry",
    status: "Cleared",
    amount: amount
  });

  renderBanking();
  e.target.reset();
}

function renderBanking() {
  const tbody = document.getElementById("bankingTableBody");
  tbody.innerHTML = state.banking.map(b => `
    <tr>
      <td>${b.date}</td>
      <td><strong>${b.ref}</strong></td>
      <td>${b.type} (${b.method})</td>
      <td><span class="badge badge-success">${b.status}</span></td>
      <td style="color: ${b.type === 'Deposit' ? '#2e7d32' : '#c62828'}; font-weight: 700;">
        ${b.type === 'Deposit' ? '+' : '-'}${formatMoney(b.amount)}
      </td>
    </tr>
  `).join("");
}
