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

        try {
            // 🔹 Asegurar que el input de búsqueda está presente
            await page.waitForSelector('input[placeholder="Buscar..."]', { timeout: 10000 });

            // 🔹 Limpiar el input antes de escribir el nuevo código
            await page.evaluate(() => {
                const input = document.querySelector('input[placeholder="Buscar..."]');
                input.value = "";
                input.dispatchEvent(new Event("input", { bubbles: true }));
            });

            // 🔹 Insertar el código del artículo en el campo de búsqueda
            await page.type('input[placeholder="Buscar..."]', articleCode, { delay: 100 });

            // 🔹 Reintentar la búsqueda hasta 3 veces si no aparece la lista de selección
            let retries = 3;
            while (retries > 0) {
                try {
                    await page.waitForSelector('li.uib-typeahead-match a', { timeout: 5000 });
                    break; // Si lo encuentra, salir del loop
                } catch {
                    console.log(`⏳ Reintentando búsqueda para ${articleCode}...`);
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar antes de reintentar
                }
            }

            // 🔹 Asegurar que el primer resultado sea clickeable antes de hacer clic
            const firstResult = await page.$('li.uib-typeahead-match a');
            if (firstResult) {
                await firstResult.click();
                console.log(`✅ Seleccionado artículo: ${articleCode}`);
            } else {
                console.error(`❌ No se encontró un resultado para ${articleCode}`);
                stockResults[articleCode] = null;
                continue;
            }

            // 🔹 Consultar stock
            await page.waitForSelector('#consultar', { timeout: 5000 });
            await page.click('#consultar');

            // 🔹 Esperar el resultado de stock
            await page.waitForSelector('h1.z-heading.m-n.ng-binding', { timeout: 8000 });
            const stock = await page.evaluate(() => {
                const stockElement = document.querySelector('h1.z-heading.m-n.ng-binding');
                return stockElement ? parseFloat(stockElement.innerText.trim().replace(',', '.')) : null;
            });

            console.log(`✅ Stock para ${articleCode}: ${stock}`);
            stockResults[articleCode] = stock;
        } catch (error) {
            console.error(`❌ Error en la consulta de stock para ${articleCode}:`, error.message);
            stockResults[articleCode] = null;
        }

        // 🔹 Esperar 2 segundos antes de la siguiente consulta
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return stockResults;
}


module.exports = { connectAndLogin, getStockWithSession };
