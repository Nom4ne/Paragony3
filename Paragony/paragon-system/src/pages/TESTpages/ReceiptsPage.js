import React, { useState, useEffect } from 'react';

const ReceiptsPage = ({ api, receipts, setReceipts }) => {

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadPagedReceipts = async () => {
        try {
            const data = await api.get(`/Receipts/list?page=${page}&pageSize=10`);
            setReceipts(data.items);         // ⬅ ustawiamy listę paragonów
            setTotalPages(data.totalPages);  // ⬅ liczba stron
        } catch (e) {
            console.error("Błąd ładowania paginacji:", e);
        }
    };

    // Odśwież listę gdy zmienia się strona
    useEffect(() => {
        loadPagedReceipts();
    }, [page]);

    return (
        <div className="p-6">

            <h1 className="text-2xl font-bold mb-4">Lista Paragonów</h1>

            {/* LISTA PARAGONÓW */}
            <div className="space-y-3">
                {receipts.map((r) => (
                    <div
                        key={r.id}
                        className="p-4 bg-gray-100 rounded shadow"
                    >
                        <p><b>Nr:</b> {r.receiptNumber}</p>
                        <p><b>Status:</b> {r.status}</p>
                        <p><b>Kwota:</b> {r.totalAmount} zł</p>
                    </div>
                ))}
            </div>

            {/* PAGINACJA */}
            <div className="flex justify-center items-center space-x-4 mt-6">

                <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className={`px-3 py-2 rounded 
                        ${page === 1 ? "bg-gray-300" : "bg-blue-600 text-white"}`}
                >
                    ◀
                </button>

                <span className="text-lg font-bold">
                    Strona {page} / {totalPages}
                </span>

                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className={`px-3 py-2 rounded 
                        ${page === totalPages ? "bg-gray-300" : "bg-blue-600 text-white"}`}
                >
                    ▶
                </button>

            </div>

        </div>
    );
};

export default ReceiptsPage;
