const express = require("express");
const cors = require("cors");
const { connectAndLogin, getStockWithSession } = require("./puppeteerService");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // Habilita CORS para evitar restricciones en el frontend

let browserInstance = null;
let pageInstance = null;

// 🔹 Ruta principal para verificar que la API está funcionando
app.get("/", (req, res) => {
    res.send(`
        🚀 API de Zureo Scraping en Railway. <br>
        <b>Endpoints disponibles:</b> <br>
        🔹 <b>/auth</b> - Inicia sesión en Zureo y mantiene la sesión. <br>
        🔹 <b>/stock/:articleCodes</b> - Consulta el stock de varios artículos. <br>
        <br>
        <b>Ejemplo:</b> <a href='/stock/P1602,P0999'>/stock/P1602,P0999</a>
    `);
});

// 🔹 Ruta para iniciar sesión en Zureo y obtener una sesión activa
app.get("/auth", async (req, res) => {
    try {
        if (!browserInstance || !pageInstance) {
            console.log("🔵 Iniciando nueva sesión en Zureo...");
            const { browser, page } = await connectAndLogin();
            browserInstance = browser;
            pageInstance = page;
        } else {
            console.log("✅ Usando sesión existente.");
        }

        res.json({ message: "Sesión iniciada correctamente", sessionActive: true });
    } catch (error) {
        console.error("❌ Error al iniciar sesión:", error.message);
        res.status(500).json({ error: "Error al iniciar sesión en Zureo" });
    }
});

// 🔹 Ruta para obtener stock de múltiples artículos con la misma sesión
app.get("/stock/:articleCodes", async (req, res) => {
    const articleCodes = req.params.articleCodes.split(",");

    if (!browserInstance || !pageInstance) {
        return res.status(400).json({ error: "No hay una sesión activa. Primero llama a /auth" });
    }

    try {
        console.log(`🔍 Consultando stock para: ${articleCodes}`);
        const stocks = await getStockWithSession(pageInstance, articleCodes);

        res.json({ stocks });
    } catch (error) {
        console.error("❌ Error en la consulta de stock:", error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Iniciar el servidor en el puerto dinámico de Railway
app.listen(port, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${port}`);
});
