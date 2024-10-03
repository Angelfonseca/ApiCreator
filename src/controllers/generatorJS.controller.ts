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

const genModels = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'models');
    ensureDirExists(outputDir);

    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const modelContent = generatorService.genJsModel(name, fields);
        const filePath = path.join(outputDir, `${name}.model.js`);
        fs.writeFileSync(filePath, modelContent);
        console.log(`Modelo ${name} generado en ${filePath}`);
    }
};

const genControllers = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'controllers');
    ensureDirExists(outputDir);

    for (const modelo of modelos) {
        const name = modelo.name;
        const controllerContent = generatorService.genJsController(name);
        const filePath = path.join(outputDir, `${name}.controller.js`);
        fs.writeFileSync(filePath, controllerContent);
        console.log(`Controlador ${name} generado en ${filePath}`);
    }
};

const genRoutes = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'routes');
    ensureDirExists(outputDir);

    for (const modelo of modelos) {
        const { name } = modelo;
        const routesContent = generatorService.genJsRoutes(name);
        const filePath = path.join(outputDir, `${name}.routes.js`);
        fs.writeFileSync(filePath, routesContent);
        console.log(`Rutas ${name} generadas en ${filePath}`);
    }
};

const genIndex = (modelos: any[], dir: string, projectName: string): void => {
    const outputDir = path.join(dir, 'index.js');
    const names = modelos.map(modelo => modelo.name);
    const indexContent = generatorService.genJsIndex(names, projectName);
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
        genControllers(modelos, srcDir);
        genRoutes(modelos, srcDir);
        genIndex(modelos, srcDir, projectName);

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

export default {
    createJSProject
};
