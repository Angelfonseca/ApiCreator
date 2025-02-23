import generatorService from '../services/generatorPostgresTs.service';
import path from 'path';
import { Request, Response } from 'express';
import fs from 'fs';
import archiver from 'archiver';

// Función para asegurarse de que un directorio existe
const ensureDirExists = (dir: string): void => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Generar modelos
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
            const modelContent = generatorService.genTsModel(name, fields);
            const filePath = path.join(outputDir, `${name}.model.ts`);
            fs.writeFileSync(filePath, modelContent);
            console.log(`Modelo ${name} generado en ${filePath}`);
        } catch (error: any) {
            console.error(`Error al generar el modelo ${modelo.name}: ${error.message}`);
        }
    }
};

// Generar servicios
const genServices = (modelos: any[], dir: string): void => {
    const outputDir = path.join(dir, 'services');
    ensureDirExists(outputDir);

    for (const modelo of modelos) {
        if (!modelo.name) {
            console.error(`Servicio inválido: falta 'name'`);
            continue;
        }

        try {
            const name = modelo.name;
            const serviceContent = generatorService.genTsService(name);
            const filePath = path.join(outputDir, `${name}.service.ts`);
            fs.writeFileSync(filePath, serviceContent);
            console.log(`Servicio ${name} generado en ${filePath}`);
        } catch (error: any) {
            console.error(`Error al generar el servicio ${modelo.name}: ${error.message}`);
        }
    }
};

// Generar controladores
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
            const controllerContent = generatorService.genTsController(name);
            const filePath = path.join(outputDir, `${name}.controller.ts`);
            fs.writeFileSync(filePath, controllerContent);
            console.log(`Controlador ${name} generado en ${filePath}`);
        } catch (error: any) {
            console.error(`Error al generar el controlador ${modelo.name}: ${error.message}`);
        }
    }
};

// Generar rutas
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
            const routesContent = generatorService.genTsRoutes(name);
            const filePath = path.join(outputDir, `${name}.routes.ts`);
            fs.writeFileSync(filePath, routesContent);
            console.log(`Rutas ${name} generadas en ${filePath}`);
        } catch (error: any) {
            console.error(`Error al generar las rutas ${modelo.name}: ${error.message}`);
        }
    }
};

// Generar archivo index.ts
const genIndex = (modelos: any[], dir: string, projectName: string): void => {
    const outputDir = path.join(dir, 'index.ts');
    const names = modelos.map(modelo => modelo.name);
    const indexContent = generatorService.genTsIndex(names, projectName);
    fs.writeFileSync(outputDir, indexContent);
    console.log(`Index generado en ${outputDir}`);
};

const genSwaggerTs = (modelos: any[], dir: string, projectName: string): void => {
    const outputDir = path.join(dir, 'swagger.ts');
    const swaggerContent = generatorService.genSwaggerTs(modelos, projectName);
    fs.writeFileSync(outputDir, swaggerContent);
    console.log(`Swagger generado en ${outputDir}`);
};

// Generar archivo package.json
const genPackageJson = (projectName: string): string => {
    return generatorService.genPackageJson(projectName);
};

// Generar archivo tsconfig.json
const genTsConfig = (): string => {
    return generatorService.genTsConfig();
};



// Generar archivo de configuración de Sequelize
const genSequelizeConfig = (projectName: string): string => {
    const dbConfig = {
        database: `${projectName}_db`,
        username: 'postgres',
        password: 'postgres',
        host: 'localhost',
        port: 5432,
    };
    return generatorService.genSequelizeConfig(dbConfig);
};

// Crear proyecto completo
const createPgTSProject = async (req: Request, res: Response): Promise<void> => {
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

        // Generar archivo de configuración de Sequelize
        const configDir = path.join(srcDir, 'config');
        ensureDirExists(configDir);
        const sequelizeConfigContent = genSequelizeConfig(projectName);
        fs.writeFileSync(path.join(configDir, 'sequelize.config.ts'), sequelizeConfigContent);
        console.log(`Archivo de configuración de Sequelize generado en: ${configDir}`);

        // Generar archivos del proyecto
        genModels(modelos, srcDir);
        genServices(modelos, srcDir);
        genControllers(modelos, srcDir);
        genRoutes(modelos, srcDir);
        genIndex(modelos, srcDir, projectName);
        genSwaggerTs(modelos, srcDir, projectName);


        // Generar archivos adicionales
        const packageJsonContent = genPackageJson(projectName);
        fs.writeFileSync(path.join(projectDir, 'package.json'), packageJsonContent);
        console.log(`package.json generado en: ${projectDir}`);



        const tsConfigContent = genTsConfig();
        fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), tsConfigContent);
        console.log(`tsconfig.json generado en: ${projectDir}`);

        // Crear archivo ZIP
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
    createPgTSProject,
};