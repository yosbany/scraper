const chromium = require("chrome-aws-lambda");
const puppeteer = require("puppeteer-core");

async function getStock(articleCode) {
    let browser = null;

    try {
        console.log("🔵 Iniciando Puppeteer con chrome-aws-lambda...");

        // Intentar obtener la ruta del navegador
        const executablePath = await chromium.executablePath;

        if (!executablePath) {
            throw new Error("🔴 Chromium no se encuentra en el entorno de ejecución.");
        }

        browser = await puppeteer.launch({
            args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
            defaultViewport: chromium.defaultViewport,
        });

        const page = await browser.newPage();
        console.log(`🟢 Navegador iniciado correctamente. Buscando stock para: ${articleCode}`);

        await page.goto("https://go.zureo.com/", { waitUntil: "networkidle2" });

        await page.type('input[placeholder="Código de empresa..."]', "218871250018");
        await page.type('input[placeholder="Correo electrónico..."]', "ytejas.86@gmail.com");
        await page.type('input[placeholder="Contraseña..."]', "1qazxsw23edc");

        await page.click('button[type="submit"]');

        try {
            await page.waitForSelector('button.z-btn.btn-primary', { timeout: 5000 });
            await page.click('button.z-btn.btn-primary');
        } catch {
            console.log("⚠️ No apareció el mensaje 'Continuar'. Procediendo...");
        }

        await page.goto("https://go.zureo.com/#/informes/stockarticulo", { waitUntil: "networkidle2" });

        await page.$eval('input[placeholder="Buscar..."]', (input, value) => {
            input.value = value;
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }, articleCode);

        await page.waitForSelector('li.uib-typeahead-match a');
        await page.click('li.uib-typeahead-match a');

        await page.click('#consultar');

        await page.waitForSelector('h1.z-heading.m-n.ng-binding');
        const stock = await page.evaluate(() => {
            const stockElement = document.querySelector('h1.z-heading.m-n.ng-binding');
            return stockElement ? parseFloat(stockElement.innerText.trim().replace(',', '.')) : null;
        });

        console.log(`✅ Stock encontrado: ${stock}`);
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
