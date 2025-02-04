const express = require("express");
const cors = require("cors");
const { connectAndLogin, getStockWithSession } = require("./puppeteerService");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // Habilita CORS para evitar restricciones en el frontend

let browserInstance = null;
let pageInstance = null;

// 🔹 Ruta principal con ejemplos interactivos
app.get("/", (req, res) => {
    res.send(`
        <h1>🚀 API de Zureo Scraping en Railway</h1>
        <p>Esta API permite autenticar en Zureo y consultar stock de artículos usando una sesión persistente.</p>

        <h2>🔹 Rutas disponibles:</h2>
        <ul>
            <li><b>/auth</b> - Inicia sesión en Zureo y mantiene la sesión activa.</li>
            <li><b>/stock/:articleCodes</b> - Consulta el stock de varios artículos usando la misma sesión.</li>
        </ul>

        <h2>🔍 Ejemplos de uso:</h2>

        <h3>1️⃣ Paso 1: Iniciar sesión</h3>
        <p>Haz clic en este enlace para autenticar en Zureo:</p>
        <a href="/auth" target="_blank">
            <button>🔑 Iniciar Sesión en Zureo</button>
        </a>

        <h3>2️⃣ Paso 2: Consultar stock</h3>
        <p>Después de autenticarse, usa este enlace para consultar stock de múltiples artículos:</p>
        <a href="/stock/P1602,P0999" target="_blank">
            <button>📦 Consultar Stock de P1602 y P0999</button>
        </a>

        <p><b>⚠️ Nota:</b> Primero debes llamar a <b>/auth</b> antes de consultar el stock.</p>
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
