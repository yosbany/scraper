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
            <li><b>/auth</b> - Inicia sesión en Zureo y genera una nueva sesión.</li>
            <li><b>/stock/:articleCode</b> - Consulta el stock de <b>un solo artículo</b> usando la misma sesión.</li>
        </ul>

        <h2>🔍 Ejemplos de uso:</h2>

        <h3>1️⃣ Paso 1: Iniciar sesión</h3>
        <p>Haz clic en este enlace para autenticar en Zureo (siempre crea una nueva sesión):</p>
        <a href="/auth" target="_blank">
            <button>🔑 Iniciar Sesión en Zureo</button>
        </a>

        <h3>2️⃣ Paso 2: Consultar stock</h3>
        <p>Después de autenticarse, usa estos enlaces para consultar stock de algunos artículos:</p>
        
        <ul>
            <li><a href="/stock/P1602" target="_blank"><button>📦 Consultar Stock de P1602</button></a></li>
            <li><a href="/stock/P0999" target="_blank"><button>📦 Consultar Stock de P0999</button></a></li>
            <li><a href="/stock/P2500" target="_blank"><button>📦 Consultar Stock de P2500</button></a></li>
            <li><a href="/stock/P3201" target="_blank"><button>📦 Consultar Stock de P3201</button></a></li>
            <li><a href="/stock/P4507" target="_blank"><button>📦 Consultar Stock de P4507</button></a></li>
        </ul>

        <p><b>⚠️ Nota:</b> Primero debes llamar a <b>/auth</b> antes de consultar el stock.</p>
    `);
});

// 🔹 Ruta para iniciar sesión en Zureo y generar una NUEVA sesión cada vez que se llame
app.get("/auth", async (req, res) => {
    try {
        if (browserInstance && pageInstance) {
            console.log("✅ Sesión activa, reutilizando...");
            return res.json({ message: "Sesión activa", sessionActive: true });
        }

        console.log("🔵 No hay sesión activa, iniciando una nueva sesión en Zureo...");
        const { browser, page } = await connectAndLogin();
        browserInstance = browser;
        pageInstance = page;

        res.json({ message: "Nueva sesión iniciada correctamente", sessionActive: true });
    } catch (error) {
        console.error("❌ Error al iniciar sesión:", error.message);
        res.status(500).json({ error: "Error al iniciar sesión en Zureo" });
    }
});

// 🔹 Ruta para obtener stock de UN SOLO artículo con la sesión activa
app.get("/stock/:articleCode", async (req, res) => {
    const articleCode = req.params.articleCode;

    try {
        if (!browserInstance || !pageInstance) {
            console.log("⚠️ No hay sesión activa, intentando iniciar una nueva...");
            const { browser, page } = await connectAndLogin();
            browserInstance = browser;
            pageInstance = page;
        }

        console.log(`🔍 Consultando stock para: ${articleCode}`);
        const stocks = await getStockWithSession(pageInstance, [articleCode]); // Solo un código

        res.json({ articleCode, stock: stocks[articleCode] });
    } catch (error) {
        console.error("❌ Error en la consulta de stock, intentando reabrir sesión...", error.message);
        try {
            console.log("🔄 Intentando reiniciar la sesión...");
            const { browser, page } = await connectAndLogin();
            browserInstance = browser;
            pageInstance = page;
            console.log(`🔍 Reintentando consulta para: ${articleCode}`);
            const stocks = await getStockWithSession(pageInstance, [articleCode]);
            res.json({ articleCode, stock: stocks[articleCode] });
        } catch (retryError) {
            console.error("❌ Falló el reintento de consulta de stock:", retryError.message);
            res.status(500).json({ error: "Error interno del servidor tras reintento" });
        }
    }
});

// Iniciar el servidor en el puerto dinámico de Railway
app.listen(port, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${port}`);
});
