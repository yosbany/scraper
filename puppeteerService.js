const puppeteer = require("puppeteer");

async function getStock(articleCode) {
    const browser = await puppeteer.launch({ headless: true }); // Modo oculto
    const page = await browser.newPage();

    try {
        console.log(`Buscando el stock para el artículo: ${articleCode}`);

        // Navegar a Zureo
        await page.goto("https://go.zureo.com/", { waitUntil: "networkidle2" });

        // Completar formulario de inicio de sesión
        await page.type('input[placeholder="Código de empresa..."]', "218871250018");
        await page.type('input[placeholder="Correo electrónico..."]', "ytejas.86@gmail.com");
        await page.type('input[placeholder="Contraseña..."]', "1qazxsw23edc");

        // Iniciar sesión
        await page.click('button[type="submit"]');

        // Manejar el mensaje "Continuar"
        try {
            await page.waitForSelector('button.z-btn.btn-primary', { timeout: 5000 });
            await page.click('button.z-btn.btn-primary');
        } catch {
            console.log("El mensaje 'Continuar' no apareció. Continuando...");
        }

        // Navegar a la página de stock
        await page.goto("https://go.zureo.com/#/informes/stockarticulo", { waitUntil: "networkidle2" });

        // Buscar el artículo
        await page.$eval('input[placeholder="Buscar..."]', (input, value) => {
            input.value = value;
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }, articleCode);

        // Seleccionar el primer resultado
        await page.waitForSelector('li.uib-typeahead-match a');
        await page.click('li.uib-typeahead-match a');

        // Hacer clic en "Consultar"
        await page.click('#consultar');

        // Extraer el stock
        await page.waitForSelector('h1.z-heading.m-n.ng-binding');
        const stock = await page.evaluate(() => {
            const stockElement = document.querySelector('h1.z-heading.m-n.ng-binding');
            if (stockElement) {
                const stockValue = stockElement.innerText.trim();
                return parseFloat(stockValue.replace(',', '.')); // Devolver número flotante
            }
            return null;
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