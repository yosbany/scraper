const express = require("express");
const cors = require("cors");
const getStock = require("./puppeteerService");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // Habilitar CORS para permitir solicitudes desde otros dominios

// Ruta base para que no muestre "Cannot GET /"
app.get("/", (req, res) => {
    res.send("¡Bienvenido a la API de scraping de Zureo! Usa /stock/{codigo} para obtener el stock.");
});

// Endpoint para obtener el stock de un artículo
app.get("/stock/:articleCode", async (req, res) => {
    const { articleCode } = req.params;
    try {
        const stock = await getStock(articleCode);
        if (stock === null) {
            res.status(404).json({ error: "No se pudo obtener el stock" });
        } else {
            res.json({ articleCode, stock });
        }
    } catch (error) {
        console.error("Error en el servidor:", error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
