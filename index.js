const express = require("express");
const app = express();

// Imposta il limite del corpo della richiesta
app.use(express.json({ limit: "1000mb" }));

// Funzione per processare le righe e includere Giacenza e QtaImpegnata
function processRows(rows, includeAcconto = false) {
  if (!Array.isArray(rows)) {
    throw new Error("Formato dati non valido. Si aspetta un array di righe.");
  }

  // Raggruppa le righe per NumDoc e DataDoc
  const groupedDocs = {};

  rows.forEach((row) => {
    const acconto = parseFloat(row.Pagam_AccontoDaIncludere) || 0;
    const key = `${row.NumDoc}-${row.DataDoc}`;

    // Se includeAcconto è true, filtra le righe con acconto > 0
    if (includeAcconto && acconto <= 0) {
      return;
    }

    if (!includeAcconto && acconto > 0) {
      return;
    }

    if (!groupedDocs[key]) {
      groupedDocs[key] = {
        NumDoc: row.NumDoc,
        DataDoc: row.DataDoc,
        Desc: row.Desc,
        NoteInterne: row.NoteInterne,
        Anagr_Nome: row.Anagr_Nome,
        acconto: acconto, // Includi l'acconto a livello di gruppo
        rows: [],
      };
    }

    groupedDocs[key].rows.push(row);
  });

  const result = [];

  // Itera su ogni gruppo di documenti
  Object.values(groupedDocs).forEach((group) => {
    const { rows } = group;

    // Calcola saleableStatuses per il gruppo
    const saleableStatuses = rows.map((row) => Number(row.saleable));

    const allProcessable = saleableStatuses.every((status) => status === 1);
    const someProcessable = saleableStatuses.some((status) => status === 1);
    const someArrivingProducts = saleableStatuses.some(
      (status) => status === 2
    );

    let groupStatus;
    if (someArrivingProducts && someProcessable) {
      groupStatus = "Arriving products";
    } else if (someArrivingProducts) {
      groupStatus = "Arriving products";
    } else if (allProcessable) {
      groupStatus = "Processable";
    } else if (someProcessable) {
      groupStatus = "Almost processable";
    } else {
      groupStatus = "Not processable";
    }

    // Condizioni per includere il gruppo nel risultato
    if (groupStatus === "Processable") {
      // Crea l'array di articoli includendo Giacenza e QtaImpegnata
      const articoli = rows.map((row) => ({
        CodArticolo: row.CodArticolo,
        QtaRiga: parseInt(row.QtaRiga, 10) || 0, // Converti QtaRiga in intero
        Giacenza: parseInt(row.Giacenza, 10) || 0,
        Desc: row.Desc || "", // Aggiungi Giacenza
        QtaImpegnata: parseInt(row.QtaImpegnata, 10) || 0, // Aggiungi QtaImpegnata
      }));

      result.push({
        NumDoc: group.NumDoc,
        DataDoc: group.DataDoc,
        NoteInterne: group.NoteInterne,
        Anagr_Nome: group.Anagr_Nome,
        acconto: group.acconto, // Includi l'acconto a livello di gruppo
        articoli,
      });
    }
  });

  // Ordina il risultato per 'DataDoc' dal più vecchio al più nuovo
  result.sort((a, b) => new Date(a.DataDoc) - new Date(b.DataDoc));

  return result;
}

// Prima API: /process-rows
app.post("/process-rows", (req, res) => {
  try {
    const rows = req.body;
    const processedRows = processRows(rows, false);
    res.json(processedRows);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

// Seconda API: /process-rows-with-acconto
app.post("/process-rows-with-acconto", (req, res) => {
  try {
    const rows = req.body;
    const processedRows = processRows(rows, true);
    res.json(processedRows);
  } catch (error) {
    res.status(400).json({
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server avviato su http://${HOST}:${PORT}`);
});
