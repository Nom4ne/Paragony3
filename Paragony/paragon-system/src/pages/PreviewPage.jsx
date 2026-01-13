import React, { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import Barcode from "react-barcode";

// BAZA API — TYLKO HTTPS (TWÓJ BACKEND)
const API_BASE = "https://localhost:7228";

// Format kwot
const formatCurrency = (v) => Number(v || 0).toFixed(2);

// --- VAT: sumowanie po stawkach ---
const computeVatGroupsFromItems = (items = []) => {
    const groups = {};
    let totalNetto = 0;
    let totalVat = 0;
    let totalBrutto = 0;

    for (const it of items) {
        const brutto = Number(it.totalAmount || 0);
        const rate = Number(it.vatRate ?? 0);
        const netto = rate === 0 ? brutto : brutto / (1 + rate / 100);
        const vat = brutto - netto;

        if (!groups[rate]) groups[rate] = { rate, netto: 0, vat: 0, brutto: 0 };

        groups[rate].netto += netto;
        groups[rate].vat += vat;
        groups[rate].brutto += brutto;

        totalNetto += netto;
        totalVat += vat;
        totalBrutto += brutto;
    }

    // zaokrąglenia
    for (const k of Object.keys(groups)) {
        groups[k].netto = Number(groups[k].netto.toFixed(2));
        groups[k].vat = Number(groups[k].vat.toFixed(2));
        groups[k].brutto = Number(groups[k].brutto.toFixed(2));
    }

    return {
        groups,
        totalNetto: Number(totalNetto.toFixed(2)),
        totalVat: Number(totalVat.toFixed(2)),
        totalBrutto: Number(totalBrutto.toFixed(2))
    };
};

const formatPhone = (num) => {
    if (!num) return "";
    let clean = num.toString().replace(/\s|-/g, "");

    if (clean.startsWith("+48")) {
        const rest = clean.slice(3).replace(/\D/g, "");
        const g = rest.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
        return `+48 ${g}`;
    }

    let prefix = "";
    if (clean.startsWith("+")) {
        const match = clean.match(/^\+(\d{1,3})/);
        if (match) {
            prefix = "+" + match[1];
            clean = clean.replace(match[0], "");
        }
    }

    let grouped = clean.replace(/\D/g, "").replace(/(\d{3})(?=\d)/g, "$1 ").trim();
    return prefix ? `${prefix} ${grouped}` : grouped;
};

const PreviewPage = ({ api, isDarkMode }) => {
    const [receipts, setReceipts] = useState([]);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [receipt, setReceipt] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    // PAGINACJA
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // === STYLE DARK MODE ===
    const theme = {
        card: isDarkMode ? "bg-gray-800 text-gray-100 border border-gray-700" : "bg-white text-gray-900 shadow",
        listBtnActive: isDarkMode ? "bg-blue-900/40 border-blue-500 text-white" : "bg-blue-100 border-blue-500 text-black",
        listBtnInactive: isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-50 hover:bg-gray-100 text-black",
        paginationBtn: isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50" : "bg-gray-200 hover:bg-gray-300 text-black disabled:opacity-50",
        textSecondary: isDarkMode ? "text-gray-400" : "text-gray-600",
        statusGreen: isDarkMode ? "text-green-400" : "text-green-600",
        statusYellow: isDarkMode ? "text-yellow-400" : "text-yellow-600",
        loadingText: isDarkMode ? "text-gray-300" : "text-black",
    };

    // Load receipts list (paginated)
    const loadReceipts = async () => {
        try {
            const data = await api.get(`/Receipts/list?page=${page}&pageSize=${pageSize}`);
            setReceipts(data.items || []);
            setTotalPages(data.totalPages || 1);
            setTotalCount(data.totalCount || 0);

            if (!selectedReceipt && data.items && data.items.length > 0) {
                setSelectedReceipt(data.items[0].id);
            }
        } catch (err) {
            console.error("Błąd ładowania paragonów:", err);
        }
    };

    useEffect(() => {
        loadReceipts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Load a single receipt and items
    const loadReceiptPreview = async (id) => {
        setLoading(true);
        try {
            const rec = await api.get(`/Receipts/${id}`);
            if (rec.items && Array.isArray(rec.items) && rec.items.length > 0) {
                setReceipt(rec);
                setItems(rec.items);
            } else {
                setReceipt(rec);
                const itm = await api.get(`/ReceiptItems/receipt/${id}`);
                setItems(itm || []);
            }
        } catch (err) {
            console.error("Błąd ładowania podglądu:", err);
            setReceipt(null);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedReceipt) loadReceiptPreview(selectedReceipt);
    }, [selectedReceipt]);

    // Printing
    const handlePrint = async () => {
        if (!selectedReceipt) return alert("Nie wybrano paragonu!");
        try {
            await api.post(`/Print/receipt/${selectedReceipt}`, {});
            alert("Paragon wysłany do drukarki!");
        } catch (err) {
            console.error("Błąd drukowania:", err);
            alert("Błąd drukowania.");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleString("pl-PL", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
    };

    // --- Rabat globalny ---
    const sumBruttoBefore = items.reduce((s, it) => s + Number(it.totalAmount || 0), 0);
    const discountPercent = Number(receipt?.discountPercent || 0);
    const discountAmountFromReceipt = Number(receipt?.discountAmount || 0);
    const computedDiscountAmount = discountAmountFromReceipt > 0
        ? discountAmountFromReceipt
        : (discountPercent > 0 ? (sumBruttoBefore * (discountPercent / 100)) : 0);
    const discountAmount = Number(computedDiscountAmount.toFixed(2));
    const finalTotal = Number((sumBruttoBefore - discountAmount).toFixed(2));

    // VAT groups
    const vatCalc = computeVatGroupsFromItems(items);

    const logoFileName = receipt?.template?.logoPath || receipt?.template?.logoFile || null;
    const logoUrl = logoFileName ? `${API_BASE}/api/images/${encodeURIComponent(logoFileName)}` : null;
    const receiptFont = receipt?.template?.fontStyle || "Consolas";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT - Lista paragonów */}
            <div className="lg:col-span-1">
                <div className={`rounded-lg p-4 ${theme.card}`}>
                    <h2 className="text-xl font-bold mb-4">Wybierz paragon</h2>

                    <div className="space-y-2">
                        {receipts.map(r => (
                            <button
                                key={r.id}
                                onClick={() => setSelectedReceipt(r.id)}
                                className={`w-full text-left p-3 rounded border-2 transition-colors ${selectedReceipt === r.id ? theme.listBtnActive : `border-transparent ${theme.listBtnInactive}`
                                    }`}
                            >
                                <div className="font-bold">{r.receiptNumber}</div>
                                <div className={`text-sm ${theme.textSecondary}`}>{formatCurrency(r.totalAmount)} zł</div>
                                <div className={`text-xs ${r.status === "printed" ? theme.statusGreen : theme.statusYellow}`}>
                                    {r.status}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* PAGINATION */}
                    <div className="flex justify-center mt-4 space-x-2">
                        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className={`px-3 py-1 rounded transition-colors ${theme.paginationBtn}`}>
                            ◀ Poprzednia
                        </button>
                        <span className="px-3 py-1">Strona {page} / {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className={`px-3 py-1 rounded transition-colors ${theme.paginationBtn}`}>
                            Następna ▶
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT - Podgląd */}
            <div className="lg:col-span-2">
                {loading ? (
                    <div className={`rounded-lg shadow p-8 text-center ${theme.card}`}>
                        <div className={`text-xl ${theme.loadingText}`}>Ładowanie...</div>
                    </div>
                ) : !receipt ? (
                    <div className={`rounded-lg shadow p-8 text-center ${theme.card} ${theme.textSecondary}`}>
                        Wybierz paragon z listy aby zobaczyć podgląd
                    </div>
                ) : (
                    <div className={`rounded-lg shadow p-6 ${theme.card}`}>
                        <h2 className="text-2xl font-bold mb-6 text-center">Podgląd paragonu</h2>

                        {/* --- PARAGON (ZAWSZE BIAŁY - SYMULACJA PAPIERU) --- */}
                        <div className="mx-auto bg-white text-black border-2 border-gray-300 p-4 shadow-xl"
                            style={{
                                width: "320px",
                                fontFamily: receiptFont,
                                fontSize: "11px",
                                lineHeight: "1.3",
                                color: "black",
                                backgroundColor: "white"
                            }}>

                            {/* HEADER + LOGO */}
                            <div className="text-center mb-2" style={{ fontSize: "10px" }}>
                                {logoUrl && (
                                    <img
                                        src={logoUrl}
                                        alt="Logo"
                                        className="mx-auto mb-2"
                                        style={{ maxHeight: 60, objectFit: "contain", display: "block" }}
                                        onError={(e) => { e.target.style.display = "none"; }}
                                    />
                                )}

                                {receipt.template?.headerText && receipt.template.headerText.split("\n").map((l, i) => (<div key={i}>{l}</div>))}
                            </div>

                            {/* CLIENT */}
                            {receipt.client && (
                                <div className="text-center mb-2" style={{ fontSize: "10px" }}>
                                    <div className="font-bold">{receipt.client.name}</div>
                                    <div>{receipt.client.address}</div>
                                    <div>{receipt.client.postalCode} {receipt.client.city}</div>
                                    <div>Tel: {formatPhone(receipt.client.phone) || "-"}</div>
                                    <div>Email: {receipt.client.email || "-"}</div>
                                    <div>NIP: {receipt.client.nip || "-"}</div>
                                </div>
                            )}

                            <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

                            <div className="text-center font-bold mb-1">PARAGON FISKALNY</div>

                            <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

                            {/* ITEMS */}
                            <div className="mb-2">
                                {items.map((item) => (
                                    <div key={item.id} className="mb-1">
                                        <div className="flex justify-between">
                                            <span className="flex-1">{item.name || item.productName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>{Number(item.quantity || 0).toFixed(2)} x {Number(item.unitPrice || 0).toFixed(2)} ({item.vatRate}%)</span>
                                            <span className="ml-auto">{formatCurrency(Number(item.totalAmount || (item.quantity * item.unitPrice || 0)))}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

                            {/* RABAT */}
                            {(discountAmount > 0) && (
                                <>
                                    <div className="flex justify-between text-red-600 mb-1">
                                        <span>Rabat {discountPercent > 0 ? `${discountPercent}%` : ""}</span>
                                        <span>-{formatCurrency(discountAmount)}</span>
                                    </div>
                                    <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
                                </>
                            )}

                            {/* SUMA */}
                            <div className="flex justify-between font-bold mb-1">
                                <span>SUMA:</span>
                                <span>{formatCurrency(finalTotal)} PLN</span>
                            </div>

                            <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

                            {/* VAT TABLE */}
                            <div className="mb-2" style={{ fontSize: "9px" }}>
                                <div className="flex justify-between border-b border-gray-400 pb-1">
                                    <span>PTU</span>
                                    <span>NETTO</span>
                                    <span>VAT</span>
                                    <span>BRUTTO</span>
                                </div>

                                {Object.values(vatCalc.groups).length === 0 ? (
                                    <div className="flex justify-between pt-1">
                                        <span>-</span>
                                        <span>{formatCurrency(0)}</span>
                                        <span>{formatCurrency(0)}</span>
                                        <span>{formatCurrency(0)}</span>
                                    </div>
                                ) : (
                                    Object.values(vatCalc.groups).map(g => (
                                        <div key={g.rate} className="flex justify-between pt-1">
                                            <span>{g.rate}%</span>
                                            <span>{formatCurrency(g.netto)}</span>
                                            <span>{formatCurrency(g.vat)}</span>
                                            <span>{formatCurrency(g.brutto)}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

                            {/* PAYMENT */}
                            <div className="mb-2">
                                <div className="font-bold mb-1">SPOSÓB PŁATNOŚCI:</div>
                                <div className="flex justify-between">
                                    <span>{receipt.paymentMethod?.displayName || receipt.paymentMethod?.name || "-"}</span>
                                    <span>{formatCurrency(finalTotal)} PLN</span>
                                </div>

                                {(receipt.paidAmount != null) && (
                                    <>
                                        <div className="flex justify-between">
                                            <span>Otrzymano:</span>
                                            <span>{formatCurrency(receipt.paidAmount)}</span>
                                        </div>
                                        {Number(receipt.changeAmount || 0) !== 0 && (
                                            <div className="flex justify-between">
                                                <span>Reszta:</span>
                                                <span>{formatCurrency(Math.abs(receipt.changeAmount || 0))}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

                            {/* DATES / NUMBERS */}
                            <div className="text-center mb-2" style={{ fontSize: "10px" }}>
                                <div>Utworzono: {formatDate(receipt.createdAt)}</div>
                                <div>Drukowanie: {formatDate(receipt.printedAt)}</div>
                                <div className="font-bold">NR PARAGONU: {receipt.receiptNumber}</div>
                                {receipt.fiscalNumber && <div>Nr fiskalny: {receipt.fiscalNumber}</div>}
                            </div>

                            {/* FOOTER */}
                            {receipt.template?.footerText && (
                                <div className="text-center mb-2" style={{ fontSize: "10px" }}>
                                    {receipt.template.footerText.split("\n").map((l, i) => (<div key={i}>{l}</div>))}
                                </div>
                            )}

                            <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />

                            {/* BARCODE */}
                            <div className="text-center mt-2">
                                <div className="inline-block">
                                    <Barcode
                                        value={receipt.receiptNumber || ""}
                                        width={1.6}
                                        height={50}
                                        displayValue={false}
                                        margin={0}
                                        format="CODE128"
                                        lineColor="#000000"
                                        background="#ffffff"
                                    />
                                    <div style={{ fontSize: "10px", marginTop: "4px", letterSpacing: "2px", color: "black" }}>
                                        {receipt.receiptNumber}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center space-x-4 mt-6">
                            <button
                                onClick={handlePrint}
                                disabled={loading}
                                className="bg-blue-600 text-white px-6 py-2 rounded flex items-center space-x-2 hover:bg-blue-700 disabled:opacity-50 shadow-lg"
                            >
                                <Printer size={18} />
                                <span>{loading ? "Wysyłanie..." : "Drukuj"}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreviewPage;