import GQLService from '../services/generatorGraphqlJs.service';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { Request, Response } from 'express';

interface Field {
    name: string;
    type: 'String' | 'Number' | 'Boolean' | 'Date' | 'ObjectId' | 'Array' | 'Mixed';
    allowNull?: boolean;
    defaultValue?: any;
    unique?: boolean;
    validate?: Record<string, any>;
    references?: { model: string; key: string };
    fields?: Field[];
}

interface ProjectConfig {
    projectName: string;
    models: {
        name: string;
        fields: Field[];
    }[];
}

// Helper para asegurar que un directorio exista
const ensureDirExists = (dir: string) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Helper para capitalizar strings
const capitalizeType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
};

// Generar la conexión a la base de datos
const genDbConnection = (dbName: string, dir: string) => {
    const outputDir = path.join(dir, 'config');
    ensureDirExists(outputDir);

    try {
        const dbContent = GQLService.generateMongoConnection(dbName);
        const filePath = path.join(outputDir, 'db.js');
        fs.writeFileSync(filePath, dbContent);
        console.log(`Conexión a la base de datos generada en ${filePath}`);
    } catch (error: any) {
        console.error(`Error al generar la conexión a la base de datos: ${error.message}`);
    }
};

// Generar modelos
const genModels = (dir: string, models: { name: string; fields: Field[] }[]) => {
    const outputDir = path.join(dir, 'models');
    ensureDirExists(outputDir);

    models.forEach(model => {
        try {
            const modelContent = GQLService.generateMongoModels(model.name, model.fields);
            const filePath = path.join(outputDir, `${model.name}.model.js`);
            fs.writeFileSync(filePath, modelContent);
            console.log(`Modelo ${model.name} generado en ${filePath}`);
        } catch (error: any) {
            console.error(`Error al generar el modelo ${model.name}: ${error.message}`);
        }
    });
};

// Generar PubSub
const genPubsub = (dir: string) => {
    const outputDir = path.join(dir);
    ensureDirExists(outputDir);

    try {
        const pubsubContent = GQLService.generatePubsub();
        const filePath = path.join(outputDir, 'pubsub.js');
        fs.writeFileSync(filePath, pubsubContent);
        console.log(`PubSub generado en ${filePath}`);
    } catch (error: any) {
        console.error(`Error al generar PubSub: ${error.message}`);
    }
};

// Generar mutaciones
const createMutations = (name: string, dir: string, fields: Field[]) => {
    const outputDir = path.join(dir, 'mutations');
    ensureDirExists(outputDir);

    try {
        const create = GQLService.generateCreateMutation(name, fields);
        const update = GQLService.generateUpdateMutation(name, fields);
        const remove = GQLService.generateDeleteMutation(name);

        const createFilePath = path.join(outputDir, `create${capitalizeType(name)}.js`);
        const updateFilePath = path.join(outputDir, `update${capitalizeType(name)}.js`);
        const removeFilePath = path.join(outputDir, `remove${capitalizeType(name)}.js`);

        fs.writeFileSync(createFilePath, create);
        fs.writeFileSync(updateFilePath, update);
        fs.writeFileSync(removeFilePath, remove);

        console.log(`Mutaciones de ${name} generadas en ${createFilePath}, ${updateFilePath} y ${removeFilePath}`);
    } catch (error: any) {
        console.error(`Error al generar las mutaciones de ${name}: ${error.message}`);
    }
};

// Generar consultas
const createQueries = (name: string, dir: string, fields: Field[]) => {
    const outputDir = path.join(dir, 'queries');
    ensureDirExists(outputDir);

    try {
        const get = GQLService.generateGetOneQuery(name, fields);
        const getAll = GQLService.generateGetAllQuery(name, fields);

        const getFilePath = path.join(outputDir, `get${capitalizeType(name)}.js`);
        const getAllFilePath = path.join(outputDir, `getAll${capitalizeType(name)}.js`);

        fs.writeFileSync(getFilePath, get);
        fs.writeFileSync(getAllFilePath, getAll);

        console.log(`Consultas de ${name} generadas en ${getFilePath} y ${getAllFilePath}`);
    } catch (error: any) {
        console.error(`Error al generar las consultas de ${name}: ${error.message}`);
    }
};

// Generar índice de módulo
const genModuleIndex = (dir: string, name: string, fields: Field[]) => {
    try {
        const moduleIndexContent = GQLService.generateModuleIndex(name, fields);
        const filePath = path.join(dir, 'index.js');
        fs.writeFileSync(filePath, moduleIndexContent);
        console.log(`Índice del módulo ${name} generado en ${filePath}`);
    } catch (error: any) {
        console.error(`Error al generar el índice del módulo ${name}: ${error.message}`);
    }
};

// Generar un módulo completo
const genModule = (dir: string, name: string, fields: Field[]) => {
    const outputDir = path.join(dir, 'modules', name);
    ensureDirExists(outputDir);

    createQueries(name, outputDir, fields);
    createMutations(name, outputDir, fields);
    genModuleIndex(outputDir, name, fields);

    console.log(`Módulo ${name} generado en ${outputDir}`);
};

// Generar todos los módulos
const genModules = (dir: string, models: { name: string; fields: Field[] }[]) => {
    models.forEach(model => {
        genModule(dir, model.name, model.fields);
    });
};

// Generar índice de módulos
const genModulesIndex = (dir: string, moduleNames: string[]) => {
    const outputDir = path.join(dir, 'modules');
    ensureDirExists(outputDir);

    try {
        const moduleIndexContent = GQLService.generateModulesIndex(moduleNames);
        const filePath = path.join(outputDir, 'index.js');
        fs.writeFileSync(filePath, moduleIndexContent);
        console.log(`Índice de módulos generado en ${filePath}`);
    } catch (error: any) {
        console.error(`Error al generar el índice de módulos: ${error.message}`);
    }
};

// Generar archivo principal (index.js)
const genIndex = (dir: string) => {
    try {
        const indexContent = GQLService.generateIndexGraphqlJs();
        const filePath = path.join(dir, 'index.js');
        fs.writeFileSync(filePath, indexContent);
        console.log(`Archivo index.js generado en ${filePath}`);
    } catch (error: any) {
        console.error(`Error al generar el archivo index.js: ${error.message}`);
    }
};

// Generar package.json
const genPackageJson = (projectName: string, dir: string) => {
    try {
        const packageJson = GQLService.generatePackageJson(projectName);
        const filePath = path.join(dir, 'package.json');
        fs.writeFileSync(filePath, packageJson);
        console.log(`package.json generado en ${filePath}`);
    } catch (error: any) {
        console.error(`Error al generar el package.json: ${error.message}`);
    }
};

// Generar scalar types
const genScalarTypes = (dir: string) => {
    try {
        const scalarsContent = GQLService.generateScalartypes();
        const filePath = path.join(dir, 'scalars.js');
        fs.writeFileSync(filePath, scalarsContent);
        console.log(`Scalar types generados en ${filePath}`);
    } catch (error: any) {
        console.error(`Error al generar los scalar types: ${error.message}`);
    }
};

// Crear el proyecto completo
const createProject = async (req: Request, res: Response) => {
    const { projectName, models } = req.body as ProjectConfig;
    const outputBaseDir = path.join(__dirname, '..', '..', '..', 'outputs');
    const projectDir = path.join(outputBaseDir, projectName);
    const srcDir = path.join(projectDir, 'src');

    ensureDirExists(outputBaseDir);
    ensureDirExists(projectDir);
    ensureDirExists(srcDir);

    try {
        // Generar estructura del proyecto
        genDbConnection(projectName, srcDir);
        genModels(srcDir, models);
        genPubsub(srcDir);
        genScalarTypes(srcDir);
        genModules(srcDir, models);
        genModulesIndex(srcDir, models.map(model => model.name));
        genIndex(srcDir);
        genPackageJson(projectName, projectDir);

        // Crear archivo ZIP
        const zipPath = path.join(outputBaseDir, `${projectName}.zip`);
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            // Eliminar el directorio del proyecto después de comprimir
            fs.rmSync(projectDir, { recursive: true, force: true });
            console.log(`Proyecto ${projectName} creado y comprimido exitosamente`);
            res.download(zipPath, `${projectName}.zip`, (err) => {
                if (err) {
                    console.error(`Error enviando el archivo ZIP: ${err.message}`);
                }
                // Eliminar el archivo ZIP después de enviarlo
                fs.unlinkSync(zipPath);
            });
        });

        archive.pipe(output);
        archive.directory(projectDir, projectName);
        await archive.finalize();

    } catch (error: any) {
        console.error(`Error creando el proyecto: ${error.message}`);
        res.status(500).send({ message: `Error creando el proyecto: ${error.message}` });
    }
};

export default {
    createProject
};