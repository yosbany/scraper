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

        // 🔹 PASO 2: Iniciar sesión rápidamente
        await Promise.all([
            page.type('input[placeholder="Código de empresa..."]', "218871250018"),
            page.type('input[placeholder="Correo electrónico..."]', "ytejas.86@gmail.com"),
            page.type('input[placeholder="Contraseña..."]', "1qazxsw23edc"),
        ]);

        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: "networkidle2" });

        // 🔹 PASO 3: Si aparece el botón "Continuar", hacer click
        const continuarButton = await page.$('button.z-btn.btn-primary');
        if (continuarButton) {
            await continuarButton.click();
            console.log("✅ Botón 'Continuar' presionado.");
            await page.waitForNavigation({ waitUntil: "networkidle2" });
        } else {
            console.log("⚠️ No apareció el mensaje 'Continuar'. Procediendo...");
        }

        // 🔹 PASO 4: Ir directamente a la página de stock
        await page.goto("https://go.zureo.com/#/informes/stockarticulo", { waitUntil: "networkidle2" });

        console.log("⌛ Buscando el artículo rápidamente...");
        await page.waitForSelector('input[placeholder="Buscar..."]', { timeout: 8000 });

        // 🔹 PASO 5: Buscar el artículo
        await page.evaluate((code) => {
            const input = document.querySelector('input[placeholder="Buscar..."]');
            if (input) {
                input.value = code;
                input.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }, articleCode);

        // Esperar a que aparezca la lista de selección y hacer clic en el primer elemento
        await page.waitForSelector('li.uib-typeahead-match a', { timeout: 5000 });
        await page.evaluate(() => {
            document.querySelector('li.uib-typeahead-match a').click();
        });

        // 🔹 PASO 6: Consultar stock
        await page.waitForSelector('#consultar', { timeout: 5000 });
        await page.click('#consultar');

        await page.waitForSelector('h1.z-heading.m-n.ng-binding', { timeout: 8000 });
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
