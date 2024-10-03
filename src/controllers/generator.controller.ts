import generatorService from '../services/generator.service';
import path from 'path';
import { Request, Response } from 'express';
import fs from 'fs';
import archiver from 'archiver';

const genModels = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'models');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const modelContent = generatorService.gentsModel(name, fields);

        const filePath = path.join(outputDir, `${name}.model.ts`);

        fs.writeFileSync(filePath, modelContent);
        console.log(`Modelo ${name} generado en ${filePath}`);
    }
};

const genServices = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'services');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const serviceContent = generatorService.gentsServices(name, fields);

        if (typeof serviceContent !== 'string') {
            console.error(`Error al generar el servicio para ${name}: el contenido es undefined.`);
            continue; 
        }

        const filePath = path.join(outputDir, `${name}.service.ts`);
        fs.writeFileSync(filePath, serviceContent);
        console.log(`Servicio ${name} generado en ${filePath}`);
    }
};
const genModelInterface = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'interfaces');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const interfaceContent = generatorService.gentsModelInterface(name, fields);

        const filePath = path.join(outputDir, `${name}.interface.ts`);

        fs.writeFileSync(filePath, interfaceContent);
        console.log(`Interface ${name} generado en ${filePath}`);
    }
}


const genControllers = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'controllers');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const controllerContent = generatorService.gentsControllers(name, fields);

        const filePath = path.join(outputDir, `${name}.controller.ts`);

        fs.writeFileSync(filePath, controllerContent);
        console.log(`Controlador ${name} generado en ${filePath}`);
    }
};

const genPackageJson = (projectName: string): any => {
    return generatorService.genPackageJson(projectName);
}


const genRoutes = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'routes');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const modelo of modelos) {
        const name = modelo.name;
        const routesContent = generatorService.gentsRoutes(name);

        const filePath = path.join(outputDir, `${name}.routes.ts`);

        fs.writeFileSync(filePath, routesContent);
        console.log(`Rutas ${name} generadas en ${filePath}`);
    }
};


const genIndex = (modelos: any[], dir: string, projectName: string): void => {
    const outputDir = path.join(dir, 'index.ts');

    const names = modelos.map(modelo => modelo.name);
    const indexContent = generatorService.gentsIndex(names, projectName);

    fs.writeFileSync(outputDir, indexContent);
    console.log(`Index generado en ${outputDir}`);
};

const createProject = async (req: Request, res: Response): Promise<void> => {
    const { modelos, projectName } = req.body;

    if (!modelos || !projectName) {
        res.status(400).send('Faltan datos');
        return;
    }

    const outputBaseDir = path.join(__dirname, '..', '..', '..', 'outputs');
    console.log(`Output base directory: ${outputBaseDir}`);

    if (!fs.existsSync(outputBaseDir)) {
        fs.mkdirSync(outputBaseDir, { recursive: true });
        console.log(`Directorio creado: ${outputBaseDir}`);
    }

    const projectDir = path.join(outputBaseDir, projectName);
    console.log(`Project directory: ${projectDir}`);

    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir);
        console.log(`Directorio del proyecto creado: ${projectDir}`);
    }

    const srcDir = path.join(projectDir, 'src');
    console.log(`Source directory: ${srcDir}`);

    if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir);
        console.log(`Directorio src creado: ${srcDir}`);
    }

    try {
        genModels(modelos, srcDir);
        genServices(modelos, srcDir);
        genControllers(modelos, srcDir);
        genModelInterface(modelos, srcDir);
        genRoutes(modelos, srcDir);
        genIndex(modelos, srcDir, projectName);

        const packageJsonContent = genPackageJson(projectName);
        fs.writeFileSync(path.join(projectDir, 'package.json'), packageJsonContent);
        console.log(`package.json creado en: ${projectDir}`);

        const bat = generatorService.generateBat(projectName);
        fs.writeFileSync(path.join(projectDir, 'start.bat'), bat);
        console.log(`start.bat creado en: ${projectDir}`);

        const tsconfig = generatorService.gentTsConfig();
        fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), tsconfig);
        console.log(`tsconfig.json creado en: ${projectDir}`);

        const zipFilePath = path.join(outputBaseDir, `${projectName}.zip`);
        console.log(`Ruta del archivo ZIP: ${zipFilePath}`);

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 } 
        });

        output.on('close', () => {
            console.log(`Archivo ZIP creado: ${zipFilePath} (${archive.pointer()} bytes)`);
            res.download(zipFilePath, `${projectName}.zip`, (err) => {
                if (err) {
                    console.error('Error al enviar el archivo:', err);
                    res.status(500).send('Error al descargar el archivo');
                    return;
                }
                fs.unlinkSync(zipFilePath);
                console.log(`Archivo ZIP eliminado: ${zipFilePath}`);
                
                fs.rmSync(projectDir, { recursive: true, force: true });
                console.log(`Directorio del proyecto eliminado: ${projectDir}`);
            });
        });

        output.on('end', () => {
            console.log('Data has been drained');
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                console.warn('Archiver warning:', err);
            } else {
                throw err;
            }
        });

        archive.on('error', (err) => {
            console.error('Error en el archivo ZIP:', err);
            res.status(500).send('Error al crear el archivo ZIP');
        });

        archive.pipe(output);
        archive.directory(projectDir, false);
        await archive.finalize();

    } catch (error) {
        console.error('Error durante la creación del proyecto:', error);
        res.status(500).send('Error al crear el proyecto');
    }
};

export default {
    createProject
};