import generatorService from '../services/generator.service';
import path from 'path';
import { Request, Response } from 'express';
import fs from 'fs';
import archiver from 'archiver';

// Función para generar modelos
const genModels = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'models');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const modelContent = generatorService.genModel(name, fields);

        const filePath = path.join(outputDir, `${name}.model.ts`);

        fs.writeFileSync(filePath, modelContent);
        console.log(`Modelo ${name} generado en ${filePath}`);
    }
};

// Función para generar servicios
const genServices = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'services');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const serviceContent = generatorService.genServices(name, fields);

        // Agrega una validación para verificar que el contenido del servicio no sea undefined
        if (typeof serviceContent !== 'string') {
            console.error(`Error al generar el servicio para ${name}: el contenido es undefined.`);
            continue; // Salta este modelo y continúa con el siguiente
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
        const interfaceContent = generatorService.genModelInterface(name, fields);

        const filePath = path.join(outputDir, `${name}.interface.ts`);

        fs.writeFileSync(filePath, interfaceContent);
        console.log(`Interface ${name} generado en ${filePath}`);
    }
}

// Función para generar controladores
const genControllers = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'controllers');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const modelo of modelos) {
        const name = modelo.name;
        const fields = modelo.fields;
        const controllerContent = generatorService.genControllers(name, fields);

        const filePath = path.join(outputDir, `${name}.controller.ts`);

        fs.writeFileSync(filePath, controllerContent);
        console.log(`Controlador ${name} generado en ${filePath}`);
    }
};

const genPackageJson = (projectName: string): any => {
    return generatorService.genPackageJson(projectName);
}

// Función para generar rutas
const genRoutes = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'routes');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const modelo of modelos) {
        const name = modelo.name;
        const routesContent = generatorService.genRoutes(name);

        const filePath = path.join(outputDir, `${name}.routes.ts`);

        fs.writeFileSync(filePath, routesContent);
        console.log(`Rutas ${name} generadas en ${filePath}`);
    }
};


const genIndex = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'index.ts');

    const names = modelos.map(modelo => modelo.name);
    const indexContent = generatorService.genIndex(names);

    fs.writeFileSync(outputDir, indexContent);
    console.log(`Index generado en ${outputDir}`);
};

const createProject = async (req: Request, res: Response): Promise<void> => {
    const { modelos, projectName } = req.body;

    // Validar que los datos necesarios están presentes
    if (!modelos || !projectName) {
        res.status(400).send('Faltan datos');
        return;
    }

    const outputBaseDir = path.join(__dirname, '..', '..', '..', 'outputs');
    console.log(`Output base directory: ${outputBaseDir}`);

    // Crear directorio base si no existe
    if (!fs.existsSync(outputBaseDir)) {
        fs.mkdirSync(outputBaseDir, { recursive: true });
        console.log(`Directorio creado: ${outputBaseDir}`);
    }

    const projectDir = path.join(outputBaseDir, projectName);
    console.log(`Project directory: ${projectDir}`);

    // Crear directorio del proyecto si no existe
    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir);
        console.log(`Directorio del proyecto creado: ${projectDir}`);
    }

    const srcDir = path.join(projectDir, 'src');
    console.log(`Source directory: ${srcDir}`);

    // Crear directorio src si no existe
    if (!fs.existsSync(srcDir)) {
        fs.mkdirSync(srcDir);
        console.log(`Directorio src creado: ${srcDir}`);
    }

    // Generación de archivos de proyecto
    try {
        genModels(modelos, srcDir);
        genServices(modelos, srcDir);
        genControllers(modelos, srcDir);
        genModelInterface(modelos, srcDir);
        genRoutes(modelos, srcDir);
        genIndex(modelos, srcDir);

        const packageJsonContent = genPackageJson(projectName);
        fs.writeFileSync(path.join(projectDir, 'package.json'), packageJsonContent);
        console.log(`package.json creado en: ${projectDir}`);

        const bat = generatorService.generateBat(projectName);
        fs.writeFileSync(path.join(projectDir, 'start.bat'), bat);
        console.log(`start.bat creado en: ${projectDir}`);

        // Crear el archivo ZIP
        const zipFilePath = path.join(outputBaseDir, `${projectName}.zip`);
        console.log(`Ruta del archivo ZIP: ${zipFilePath}`);

        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Nivel de compresión
        });

        output.on('close', () => {
            console.log(`Archivo ZIP creado: ${zipFilePath} (${archive.pointer()} bytes)`);
            res.download(zipFilePath, `${projectName}.zip`, (err) => {
                if (err) {
                    console.error('Error al enviar el archivo:', err);
                    res.status(500).send('Error al descargar el archivo');
                    return;
                }
                // Eliminar el archivo ZIP después de la descarga
                fs.unlinkSync(zipFilePath);
                console.log(`Archivo ZIP eliminado: ${zipFilePath}`);
                
                // Eliminar el directorio del proyecto después de la descarga
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
        archive.directory(projectDir, false); // Agregar el directorio del proyecto al ZIP
        await archive.finalize(); // <--- Await the finalize method

    } catch (error) {
        console.error('Error durante la creación del proyecto:', error);
        res.status(500).send('Error al crear el proyecto');
    }
};

export default {
    createProject
};