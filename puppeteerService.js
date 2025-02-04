const puppeteer = require("puppeteer-core");

async function getStock(articleCode) {
    let browser = null;

    try {
        console.log("🔵 Conectando a Browserless...");

        // Obtener el token desde la variable de entorno
        const browserlessToken = process.env.BROWSERLESS_TOKEN;
        if (!browserlessToken) {
            throw new Error("❌ No se encontró la variable de entorno BROWSERLESS_TOKEN.");
        }

        // Conectar a Browserless usando el token de la variable de entorno
        browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`,
        });

        const page = await browser.newPage();
        console.log(`🟢 Conectado correctamente. Buscando stock para: ${articleCode}`);

        // 🔹 PASO 1: Ir a la página de login
        await page.goto("https://go.zureo.com/", { waitUntil: "networkidle2" });

        // 🔹 PASO 2: Iniciar sesión
        await page.type('input[placeholder="Código de empresa..."]', "218871250018", { delay: 100 });
        await page.type('input[placeholder="Correo electrónico..."]', "ytejas.86@gmail.com", { delay: 100 });
        await page.type('input[placeholder="Contraseña..."]', "1qazxsw23edc", { delay: 100 });

        await page.click('button[type="submit"]');

        // 🔹 PASO 3: Esperar a que la página cargue después del login
        await page.waitForNavigation({ waitUntil: "networkidle2" });

        // 🔹 PASO 4: Si aparece el botón "Continuar", hacer click
        try {
            await page.waitForSelector('button.z-btn.btn-primary', { timeout: 5000 });
            await page.click('button.z-btn.btn-primary');
            console.log("✅ Botón 'Continuar' presionado.");
            await page.waitForNavigation({ waitUntil: "networkidle2" });
        } catch {
            console.log("⚠️ No apareció el mensaje 'Continuar'. Procediendo...");
        }

        // 🔹 PASO 5: Navegar a la página de stock
        await page.goto("https://go.zureo.com/#/informes/stockarticulo", { waitUntil: "networkidle2" });

        console.log("⌛ Esperando el campo de búsqueda...");
        await page.waitForSelector('input[placeholder="Buscar..."]', { timeout: 10000 });

        // 🔹 PASO 6: Buscar el artículo
        await page.type('input[placeholder="Buscar..."]', articleCode);
        await page.waitForSelector('li.uib-typeahead-match a', { timeout: 10000 });
        await page.click('li.uib-typeahead-match a');

        // 🔹 PASO 7: Consultar stock
        await page.waitForSelector('#consultar', { timeout: 10000 });
        await page.click('#consultar');

        await page.waitForSelector('h1.z-heading.m-n.ng-binding', { timeout: 10000 });
        const stock = await page.evaluate(() => {
            const stockElement = document.querySelector('h1.z-heading.m-n.ng-binding');
            return stockElement ? parseFloat(stockElement.innerText.trim().replace(',', '.')) : null;
        });

        console.log(`✅ Stock encontrado para ${articleCode}: ${stock}`);
        return stock;
    } catch (error) {
        console.error("❌ Error en el scraping:", error.message);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = getStock;
