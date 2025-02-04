const puppeteer = require("puppeteer-core");
const chromium = require("chrome-aws-lambda");

async function getStock(articleCode) {
    const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath || "/usr/bin/chromium-browser",
        headless: true,
        ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    try {
        console.log(`Buscando el stock para el artículo: ${articleCode}`);

        await page.goto("https://go.zureo.com/", { waitUntil: "networkidle2" });

        await page.type('input[placeholder="Código de empresa..."]', "218871250018");
        await page.type('input[placeholder="Correo electrónico..."]', "ytejas.86@gmail.com");
        await page.type('input[placeholder="Contraseña..."]', "1qazxsw23edc");

        await page.click('button[type="submit"]');

        try {
            await page.waitForSelector('button.z-btn.btn-primary', { timeout: 5000 });
            await page.click('button.z-btn.btn-primary');
        } catch {
            console.log("El mensaje 'Continuar' no apareció. Continuando...");
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

        console.log(`Stock encontrado: ${stock}`);
        return stock;
    } catch (error) {
        console.error("Error en el scraping:", error.message);
        return null;
    } finally {
        await browser.close();
    }
}

module.exports = getStock;
