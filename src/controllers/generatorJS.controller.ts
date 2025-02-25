import generatorService from '../services/generatorJS.service';
import path from 'path';
import { Request, Response } from 'express';
import fs from 'fs';
import archiver from 'archiver';

const ensureDirExists = (dir: string): void => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};
const capitalizeType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
};

const genModels = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'models');
    ensureDirExists(outputDir);

    for (const modelo of modelos) {
        if (!modelo.name || !modelo.fields) {
            console.error(`Modelo inválido: falta 'name' o 'fields'`);
            continue;
        }

        try {
            const name = modelo.name;
            const fields = modelo.fields;
            const modelContent = generatorService.genJsModel(name, fields);
            const filePath = path.join(outputDir, `${name}.model.js`);
            fs.writeFileSync(filePath, modelContent);
            console.log(`Modelo ${name} generado en ${filePath}`);
        } catch (error: any) {
            console.error(`Error al generar el modelo ${modelo.name}: ${error.message}`);
        }
    }
};

const genControllers = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'controllers');
    ensureDirExists(outputDir);

    for (const modelo of modelos) {
        if (!modelo.name) {
            console.error(`Controlador inválido: falta 'name'`);
            continue;
        }

        try {
            const name = modelo.name;
            const controllerContent = generatorService.genMongooseJSController(name);
            const filePath = path.join(outputDir, `${name}.controller.js`);
            fs.writeFileSync(filePath, controllerContent);
            console.log(`Controlador ${name} generado en ${filePath}`);
        } catch (error: any) {
            console.error(`Error al generar el controlador ${modelo.name}: ${error.message}`);
        }
    }
};

const genRoutes = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'routes');
    ensureDirExists(outputDir);

    for (const modelo of modelos) {
        if (!modelo.name) {
            console.error(`Ruta inválida: falta 'name'`);
            continue;
        }

        try {
            const { name } = modelo;
            const routesContent = generatorService.genMongooseJSRoutes(name);
            const filePath = path.join(outputDir, `${name}.routes.js`);
            fs.writeFileSync(filePath, routesContent);
            console.log(`Rutas ${name} generadas en ${filePath}`);
        } catch (error: any) {
            console.error(`Error al generar las rutas ${modelo.name}: ${error.message}`);
        }
    }
};

const genIndex = (modelos: any[], dir: string, projectName: string): void => {
    const outputDir = path.join(dir, 'index.js');
    const names = modelos.map(modelo => modelo.name);
    const indexContent = generatorService.genMongooseJSIndex(names, projectName);
    fs.writeFileSync(outputDir, indexContent);
    console.log(`Index generado en ${outputDir}`);
};

const genPackageJson = (projectName: string): any => {
    return generatorService.genPackageJson(projectName);
};

const createJSProject = async (req: Request, res: Response): Promise<void> => {
    const { modelos, projectName } = req.body;

    if (!modelos || !projectName) {
        res.status(400).send('Faltan datos');
        return;
    }

    const outputBaseDir = path.join(__dirname, '..', '..', '..', 'outputs');
    console.log(`Output base directory: ${outputBaseDir}`);
    ensureDirExists(outputBaseDir);

    const projectDir = path.join(outputBaseDir, projectName);
    console.log(`Project directory: ${projectDir}`);
    ensureDirExists(projectDir);

    try {
        const srcDir = path.join(projectDir, 'src');
        console.log(`Source directory: ${srcDir}`);
        ensureDirExists(srcDir);

        // Generar modelos, servicios, controladores, rutas, etc.
        genModels(modelos, srcDir);
        genJsService(modelos, srcDir);
        genControllers(modelos, srcDir);
        genRoutes(modelos, srcDir);
        genIndex(modelos, srcDir, projectName);
        genJsSwagger(modelos, srcDir, projectName);

        const packageJsonContent = genPackageJson(projectName);
        fs.writeFileSync(path.join(projectDir, 'package.json'), packageJsonContent);
        console.log(`package.json generado en: ${projectDir}`);

        // Crear el archivo ZIP
        const zipFilePath = path.join(outputBaseDir, `${projectName}.zip`);
        console.log(`Ruta del archivo ZIP: ${zipFilePath}`);

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`ZIP creado: ${zipFilePath} (${archive.pointer()} bytes)`);
            res.download(zipFilePath, `${projectName}.zip`, (err) => {
                if (err) {
                    console.error('Error al descargar archivo ZIP:', err);
                    res.status(500).send('Error al descargar el archivo');
                }
                fs.unlinkSync(zipFilePath);
                fs.rmSync(projectDir, { recursive: true, force: true });
                console.log(`Directorio del proyecto eliminado: ${projectDir}`);
            });
        });

        archive.on('error', (err) => {
            console.error('Error en el archivo ZIP:', err);
            res.status(500).send('Error al crear el archivo ZIP');
        });

        archive.pipe(output);
        archive.directory(projectDir, false);
        await archive.finalize();

    } catch (error) {
        console.error('Error en la creación del proyecto:', error);
        res.status(500).send('Error al crear el proyecto');
    }
};

const genJsService = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'services');
    ensureDirExists(outputDir);

    for (const modelo of modelos) {
        if (!modelo.name) {
            console.error(`Servicio inválido: falta 'name'`);
            continue;
        }

        try {
            const name = modelo.name;
            const serviceContent = generatorService.genMongooseJSService(name);
            const filePath = path.join(outputDir, `${name}.service.js`);
            fs.writeFileSync(filePath, serviceContent);
            console.log(`Servicio ${name} generado en ${filePath}`);
        } catch (error: any) {
            console.error(`Error al generar el servicio ${modelo.name}: ${error.message}`);
        }
    }
};

const genJsSwagger = (modelos: any[], dir: string, name: string): void => {
    const outputDir = path.join(dir);
    ensureDirExists(outputDir);
    const swaggerContent = generatorService.genSwaggerJs(modelos, name);
    const filePath = path.join(outputDir, 'swagger.js');
    fs.writeFileSync
    (filePath, swaggerContent);
    console.log(`Swagger generado en ${filePath}`);
}



export default {
    createJSProject
};
