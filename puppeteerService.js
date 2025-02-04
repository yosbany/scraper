const puppeteer = require("puppeteer-core");

// 🔹 Definir API Key de Browserless fuera de la función
if (!process.env.BROWSERLESS_TOKEN) {
    process.env.BROWSERLESS_TOKEN = "tu-api-key-aqui"; // ⚠️ Reemplázalo con tu API Key de Browserless
}

/**
 * Conectar a Browserless y autenticarse en Zureo.
 * @returns {Promise<{ browser: any, page: any }>} Devuelve el navegador y la página autenticada.
 */
async function connectAndLogin() {
    console.log("🔵 Conectando a Browserless...");

    const browserlessToken = process.env.BROWSERLESS_TOKEN;
    if (!browserlessToken) {
        throw new Error("❌ No se encontró la variable de entorno BROWSERLESS_TOKEN.");
    }

    // Conectar a Browserless
    const browser = await puppeteer.connect({
        browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`,
    });
    console.log("✅ Navegador conectado a Browserless");

    const page = await browser.newPage();
    console.log("🟢 Página inicializada, procediendo con el login...");

    // Ir a la página de login
    await page.goto("https://go.zureo.com/", { waitUntil: "networkidle2" });

    // Escribir credenciales en los campos
    await page.evaluate(() => {
        document.querySelector('input[placeholder="Código de empresa..."]').value = "218871250018";
        document.querySelector('input[placeholder="Correo electrónico..."]').value = "ytejas.86@gmail.com";
        document.querySelector('input[placeholder="Contraseña..."]').value = "1qazxsw23edc";
    });

    // Disparar eventos para que el sistema detecte las credenciales
    await page.evaluate(() => {
        document.querySelector('input[placeholder="Código de empresa..."]').dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelector('input[placeholder="Correo electrónico..."]').dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelector('input[placeholder="Contraseña..."]').dispatchEvent(new Event("input", { bubbles: true }));
    });

    // Hacer clic en el botón de login
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log("🔑 Autenticación completada en Zureo");

    // Si aparece el botón "Continuar", hacer click
    const continuarButton = await page.$('button.z-btn.btn-primary');
    if (continuarButton) {
        await continuarButton.click();
        console.log("✅ Botón 'Continuar' presionado.");
        await page.waitForNavigation({ waitUntil: "networkidle2" });
    } else {
        console.log("⚠️ No apareció el mensaje 'Continuar'. Procediendo...");
    }

    return { browser, page };
}

/**
 * Obtener el stock de varios artículos usando la misma sesión autenticada.
 * @param {any} page - Página autenticada en Zureo.
 * @param {Array<string>} articleCodes - Lista de códigos de artículos a consultar.
 */
async function getStockWithSession(page, articleCodes) {
    console.log("📦 Navegando a la página de stock...");
    await page.goto("https://go.zureo.com/#/informes/stockarticulo", { waitUntil: "networkidle2" });

    const stockResults = {};

    for (let articleCode of articleCodes) {
        console.log(`🔍 Buscando stock para: ${articleCode}`);

        // Buscar el artículo en el campo de búsqueda
        await page.waitForSelector('input[placeholder="Buscar..."]', { timeout: 8000 });
        await page.evaluate((code) => {
            const input = document.querySelector('input[placeholder="Buscar..."]');
            if (input) {
                input.value = code;
                input.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }, articleCode);

        // Seleccionar el primer resultado de la lista
        await page.waitForSelector('li.uib-typeahead-match a', { timeout: 5000 });
        await page.evaluate(() => {
            document.querySelector('li.uib-typeahead-match a').click();
        });

        // Consultar stock
        await page.waitForSelector('#consultar', { timeout: 5000 });
        await page.click('#consultar');

        // Obtener el stock
        await page.waitForSelector('h1.z-heading.m-n.ng-binding', { timeout: 8000 });
        const stock = await page.evaluate(() => {
            const stockElement = document.querySelector('h1.z-heading.m-n.ng-binding');
            return stockElement ? parseFloat(stockElement.innerText.trim().replace(',', '.')) : null;
        });

        console.log(`✅ Stock para ${articleCode}: ${stock}`);
        stockResults[articleCode] = stock;

        // Esperar un momento antes de la siguiente consulta
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return stockResults;
}

module.exports = { connectAndLogin, getStockWithSession };
